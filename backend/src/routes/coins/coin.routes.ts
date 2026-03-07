import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { coinService } from '../../services/coin.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import Booking from '../../models/Booking';
import { ConflictError, NotFoundError } from '../../utils/errors';

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

        const booking = await Booking.findOne({ bookingId, userId });
        if (!booking) {
          throw new NotFoundError('Booking not found');
        }
        if (booking.status === 'completed' || booking.status === 'cancelled') {
          throw new ConflictError('Coins can only be applied before trip completion');
        }
        if ((booking.coinsUsed || 0) > 0) {
          throw new ConflictError('Coins already applied for this booking');
        }

        const payableBase = booking.finalPayableAmount ?? booking.totalAmount;
        const discountPreview = coinService.calculateCoinDiscount(
          (await coinService.getBalance(userId)).balance,
          payableBase
        );
        const coinsToRedeem = Math.min(coinsToUse, discountPreview.maxCoins);
        if (coinsToRedeem <= 0) {
          throw new ConflictError('No eligible coin discount available for this booking');
        }

        const result = await coinService.redeemCoins(
          userId,
          coinsToRedeem,
          'ride_discount',
          `Redeemed ${coinsToRedeem} coins for ride discount on booking ${bookingId}`,
          bookingId
        );

        const { PRICING_CONFIG } = await import('../../config/pricing.config');
        const discountInr = Math.floor((coinsToRedeem / PRICING_CONFIG.COIN.CONVERSION_RATE) * 100) / 100;
        const finalPayableAmount = Math.max(0, parseFloat((payableBase - discountInr).toFixed(2)));

        booking.coinsUsed = coinsToRedeem;
        booking.coinDiscountAmount = discountInr;
        booking.finalPayableAmount = finalPayableAmount;
        await booking.save();

        const response: ApiResponse = {
          success: true,
          message: `Redeemed ${coinsToRedeem} coins (₹${discountInr} discount)`,
          data: {
            coinsRedeemed: coinsToRedeem,
            discountInr,
            finalPayableAmount,
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
