import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { pool } from '../lib/db.js';
import { ApiError } from '../utils/error.util.js';
import { io } from '../index.js';
import { emitToConversation, isUserOnline } from '../socket/index.js';
import { uploadToCloudinary } from '../utils/cloudinary.util.js';
import { cacheMessage } from '../services/messageCache.service.js';
import { queueOfflineMessage } from '../services/offlineMessage.service.js';
import { incrementUnread, resetUnread } from '../services/unread.service.js';
import { isUserOnline as isOnlineRedis } from '../services/presence.service.js';

/**
 * REGULAR CHAT CONTROLLER
 * Handles all regular (non-anonymous) chat operations
 * For anonymous chat, see anonymous-chat.controller.ts
 */

// Get or create regular conversation (non-anonymous only)
export async function getOrCreateConversation(req: Request, res: Response) {
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

    // console.log(`💬 Creating/finding regular conversation between User ${userId} and User ${otherUserId}`);

    // Check for existing regular conversation (no anonymous initiator)
    let conversation = await pool.query(
      `SELECT * FROM chat_conversations 
       WHERE user1_id = $1 AND user2_id = $2 AND anonymous_initiator_id IS NULL`,
      [user1Id, user2Id]
    );

    // If conversation doesn't exist, create it
    if (!conversation || conversation.rows.length === 0) {
      // console.log(`📝 Creating NEW regular conversation`);

      try {
        // Create new regular conversation
        conversation = await pool.query(
          `INSERT INTO chat_conversations (
            user1_id, user2_id, is_anonymous, anonymous_initiator_id, is_accepted
          ) VALUES ($1, $2, false, NULL, true) RETURNING *`,
          [user1Id, user2Id]
        );

        // console.log(`✅ NEW regular conversation created: ${conversation.rows[0].conversation_id}`);
      }
      catch (insertError: any) {
        // Handle race condition - another request created it first
        if (insertError.code === '23505') {
          // console.log(`⚠️ Race condition detected - fetching existing regular conversation`);

          // Fetch the conversation that was just created by the other request
          conversation = await pool.query(
            `SELECT * FROM chat_conversations 
             WHERE user1_id = $1 AND user2_id = $2 AND anonymous_initiator_id IS NULL`,
            [user1Id, user2Id]
          );

          // console.log(`✓ Fetched conversation after race condition: ${conversation.rows[0]?.conversation_id}`);
        }
        else {
          // Re-throw if it's not a duplicate key error
          throw insertError;
        }
      }
    }
    else {
      // console.log(`✓ Found existing regular conversation: ${conversation.rows[0].conversation_id}`);
    }

    // console.log(`✅ Regular conversation created/retrieved:`, {
    //   conversationId: conversation.rows[0].conversation_id,
    //   user1Id,
    //   user2Id
    // });

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation.rows[0].conversation_id
      }
    });
  }
  catch (error: any) {
    console.error('[ERROR] Get or create regular conversation error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      userId: req.user?.userId,
      otherUserId: req.body?.otherUserId
    });

    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to create regular conversation');
  }
}

// Legacy function for backward compatibility
export async function sendChatRequest(req: Request, res: Response) {
  return getOrCreateConversation(req, res);
}

