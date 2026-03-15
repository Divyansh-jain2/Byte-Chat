import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { uploadImage, handleMulterError } from '../middleware/upload.middleware.js';
import {
    sendChatRequest,
    getChatRequests,
    respondToChatRequest,
    getOrCreateConversation,
    getConversations,
    getMessages,
    sendMessage,
    updateMessageStatus,
    deleteMessage,
    uploadChatImage,
    blockUser,
    unblockUser,
    reportUser,
    getParticipantPublicKeys,
    storeSessionKeys,
    getPresence
} from '../controllers/chat.controller.js';

/**
 * REGULAR CHAT ROUTES
 * All routes for regular (non-anonymous) chat functionality
 * For anonymous chat routes, see anonymous-chat.routes.ts
 */

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Chat requests (legacy - now uses conversation creation directly)
router.post('/request', sendChatRequest);
router.get('/requests', getChatRequests);
router.put('/request/:requestId', respondToChatRequest);

// Regular Conversations (non-anonymous)
router.post('/conversation', getOrCreateConversation);
router.get('/conversations', getConversations);
router.get('/conversation/:conversationId/messages', getMessages);

// Regular Messages
router.post('/send', sendMessage);
router.put('/message/:messageId/status', updateMessageStatus);
router.delete('/message/:messageId', deleteMessage);

// Image Upload
router.post('/upload-image', uploadImage.single('image'), uploadChatImage, handleMulterError);

// Block/Unblock
router.post('/block/:conversationId', blockUser);
router.delete('/unblock/:conversationId', unblockUser);

// Report
router.post('/report', reportUser);

// E2EE
router.get('/:conversationId/participants/keys', getParticipantPublicKeys);
router.post('/keys', storeSessionKeys);

// Presence (Redis online_users set)
router.post('/presence', getPresence);

export default router;
