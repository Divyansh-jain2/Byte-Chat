import type { Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { ApiError } from '../utils/error.util.js';
import { io } from '../index.js';
import { getUserProfileCached } from '../services/userProfileCache.service.js';
import { cacheKeys, deleteCacheKeys } from '../utils/cache.util.js';

/**
 * BLOCK & REPORT CONTROLLER
 * Handles user blocking and reporting functionality
 */

async function invalidateConversationListCacheForUsers(userIds: Array<string | undefined | null>): Promise<void> {
  const keys = userIds
    .filter((id): id is string => Boolean(id))
    .map((id) => cacheKeys.userConversations(String(id)));

  await deleteCacheKeys(keys);
}

// ==================== BLOCK FUNCTIONALITY ====================

/** 
 * Block a user
 */
export async function blockUser(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { blockedUserId, reason } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!blockedUserId) {
      throw new ApiError(400, 'Blocked user ID is required');
    }

    // Prevent self-blocking
    if (userId === blockedUserId) {
      throw new ApiError(400, 'Cannot block yourself');
    }

    // Check if already blocked
    const existingBlock = await pool.query(
      'SELECT * FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [userId, blockedUserId]
    );

    if (existingBlock.rows.length > 0) {
      throw new ApiError(400, 'User is already blocked');
    }

    // Create block
    const result = await pool.query(
      `INSERT INTO user_blocks (blocker_id, blocked_id, reason, block_type)
       VALUES ($1, $2, $3, 'permanent')
       RETURNING *`,
      [userId, blockedUserId, reason || null]
    );

    // Block all conversations with this user and set who blocked
    await pool.query(
      `UPDATE chat_conversations 
       SET is_blocked = true, blocked_by_user_id = $1, updated_at = NOW()
       WHERE (user1_id = LEAST($1, $2) AND user2_id = GREATEST($1, $2))`,
      [userId, blockedUserId]
    );

    await invalidateConversationListCacheForUsers([String(userId), String(blockedUserId)]);

    // Reject any pending chat requests
    await pool.query(
      `UPDATE chat_requests 
       SET status = 'rejected'
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       AND status = 'pending'`,
      [userId, blockedUserId]
    );

    res.status(201).json({
      success: true,
      message: 'User blocked successfully',
      data: result.rows[0]
    });
  } 
  catch (error) {
    console.error('[ERROR] Block user error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to block user');
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { blockedUserId } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!blockedUserId) {
      throw new ApiError(400, 'Blocked user ID is required');
    }

    // Delete the block from user_blocks table
    const result = await pool.query(
      'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2 RETURNING *',
      [userId, blockedUserId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'Block not found');
    }

    // Check if ANY blocks remain between these two users (in either direction)
    const remainingBlocksCheck = await pool.query(
      `SELECT blocker_id 
       FROM user_blocks 
       WHERE (blocker_id = $1 AND blocked_id = $2) 
          OR (blocker_id = $2 AND blocked_id = $1)
       LIMIT 1`,
      [userId, blockedUserId]
    );

    const hasRemainingBlocks = remainingBlocksCheck.rows.length > 0;

    // Get the conversation ID to emit socket event
    const conversationQuery = await pool.query(
      `SELECT conversation_id FROM chat_conversations 
       WHERE (user1_id = LEAST($1, $2) AND user2_id = GREATEST($1, $2))`,
      [userId, blockedUserId]
    );

    // Update conversation based on remaining blocks
    if (!hasRemainingBlocks) {
      // No blocks remain - fully unblock the conversation
      await pool.query(
        `UPDATE chat_conversations 
         SET is_blocked = false, 
             blocked_by_user_id = NULL,
             updated_at = NOW()
         WHERE (user1_id = LEAST($1, $2) AND user2_id = GREATEST($1, $2))`,
        [userId, blockedUserId]
      );

      // Emit socket event to notify both users that conversation is unblocked
      if (io && conversationQuery.rows.length > 0) {
        const conversationId = conversationQuery.rows[0].conversation_id;
        io.to(conversationId).emit('conversation-unblocked', {
          conversationId,
          canMessageNow: true,
          unblockedBy: userId
        });
        console.log(`🔓 Conversation ${conversationId} unblocked - notified both users`);
      }
    } else {
      // Blocks still exist - update who is blocking
      const remainingBlockerId = remainingBlocksCheck.rows[0].blocker_id;
      await pool.query(
        `UPDATE chat_conversations 
         SET is_blocked = true,
             blocked_by_user_id = $1,
             updated_at = NOW()
         WHERE (user1_id = LEAST($2, $3) AND user2_id = GREATEST($2, $3))`,
        [remainingBlockerId, userId, blockedUserId]
      );

      // Emit socket event - still blocked by the other user
      if (io && conversationQuery.rows.length > 0) {
        const conversationId = conversationQuery.rows[0].conversation_id;
        io.to(conversationId).emit('conversation-still-blocked', {
          conversationId,
          blockedBy: remainingBlockerId
        });
      }
    }

    await invalidateConversationListCacheForUsers([String(userId), String(blockedUserId)]);

    res.json({
      success: true,
      message: 'User unblocked successfully',
      data: {
        canMessageNow: !hasRemainingBlocks
      }
    });
  } 
  catch (error) {
    console.error('[ERROR] Unblock user error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to unblock user');
  }
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const result = await pool.query(
      `SELECT DISTINCT ON (ub.block_id)
        ub.block_id,
        ub.blocked_id,
        ub.reason,
        ub.created_at,
        cc.is_anonymous,
        cc.conversation_id,
        CASE 
          WHEN cc.is_anonymous = true THEN COALESCE(ai.random_string, 'Anonymous User')
          ELSE u.name
        END as name,
        CASE 
          WHEN cc.is_anonymous = true THEN NULL
          ELSE u.roll_no
        END as roll_no,
        CASE 
          WHEN cc.is_anonymous = true THEN COALESCE(ai.display_gender, u.gender)
          ELSE u.gender
        END as gender,
        CASE 
          WHEN cc.is_anonymous = true THEN NULL
          ELSE u.branch
        END as branch,
        CASE 
          WHEN cc.is_anonymous = true THEN NULL
          ELSE u.dp_url
        END as dp_url,
        COALESCE(cc.is_anonymous, false) as is_anonymous_block
      FROM user_blocks ub
      JOIN users u ON ub.blocked_id = u.user_id
      LEFT JOIN chat_conversations cc ON 
        ((cc.user1_id = LEAST(ub.blocker_id, ub.blocked_id) AND cc.user2_id = GREATEST(ub.blocker_id, ub.blocked_id)))
        AND cc.is_anonymous = true
      LEFT JOIN LATERAL (
        SELECT random_string, display_gender
        FROM anonymous_identities
        WHERE (anonymous_identities.identity_id = cc.anonymous_initiator_id) OR
              (anonymous_identities.user_id = ub.blocked_id AND anonymous_identities.target_user_id = ub.blocker_id AND anonymous_identities.is_active = true)
        ORDER BY anonymous_identities.last_used_at DESC NULLS LAST
        LIMIT 1
      ) ai ON cc.is_anonymous = true
      WHERE ub.blocker_id = $1
      ORDER BY ub.block_id, ub.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } 
  catch (error) {
    console.error('[ERROR] Get blocked users error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to fetch blocked users');
  }
}

/**
 * Check if a user is blocked
 */
export async function checkIfBlocked(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { otherUserId } = req.params;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const result = await pool.query(
      `SELECT EXISTS(
        SELECT 1 FROM user_blocks 
        WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
      ) as is_blocked`,
      [userId, otherUserId]
    );

    res.json({
      success: true,
      data: {
        isBlocked: result.rows[0].is_blocked
      }
    });
  } 
  catch (error) {
    console.error('[ERROR] Check blocked error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to check block status');
  }
}

// ==================== REPORT FUNCTIONALITY ====================

/**
 * Report a user
 */
export async function reportUser(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { 
      reportedUserId, 
      reportType, 
      description, 
      evidenceUrls,
      messageId 
    } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!reportedUserId || !reportType || !description) {
      throw new ApiError(400, 'Missing required fields');
    }

    // Prevent self-reporting
    if (userId === reportedUserId) {
      throw new ApiError(400, 'Cannot report yourself');
    }

    // Validate report type (matching your database schema)
    const validTypes = ['spam', 'harassment', 'inappropriate_content', 'impersonating', 'fake_profile', 'other'];
    if (!validTypes.includes(reportType)) {
      throw new ApiError(400, 'Invalid report type');
    }

    // Get reporter and reported user info for detailed logging
    const reporterInfo = await getUserProfileCached(String(userId));
    if (!reporterInfo) {
      throw new ApiError(404, 'Reporter not found');
    }

    const reportedInfo = await getUserProfileCached(String(reportedUserId));
    if (!reportedInfo) {
      throw new ApiError(404, 'Reported user not found');
    }

    // Get message details if messageId provided
    let messageDetails = null;
    if (messageId) {
      const msgResult = await pool.query(
        `SELECT message_id, conversation_id, sender_id, message_type, created_at 
         FROM chat_messages WHERE message_id = $1`,
        [messageId]
      );
      if (msgResult.rows.length > 0) {
        messageDetails = msgResult.rows[0];
      }
    }

    // Create report
    const result = await pool.query(
      `INSERT INTO reports 
       (reporter_user_id, reported_user_id, reported_message_id, report_type, description, evidence_urls)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, reportedUserId, messageId || null, reportType, description, evidenceUrls || []]
    );

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our team will review it shortly.',
      data: result.rows[0]
    });
  } 
  catch (error) {
    console.error('[ERROR] Report user error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to submit report');
  }
}

