import { Router } from 'express';
import { profileController } from '../controllers/profile.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireVerification } from '../middleware/verification.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get current user's profile (no verification needed - users need to see their own profile)
router.get('/me', profileController.getMyProfile);

// Get profile completion status (no verification needed)
router.get('/status', profileController.getProfileStatus);

// Complete profile after verification (no verification needed - this is the step after email verification)
router.put('/complete', profileController.completeProfile);

// Update profile (no verification needed - users can update before completing verification)
router.put('/update', profileController.updateProfile);

// Everything below requires verification
router.use(requireVerification);

// Get all users (homepage discovery) - requires verification
router.get('/all', profileController.getAllUsers);

// Get user profile by roll number - requires verification
router.get('/:rollNo', profileController.getUserProfile);

export default router;
