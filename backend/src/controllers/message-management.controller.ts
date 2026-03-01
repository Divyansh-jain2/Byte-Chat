import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { ApiError } from '../utils/error.util.js';
import { emitToConversation } from '../socket/index.js';
import { Server as SocketServer } from 'socket.io';

/**
 * MESSAGE MANAGEMENT CONTROLLER
 * Handles message reactions, editing, deletion, and threading
 */

const io = new SocketServer();


// ========== MESSAGE REACTIONS ==========

// Add reaction to a message
export async function addReaction(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!emoji || typeof emoji !== 'string') {
      throw new ApiError(400, 'Emoji is required');
    }

    // Verify message exists and user has access
    const messageCheck = await pool.query(
      `SELECT m.*, c.user1_id, c.user2_id, g.group_id
       FROM chat_messages m
       LEFT JOIN chat_conversations c ON m.conversation_id = c.conversation_id
       LEFT JOIN groups g ON m.group_id = g.group_id
       WHERE m.message_id = $1 AND m.is_deleted = FALSE AND m.deleted_for_everyone = FALSE`,
      [messageId]
    );

    if (messageCheck.rows.length === 0) {
      throw new ApiError(404, 'Message not found');
    }

    const message = messageCheck.rows[0];

    // Check if user has access (part of conversation or group)
    let hasAccess = false;
    if (message.conversation_id) {
      hasAccess = message.user1_id === userId || message.user2_id === userId;
    } else if (message.group_id) {
      const memberCheck = await pool.query(
        `SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [message.group_id, userId]
      );
      hasAccess = memberCheck.rows.length > 0;
    }

    if (!hasAccess) {
      throw new ApiError(403, 'No access to this message');
    }

    // Add or toggle reaction
    const result = await pool.query(
      `INSERT INTO message_reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, emoji) DO NOTHING
       RETURNING reaction_id`,
      [messageId, userId, emoji]
    );

    // Get reaction counts
    const reactions = await pool.query(
      `SELECT emoji, COUNT(*)::int as count
       FROM message_reactions
       WHERE message_id = $1
       GROUP BY emoji`,
      [messageId]
    );

    // Emit socket event
    if (message.conversation_id) {
      emitToConversation(io, message.conversation_id, 'message:reaction', {
        messageId, userId, emoji, reactions: reactions.rows,
        action: result.rows.length > 0 ? 'add' : 'exists'
      });
    }

    res.json({
      success: true,
      message: 'Reaction added',
      data: { reactions: reactions.rows }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Add reaction error:', error);
      res.status(500).json({ success: false, message: 'Failed to add reaction' });
    }
  }
}

// Remove reaction from a message
export async function removeReaction(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!emoji) {
      throw new ApiError(400, 'Emoji is required');
    }

    // Delete reaction
    const result = await pool.query(
      `DELETE FROM message_reactions
       WHERE message_id = $1 AND user_id = $2 AND emoji = $3
       RETURNING reaction_id`,
      [messageId, userId, emoji]
    );

    // Get updated reaction counts
    const reactions = await pool.query(
      `SELECT emoji, COUNT(*)::int as count
       FROM message_reactions
       WHERE message_id = $1
       GROUP BY emoji`,
      [messageId]
    );

    // Get conversation_id for socket emit
    const messageData = await pool.query(
      `SELECT conversation_id FROM chat_messages WHERE message_id = $1`,
      [messageId]
    );

    if (messageData.rows[0]?.conversation_id) {
      emitToConversation(io, messageData.rows[0].conversation_id, 'message:reaction', {
        messageId,
        userId,
        emoji,
        reactions: reactions.rows,
        action: 'remove'
      });
    }

    res.json({
      success: true,
      message: result.rows.length > 0 ? 'Reaction removed' : 'Reaction not found',
      data: { reactions: reactions.rows }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Remove reaction error:', error);
      res.status(500).json({ success: false, message: 'Failed to remove reaction' });
    }
  }
}

// Get reactions for a message
export async function getReactions(req: Request, res: Response) {
  try {
    const { messageId } = req.params;

    const reactions = await pool.query(
      `SELECT 
        r.emoji,
        COUNT(*)::int as count,
        json_agg(
          json_build_object(
            'user_id', u.user_id,
            'name', u.name,
            'dp_url', u.dp_url
          ) ORDER BY r.created_at
        ) as users
       FROM message_reactions r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.message_id = $1
       GROUP BY r.emoji
       ORDER BY count DESC, r.emoji`,
      [messageId]
    );

    res.json({
      success: true,
      data: { reactions: reactions.rows }
    });
  } catch (error) {
    console.error('Get reactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get reactions' });
  }
}

// ========== MESSAGE EDITING ==========

// Edit a message
export async function editMessage(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;
    const { encryptedContent, contentIv, contentAuthTag } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!encryptedContent || !contentIv || !contentAuthTag) {
      throw new ApiError(400, 'Encrypted content required');
    }

    // Get current message
    const currentMessage = await pool.query(
      `SELECT * FROM chat_messages 
       WHERE message_id = $1 AND sender_id = $2 AND is_deleted = FALSE`,
      [messageId, userId]
    );

    if (currentMessage.rows.length === 0) {
      throw new ApiError(404, 'Message not found or no permission to edit');
    }

    const message = currentMessage.rows[0];

    // Store current version in edit history
    await pool.query(
      `INSERT INTO message_edit_history (
        message_id, previous_encrypted_content, previous_content_iv, 
        previous_content_auth_tag, previous_media_url
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        messageId,
        message.encrypted_content,
        message.content_iv,
        message.content_auth_tag,
        message.media_url
      ]
    );

    // Update message
    const updated = await pool.query(
      `UPDATE chat_messages 
       SET encrypted_content = $1, content_iv = $2, content_auth_tag = $3,
           is_edited = TRUE, edited_at = NOW(), updated_at = NOW()
       WHERE message_id = $4
       RETURNING *`,
      [encryptedContent, contentIv, contentAuthTag, messageId]
    );

    // Emit socket event
    if (message.conversation_id) {
      emitToConversation(io, message.conversation_id, 'message:edited', {
        messageId, encryptedContent, contentIv, contentAuthTag,
        isEdited: true, editedAt: updated.rows[0].edited_at
      });
    }

    res.json({
      success: true,
      message: 'Message edited successfully',
      data: { message: updated.rows[0] }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Edit message error:', error);
      res.status(500).json({ success: false, message: 'Failed to edit message' });
    }
  }
}

