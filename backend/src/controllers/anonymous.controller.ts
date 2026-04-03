import { pool } from '../lib/db.js';
import { ApiError } from '../utils/error.util.js';
import { getUserGenderCached } from '../services/userProfileCache.service.js';
import type { Request, Response, NextFunction } from 'express';

export const anonymousController = {
  // Get all anonymous identities for current user
  async getMyAnonymousIdentities(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized'
        });
      }
      const userId = req.user.userId;
      const result = await pool.query(
        `SELECT 
          ai.identity_id,
          ai.random_string,
          ai.display_gender,
          ai.is_active,
          ai.is_revealed,
          ai.created_at,
          ai.target_user_id,
          ai.group_id,
          CASE 
            WHEN ai.target_user_id IS NOT NULL THEN (
              SELECT json_build_object(
                'user_id', u.user_id,
                'name', u.name,
                'roll_no', u.roll_no,
                'dp_url', u.dp_url
              )
              FROM users u WHERE u.user_id = ai.target_user_id
            )
            ELSE NULL
          END as target_user,
          CASE 
            WHEN ai.group_id IS NOT NULL THEN (
              SELECT json_build_object(
                'group_id', g.group_id,
                'group_name', g.group_name,
                'is_public', g.is_public
              )
              FROM groups g WHERE g.group_id = ai.group_id
            )
            ELSE NULL
          END as target_group,
          CASE 
            WHEN ai.conversation_id IS NOT NULL THEN ai.conversation_id
            ELSE NULL
          END as conversation_id
         FROM anonymous_identities ai
         WHERE ai.user_id = $1
         ORDER BY ai.created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      next(error);
    }
  },

  // Create anonymous identity (when user wants to send anonymous message)
  async createAnonymousIdentity(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized'
        });
      }
      const userId = req.user.userId;
      const { targetUserId, groupId, conversationId } = req.body;

      // Validate: must have either targetUserId or groupId, not both
      if (!targetUserId && !groupId) {
        throw new ApiError(400, 'Either targetUserId or groupId is required');
      }

      if (targetUserId && groupId) {
        throw new ApiError(400, 'Cannot specify both targetUserId and groupId');
      }

      // Get user's gender
      const gender = await getUserGenderCached(String(userId));
      if (!gender) {
        throw new ApiError(404, 'User not found');
      }

      // Check if anonymous identity already exists for this context
      let checkQuery = 'SELECT identity_id, random_string FROM anonymous_identities WHERE user_id = $1 AND is_active = TRUE';
      const checkParams = [userId];

      if (targetUserId) {
        checkQuery += ' AND target_user_id = $2';
        checkParams.push(targetUserId);
      } else {
        checkQuery += ' AND group_id = $2';
        checkParams.push(groupId);
      }

      const existingIdentity = await pool.query(checkQuery, checkParams);

      if (existingIdentity.rows.length > 0) {
        return res.json({
          success: true,
          message: 'Anonymous identity already exists',
          data: existingIdentity.rows[0]
        });
      }

      // Generate unique anonymous string
      const randomString = `anon_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;

      // Create new anonymous identity
      const insertQuery = `
        INSERT INTO anonymous_identities (
          user_id, random_string, display_gender,
          target_user_id, group_id, conversation_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING identity_id, random_string, display_gender, created_at
      `;

      const result = await pool.query(insertQuery, [
        userId,
        randomString,
        gender,
        targetUserId || null,
        groupId || null,
        conversationId || null
      ]);

      res.json({
        success: true,
        message: 'Anonymous identity created successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  },

  // Reveal anonymous identity (switch from anonymous to known)
  async revealIdentity(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized'
        });
      }
      const userId = req.user.userId;
      const { identityId } = req.params;

      // Verify the identity belongs to the user
      const identityResult = await pool.query(
        'SELECT * FROM anonymous_identities WHERE identity_id = $1 AND user_id = $2',
        [identityId, userId]
      );

      if (identityResult.rows.length === 0) {
        throw new ApiError(404, 'Anonymous identity not found');
      }

      const identity = identityResult.rows[0];

      // Mark identity as revealed
      await pool.query(
        'UPDATE anonymous_identities SET is_revealed = TRUE, revealed_at = NOW() WHERE identity_id = $1',
        [identityId]
      );

      // If it's a chat context, we need to create a new "known" conversation
      // This will be handled by the chat controller when user sends next message

      res.json({
        success: true,
        message: 'Identity revealed successfully. Next message will show your profile.',
        data: {
          identity_id: identityId,
          target_user_id: identity.target_user_id,
          group_id: identity.group_id
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get anonymous identity details
  async getAnonymousIdentity(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized'
        });
      }
      const userId = req.user.userId;
      const { identityId } = req.params;

      const result = await pool.query(
        `SELECT 
          ai.identity_id,
          ai.random_string,
          ai.display_gender,
          ai.is_active,
          ai.created_at,
          CASE 
            WHEN ai.target_user_id IS NOT NULL THEN (
              SELECT json_build_object(
                'user_id', u.user_id,
                'name', u.name,
                'roll_no', u.roll_no,
                'dp_url', u.dp_url
              )
              FROM users u WHERE u.user_id = ai.target_user_id
            )
            ELSE NULL
          END as target_user,
          CASE 
            WHEN ai.group_id IS NOT NULL THEN (
              SELECT json_build_object(
                'group_id', g.group_id,
                'group_name', g.group_name,
                'is_public', g.is_public
              )
              FROM groups g WHERE g.group_id = ai.group_id
            )
            ELSE NULL
          END as target_group
         FROM anonymous_identities ai
         WHERE ai.identity_id = $1 AND ai.user_id = $2`,
        [identityId, userId]
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, 'Anonymous identity not found');
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
};