// Get pending chat requests
export async function getChatRequests(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const result = await pool.query(
      `SELECT 
        cr.*,
        CASE 
          WHEN cr.request_type = 'anonymous' THEN ai.random_string
          ELSE u.name
        END as sender_display_name,
        CASE 
          WHEN cr.request_type = 'anonymous' THEN ai.display_gender
          ELSE u.gender
        END as sender_gender,
        CASE 
          WHEN cr.request_type = 'anonymous' THEN 
            EXTRACT(YEAR FROM CURRENT_DATE) - CAST(SUBSTRING(ai.display_gender, 1, 2) AS INTEGER) + 2000
          ELSE EXTRACT(YEAR FROM AGE(u.dob))
        END as sender_year,
        u.dp_url as sender_dp_url
      FROM chat_requests cr
      LEFT JOIN anonymous_identities ai ON cr.anonymous_identity_id = ai.identity_id
      LEFT JOIN users u ON cr.sender_id = u.user_id
      WHERE cr.receiver_id = $1 
      AND cr.status = 'pending'
      AND cr.expires_at > NOW()
      ORDER BY cr.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  }
  catch (error) {
    console.error('[ERROR] Get chat requests error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to fetch chat requests');
  }
}

// Accept or reject chat request
export async function respondToChatRequest(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!action || !['accept', 'reject'].includes(action)) {
      throw new ApiError(400, 'Invalid action. Must be "accept" or "reject"');
    }

    // Get the request
    const requestResult = await pool.query(
      'SELECT * FROM chat_requests WHERE request_id = $1 AND receiver_id = $2',
      [requestId, userId]
    );

    if (requestResult.rows.length === 0) {
      throw new ApiError(404, 'Chat request not found');
    }

    const chatRequest = requestResult.rows[0];

    if (chatRequest.status !== 'pending') {
      throw new ApiError(400, 'Request has already been processed');
    }

    if (new Date(chatRequest.expires_at) < new Date()) {
      throw new ApiError(400, 'Request has expired');
    }

    // Update request status
    await pool.query(
      'UPDATE chat_requests SET status = $1, updated_at = NOW() WHERE request_id = $2',
      [action === 'accept' ? 'accepted' : 'rejected', requestId]
    );

    let conversation = null;

    // If accepted, create or get conversation
    if (action === 'accept') {
      const convResult = await pool.query(
        `SELECT * FROM get_or_create_conversation($1, $2)`,
        [chatRequest.sender_id, userId]
      );

      conversation = convResult.rows[0];

      // Update conversation with anonymous info if applicable
      if (chatRequest.request_type === 'anonymous') {
        await pool.query(
          `UPDATE chat_conversations 
           SET is_anonymous = true, 
               anonymous_initiator_id = $1,
               is_accepted = true
           WHERE conversation_id = $2`,
          [chatRequest.anonymous_identity_id, conversation.conversation_id]
        );

        // Update anonymous identity with conversation_id
        await pool.query(
          `UPDATE anonymous_identities 
           SET conversation_id = $1 
           WHERE identity_id = $2`,
          [conversation.conversation_id, chatRequest.anonymous_identity_id]
        );
      } else {
        await pool.query(
          `UPDATE chat_conversations 
           SET is_accepted = true
           WHERE conversation_id = $1`,
          [conversation.conversation_id]
        );
      }
    }

    res.json({
      success: true,
      message: `Chat request ${action}ed successfully`,
      data: {
        request: chatRequest,
        conversation: conversation
      }
    });
  }
  catch (error) {
    console.error('[ERROR] Respond to chat request error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to respond to chat request');
  }
}

// Get all regular conversations for a user (excluding anonymous)
export async function getConversations(req: Request, res: Response) {
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
        CASE 
          WHEN cc.user1_id = $1 THEN u2.name
          ELSE u1.name
        END as other_user_name,
        CASE 
          WHEN cc.user1_id = $1 THEN u2.dp_url
          ELSE u1.dp_url
        END as other_user_dp,
        CASE 
          WHEN cc.user1_id = $1 THEN u2.gender
          ELSE u1.gender
        END as other_user_gender,
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
      LEFT JOIN LATERAL (
        SELECT * FROM chat_messages
        WHERE conversation_id = cc.conversation_id
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON true
      WHERE (cc.user1_id = $1 OR cc.user2_id = $1)
      AND cc.is_blocked = false
      AND (cc.is_anonymous = false OR cc.is_anonymous IS NULL)
      AND cc.anonymous_initiator_id IS NULL
      ORDER BY cc.last_message_at DESC`,
      [userId]
    );

    // console.log(`[MSGES] Fetched ${result.rows.length} regular conversations for user ${userId}`);

    res.json({
      success: true,
      data: result.rows
    });
  }
  catch (error) {
    console.error('[ERROR] Get regular conversations error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to fetch regular conversations');
  }
}

