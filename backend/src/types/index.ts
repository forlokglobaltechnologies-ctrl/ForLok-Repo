// Type Definitions

export type UserType = 'individual' | 'company' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type OfferStatus = 'active' | 'pending' | 'expired' | 'completed' | 'cancelled' | 'suspended' | 'booked';
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
export type VehicleType = 'car' | 'bike';
export type ServiceType = 'pooling' | 'rental';
export type OTPType = 'signup' | 'login' | 'reset_password' | 'verify_phone' | 'verify_email';
export type NotificationType =
  | 'booking_request'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'payment_received'
  | 'rating_request'
  | 'document_verified'
  | 'document_rejected';
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

// Route Types
export interface Route {
  from: Location;
  to: Location;
  distance?: number; // in km
  duration?: number; // in minutes
  polyline?: Array<{ lat: number; lng: number; index: number }>; // Polyline coordinates with indices for route matching
  roadSegments?: Array<{
    roadId: string;
    direction: 'forward' | 'backward' | 'bidirectional';
    estimatedTime: Date;
    lat: number;
    lng: number;
    segmentIndex: number;
  }>;
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
}
