import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import PromoSubmission from '../../models/PromoSubmission';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { generateUserId } from '../../utils/helpers';

const submitPromoSchema = z.object({
  platform: z.enum(['instagram_story', 'instagram_reel', 'youtube_short']),
  proofUrl: z.string().url(),
});

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export async function promoRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/promos/submit
   */
  fastify.post(
    '/submit',
    { preHandler: [authenticate, validate(submitPromoSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const { platform, proofUrl } = request.body as {
          platform: 'instagram_story' | 'instagram_reel' | 'youtube_short';
          proofUrl: string;
        };

        // Rate limit check: 1 story/day, 1 reel/week
        const now = new Date();
        if (platform === 'instagram_story') {
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const recentStory = await PromoSubmission.findOne({
            userId,
            platform: 'instagram_story',
            createdAt: { $gte: oneDayAgo },
          });
          if (recentStory) {
            return reply.status(429).send({
              success: false,
              message: 'You can submit only 1 Instagram story per day. Try again tomorrow.',
            });
          }
        } else {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const recentReel = await PromoSubmission.findOne({
            userId,
            platform: { $in: ['instagram_reel', 'youtube_short'] },
            createdAt: { $gte: oneWeekAgo },
          });
          if (recentReel) {
            return reply.status(429).send({
              success: false,
              message: 'You can submit only 1 reel/short per week. Try again later.',
            });
          }
        }

        // Duplicate URL check
        const duplicateUrl = await PromoSubmission.findOne({ proofUrl });
        if (duplicateUrl) {
          return reply.status(400).send({
            success: false,
            message: 'This proof URL has already been submitted.',
          });
        }

        const submission = await PromoSubmission.create({
          submissionId: generateUserId('PRM'),
          userId,
          platform,
          proofUrl,
          status: 'pending',
          coinsAwarded: 0,
        });

        const response: ApiResponse = {
          success: true,
          message: 'Promotion proof submitted! Admin will review and award coins.',
          data: submission.toJSON(),
        };
        return reply.status(201).send(response);
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          message: error.message || 'Failed to submit promo',
        });
      }
    }
  );

  /**
   * GET /api/promos/my-submissions
   */
  fastify.get(
    '/my-submissions',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const query = request.query as { page?: string; limit?: string };
        const page = query.page ? parseInt(query.page) : 1;
        const limit = query.limit ? parseInt(query.limit) : 20;
        const skip = (page - 1) * limit;

        const [submissions, total] = await Promise.all([
          PromoSubmission.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
          PromoSubmission.countDocuments({ userId }),
        ]);

        const response: ApiResponse = {
          success: true,
          message: 'Submissions retrieved',
          data: { submissions, total, page, limit },
        };
        return reply.status(200).send(response);
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          message: error.message || 'Failed to get submissions',
        });
      }
    }
  );
}
