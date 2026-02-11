import Wallet, { IWallet, IWalletTransaction } from '../models/Wallet';
// User model imported if needed for future wallet-user lookups
import { generateUserId } from '../utils/helpers';
import { ConflictError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';
import { PRICING_CONFIG } from '../config/pricing.config';

class WalletService {
  /**
   * Get or create wallet for user
   */
  async getOrCreateWallet(userId: string): Promise<IWallet> {
    try {
      let wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        // Create new wallet
        wallet = await Wallet.create({
          walletId: generateUserId('WAL'),
          userId,
          balance: 0,
          transactions: [],
        });
        logger.info(`Wallet created for user: ${userId}`);
      }

      return wallet;
    } catch (error) {
      logger.error('Error getting/creating wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet by user ID
   */
  async getWalletByUserId(userId: string): Promise<IWallet | null> {
    try {
      return await Wallet.findOne({ userId });
    } catch (error) {
      logger.error('Error getting wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance summary
   * role: 'passenger' needs ₹100 minimum, 'driver' needs ₹0 (non-negative)
   */
  async getWalletSummary(userId: string): Promise<{
    balance: number;
    canBookRide: boolean;
    canGiveRide: boolean;
    minimumRequired: number;
    minimumForDriver: number;
    recentTransactions: IWalletTransaction[];
  }> {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      const passengerMinimum = PRICING_CONFIG.WALLET.MINIMUM_TO_BOOK;
      const driverMinimum = PRICING_CONFIG.WALLET.MINIMUM_FOR_DRIVER;

      return {
        balance: wallet.balance,
        canBookRide: wallet.balance >= passengerMinimum, // Passenger: ₹100+ to take a ride
        canGiveRide: wallet.balance >= driverMinimum,     // Driver: ₹0+ to give a ride
        minimumRequired: passengerMinimum,
        minimumForDriver: driverMinimum,
        recentTransactions: wallet.transactions.slice(-10).reverse(),
      };
    } catch (error) {
      logger.error('Error getting wallet summary:', error);
      throw error;
    }
  }

  /**
   * Check if user can book a ride
   * Passengers taking rides need ₹100 minimum
   * Drivers giving rides need ₹0 (non-negative balance)
   */
  async canBookRide(userId: string, role: 'passenger' | 'driver' = 'passenger'): Promise<{
    canBook: boolean;
    currentBalance: number;
    requiredBalance: number;
    shortfall: number;
  }> {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      const required = role === 'driver'
        ? PRICING_CONFIG.WALLET.MINIMUM_FOR_DRIVER
        : PRICING_CONFIG.WALLET.MINIMUM_TO_BOOK;
      const shortfall = Math.max(0, required - wallet.balance);

      return {
        canBook: wallet.balance >= required,
        currentBalance: wallet.balance,
        requiredBalance: required,
        shortfall,
      };
    } catch (error) {
      logger.error('Error checking booking eligibility:', error);
      throw error;
    }
  }

  /**
   * Add money to wallet (top-up via Razorpay)
   * Money goes to Forlok's Razorpay account, wallet is just a ledger
   */
  async creditWallet(
    userId: string,
    amount: number,
    reason: IWalletTransaction['reason'],
    description?: string,
    referenceId?: string,
    bookingId?: string
  ): Promise<IWallet> {
    try {
      if (amount <= 0) {
        throw new ValidationError('Amount must be greater than 0');
      }

      const wallet = await this.getOrCreateWallet(userId);

      // Update balance
      wallet.balance += amount;
      wallet.totalCredits += amount;

      // Add transaction
      const transaction: IWalletTransaction = {
        transactionId: generateUserId('WTX'),
        type: 'credit',
        amount,
        reason,
        description: description || this.getTransactionDescription(reason, amount, 'credit'),
        bookingId,
        referenceId,
        balanceAfter: wallet.balance,
        createdAt: new Date(),
      };
      wallet.transactions.push(transaction);

      await wallet.save();

      logger.info(`Wallet credited: ${userId} +₹${amount} (${reason}) | Balance: ₹${wallet.balance}`);
      return wallet;
    } catch (error) {
      logger.error('Error crediting wallet:', error);
      throw error;
    }
  }

  /**
   * Deduct money from wallet
   * Wallet CAN go negative (e.g., from cancellation fees)
   */
  async debitWallet(
    userId: string,
    amount: number,
    reason: IWalletTransaction['reason'],
    description?: string,
    referenceId?: string,
    bookingId?: string
  ): Promise<IWallet> {
    try {
      if (amount <= 0) {
        throw new ValidationError('Amount must be greater than 0');
      }

      const wallet = await this.getOrCreateWallet(userId);

      // Debit — balance CAN go negative
      wallet.balance -= amount;
      wallet.totalDebits += amount;

      // Add transaction
      const transaction: IWalletTransaction = {
        transactionId: generateUserId('WTX'),
        type: 'debit',
        amount,
        reason,
        description: description || this.getTransactionDescription(reason, amount, 'debit'),
        bookingId,
        referenceId,
        balanceAfter: wallet.balance,
        createdAt: new Date(),
      };
      wallet.transactions.push(transaction);

      await wallet.save();

      logger.info(`Wallet debited: ${userId} -₹${amount} (${reason}) | Balance: ₹${wallet.balance}`);
      return wallet;
    } catch (error) {
      logger.error('Error debiting wallet:', error);
      throw error;
    }
  }

  /**
   * Credit driver earnings after trip completion
   * Driver receives (ride amount - platform fee)
   */
  async creditDriverEarnings(
    driverId: string,
    rideAmount: number,
    bookingId: string
  ): Promise<IWallet> {
    try {
      return await this.creditWallet(
        driverId,
        rideAmount,
        'ride_earning',
        `Ride earnings for booking ${bookingId}`,
        undefined,
        bookingId
      );
    } catch (error) {
      logger.error('Error crediting driver earnings:', error);
      throw error;
    }
  }

  /**
   * Deduct cancellation fee from user's wallet
   * Wallet can go negative
   */
  async deductCancellationFee(
    userId: string,
    cancellationFee: number,
    bookingId: string
  ): Promise<IWallet> {
    try {
      return await this.debitWallet(
        userId,
        cancellationFee,
        'cancellation_fee',
        `Cancellation fee for booking ${bookingId}`,
        undefined,
        bookingId
      );
    } catch (error) {
      logger.error('Error deducting cancellation fee:', error);
      throw error;
    }
  }

  /**
   * Process withdrawal request - debit wallet
   * Used when admin approves a withdrawal
   */
  async processWithdrawal(
    userId: string,
    amount: number,
    withdrawalId: string
  ): Promise<IWallet> {
    try {
      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.balance < amount) {
        throw new ConflictError(`Insufficient wallet balance. Available: ₹${wallet.balance}`);
      }

      return await this.debitWallet(
        userId,
        amount,
        'withdrawal',
        `Withdrawal approved: ${withdrawalId}`,
        withdrawalId
      );
    } catch (error) {
      logger.error('Error processing withdrawal:', error);
      throw error;
    }
  }

  /**
   * Get wallet transactions
   */
  async getTransactions(
    userId: string,
    options?: { page?: number; limit?: number; type?: string }
  ): Promise<{
    transactions: IWalletTransaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      let transactions = [...wallet.transactions].reverse();

      // Filter by type if specified
      if (options?.type) {
        transactions = transactions.filter((t) => t.type === options.type);
      }

      const total = transactions.length;
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const skip = (page - 1) * limit;

      return {
        transactions: transactions.slice(skip, skip + limit),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting wallet transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction description based on reason
   */
  private getTransactionDescription(reason: string, amount: number, type: string): string {
    const descriptions: Record<string, string> = {
      top_up: `Wallet recharged: ₹${amount}`,
      ride_earning: `Ride earnings: +₹${amount}`,
      ride_payment: `Ride payment: ₹${amount}`,
      cancellation_fee: `Cancellation fee: -₹${amount}`,
      withdrawal: `Withdrawal: -₹${amount}`,
      refund: `Refund: +₹${amount}`,
      promo: `Promotional credit: +₹${amount}`,
      cashback: `Cashback: +₹${amount}`,
    };

    return descriptions[reason] || `${type === 'credit' ? '+' : '-'}₹${amount}`;
  }
}

export const walletService = new WalletService();
export default walletService;
