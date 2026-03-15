import type { Request, Response } from 'express';
import { getNotifications, getNotificationCount, resetNotificationCount } from '../services/notification.service.js';
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
        await resetNotificationCount(userId);
        res.json({
            success: true,
            message: 'Notifications marked as read'
        });
    } catch (error: any) {
        console.error('Error marking notifications as read:', error);
        throw new ApiError(500, 'Failed to mark notifications as read');
    }
};
