import type { Request, Response } from 'express';
import {
    clearAllNotifications,
    clearConversationNotifications,
    deleteNotificationById,
    getNotificationCount,
    getNotifications,
} from '../services/notification.service.js';
import { ApiError } from '../utils/error.util.js';

export const fetchNotifications = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
        throw new ApiError(401, 'Unauthorized');
    }

    try {
        const notifications = await getNotifications(userId);
        const count = await getNotificationCount(userId);

        res.json({
            success: true,
            data: {
                notifications,
                count
            }
        });
    } catch (error: any) {
        console.error('Error fetching notifications:', error);
        throw new ApiError(500, 'Failed to fetch notifications');
    }
};

export const markNotificationsRead = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
        throw new ApiError(401, 'Unauthorized');
    }

    try {
        await clearAllNotifications(userId);
        res.json({
            success: true,
            message: 'All notifications deleted permanently',
            data: { count: 0 }
        });
    } catch (error: any) {
        console.error('Error marking notifications as read:', error);
        throw new ApiError(500, 'Failed to mark notifications as read');
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const rawNotificationId = req.params.notificationId;
    const notificationId = typeof rawNotificationId === 'string' ? rawNotificationId : undefined;

    if (!userId) throw new ApiError(401, 'Unauthorized');
    if (!notificationId) throw new ApiError(400, 'Notification ID is required');

    try {
        const result = await deleteNotificationById(userId, notificationId);
        res.json({
            success: true,
            message: result.deleted ? 'Notification deleted' : 'Notification not found',
            data: {
                deleted: result.deleted,
                count: result.count,
            }
        });
    } catch (error: any) {
        console.error('Error deleting notification:', error);
        throw new ApiError(500, 'Failed to delete notification');
    }
};

export const clearConversationNotificationItems = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const rawConversationId = req.params.conversationId;
    const conversationId = typeof rawConversationId === 'string' ? rawConversationId : undefined;

    if (!userId) throw new ApiError(401, 'Unauthorized');
    if (!conversationId) throw new ApiError(400, 'Conversation ID is required');

    try {
        const result = await clearConversationNotifications(userId, conversationId);
        res.json({
            success: true,
            message: 'Conversation notifications cleared',
            data: result
        });
    } catch (error: any) {
        console.error('Error clearing conversation notifications:', error);
        throw new ApiError(500, 'Failed to clear conversation notifications');
    }
};
