import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { ApiError } from '../utils/error.util.js';
import { io } from '../index.js';
import { emitToConversation } from '../socket/index.js';

/**
 * ANONYMOUS CHAT CONTROLLER
 * Handles all anonymous chat operations
 * Separated from regular chat for better modularity and debugging
 */

// Create anonymous conversation
export async function createAnonymousConversation(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { otherUserId } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!otherUserId) {
      throw new ApiError(400, 'Other user ID is required');
    }

    // Check if user is trying to message themselves
    if (userId === otherUserId) {
      throw new ApiError(400, 'Cannot message yourself');
    }

    // Check if users are blocked
    const blockCheck = await pool.query(
      `SELECT EXISTS(
        SELECT 1 FROM user_blocks 
        WHERE (blocker_id = $1 AND blocked_id = $2) 
           OR (blocker_id = $2 AND blocked_id = $1)
      ) as is_blocked`,
      [userId, otherUserId]
    );

    if (blockCheck.rows[0].is_blocked) {
      throw new ApiError(403, 'Cannot message this user');
    }

    // Ensure consistent ordering for conversation lookup
    const user1Id = userId < otherUserId ? userId : otherUserId;
    const user2Id = userId < otherUserId ? otherUserId : userId;

    // console.log(`🎭 Creating/finding anonymous conversation: User ${userId} → User ${otherUserId}`);
    
    // Get user's gender
    const userInfo = await pool.query(
      'SELECT gender FROM users WHERE user_id = $1',
      [userId]
    );

    // Check if anonymous identity already exists for this user targeting the other user
    const existingAnonIdentity = await pool.query(
      `SELECT identity_id FROM anonymous_identities 
       WHERE user_id = $1 AND target_user_id = $2 AND is_active = true
       ORDER BY created_at DESC LIMIT 1`,
      [userId, otherUserId]
    );

    let anonymousIdentityId: string;

    if (existingAnonIdentity.rows.length > 0) {
      anonymousIdentityId = existingAnonIdentity.rows[0].identity_id;
      // console.log(`✓ Using existing anonymous identity: ${anonymousIdentityId}`);
    } else {
      // Create new anonymous identity
      const anonIdentity = await pool.query(
        `INSERT INTO anonymous_identities (
          user_id, target_user_id, random_string, display_gender
        ) VALUES ($1, $2, $3, $4) RETURNING identity_id`,
        [
          userId,
          otherUserId,
          `anon_${Math.random().toString(36).substring(2, 15)}`,
          userInfo.rows[0].gender
        ]
      );
      anonymousIdentityId = anonIdentity.rows[0].identity_id;
      // console.log(`✓ Created new anonymous identity: ${anonymousIdentityId}`);
    }

    // Check if conversation exists with this specific anonymous initiator
    // console.log(`🔍 Checking for conversation with initiator: ${anonymousIdentityId}`);
    let conversation = await pool.query(
      `SELECT * FROM chat_conversations 
       WHERE user1_id = $1 AND user2_id = $2 AND anonymous_initiator_id = $3`,
      [user1Id, user2Id, anonymousIdentityId]
    );

    // If conversation doesn't exist, create it
    if (!conversation || conversation.rows.length === 0) {
      // console.log(`📝 Creating NEW anonymous conversation`);
      
      try {
        // Create new conversation
        conversation = await pool.query(
          `INSERT INTO chat_conversations (
            user1_id, user2_id, is_anonymous, anonymous_initiator_id, is_accepted
          ) VALUES ($1, $2, true, $3, true) RETURNING *`,
          [user1Id, user2Id, anonymousIdentityId]
        );

        // console.log(`✅ NEW anonymous conversation created: ${conversation.rows[0].conversation_id}`);

        // Update anonymous identity with conversation_id
        await pool.query(
          `UPDATE anonymous_identities 
           SET conversation_id = $1, last_used_at = NOW()
           WHERE identity_id = $2`,
          [conversation.rows[0].conversation_id, anonymousIdentityId]
        );
      } catch (insertError: any) {
        // Handle race condition - another request created it first
        if (insertError.code === '23505') {
          // console.log(`⚠️ Race condition detected - fetching existing anonymous conversation`);
          
          conversation = await pool.query(
            `SELECT * FROM chat_conversations 
             WHERE user1_id = $1 AND user2_id = $2 AND anonymous_initiator_id = $3`,
            [user1Id, user2Id, anonymousIdentityId]
          );
          
          // console.log(`✓ Fetched conversation after race condition: ${conversation.rows[0]?.conversation_id}`);
        } else {
          throw insertError;
        }
      }
    } else {
      // console.log(`✓ Found existing anonymous conversation: ${conversation.rows[0].conversation_id}`);
    }

    // console.log(`✅ Anonymous conversation created/retrieved:`, {
    //   conversationId: conversation.rows[0].conversation_id,
    //   anonymousInitiatorId: anonymousIdentityId,
    //   user1Id,
    //   user2Id
    // });

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation.rows[0].conversation_id,
        anonymousIdentityId
      }
    });
  } catch (error: any) {
    console.error('❌ Create anonymous conversation error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      userId: req.user?.userId,
      otherUserId: req.body?.otherUserId
    });
    
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to create anonymous conversation');
  }
}