// Get messages for a regular conversation (non-anonymous)
export async function getMessages(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Check if user is part of regular conversation
    const convCheck = await pool.query(
      `SELECT * FROM chat_conversations 
       WHERE conversation_id = $1 
       AND (user1_id = $2 OR user2_id = $2)
       AND (is_anonymous = false OR is_anonymous IS NULL)
       AND anonymous_initiator_id IS NULL`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      console.log('[DEBUG] getMessages 403 - user not in regular conversation:', { conversationId, userId });
      throw new ApiError(403, 'Access denied to this conversation');
    }

    const conversation = convCheck.rows[0];

    // Get other user info (always show real profile in regular chats)
    const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;

    const otherUserInfo = await pool.query(
      `SELECT user_id, name, roll_no, gender, dp_url FROM users WHERE user_id = $1`,
      [otherUserId]
    );

    const otherUserData = {
      ...otherUserInfo.rows[0],
      is_anonymous: false
    };

    // console.log(`💬 Regular chat - both see real profiles:`, {
    //   name: otherUserInfo.rows[0].name,
    //   roll_no: otherUserInfo.rows[0].roll_no
    // });

    // Get messages with real sender info and reactions
    const result = await pool.query(
      `SELECT 
        cm.*,
        (cm.sender_id = $2) as is_my_message,
        CASE 
          WHEN cm.sender_id != $2 THEN jsonb_build_object(
            'user_id', u.user_id,
            'name', u.name,
            'roll_no', u.roll_no,
            'display_gender', u.gender,
            'dp_url', u.dp_url,
            'is_anonymous', false
          )
          ELSE null
        END as sender,
        CASE
          WHEN cm.parent_message_id IS NOT NULL THEN jsonb_build_object(
            'message_id', pm.message_id,
            'encrypted_content', pm.encrypted_content,
            'content_iv', pm.content_iv,
            'content_auth_tag', pm.content_auth_tag,
            'sender', jsonb_build_object(
              'name', pu.name
            )
          )
          ELSE null
        END as parent_message,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'emoji', r.emoji,
                'count', r.count,
                'users', r.users
              )
            )
            FROM (
              SELECT 
                mr.emoji,
                COUNT(*)::int as count,
                json_agg(
                  json_build_object(
                    'user_id', ru.user_id,
                    'name', ru.name
                  ) ORDER BY mr.created_at
                ) as users
              FROM message_reactions mr
              JOIN users ru ON mr.user_id = ru.user_id
              WHERE mr.message_id = cm.message_id
              GROUP BY mr.emoji
            ) r
          ),
          '[]'::json
        ) as reactions,
        sk.aes_key_encrypted as user_session_key
      FROM chat_messages cm
      LEFT JOIN users u ON cm.sender_id = u.user_id
      LEFT JOIN chat_messages pm ON cm.parent_message_id = pm.message_id
      LEFT JOIN users pu ON pm.sender_id = pu.user_id
      LEFT JOIN chat_session_keys sk ON cm.key_id = sk.session_key_id AND sk.encrypted_for_user_id = $2
      WHERE cm.conversation_id = $1
      ${before ? 'AND cm.created_at < $4' : ''}
      AND cm.is_deleted = false
      AND cm.deleted_for_everyone = false
      AND NOT ($2::uuid = ANY(COALESCE(cm.deleted_for_user_ids, ARRAY[]::uuid[])))
      ORDER BY cm.created_at DESC
      LIMIT $3`,
      before ? [conversationId, userId, limit, before] : [conversationId, userId, limit]
    );

    // Redis Messaging Layer
    // 1. Reset unread count for this user in this chat
    await resetUnread(userId, conversationId as string);

    res.json({
      success: true,
      data: {
        conversation: conversation,
        messages: result.rows.reverse(),
        otherUser: otherUserData
      }
    });
  } catch (error) {
    // Don't log 403 errors as errors - they're expected when checking if conversation is anonymous
    if (error instanceof ApiError && error.statusCode === 403) {
      // Silent - this is expected when frontend checks regular vs anonymous
    } else {
      console.error('[ERROR] Get regular messages error:', error);
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to fetch regular messages');
  }
}

