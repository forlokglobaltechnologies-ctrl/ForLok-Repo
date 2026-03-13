import Withdrawal from '../models/Withdrawal';
import User from '../models/User';
import { walletService } from './wallet.service';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';
import { PRICING_CONFIG } from '../config/pricing.config';

class WithdrawalService {
  /**
   * Create withdrawal request
   * Checks wallet balance instead of inflowAmount
   */
  async createWithdrawal(
    userId: string,
    data: {
      amount: number;
      paymentMethod: 'bank' | 'upi';
      bankAccount?: {
        accountNumber: string;
        ifscCode: string;
        accountHolderName: string;
        bankName: string;
      };
      upiId?: string;
    }
  ): Promise<any> {
    try {
      // Validate user exists
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Get wallet balance
      const wallet = await walletService.getOrCreateWallet(userId);
      const currentBalance = wallet.balance;

      if (currentBalance < data.amount) {
        throw new ValidationError(`Insufficient wallet balance. Available: ₹${currentBalance}`);
      }

      // Check minimum withdrawal amount
      if (data.amount < PRICING_CONFIG.WALLET.MIN_WITHDRAWAL) {
        throw new ValidationError(`Minimum withdrawal amount is ₹${PRICING_CONFIG.WALLET.MIN_WITHDRAWAL}`);
      }

      // Check if user has pending withdrawal
      const pendingWithdrawal = await Withdrawal.findOne({
        userId,
        status: 'pending',
      });

      if (pendingWithdrawal) {
        throw new ConflictError('You already have a pending withdrawal request. Please wait for it to be processed.');
      }

      // Validate payment method details
      if (data.paymentMethod === 'bank' && !data.bankAccount) {
        throw new ValidationError('Bank account details are required for bank transfer');
      }

      if (data.paymentMethod === 'upi' && !data.upiId) {
        throw new ValidationError('UPI ID is required for UPI payment');
      }

      // Create withdrawal
      const earningReferences = wallet.transactions
        .filter((tx) => tx.type === 'credit' && tx.reason === 'ride_earning')
        .slice()
        .reverse()
        .slice(0, 10)
        .map((tx) => ({
          bookingId: tx.bookingId,
          amount: tx.amount,
          createdAt: tx.createdAt,
          description: tx.description,
        }));

      const withdrawal = await Withdrawal.create({
        userId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        bankAccount: data.bankAccount,
        upiId: data.upiId,
        status: 'pending',
        requestedAt: new Date(),
        earningReferences,
      });

      logger.info(`Withdrawal requested: ${withdrawal.withdrawalId} by user ${userId} for ₹${data.amount}`);

      return withdrawal.toJSON();
    } catch (error) {
      logger.error('Error creating withdrawal:', error);
      throw error;
    }
  }

  /**
   * Get user's withdrawal history
   */
  async getUserWithdrawals(
    userId: string,
    filters?: {
      status?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ withdrawals: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = { userId };
      if (filters?.status) {
        query.status = filters.status;
      }

      const total = await Withdrawal.countDocuments(query);
      const withdrawals = await Withdrawal.find(query)
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        withdrawals: withdrawals.map((w) => w.toJSON()),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting user withdrawals:', error);
      throw error;
    }
  }

  /**
   * Get withdrawal by ID
   */
  async getWithdrawalById(withdrawalId: string, userId?: string): Promise<any> {
    try {
      const query: any = { withdrawalId };
      if (userId) {
        query.userId = userId;
      }

      const withdrawal = await Withdrawal.findOne(query);
      if (!withdrawal) {
        throw new NotFoundError('Withdrawal not found');
      }

      // Manually populate user data since userId is a string, not ObjectId
      const user = await User.findOne({ userId: withdrawal.userId }).select('userId name phone email');
      const withdrawalData = withdrawal.toJSON();
      
      return {
        ...withdrawalData,
        user: user ? user.toJSON() : null,
      };
    } catch (error) {
      logger.error('Error getting withdrawal by ID:', error);
      throw error;
    }
  }

  /**
   * Get all pending withdrawals (Admin)
   */
  async getPendingWithdrawals(filters?: {
    page?: number;
    limit?: number;
  }): Promise<{ withdrawals: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const withdrawals = await Withdrawal.find({ status: 'pending' })
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit);

      // Manually populate user data since userId is a string, not ObjectId
      const userIds = withdrawals.map((w) => w.userId);
      const users = await User.find({ userId: { $in: userIds } }).select('userId name phone email');
      const userMap = new Map(users.map((u) => [u.userId, u.toJSON()]));

      const withdrawalsWithUsers = withdrawals.map((w) => {
        const withdrawalData = w.toJSON();
        const user = userMap.get(w.userId);
        return {
          ...withdrawalData,
          user: user || null,
        };
      });

      const total = await Withdrawal.countDocuments({ status: 'pending' });

