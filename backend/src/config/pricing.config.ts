/**
 * Pricing and Refund Policy Configuration
 * Forlok - Ride Sharing Platform
 * 
 * PAYMENT MODEL:
 * - No upfront payment at booking time
 * - Payment is processed at trip end (Get Out + OTP verification)
 * - Two payment options at trip end:
 *   1. Online (UPI/Card/Net Banking) → Razorpay → Money to Forlok → Driver wallet credited
 *   2. Offline Cash → Passenger pays driver directly → Platform fee deducted from driver wallet
 * - Driver requests withdrawal -> Admin approves
 * - Wallet ₹100 minimum required for passengers to book (cancellation security)
 * - 1st cancellation is FREE, 2nd+ uses time-based tiers
 */

export const PRICING_CONFIG = {
  // Platform fee percentage
  PLATFORM_FEE_PERCENTAGE: 10, // 10%

  // Wallet requirements
  WALLET: {
    MINIMUM_TO_BOOK: 100, // ₹100 minimum balance for PASSENGERS to book/take rides
    MINIMUM_FOR_DRIVER: 0, // ₹0 minimum — drivers giving rides need wallet ≥ 0
    TOP_UP_AMOUNTS: [100, 200, 500, 1000],
    MIN_TOP_UP: 50, // ₹50 minimum top-up
    MIN_WITHDRAWAL: 100, // ₹100 minimum withdrawal
  },

  // Cancellation fee tiers (percentage of ride amount to CHARGE as fee)
  // These are the FEE percentages, NOT refund percentages
  // 1st cancellation is always FREE (handled in code)
  // 2nd cancellation onwards uses these tiers
  CANCELLATION_FEE_POLICY: {
    BEFORE_ACCEPTED: 0, // Before driver accepts (booking pending) - no fee
    OVER_24_HOURS: 10, // > 24 hours before trip - 10% fee
    HOURS_12_TO_24: 25, // 12-24 hours before trip - 25% fee
    HOURS_2_TO_12: 50, // 2-12 hours before trip - 50% fee
    HOURS_1_TO_2: 75, // 1-2 hours before trip - 75% fee
    UNDER_1_HOUR: 100, // < 1 hour or trip started - 100% fee
    DRIVER_CANCELS: 0, // Driver cancels - no fee for passenger
  },

  // Fuel prices (update periodically)
  FUEL_PRICES: {
    petrol: 105,
    diesel: 92,
    cng: 85, // per kg
    electric: 12, // per kWh
  },

  // Default mileage by vehicle type if not provided (km per liter or kWh)
  DEFAULT_MILEAGE: {
    car: {
      petrol: 15,
      diesel: 18,
      cng: 22,
      electric: 6, // km per kWh
    },
    bike: {
      petrol: 45,
      electric: 30,
    },
  },

  // Time-based multipliers for dynamic pricing
  TIME_MULTIPLIERS: {
    PEAK_MORNING: { hours: [6, 7, 8, 9, 10], multiplier: 1.1 },
    PEAK_EVENING: { hours: [17, 18, 19, 20], multiplier: 1.15 },
    LATE_NIGHT: { hours: [22, 23, 0, 1, 2, 3, 4, 5], multiplier: 1.2 },
    NORMAL: { multiplier: 1.0 },
  },

  // Price adjustment range for drivers
  DRIVER_PRICE_ADJUSTMENT: 0.2, // ±20%

  // Price bounds
  MIN_PRICE_PER_KM: 1.5,
  MAX_PRICE_PER_KM: 5,

  // Round prices to nearest X
  PRICE_ROUNDING: 5, // Round to nearest ₹5

  // Coin Reward System
  COIN: {
    CONVERSION_RATE: 50, // 50 coins = ₹1
    MAX_RIDE_DISCOUNT_PERCENT: 50, // Max 50% of ride payable via coins
    SIGNUP_BONUS: { min: 10, max: 100 },
    REFERRAL_BONUS: { min: 20, max: 150 },
    RIDE_BONUS: { min: 1, max: 200 },
    PROMO_INSTAGRAM_STORY: { min: 100, max: 500 },
    PROMO_REEL_SHORT: { min: 200, max: 1000 },
    MILESTONES: [
      { rides: 10, badge: 'New Rider', coins: 50 },
      { rides: 50, badge: 'Regular Traveler', coins: 200 },
      { rides: 100, badge: 'Petrol Saver', coins: 500 },
      { rides: 250, badge: 'Environment Hero', coins: 1000 },
      { rides: 500, badge: 'Forlok Legend', coins: 2500 },
    ],
    EXPIRY_DAYS: 180, // Coins expire after 6 months
    MIN_RIDE_DISTANCE_KM: 2, // Minimum ride distance to earn coins
  },
};

/**
 * Get cancellation fee percentage based on hours until trip
 * Returns the FEE percentage (not refund percentage)
 * 1st cancellation is always free (checked in calling code)
 */
export function getCancellationFeePercentage(
  hoursUntilTrip: number,
  bookingStatus: string,
  cancelledBy: string
): number {
  // Driver/owner/system cancels = no fee for passenger
  if (cancelledBy === 'driver' || cancelledBy === 'owner' || cancelledBy === 'system') {
    return PRICING_CONFIG.CANCELLATION_FEE_POLICY.DRIVER_CANCELS;
  }

  // Booking not yet confirmed (pending)
  if (bookingStatus === 'pending') {
    return PRICING_CONFIG.CANCELLATION_FEE_POLICY.BEFORE_ACCEPTED;
  }

  // Trip already started
  if (bookingStatus === 'in_progress') {
    return PRICING_CONFIG.CANCELLATION_FEE_POLICY.UNDER_1_HOUR;
  }

  // Time-based calculation
  if (hoursUntilTrip >= 24) {
    return PRICING_CONFIG.CANCELLATION_FEE_POLICY.OVER_24_HOURS;
  }
  if (hoursUntilTrip >= 12) {
    return PRICING_CONFIG.CANCELLATION_FEE_POLICY.HOURS_12_TO_24;
  }
  if (hoursUntilTrip >= 2) {
    return PRICING_CONFIG.CANCELLATION_FEE_POLICY.HOURS_2_TO_12;
  }
  if (hoursUntilTrip >= 1) {
    return PRICING_CONFIG.CANCELLATION_FEE_POLICY.HOURS_1_TO_2;
  }

  return PRICING_CONFIG.CANCELLATION_FEE_POLICY.UNDER_1_HOUR;
}

/**
 * Get time multiplier for dynamic pricing
 */
export function getTimeMultiplier(hour: number): number {
  const { PEAK_MORNING, PEAK_EVENING, LATE_NIGHT } = PRICING_CONFIG.TIME_MULTIPLIERS;

  if (PEAK_MORNING.hours.includes(hour)) {
    return PEAK_MORNING.multiplier;
  }
  if (PEAK_EVENING.hours.includes(hour)) {
    return PEAK_EVENING.multiplier;
  }
  if (LATE_NIGHT.hours.includes(hour)) {
    return LATE_NIGHT.multiplier;
  }

  return PRICING_CONFIG.TIME_MULTIPLIERS.NORMAL.multiplier;
}

export default PRICING_CONFIG;
