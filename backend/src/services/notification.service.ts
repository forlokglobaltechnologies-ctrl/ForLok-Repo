import Notification from '../models/Notification';
import { generateUserId } from '../utils/helpers';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import { NotificationType } from '../types';

class NotificationService {
  /**
   * Create notification
   */
  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    actionRequired?: boolean;
    actionUrl?: string;
  }): Promise<any> {
    try {
      const notificationId = generateUserId('NOT');
      const notification = await Notification.create({
        notificationId,
        ...data,
        read: false,
      });

      logger.info(`Notification created: ${notificationId} for user: ${data.userId}`);

      return notification.toJSON();
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    filters?: {
      read?: boolean;
      type?: NotificationType;
      page?: number;
      limit?: number;
    }
  ): Promise<{ notifications: any[]; total: number; page: number; limit: number; unreadCount: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = { userId };

      if (filters?.read !== undefined) {
        query.read = filters.read;
      }

      if (filters?.type) {
        query.type = filters.type;
      }

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({ userId, read: false });
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        notifications: notifications.map((n) => n.toJSON()),
        total,
        page,
        limit,
        unreadCount,
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<any> {
    try {
      const notification = await Notification.findOne({
        notificationId,
        userId,
      });

      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      if (!notification.read) {
        notification.read = true;
        notification.readAt = new Date();
        await notification.save();
      }

      return notification.toJSON();
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await Notification.updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() }
      );

      logger.info(`All notifications marked as read for user: ${userId}`);
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const notification = await Notification.findOne({
        notificationId,
        userId,
      });

      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      await Notification.deleteOne({ notificationId });

      logger.info(`Notification deleted: ${notificationId}`);
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await Notification.countDocuments({ userId, read: false });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      return 0;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