// Get anonymous conversations for a user
export async function getAnonymousConversations(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const result = await pool.query(
      `SELECT 
        cc.*,
        CASE 
          WHEN cc.user1_id = $1 THEN u2.user_id
          ELSE u1.user_id
        END as other_user_id,
        -- Check if current user is the initiator
        CASE 
          WHEN ai.user_id = $1 THEN 
            -- Sender sees receiver's real name
            CASE WHEN cc.user1_id = $1 THEN u2.name ELSE u1.name END
          ELSE 
            -- Receiver sees anonymous string
            ai.random_string
        END as other_user_name,
        CASE 
          WHEN ai.user_id = $1 THEN 
            -- Sender sees receiver's real dp
            CASE WHEN cc.user1_id = $1 THEN u2.dp_url ELSE u1.dp_url END
          ELSE 
            -- Receiver sees no dp
            null
        END as other_user_dp,
        CASE 
          WHEN ai.user_id = $1 THEN 
            -- Sender sees receiver's real gender
            CASE WHEN cc.user1_id = $1 THEN u2.gender ELSE u1.gender END
          ELSE 
            -- Receiver sees display_gender
            ai.display_gender
        END as other_user_gender,
        cc.is_anonymous,
        -- Flag to indicate if current user is seeing an anonymous sender
        CASE 
          WHEN ai.user_id != $1 THEN true
          ELSE false
        END as is_viewing_anonymous,
        lm.encrypted_content as last_message_preview,
        lm.message_type as last_message_type,
        lm.created_at as last_message_time,
        (SELECT COUNT(*) FROM message_status ms
         JOIN chat_messages cm ON ms.message_id = cm.message_id
         WHERE cm.conversation_id = cc.conversation_id
         AND ms.user_id = $1
         AND ms.status != 'read'
         AND cm.sender_id != $1) as unread_count
      FROM chat_conversations cc
      LEFT JOIN users u1 ON cc.user1_id = u1.user_id
      LEFT JOIN users u2 ON cc.user2_id = u2.user_id
      LEFT JOIN anonymous_identities ai ON cc.anonymous_initiator_id = ai.identity_id
      LEFT JOIN LATERAL (
        SELECT * FROM chat_messages
        WHERE conversation_id = cc.conversation_id
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON true
      WHERE (cc.user1_id = $1 OR cc.user2_id = $1)
      AND cc.is_blocked = false
      AND cc.is_anonymous = true
      AND cc.anonymous_initiator_id IS NOT NULL
      ORDER BY cc.last_message_at DESC`,
      [userId]
    );

    // console.log(`🎭 Fetched ${result.rows.length} anonymous conversations for user ${userId}`);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Get anonymous conversations error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to fetch anonymous conversations');
  }
}

