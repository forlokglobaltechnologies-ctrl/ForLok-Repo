import Feedback from '../models/Feedback';
import User from '../models/User';
import { generateUserId } from '../utils/helpers';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import { FeedbackType, FeedbackStatus, FeedbackPriority, NotificationType } from '../types';
import { notificationService } from './notification.service';

class FeedbackService {
  /**
   * Submit feedback
   */
  async submitFeedback(data: {
    userId: string;
    type: FeedbackType;
    subject: string;
    description: string;
    priority?: FeedbackPriority;
  }): Promise<any> {
    try {
      const feedbackId = generateUserId('FB');
      const feedback = await Feedback.create({
        feedbackId,
        ...data,
        priority: data.priority || 'medium',
        status: 'pending',
        timeline: [
          {
            action: 'created',
            toStatus: 'pending',
            message: 'Feedback submitted',
            actorId: data.userId,
            createdAt: new Date(),
          },
        ],
      });

      logger.info(`Feedback submitted: ${feedbackId}`);

      return feedback.toJSON();
    } catch (error) {
      logger.error('Error submitting feedback:', error);
      throw error;
    }
  }

  /**
   * Get user feedback
   */
  async getUserFeedback(
    userId: string,
    filters?: {
      status?: FeedbackStatus;
      type?: FeedbackType;
      page?: number;
      limit?: number;
    }
  ): Promise<{ feedback: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = { userId };

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.type) {
        query.type = filters.type;
      }

      const total = await Feedback.countDocuments(query);
      const feedback = await Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        feedback: feedback.map((f) => f.toJSON()),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting user feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback by ID
   */
  async getFeedbackById(feedbackId: string, userId?: string): Promise<any> {
    try {
      const query: any = { feedbackId };
      if (userId) {
        query.userId = userId;
      }

      const feedback = await Feedback.findOne(query);
      if (!feedback) {
        throw new NotFoundError('Feedback not found');
      }

      return feedback.toJSON();
    } catch (error) {
      logger.error('Error getting feedback by ID:', error);
      throw error;
    }
  }

  // ==================
  // Admin Methods
  // ==================

