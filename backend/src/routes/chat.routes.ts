import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import * as chatController from '../controllers/chat.controller.js';

/**
 * REGULAR CHAT ROUTES
 * All routes for regular (non-anonymous) chat functionality
 * For anonymous chat routes, see anonymous-chat.routes.ts
 */

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Chat requests (legacy - now uses conversation creation directly)
router.post('/request', chatController.sendChatRequest);
router.get('/requests', chatController.getChatRequests);
router.put('/request/:requestId', chatController.respondToChatRequest);

// Regular Conversations (non-anonymous)
router.post('/conversation', chatController.getOrCreateConversation);
router.get('/conversations', chatController.getConversations);
router.get('/conversation/:conversationId/messages', chatController.getMessages);

// Regular Messages
router.post('/send', chatController.sendMessage);
router.put('/message/:messageId/status', chatController.updateMessageStatus);
router.delete('/message/:messageId', chatController.deleteMessage);

// Block/Unblock
router.post('/block/:conversationId', chatController.blockUser);
router.delete('/unblock/:conversationId', chatController.unblockUser);

// Report
router.post('/report', chatController.reportUser);

export default router;
