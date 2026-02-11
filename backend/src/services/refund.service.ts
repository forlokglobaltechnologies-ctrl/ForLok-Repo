import Refund, { IRefund } from '../models/Refund';
import Booking from '../models/Booking';
import User from '../models/User';
import { walletService } from './wallet.service';
import { generateUserId } from '../utils/helpers';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import {
  PRICING_CONFIG,
  getCancellationFeePercentage,
} from '../config/pricing.config';

interface CancellationCalculation {
  originalAmount: number;
  cancellationFeePercentage: number;
  cancellationFee: number;
  hoursBeforeTrip: number;
  isFirstCancellation: boolean;
  isFree: boolean; // true if 1st cancellation or driver cancelled or booking pending
}

class RefundService {
  /**
   * Calculate cancellation fee for a booking
   * 1st cancellation is FREE, 2nd+ uses time-based tiers
   */
  async calculateCancellation(
    bookingId: string,
    cancelledBy: string,
    userId: string
  ): Promise<CancellationCalculation> {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // Get user's cancellation count
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const isFirstCancellation = (user.cancellationCount || 0) === 0;

      // Calculate hours until trip
      const now = new Date();
      const tripDateTime = this.getTripDateTime(booking);
      const hoursBeforeTrip = (tripDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Get cancellation fee percentage
      const cancellationFeePercentage = getCancellationFeePercentage(
        hoursBeforeTrip,
        booking.status,
        cancelledBy
      );

      const originalAmount = booking.totalAmount;

      // Determine if this cancellation is free
      const driverCancelled = cancelledBy === 'driver' || cancelledBy === 'owner';
      const bookingPending = booking.status === 'pending';
      const isFree = isFirstCancellation || driverCancelled || bookingPending;

      const cancellationFee = isFree
        ? 0
        : Math.round((originalAmount * cancellationFeePercentage) / 100);

      return {
        originalAmount,
        cancellationFeePercentage: isFree ? 0 : cancellationFeePercentage,
        cancellationFee,
        hoursBeforeTrip: Math.max(0, hoursBeforeTrip),
        isFirstCancellation,
        isFree,
      };
    } catch (error) {
      logger.error('Error calculating cancellation:', error);
      throw error;
    }
  }

  /**
   * Process cancellation
   * Deducts cancellation fee from user's wallet (can go negative)
   * Increments user's cancellationCount
   */
  async processCancellation(
    bookingId: string,
    userId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<IRefund> {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      const calculation = await this.calculateCancellation(bookingId, cancelledBy, userId);
      const driverId = booking.driver?.userId || booking.owner?.userId;

      // Determine the user whose wallet is charged and whose count increments
      const chargedUserId = cancelledBy === 'driver' || cancelledBy === 'owner'
        ? (driverId || userId)
        : userId;

      let refundMethod: 'wallet_debit' | 'none' = 'none';

      // Deduct cancellation fee from wallet if applicable
      if (calculation.cancellationFee > 0) {
        await walletService.deductCancellationFee(
          chargedUserId,
          calculation.cancellationFee,
          bookingId
        );
        refundMethod = 'wallet_debit';

        logger.info(
          `Cancellation fee ₹${calculation.cancellationFee} deducted from wallet of ${chargedUserId}`
        );
      }

      // Increment cancellation count for the person who cancelled
      await User.updateOne(
        { userId: chargedUserId },
        { $inc: { cancellationCount: 1 } }
      );

      // Create refund/cancellation record
      const refund = await Refund.create({
        refundId: generateUserId('RFD'),
        bookingId,
        userId: chargedUserId,
        driverId,
        paymentType: 'cancellation',
        originalAmount: calculation.originalAmount,
        refundAmount: 0, // No money to refund (payment happens at trip end)
        cancellationFee: calculation.cancellationFee,
        refundPercentage: 0,
        driverCompensation: 0,
        platformFee: calculation.cancellationFee, // Entire cancellation fee goes to platform
        cancelledBy,
        cancellationReason: reason,
        hoursBeforeTrip: calculation.hoursBeforeTrip,
        refundMethod,
        status: 'completed',
        processedAt: new Date(),
        metadata: {
          isFirstCancellation: calculation.isFirstCancellation,
          isFree: calculation.isFree,
          cancellationFeePercentage: calculation.cancellationFeePercentage,
        },
      });

      logger.info(
        `Cancellation processed: ${refund.refundId} | Fee: ₹${calculation.cancellationFee} | ` +
        `1st cancel: ${calculation.isFirstCancellation} | Free: ${calculation.isFree}`
      );

      return refund;
    } catch (error) {
      logger.error('Error processing cancellation:', error);
      throw error;
    }
  }

  /**
   * Get cancellation/refund record by booking ID
   */
  async getRefundByBookingId(bookingId: string): Promise<IRefund | null> {
    try {
      return await Refund.findOne({ bookingId });
    } catch (error) {
      logger.error('Error getting refund by booking ID:', error);
      throw error;
    }
  }

  /**
   * Get user refund/cancellation history
   */
  async getUserRefunds(
    userId: string,
    options?: { page?: number; limit?: number }
  ): Promise<{
    refunds: IRefund[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const skip = (page - 1) * limit;

      const total = await Refund.countDocuments({ userId });
      const refunds = await Refund.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return { refunds, total, page, limit };
    } catch (error) {
      logger.error('Error getting user refunds:', error);
      throw error;
    }
  }

  /**
   * Get the current cancellation policy
   */
  getCancellationPolicy() {
    return {
      firstCancellation: 'FREE - No fee charged',
      tiers: [
        { condition: 'Before driver accepts', feePercentage: 0, description: 'No fee' },
        { condition: '> 24 hours before trip', feePercentage: 10, description: '10% of ride amount' },
        { condition: '12-24 hours before trip', feePercentage: 25, description: '25% of ride amount' },
        { condition: '2-12 hours before trip', feePercentage: 50, description: '50% of ride amount' },
        { condition: '1-2 hours before trip', feePercentage: 75, description: '75% of ride amount' },
        { condition: '< 1 hour / trip started', feePercentage: 100, description: '100% of ride amount' },
        { condition: 'Driver/Owner cancels', feePercentage: 0, description: 'No fee for passenger' },
      ],
      note: 'Cancellation fee is deducted from wallet. Wallet can go negative.',
      minimumWalletToBook: PRICING_CONFIG.WALLET.MINIMUM_TO_BOOK,
    };
  }

  /**
   * Get trip date/time from booking
   */
  private getTripDateTime(booking: any): Date {
    const tripDate = new Date(booking.date);

    // Parse time if available
    if (booking.time) {
      const timeMatch = booking.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]);
        const ampm = timeMatch[3]?.toUpperCase();

        if (ampm === 'PM' && hour !== 12) {
          hour += 12;
        } else if (ampm === 'AM' && hour === 12) {
          hour = 0;
        }

        tripDate.setHours(hour, minute, 0, 0);
      }
    }

    return tripDate;
  }
}

export const refundService = new RefundService();
export default refundService;