  /**
   * Get all feedback (admin)
   */
  async getAllFeedback(filters?: {
    status?: FeedbackStatus;
    type?: FeedbackType;
    priority?: FeedbackPriority;
    page?: number;
    limit?: number;
  }): Promise<{ feedback: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = {};
      if (filters?.status) query.status = filters.status;
      if (filters?.type) query.type = filters.type;
      if (filters?.priority) query.priority = filters.priority;

      const total = await Feedback.countDocuments(query);
      const feedbackList = await Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Enrich with user details
      const userIds = [...new Set(feedbackList.map((f) => f.userId))];
      const users = await User.find({ userId: { $in: userIds } }).select(
        'userId name email phone profilePhoto'
      );
      const userMap = new Map(users.map((u) => [u.userId, u]));

      const enrichedFeedback = feedbackList.map((f) => {
        const user = userMap.get(f.userId);
        return {
          ...f.toJSON(),
          user: user
            ? {
                userId: user.userId,
                name: user.name,
                email: user.email,
                phone: user.phone,
                profilePhoto: user.profilePhoto,
              }
            : null,
        };
      });

      return {
        feedback: enrichedFeedback,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting all feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback by ID with user details (admin)
   */
  async getFeedbackByIdAdmin(feedbackId: string): Promise<any> {
    try {
      const feedback = await Feedback.findOne({ feedbackId });
      if (!feedback) {
        throw new NotFoundError('Feedback not found');
      }

      const user = await User.findOne({ userId: feedback.userId }).select(
        'userId name email phone profilePhoto'
      );

      return {
        ...feedback.toJSON(),
        user: user
          ? {
              userId: user.userId,
              name: user.name,
              email: user.email,
              phone: user.phone,
              profilePhoto: user.profilePhoto,
            }
          : null,
      };
    } catch (error) {
      logger.error('Error getting feedback by ID (admin):', error);
      throw error;
    }
  }

  /**
   * Update feedback status (admin) — notifies the user
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: FeedbackStatus,
    adminUserId?: string
  ): Promise<any> {
    try {
      const feedback = await Feedback.findOne({ feedbackId });
      if (!feedback) {
        throw new NotFoundError('Feedback not found');
      }

      const previousStatus = feedback.status;
      feedback.status = status;
      if (adminUserId) {
        feedback.respondedBy = adminUserId;
      }
      feedback.timeline.push({
        action: 'status_changed',
        fromStatus: previousStatus,
        toStatus: status,
        actorId: adminUserId,
        createdAt: new Date(),
      } as any);
      await feedback.save();

      logger.info(`Feedback ${feedbackId} status updated to ${status}`);

      // Send notification to the user about the status change
      if (previousStatus !== status) {
        try {
          const notificationMap: Record<string, { type: NotificationType; title: string; message: string }> = {
            acknowledged: {
              type: 'feedback_acknowledged',
              title: 'Feedback Acknowledged',
              message: `Your ${feedback.type} "${feedback.subject}" has been acknowledged by our team. We are looking into it.`,
            },
            resolved: {
              type: 'feedback_resolved',
              title: 'Feedback Resolved',
              message: `Your ${feedback.type} "${feedback.subject}" has been resolved. Thank you for helping us improve Forlok!`,
            },
            archived: {
              type: 'feedback_archived',
              title: 'Feedback Archived',
              message: `Your ${feedback.type} "${feedback.subject}" has been archived. If you still face issues, please submit a new report.`,
            },
          };

          const notifData = notificationMap[status];
          if (notifData) {
            await notificationService.createNotification({
              userId: feedback.userId,
              type: notifData.type,
              title: notifData.title,
              message: notifData.message,
              data: {
                feedbackId: feedback.feedbackId,
                feedbackType: feedback.type,
                status,
              },
            });
            logger.info(`Notification sent to user ${feedback.userId} for feedback ${feedbackId} status: ${status}`);
          }
        } catch (notifError) {
          // Don't fail the status update if notification fails
          logger.error('Error sending feedback status notification:', notifError);
        }
      }

      return feedback.toJSON();
    } catch (error) {
      logger.error('Error updating feedback status:', error);
      throw error;
    }
  }

  /**
   * Respond to feedback (admin) — notifies the user
   */
  async respondToFeedback(
    feedbackId: string,
    responseText: string,
    adminUserId: string
  ): Promise<any> {
    try {
      const feedback = await Feedback.findOne({ feedbackId });
      if (!feedback) {
        throw new NotFoundError('Feedback not found');
      }

      feedback.adminResponse = responseText;
      feedback.respondedBy = adminUserId;
      feedback.respondedAt = new Date();
      if (feedback.status === 'pending') {
        feedback.status = 'acknowledged' as FeedbackStatus;
      }
      feedback.timeline.push({
        action: 'responded',
        fromStatus: feedback.status,
        toStatus: feedback.status,
        actorId: adminUserId,
        message: responseText,
        createdAt: new Date(),
      } as any);
      await feedback.save();

      logger.info(`Feedback ${feedbackId} responded to by admin ${adminUserId}`);

      // Send notification to the user about the admin response
      try {
        await notificationService.createNotification({
          userId: feedback.userId,
          type: 'feedback_response' as NotificationType,
          title: 'Response to Your Feedback',
          message: `Our team has responded to your ${feedback.type} "${feedback.subject}". Tap to view the response.`,
          data: {
            feedbackId: feedback.feedbackId,
            feedbackType: feedback.type,
            adminResponse: responseText,
            status: feedback.status,
          },
          actionRequired: false,
        });
        logger.info(`Response notification sent to user ${feedback.userId} for feedback ${feedbackId}`);
      } catch (notifError) {
        // Don't fail the response if notification fails
        logger.error('Error sending feedback response notification:', notifError);
      }

      return feedback.toJSON();
    } catch (error) {
      logger.error('Error responding to feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback stats (admin)
   */
  async getFeedbackStats(): Promise<{
    total: number;
    pending: number;
    acknowledged: number;
    resolved: number;
    archived: number;
    byType: { issue: number; suggestion: number; complaint: number };
    byPriority: { high: number; medium: number; low: number };
  }> {
    try {
      const [
        total,
        pending,
        acknowledged,
        resolved,
        archived,
        issues,
        suggestions,
        complaints,
        highPriority,
        mediumPriority,
        lowPriority,
      ] = await Promise.all([
        Feedback.countDocuments(),
        Feedback.countDocuments({ status: 'pending' }),
        Feedback.countDocuments({ status: 'acknowledged' }),
        Feedback.countDocuments({ status: 'resolved' }),
        Feedback.countDocuments({ status: 'archived' }),
        Feedback.countDocuments({ type: 'issue' }),
        Feedback.countDocuments({ type: 'suggestion' }),
        Feedback.countDocuments({ type: 'complaint' }),
        Feedback.countDocuments({ priority: 'high' }),
        Feedback.countDocuments({ priority: 'medium' }),
        Feedback.countDocuments({ priority: 'low' }),
      ]);

      return {
        total,
        pending,
        acknowledged,
        resolved,
        archived,
        byType: { issue: issues, suggestion: suggestions, complaint: complaints },
        byPriority: { high: highPriority, medium: mediumPriority, low: lowPriority },
      };
    } catch (error) {
      logger.error('Error getting feedback stats:', error);
      throw error;
    }
  }

  async assignFeedback(feedbackId: string, assigneeAdminId: string, actorAdminId: string): Promise<any> {
    const feedback = await Feedback.findOne({ feedbackId });
    if (!feedback) {
      throw new NotFoundError('Feedback not found');
    }

    feedback.assignedTo = assigneeAdminId;
    feedback.timeline.push({
      action: 'assigned',
      message: `Assigned to ${assigneeAdminId}`,
      actorId: actorAdminId,
      createdAt: new Date(),
    } as any);
    await feedback.save();
    return feedback.toJSON();
  }
}

export const feedbackService = new FeedbackService();
export default feedbackService;
