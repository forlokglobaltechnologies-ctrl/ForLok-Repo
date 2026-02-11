// Application Constants

export const USER_TYPES = {
  INDIVIDUAL: 'individual',
  COMPANY: 'company',
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING_VERIFICATION: 'pending_verification',
} as const;

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const OFFER_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  EXPIRED: 'expired',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  SUSPENDED: 'suspended',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export const PAYMENT_METHODS = {
  UPI: 'upi',
  CARD: 'card',
  WALLET: 'wallet',
  NET_BANKING: 'net_banking',
} as const;

export const DOCUMENT_TYPES = {
  AADHAR_FRONT: 'aadhar_front',
  AADHAR_BACK: 'aadhar_back',
  DRIVING_LICENSE_FRONT: 'driving_license_front',
  DRIVING_LICENSE_BACK: 'driving_license_back',
  VEHICLE_FRONT: 'vehicle_front',
  VEHICLE_BACK: 'vehicle_back',
  VEHICLE_INSURANCE: 'vehicle_insurance',
  USER_PHOTO: 'user_photo',
  COMPANY_REGISTRATION: 'company_registration',
  GST_CERTIFICATE: 'gst_certificate',
  BUSINESS_LICENSE: 'business_license',
} as const;

export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  UNDER_REVIEW: 'under_review',
} as const;

export const VEHICLE_TYPES = {
  CAR: 'car',
  BIKE: 'bike',
} as const;

export const SERVICE_TYPES = {
  POOLING: 'pooling',
  RENTAL: 'rental',
} as const;

export const OTP_TYPES = {
  SIGNUP: 'signup',
  LOGIN: 'login',
  RESET_PASSWORD: 'reset_password',
  VERIFY_PHONE: 'verify_phone',
} as const;

export const NOTIFICATION_TYPES = {
  BOOKING_REQUEST: 'booking_request',
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  PAYMENT_RECEIVED: 'payment_received',
  RATING_REQUEST: 'rating_request',
  DOCUMENT_VERIFIED: 'document_verified',
  DOCUMENT_REJECTED: 'document_rejected',
} as const;

export const FEEDBACK_TYPES = {
  ISSUE: 'issue',
  SUGGESTION: 'suggestion',
  COMPLAINT: 'complaint',
} as const;

export const FEEDBACK_STATUS = {
  PENDING: 'pending',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  ARCHIVED: 'archived',
} as const;

export const FEEDBACK_PRIORITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// File upload limits
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB (increased for PDFs)
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  ],
} as const;

// OTP configuration
export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRES_IN_SECONDS: 300, // 5 minutes
  MAX_ATTEMPTS: 3,
} as const;

// JWT token expiration
export const TOKEN_EXPIRATION = {
  ACCESS_TOKEN: '7d',
  REFRESH_TOKEN: '30d',
} as const;

// Platform fee percentage
export const PLATFORM_FEE_PERCENTAGE = 5; // 5%

// Minimum booking amounts
export const MINIMUM_BOOKING_AMOUNT = {
  POOLING: 50,
  RENTAL: 200,
} as const;
