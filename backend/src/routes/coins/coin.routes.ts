import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { coinService } from '../../services/coin.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';

const redeemSchema = z.object({
  bookingId: z.string(),
  coinsToUse: z.number().min(1),
});

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export async function coinRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/coins/balance
   */
  fastify.get(
    '/balance',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const balance = await coinService.getBalance(userId);

        const response: ApiResponse = {
          success: true,
          message: 'Coin balance retrieved',
          data: balance,
        };
        return reply.status(200).send(response);
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          message: error.message || 'Failed to get coin balance',
        });
      }
    }
  );

  /**
   * GET /api/coins/transactions
   */
  fastify.get(
    '/transactions',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const query = request.query as { page?: string; limit?: string };
        const page = query.page ? parseInt(query.page) : 1;
        const limit = query.limit ? parseInt(query.limit) : 20;

        const result = await coinService.getTransactions(userId, page, limit);

        const response: ApiResponse = {
          success: true,
          message: 'Coin transactions retrieved',
          data: result,
        };
        return reply.status(200).send(response);
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          message: error.message || 'Failed to get coin transactions',
        });
      }
    }
  );

  /**
   * GET /api/coins/discount-preview?rideAmount=X
   */
  fastify.get(
    '/discount-preview',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const query = request.query as { rideAmount?: string };
        const rideAmount = query.rideAmount ? parseFloat(query.rideAmount) : 0;

        if (rideAmount <= 0) {
          return reply.status(400).send({
            success: false,
            message: 'rideAmount must be positive',
          });
        }

        const balanceData = await coinService.getBalance(userId);
        const discount = coinService.calculateCoinDiscount(balanceData.balance, rideAmount);

        const response: ApiResponse = {
          success: true,
          message: 'Coin discount preview',
          data: {
            coinBalance: balanceData.balance,
            ...discount,
          },
        };
        return reply.status(200).send(response);
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          message: error.message || 'Failed to preview discount',
        });
      }
    }
  );

  /**
   * POST /api/coins/redeem
   */
  fastify.post(
    '/redeem',
    { preHandler: [authenticate, validate(redeemSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const { bookingId, coinsToUse } = request.body as { bookingId: string; coinsToUse: number };

        const result = await coinService.redeemCoins(
          userId,
          coinsToUse,
          'ride_discount',
          `Redeemed ${coinsToUse} coins for ride discount on booking ${bookingId}`,
          bookingId
        );

        const { PRICING_CONFIG } = await import('../../config/pricing.config');
        const discountInr = Math.floor((coinsToUse / PRICING_CONFIG.COIN.CONVERSION_RATE) * 100) / 100;

        const response: ApiResponse = {
          success: true,
          message: `Redeemed ${coinsToUse} coins (₹${discountInr} discount)`,
          data: {
            coinsRedeemed: coinsToUse,
            discountInr,
            newBalance: result.wallet.balance,
          },
        };
        return reply.status(200).send(response);
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          message: error.message || 'Failed to redeem coins',
        });
      }
    }
  );

  /**
   * GET /api/coins/milestones
   */
  fastify.get(
    '/milestones',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const milestones = await coinService.getMilestones(userId);

        const response: ApiResponse = {
          success: true,
          message: 'Milestones retrieved',
          data: milestones,
        };
        return reply.status(200).send(response);
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          message: error.message || 'Failed to get milestones',
        });
      }
    }
  );
}
