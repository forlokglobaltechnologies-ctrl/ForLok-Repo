import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { referralService } from '../../services/referral.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const validateCodeSchema = z.object({
  code: z.string().min(1),
});

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export async function referralRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/referrals/my-code
   */
  fastify.get(
    '/my-code',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const code = await referralService.getUserReferralCode(userId);

        const response: ApiResponse = {
          success: true,
          message: 'Referral code retrieved',
          data: { code },
        };
        return reply.status(200).send(response);
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          message: error.message || 'Failed to get referral code',
        });
      }
    }
  );

  /**
   * GET /api/referrals/stats
   */
  fastify.get(
    '/stats',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const stats = await referralService.getReferralStats(userId);

        const response: ApiResponse = {
          success: true,
          message: 'Referral stats retrieved',
          data: stats,
        };
        return reply.status(200).send(response);
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          message: error.message || 'Failed to get referral stats',
        });
      }
    }
  );

  /**
   * POST /api/referrals/validate
   */
  fastify.post(
    '/validate',
    { preHandler: [validate(validateCodeSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { code } = request.body as { code: string };
        const result = await referralService.validateCode(code);

        const response: ApiResponse = {
          success: true,
          message: result.valid ? 'Valid referral code' : 'Invalid referral code',
          data: result,
        };
        return reply.status(200).send(response);
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          message: error.message || 'Failed to validate code',
        });
      }
    }
  );
}
