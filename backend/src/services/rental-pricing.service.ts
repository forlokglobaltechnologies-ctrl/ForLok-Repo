import logger from '../utils/logger';

/**
 * Rental Pricing Calculator Service
 * Calculates suggested rental price per hour based on vehicle factors
 */
class RentalPricingService {
  // Base rates per hour (in INR) by vehicle type and category
  private readonly BASE_RATES = {
    car: {
      economy: 200,      // Maruti Swift, Hyundai i10, etc.
      midRange: 300,    // Honda City, Hyundai Creta, etc.
      premium: 500,     // Toyota Camry, Honda Accord, etc.
      luxury: 800,      // BMW, Mercedes, Audi, etc.
      suv: 400,         // Mahindra XUV, Tata Harrier, etc.
    },
    bike: {
      economy: 50,      // Hero, Bajaj, etc.
      midRange: 80,     // Honda, Yamaha, etc.
      premium: 120,     // Royal Enfield, etc.
      luxury: 200,      // Harley Davidson, etc.
    },
  };

  // Premium brands that command higher prices
  private readonly PREMIUM_BRANDS = [
    'bmw', 'mercedes', 'mercedes-benz', 'audi', 'porsche', 'jaguar', 'land rover',
    'lexus', 'volvo', 'tesla', 'range rover', 'bentley', 'rolls-royce', 'maserati',
    'harley davidson', 'royal enfield', 'triumph', 'ducati',
  ];

  // Economy brands
  private readonly ECONOMY_BRANDS = [
    'maruti', 'suzuki', 'hyundai', 'tata', 'mahindra', 'hero', 'bajaj', 'tvs',
  ];

  /**
   * Calculate suggested rental price per hour
   */
  calculateRentalPrice(params: {
    vehicleType: 'car' | 'bike';
    brand: string;
    model?: string;
    year?: number;
    seats: number;
    fuelType: 'Petrol' | 'Diesel' | 'Electric' | 'CNG';
    transmission: 'Manual' | 'Automatic';
    location?: {
      city?: string;
      state?: string;
      lat?: number;
      lng?: number;
    };
    date?: Date;
    availableFrom?: string;
    availableUntil?: string;
    availableRentalsCount?: number; // Number of available rentals at same location/date/time
  }): {
    suggestedPrice: number;
    breakdown: {
      basePrice: number;
      ageMultiplier: number;
      transmissionMultiplier: number;
      fuelMultiplier: number;
      seatsMultiplier: number;
      timeMultiplier: number;
      dayNightMultiplier: number;
      supplyDemandMultiplier: number;
      locationMultiplier: number;
      finalPrice: number;
    };
    factors: string[];
  } {
    try {
      const {
        vehicleType,
        brand,
        model,
        year,
        seats,
        fuelType,
        transmission,
        location,
        date,
        availableFrom,
        availableRentalsCount,
      } = params;

      // 1. Determine base price based on vehicle type and category
      const category = this.determineCategory(vehicleType, brand, model, seats);
      // Type-safe access: bikes don't have 'suv' category
      let basePrice: number;
      if (vehicleType === 'car') {
        basePrice = (this.BASE_RATES.car as any)[category] || this.BASE_RATES.car.economy;
      } else {
        // For bikes, 'suv' category should not occur, but handle it safely
        const bikeCategory = category === 'suv' ? 'economy' : category;
        basePrice = (this.BASE_RATES.bike as any)[bikeCategory] || this.BASE_RATES.bike.economy;
      }

      // 2. Calculate age multiplier (depreciation)
      const currentYear = new Date().getFullYear();
      const vehicleAge = year ? currentYear - year : 0;
      const ageMultiplier = Math.max(0.4, 1 - vehicleAge * 0.1); // 10% depreciation per year, minimum 40%

      // 3. Transmission multiplier (less impact for bikes)
      const transmissionMultiplier = vehicleType === 'bike' 
        ? (transmission === 'Automatic' ? 1.10 : 1.0) // +10% for scooters/CVT bikes
        : (transmission === 'Automatic' ? 1.25 : 1.0); // +25% for automatic cars

      // 4. Fuel type multiplier
      const fuelMultiplier = this.getFuelMultiplier(fuelType);

      // 5. Seats multiplier
      const seatsMultiplier = this.getSeatsMultiplier(vehicleType, seats);

      // 6. Time-based multiplier (peak hours, weekends)
      const timeMultiplier = this.getTimeMultiplier(date, availableFrom);

      // 7. Day/Night multiplier (6 AM - 6 PM = day, 6 PM - 6 AM = night)
      const dayNightMultiplier = this.getDayNightMultiplier(availableFrom);

      // 8. Supply/Demand multiplier (based on available rentals)
      const supplyDemandMultiplier = this.getSupplyDemandMultiplier(availableRentalsCount);

      // 9. Location multiplier (demand-based)
      const locationMultiplier = this.getLocationMultiplier(location);

      // Calculate final price
      const finalPrice = Math.round(
        basePrice *
          ageMultiplier *
          transmissionMultiplier *
          fuelMultiplier *
          seatsMultiplier *
          timeMultiplier *
          dayNightMultiplier *
          supplyDemandMultiplier *
          locationMultiplier
      );

      // Generate factors explanation
      const factors = this.generateFactorsExplanation({
        vehicleType,
        category,
        vehicleAge,
        transmission,
        fuelType,
        seats,
        timeMultiplier,
        dayNightMultiplier,
        supplyDemandMultiplier,
        locationMultiplier,
      });

      logger.info(`💰 Calculated rental price: ₹${finalPrice}/hour for ${brand} ${model || ''} (${year || 'N/A'})`);

      return {
        suggestedPrice: finalPrice,
        breakdown: {
          basePrice,
          ageMultiplier,
          transmissionMultiplier,
          fuelMultiplier,
          seatsMultiplier,
          timeMultiplier,
          dayNightMultiplier,
          supplyDemandMultiplier,
          locationMultiplier,
          finalPrice,
        },
        factors,
      };
    } catch (error) {
      logger.error('Error calculating rental price:', error);
      // Return default price if calculation fails
      const defaultPrice = params.vehicleType === 'car' ? 300 : 80;
      return {
        suggestedPrice: defaultPrice,
        breakdown: {
          basePrice: defaultPrice,
          ageMultiplier: 1,
          transmissionMultiplier: 1,
          fuelMultiplier: 1,
          seatsMultiplier: 1,
          timeMultiplier: 1,
          dayNightMultiplier: 1,
          supplyDemandMultiplier: 1,
          locationMultiplier: 1,
          finalPrice: defaultPrice,
        },
        factors: ['Using default pricing'],
      };
    }
  }

