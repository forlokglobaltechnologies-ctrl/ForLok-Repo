/**
 * Route Deviation Service
 * Detects and handles real-time route deviations during active trips
 */

import logger from '../utils/logger';
import PoolingOffer from '../models/PoolingOffer';
import Booking from '../models/Booking';
import TripLocation from '../models/TripLocation';
import { osrmService, RoadSegment } from './osrm.service';

export interface DeviationDetectionResult {
  hasDeviation: boolean;
  deviationPercentage?: number;
  matchedSegments?: RoadSegment[];
  recalculatedETAs?: Map<string, Date>; // bookingId -> new ETA
  reason?: string;
}

class RouteDeviationService {
  /**
   * Detect route deviation by comparing current GPS track with planned route
   */
  async detectRouteDeviation(
    offerId: string,
    _bookingIds: string[],
    recentGPSPoints: Array<{ lat: number; lng: number; timestamp: Date }>
  ): Promise<DeviationDetectionResult> {
    try {
      // Get the original offer with road segments
      const offer = await PoolingOffer.findOne({ offerId });
      if (!offer || !offer.route.roadSegments || offer.route.roadSegments.length === 0) {
        return {
          hasDeviation: false,
          reason: 'No road segments available for comparison',
        };
      }

      if (recentGPSPoints.length < 5) {
        // Need at least 5 points to detect deviation
        return {
          hasDeviation: false,
          reason: 'Insufficient GPS points for deviation detection',
        };
      }

      // Map-match GPS points to road segments using OSRM Match API
      const gpsCoords = recentGPSPoints.map((p) => ({ lat: p.lat, lng: p.lng }));
      const matchedPoints = await osrmService.matchGPSPoints(gpsCoords);

      if (matchedPoints.length === 0) {
        return {
          hasDeviation: false,
          reason: 'Failed to match GPS points to roads',
        };
      }

      // Extract road IDs from matched points
      const detectedRoadIds = matchedPoints.map((p) => p.roadId);
      const originalRoadIds = offer.route.roadSegments.map((s) => s.roadId);

      // Calculate deviation percentage
      const deviationPercentage = this.calculateDeviationPercentage(
        originalRoadIds,
        detectedRoadIds
      );

      const hasDeviation = deviationPercentage > 0.3; // 30% threshold

      logger.info(
        `Route deviation detection: offerId=${offerId}, deviation=${(deviationPercentage * 100).toFixed(1)}%, hasDeviation=${hasDeviation}`
      );

      if (hasDeviation) {
        // Generate new road segments from matched route
        const matchedSegments = await this.generateSegmentsFromMatchedPoints(
          matchedPoints,
          offer.route.roadSegments[0].estimatedTime
        );

        return {
          hasDeviation: true,
          deviationPercentage,
          matchedSegments,
        };
      }

      return {
        hasDeviation: false,
        deviationPercentage,
      };
    } catch (error) {
      logger.error('Error detecting route deviation:', error);
      return {
        hasDeviation: false,
        reason: `Detection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Update route segments dynamically when deviation is detected
   */
  async updateRouteSegments(
    offerId: string,
    newSegments: RoadSegment[]
  ): Promise<void> {
    try {
      const offer = await PoolingOffer.findOne({ offerId });
      if (!offer) {
        throw new Error('Offer not found');
      }

      // Update road segments in offer
      offer.route.roadSegments = newSegments;
      await offer.save();

      logger.info(`Updated road segments for offer ${offerId}: ${newSegments.length} segments`);
    } catch (error) {
      logger.error('Error updating route segments:', error);
      throw error;
    }
  }

  /**
   * Recalculate ETAs for all passenger pickups after route deviation
   */
  async recalculateETAs(
    offerId: string,
    bookingIds: string[],
    newSegments: RoadSegment[]
  ): Promise<Map<string, Date>> {
    const newETAs = new Map<string, Date>();

    try {
      // Get all bookings for this offer
      const bookings = await Booking.find({
        bookingId: { $in: bookingIds },
        poolingOfferId: offerId,
      });

      for (const booking of bookings) {
        if (
          !booking.passengerPickupSegment ||
          !booking.passengerDropSegment
        ) {
          // No road segments stored, skip recalculation
          logger.warn(
            `Skipping ETA recalculation for booking ${booking.bookingId}: missing road segments`
          );
          continue;
        }

        // Find pickup segment in new route by roadId
        const pickupSegment = newSegments.find(
          (s) => s.roadId === booking.passengerPickupSegment?.roadId
        );

        if (pickupSegment) {
          newETAs.set(booking.bookingId, pickupSegment.estimatedTime);
          logger.info(
            `Recalculated ETA for booking ${booking.bookingId}: ${pickupSegment.estimatedTime.toISOString()}`
          );
        } else {
          logger.warn(
            `Could not find pickup segment in new route for booking ${booking.bookingId}: ` +
            `roadId=${booking.passengerPickupSegment?.roadId}`
          );
          // Use original estimated time as fallback
          if (booking.passengerPickupSegment?.estimatedTime) {
            newETAs.set(booking.bookingId, booking.passengerPickupSegment.estimatedTime);
          }
        }
      }
    } catch (error) {
      logger.error('Error recalculating ETAs:', error);
    }

    return newETAs;
  }

  /**
   * Calculate deviation percentage between original and detected route
   */
  private calculateDeviationPercentage(
    originalRoadIds: string[],
    detectedRoadIds: string[]
  ): number {
    if (originalRoadIds.length === 0 || detectedRoadIds.length === 0) {
      return 1.0; // 100% deviation if no data
    }

    // Find common road IDs
    const commonRoads = originalRoadIds.filter((id) =>
      detectedRoadIds.includes(id)
    );

    // Calculate overlap percentage
    const overlap = commonRoads.length / Math.max(originalRoadIds.length, detectedRoadIds.length);
    const deviation = 1.0 - overlap;

    return deviation;
  }

  /**
   * Generate road segments from matched GPS points
   * Uses OSRM to get actual distance/duration for better time estimation
   */
  private async generateSegmentsFromMatchedPoints(
    matchedPoints: Array<{
      lat: number;
      lng: number;
      roadId: string;
      direction: 'forward' | 'backward' | 'bidirectional';
      confidence: number;
    }>,
    baseTime: Date
  ): Promise<RoadSegment[]> {
    const segments: RoadSegment[] = [];
    let cumulativeTime = 0; // in seconds

    // Calculate time per segment based on average speed
    // Assume average speed of 30 km/h (8.33 m/s) for urban roads
    const averageSpeedMps = 8.33; // meters per second

    for (let i = 0; i < matchedPoints.length; i++) {
      const point = matchedPoints[i];
      
      // Estimate segment duration based on distance to next point
      if (i < matchedPoints.length - 1) {
        const nextPoint = matchedPoints[i + 1];
        // Calculate distance using Haversine formula (simplified)
        const lat1 = point.lat * Math.PI / 180;
        const lat2 = nextPoint.lat * Math.PI / 180;
        const dLat = (nextPoint.lat - point.lat) * Math.PI / 180;
        const dLng = (nextPoint.lng - point.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceMeters = 6371000 * c; // Earth radius in meters
        const segmentDuration = distanceMeters / averageSpeedMps;
        cumulativeTime += segmentDuration;
      } else {
        // Last segment: use average time
        cumulativeTime += 60; // 1 minute for last segment
      }

      segments.push({
        roadId: point.roadId,
        direction: point.direction,
        estimatedTime: new Date(baseTime.getTime() + cumulativeTime * 1000),
        lat: point.lat,
        lng: point.lng,
        segmentIndex: i,
      });
    }

    logger.info(`Generated ${segments.length} segments from ${matchedPoints.length} matched points`);
    return segments;
  }

  /**
   * Get recent GPS locations for a booking
   */
  async getRecentGPSLocations(
    bookingId: string,
    limit: number = 10
  ): Promise<Array<{ lat: number; lng: number; timestamp: Date }>> {
    try {
      const locations = await TripLocation.find({ bookingId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return locations.map((loc) => ({
        lat: loc.location.lat,
        lng: loc.location.lng,
        timestamp: loc.timestamp,
      }));
    } catch (error) {
      logger.error('Error getting recent GPS locations:', error);
      return [];
    }
  }
}

export const routeDeviationService = new RouteDeviationService();
export default routeDeviationService;
