import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { walletService } from '../../services/wallet.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { PRICING_CONFIG } from '../../config/pricing.config';

// Schemas
const topUpSchema = z.object({
  amount: z.number().min(PRICING_CONFIG.WALLET.MIN_TOP_UP),
});

const transactionsQuerySchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v) : 20)),
  type: z.string().optional(),
});

export const walletRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /api/wallet/summary
   * Get wallet summary (balance, can book status)
   */
  app.get(
    '/summary',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const summary = await walletService.getWalletSummary(userId);

        return reply.send({
          success: true,
          data: summary,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * GET /api/wallet/can-book
   * Check if user can book a ride (wallet balance >= ₹100)
   */
  app.get(
    '/can-book',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { role } = request.query as { role?: string };
        const userRole = role === 'driver' ? 'driver' : 'passenger';
        const result = await walletService.canBookRide(userId, userRole);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * POST /api/wallet/top-up
   * Top up wallet (direct credit — for testing. Production uses Razorpay via /api/payments/wallet/top-up)
   */
  app.post(
    '/top-up',
    {
      preHandler: [authenticate, validate(topUpSchema)],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { amount } = request.body as { amount: number };

        // Direct credit for testing/admin use
        const wallet = await walletService.creditWallet(
          userId,
          amount,
          'top_up',
          `Wallet top-up of ₹${amount}`
        );

        return reply.send({
          success: true,
          message: `₹${amount} added to wallet`,
          data: {
            balance: wallet.balance,
            transactionId: wallet.transactions[wallet.transactions.length - 1]?.transactionId,
          },
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * GET /api/wallet/transactions
   * Get wallet transactions history
   */
  app.get(
    '/transactions',
    {
      preHandler: [authenticate, validate(transactionsQuerySchema)],
    },
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { page, limit, type } = request.query as { page: number; limit: number; type?: string };

        const result = await walletService.getTransactions(userId, { page, limit, type });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        return reply.status(error.statusCode || 500).send({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * GET /api/wallet/config
   * Get wallet configuration for frontend
   */
  app.get('/config', async (_request, reply) => {
    return reply.send({
      success: true,
      data: {
        minimumToBook: PRICING_CONFIG.WALLET.MINIMUM_TO_BOOK, // ₹100 for passengers
        minimumForDriver: PRICING_CONFIG.WALLET.MINIMUM_FOR_DRIVER, // ₹0 for drivers
        topUpAmounts: PRICING_CONFIG.WALLET.TOP_UP_AMOUNTS,
        minTopUp: PRICING_CONFIG.WALLET.MIN_TOP_UP,
        minWithdrawal: PRICING_CONFIG.WALLET.MIN_WITHDRAWAL,
      },
    });
  });
};

export default walletRoutes;
