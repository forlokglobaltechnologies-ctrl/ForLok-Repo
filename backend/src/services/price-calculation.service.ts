import PoolingOffer from '../models/PoolingOffer';
import { calculateDistance } from '../utils/helpers';
import logger from '../utils/logger';
import { Route } from '../types';

interface PriceCalculationParams {
  passengerRoute: Route;
  offerId: string;
  vehicleType: 'car' | 'bike';
  offerDate: Date;
  offerTime: string;
}

interface PriceBreakdown {
  baseDistance: number; // in km
  baseRatePerKm: number;
  basePrice: number;
  timeMultiplier: number;
  timeMultiplierLabel: string;
  supplyMultiplier: number;
  supplyMultiplierLabel: string;
  finalPrice: number;
  platformFee: number;
  totalAmount: number;
  breakdown: {
    distance: number;
    baseRate: number;
    distanceCharge: number;
    timeMultiplier: number;
    timeCharge: number;
    supplyMultiplier: number;
    supplyAdjustment: number;
    subtotal: number;
    platformFee: number;
    total: number;
  };
}

class PriceCalculationService {
  // Base rates per km (in INR)
  private readonly BASE_RATE_CAR = 8; // ₹8 per km for car
  private readonly BASE_RATE_BIKE = 5; // ₹5 per km for bike

  // Time-based multipliers
  private readonly DAY_TIME_MULTIPLIER = 1.0; // 6 AM - 10 PM
  private readonly NIGHT_TIME_MULTIPLIER = 1.3; // 10 PM - 6 AM

  // Supply/demand multipliers
  private readonly HIGH_SUPPLY_MULTIPLIER = 0.92; // Many offers available
  private readonly MEDIUM_SUPPLY_MULTIPLIER = 1.0; // Normal supply
  private readonly LOW_SUPPLY_MULTIPLIER = 1.25; // Few offers available

  // Thresholds for supply/demand
  private readonly HIGH_SUPPLY_THRESHOLD = 5; // 5+ offers = high supply
  private readonly LOW_SUPPLY_THRESHOLD = 2; // <2 offers = low supply

  /**
   * Calculate dynamic price for passenger based on distance, time, and supply/demand
   */
  async calculatePrice(params: PriceCalculationParams): Promise<PriceBreakdown> {
    try {
      const { passengerRoute, offerId, vehicleType, offerDate, offerTime } = params;

      // 1. Calculate distance
      const distance = calculateDistance(
        passengerRoute.from.lat,
        passengerRoute.from.lng,
        passengerRoute.to.lat,
        passengerRoute.to.lng
      );

      // 2. Get base rate based on vehicle type
      const baseRatePerKm = vehicleType === 'car' ? this.BASE_RATE_CAR : this.BASE_RATE_BIKE;

      // 3. Calculate base price
      const basePrice = distance * baseRatePerKm;

      // 4. Calculate time multiplier based on offer date and time
      const offerDateTime = new Date(offerDate);
      
      // Parse offer time (format: "9:00 AM" or "09:00" or "21:30")
      let offerHour = 0;
      let offerMinute = 0;
      
      if (offerTime) {
        // Try to parse different time formats
        const timeMatch = offerTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (timeMatch) {
          offerHour = parseInt(timeMatch[1]);
          offerMinute = parseInt(timeMatch[2]);
          const ampm = timeMatch[3]?.toUpperCase();
          
          // Convert to 24-hour format
          if (ampm === 'PM' && offerHour !== 12) {
            offerHour += 12;
          } else if (ampm === 'AM' && offerHour === 12) {
            offerHour = 0;
          }
        } else {
          // Try simple format like "09:00"
          const parts = offerTime.split(':');
          if (parts.length >= 2) {
            offerHour = parseInt(parts[0]);
            offerMinute = parseInt(parts[1]);
          }
        }
      }
      
      // Set the hour and minute on the offer date
      offerDateTime.setHours(offerHour, offerMinute, 0, 0);
      
      // Determine if it's night time (10 PM to 6 AM)
      const tripHour = offerDateTime.getHours();
      const isNightTime = tripHour >= 22 || tripHour < 6;
      const timeMultiplier = isNightTime ? this.NIGHT_TIME_MULTIPLIER : this.DAY_TIME_MULTIPLIER;
      const timeMultiplierLabel = isNightTime ? 'Night Time (+30%)' : 'Day Time';

      // 5. Calculate supply/demand multiplier
      const supplyMultiplier = await this.calculateSupplyMultiplier(passengerRoute, offerId);
      const supplyMultiplierLabel = this.getSupplyLabel(supplyMultiplier);

      // 6. Calculate final price
      const priceAfterTime = basePrice * timeMultiplier;
      const finalPrice = priceAfterTime * supplyMultiplier;

      // 7. Calculate platform fee (10% of final price, minimum ₹5)
      const platformFee = Math.max(finalPrice * 0.1, 5);

      // 8. Calculate total amount
      const totalAmount = finalPrice + platformFee;

      // Build breakdown
      const breakdown: PriceBreakdown = {
        baseDistance: parseFloat(distance.toFixed(2)),
        baseRatePerKm,
        basePrice: parseFloat(basePrice.toFixed(2)),
        timeMultiplier,
        timeMultiplierLabel,
        supplyMultiplier,
        supplyMultiplierLabel,
        finalPrice: parseFloat(finalPrice.toFixed(2)),
        platformFee: parseFloat(platformFee.toFixed(2)),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        breakdown: {
          distance: parseFloat(distance.toFixed(2)),
          baseRate: baseRatePerKm,
          distanceCharge: parseFloat(basePrice.toFixed(2)),
          timeMultiplier,
          timeCharge: parseFloat((priceAfterTime - basePrice).toFixed(2)),
          supplyMultiplier,
          supplyAdjustment: parseFloat((finalPrice - priceAfterTime).toFixed(2)),
          subtotal: parseFloat(finalPrice.toFixed(2)),
          platformFee: parseFloat(platformFee.toFixed(2)),
          total: parseFloat(totalAmount.toFixed(2)),
        },
      };

      logger.info(
        `Price calculated for offer ${offerId}: Distance=${distance.toFixed(2)}km, ` +
        `Base=₹${basePrice.toFixed(2)}, Time=${timeMultiplier}x, Supply=${supplyMultiplier.toFixed(2)}x, ` +
        `Final=₹${finalPrice.toFixed(2)}, Total=₹${totalAmount.toFixed(2)}`
      );

      return breakdown;
    } catch (error) {
      logger.error('Error calculating price:', error);
      throw error;
    }
  }

