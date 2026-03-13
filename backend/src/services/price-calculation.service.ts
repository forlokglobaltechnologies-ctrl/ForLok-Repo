import PoolingOffer from '../models/PoolingOffer';
import { calculateDistance } from '../utils/helpers';
import logger from '../utils/logger';
import { Route } from '../types';
import { pricingDataService } from './pricing-data.service';

interface PriceCalculationParams {
  passengerRoute: Route;
  offerId: string;
  vehicleType: 'car' | 'bike' | 'scooty';
  offerDate: Date;
  offerTime: string;
  vehicleDetails?: {
    brand?: string;
    model?: string;
    fuelType?: string;
    transmission?: string;
    year?: number;
  };
  offerContext?: {
    totalSeats?: number;
    availableSeats?: number;
    bookedSeats?: number;
  };
}

interface CurrentOfferPricingSnapshot {
  vehicle?: {
    brand?: string;
    model?: string;
    fuelType?: string;
    transmission?: string;
    year?: number;
  };
  availableSeats?: number;
  totalSeats?: number;
  passengers?: Array<{
    status?: 'pending' | 'confirmed' | 'cancelled';
    seatsBooked?: number;
  }>;
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
    contextMultiplier?: number;
    contextAdjustment?: number;
    subtotal: number;
    platformFee: number;
    total: number;
    shareSeats?: number;
    perSeatBeforeRounding?: number;
  };
  explanation: {
    lookup: {
      usedCsv: boolean;
      fallbackLevel: string;
        energyCostPerKm?: number;
      matchedVehicle?: {
        category: string;
        brand: string;
        model: string;
        fuelType: string;
        transmission: string;
        launchYear?: number;
        ageBucket?: string;
        mileageUnit?: string;
        realWorldMileageAvg?: number;
      };
      cityFuelSnapshot?: {
        city: string;
        state?: string;
        requestedCity?: string;
        requestedState?: string;
        matchType?: 'exact' | 'nearest_city' | 'default';
        petrol?: number;
        diesel?: number;
        cng?: number;
        electricity?: number;
      };
      confidenceScore: number;
    };
    multipliers: {
      context: {
        label: string;
        value: number;
      };
      time: {
        label: string;
        value: number;
      };
      supply: {
        label: string;
        value: number;
      };
      totalRaw: number;
      totalApplied: number;
    };
    guardrails: {
      totalMultiplierMin: number;
      totalMultiplierMax: number;
      wasClamped: boolean;
      perSeatPerKmMin: number;
      perSeatPerKmMax: number;
      perSeatPerKmApplied: number;
      wasPerSeatPerKmCapped: boolean;
    };
    poolingShare: {
      shareSeats: number;
      tripLevelPrice: number;
      perSeatPrice: number;
    };
  };
}

class PriceCalculationService {
  // Base rates per km (in INR)
  private readonly BASE_RATE_CAR = 8; // ₹8 per km for car
  private readonly BASE_RATE_BIKE = 5; // ₹5 per km for bike
  private readonly BASE_RATE_SCOOTY = 4; // ₹4 per km for scooty

  // Time-based multipliers
  private readonly DAY_TIME_MULTIPLIER = 1.0; // legacy fallback only
  private readonly NIGHT_TIME_MULTIPLIER = 1.3; // legacy fallback only

  // Supply/demand multipliers
  private readonly HIGH_SUPPLY_MULTIPLIER = 0.92; // Many offers available
  private readonly MEDIUM_SUPPLY_MULTIPLIER = 1.0; // Normal supply
  private readonly LOW_SUPPLY_MULTIPLIER = 1.25; // Few offers available

  // Thresholds for supply/demand
  private readonly HIGH_SUPPLY_THRESHOLD = 5; // 5+ offers = high supply
  private readonly LOW_SUPPLY_THRESHOLD = 2; // <2 offers = low supply
  private readonly POOLING_SUPPLY_MULTIPLIER_MIN = 0.9;
  private readonly POOLING_SUPPLY_MULTIPLIER_MAX = 1.08;