  /**
   * Determine vehicle category based on brand, model, and seats
   */
  private determineCategory(
    vehicleType: 'car' | 'bike',
    brand: string,
    _model: string | undefined, // Prefix with _ to indicate intentionally unused
    seats: number
  ): 'economy' | 'midRange' | 'premium' | 'luxury' | 'suv' {
    const brandLower = brand.toLowerCase();

    // Check for premium brands
    if (this.PREMIUM_BRANDS.some((pb) => brandLower.includes(pb))) {
      return 'luxury';
    }

    // Check for SUV (only for cars with 7+ seats)
    if (vehicleType === 'car' && seats >= 7) {
      return 'suv';
    }

    // Check for economy brands
    if (this.ECONOMY_BRANDS.some((eb) => brandLower.includes(eb))) {
      return 'economy';
    }

    // Default to mid-range for unknown brands
    return 'midRange';
  }

  /**
   * Get fuel type multiplier
   */
  private getFuelMultiplier(fuelType: 'Petrol' | 'Diesel' | 'Electric' | 'CNG'): number {
    const multipliers = {
      Electric: 1.20, // Premium, lower running cost
      CNG: 1.12,      // Lower fuel cost
      Diesel: 1.08,   // Better mileage
      Petrol: 1.0,    // Base
    };
    return multipliers[fuelType] || 1.0;
  }

  /**
   * Get seats multiplier
   */
  private getSeatsMultiplier(vehicleType: 'car' | 'bike', seats: number): number {
    if (vehicleType === 'car') {
      if (seats >= 7) return 1.35; // 7-seater SUVs
      if (seats === 5) return 1.0; // Standard sedans
      if (seats <= 3) return 1.25; // Sports cars, compact
      return 1.0;
    } else {
      // Bike
      if (seats === 2) return 1.0;
      return 1.0;
    }
  }

  /**
   * Get time-based multiplier (peak hours, weekends)
   */
  private getTimeMultiplier(date?: Date, availableFrom?: string): number {
    if (!date) return 1.0;

    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Weekend multiplier
    if (isWeekend) {
      return 1.15; // +15% on weekends
    }

    // Peak hours (9 AM - 6 PM)
    if (availableFrom) {
      const timeMatch = availableFrom.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const ampm = timeMatch[3]?.toUpperCase();
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;

        if (hour >= 9 && hour < 18) {
          return 1.20; // +20% during peak hours
        }
      }
    }

