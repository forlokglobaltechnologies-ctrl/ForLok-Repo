import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { adminService } from '../../services/admin.service';
import { feedbackService } from '../../services/feedback.service';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';
import { ApiResponse, FeedbackStatus } from '../../types';

export async function adminRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/admin/dashboard/stats
   * Get dashboard statistics (admin)
   */
  fastify.get(
    '/dashboard/stats',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const stats = await adminService.getDashboardStats();

      const response: ApiResponse = {
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: stats,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/users
   * Get all users (admin)
   */
  fastify.get(
    '/users',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        status?: string;
        userType?: string;
        verified?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.userType) filters.userType = query.userType;
      if (query.verified !== undefined) filters.verified = query.verified === 'true';
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await adminService.getAllUsers(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Users retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/users/:userId
   * Get user details (admin)
   */
  fastify.get(
    '/users/:userId',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };

      const userDetails = await adminService.getUserDetails(userId);

      const response: ApiResponse = {
        success: true,
        message: 'User details retrieved successfully',
        data: userDetails,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/users/:userId/verify
   * Verify user (admin)
   */
  fastify.put(
    '/users/:userId/verify',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };

      const user = await adminService.verifyUser(userId);

      const response: ApiResponse = {
        success: true,
        message: 'User verified successfully',
        data: user,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/users/:userId/suspend
   * Suspend user (admin)
   */
  fastify.put(
    '/users/:userId/suspend',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };

      const user = await adminService.suspendUser(userId);

      const response: ApiResponse = {
        success: true,
        message: 'User suspended successfully',
        data: user,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/users/:userId/activate
   * Activate user (admin)
   */
  fastify.put(
    '/users/:userId/activate',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };

      const user = await adminService.activateUser(userId);

      const response: ApiResponse = {
        success: true,
        message: 'User activated successfully',
        data: user,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/pooling/offers
   * Get all pooling offers (admin)
   */
  fastify.get(
    '/pooling/offers',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        status?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await adminService.getAllPoolingOffers(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Pooling offers retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/pooling/offers/:offerId/approve
   * Approve pooling offer (admin)
   */
  fastify.put(
    '/pooling/offers/:offerId/approve',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId } = request.params as { offerId: string };

      const offer = await adminService.approvePoolingOffer(offerId);

      const response: ApiResponse = {
        success: true,
        message: 'Pooling offer approved successfully',
        data: offer,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/pooling/offers/:offerId/suspend
   * Suspend pooling offer (admin)
   */
  fastify.put(
    '/pooling/offers/:offerId/suspend',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId } = request.params as { offerId: string };

      const offer = await adminService.suspendPoolingOffer(offerId);

      const response: ApiResponse = {
        success: true,
        message: 'Pooling offer suspended successfully',
        data: offer,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/rental/offers
   * Get all rental offers (admin)
   */
  fastify.get(
    '/rental/offers',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        status?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await adminService.getAllRentalOffers(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Rental offers retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/rental/offers/:offerId/approve
   * Approve rental offer (admin)
   */
  fastify.put(
    '/rental/offers/:offerId/approve',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId } = request.params as { offerId: string };

      const offer = await adminService.approveRentalOffer(offerId);

      const response: ApiResponse = {
        success: true,
        message: 'Rental offer approved successfully',
        data: offer,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/rental/offers/:offerId/suspend
   * Suspend rental offer (admin)
   */
  fastify.put(
    '/rental/offers/:offerId/suspend',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId } = request.params as { offerId: string };

      const offer = await adminService.suspendRentalOffer(offerId);

      const response: ApiResponse = {
        success: true,
        message: 'Rental offer suspended successfully',
        data: offer,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/bookings
   * Get all bookings (admin)
   */
  fastify.get(
    '/bookings',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        status?: string;
        serviceType?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.serviceType) filters.serviceType = query.serviceType;
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await adminService.getAllBookings(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Bookings retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  // =====================
  // PROMO REVIEW ENDPOINTS
  // =====================

  /**
   * GET /api/admin/promos
   * List promo submissions (admin)
   */
  fastify.get(
    '/promos',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { status?: string; page?: string; limit?: string };
      const status = query.status || 'pending';
      const page = query.page ? parseInt(query.page) : 1;
      const limit = query.limit ? parseInt(query.limit) : 20;
      const skip = (page - 1) * limit;

      const PromoSubmission = (await import('../../models/PromoSubmission')).default;
      const User = (await import('../../models/User')).default;

      const filter: any = {};
      if (status !== 'all') filter.status = status;

      const [submissions, total] = await Promise.all([
        PromoSubmission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        PromoSubmission.countDocuments(filter),
      ]);

      // Attach user names
      const userIds = [...new Set(submissions.map((s: any) => s.userId))];
      const users = await User.find({ userId: { $in: userIds } }).select('userId name').lean();
      const userMap = new Map(users.map((u: any) => [u.userId, u.name]));

      const enriched = submissions.map((s: any) => ({
        ...s,
        userName: userMap.get(s.userId) || 'Unknown',
      }));

      return reply.status(200).send({
        success: true,
        message: 'Promo submissions retrieved',
        data: { submissions: enriched, total, page, limit },
      });
    }
  );

  /**
   * PUT /api/admin/promos/:submissionId/approve
   * Approve promo and award coins (admin)
   */
  fastify.put(
    '/promos/:submissionId/approve',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { submissionId } = request.params as { submissionId: string };

      const PromoSubmission = (await import('../../models/PromoSubmission')).default;
      const { coinService } = await import('../../services/coin.service');
      const { notificationService } = await import('../../services/notification.service');

      const submission = await PromoSubmission.findOne({ submissionId });
      if (!submission) {
        return reply.status(404).send({ success: false, message: 'Submission not found' });
      }
      if (submission.status !== 'pending') {
        return reply.status(400).send({ success: false, message: 'Submission already reviewed' });
      }

      // Award coins
      const coins = await coinService.awardPromoCoins(submission.userId, submissionId, submission.platform);

      submission.status = 'approved';
      submission.reviewedBy = adminId;
      submission.coinsAwarded = coins;
      submission.reviewedAt = new Date();
      await submission.save();

      // Notify user
      await notificationService.createNotification({
        userId: submission.userId,
        type: 'promo_approved',
        title: 'Promotion Approved!',
        message: `Your ${submission.platform.replace(/_/g, ' ')} promotion was approved! You earned ${coins} coins.`,
        data: { submissionId, coins },
      });

      return reply.status(200).send({
        success: true,
        message: `Promo approved. ${coins} coins awarded.`,
        data: submission.toJSON(),
      });
    }
  );

  /**
   * PUT /api/admin/promos/:submissionId/reject
   * Reject promo submission (admin)
   */
  fastify.put(
    '/promos/:submissionId/reject',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { submissionId } = request.params as { submissionId: string };
      const { reason } = request.body as { reason?: string };

      const PromoSubmission = (await import('../../models/PromoSubmission')).default;
      const { notificationService } = await import('../../services/notification.service');

      const submission = await PromoSubmission.findOne({ submissionId });
      if (!submission) {
        return reply.status(404).send({ success: false, message: 'Submission not found' });
      }
      if (submission.status !== 'pending') {
        return reply.status(400).send({ success: false, message: 'Submission already reviewed' });
      }

      submission.status = 'rejected';
      submission.reviewedBy = adminId;
      submission.reviewNote = reason || 'Does not meet requirements';
      submission.reviewedAt = new Date();
      await submission.save();

      // Notify user
      await notificationService.createNotification({
        userId: submission.userId,
        type: 'promo_rejected',
        title: 'Promotion Rejected',
        message: `Your ${submission.platform.replace(/_/g, ' ')} promotion was not approved. ${reason || 'Please try again with valid content.'}`,
        data: { submissionId },
      });

      return reply.status(200).send({
        success: true,
        message: 'Promo submission rejected',
        data: submission.toJSON(),
      });
    }
  );

  /**
   * GET /api/admin/coins/stats
   * Coin system analytics (admin)
   */
  fastify.get(
    '/coins/stats',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const CoinWallet = (await import('../../models/CoinWallet')).default;
      const PromoSubmission = (await import('../../models/PromoSubmission')).default;

      const [wallets, promoStats] = await Promise.all([
        CoinWallet.aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              totalCoinsIssued: { $sum: '$totalEarned' },
              totalCoinsRedeemed: { $sum: '$totalRedeemed' },
              totalCoinsInCirculation: { $sum: '$balance' },
            },
          },
        ]),
        PromoSubmission.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      const stats = wallets[0] || {
        totalUsers: 0,
        totalCoinsIssued: 0,
        totalCoinsRedeemed: 0,
        totalCoinsInCirculation: 0,
      };

      const promos: any = { pending: 0, approved: 0, rejected: 0 };
      promoStats.forEach((p: any) => {
        promos[p._id] = p.count;
      });

      return reply.status(200).send({
        success: true,
        message: 'Coin system stats',
        data: { ...stats, promos },
      });
    }
  );

  // ==================
  // Admin Feedback Routes
  // ==================

  /**
   * GET /api/admin/feedback/stats
   * Get feedback statistics
   */
  fastify.get(
    '/feedback/stats',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const stats = await feedbackService.getFeedbackStats();

      const response: ApiResponse = {
        success: true,
        message: 'Feedback stats retrieved',
        data: stats,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/feedback
   * Get all feedback (admin)
   */
  fastify.get(
    '/feedback',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        status?: string;
        type?: string;
        priority?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.type) filters.type = query.type;
      if (query.priority) filters.priority = query.priority;
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await feedbackService.getAllFeedback(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Feedback retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/feedback/:feedbackId
   * Get feedback details (admin)
   */
  fastify.get(
    '/feedback/:feedbackId',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { feedbackId } = request.params as { feedbackId: string };

      const feedback = await feedbackService.getFeedbackByIdAdmin(feedbackId);

      const response: ApiResponse = {
        success: true,
        message: 'Feedback retrieved successfully',
        data: feedback,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/feedback/:feedbackId/status
   * Update feedback status (admin)
   */
  fastify.put(
    '/feedback/:feedbackId/status',
    {
      preHandler: [
        authenticate,
        requireAdmin,
        validate(z.object({ status: z.enum(['pending', 'acknowledged', 'resolved', 'archived']) })),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { feedbackId } = request.params as { feedbackId: string };
      const { status } = request.body as { status: FeedbackStatus };
      const adminUserId = (request as any).user.userId;

      const feedback = await feedbackService.updateFeedbackStatus(
        feedbackId,
        status,
        adminUserId
      );

      const response: ApiResponse = {
        success: true,
        message: `Feedback status updated to ${status}`,
        data: feedback,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/admin/feedback/:feedbackId/respond
   * Respond to feedback (admin)
   */
  fastify.post(
    '/feedback/:feedbackId/respond',
    {
      preHandler: [
        authenticate,
        requireAdmin,
        validate(z.object({ response: z.string().min(1).max(1000) })),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { feedbackId } = request.params as { feedbackId: string };
      const { response: responseText } = request.body as { response: string };
      const adminUserId = (request as any).user.userId;

      const feedback = await feedbackService.respondToFeedback(
        feedbackId,
        responseText,
        adminUserId
      );

      const apiResponse: ApiResponse = {
        success: true,
        message: 'Response sent successfully',
        data: feedback,
      };

      return reply.status(200).send(apiResponse);
    }
  );
}