// Send a regular message (non-anonymous)
export async function sendMessage(req: Request, res: Response) {
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
      keyId,
      parentMessageId
    } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!conversationId || !encryptedContent || !contentIv || !contentAuthTag) {
      throw new ApiError(400, 'Missing required fields');
    }

    // Check if user is part of regular conversation
    const convCheck = await pool.query(
      `SELECT * FROM chat_conversations 
       WHERE conversation_id = $1 
       AND (user1_id = $2 OR user2_id = $2)
       AND is_blocked = false
       AND (is_anonymous = false OR is_anonymous IS NULL)
       AND anonymous_initiator_id IS NULL`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      throw new ApiError(403, 'Access denied or conversation blocked/not regular');
    }

    // Get other user ID and check blocking status
    const conv = convCheck.rows[0];
    const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;

    const blockCheck = await pool.query(
      `SELECT EXISTS(
        SELECT 1 FROM user_blocks 
        WHERE (blocker_id = $1 AND blocked_id = $2) 
           OR (blocker_id = $2 AND blocked_id = $1)
      ) as is_blocked`,
      [userId, otherUserId]
    );

    if (blockCheck.rows[0].is_blocked) {
      throw new ApiError(403, 'Cannot send message - user is blocked');
    }

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
        key_id,
        parent_message_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, NULL, $11, $12)
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
        keyId, // Using keyId from request (session_key_id)
        parentMessageId || null
      ]
    );

    const message = result.rows[0];

    // Update conversation last_message_at
    await pool.query(
      'UPDATE chat_conversations SET last_message_at = NOW() WHERE conversation_id = $1',
      [conversationId]
    );

    // Emit socket event with real sender info
    if (io) {
      const userInfo = await pool.query(
        'SELECT name, gender, dp_url FROM users WHERE user_id = $1',
        [userId]
      );

      const senderInfo = {
        user_id: userId,
        name: userInfo.rows[0].name,
        display_gender: userInfo.rows[0].gender,
        dp_url: userInfo.rows[0].dp_url,
        is_anonymous: false,
      };

      // Fetch full message with parent info for socket emission
      const fullMessageResult = await pool.query(
        `SELECT 
          cm.*,
          CASE
            WHEN cm.parent_message_id IS NOT NULL THEN jsonb_build_object(
              'message_id', pm.message_id,
              'encrypted_content', pm.encrypted_content,
              'content_iv', pm.content_iv,
              'content_auth_tag', pm.content_auth_tag,
              'sender', jsonb_build_object(
                'name', pu.name
              )
            )
            ELSE null
          END as parent_message,
          sk.aes_key_encrypted as user_session_key
        FROM chat_messages cm
        LEFT JOIN chat_messages pm ON cm.parent_message_id = pm.message_id
        LEFT JOIN users pu ON pm.sender_id = pu.user_id
        LEFT JOIN chat_session_keys sk ON cm.key_id = sk.session_key_id AND sk.encrypted_for_user_id != $2
        WHERE cm.message_id = $1`,
        [message.message_id, userId]
      );

      emitToConversation(io, conversationId, 'new-message', {
        ...fullMessageResult.rows[0],
        sender: senderInfo,
        is_my_message: false,
      });
    }

    // Redis Messaging Layer
    const fullMessage = message; // Basic message object from DB insert

    // 1. Cache the message for quick loading
    await cacheMessage(conversationId, fullMessage);

    // 2. Track unread count for recipient
    await incrementUnread(otherUserId, conversationId);

    // 3. Queue for offline delivery if needed
    const online = await isUserOnline(otherUserId);
    if (!online) {
      await queueOfflineMessage(otherUserId, fullMessage);
    }

    // console.log(`💬 Regular message sent in conversation ${conversationId}`);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  }
  catch (error) {
    console.error('[MSGES] Send regular message error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to send regular message');
  }
}

