import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { uploadImage, handleMulterError } from '../middleware/upload.middleware.js';
import * as anonymousChatController from '../controllers/anonymous-chat.controller.js';

/**
 * ANONYMOUS CHAT ROUTES
 * All routes for anonymous chat functionality
 * Separated from regular chat routes for better modularity
 */

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Anonymous Conversations
router.post('/conversation', anonymousChatController.createAnonymousConversation);
router.get('/conversations', anonymousChatController.getAnonymousConversations);
router.get('/conversation/:conversationId/messages', anonymousChatController.getAnonymousMessages);

// Anonymous Messages
router.post('/send', anonymousChatController.sendAnonymousMessage);

// Image Upload
router.post('/upload-image', uploadImage.single('image'), anonymousChatController.uploadAnonymousChatImage, handleMulterError);

// Identity Reveal
router.post('/reveal/:conversationId', anonymousChatController.revealAnonymousIdentity);

// Custom Name (only receiver can set)
router.put('/identity/:identityId/custom-name', anonymousChatController.updateAnonymousName);

export default router;