  /**
   * Calculate dynamic price for passenger based on distance, time, and supply/demand
   */
  async calculatePrice(params: PriceCalculationParams): Promise<PriceBreakdown> {
    try {
      const { passengerRoute, offerId, vehicleType, offerDate, offerTime, vehicleDetails } = params;
      const currentOffer = (await PoolingOffer.findOne({ offerId }).select(
        'vehicle availableSeats totalSeats passengers'
      ).lean()) as CurrentOfferPricingSnapshot | null;
      const resolvedVehicleDetails = {
        brand: vehicleDetails?.brand || currentOffer?.vehicle?.brand,
        model: vehicleDetails?.model || currentOffer?.vehicle?.model,
        fuelType: vehicleDetails?.fuelType || currentOffer?.vehicle?.fuelType,
        transmission: vehicleDetails?.transmission || currentOffer?.vehicle?.transmission,
        year: vehicleDetails?.year || currentOffer?.vehicle?.year,
      };

      // 1. Calculate distance
      const distance = calculateDistance(
        passengerRoute.from.lat,
        passengerRoute.from.lng,
        passengerRoute.to.lat,
        passengerRoute.to.lng
      );

      // 2. Resolve base rate (CSV-driven if available, otherwise legacy type-based)
      const legacyBaseRatePerKm = vehicleType === 'car' ? this.BASE_RATE_CAR : vehicleType === 'scooty' ? this.BASE_RATE_SCOOTY : this.BASE_RATE_BIKE;
      const baseRateProfile = await pricingDataService.calculateVehicleBaseRate(
        {
          vehicleType,
          brand: resolvedVehicleDetails.brand,
          model: resolvedVehicleDetails.model,
          fuelType: resolvedVehicleDetails.fuelType,
          transmission: resolvedVehicleDetails.transmission,
          year: resolvedVehicleDetails.year,
          city: passengerRoute.from.city || passengerRoute.to.city,
          state: passengerRoute.from.state || passengerRoute.to.state,
        },
        legacyBaseRatePerKm
      );
      const baseRatePerKm = baseRateProfile.baseRatePerKm;

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
      
      // Resolve time multiplier from pricing data (fallback in resolver)
      const tripHour = offerDateTime.getHours();
      const timeMultiplierInfo = pricingDataService.getTimeMultiplier(tripHour);
      const timeMultiplier = timeMultiplierInfo.value;
      const timeMultiplierLabel = timeMultiplierInfo.label;

      // 5. Calculate supply/demand multiplier
      const supply = await this.calculateSupplyMultiplier(passengerRoute, offerId);
      const supplyMultiplier = Math.max(
        this.POOLING_SUPPLY_MULTIPLIER_MIN,
        Math.min(this.POOLING_SUPPLY_MULTIPLIER_MAX, supply.value)
      );
      const supplyMultiplierLabel = supply.label;

      // 6. Apply additional context multiplier (city/traffic/age/confidence from CSV)
      const contextMultiplier = baseRateProfile.contextMultiplier || 1;
      const priceAfterContext = basePrice * contextMultiplier;
      const priceAfterTime = priceAfterContext * timeMultiplier;
      const computedPrice = priceAfterContext * timeMultiplier * supplyMultiplier;

      // Apply total multiplier guardrail
      const totalMultiplierRaw = computedPrice / basePrice;
      const totalGuards = pricingDataService.getTotalMultiplierGuardrails();
      const boundedTotalMultiplier = Math.max(totalGuards.min, Math.min(totalGuards.max, totalMultiplierRaw));
      const finalTripPrice = basePrice * boundedTotalMultiplier;
      const wasClamped = Math.abs(boundedTotalMultiplier - totalMultiplierRaw) > 0.0001;

      // Core pooling fix: charge per-seat by splitting trip fare across shareable seats.
      const bookedSeats =
        Number(params.offerContext?.bookedSeats) ||
        Number((currentOffer?.passengers || [])
          .filter((p) => ['pending', 'confirmed'].includes(String(p?.status || '')))
          .reduce((sum, p) => sum + Math.max(1, Number(p?.seatsBooked || 1)), 0));
      const availableSeats = Number(params.offerContext?.availableSeats) || Number(currentOffer?.availableSeats || 0);
      const totalSeats = Number(params.offerContext?.totalSeats) || Number(currentOffer?.totalSeats || 0);
      const inferredShareSeats = availableSeats + bookedSeats;
      const fallbackShareSeats = vehicleType === 'car' ? Math.max(1, totalSeats - 1) : 1;
      const shareSeats = Math.max(1, inferredShareSeats || fallbackShareSeats || 1);
      const initialPerSeatPrice = finalTripPrice / shareSeats;
      const perSeatBand = pricingDataService.getPerSeatPerKmBand(vehicleType);
      const safeDistance = Math.max(1, distance);
      const minPerSeatTotal = perSeatBand.min * safeDistance;
      const maxPerSeatTotal = perSeatBand.max * safeDistance;
      const finalPrice = Math.max(minPerSeatTotal, Math.min(maxPerSeatTotal, initialPerSeatPrice));
      const wasPerSeatPerKmCapped = Math.abs(finalPrice - initialPerSeatPrice) > 0.0001;
      const perSeatPerKmApplied = finalPrice / safeDistance;
      const perSeatBasePrice = basePrice / shareSeats;
      const perSeatAfterContext = priceAfterContext / shareSeats;
      const perSeatAfterTime = priceAfterTime / shareSeats;

      // 7. Service-mode pooling: no platform fee charged in-app.
      const platformFee = 0;

      // 8. Total equals ride fare in manual-payment model.
      const totalAmount = finalPrice;

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
          distanceCharge: parseFloat(perSeatBasePrice.toFixed(2)),
          timeMultiplier,
          timeCharge: parseFloat((perSeatAfterTime - perSeatAfterContext).toFixed(2)),
          supplyMultiplier,
          supplyAdjustment: parseFloat(((finalTripPrice - priceAfterTime) / shareSeats).toFixed(2)),
          contextMultiplier: parseFloat(contextMultiplier.toFixed(4)),
          contextAdjustment: parseFloat((perSeatAfterContext - perSeatBasePrice).toFixed(2)),
          subtotal: parseFloat(finalPrice.toFixed(2)),
          platformFee: parseFloat(platformFee.toFixed(2)),
          total: parseFloat(totalAmount.toFixed(2)),
          shareSeats,
          perSeatBeforeRounding: parseFloat(finalPrice.toFixed(4)),
        },
        explanation: {
          lookup: {
            usedCsv: baseRateProfile.usedCsv,
            fallbackLevel: baseRateProfile.fallbackLevel,
            energyCostPerKm: baseRateProfile.energyCostPerKm,
            matchedVehicle: baseRateProfile.matchedVehicle,
            cityFuelSnapshot: baseRateProfile.cityFuelSnapshot,
            confidenceScore: baseRateProfile.confidenceScore,
          },
          multipliers: {
            context: {
              label: baseRateProfile.contextLabel,
              value: parseFloat(contextMultiplier.toFixed(4)),
            },
            time: {
              label: timeMultiplierLabel,
              value: parseFloat(timeMultiplier.toFixed(4)),
            },
            supply: {
              label: supplyMultiplierLabel,
              value: parseFloat(supplyMultiplier.toFixed(4)),
            },
            totalRaw: parseFloat(totalMultiplierRaw.toFixed(4)),
            totalApplied: parseFloat(boundedTotalMultiplier.toFixed(4)),
          },
          guardrails: {
            totalMultiplierMin: parseFloat(totalGuards.min.toFixed(4)),
            totalMultiplierMax: parseFloat(totalGuards.max.toFixed(4)),
            wasClamped,
            perSeatPerKmMin: parseFloat(perSeatBand.min.toFixed(4)),
            perSeatPerKmMax: parseFloat(perSeatBand.max.toFixed(4)),
            perSeatPerKmApplied: parseFloat(perSeatPerKmApplied.toFixed(4)),
            wasPerSeatPerKmCapped,
          },
          poolingShare: {
            shareSeats,
            tripLevelPrice: parseFloat(finalTripPrice.toFixed(2)),
            perSeatPrice: parseFloat(finalPrice.toFixed(2)),
          },
        },
      };

      logger.info(
        `Price calculated for offer ${offerId}: Distance=${distance.toFixed(2)}km, ` +
        `BaseRate=₹${baseRatePerKm.toFixed(2)}/km (${baseRateProfile.fallbackLevel}), Base=₹${basePrice.toFixed(2)}, ` +
        `Context=${contextMultiplier.toFixed(3)}x, Time=${timeMultiplier.toFixed(2)}x, Supply=${supplyMultiplier.toFixed(2)}x, ` +
        `TotalMult=${boundedTotalMultiplier.toFixed(3)}x, Trip=₹${finalTripPrice.toFixed(2)}, ShareSeats=${shareSeats}, ` +
        `PerSeat=₹${finalPrice.toFixed(2)}, Total=₹${totalAmount.toFixed(2)}`
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
  ): Promise<{ value: number; label: string }> {
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
      const result = pricingDataService.getSupplyMultiplier(matchingOffers);
      return result;
    } catch (error) {
      logger.error('Error calculating supply multiplier:', error);
      // Default to medium supply on error
      return { value: this.MEDIUM_SUPPLY_MULTIPLIER, label: 'Normal Supply' };
    }
  }
}

export const priceCalculationService = new PriceCalculationService();
export default priceCalculationService;