// Get edit history for a message
export async function getEditHistory(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Verify user has access to the message
    const messageCheck = await pool.query(
      `SELECT m.*, c.user1_id, c.user2_id
       FROM chat_messages m
       LEFT JOIN chat_conversations c ON m.conversation_id = c.conversation_id
       WHERE m.message_id = $1`,
      [messageId]
    );

    if (messageCheck.rows.length === 0) {
      throw new ApiError(404, 'Message not found');
    }

    const message = messageCheck.rows[0];
    const hasAccess = message.user1_id === userId || message.user2_id === userId;

    if (!hasAccess) {
      throw new ApiError(403, 'No access to this message');
    }

    // Get edit history
    const history = await pool.query(
      `SELECT * FROM message_edit_history 
       WHERE message_id = $1 
       ORDER BY edited_at DESC`,
      [messageId]
    );

    res.json({
      success: true,
      data: { history: history.rows }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Get edit history error:', error);
      res.status(500).json({ success: false, message: 'Failed to get edit history' });
    }
  }
}

// ========== MESSAGE DELETION (Enhanced) ==========

// Delete message (for self or everyone)
export async function deleteMessageEnhanced(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body; // true = delete for all, false = delete for self

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Get message
    const messageResult = await pool.query(
      `SELECT * FROM chat_messages 
       WHERE message_id = $1`,
      [messageId]
    );

    if (messageResult.rows.length === 0) {
      throw new ApiError(404, 'Message not found');
    }

    const message = messageResult.rows[0];

    // Check if user is the sender
    const isSender = message.sender_id === userId;

    if (deleteForEveryone) {
      // Only sender can delete for everyone
      if (!isSender) {
        throw new ApiError(403, 'Only sender can delete message for everyone');
      }

      // Check if message is recent (within 48 hours)
      const messageAge = Date.now() - new Date(message.created_at).getTime();
      const maxAge = 48 * 60 * 60 * 1000; // 48 hours

      if (messageAge > maxAge) {
        throw new ApiError(403, 'Can only delete messages within 48 hours');
      }

      // Delete for everyone
      await pool.query(
        `UPDATE chat_messages 
         SET deleted_for_everyone = TRUE, deleted_at = NOW(), updated_at = NOW()
         WHERE message_id = $1`,
        [messageId]
      );

      // Emit socket event
      if (message.conversation_id) {
        emitToConversation(io, message.conversation_id, 'message:deleted', {
          messageId, deleteForEveryone: true
        });
      }

      res.json({
        success: true,
        message: 'Message deleted for everyone'
      });
    } else {
      // Delete for self only
      await pool.query(
        `UPDATE chat_messages 
         SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW()
         WHERE message_id = $1`,
        [messageId]
      );

      // Emit socket event
      if (message.conversation_id) {
        emitToConversation(io, message.conversation_id, 'message:deleted', {
          messageId, deleteForEveryone: false
        });
      }

      res.json({
        success: true,
        message: 'Message deleted for you'
      });
    }
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Delete message error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete message' });
    }
  }
}
