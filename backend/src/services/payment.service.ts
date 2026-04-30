import Payment from '../models/Payment';
import Booking from '../models/Booking';
import { generateUserId } from '../utils/helpers';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';
import { getRazorpayInstance } from '../config/razorpay';
import { walletService } from './wallet.service';
import { PaymentMethod, PaymentStatus } from '../types';
import { PRICING_CONFIG } from '../config/pricing.config';

class PaymentService {
  /**
   * Create Razorpay order for ride payment at trip end
   * Called when OTP is verified and trip is completing
   */
  async createRidePaymentOrder(data: {
    bookingId: string;
    userId: string;
    driverId: string;
    amount: number;
    platformFee: number;
    totalAmount: number;
  }): Promise<any> {
    try {
      // Get booking
      const booking = await Booking.findOne({ bookingId: data.bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // Check if payment already exists
      const existingPayment = await Payment.findOne({
        bookingId: data.bookingId,
        status: { $in: ['pending', 'paid'] },
      });

      if (existingPayment) {
        throw new ConflictError('Payment already exists for this booking');
      }

      // Create Razorpay order
      const razorpay = getRazorpayInstance();
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(data.totalAmount * 100), // Convert to paise
        currency: 'INR',
        receipt: `ride_${data.bookingId}_${Date.now()}`,
        notes: {
          bookingId: data.bookingId,
          userId: data.userId,
          driverId: data.driverId,
          type: 'ride_payment',
        },
      });

      // Create payment record
      const paymentId = generateUserId('PAY');
      const payment = await Payment.create({
        paymentId,
        bookingId: data.bookingId,
        userId: data.userId,
        driverId: data.driverId,
        amount: data.amount,
        platformFee: data.platformFee,
        totalAmount: data.totalAmount,
        paymentMethod: 'upi', // Will be updated after verification
        paymentType: 'ride_payment',
        status: 'pending',
        razorpayOrderId: razorpayOrder.id,
        metadata: {
          razorpayOrder: razorpayOrder,
        },
      });

      // Update booking with payment ID
      booking.paymentId = paymentId;
      await booking.save();

      logger.info(`Ride payment order created: ${paymentId} - Razorpay Order: ${razorpayOrder.id}`);

      return {
        payment: payment.toJSON(),
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID || '',
        },
      };
    } catch (error) {
      logger.error('Error creating ride payment order:', error);
      throw error;
    }
  }

  /**
   * Create Razorpay order for wallet top-up
   */
  async createWalletTopUpOrder(data: {
    userId: string;
    amount: number;
  }): Promise<any> {
    try {
      if (data.amount < PRICING_CONFIG.WALLET.MIN_TOP_UP) {
        throw new ConflictError(`Minimum top-up amount is ₹${PRICING_CONFIG.WALLET.MIN_TOP_UP}`);
      }

      // Create Razorpay order
      const razorpay = getRazorpayInstance();
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(data.amount * 100), // Convert to paise
        currency: 'INR',
        receipt: `topup_${data.userId}_${Date.now()}`,
        notes: {
          userId: data.userId,
          type: 'wallet_top_up',
        },
      });

      // Create payment record
      const paymentId = generateUserId('PAY');
      const payment = await Payment.create({
        paymentId,
        userId: data.userId,
        amount: data.amount,
        platformFee: 0,
        totalAmount: data.amount,
        paymentMethod: 'upi', // Will be updated after verification
        paymentType: 'wallet_top_up',
        status: 'pending',
        razorpayOrderId: razorpayOrder.id,
        metadata: {
          razorpayOrder: razorpayOrder,
        },
      });

      logger.info(`Wallet top-up order created: ${paymentId} - ₹${data.amount}`);

      return {
        payment: payment.toJSON(),
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID || '',
        },
      };
    } catch (error) {
      logger.error('Error creating wallet top-up order:', error);
      throw error;
    }
  }

  /**
   * Verify payment (works for both ride payments and wallet top-ups)
   */
  async verifyPayment(data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    userId?: string;
  }): Promise<any> {
    try {
      const crypto = require('crypto');
      const { config } = await import('../config/env');

      // Verify signature
      const text = `${data.razorpayOrderId}|${data.razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', config.payment.razorpay.keySecret)
        .update(text)
        .digest('hex');

      if (expectedSignature !== data.razorpaySignature) {
        throw new ConflictError('Invalid payment signature');
      }

      // Get payment by order ID
      const payment = await Payment.findOne({
        razorpayOrderId: data.razorpayOrderId,
      });

      if (!payment) {
        throw new NotFoundError('Payment not found');
      }

      if (data.userId && payment.userId !== data.userId) {
        throw new ConflictError('Payment does not belong to current user');
      }

      if (payment.status === 'paid') {
        throw new ConflictError('Payment already verified');
      }

      // Verify with Razorpay
      const razorpay = getRazorpayInstance();
      const razorpayPayment = await razorpay.payments.fetch(data.razorpayPaymentId);

      if (razorpayPayment.status !== 'captured') {
        throw new ConflictError('Payment not captured');
      }

      // Update payment record
      payment.status = 'paid';
      payment.razorpayPaymentId = data.razorpayPaymentId;
      payment.razorpaySignature = data.razorpaySignature;
      payment.transactionId = razorpayPayment.id;
      // Update payment method based on actual Razorpay payment method
      if (razorpayPayment.method) {
        const methodMap: Record<string, PaymentMethod> = {
          upi: 'upi',
          card: 'card',
          netbanking: 'net_banking',
          wallet: 'wallet',
        };
        payment.paymentMethod = methodMap[razorpayPayment.method] || 'upi';
      }
      await payment.save();

      // Handle based on payment type
      if (payment.paymentType === 'wallet_top_up') {
        // Credit user's wallet
        await walletService.creditWallet(
          payment.userId,
          payment.totalAmount,
          'top_up',
          `Wallet recharged via ${payment.paymentMethod}`,
          payment.paymentId
        );
        logger.info(`Wallet top-up verified: ${payment.paymentId} - ₹${payment.totalAmount}`);
      } else if (payment.paymentType === 'ride_payment') {
        // Credit driver's wallet with ride earnings (amount minus platform fee)
        if (payment.driverId) {
          await walletService.creditDriverEarnings(
            payment.driverId,
            payment.amount, // Driver gets ride amount (platform fee stays with eZway)
            payment.bookingId!
          );
        }

        // Update booking status
        const booking = await Booking.findOne({ bookingId: payment.bookingId });
        if (booking) {
          booking.paymentStatus = 'paid';
          booking.status = 'completed';
          booking.tripCompletedAt = new Date();
          await booking.save();

          // --- Coin Reward: Award ride coins + check milestones ---
          try {
            const { coinService } = await import('./coin.service');
            const { notificationService: ns } = await import('./notification.service');
            const User = (await import('../models/User')).default;

            const passengerCoins = await coinService.awardRideCoins(booking.userId, booking.bookingId);
            await ns.createNotification({
              userId: booking.userId,
              type: 'coin_earned',
              title: 'Coins Earned!',
              message: `You earned ${passengerCoins} coins for completing your ride!`,
              data: { coins: passengerCoins, bookingId: booking.bookingId },
            });

            if (payment.driverId) {
              const driverCoins = await coinService.awardRideCoins(payment.driverId, booking.bookingId);
              await User.findOneAndUpdate({ userId: payment.driverId }, { $inc: { totalTrips: 1 } });
              await coinService.awardMilestoneIfEligible(payment.driverId);
              await ns.createNotification({
                userId: payment.driverId,
                type: 'coin_earned',
                title: 'Coins Earned!',
                message: `You earned ${driverCoins} coins for completing a ride!`,
                data: { coins: driverCoins, bookingId: booking.bookingId },
              });
              logger.info(`🪙 Ride coins: ${driverCoins} to driver ${payment.driverId}`);
            }
            await User.findOneAndUpdate({ userId: booking.userId }, { $inc: { totalTrips: 1 } });
            await coinService.awardMilestoneIfEligible(booking.userId);
            logger.info(`🪙 Ride coins: ${passengerCoins} to passenger ${booking.userId}`);
          } catch (coinErr) {
            logger.error('🪙 Coin reward error (non-fatal):', coinErr);
          }
        }

        logger.info(`Ride payment verified: ${payment.paymentId} - ₹${payment.totalAmount}`);
      }

      return payment.toJSON();
    } catch (error) {
      logger.error('Error verifying payment:', error);
      throw error;
    }
  }

  /**
   * Process offline cash payment at trip end
   * Passenger pays driver directly in cash → No Razorpay involved
   * Driver already has the cash, so:
   * - Driver's wallet is NOT credited (they got cash in hand)
   * - Platform fee is deducted from driver's wallet (eZway's commission)
   * - A payment record is created with paymentMethod = 'offline_cash' and status = 'paid'
   * - Booking is immediately marked as completed
   */
  async processOfflineCashPayment(data: {
    bookingId: string;
    userId: string;
    driverId: string;
    amount: number;
    platformFee: number;
    totalAmount: number;
  }): Promise<any> {
    try {
      // Get booking
      const booking = await Booking.findOne({ bookingId: data.bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // Check if payment already exists
      const existingPayment = await Payment.findOne({
        bookingId: data.bookingId,
        status: { $in: ['pending', 'paid'] },
      });

      if (existingPayment) {
        throw new ConflictError('Payment already exists for this booking');
      }

      // Create payment record as already paid (cash exchanged in person)
      const paymentId = generateUserId('PAY');
      const payment = await Payment.create({
        paymentId,
        bookingId: data.bookingId,
        userId: data.userId,
        driverId: data.driverId,
        amount: data.amount,
        platformFee: data.platformFee,
        totalAmount: data.totalAmount,
        paymentMethod: 'offline_cash',
        paymentType: 'ride_payment',
        status: 'paid', // Already paid — cash handed over
        transactionId: `CASH_${data.bookingId}_${Date.now()}`,
        metadata: {
          note: 'Offline cash payment at trip end',
        },
      });

      // Update booking with payment details
      booking.paymentId = paymentId;
      booking.paymentMethod = 'offline_cash';
      booking.paymentStatus = 'paid';
      booking.status = 'completed';
      booking.tripCompletedAt = new Date();
      await booking.save();

      // 1. Credit the full ride amount to driver's wallet (cash received → recorded in wallet)
      await walletService.creditWallet(
        data.driverId,
        data.totalAmount,
        'ride_earning',
        `Cash ride earnings for booking ${data.bookingId}`,
        paymentId,
        data.bookingId
      );

      // 2. Deduct platform fee from driver's wallet (eZway's commission)
      if (data.platformFee > 0) {
        await walletService.debitWallet(
          data.driverId,
          data.platformFee,
          'ride_payment',
          `Platform fee for booking ${data.bookingId} (₹${data.platformFee} of ₹${data.totalAmount})`,
          paymentId,
          data.bookingId
        );
      }

      // Net effect: driver wallet += (totalAmount - platformFee) = ride earnings
      const netEarnings = data.totalAmount - (data.platformFee || 0);
      logger.info(`💵 Offline cash payment processed: ${paymentId}`);
      logger.info(`   Booking: ${data.bookingId}`);
      logger.info(`   Passenger paid ₹${data.totalAmount} cash to driver`);
      logger.info(`   Ride earnings ₹${data.totalAmount} credited to driver wallet`);
      logger.info(`   Platform fee ₹${data.platformFee} deducted from driver wallet`);
      logger.info(`   Net driver earnings: ₹${netEarnings.toFixed(2)}`);

      return {
        payment: payment.toJSON(),
        paymentMethod: 'offline_cash',
        message: 'Cash payment recorded. Trip completed.',
      };
    } catch (error) {
      logger.error('Error processing offline cash payment:', error);
      throw error;
    }
  }

  /**
   * Simulate test payment success (TEST MODE ONLY)
   * Used when Razorpay test keys are configured — skips actual Razorpay checkout
   * Directly marks payment as paid and processes wallet credits
   */
  async simulateTestPayment(razorpayOrderId: string): Promise<any> {
    try {
      const payment = await Payment.findOne({ razorpayOrderId });
      if (!payment) {
        throw new NotFoundError('Payment not found');
      }

      if (payment.status === 'paid') {
        throw new ConflictError('Payment already completed');
      }

      // Mark payment as paid with simulated data
      payment.status = 'paid';
      payment.razorpayPaymentId = `test_pay_${Date.now()}`;
      payment.razorpaySignature = 'test_signature';
      payment.transactionId = payment.razorpayPaymentId;
      payment.paymentMethod = 'upi'; // Simulated as UPI
      await payment.save();

      // Handle based on payment type
      if (payment.paymentType === 'wallet_top_up') {
        await walletService.creditWallet(
          payment.userId,
          payment.totalAmount,
          'top_up',
          `Wallet recharged (test mode) - ₹${payment.totalAmount}`,
          payment.paymentId
        );
        logger.info(`🧪 Test wallet top-up completed: ${payment.paymentId} - ₹${payment.totalAmount}`);
      } else if (payment.paymentType === 'ride_payment') {
        // Credit driver wallet with ride earnings
        if (payment.driverId) {
          await walletService.creditDriverEarnings(
            payment.driverId,
            payment.amount,
            payment.bookingId!
          );
        }

        // Update booking status
        const booking = await Booking.findOne({ bookingId: payment.bookingId });
        if (booking) {
          booking.paymentStatus = 'paid';
          booking.status = 'completed';
          booking.tripCompletedAt = new Date();
          await booking.save();

          // --- Coin Reward: Award ride coins + check milestones ---
          try {
            const { coinService } = await import('./coin.service');
            const { notificationService: ns } = await import('./notification.service');
            const User = (await import('../models/User')).default;

            const passengerCoins = await coinService.awardRideCoins(booking.userId, booking.bookingId);
            await ns.createNotification({
              userId: booking.userId,
              type: 'coin_earned',
              title: 'Coins Earned!',
              message: `You earned ${passengerCoins} coins for completing your ride!`,
              data: { coins: passengerCoins, bookingId: booking.bookingId },
            });

            if (payment.driverId) {
              const driverCoins = await coinService.awardRideCoins(payment.driverId, booking.bookingId);
              await User.findOneAndUpdate({ userId: payment.driverId }, { $inc: { totalTrips: 1 } });
              await coinService.awardMilestoneIfEligible(payment.driverId);
              await ns.createNotification({
                userId: payment.driverId,
                type: 'coin_earned',
                title: 'Coins Earned!',
                message: `You earned ${driverCoins} coins for completing a ride!`,
                data: { coins: driverCoins, bookingId: booking.bookingId },
              });
              logger.info(`🪙 Test ride coins: ${driverCoins} to driver ${payment.driverId}`);
            }
            await User.findOneAndUpdate({ userId: booking.userId }, { $inc: { totalTrips: 1 } });
            await coinService.awardMilestoneIfEligible(booking.userId);
            logger.info(`🪙 Test ride coins: ${passengerCoins} to passenger ${booking.userId}`);
          } catch (coinErr) {
            logger.error('🪙 Coin reward error (non-fatal):', coinErr);
          }
        }

        logger.info(`🧪 Test ride payment completed: ${payment.paymentId} - ₹${payment.totalAmount}`);
      }

      return {
        payment: payment.toJSON(),
        testMode: true,
        message: 'Payment simulated successfully (test mode)',
      };
    } catch (error) {
      logger.error('Error simulating test payment:', error);
      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string, userId?: string): Promise<any> {
    try {
      const query: any = { paymentId };
      if (userId) {
        query.userId = userId;
      }

      const payment = await Payment.findOne(query);
      if (!payment) {
        throw new NotFoundError('Payment not found');
      }

      return payment.toJSON();
    } catch (error) {
      logger.error('Error getting payment by ID:', error);
      throw error;
    }
  }

  /**
   * Get user payments
   */
  async getUserPayments(userId: string, filters?: {
    status?: PaymentStatus;
    paymentType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ payments: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = { userId };

      if (filters?.status) {
        query.status = filters.status;
      }
      if (filters?.paymentType) {
        query.paymentType = filters.paymentType;
      }

      const total = await Payment.countDocuments(query);
      const payments = await Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        payments: payments.map((p) => p.toJSON()),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting user payments:', error);
      throw error;
    }
  }

  /**
   * Get available payment methods
   */
  getPaymentMethods(): { methods: { id: string; name: string; enabled: boolean }[] } {
    return {
      methods: [
        { id: 'upi', name: 'UPI', enabled: true },
        { id: 'card', name: 'Credit/Debit Card', enabled: true },
        { id: 'net_banking', name: 'Net Banking', enabled: true },
        { id: 'offline_cash', name: 'Cash', enabled: true },
      ],
    };
  }
}

export const paymentService = new PaymentService();
export default paymentService;