// Get public keys of all participants in a conversation
export async function getParticipantPublicKeys(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;

    if (!userId) throw new ApiError(401, 'Unauthorized');

    // Check if user is part of conversation and get type
    const convCheck = await pool.query(
      `SELECT user1_id, user2_id, is_anonymous FROM chat_conversations 
       WHERE conversation_id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      throw new ApiError(403, 'Access denied to this conversation');
    }

    const { user1_id, user2_id, is_anonymous } = convCheck.rows[0];

    // Fetch public keys for both users
    const result = await pool.query(
      `SELECT uek.user_id, uek.public_key, u.name
       FROM user_encryption_keys uek
       JOIN users u ON uek.user_id = u.user_id
       JOIN chat_conversations cc ON uek.user_id = cc.user1_id OR uek.user_id = cc.user2_id
       WHERE cc.conversation_id = $1`,
      [conversationId]
    );

    res.json({
      success: true,
      data: {
        participants: result.rows,
        isAnonymous: !!is_anonymous
      }
    });
  } catch (error) {
    console.error('[E2EE] Get participant public keys error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to fetch public keys');
  }
}

// Store encrypted session keys for participants
export async function storeSessionKeys(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { conversationId, groupId, keys } = req.body;
    // keys: Array<{ userId: string, encryptedKey: string, keyVersion: number }>

    if (!userId) throw new ApiError(401, 'Unauthorized');
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      throw new ApiError(400, 'Keys array is required');
    }

    // Logic: Insert multiple rows into chat_session_keys/group_session_keys
    // For simplicity, we use chat_session_keys for both but set group_id if applicable.

    // Generate a common ID for this session key setup (so they can be referenced by one key_id)
    const sessionKeyGroupId = crypto.randomUUID();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const k of keys) {
        await client.query(
          `INSERT INTO chat_session_keys (
            session_key_id, conversation_id, group_id, 
            aes_key_encrypted, aes_key_iv,
            encrypted_for_user_id, encrypted_with_key_version
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            sessionKeyGroupId,
            conversationId || null,
            groupId || null,
            k.encryptedKey,
            k.aesKeyIv || null,
            k.userId,
            k.keyVersion || 1
          ]
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.status(201).json({
      success: true,
      data: {
        keyId: sessionKeyGroupId
      }
    });
  } catch (error) {
    console.error('[E2EE] Store session keys error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to store session keys');
  }
}
export async function updateMessageStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;
    const { status } = req.body; // 'delivered' or 'read'

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!status || !['delivered', 'read'].includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    // Update message status
    const result = await pool.query(
      `UPDATE message_status 
       SET status = $1,
           ${status === 'delivered' ? 'delivered_at = NOW()' : 'read_at = NOW()'}
       WHERE message_id = $2 AND user_id = $3
       RETURNING *`,
      [status, messageId, userId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'Message status not found');
    }

    res.json({
      success: true,
      message: 'Message status updated',
      data: result.rows[0]
    });
  }
  catch (error) {
    console.error('[ERROR] Update message status error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to update message status');
  }
}

// Delete a message
export async function deleteMessage(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;
    const { deleteFor } = req.body; // 'me' or 'everyone'

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Check if user owns the message
    const msgCheck = await pool.query(
      'SELECT * FROM chat_messages WHERE message_id = $1 AND sender_id = $2',
      [messageId, userId]
    );

    if (msgCheck.rows.length === 0) {
      throw new ApiError(403, 'You can only delete your own messages');
    }

    if (deleteFor === 'everyone') {
      // Soft delete for everyone
      await pool.query(
        `UPDATE chat_messages 
         SET is_deleted = true, 
             deleted_at = NOW(),
             encrypted_content = '[Message deleted]'
         WHERE message_id = $1`,
        [messageId]
      );
    } else {
      // For "delete for me", we'd need a separate table to track per-user deletions
      // For now, we'll just soft delete
      await pool.query(
        `UPDATE chat_messages 
         SET is_deleted = true, 
             deleted_at = NOW()
         WHERE message_id = $1`,
        [messageId]
      );
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  }
  catch (error) {
    console.error('[ERROR] Delete message error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to delete message');
  }
}

