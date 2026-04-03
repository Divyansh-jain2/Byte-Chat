import { pool } from '../lib/db.js';
import { ApiError } from '../utils/error.util.js';
import { cacheKeys, CACHE_TTL_SECONDS, getCacheJSON, setCacheJSON, deleteCacheKeys, invalidateUserProfileCache } from '../utils/cache.util.js';
import { sendConditionalJson } from '../utils/httpCache.util.js';
import {
  addBlockedUserToSet,
  getBlockedUsersListCached,
  invalidateBlockedUsersListCache,
  removeBlockedUserFromSet,
  setBlockedUsersListCached,
  setBlockedUsersSet,
  setEitherBlockedStatusCached,
} from '../services/blockCache.service.js';
import type { Request, Response, NextFunction } from 'express';

export const settingsController = {
  // Get user settings
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const userId = req.user.userId;

      const cached = await getCacheJSON<Record<string, unknown>>(cacheKeys.userSettings(userId));
      if (cached) {
        return sendConditionalJson(req, res, {
          success: true,
          data: cached
        }, {
          maxAgeSeconds: 30,
          cacheStatus: 'HIT'
        });
      }

      const result = await pool.query(
        `SELECT 
          theme, email_notifications, notification_enabled,
          privacy_profile_public, privacy_show_online_status,
          privacy_allow_anonymous_chats
         FROM user_settings 
         WHERE user_id = $1`,
        [userId]
      );

      // If no settings exist, return defaults
      const settings = result.rows.length > 0 ? result.rows[0] : {
        theme: 'light',
        email_notifications: true,
        notification_enabled: true,
        privacy_profile_public: true,
        privacy_show_online_status: true,
        privacy_allow_anonymous_chats: true
      };

      await setCacheJSON(cacheKeys.userSettings(userId), settings, CACHE_TTL_SECONDS.USER_SETTINGS);

      return sendConditionalJson(req, res, {
        success: true,
        data: settings
      }, {
        maxAgeSeconds: 30,
        cacheStatus: 'MISS'
      });
    } catch (error) {
      next(error);
    }
  },

  // Update user settings
  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const userId = req.user.userId;
      const {
        theme,
        email_notifications,
        notification_enabled,
        privacy_profile_public,
        privacy_show_online_status,
        privacy_allow_anonymous_chats
      } = req.body;

      // Upsert settings
      const result = await pool.query(
        `INSERT INTO user_settings (
          user_id, theme, email_notifications, notification_enabled,
          privacy_profile_public, privacy_show_online_status, privacy_allow_anonymous_chats
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id) 
        DO UPDATE SET
          theme = COALESCE($2, user_settings.theme),
          email_notifications = COALESCE($3, user_settings.email_notifications),
          notification_enabled = COALESCE($4, user_settings.notification_enabled),
          privacy_profile_public = COALESCE($5, user_settings.privacy_profile_public),
          privacy_show_online_status = COALESCE($6, user_settings.privacy_show_online_status),
          privacy_allow_anonymous_chats = COALESCE($7, user_settings.privacy_allow_anonymous_chats),
          updated_at = NOW()
        RETURNING *`,
        [userId, theme, email_notifications, notification_enabled, privacy_profile_public, privacy_show_online_status, privacy_allow_anonymous_chats]
      );

      await setCacheJSON(cacheKeys.userSettings(userId), result.rows[0], CACHE_TTL_SECONDS.USER_SETTINGS);

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  },

  // Get blocked users
  async getBlockedUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const cached = await getBlockedUsersListCached<Array<Record<string, unknown>>>(String(userId));
      if (cached) {
        return res.json({
          success: true,
          data: cached
        });
      }

      const result = await pool.query(
        `SELECT DISTINCT ON (ub.block_id)
          ub.block_id, ub.blocker_id, ub.blocked_id, ub.reason, ub.created_at, ub.expires_at,
          cc.is_anonymous,
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
         AND (ub.expires_at IS NULL OR ub.expires_at > NOW())
         ORDER BY ub.block_id, ub.created_at DESC`,
        [userId]
      );

      await setBlockedUsersListCached(String(userId), result.rows);
      await setBlockedUsersSet(
        String(userId),
        result.rows.map((row) => String(row.blocked_id)).filter(Boolean)
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      next(error);
    }
  },

  // Block a user
  async blockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { blockedUserId } = req.params;
      const { reason, expiresAt } = req.body;

      if (userId === blockedUserId) {
        throw new ApiError(400, 'Cannot block yourself');
      }

      // Check if user exists
      const userCheck = await pool.query(
        'SELECT user_id FROM users WHERE user_id = $1',
        [blockedUserId]
      );

      if (userCheck.rows.length === 0) {
        throw new ApiError(404, 'User not found');
      }

      const result = await pool.query(
        `INSERT INTO user_blocks (blocker_id, blocked_id, reason, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (blocker_id, blocked_id) 
         DO UPDATE SET 
           reason = $3,
           expires_at = $4,
           created_at = NOW()
         RETURNING *`,
        [userId, blockedUserId, reason, expiresAt]
      );

      await addBlockedUserToSet(String(userId), String(blockedUserId));
      await setEitherBlockedStatusCached(String(userId), String(blockedUserId), true);
      await invalidateBlockedUsersListCache(String(userId));

      res.json({
        success: true,
        message: 'User blocked successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  },

  // Unblock a user
  async unblockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { blockedUserId } = req.params;

      const result = await pool.query(
        'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2 RETURNING *',
        [userId, blockedUserId]
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, 'Block not found');
      }

      await removeBlockedUserFromSet(String(userId), String(blockedUserId));

      const remainingPairCheck = await pool.query(
        `SELECT EXISTS(
          SELECT 1 FROM user_blocks
          WHERE (blocker_id = $1 AND blocked_id = $2)
             OR (blocker_id = $2 AND blocked_id = $1)
        ) as is_blocked`,
        [userId, blockedUserId]
      );

      await setEitherBlockedStatusCached(
        String(userId),
        String(blockedUserId),
        Boolean(remainingPairCheck.rows[0]?.is_blocked)
      );

      await invalidateBlockedUsersListCache(String(userId));

      res.json({
        success: true,
        message: 'User unblocked successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete account
  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const { password } = req.body;

      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      if (!password) {
        throw new ApiError(400, 'Password is required to delete account');
      }

      // Verify password
      const userResult = await pool.query(
        'SELECT password_hash FROM users WHERE user_id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new ApiError(404, 'User not found');
      }

      const { verifyPassword } = await import('../utils/password.util.js');
      const isValid = await verifyPassword(userResult.rows[0].password_hash, password);

      if (!isValid) {
        throw new ApiError(401, 'Invalid password');
      }

      // Soft delete - deactivate account
      await pool.query(
        `UPDATE users 
         SET is_active = FALSE, 
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      // Invalidate all sessions
      await pool.query(
        'DELETE FROM user_sessions WHERE user_id = $1',
        [userId]
      );

      await deleteCacheKeys([
        cacheKeys.userSettings(String(userId)),
        cacheKeys.userProfile(String(userId)),
        cacheKeys.userProfileStatus(String(userId)),
      ]);

      const rollNoResult = await pool.query(
        'SELECT roll_no FROM users WHERE user_id = $1',
        [userId]
      );
      if (rollNoResult.rows.length > 0) {
        await invalidateUserProfileCache(String(userId), rollNoResult.rows[0].roll_no);
      }

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};
