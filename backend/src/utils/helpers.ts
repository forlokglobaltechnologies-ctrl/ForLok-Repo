import crypto from 'crypto';

/**
 * Generate random OTP
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
}

/**
 * Generate unique user ID (legacy - for backward compatibility)
 */
export function generateUserId(prefix: string = 'YA'): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Generate unique individual user ID (LKU + 4 digits)
 */
export async function generateIndividualUserId(): Promise<string> {
  const User = (await import('../models/User')).default;
  let userId: string;
  let exists = true;
  
  // Keep generating until we find a unique ID
  while (exists) {
    const randomDigits = crypto.randomInt(1000, 9999).toString();
    userId = `LKU${randomDigits}`;
    const existingUser = await User.findOne({ userId });
    if (!existingUser) {
      exists = false;
    }
  }
  
  return userId!;
}

/**
 * Generate unique 6-digit passenger code for trip verification
 */
export function generatePassengerCode(): string {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += digits[crypto.randomInt(0, digits.length)];
  }
  return code;
}

/**
 * Generate unique company ID (LKC + 4 digits)
 */
export async function generateCompanyId(): Promise<string> {
  const Company = (await import('../models/Company')).default;
  let companyId: string;
  let exists = true;
  
  // Keep generating until we find a unique ID
  while (exists) {
    const randomDigits = crypto.randomInt(1000, 9999).toString();
    companyId = `LKC${randomDigits}`;
    const existingCompany = await Company.findOne({ companyId });
    if (!existingCompany) {
      exists = false;
    }
  }
  
  return companyId!;
}

/**
 * Generate unique booking ID
 */
export function generateBookingId(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `#YA${year}${month}${day}${random}`;
}

/**
 * Validate phone number (Indian format)
 */
export function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Indian phone numbers: 10 digits, optionally prefixed with +91 or 91
  return /^(\+91|91)?[6-9]\d{9}$/.test(cleaned);
}

/**
 * Format phone number to standard format
 */
export function formatPhoneNumber(phone: string): string {
  console.log('📞 [HELPER] Formatting phone number. Input:', phone);
  const cleaned = phone.replace(/\D/g, '');
  console.log('📞 [HELPER] Cleaned phone:', cleaned);
  
  let formatted: string;
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    formatted = `+${cleaned}`;
    console.log('📞 [HELPER] Phone starts with 91 (12 digits). Formatted:', formatted);
  } else if (cleaned.length === 10) {
    formatted = `+91${cleaned}`;
    console.log('📞 [HELPER] Phone is 10 digits. Added +91. Formatted:', formatted);
  } else {
    formatted = phone;
    console.log('📞 [HELPER] Phone format not recognized. Returning original:', formatted);
  }
  
  console.log('📞 [HELPER] Final formatted phone:', formatted);
  return formatted;
}

/**
 * Validate email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate platform fee
 */
export function calculatePlatformFee(amount: number, feePercentage: number = 5): number {
  return Math.round((amount * feePercentage) / 100);
}

/**
 * Calculate total amount with platform fee
 */
export function calculateTotalAmount(amount: number, feePercentage: number = 5): number {
  const fee = calculatePlatformFee(amount, feePercentage);
  return amount + fee;
}

/**
 * Sanitize string (remove special characters)
 */
export function sanitizeString(str: string): string {
  return str.replace(/[^a-zA-Z0-9\s]/g, '').trim();
}

/**
 * Format currency (Indian Rupees)
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Generate pagination metadata
 */
export function getPaginationMeta(
  page: number,
  limit: number,
  total: number
): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mask sensitive data
 */
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  const visible = phone.slice(-4);
  const masked = '*'.repeat(phone.length - 4);
  return masked + visible;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.slice(0, 2) + '*'.repeat(local.length - 2);
  return `${maskedLocal}@${domain}`;
}

/**
 * Convert time string (HH:mm) to minutes since midnight
 * Handles both 24-hour format (09:00) and 12-hour format (9:00 AM)
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  
  // Handle 12-hour format (e.g., "9:00 AM", "5:30 PM")
  const ampmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1]);
    const minutes = parseInt(ampmMatch[2]);
    const ampm = ampmMatch[3].toUpperCase();
    
    if (ampm === 'PM' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  }
  
  // Handle 24-hour format (e.g., "09:00", "17:30")
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    return hours * 60 + minutes;
  }
  
  return 0;
}

/**
 * Check if two time slots overlap
 * Returns true if slots overlap, false otherwise
 */
export function timeSlotsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);
  
  // Handle case where end time is next day (e.g., 20:00 to 02:00)
  let end1Adj = end1Minutes;
  let end2Adj = end2Minutes;
  
  if (end1Minutes < start1Minutes) {
    end1Adj = end1Minutes + 24 * 60; // Next day
  }
  if (end2Minutes < start2Minutes) {
    end2Adj = end2Minutes + 24 * 60; // Next day
  }
  
  // Check overlap: start1 < end2 && end1 > start2
  return start1Minutes < end2Adj && end1Adj > start2Minutes;
}

/**
 * Calculate duration in hours from start and end time
 */
export function calculateDurationHours(startTime: string, endTime: string): number {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  let durationMinutes = endMinutes - startMinutes;
  
  // Handle next day case
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }
  
  return durationMinutes / 60;
}
