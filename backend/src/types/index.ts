// Type Definitions

export type UserType = 'individual' | 'company' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type OfferStatus = 'active' | 'pending' | 'expired' | 'completed' | 'cancelled' | 'suspended' | 'booked' | 'in_progress';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'upi' | 'card' | 'wallet' | 'net_banking' | 'offline_cash';
export type DocumentType =
  | 'aadhar_front'
  | 'aadhar_back'
  | 'driving_license_front'
  | 'driving_license_back'
  | 'vehicle_front'
  | 'vehicle_back'
  | 'vehicle_side'
  | 'vehicle_interior'
  | 'vehicle_insurance'
  | 'vehicle_registration'
  | 'vehicle_pollution'
  | 'taxi_service_papers'
  | 'user_photo'
  | 'company_registration'
  | 'gst_certificate'
  | 'business_license';
export type DocumentStatus = 'pending' | 'verified' | 'rejected' | 'under_review';
export type VehicleType = 'car' | 'bike' | 'scooty';
export type ServiceType = 'pooling' | 'rental';
export type OTPType = 'signup' | 'login' | 'reset_password' | 'verify_phone' | 'verify_email';
export type NotificationType =
  | 'booking_request'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'payment_required'
  | 'payment_received'
  | 'payment_completed'
  | 'rating_request'
  | 'document_verified'
  | 'document_rejected'
  | 'coin_earned'
  | 'coin_redeemed'
  | 'referral_reward'
  | 'milestone_achieved'
  | 'promo_approved'
  | 'promo_rejected'
  | 'sos_alert'
  | 'feedback_acknowledged'
  | 'feedback_resolved'
  | 'feedback_response'
  | 'feedback_archived';
export type FeedbackType = 'issue' | 'suggestion' | 'complaint';
export type FeedbackStatus = 'pending' | 'acknowledged' | 'resolved' | 'archived';
export type FeedbackPriority = 'high' | 'medium' | 'low';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Location Types
export interface Location {
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  pincode?: string;
}

// Road Segment Type (for road-aware matching)
export interface RouteRoadSegment {
  roadId: string;
  roadName?: string;
  roadRef?: string;
  direction: 'forward' | 'backward' | 'bidirectional';
  estimatedTime: Date;
  lat: number;
  lng: number;
  segmentIndex: number;
  distance?: number;
}

// Waypoint for driver-specified intermediate stops
export interface Waypoint {
  address: string;
  lat: number;
  lng: number;
  city?: string;
  order: number;
}

// Route Types
export interface Route {
  from: Location;
  to: Location;
  waypoints?: Waypoint[];
  distance?: number; // in km
  duration?: number; // in minutes
  polyline?: Array<{ lat: number; lng: number; index: number }>;
  roadSegments?: RouteRoadSegment[];
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  userType: UserType;
  phone: string;
  iat?: number;
  exp?: number;
}

// File Upload Types
export interface UploadedFile {
  public_id: string;
  secure_url: string;
  url: string;
  width?: number;
  height?: number;
  format: string;
}

// OTP Verification Types
export interface OTPVerification {
  phone: string;
  otp: string;
  type: OTPType;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
}

// Error Types
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
  fieldErrors?: Array<{ field: string; message: string; code?: string }>;
  details?: unknown;
}