  /**
   * Calculate supply/demand multiplier based on number of available offers
   */
  private async calculateSupplyMultiplier(
    passengerRoute: Route,
    currentOfferId: string
  ): Promise<number> {
    try {
      // Find similar offers (offers that match passenger's route)
      const similarOffers = await PoolingOffer.find({
        offerId: { $ne: currentOfferId },
        status: { $in: ['active', 'pending', 'booked'] },
        availableSeats: { $gt: 0 },
      });

      // Filter offers that match passenger route (simplified - can be enhanced)
      let matchingOffers = 0;
      for (const offer of similarOffers) {
        // Check if offer route overlaps with passenger route
        const offerFromLat = offer.route.from.lat;
        const offerFromLng = offer.route.from.lng;
        const offerToLat = offer.route.to.lat;
        const offerToLng = offer.route.to.lng;

        const passengerFromLat = passengerRoute.from.lat;
        const passengerFromLng = passengerRoute.from.lng;
        const passengerToLat = passengerRoute.to.lat;
        const passengerToLng = passengerRoute.to.lng;

        // Simple overlap check: if passenger route is within driver route bounds
        const minOfferLat = Math.min(offerFromLat, offerToLat);
        const maxOfferLat = Math.max(offerFromLat, offerToLat);
        const minOfferLng = Math.min(offerFromLng, offerToLng);
        const maxOfferLng = Math.max(offerFromLng, offerToLng);

        const passengerInBounds =
          passengerFromLat >= minOfferLat &&
          passengerFromLat <= maxOfferLat &&
          passengerFromLng >= minOfferLng &&
          passengerFromLng <= maxOfferLng &&
          passengerToLat >= minOfferLat &&
          passengerToLat <= maxOfferLat &&
          passengerToLng >= minOfferLng &&
          passengerToLng <= maxOfferLng;

        if (passengerInBounds) {
          matchingOffers++;
        }
      }

      // Determine multiplier based on supply
      if (matchingOffers >= this.HIGH_SUPPLY_THRESHOLD) {
        return this.HIGH_SUPPLY_MULTIPLIER;
      } else if (matchingOffers < this.LOW_SUPPLY_THRESHOLD) {
        return this.LOW_SUPPLY_MULTIPLIER;
      } else {
        return this.MEDIUM_SUPPLY_MULTIPLIER;
      }
    } catch (error) {
      logger.error('Error calculating supply multiplier:', error);
      // Default to medium supply on error
      return this.MEDIUM_SUPPLY_MULTIPLIER;
    }
  }

  /**
   * Get human-readable supply label
   */
  private getSupplyLabel(multiplier: number): string {
    if (multiplier === this.HIGH_SUPPLY_MULTIPLIER) {
      return 'High Supply (-8%)';
    } else if (multiplier === this.LOW_SUPPLY_MULTIPLIER) {
      return 'Low Supply (+25%)';
    } else {
      return 'Normal Supply';
    }
  }
}

export const priceCalculationService = new PriceCalculationService();
export default priceCalculationService;
