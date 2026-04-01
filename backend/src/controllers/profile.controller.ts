import { pool } from '../lib/db.js';
import { ApiError } from '../utils/error.util.js';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId, getDefaultAvatar } from '../utils/cloudinary.util.js';
import { getAvatarUrl, isValidPresetAvatar, getRandomAvatar } from '../utils/avatar.util.js';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';

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
          created_at
         FROM users 
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, 'User not found');
      }

      res.json({
        success: true,
        data: {
          ...result.rows[0],
          instagram_url: null,
          twitter_url: null,
          linkedin_url: null
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get user profile by roll number
  async getUserProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { rollNo } = req.params;
      const currentUserId = req.user?.userId;

      const result = await pool.query(
        `SELECT 
          user_id, roll_no, name, gender, branch, 
          dp_url, dob, bio, 
          instagram_url, twitter_url, linkedin_url,
          created_at
         FROM users 
         WHERE UPPER(roll_no) = UPPER($1) AND is_verified = TRUE AND is_active = TRUE`,
        [rollNo]
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, 'User not found');
      }

      const profileUserId = result.rows[0].user_id;

      // Check if users are blocked (only if viewer is authenticated)
      if (currentUserId && currentUserId !== profileUserId) {
        const blockCheck = await pool.query(
          `SELECT 
            CASE 
              WHEN blocker_id = $1 THEN 'you_blocked'
              WHEN blocker_id = $2 THEN 'blocked_you'
              ELSE NULL
            END as block_type
           FROM user_blocks 
           WHERE (blocker_id = $1 AND blocked_id = $2) 
              OR (blocker_id = $2 AND blocked_id = $1)
           LIMIT 1`,
          [currentUserId, profileUserId]
        );

        if (blockCheck.rows.length > 0) {
          const blockType = blockCheck.rows[0].block_type;
          
          if (blockType === 'blocked_you') {
            // Current user is blocked by the profile owner
            throw new ApiError(403, 'This user has blocked you');
          } else if (blockType === 'you_blocked') {
            // Current user blocked this profile
            return res.json({
              success: true,
              data: result.rows[0],
              blocked: true,
              blockMessage: 'You have blocked this user'
            });
          }
        }
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
      const { dob, bio, dpUrl, instagramUrl, twitterUrl, linkedinUrl } = req.body;

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

      if (instagramUrl !== undefined) {
        paramCount++;
        updates.push(`instagram_url = $${paramCount}`);
        params.push(instagramUrl || null);
      }

      if (twitterUrl !== undefined) {
        paramCount++;
        updates.push(`twitter_url = $${paramCount}`);
        params.push(twitterUrl || null);
      }

      if (linkedinUrl !== undefined) {
        paramCount++;
        updates.push(`linkedin_url = $${paramCount}`);
        params.push(linkedinUrl || null);
      }

      if (updates.length === 0) {
        throw new ApiError(400, 'No fields to update');
      }

      params.push(userId);
      const query = `
        UPDATE users 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE user_id = $${paramCount + 1}
        RETURNING user_id, roll_no, name, gender, branch, dp_url, dob, bio, instagram_url, twitter_url, linkedin_url, updated_at
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
      const { dob, bio, dpUrl, instagramUrl, twitterUrl, linkedinUrl } = req.body;

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

      if (instagramUrl !== undefined) {
        paramCount++;
        updates.push(`instagram_url = $${paramCount}`);
        params.push(instagramUrl || null);
      }

      if (twitterUrl !== undefined) {
        paramCount++;
        updates.push(`twitter_url = $${paramCount}`);
        params.push(twitterUrl || null);
      }

      if (linkedinUrl !== undefined) {
        paramCount++;
        updates.push(`linkedin_url = $${paramCount}`);
        params.push(linkedinUrl || null);
      }

      if (updates.length === 0) {
        throw new ApiError(400, 'No fields to update');
      }

      params.push(userId);
      const query = `
        UPDATE users 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE user_id = $${paramCount + 1}
        RETURNING user_id, roll_no, name, gender, branch, dp_url, dob, bio, instagram_url, twitter_url, linkedin_url, updated_at
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
  },

  // Upload profile picture
  async uploadProfilePicture(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized' 
        });
      }

      if (!req.file) {
        throw new ApiError(400, 'No image file provided');
      }

      const userId = req.user.userId;

      // Get current user data
      const userResult = await pool.query(
        'SELECT dp_url, gender FROM users WHERE user_id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new ApiError(404, 'User not found');
      }

      const currentDpUrl = userResult.rows[0].dp_url;

      // Delete old image from Cloudinary if exists
      if (currentDpUrl) {
        const publicId = extractPublicId(currentDpUrl);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      }

      // Upload new image to Cloudinary
      const uploadResult = await uploadToCloudinary(
        req.file.buffer,
        'profile_pictures',
        `user_${userId}_${Date.now()}`
      );

      // Update database with new image URL
      const updateResult = await pool.query(
        `UPDATE users 
         SET dp_url = $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING user_id, roll_no, name, gender, branch, dp_url, dob, bio, updated_at`,
        [uploadResult.secure_url, userId]
      );

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          user: updateResult.rows[0],
          imageUrl: uploadResult.secure_url
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete profile picture (set to default)
  async deleteProfilePicture(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized' 
        });
      }

      const userId = req.user.userId;

      // Get current user data
      const userResult = await pool.query(
        'SELECT dp_url, gender FROM users WHERE user_id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new ApiError(404, 'User not found');
      }

      const { dp_url: currentDpUrl, gender } = userResult.rows[0];

      // Delete old image from Cloudinary if exists
      if (currentDpUrl) {
        const publicId = extractPublicId(currentDpUrl);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      }

      // Set to default avatar based on gender
      const defaultAvatar = getDefaultAvatar(gender);

      // Update database with default avatar
      const updateResult = await pool.query(
        `UPDATE users 
         SET dp_url = $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING user_id, roll_no, name, gender, branch, dp_url, dob, bio, updated_at`,
        [defaultAvatar, userId]
      );

      res.json({
        success: true,
        message: 'Profile picture deleted and set to default',
        data: {
          user: updateResult.rows[0],
          imageUrl: defaultAvatar
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Select preset avatar
  async selectPresetAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized' 
        });
      }

      const userId = req.user.userId;
      const { avatarId } = req.body;

      // Validate avatar ID if provided, otherwise use random
      let selectedAvatarId = avatarId;
      
      if (avatarId) {
        if (!isValidPresetAvatar(avatarId)) {
          throw new ApiError(400, 'Invalid avatar ID');
        }
      } else {
        // No avatar selected, assign random
        selectedAvatarId = getRandomAvatar();
      }

      // Get current user data
      const userResult = await pool.query(
        'SELECT dp_url FROM users WHERE user_id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new ApiError(404, 'User not found');
      }

      const currentDpUrl = userResult.rows[0].dp_url;

      // Delete old custom uploaded image from Cloudinary if exists (but not preset avatars)
      if (currentDpUrl) {
        const publicId = extractPublicId(currentDpUrl);
        if (publicId && !publicId.startsWith('avatars/')) {
          await deleteFromCloudinary(publicId);
        }
      }

      // Generate avatar URL
      const avatarUrl = getAvatarUrl(selectedAvatarId);

      // Update database with new avatar
      const updateResult = await pool.query(
        `UPDATE users 
         SET dp_url = $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING user_id, roll_no, name, gender, branch, dp_url, dob, bio, updated_at`,
        [avatarUrl, userId]
      );

      res.json({
        success: true,
        message: 'Avatar selected successfully',
        data: {
          user: updateResult.rows[0],
          imageUrl: avatarUrl
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

// Configure Multer for memory storage
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only image files are allowed') as any);
    }
  },
});
