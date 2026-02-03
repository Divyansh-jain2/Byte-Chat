import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
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

// Identity Reveal
router.post('/reveal/:conversationId', anonymousChatController.revealAnonymousIdentity);

export default router;