    return 1.0; // Base rate for off-peak hours
  }

  /**
   * Get day/night multiplier (6 AM - 6 PM = day, 6 PM - 6 AM = night)
   */
  private getDayNightMultiplier(availableFrom?: string): number {
    if (!availableFrom) return 1.0;

    try {
      // Parse time string (format: "HH:MM AM/PM" or "HH:MM")
      const timeMatch = availableFrom.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!timeMatch) return 1.0;

      let hour = parseInt(timeMatch[1]);
      const ampm = timeMatch[3]?.toUpperCase();

      // Convert to 24-hour format
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;

      // Day time: 6 AM - 6 PM (06:00 - 18:00)
      // Night time: 6 PM - 6 AM (18:00 - 06:00)
      if (hour >= 6 && hour < 18) {
        return 1.0; // Day time - base rate
      } else {
        return 1.25; // Night time - +25% premium
      }
    } catch (error) {
      logger.error('Error parsing time for day/night multiplier:', error);
      return 1.0;
    }
  }

  /**
   * Get supply/demand multiplier based on number of available rentals
   */
  private getSupplyDemandMultiplier(availableRentalsCount?: number): number {
    if (availableRentalsCount === undefined || availableRentalsCount === null) {
      return 1.0; // Default if count not provided
    }

    // High supply (many rentals available) = lower price
    // Low supply (few rentals available) = higher price
    if (availableRentalsCount >= 20) {
      return 0.85; // High supply - 15% discount
    } else if (availableRentalsCount >= 10) {
      return 0.90; // Medium-high supply - 10% discount
    } else if (availableRentalsCount >= 5) {
      return 0.95; // Medium supply - 5% discount
    } else if (availableRentalsCount >= 2) {
      return 1.0; // Low-medium supply - base rate
    } else if (availableRentalsCount === 1) {
      return 1.15; // Very low supply - 15% premium
    } else {
      return 1.25; // No supply - 25% premium
    }
  }

  /**
   * Get location-based multiplier (demand-based)
   */
  private getLocationMultiplier(location?: { city?: string; state?: string; lat?: number; lng?: number }): number {
    if (!location?.city) return 1.0;

    // High-demand cities (metros)
    const highDemandCities = [
      'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai', 'pune', 'kolkata',
      'ahmedabad', 'gurgaon', 'noida',
    ];

    const cityLower = location.city.toLowerCase();
    if (highDemandCities.some((city) => cityLower.includes(city))) {
      return 1.10; // +10% in metros
    }

    return 1.0; // Base rate for other cities
  }

  /**
   * Generate human-readable factors explanation
   */
  private generateFactorsExplanation(params: {
    vehicleType: 'car' | 'bike';
    category: string;
    vehicleAge: number;
    transmission: string;
    fuelType: string;
    seats: number;
    timeMultiplier: number;
    dayNightMultiplier: number;
    supplyDemandMultiplier: number;
    locationMultiplier: number;
  }): string[] {
    const factors: string[] = [];

    factors.push(`Vehicle Category: ${params.category.charAt(0).toUpperCase() + params.category.slice(1)}`);

    if (params.vehicleAge > 0) {
      factors.push(`Vehicle Age: ${params.vehicleAge} years (${Math.round((1 - params.vehicleAge * 0.1) * 100)}% value)`);
    }

    if (params.transmission === 'Automatic') {
      if (params.vehicleType === 'bike') {
        factors.push('Transmission: Scooter/CVT (+10%)');
      } else {
        factors.push('Transmission: Automatic (+25%)');
      }
    }

    if (params.fuelType === 'Electric') {
      factors.push('Fuel: Electric (+20%)');
    } else if (params.fuelType === 'CNG') {
      factors.push('Fuel: CNG (+12%)');
    } else if (params.fuelType === 'Diesel') {
      factors.push('Fuel: Diesel (+8%)');
    }

    if (params.seats >= 7) {
      factors.push(`Seats: ${params.seats} (SUV +35%)`);
    }

    if (params.timeMultiplier > 1.0) {
      if (params.timeMultiplier === 1.15) {
        factors.push('Time: Weekend (+15%)');
      } else if (params.timeMultiplier === 1.20) {
        factors.push('Time: Peak Hours (+20%)');
      }
    }

    if (params.dayNightMultiplier > 1.0) {
      factors.push('Time: Night Time (+25%)');
    } else if (params.dayNightMultiplier < 1.0) {
      factors.push('Time: Day Time (Base Rate)');
    }

    if (params.supplyDemandMultiplier > 1.0) {
      if (params.supplyDemandMultiplier === 1.15) {
        factors.push('Supply: Very Low (+15%)');
      } else if (params.supplyDemandMultiplier === 1.25) {
        factors.push('Supply: No Availability (+25%)');
      }
    } else if (params.supplyDemandMultiplier < 1.0) {
      if (params.supplyDemandMultiplier === 0.85) {
        factors.push('Supply: High Availability (-15%)');
      } else if (params.supplyDemandMultiplier === 0.90) {
        factors.push('Supply: Good Availability (-10%)');
      } else if (params.supplyDemandMultiplier === 0.95) {
        factors.push('Supply: Moderate Availability (-5%)');
      }
    }

    if (params.locationMultiplier > 1.0) {
      factors.push('Location: High-demand area (+10%)');
    }

    return factors;
  }
}

export const rentalPricingService = new RentalPricingService();
export default rentalPricingService;
