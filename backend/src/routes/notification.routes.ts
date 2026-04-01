import { Router } from 'express';
import {clearConversationNotificationItems, deleteNotification,
	fetchNotifications, markNotificationsRead} from '../controllers/notification.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Apply authentication middleware to all notification routes
router.use(authenticateToken);

// Get notifications and unread count
router.get('/', fetchNotifications);

// Mark notifications as read (reset count)
router.post('/read', markNotificationsRead);

// Delete all notifications permanently
router.delete('/', markNotificationsRead);

// Delete one notification permanently
router.delete('/:notificationId', deleteNotification);

// Clear all notifications tied to a specific direct conversation
router.post('/conversation/:conversationId/clear', clearConversationNotificationItems);

export default router;
