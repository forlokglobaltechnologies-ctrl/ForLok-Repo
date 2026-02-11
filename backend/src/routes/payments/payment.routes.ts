import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { paymentService } from '../../services/payment.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { verifyWebhookSignature } from '../../config/razorpay';
import { z } from 'zod';
import { ApiResponse } from '../../types';
import Payment from '../../models/Payment';
import logger from '../../utils/logger';
import { walletService } from '../../services/wallet.service';

// Request schemas
const walletTopUpSchema = z.object({
  amount: z.number().min(50),
});

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export async function paymentRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/payments/wallet/top-up
   * Create Razorpay order for wallet top-up (authenticated)
   */
  fastify.post(
    '/wallet/top-up',
    {
      preHandler: [authenticate, validate(walletTopUpSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { amount } = request.body as { amount: number };

      const result = await paymentService.createWalletTopUpOrder({
        userId,
        amount,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Wallet top-up order created successfully',
        data: result,
      };

      return reply.status(201).send(response);
    }
  );

  /**
   * POST /api/payments/verify
   * Verify payment - works for both ride payments and wallet top-ups (authenticated)
   */
  fastify.post(
    '/verify',
    {
      preHandler: [authenticate, validate(verifyPaymentSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = request.body as {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
      };

      const payment = await paymentService.verifyPayment(data);

      const response: ApiResponse = {
        success: true,
        message: 'Payment verified successfully',
        data: payment,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/payments/simulate-test
   * Simulate payment success for test mode (authenticated)
   * Used when Razorpay test keys are configured
   */
  fastify.post(
    '/simulate-test',
    {
      preHandler: [authenticate, validate(z.object({
        razorpayOrderId: z.string(),
      }))],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { razorpayOrderId } = request.body as { razorpayOrderId: string };

      const result = await paymentService.simulateTestPayment(razorpayOrderId);

      const response: ApiResponse = {
        success: true,
        message: result.message,
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/payments/wallet/summary
   * Get wallet balance and summary (authenticated)
   */
  fastify.get(
    '/wallet/summary',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const summary = await walletService.getWalletSummary(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Wallet summary retrieved successfully',
        data: summary,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/payments/wallet/can-book
   * Check if user can book a ride (wallet >= ₹100) (authenticated)
   */
  fastify.get(
    '/wallet/can-book',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const result = await walletService.canBookRide(userId);

      const response: ApiResponse = {
        success: true,
        message: result.canBook
          ? 'You can book rides'
          : `Insufficient wallet balance. Please recharge ₹${result.shortfall} to reach ₹${result.requiredBalance}`,
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/payments/wallet/transactions
   * Get wallet transactions (authenticated)
   */
  fastify.get(
    '/wallet/transactions',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const query = request.query as {
        type?: string;
        page?: string;
        limit?: string;
      };

      const options: any = {};
      if (query.type) options.type = query.type;
      if (query.page) options.page = parseInt(query.page);
      if (query.limit) options.limit = parseInt(query.limit);

      const result = await walletService.getTransactions(userId, options);

      const response: ApiResponse = {
        success: true,
        message: 'Wallet transactions retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/payments/:paymentId
   * Get payment details (authenticated)
   */
  fastify.get(
    '/:paymentId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { paymentId } = request.params as { paymentId: string };

      const payment = await paymentService.getPaymentById(paymentId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Payment retrieved successfully',
        data: payment,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/payments
   * Get user payments (authenticated)
   */
  fastify.get(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const query = request.query as {
        status?: string;
        paymentType?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.paymentType) filters.paymentType = query.paymentType;
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await paymentService.getUserPayments(userId, filters);

      const response: ApiResponse = {
        success: true,
        message: 'Payments retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/payments/methods
   * Get available payment methods
   */
  fastify.get('/methods', async (_request: FastifyRequest, reply: FastifyReply) => {
    const methods = paymentService.getPaymentMethods();

    const response: ApiResponse = {
      success: true,
      message: 'Payment methods retrieved successfully',
      data: methods,
    };

    return reply.status(200).send(response);
  });

  /**
   * POST /api/payments/webhook
   * Razorpay webhook handler
   */
  fastify.post('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-razorpay-signature'] as string;
    const webhookBody = JSON.stringify(request.body);

    if (!signature) {
      return reply.status(400).send({
        success: false,
        message: 'Missing signature',
      });
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(webhookBody, signature);
    if (!isValid) {
      return reply.status(400).send({
        success: false,
        message: 'Invalid signature',
      });
    }

    const event = (request.body as any).event;
    const payload = (request.body as any).payload;

    try {
      if (event === 'payment.captured') {
        const razorpayPaymentId = payload.payment.entity.id;
        const orderId = payload.payment.entity.order_id;

        const payment = await Payment.findOne({ razorpayOrderId: orderId });
        if (payment && payment.status === 'pending') {
          // Use the verify flow to handle all logic (wallet credit, booking update, etc.)
          try {
            await paymentService.verifyPayment({
              razorpayOrderId: orderId,
              razorpayPaymentId: razorpayPaymentId,
              razorpaySignature: signature, // Webhook signature is different; mark as paid directly
            });
          } catch (verifyError) {
            // If signature verification fails via webhook, update directly
            payment.status = 'paid';
            payment.razorpayPaymentId = razorpayPaymentId;
            payment.transactionId = razorpayPaymentId;
            await payment.save();

            // Credit driver wallet for ride payments
            if (payment.paymentType === 'ride_payment' && payment.driverId) {
              await walletService.creditDriverEarnings(
                payment.driverId,
                payment.amount,
                payment.bookingId!
              );
            } else if (payment.paymentType === 'wallet_top_up') {
              await walletService.creditWallet(
                payment.userId,
                payment.totalAmount,
                'top_up',
                'Wallet recharged via webhook',
                payment.paymentId
              );
            }

            logger.info(`Webhook: Payment processed directly: ${payment.paymentId}`);
          }
        }
      } else if (event === 'payment.failed') {
        const orderId = payload.payment.entity.order_id;
        const payment = await Payment.findOne({ razorpayOrderId: orderId });
        if (payment) {
          payment.status = 'failed';
          payment.failureReason = payload.payment.entity.error_description || 'Payment failed';
          await payment.save();
          logger.info(`Webhook: Payment failed: ${payment.paymentId}`);
        }
      }

      return reply.status(200).send({ success: true });
    } catch (error) {
      logger.error('Error processing webhook:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error processing webhook',
      });
    }
  });
}
