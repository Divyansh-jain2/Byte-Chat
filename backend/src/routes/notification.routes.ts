import { Router } from 'express';
import { fetchNotifications, markNotificationsRead } from '../controllers/notification.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Apply authentication middleware to all notification routes
router.use(authenticateToken);

// Get notifications and unread count
router.get('/', fetchNotifications);

// Mark notifications as read (reset count)
router.post('/read', markNotificationsRead);

export default router;
