import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import * as messageController from '../controllers/message-management.controller.js';

/**
 * MESSAGE MANAGEMENT ROUTES
 * Handles message reactions, editing, deletion, and threading
 */

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// ========== REACTIONS ==========
router.post('/message/:messageId/reaction', messageController.addReaction);
router.delete('/message/:messageId/reaction', messageController.removeReaction);
router.get('/message/:messageId/reactions', messageController.getReactions);

// ========== EDITING ==========
router.put('/message/:messageId/edit', messageController.editMessage);
router.get('/message/:messageId/history', messageController.getEditHistory);

// ========== DELETION ==========
router.delete('/message/:messageId/delete', messageController.deleteMessageEnhanced);

export default router;