// Get messages for anonymous conversation
export async function getAnonymousMessages(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Check if user is part of anonymous conversation
    const convCheck = await pool.query(
      `SELECT * FROM chat_conversations 
       WHERE conversation_id = $1 
       AND (user1_id = $2 OR user2_id = $2)
       AND is_anonymous = true`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      throw new ApiError(403, 'Access denied to this anonymous conversation');
    }

    const conversation = convCheck.rows[0];
    const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;
    
    let otherUserData;
    
    // Get the anonymous identity to check who initiated
    const anonIdentity = await pool.query(
      `SELECT user_id, random_string, display_gender FROM anonymous_identities 
       WHERE identity_id = $1`,
      [conversation.anonymous_initiator_id]
    );
    
    if (anonIdentity.rows.length > 0) {
      const initiatorId = anonIdentity.rows[0].user_id;
      
      // If current user is NOT the initiator, they are the receiver
      if (initiatorId !== userId) {
        // Receiver sees anonymous info
        otherUserData = {
          user_id: null,
          name: anonIdentity.rows[0].random_string,
          roll_no: null,
          gender: anonIdentity.rows[0].display_gender,
          dp_url: null,
          is_anonymous: true
        };
        // console.log(`🎭 Receiver viewing anonymous sender:`, {
        //   anonString: anonIdentity.rows[0].random_string,
        //   gender: anonIdentity.rows[0].display_gender,
        //   anonymousInitiatorId: conversation.anonymous_initiator_id
        // });
      } else {
        // Initiator (sender) sees real profile
        const otherUserInfo = await pool.query(
          `SELECT user_id, name, roll_no, gender, dp_url FROM users WHERE user_id = $1`,
          [otherUserId]
        );
        otherUserData = {
          ...otherUserInfo.rows[0],
          is_anonymous: false
        };
        // console.log(`🎭 Sender viewing receiver (real profile):`, {
        //   name: otherUserInfo.rows[0].name,
        //   roll_no: otherUserInfo.rows[0].roll_no
        // });
      }
    }

    // Get messages with sender info (respect anonymity)
    const result = await pool.query(
      `SELECT 
        cm.*,
        (cm.sender_id = $2) as is_my_message,
        CASE 
          WHEN cm.sender_id != $2 THEN
            CASE
              -- If current user is the receiver (not the initiator)
              WHEN ai.user_id != $2 THEN jsonb_build_object(
                'user_id', null,
                'name', ai.random_string,
                'roll_no', null,
                'display_gender', ai.display_gender,
                'dp_url', null,
                'is_anonymous', true
              )
              -- Sender sees real receiver info
              ELSE jsonb_build_object(
                'user_id', u.user_id,
                'name', u.name,
                'roll_no', u.roll_no,
                'display_gender', u.gender,
                'dp_url', u.dp_url,
                'is_anonymous', false
              )
            END
          ELSE null
        END as sender
      FROM chat_messages cm
      LEFT JOIN users u ON cm.sender_id = u.user_id
      LEFT JOIN chat_conversations cc ON cm.conversation_id = cc.conversation_id
      LEFT JOIN anonymous_identities ai ON cc.anonymous_initiator_id = ai.identity_id
      WHERE cm.conversation_id = $1
      ${before ? 'AND cm.created_at < $3' : ''}
      AND cm.is_deleted = false
      ORDER BY cm.created_at DESC
      LIMIT $${before ? '4' : '3'}`,
      before ? [conversationId, userId, before, limit] : [conversationId, userId, limit]
    );

    res.json({
      success: true,
      data: {
        conversation: conversation,
        messages: result.rows.reverse(),
        otherUser: otherUserData
      }
    });
  } catch (error) {
    console.error('🎭 Get anonymous messages error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to fetch anonymous messages');
  }
}

