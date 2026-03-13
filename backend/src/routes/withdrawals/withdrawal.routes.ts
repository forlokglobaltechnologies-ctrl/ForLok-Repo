import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { withdrawalService } from '../../services/withdrawal.service';
import { authenticate, requireAdminPermission } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';
import { ApiResponse } from '../../types';
import { ADMIN_PERMISSIONS } from '../../constants/admin-permissions';

// Request schemas
const createWithdrawalSchema = z.object({
  amount: z.number().min(100, 'Minimum withdrawal amount is ₹100'),
  paymentMethod: z.enum(['bank', 'upi']),
  bankAccount: z
    .object({
      accountNumber: z.string().min(1),
      ifscCode: z.string().min(1),
      accountHolderName: z.string().min(1),
      bankName: z.string().min(1),
    })
    .optional(),
  upiId: z.string().optional(),
});

const completeWithdrawalSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
  notes: z.string().optional(),
});

const rejectWithdrawalSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

export async function withdrawalRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/withdrawals/create
   * Create withdrawal request (authenticated)
   */
  fastify.post(
    '/create',
    {
      preHandler: [authenticate, validate(createWithdrawalSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const data = request.body as {
        amount: number;
        paymentMethod: 'bank' | 'upi';
        bankAccount?: any;
        upiId?: string;
      };

      // Validate payment method specific fields
      if (data.paymentMethod === 'bank' && !data.bankAccount) {
        return reply.status(400).send({
          success: false,
          error: 'Bank account details are required for bank transfer',
        });
      }

      if (data.paymentMethod === 'upi' && !data.upiId) {
        return reply.status(400).send({
          success: false,
          error: 'UPI ID is required for UPI payment',
        });
      }

      const withdrawal = await withdrawalService.createWithdrawal(userId, data);

      const response: ApiResponse = {
        success: true,
        message: 'Withdrawal request submitted successfully. Admin will process it within 24-48 hours.',
        data: withdrawal,
      };

      return reply.status(201).send(response);
    }
  );

  /**
   * GET /api/withdrawals/my-withdrawals
   * Get user's withdrawal history (authenticated)
   */
  fastify.get(
    '/my-withdrawals',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { status, page, limit } = request.query as {
        status?: string;
        page?: number;
        limit?: number;
      };

      const result = await withdrawalService.getUserWithdrawals(userId, {
        status,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Withdrawals retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/withdrawals/:withdrawalId
   * Get withdrawal details (authenticated)
   */
  fastify.get(
    '/:withdrawalId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { withdrawalId } = request.params as { withdrawalId: string };

      const withdrawal = await withdrawalService.getWithdrawalById(withdrawalId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Withdrawal details retrieved successfully',
        data: withdrawal,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/withdrawals/pending
   * Get all pending withdrawals (Admin)
   */
  fastify.get(
    '/admin/pending',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.WITHDRAWALS_VIEW),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { page, limit } = request.query as {
        page?: number;
        limit?: number;
      };

      const result = await withdrawalService.getPendingWithdrawals({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Pending withdrawals retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/withdrawals/approved
   * Get all approved withdrawals (Admin)
   */
  fastify.get(
    '/admin/approved',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.WITHDRAWALS_VIEW),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { page, limit } = request.query as {
        page?: number;
        limit?: number;
      };

      const result = await withdrawalService.getApprovedWithdrawals({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Approved withdrawals retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/admin/withdrawals/:withdrawalId/approve
   * Approve withdrawal (Admin)
   */
  fastify.post(
    '/admin/:withdrawalId/approve',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.WITHDRAWALS_MANAGE),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { withdrawalId } = request.params as { withdrawalId: string };

      const withdrawal = await withdrawalService.approveWithdrawal(withdrawalId, adminId);

      const response: ApiResponse = {
        success: true,
        message: 'Withdrawal approved successfully. Please process the payment.',
        data: withdrawal,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/admin/withdrawals/:withdrawalId/complete
   * Complete withdrawal (Admin - after payment)
   */
  fastify.post(
    '/admin/:withdrawalId/complete',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.WITHDRAWALS_MANAGE),
        validate(completeWithdrawalSchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { withdrawalId } = request.params as { withdrawalId: string };
      const { transactionId, notes } = request.body as {
        transactionId: string;
        notes?: string;
      };

      const withdrawal = await withdrawalService.completeWithdrawal(withdrawalId, adminId, transactionId, notes);

      const response: ApiResponse = {
        success: true,
        message: 'Withdrawal marked as completed successfully',
        data: withdrawal,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/admin/withdrawals/:withdrawalId/reject
   * Reject withdrawal (Admin)
   */
  fastify.post(
    '/admin/:withdrawalId/reject',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.WITHDRAWALS_MANAGE),
        validate(rejectWithdrawalSchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { withdrawalId } = request.params as { withdrawalId: string };
      const { reason } = request.body as { reason: string };

      const withdrawal = await withdrawalService.rejectWithdrawal(withdrawalId, adminId, reason);

      const response: ApiResponse = {
        success: true,
        message: 'Withdrawal rejected successfully',
        data: withdrawal,
      };

      return reply.status(200).send(response);
    }
  );
}
