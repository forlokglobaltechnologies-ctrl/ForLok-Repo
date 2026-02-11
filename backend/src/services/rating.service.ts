import Rating from '../models/Rating';
import Booking from '../models/Booking';
import User from '../models/User';
import { generateUserId } from '../utils/helpers';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';
import { ServiceType } from '../types';

// Available rating tags
export const RATING_TAGS = {
  driver: [
    'safe_driving',
    'polite',
    'on_time',
    'clean_vehicle',
    'good_music',
    'comfortable_ride',
    'professional',
    'helpful',
  ],
  passenger: [
    'polite',
    'on_time',
    'respectful',
    'good_communication',
    'friendly',
    'clean',
  ],
};

class RatingService {
  /**
   * Create rating (supports bi-directional)
   */
  async createRating(data: {
    bookingId: string;
    userId: string;
    ratedUserId: string;
    serviceType: ServiceType;
    ratingType: 'passenger_to_driver' | 'driver_to_passenger';
    overallRating: number;
    punctuality?: number;
    vehicleCondition?: number;
    driving?: number;
    behavior?: number;
    communication?: number;
    service?: number;
    comment?: string;
    tags?: string[];
  }): Promise<any> {
    try {
      // Check if booking exists
      const booking = await Booking.findOne({ bookingId: data.bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // Check if booking is completed
      if (booking.status !== 'completed') {
        throw new ConflictError('Can only rate completed bookings');
      }

      // Validate user is part of the booking
      const isPassenger = booking.userId === data.userId;
      const isDriver = booking.driver?.userId === data.userId || booking.owner?.userId === data.userId;

      if (!isPassenger && !isDriver) {
        throw new ConflictError('You are not part of this booking');
      }

      // Validate rating type matches user role
      if (isPassenger && data.ratingType !== 'passenger_to_driver') {
        throw new ConflictError('Passengers can only rate drivers');
      }
      if (isDriver && data.ratingType !== 'driver_to_passenger') {
        throw new ConflictError('Drivers can only rate passengers');
      }

      // Check if rating already exists from this user for this booking
      const existingRating = await Rating.findOne({
        bookingId: data.bookingId,
        userId: data.userId,
      });

      if (existingRating) {
        throw new ConflictError('You have already rated this trip');
      }

      // Create rating
      const ratingId = generateUserId('RAT');
      const rating = await Rating.create({
        ratingId,
        ...data,
        isVisible: true,
      });

      // Update user rating (aggregate)
      await this.updateUserRating(data.ratedUserId);

      logger.info(`Rating created: ${ratingId} (${data.ratingType})`);

      return rating.toJSON();
    } catch (error) {
      logger.error('Error creating rating:', error);
      throw error;
    }
  }

  /**
   * Check if user can rate a booking
   */
  async canRateBooking(bookingId: string, userId: string): Promise<{
    canRate: boolean;
    reason?: string;
    ratingType?: 'passenger_to_driver' | 'driver_to_passenger';
    ratedUserId?: string;
    ratedUserName?: string;
  }> {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        return { canRate: false, reason: 'Booking not found' };
      }

      if (booking.status !== 'completed') {
        return { canRate: false, reason: 'Booking not completed' };
      }

      // Check if already rated
      const existingRating = await Rating.findOne({ bookingId, userId });
      if (existingRating) {
        return { canRate: false, reason: 'Already rated' };
      }

      // Determine rating type
      const isPassenger = booking.userId === userId;
      const isDriver = booking.driver?.userId === userId || booking.owner?.userId === userId;

      if (isPassenger) {
        const driverId = booking.driver?.userId || booking.owner?.userId;
        const driverName = booking.driver?.name || booking.owner?.name;
        return {
          canRate: true,
          ratingType: 'passenger_to_driver',
          ratedUserId: driverId,
          ratedUserName: driverName,
        };
      }

      if (isDriver) {
        const passengerId = booking.userId;
        const passengerName = booking.passengers?.[0]?.name;
        return {
          canRate: true,
          ratingType: 'driver_to_passenger',
          ratedUserId: passengerId,
          ratedUserName: passengerName,
        };
      }

      return { canRate: false, reason: 'Not part of this booking' };
    } catch (error) {
      logger.error('Error checking can rate:', error);
      throw error;
    }
  }

  /**
   * Get rating by ID
   */
  async getRatingById(ratingId: string): Promise<any> {
    try {
      const rating = await Rating.findOne({ ratingId });
      if (!rating) {
        throw new NotFoundError('Rating not found');
      }
      return rating.toJSON();
    } catch (error) {
      logger.error('Error getting rating by ID:', error);
      throw error;
    }
  }

  /**
   * Get user ratings
   */
  async getUserRatings(ratedUserId: string, serviceType?: ServiceType): Promise<any[]> {
    try {
      const query: any = { ratedUserId };
      if (serviceType) {
        query.serviceType = serviceType;
      }

      const ratings = await Rating.find(query)
        .sort({ createdAt: -1 })
        .limit(50);

      return ratings.map((r) => r.toJSON());
    } catch (error) {
      logger.error('Error getting user ratings:', error);
      throw error;
    }
  }

  /**
   * Get booking rating
   */
  async getBookingRating(bookingId: string): Promise<any | null> {
    try {
      const rating = await Rating.findOne({ bookingId });
      return rating ? rating.toJSON() : null;
    } catch (error) {
      logger.error('Error getting booking rating:', error);
      throw error;
    }
  }