// Send anonymous message
export async function sendAnonymousMessage(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const {
      conversationId,
      encryptedContent,
      contentIv,
      contentAuthTag,
      messageType = 'text',
      mediaUrl,
      mediaSize,
      mediaMimeType,
      thumbnailUrl,
      keyId
    } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!conversationId || !encryptedContent || !contentIv || !contentAuthTag) {
      throw new ApiError(400, 'Missing required fields');
    }

    // Check if user is part of anonymous conversation
    const convCheck = await pool.query(
      `SELECT * FROM chat_conversations 
       WHERE conversation_id = $1 
       AND (user1_id = $2 OR user2_id = $2)
       AND is_blocked = false
       AND is_anonymous = true`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      throw new ApiError(403, 'Access denied or conversation blocked/not anonymous');
    }

    const conversation = convCheck.rows[0];

    // Get or create the anonymous identity for this user in this conversation
    let anonResult = await pool.query(
      `SELECT identity_id FROM anonymous_identities 
       WHERE conversation_id = $1 AND user_id = $2 AND is_active = true`,
      [conversationId, userId]
    );

    let anonymousIdentityId: string;

    if (anonResult.rows.length === 0) {
      // Receiver doesn't have an identity yet - create one
      // console.log(`🎭 Creating anonymous identity for receiver in conversation ${conversationId}`);
      
      // Get user's gender
      const userInfo = await pool.query(
        'SELECT gender FROM users WHERE user_id = $1',
        [userId]
      );

      // Determine the target user (the other person in conversation)
      const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;

      // Create anonymous identity for receiver
      const newIdentity = await pool.query(
        `INSERT INTO anonymous_identities (
          user_id, target_user_id, random_string, display_gender, conversation_id
        ) VALUES ($1, $2, $3, $4, $5) RETURNING identity_id`,
        [
          userId,
          otherUserId,
          `anon_${Math.random().toString(36).substring(2, 15)}`,
          userInfo.rows[0].gender,
          conversationId
        ]
      );
      
      anonymousIdentityId = newIdentity.rows[0].identity_id;
      // console.log(`✓ Created anonymous identity for receiver: ${anonymousIdentityId}`);
    } else {
      anonymousIdentityId = anonResult.rows[0].identity_id;
    }

    // Update last_used_at timestamp
    await pool.query(
      `UPDATE anonymous_identities 
       SET last_used_at = NOW() 
       WHERE identity_id = $1`,
      [anonymousIdentityId]
    );

    // Insert message
    const result = await pool.query(
      `INSERT INTO chat_messages (
        conversation_id,
        sender_id,
        message_type,
        encrypted_content,
        content_iv,
        content_auth_tag,
        media_url,
        media_size,
        media_mime_type,
        thumbnail_url,
        is_anonymous,
        anonymous_identity_id,
        key_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12)
      RETURNING *`,
      [
        conversationId,
        userId,
        messageType,
        encryptedContent,
        contentIv,
        contentAuthTag,
        mediaUrl,
        mediaSize,
        mediaMimeType,
        thumbnailUrl,
        anonymousIdentityId,
        keyId
      ]
    );

    const message = result.rows[0];

    // Update conversation last_message_at
    await pool.query(
      'UPDATE chat_conversations SET last_message_at = NOW() WHERE conversation_id = $1',
      [conversationId]
    );

    // Emit socket event with anonymous sender info
    if (io) {
      const anonInfo = await pool.query(
        'SELECT random_string, display_gender FROM anonymous_identities WHERE identity_id = $1',
        [anonymousIdentityId]
      );
      
      const senderInfo = {
        name: anonInfo.rows[0].random_string,
        display_gender: anonInfo.rows[0].display_gender,
        is_anonymous: true,
      };

      emitToConversation(io, conversationId, 'new-message', {
        ...message,
        sender: senderInfo,
        is_my_message: false,
      });
    }

    // console.log(`🎭 Anonymous message sent in conversation ${conversationId}`);

    res.status(201).json({
      success: true,
      message: 'Anonymous message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('🎭 Send anonymous message error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to send anonymous message');
  }
}

// Reveal anonymous identity
export async function revealAnonymousIdentity(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!conversationId || typeof conversationId !== 'string') {
      throw new ApiError(400, 'Invalid conversation ID');
    }

    // Check if user is part of conversation and it's anonymous
    const convCheck = await pool.query(
      `SELECT * FROM chat_conversations 
       WHERE conversation_id = $1 
       AND (user1_id = $2 OR user2_id = $2)
       AND is_anonymous = true`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      throw new ApiError(403, 'Cannot reveal identity in this conversation');
    }

    // Get user's anonymous identity in this conversation
    const anonResult = await pool.query(
      `SELECT * FROM anonymous_identities 
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (anonResult.rows.length === 0) {
      throw new ApiError(404, 'Anonymous identity not found');
    }

    const anonIdentity = anonResult.rows[0];

    if (anonIdentity.is_revealed) {
      throw new ApiError(400, 'Identity already revealed');
    }

    // Mark as revealed
    await pool.query(
      `UPDATE anonymous_identities 
       SET is_revealed = true, revealed_at = NOW()
       WHERE identity_id = $1`,
      [anonIdentity.identity_id]
    );

    // Update conversation to no longer be anonymous
    await pool.query(
      `UPDATE chat_conversations 
       SET is_anonymous = false
       WHERE conversation_id = $1`,
      [conversationId]
    );

    // Emit socket event to notify other user
    emitToConversation(io, conversationId, 'identity-revealed', {
      userId,
      conversationId
    });

    // console.log(`🎭 Identity revealed in conversation ${conversationId} by user ${userId}`);

    res.json({
      success: true,
      message: 'Identity revealed successfully'
    });
  } catch (error) {
    console.error('🎭 Reveal identity error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to reveal identity');
  }
}