/**
 * Report a group
 */
export async function reportGroup(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { 
      reportedGroupId, 
      reportType, 
      description, 
      evidenceUrls 
    } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!reportedGroupId || !reportType || !description) {
      throw new ApiError(400, 'Missing required fields');
    }

    // Validate report type (matching your database schema)
    const validTypes = ['spam', 'harassment', 'inappropriate_content', 'impersonating', 'fake_profile', 'other'];
    if (!validTypes.includes(reportType)) {
      throw new ApiError(400, 'Invalid report type');
    }

    // Get reporter info
    const reporterInfo = await getUserProfileCached(String(userId));
    if (!reporterInfo) {
      throw new ApiError(404, 'Reporter not found');
    }

    // Get reported group info
    const groupInfo = await pool.query(
      `SELECT g.group_id, g.group_name, g.group_desc, g.is_public, g.max_members, g.created_by,
              u.name as creator_name, u.roll_no as creator_roll
       FROM groups g
       LEFT JOIN users u ON g.created_by = u.user_id
       WHERE g.group_id = $1`,
      [reportedGroupId]
    );

    // Create report
    const result = await pool.query(
      `INSERT INTO reports 
       (reporter_user_id, reported_group_id, report_type, description, evidence_urls)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, reportedGroupId, reportType, description, evidenceUrls || []]
    );

    // // Comprehensive logging for admin review
    // console.log('✅ ====== GROUP REPORT CREATED ======');
    // console.log('Report ID:', result.rows[0].report_id);
    // console.log('\n📋 REPORTER INFO:');
    // console.log('  - User ID:', reporterInfo.rows[0].user_id);
    // console.log('  - Name:', reporterInfo.rows[0].name);
    // console.log('  - Roll No:', reporterInfo.rows[0].roll_no);
    // console.log('  - Branch:', reporterInfo.rows[0].branch);
    // if (groupInfo.rows.length > 0) {
    //   console.log('\n🚨 REPORTED GROUP INFO:');
    //   console.log('  - Group ID:', groupInfo.rows[0].group_id);
    //   console.log('  - Group Name:', groupInfo.rows[0].group_name);
    //   console.log('  - Description:', groupInfo.rows[0].group_desc || 'None');
    //   console.log('  - Is Public:', groupInfo.rows[0].is_public);
    //   console.log('  - Max Members:', groupInfo.rows[0].max_members);
    //   console.log('  - Created By:', groupInfo.rows[0].creator_name, `(${groupInfo.rows[0].creator_roll})`);
    // }
    // console.log('\n📝 REPORT DETAILS:');
    // console.log('  - Type:', reportType);
    // console.log('  - Description:', description);
    // console.log('  - Evidence URLs:', evidenceUrls?.length || 0, 'items');
    // console.log('  - Status:', result.rows[0].status);
    // console.log('  - Created At:', result.rows[0].created_at);
    // console.log('================================\n');

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our team will review it shortly.',
      data: result.rows[0]
    });
  } 
  catch (error) {
    console.error('[ERROR] Report group error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to submit report');
  }
}

/**
 * Get user's submitted reports
 */
export async function getMyReports(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const result = await pool.query(
      `SELECT 
        r.*,
        -- Reported user info
        CASE 
          WHEN r.reported_user_id IS NOT NULL THEN 
            json_build_object(
              'user_id', u.user_id,
              'name', u.name,
              'roll_no', u.roll_no,
              'gender', u.gender,
              'branch', u.branch,
              'dp_url', u.dp_url
            )
          ELSE NULL
        END as reported_user,
        -- Reported group info
        CASE 
          WHEN r.reported_group_id IS NOT NULL THEN 
            json_build_object(
              'group_id', g.group_id,
              'group_name', g.group_name,
              'group_desc', g.group_desc,
              'is_public', g.is_public
            )
          ELSE NULL
        END as reported_group,
        -- Message info (if applicable)
        CASE 
          WHEN r.reported_message_id IS NOT NULL THEN 
            json_build_object(
              'message_id', cm.message_id,
              'conversation_id', cm.conversation_id,
              'message_type', cm.message_type,
              'created_at', cm.created_at,
              'sender_id', cm.sender_id
            )
          ELSE NULL
        END as reported_message,
        -- Resolver info (if resolved)
        CASE 
          WHEN r.resolved_by IS NOT NULL THEN 
            json_build_object(
              'user_id', resolver.user_id,
              'name', resolver.name,
              'roll_no', resolver.roll_no
            )
          ELSE NULL
        END as resolver_info
      FROM reports r
      LEFT JOIN users u ON r.reported_user_id = u.user_id
      LEFT JOIN groups g ON r.reported_group_id = g.group_id
      LEFT JOIN chat_messages cm ON r.reported_message_id = cm.message_id
      LEFT JOIN users resolver ON r.resolved_by = resolver.user_id
      WHERE r.reporter_user_id = $1
      ORDER BY r.created_at DESC`,
      [userId]
    );

    // Log comprehensive report list for review
    // console.log(`📋 User ${userId} retrieved ${result.rows.length} reports`);
    // result.rows.forEach((report, index) => {
    //   console.log(`\n=== Report #${index + 1} (ID: ${report.report_id}) ===`);
    //   // console.log('Type:', report.report_type);
    //   // console.log('Status:', report.status);
    //   // console.log('Created:', report.created_at);
    //   if (report.reported_user) {
    //     console.log('Reported User:', report.reported_user.name, `(${report.reported_user.roll_no})`);
    //   }
    //   if (report.reported_group) {
    //     console.log('Reported Group:', report.reported_group.group_name);
    //   }
    //   if (report.reported_message) {
    //     console.log('Reported Message ID:', report.reported_message.message_id);
    //   }
    // });

    res.json({
      success: true,
      data: result.rows
    });
  } 
  catch (error) {
    console.error('[ERROR] Get reports error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to fetch reports');
  }
}

