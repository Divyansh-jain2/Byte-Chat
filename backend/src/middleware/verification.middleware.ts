import type { Request, Response, NextFunction } from 'express';
import { pool } from '../lib/db.js';
import { ApiError } from '../utils/error.util.js';

export const requireVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    // Check if user is verified and active
    const result = await pool.query(
      'SELECT is_verified, is_active FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'User not found');
    }

    const { is_verified, is_active } = result.rows[0];

    if (!is_active) {
      throw new ApiError(403, 'Account is deactivated. Please contact support.');
    }

    if (!is_verified) {
      throw new ApiError(403, 'Email verification required. Please verify your email to access this feature.');
    }

    next();
  } catch (error) {
    next(error);
  }
};
