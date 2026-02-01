import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Settings routes
router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateSettings);

// Blocked users routes
router.get('/blocked', settingsController.getBlockedUsers);
router.post('/block/:blockedUserId', settingsController.blockUser);
router.delete('/unblock/:blockedUserId', settingsController.unblockUser);

// Account deletion
router.post('/delete-account', settingsController.deleteAccount);

export default router;
