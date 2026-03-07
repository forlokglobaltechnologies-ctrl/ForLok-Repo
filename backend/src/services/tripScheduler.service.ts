import Booking from '../models/Booking';
import PoolingOffer from '../models/PoolingOffer';
import logger from '../utils/logger';
import { generatePassengerCode } from '../utils/helpers';

class TripSchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // Check every minute

  /**
   * Start the scheduler to check for trips that should start
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('Trip scheduler is already running');
      return;
    }

    logger.info('🚀 Starting trip scheduler...');
    
    // Check immediately
    this.checkAndStartTrips();

    // Then check every minute
    this.intervalId = setInterval(() => {
      this.checkAndStartTrips();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('🛑 Trip scheduler stopped');
    }
  }

  /**
   * Check for trips that should start and auto-start them
   */
  private async checkAndStartTrips(): Promise<void> {
    try {
      const now = new Date();

      const offersToStart = await PoolingOffer.find({
        status: { $in: ['pending', 'active'] },
        date: { $lte: now },
      });

      for (const offer of offersToStart) {
        try {
          // Exact start-time check based on stored offer datetime
          await this.startTrip(offer.offerId);
        } catch (error) {
          logger.error(`Error processing offer ${offer.offerId}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error in trip scheduler:', error);
    }
  }

  /**
   * Start a trip and generate codes for all passengers
   */
  async startTrip(offerId: string): Promise<void> {
    try {
      // Get all bookings for this offer
      const bookings = await Booking.find({
        poolingOfferId: offerId,
        status: { $in: ['pending', 'confirmed'] },
      });

      if (bookings.length === 0) {
        return;
      }

      // Generate unique codes for each passenger
      const usedCodes = new Set<string>();
      for (const booking of bookings) {
        // Generate unique code
        let code: string;
        do {
          code = generatePassengerCode();
        } while (usedCodes.has(code));
        usedCodes.add(code);

        // Update booking
        booking.status = 'in_progress';
        booking.passengerCode = code;
        booking.codeGeneratedAt = new Date();
        booking.tripStartedAt = new Date();
        booking.driverSettlementAmount = booking.totalAmount - booking.platformFee;
        booking.settlementStatus = 'pending';
        await booking.save();

        logger.info(`✅ Trip started for booking ${booking.bookingId}, code: ${code}`);
      }

      // Update offer status
      const offer = await PoolingOffer.findOne({ offerId });
      if (offer) {
        offer.status = 'in_progress';
        await offer.save();
        logger.info(`✅ Offer ${offerId} status updated to in_progress`);
      }
    } catch (error) {
      logger.error(`Error starting trip for offer ${offerId}:`, error);
      throw error;
    }
  }
}

export const tripSchedulerService = new TripSchedulerService();
export default tripSchedulerService;