// Block user in conversation
export async function blockUser(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!conversationId || typeof conversationId !== 'string') {
      throw new ApiError(400, 'Invalid conversation ID');
    }

    // Check if user is part of conversation
    const convCheck = await pool.query(
      `SELECT * FROM chat_conversations 
       WHERE conversation_id = $1 
       AND (user1_id = $2 OR user2_id = $2)`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      throw new ApiError(403, 'Not part of this conversation');
    }

    const conversation = convCheck.rows[0];
    const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;

    // Check if already blocked
    const existingBlock = await pool.query(
      `SELECT * FROM user_blocks 
       WHERE blocker_id = $1 AND blocked_id = $2`,
      [userId, otherUserId]
    );

    if (existingBlock.rows.length > 0) {
      throw new ApiError(400, 'User already blocked');
    }

    // Create block record
    await pool.query(
      `INSERT INTO user_blocks (blocker_id, blocked_id, reason, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, otherUserId, 'Blocked from conversation']
    );

    // Update conversation to mark as blocked
    await pool.query(
      `UPDATE chat_conversations 
       SET is_blocked = true, blocked_by_user_id = $1, updated_at = NOW()
       WHERE conversation_id = $2`,
      [userId, conversationId]
    );

    // Emit socket event to notify other user
    emitToConversation(io, conversationId, 'user-blocked', {
      blockedBy: userId,
      conversationId
    });

    res.json({
      success: true,
      message: 'User blocked successfully'
    });
  }
  catch (error) {
    console.error('[ERROR] Block user error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to block user');
  }
}

// Unblock user
export async function unblockUser(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Check if user is part of conversation
    const convCheck = await pool.query(
      `SELECT * FROM chat_conversations 
       WHERE conversation_id = $1 
       AND (user1_id = $2 OR user2_id = $2)`,
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      throw new ApiError(403, 'Not part of this conversation');
    }

    const conversation = convCheck.rows[0];
    const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;

    // Remove block record
    await pool.query(
      `DELETE FROM user_blocks 
       WHERE blocker_id = $1 AND blocked_id = $2`,
      [userId, otherUserId]
    );

    // Update conversation to mark as unblocked
    await pool.query(
      `UPDATE chat_conversations 
       SET is_blocked = false, blocked_by_user_id = NULL, updated_at = NOW()
       WHERE conversation_id = $1`,
      [conversationId]
    );

    res.json({
      success: true,
      message: 'User unblocked successfully'
    });
  }
  catch (error) {
    console.error('[ERROR] Unblock user error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to unblock user');
  }
}

// Report user (works for both regular and anonymous users)
export async function reportUser(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    // Support both new format (reportType, description) and old format (reason, description optional)
    const {
      reportedUserId,
      messageId,
      conversationId,
      reportType,
      reason,
      description,
      evidenceUrls
    } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Use reportType if provided, otherwise use reason (backwards compatibility)
    const finalReportType = reportType || reason;
    // Use description if provided, otherwise use reason (backwards compatibility)
    const finalDescription = description || reason || 'No description provided';

    // // Debug log to help troubleshoot
    // console.log('📝 Report request received:', { 
    //   reportedUserId, 
    //   finalReportType, 
    //   hasDescription: !!finalDescription,
    //   messageId,
    //   conversationId 
    // });

    if (!reportedUserId) {
      throw new ApiError(400, 'Reported user ID is required');
    }

    // Handle anonymous user reports - extract actual user_id from conversation
    let actualReportedUserId = reportedUserId;
    if (reportedUserId === 'ANONYMOUS' && conversationId) {
      // console.log('🎭 Resolving anonymous user ID from conversation:', conversationId);

      const convResult = await pool.query(
        `SELECT 
          cc.user1_id, cc.user2_id, cc.anonymous_initiator_id,
          ai.user_id as initiator_actual_user_id
         FROM chat_conversations cc
         LEFT JOIN anonymous_identities ai ON cc.anonymous_initiator_id = ai.identity_id
         WHERE cc.conversation_id = $1 AND (cc.user1_id = $2 OR cc.user2_id = $2)`,
        [conversationId, userId]
      );

      if (convResult.rows.length === 0) {
        throw new ApiError(404, 'Conversation not found');
      }

      const conv = convResult.rows[0];

      // The reported user is the anonymous initiator (the one who started anonymously)
      if (conv.initiator_actual_user_id) {
        actualReportedUserId = conv.initiator_actual_user_id;
        // console.log('Resolved anonymous user ID:', actualReportedUserId);
      }
      else {
        // If no anonymous initiator, report the other user in conversation
        actualReportedUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;
        // console.log('Resolved regular user ID from conversation:', actualReportedUserId);
      }
    }

    if (!actualReportedUserId) {
      throw new ApiError(400, 'Could not identify reported user');
    }

    if (!finalReportType) {
      throw new ApiError(400, 'Report type or reason is required');
    }

    // // Debug: Extract and compare IDs
    // console.log('🔍 Checking self-report:', {
    //   reporterUserId: userId,
    //   reporterType: typeof userId,
    // reportedUserId: actualReportedUserId,
    //   reportedType: typeof actualReportedUserId,
    //   areEqual: userId === actualReportedUserId,
    //   strictEqual: userId === actualReportedUserId,
    //   looseEqual: userId == actualReportedUserId
    // });

    // Prevent self-reporting (ensure both are strings for comparison)
    const reporterIdStr = String(userId);
    const reportedIdStr = String(actualReportedUserId);

    if (reporterIdStr === reportedIdStr) {
      console.log('[ERROR] Self-report detected!');
      throw new ApiError(400, 'Cannot report yourself');
    }

    // console.log('✅ Different users - report allowed');

    // Validate and normalize report type
    const validTypes = ['spam', 'harassment', 'inappropriate_content', 'impersonating', 'fake_profile', 'other'];
    const normalizedType = finalReportType.toLowerCase().replace(/\s+/g, '_');

    if (!validTypes.includes(normalizedType)) {
      // Try to map common variations
      const typeMap: Record<string, string> = {
        'abuse': 'harassment',
        'bullying': 'harassment',
        'fake': 'fake_profile',
        'impersonate': 'impersonating',
        'inappropriate': 'inappropriate_content',
        'offensive': 'inappropriate_content'
      };

      const mappedType = typeMap[normalizedType];
      if (!mappedType) {
        throw new ApiError(400, `Invalid report type. Must be one of: ${validTypes.join(', ')}`);
      }
    }

    // If conversationId provided, get the actual message_id from the conversation
    let finalMessageId = messageId;
    if (conversationId && !messageId) {
      const lastMessage = await pool.query(
        `SELECT message_id FROM chat_messages 
         WHERE conversation_id = $1 
         AND sender_id = $2
         ORDER BY created_at DESC 
         LIMIT 1`,
        [conversationId, actualReportedUserId]
      );
      if (lastMessage.rows.length > 0) {
        finalMessageId = lastMessage.rows[0].message_id;
      }
    }

    // Get reporter and reported user info for detailed logging
    const reporterInfo = await pool.query(
      'SELECT user_id, name, roll_no, branch, dp_url FROM users WHERE user_id = $1',
      [userId]
    );

    const reportedInfo = await pool.query(
      'SELECT user_id, name, roll_no, gender, branch, dp_url, bio FROM users WHERE user_id = $1',
      [actualReportedUserId]
    );

    // Get message details if messageId provided
    let messageDetails = null;
    if (finalMessageId) {
      const msgResult = await pool.query(
        `SELECT message_id, conversation_id, sender_id, message_type, created_at 
         FROM chat_messages WHERE message_id = $1`,
        [finalMessageId]
      );
      if (msgResult.rows.length > 0) {
        messageDetails = msgResult.rows[0];
      }
    }

    // Create report (matching your database schema)
    const result = await pool.query(
      `INSERT INTO reports (
        reporter_user_id, reported_user_id, reported_message_id,
        report_type, description, evidence_urls
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        userId,
        actualReportedUserId,
        finalMessageId || null,
        normalizedType,
        finalDescription,
        evidenceUrls || []
      ]
    );

    // // Comprehensive logging for admin review
    // console.log('✅ ====== REPORT CREATED ====== ');
    // console.log('Report ID:', result.rows[0].report_id);
    // console.log('\n📋 REPORTER INFO:');
    // console.log('  - User ID:', reporterInfo.rows[0].user_id);
    // console.log('  - Name:', reporterInfo.rows[0].name);
    // console.log('  - Roll No:', reporterInfo.rows[0].roll_no);
    // console.log('  - Branch:', reporterInfo.rows[0].branch);
    // console.log('  - DP URL:', reporterInfo.rows[0].dp_url || 'None');
    // console.log('\n🚨 REPORTED USER INFO:');
    // console.log('  - User ID:', reportedInfo.rows[0].user_id);
    // console.log('  - Name:', reportedInfo.rows[0].name);
    // console.log('  - Roll No:', reportedInfo.rows[0].roll_no);
    // console.log('  - Gender:', reportedInfo.rows[0].gender);
    // console.log('  - Branch:', reportedInfo.rows[0].branch);
    // console.log('  - DP URL:', reportedInfo.rows[0].dp_url || 'None');
    // console.log('  - Bio:', reportedInfo.rows[0].bio || 'None');
    // console.log('\n📝 REPORT DETAILS:');
    // console.log('  - Type:', normalizedType);
    // console.log('  - Description:', finalDescription);
    // console.log('  - Evidence URLs:', evidenceUrls?.length || 0, 'items');
    // console.log('  - Status:', result.rows[0].status);
    // console.log('  - Created At:', result.rows[0].created_at);

    // if (messageDetails) {
    //   console.log('\n💬 MESSAGE CONTEXT:');
    //   console.log('  - Message ID:', messageDetails.message_id);
    //   console.log('  - Conversation ID:', messageDetails.conversation_id);
    //   console.log('  - Message Type:', messageDetails.message_type);
    //   console.log('  - Sent At:', messageDetails.created_at);
    // }

    // if (conversationId) {
    //   console.log('\n🔗 CONVERSATION ID:', conversationId);
    // }

    // console.log('================================\n');

    res.json({
      success: true,
      message: 'Report submitted successfully. Our team will review it.',
      data: {
        reportId: result.rows[0].report_id
      }
    });

  }

  catch (error) {
    console.error('[ERROR] Report user error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to submit report');
  }
}