      return {
        withdrawals: withdrawalsWithUsers,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting pending withdrawals:', error);
      throw error;
    }
  }

  /**
   * Get all approved withdrawals (Admin)
   */
  async getApprovedWithdrawals(filters?: {
    page?: number;
    limit?: number;
  }): Promise<{ withdrawals: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const withdrawals = await Withdrawal.find({ status: 'approved' })
        .sort({ approvedAt: -1 })
        .skip(skip)
        .limit(limit);

      const userIds = withdrawals.map((w) => w.userId);
      const users = await User.find({ userId: { $in: userIds } }).select('userId name phone email');
      const userMap = new Map(users.map((u) => [u.userId, u.toJSON()]));

      const withdrawalsWithUsers = withdrawals.map((w) => {
        const withdrawalData = w.toJSON();
        const user = userMap.get(w.userId);
        return {
          ...withdrawalData,
          user: user || null,
        };
      });

      const total = await Withdrawal.countDocuments({ status: 'approved' });

      return {
        withdrawals: withdrawalsWithUsers,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting approved withdrawals:', error);
      throw error;
    }
  }

  /**
   * Approve withdrawal (Admin)
   * Marks request as approved for payout processing
   */
  async approveWithdrawal(withdrawalId: string, adminId: string): Promise<any> {
    try {
      const withdrawal = await Withdrawal.findOne({ withdrawalId });
      if (!withdrawal) {
        throw new NotFoundError('Withdrawal not found');
      }

      if (withdrawal.status !== 'pending') {
        throw new ConflictError('Withdrawal is not pending');
      }

      // Check wallet balance
      const wallet = await walletService.getOrCreateWallet(withdrawal.userId);
      if (wallet.balance < withdrawal.amount) {
        throw new ValidationError(`User has insufficient wallet balance. Available: ₹${wallet.balance}`);
      }

      // Update withdrawal
      withdrawal.status = 'approved';
      withdrawal.approvedAt = new Date();
      withdrawal.adminId = adminId;
      await withdrawal.save();

      logger.info(`Withdrawal approved: ${withdrawalId} by admin ${adminId}. Amount: ₹${withdrawal.amount}`);

      return withdrawal.toJSON();
    } catch (error) {
      logger.error('Error approving withdrawal:', error);
      throw error;
    }
  }

  /**
   * Complete withdrawal (Admin - after actual bank transfer)
   */
  async completeWithdrawal(
    withdrawalId: string,
    adminId: string,
    transactionId: string,
    notes?: string
  ): Promise<any> {
    try {
      const withdrawal = await Withdrawal.findOne({ withdrawalId });
      if (!withdrawal) {
        throw new NotFoundError('Withdrawal not found');
      }

      if (withdrawal.status !== 'approved') {
        throw new ConflictError('Withdrawal must be approved first');
      }

      if (!transactionId) {
        throw new ValidationError('Transaction ID is required');
      }

      // Debit wallet only when payout is actually sent (completion step)
      const wallet = await walletService.getOrCreateWallet(withdrawal.userId);
      if (wallet.balance < withdrawal.amount) {
        throw new ValidationError(`User has insufficient wallet balance. Available: ₹${wallet.balance}`);
      }

      await walletService.processWithdrawal(
        withdrawal.userId,
        withdrawal.amount,
        withdrawal.withdrawalId
      );

      withdrawal.status = 'completed';
      withdrawal.completedAt = new Date();
      withdrawal.transactionId = transactionId;
      withdrawal.adminId = adminId;
      if (notes) {
        withdrawal.notes = notes;
      }
      await withdrawal.save();

      logger.info(`Withdrawal completed: ${withdrawalId} with transaction ${transactionId} by admin ${adminId}`);

      return withdrawal.toJSON();
    } catch (error) {
      logger.error('Error completing withdrawal:', error);
      throw error;
    }
  }

  /**
   * Reject withdrawal (Admin)
   */
  async rejectWithdrawal(withdrawalId: string, adminId: string, reason: string): Promise<any> {
    try {
      const withdrawal = await Withdrawal.findOne({ withdrawalId });
      if (!withdrawal) {
        throw new NotFoundError('Withdrawal not found');
      }

      if (withdrawal.status !== 'pending') {
        throw new ConflictError('Withdrawal is not pending');
      }

      if (!reason) {
        throw new ValidationError('Rejection reason is required');
      }

      withdrawal.status = 'rejected';
      withdrawal.rejectedAt = new Date();
      withdrawal.rejectionReason = reason;
      withdrawal.adminId = adminId;
      await withdrawal.save();

      logger.info(`Withdrawal rejected: ${withdrawalId} by admin ${adminId}. Reason: ${reason}`);

      return withdrawal.toJSON();
    } catch (error) {
      logger.error('Error rejecting withdrawal:', error);
      throw error;
    }
  }
}

export const withdrawalService = new WithdrawalService();
export default withdrawalService;
