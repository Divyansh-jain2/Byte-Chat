import { pool } from '../lib/db.js';
import { ApiError } from '../utils/error.util.js';
import type { Request, Response, NextFunction } from 'express';

export const profileController = {
  // Get current user's profile
  async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized' 
        });
      }
      const userId = req.user.userId;
      const result = await pool.query(
        `SELECT 
          user_id, roll_no, name, gender, branch, 
          dp_url, dob, bio, is_verified, 
          created_at, updated_at
         FROM users 
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, 'User not found');
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  },

  // Get user profile by roll number
  async getUserProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { rollNo } = req.params;

      const result = await pool.query(
        `SELECT 
          user_id, roll_no, name, gender, branch, 
          dp_url, dob, bio, created_at
         FROM users 
         WHERE UPPER(roll_no) = UPPER($1) AND is_verified = TRUE AND is_active = TRUE`,
        [rollNo]
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, 'User not found');
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all users (for homepage discovery)
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, branch, gender, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT 
          user_id, roll_no, name, gender, branch, 
          dp_url, bio, created_at
        FROM users 
        WHERE is_verified = TRUE AND is_active = TRUE
      `;
      const params = [];
      let paramCount = 0;

      if (search) {
        paramCount++;
        query += ` AND (LOWER(name) LIKE LOWER($${paramCount}) OR UPPER(roll_no) LIKE UPPER($${paramCount}))`;
        params.push(`%${search}%`);
      }

      if (branch) {
        paramCount++;
        query += ` AND UPPER(branch) = UPPER($${paramCount})`;
        params.push(branch);
      }

      if (gender) {
        paramCount++;
        query += ` AND gender = $${paramCount}`;
        params.push(gender);
      }

      query += ` ORDER BY name ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM users WHERE is_verified = TRUE AND is_active = TRUE';
      const countParams = [];
      let countParamNum = 0;

      if (search) {
        countParamNum++;
        countQuery += ` AND (LOWER(name) LIKE LOWER($${countParamNum}) OR UPPER(roll_no) LIKE UPPER($${countParamNum}))`;
        countParams.push(`%${search}%`);
      }

      if (branch) {
        countParamNum++;
        countQuery += ` AND UPPER(branch) = UPPER($${countParamNum})`;
        countParams.push(branch);
      }

      if (gender) {
        countParamNum++;
        countQuery += ` AND gender = $${countParamNum}`;
        countParams.push(gender);
      }

      const countResult = await pool.query(countQuery, countParams);

      res.json({
        success: true,
        data: {
          users: result.rows,
          total: parseInt(countResult.rows[0].count),
          limit: parseInt(String(limit)),
          offset: parseInt(String(offset))
        }
      });
    } 
    catch (error) {
      next(error);
    }
  },

  // Complete profile (add dob, bio, dp_url)
  async completeProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized' 
        });
      }
      const userId = req.user.userId;
      const { dob, bio, dpUrl } = req.body;

      // Validate dob if provided
      if (dob) {
        const dobDate = new Date(dob);
        const today = new Date();
        const age = today.getFullYear() - dobDate.getFullYear();
        
        if (age < 15 || age > 100) {
          throw new ApiError(400, 'Invalid date of birth');
        }
      }

      const updates = [];
      const params = [];
      let paramCount = 0;

      if (dob !== undefined) {
        paramCount++;
        updates.push(`dob = $${paramCount}`);
        params.push(dob);
      }

      if (bio !== undefined) {
        paramCount++;
        updates.push(`bio = $${paramCount}`);
        params.push(bio);
      }

      if (dpUrl !== undefined) {
        paramCount++;
        updates.push(`dp_url = $${paramCount}`);
        params.push(dpUrl);
      }

      if (updates.length === 0) {
        throw new ApiError(400, 'No fields to update');
      }

      params.push(userId);
      const query = `
        UPDATE users 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE user_id = $${paramCount + 1}
        RETURNING user_id, roll_no, name, gender, branch, dp_url, dob, bio, updated_at
      `;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  },

  // Update profile (same as complete, but specifically for editing)
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized' 
        });
      }
      const userId = req.user.userId;
      const { dob, bio, dpUrl } = req.body;

      // Validate dob if provided
      if (dob) {
        const dobDate = new Date(dob);
        const today = new Date();
        const age = today.getFullYear() - dobDate.getFullYear();
        
        if (age < 15 || age > 100) {
          throw new ApiError(400, 'Invalid date of birth');
        }
      }

      if (bio && bio.length > 500) {
        throw new ApiError(400, 'Bio must be less than 500 characters');
      }

      const updates = [];
      const params = [];
      let paramCount = 0;

      if (dob !== undefined) {
        paramCount++;
        updates.push(`dob = $${paramCount}`);
        params.push(dob);
      }

      if (bio !== undefined) {
        paramCount++;
        updates.push(`bio = $${paramCount}`);
        params.push(bio);
      }

      if (dpUrl !== undefined) {
        paramCount++;
        updates.push(`dp_url = $${paramCount}`);
        params.push(dpUrl);
      }

      if (updates.length === 0) {
        throw new ApiError(400, 'No fields to update');
      }

      params.push(userId);
      const query = `
        UPDATE users 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE user_id = $${paramCount + 1}
        RETURNING user_id, roll_no, name, gender, branch, dp_url, dob, bio, updated_at
      `;

      const result = await pool.query(query, params);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  },

  // Get profile completion status
  async getProfileStatus( req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized' 
        });
      }
      const userId = req.user.userId;

      const result = await pool.query(
        `SELECT 
          CASE WHEN dob IS NOT NULL THEN TRUE ELSE FALSE END as has_dob,
          CASE WHEN bio IS NOT NULL THEN TRUE ELSE FALSE END as has_bio,
          CASE WHEN dp_url IS NOT NULL THEN TRUE ELSE FALSE END as has_dp
         FROM users 
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, 'User not found');
      }

      const status = result.rows[0];
      const isComplete = status.has_dob && status.has_bio && status.has_dp;

      res.json({
        success: true,
        data: {
          ...status,
          is_complete: isComplete
        }
      });
    } catch (error) {
      next(error);
    }
  }
};