// Upload chat image to Cloudinary
export async function uploadChatImage(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!req.file) {
      throw new ApiError(400, 'No image file provided');
    }

    // Validate file size (5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      throw new ApiError(400, 'Image size must be less than 5MB');
    }

    // Upload to Cloudinary in chat_images folder with unique ID
    const randomStr = Math.random().toString(36).substring(2, 10);
    const uniqueId = `chat_${userId}_${Date.now()}_${randomStr}`;
    const result = await uploadToCloudinary(
      req.file.buffer,
      'chat_images',
      uniqueId,
      true // Skip transformation for chat images
    );

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        size: req.file.size,
        mimeType: req.file.mimetype,
      }
    });

  } catch (error) {
    console.error('[ERROR] Upload chat image error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to upload image');
  }
}

/**
 * PRESENCE CHECK
 * POST /api/chat/presence
 * Body: { userIds: string[] }
 * Returns { presence: { [userId]: boolean } } built from the Redis online_users set.
 */
export async function getPresence(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const { userIds } = req.body as { userIds?: string[] };
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.json({ success: true, data: { presence: {} } });
  }

  // Clamp to 200 IDs per request to avoid abuse
  const ids = userIds.slice(0, 200);

  const results = await Promise.all(ids.map(async (id) => ({
    id,
    online: await isOnlineRedis(id)
  })));

  const presence: Record<string, boolean> = {};
  for (const { id, online } of results) {
    presence[id] = online;
  }

  res.json({ success: true, data: { presence } });
}