  /**
   * Update rating
   */
  async updateRating(
    ratingId: string,
    userId: string,
    data: {
      overallRating?: number;
      punctuality?: number;
      vehicleCondition?: number;
      driving?: number;
      service?: number;
      comment?: string;
    }
  ): Promise<any> {
    try {
      const rating = await Rating.findOne({ ratingId, userId });
      if (!rating) {
        throw new NotFoundError('Rating not found');
      }

      // Update fields
      if (data.overallRating !== undefined) rating.overallRating = data.overallRating;
      if (data.punctuality !== undefined) rating.punctuality = data.punctuality;
      if (data.vehicleCondition !== undefined) rating.vehicleCondition = data.vehicleCondition;
      if (data.driving !== undefined) rating.driving = data.driving;
      if (data.service !== undefined) rating.service = data.service;
      if (data.comment !== undefined) rating.comment = data.comment;

      await rating.save();

      // Update user rating (aggregate)
      await this.updateUserRating(rating.ratedUserId);

      logger.info(`Rating updated: ${ratingId}`);

      return rating.toJSON();
    } catch (error) {
      logger.error('Error updating rating:', error);
      throw error;
    }
  }

  /**
   * Delete rating
   */
  async deleteRating(ratingId: string, userId: string): Promise<void> {
    try {
      const rating = await Rating.findOne({ ratingId, userId });
      if (!rating) {
        throw new NotFoundError('Rating not found');
      }

      const ratedUserId = rating.ratedUserId;

      await Rating.deleteOne({ ratingId });

      // Update user rating (aggregate)
      await this.updateUserRating(ratedUserId);

      logger.info(`Rating deleted: ${ratingId}`);
    } catch (error) {
      logger.error('Error deleting rating:', error);
      throw error;
    }
  }

  /**
   * Get rating breakdown for a user
   */
  async getUserRatingBreakdown(ratedUserId: string): Promise<{
    average: number;
    total: number;
    breakdown: { 5: number; 4: number; 3: number; 2: number; 1: number };
    asDriver: { average: number; count: number };
    asPassenger: { average: number; count: number };
  }> {
    try {
      const ratings = await Rating.find({ ratedUserId, isVisible: true });

      const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      let totalRating = 0;
      let driverRatingSum = 0;
      let driverRatingCount = 0;
      let passengerRatingSum = 0;
      let passengerRatingCount = 0;

      ratings.forEach((r) => {
        const rounded = Math.round(r.overallRating) as 1 | 2 | 3 | 4 | 5;
        breakdown[rounded]++;
        totalRating += r.overallRating;

        if (r.ratingType === 'passenger_to_driver') {
          driverRatingSum += r.overallRating;
          driverRatingCount++;
        } else {
          passengerRatingSum += r.overallRating;
          passengerRatingCount++;
        }
      });

      return {
        average: ratings.length > 0 ? parseFloat((totalRating / ratings.length).toFixed(2)) : 0,
        total: ratings.length,
        breakdown,
        asDriver: {
          average: driverRatingCount > 0 
            ? parseFloat((driverRatingSum / driverRatingCount).toFixed(2)) 
            : 0,
          count: driverRatingCount,
        },
        asPassenger: {
          average: passengerRatingCount > 0 
            ? parseFloat((passengerRatingSum / passengerRatingCount).toFixed(2)) 
            : 0,
          count: passengerRatingCount,
        },
      };
    } catch (error) {
      logger.error('Error getting rating breakdown:', error);
      throw error;
    }
  }

  /**
   * Get ratings with user details
   */
  async getUserRatingsWithDetails(
    ratedUserId: string,
    options?: { page?: number; limit?: number; ratingType?: string }
  ): Promise<{
    ratings: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = { ratedUserId, isVisible: true };
      if (options?.ratingType) {
        query.ratingType = options.ratingType;
      }

      const total = await Rating.countDocuments(query);
      const ratings = await Rating.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get user details for each rating
      const userIds = ratings.map((r) => r.userId);
      const users = await User.find({ userId: { $in: userIds } }).select(
        'userId name profilePhoto'
      );
      const userMap = new Map(users.map((u) => [u.userId, u]));

      const ratingsWithUser = ratings.map((r) => {
        const user = userMap.get(r.userId);
        return {
          ...r.toJSON(),
          rater: user
            ? { userId: user.userId, name: user.name, photo: user.profilePhoto }
            : null,
        };
      });

      return { ratings: ratingsWithUser, total, page, limit };
    } catch (error) {
      logger.error('Error getting ratings with details:', error);
      throw error;
    }
  }

  /**
   * Update user rating aggregate
   */
  private async updateUserRating(ratedUserId: string): Promise<void> {
    try {
      const ratings = await Rating.find({ ratedUserId, isVisible: true });
      
      if (ratings.length === 0) {
        return;
      }

      const totalRating = ratings.reduce((sum, r) => sum + r.overallRating, 0);
      const averageRating = totalRating / ratings.length;

      const user = await User.findOne({ userId: ratedUserId });
      if (user) {
        user.rating = parseFloat(averageRating.toFixed(2));
        user.totalReviews = ratings.length;
        await user.save();
      }
    } catch (error) {
      logger.error('Error updating user rating:', error);
    }
  }

  /**
   * Get available rating tags
   */
  getRatingTags(ratingType: 'passenger_to_driver' | 'driver_to_passenger'): string[] {
    return ratingType === 'passenger_to_driver' ? RATING_TAGS.driver : RATING_TAGS.passenger;
  }
}

export const ratingService = new RatingService();
export default ratingService;
