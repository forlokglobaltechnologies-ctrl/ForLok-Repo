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
      const currentTime = this.getTimeString(now);

      // Find all offers that should start
      // Get offers with status pending/active, date today, time <= current time
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const offersToStart = await PoolingOffer.find({
        status: { $in: ['pending', 'active'] },
        date: {
          $gte: todayStart,
          $lt: todayEnd,
        },
      });

      for (const offer of offersToStart) {
        try {
          // Check if trip time has arrived
          const tripTime = this.parseTimeString(offer.time);
          const currentTimeObj = this.parseTimeString(currentTime);

          if (tripTime <= currentTimeObj) {
            // Time has arrived, start the trip for all bookings of this offer
            await this.startTrip(offer.offerId);
          }
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
        logger.warn(`No bookings found for offer ${offerId}`);
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
        offer.status = 'active';
        await offer.save();
        logger.info(`✅ Offer ${offerId} status updated to active`);
      }
    } catch (error) {
      logger.error(`Error starting trip for offer ${offerId}:`, error);
      throw error;
    }
  }

  /**
   * Parse time string (HH:mm) to minutes since midnight
   */
  private parseTimeString(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get time string from Date (HH:mm)
   */
  private getTimeString(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

export const tripSchedulerService = new TripSchedulerService();
export default tripSchedulerService;