/**
 * Delete a report (only if pending)
 */
export async function deleteReport(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { reportId } = req.params;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const result = await pool.query(
      `DELETE FROM reports 
       WHERE report_id = $1 AND reporter_user_id = $2 AND status = 'pending'
       RETURNING *`,
      [reportId, userId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'Report not found or cannot be deleted');
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } 
  catch (error) {
    console.error('[ERROR] Delete report error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to delete report');
  }
}

/**
 * Get all reports (Admin only - for review purposes)
 * This endpoint provides comprehensive details for admin review
 */
export async function getAllReports(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { status, reportType, limit = 100, offset = 0 } = req.query;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // TODO: Add admin check here when you implement admin roles
    // For now, we'll allow it but log it
    console.log(`[ALERT]  User ${userId} is accessing all reports - ensure this is an admin`);

    let query = `
      SELECT 
        r.*,
        -- Reporter info
        json_build_object(
          'user_id', reporter.user_id,
          'name', reporter.name,
          'roll_no', reporter.roll_no,
          'branch', reporter.branch,
          'dp_url', reporter.dp_url
        ) as reporter_info,
        -- Reported user info
        CASE 
          WHEN r.reported_user_id IS NOT NULL THEN 
            json_build_object(
              'user_id', u.user_id,
              'name', u.name,
              'roll_no', u.roll_no,
              'gender', u.gender,
              'branch', u.branch,
              'dp_url', u.dp_url,
              'is_verified', u.is_verified
            )
          ELSE NULL
        END as reported_user,
        -- Reported group info
        CASE 
          WHEN r.reported_group_id IS NOT NULL THEN 
            json_build_object(
              'group_id', g.group_id,
              'group_name', g.group_name,
              'group_desc', g.group_desc,
              'is_public', g.is_public,
              'created_by', g.created_by
            )
          ELSE NULL
        END as reported_group,
        -- Message info with full context
        CASE 
          WHEN r.reported_message_id IS NOT NULL THEN 
            json_build_object(
              'message_id', cm.message_id,
              'conversation_id', cm.conversation_id,
              'message_type', cm.message_type,
              'created_at', cm.created_at,
              'sender_id', cm.sender_id,
              'is_deleted', cm.is_deleted
            )
          ELSE NULL
        END as reported_message,
        -- Resolver info
        CASE 
          WHEN r.resolved_by IS NOT NULL THEN 
            json_build_object(
              'user_id', resolver.user_id,
              'name', resolver.name,
              'roll_no', resolver.roll_no
            )
          ELSE NULL
        END as resolver_info
      FROM reports r
      INNER JOIN users reporter ON r.reporter_user_id = reporter.user_id
      LEFT JOIN users u ON r.reported_user_id = u.user_id
      LEFT JOIN groups g ON r.reported_group_id = g.group_id
      LEFT JOIN chat_messages cm ON r.reported_message_id = cm.message_id
      LEFT JOIN users resolver ON r.resolved_by = resolver.user_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (reportType) {
      query += ` AND r.report_type = $${paramCount}`;
      params.push(reportType);
      paramCount++;
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // // Comprehensive logging for admin console
    // console.log(`\n📊 ====== ALL REPORTS RETRIEVED ======`);
    // console.log(`Total Reports: ${result.rows.length}`);
    // console.log(`Filter - Status: ${status || 'all'}, Type: ${reportType || 'all'}`);
    // console.log(`Limit: ${limit}, Offset: ${offset}\n`);

    // result.rows.forEach((report, index) => {
    //   console.log(`\n--- Report #${index + 1} ---`);
    //   console.log(`ID: ${report.report_id}`);
    //   console.log(`Type: ${report.report_type} | Status: ${report.status}`);
    //   console.log(`Reporter: ${report.reporter_info.name} (${report.reporter_info.roll_no})`);
    //   if (report.reported_user) {
    //     console.log(`Reported User: ${report.reported_user.name} (${report.reported_user.roll_no})`);
    //     console.log(`  Branch: ${report.reported_user.branch}`);
    //     console.log(`  Gender: ${report.reported_user.gender}`);
    //   }
    //   if (report.reported_group) {
    //     console.log(`Reported Group: ${report.reported_group.group_name}`);
    //   }
    //   if (report.reported_message) {
    //     console.log(`Message ID: ${report.reported_message.message_id}`);
    //     console.log(`Conversation: ${report.reported_message.conversation_id}`);
    //   }
    //   console.log(`Created: ${report.created_at}`);
    //   if (report.resolved_at) {
    //     console.log(`Resolved: ${report.resolved_at} by ${report.resolver_info?.name}`);
    //   }
    //   console.log(`Description:\n${report.description.substring(0, 200)}${report.description.length > 200 ? '...' : ''}`);
    // });
    // console.log(`\n====================================\n`);

    res.json({
      success: true,
      data: {
        reports: result.rows,
        total: result.rows.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } 
  catch (error) {
    console.error('[ERROR] Get all reports error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Failed to fetch all reports');
  }
}
