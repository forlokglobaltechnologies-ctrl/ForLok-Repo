import TripLocation from '../models/TripLocation';
import Booking from '../models/Booking';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';
import { reverseGeocode } from '../utils/maps';

class TrackingService {
  /**
   * Update driver location for a booking
   */
  async updateDriverLocation(data: {
    bookingId: string;
    driverId: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
  }): Promise<any> {
    try {
      // Verify booking exists and driver matches
      const booking = await Booking.findOne({ bookingId: data.bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // Check if driver matches (for pooling) or owner matches (for rental)
      const isDriver = booking.driver?.userId === data.driverId;
      const isOwner = booking.owner?.userId === data.driverId;
      
      if (!isDriver && !isOwner) {
        throw new ConflictError('You are not authorized to update location for this booking');
      }

      // Check if booking is in progress
      if (booking.status !== 'in_progress' && booking.status !== 'confirmed') {
        throw new ConflictError('Booking is not in progress');
      }

      // Reverse geocode to get address
      let address, city, state;
      try {
        const geocodeResult = await reverseGeocode(data.lat, data.lng);
        address = geocodeResult?.address;
        city = geocodeResult?.city;
        state = geocodeResult?.state;
      } catch (error) {
        logger.warn('Failed to reverse geocode location:', error);
      }

      // Create location record
      const location = await TripLocation.create({
        bookingId: data.bookingId,
        driverId: data.driverId,
        location: {
          lat: data.lat,
          lng: data.lng,
          address,
          city,
          state,
        },
        heading: data.heading,
        speed: data.speed,
        accuracy: data.accuracy,
        timestamp: new Date(),
      });

      logger.info(`Location updated for booking ${data.bookingId}: ${data.lat}, ${data.lng}`);

      return location.toJSON();
    } catch (error) {
      logger.error('Error updating driver location:', error);
      throw error;
    }
  }

  /**
   * Get latest driver location for a booking
   */
  async getDriverLocation(bookingId: string, userId: string): Promise<any> {
    try {
      // Verify booking exists and user has access
      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // Check if user is passenger or driver
      const isPassenger = booking.userId === userId;
      const isDriver = booking.driver?.userId === userId;
      const isOwner = booking.owner?.userId === userId;

      if (!isPassenger && !isDriver && !isOwner) {
        throw new ConflictError('You are not authorized to view location for this booking');
      }

      // Get latest location
      const location = await TripLocation.findOne({ bookingId })
        .sort({ timestamp: -1 })
        .limit(1);

      if (!location) {
        return null;
      }

      return location.toJSON();
    } catch (error) {
      logger.error('Error getting driver location:', error);
      throw error;
    }
  }

  /**
   * Get location history for a booking
   */
  async getLocationHistory(bookingId: string, userId: string, limit: number = 50): Promise<any[]> {
    try {
      // Verify booking exists and user has access
      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // Check if user is passenger or driver
      const isPassenger = booking.userId === userId;
      const isDriver = booking.driver?.userId === userId;
      const isOwner = booking.owner?.userId === userId;

      if (!isPassenger && !isDriver && !isOwner) {
        throw new ConflictError('You are not authorized to view location history for this booking');
      }

      // Get location history
      const locations = await TripLocation.find({ bookingId })
        .sort({ timestamp: -1 })
        .limit(limit);

      return locations.map((loc) => loc.toJSON());
    } catch (error) {
      logger.error('Error getting location history:', error);
      throw error;
    }
  }

  /**
   * Calculate ETA and distance based on current location
   */
  async calculateTripMetrics(bookingId: string): Promise<{
    eta: number; // in minutes
    distance: number; // in km
    duration: string; // formatted duration
  }> {
    try {
      const booking = await Booking.findOne({ bookingId });
      if (!booking || !booking.route) {
        return { eta: 0, distance: 0, duration: '0m' };
      }

      // Get latest driver location
      const latestLocation = await TripLocation.findOne({ bookingId })
        .sort({ timestamp: -1 })
        .limit(1);

      if (!latestLocation || !booking.route.to) {
        return { eta: 0, distance: 0, duration: '0m' };
      }

      const toLat = typeof booking.route.to === 'object' ? booking.route.to.lat : null;
      const toLng = typeof booking.route.to === 'object' ? booking.route.to.lng : null;

      if (!toLat || !toLng) {
        return { eta: 0, distance: 0, duration: '0m' };
      }

      // Calculate distance using Haversine formula
      const distance = this.calculateDistance(
        latestLocation.location.lat,
        latestLocation.location.lng,
        toLat,
        toLng
      );

      // Estimate ETA (assuming average speed of 50 km/h)
      const averageSpeed = 50; // km/h
      const etaMinutes = Math.round((distance / averageSpeed) * 60);

      // Format duration
      const hours = Math.floor(etaMinutes / 60);
      const minutes = etaMinutes % 60;
      const duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      return {
        eta: etaMinutes,
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal
        duration,
      };
    } catch (error) {
      logger.error('Error calculating trip metrics:', error);
      return { eta: 0, distance: 0, duration: '0m' };
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}

export const trackingService = new TrackingService();
