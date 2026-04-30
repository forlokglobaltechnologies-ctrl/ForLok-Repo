/**
 * API Client Utility
 * Helper functions for making API calls
 */

import { apiService } from '../services/api.service';
import { API_CONFIG, replaceUrlParams } from '../config/api';
import type { ApiResult } from '../services/api.service';

/**
 * Make authenticated API request
 */
export const apiCall = async <T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    params?: Record<string, string | number>; // URL parameters like :userId
    query?: Record<string, string | number>; // Query string parameters
    requiresAuth?: boolean;
  } = {}
): Promise<ApiResult<T>> => {
  // Replace URL parameters
  let finalEndpoint = endpoint;
  if (options.params) {
    const paramsString = Object.fromEntries(
      Object.entries(options.params).map(([k, v]) => [k, String(v)])
    );
    finalEndpoint = replaceUrlParams(endpoint, paramsString);
    
    // Log URL construction for debugging
    if (__DEV__ && options.params.bookingId) {
      console.log('🔗 URL Construction:');
      console.log('  - Original endpoint:', endpoint);
      console.log('  - Parameters:', paramsString);
      console.log('  - Final endpoint:', finalEndpoint);
      console.log('  - Full URL:', `${API_CONFIG.BASE_URL}${finalEndpoint}`);
    }
  }

  // Add query parameters
  if (options.query && Object.keys(options.query).length > 0) {
    const queryString = Object.entries(options.query)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    finalEndpoint += `?${queryString}`;
  }

  // Safety check
  if (!apiService || typeof apiService.request !== 'function') {
    console.error('apiService is not properly initialized:', apiService);
    return {
      success: false,
      error: 'API service is not available. Please restart the app.',
    };
  }

  return apiService.request<T>(finalEndpoint, {
    method: options.method || 'GET',
    body: options.body,
    requiresAuth: options.requiresAuth !== false,
  }) as Promise<ApiResult<T>>;
};

/**
 * Upload file to API
 */
export const uploadFile = async (
  endpoint: string,
  file: { uri: string; type: string; name: string },
  additionalData?: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> => {
  // Safety check
  if (!apiService || typeof apiService.uploadFile !== 'function') {
    console.error('apiService is not properly initialized:', apiService);
    return {
      success: false,
      error: 'API service is not available. Please restart the app.',
    };
  }
  
  return apiService.uploadFile(endpoint, file, additionalData);
};

/**
 * Auth API calls
 */
export const authApi = {
  sendOTP: (phone: string, type: 'signup' | 'login' | 'reset_password' | 'verify_phone') =>
    apiCall(API_CONFIG.ENDPOINTS.AUTH.SEND_OTP, {
      method: 'POST',
      body: { phone, type },
      requiresAuth: false,
    }),

  sendEmailOTP: (email: string, type: 'verify_email') =>
    apiCall(API_CONFIG.ENDPOINTS.AUTH.SEND_OTP, {
      method: 'POST',
      body: { email, type },
      requiresAuth: false,
    }),

  verifyOTP: (phoneOrEmail: string, otp: string, type: 'signup' | 'login' | 'reset_password' | 'verify_phone' | 'verify_email') =>
    apiCall(API_CONFIG.ENDPOINTS.AUTH.VERIFY_OTP, {
      method: 'POST',
      body: phoneOrEmail.includes('@') 
        ? { email: phoneOrEmail, otp, type }
        : { phone: phoneOrEmail, otp, type },
      requiresAuth: false,
    }),

  verifyFirebase: (phone: string, idToken: string) =>
    apiCall(API_CONFIG.ENDPOINTS.AUTH.VERIFY_FIREBASE, {
      method: 'POST',
      body: { phone, idToken },
      requiresAuth: false,
    }),

  signup: (data: {
    phone: string;
    name: string;
    userType: 'individual' | 'company';
    email?: string;
    password: string;
    confirmPassword: string;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.AUTH.SIGNUP, {
      method: 'POST',
      body: data,
      requiresAuth: false,
    }),

  refreshToken: (refreshToken: string) =>
    apiCall(API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN, {
      method: 'POST',
      body: { refreshToken },
      requiresAuth: false,
    }),

  resetPassword: (phone: string, newPassword: string) =>
    apiCall(API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD, {
      method: 'POST',
      body: { phone, newPassword },
      requiresAuth: false,
    }),
};

/**
 * User API calls
 */
export const userApi = {
  getProfile: () =>
    apiCall(API_CONFIG.ENDPOINTS.USER.PROFILE, {
      method: 'GET',
      requiresAuth: true,
    }),

  updateProfile: (data: any) =>
    apiCall(API_CONFIG.ENDPOINTS.USER.UPDATE_PROFILE, {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    }),

  uploadPhoto: (file: { uri: string; type: string; name: string }) =>
    uploadFile(API_CONFIG.ENDPOINTS.USER.UPLOAD_PHOTO, file),

  getStats: () =>
    apiCall(API_CONFIG.ENDPOINTS.USER.STATS, {
      method: 'GET',
      requiresAuth: true,
    }),

  updateLanguage: (language: 'en' | 'te' | 'hi') =>
    apiCall(API_CONFIG.ENDPOINTS.USER.LANGUAGE, {
      method: 'PUT',
      body: { language },
      requiresAuth: true,
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiCall(API_CONFIG.ENDPOINTS.USER.CHANGE_PASSWORD, {
      method: 'POST',
      body: { currentPassword, newPassword },
      requiresAuth: true,
    }),

  getNotificationPreferences: () =>
    apiCall(API_CONFIG.ENDPOINTS.USER.NOTIFICATION_PREFERENCES, {
      method: 'GET',
      requiresAuth: true,
    }),

  updateNotificationPreferences: (prefs: {
    bookingUpdates: boolean;
    messages: boolean;
    promotions: boolean;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.USER.NOTIFICATION_PREFERENCES, {
      method: 'PUT',
      body: prefs,
      requiresAuth: true,
    }),
};

export const contentApi = {
  getAll: () =>
    apiCall(API_CONFIG.ENDPOINTS.CONTENT.LIST, {
      method: 'GET',
      requiresAuth: false,
    }),
  getByKey: (key: string) =>
    apiCall(API_CONFIG.ENDPOINTS.CONTENT.GET, {
      method: 'GET',
      params: { key },
      requiresAuth: false,
    }),
};

export const masterDataApi = {
  getByType: (type: string) =>
    apiCall(API_CONFIG.ENDPOINTS.MASTER_DATA.GET_BY_TYPE, {
      method: 'GET',
      params: { type },
      requiresAuth: false,
    }),
};

/**
 * Company API calls
 */
export const companyApi = {
  register: (data: {
    userId: string;
    companyName: string;
    registrationNumber: string;
    businessType: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    contactNumber: string;
    email: string;
    username: string;
    password: string;
    gstNumber?: string;
    documents?: {
      registrationCertificate?: string;
      gstCertificate?: string;
      businessLicense?: string;
    };
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.COMPANY.REGISTER, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  getProfile: () =>
    apiCall(API_CONFIG.ENDPOINTS.COMPANY.PROFILE, {
      method: 'GET',
      requiresAuth: true,
    }),

  updateProfile: (data: any) =>
    apiCall(API_CONFIG.ENDPOINTS.COMPANY.UPDATE_PROFILE, {
      method: 'PUT',
      body: data,
      requiresAuth: true,
    }),

  uploadLogo: (file: { uri: string; type: string; name: string }) =>
    uploadFile(API_CONFIG.ENDPOINTS.COMPANY.UPLOAD_LOGO, file),

  getStats: () =>
    apiCall(API_CONFIG.ENDPOINTS.COMPANY.STATS, {
      method: 'GET',
      requiresAuth: true,
    }),

  getEarnings: (filters?: {
    startDate?: string;
    endDate?: string;
    status?: 'pending' | 'settled';
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.COMPANY.EARNINGS, {
      method: 'GET',
      query: filters,
      requiresAuth: true,
    }),

  getBookings: (filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.COMPANY.BOOKINGS, {
      method: 'GET',
      query: filters,
      requiresAuth: true,
    }),
};

/**
 * Document API calls
 */
export const documentApi = {
  verifyByNumber: (type: 'aadhaar' | 'pan' | 'driving_license', documentNumber: string, additionalData?: { dob?: string; state?: string }) =>
    apiCall(API_CONFIG.ENDPOINTS.DOCUMENT.VERIFY_BY_NUMBER, {
      method: 'POST',
      body: { type, documentNumber, ...additionalData },
    }),

  getUserDocuments: () =>
    apiCall(API_CONFIG.ENDPOINTS.DOCUMENT.USER_DOCUMENTS, {
      method: 'GET',
    }),

  checkEligibility: (serviceType: 'offering_pooling' | 'offering_rental' | 'taking_pooling' | 'taking_rental') =>
    apiCall(API_CONFIG.ENDPOINTS.DOCUMENT.CHECK_ELIGIBILITY, {
      method: 'POST',
      body: { serviceType },
    }),

  uploadDocument: (type: string, file: { uri: string; type: string; name: string }) =>
    uploadFile(API_CONFIG.ENDPOINTS.DOCUMENT.UPLOAD, file, { type }),

  deleteDocument: (documentId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.DOCUMENT.DELETE, {
      method: 'DELETE',
      params: { documentId },
      requiresAuth: true,
    }),
};

/**
 * Vehicle API calls
 */
export const vehicleApi = {
  getVehicles: () =>
    apiCall(API_CONFIG.ENDPOINTS.VEHICLE.LIST, {
      method: 'GET',
      requiresAuth: true,
    }),

  createVehicle: (data: any) =>
    apiCall(API_CONFIG.ENDPOINTS.VEHICLE.CREATE, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  updateVehicle: (vehicleId: string, data: any) =>
    apiCall(API_CONFIG.ENDPOINTS.VEHICLE.UPDATE, {
      method: 'PUT',
      params: { vehicleId },
      body: data,
      requiresAuth: true,
    }),

  getVehicle: (vehicleId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.VEHICLE.GET, {
      method: 'GET',
      params: { vehicleId },
      requiresAuth: true,
    }),

  getCompanyVehicles: (companyId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.VEHICLE.COMPANY_VEHICLES, {
      method: 'GET',
      params: { companyId },
      requiresAuth: true,
    }),
};

export const vehicleCatalogApi = {
  getFuelTypes: () =>
    apiCall(API_CONFIG.ENDPOINTS.VEHICLE.FUEL_TYPES, {
      method: 'GET',
      requiresAuth: true,
    }),

  submitRequest: (data: {
    vehicleType: 'bike' | 'scooty';
    brand: string;
    model: string;
    fuelType: string;
    transmission?: string;
    launchYear?: number;
    realWorldMileageAvg?: number;
    mileageUnit?: string;
    estimatedCostPerKmInr?: number;
    cityTier?: string;
    notes?: string;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.VEHICLE.CATALOG_REQUESTS, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),
};

/**
 * Pooling API calls
 */
export const poolingApi = {
  createOffer: (data: {
    route: {
      from: { address: string; lat: number; lng: number; city?: string; state?: string };
      to: { address: string; lat: number; lng: number; city?: string; state?: string };
      selectedRouteId?: string;
      selectedPolyline?: Array<{ lat: number; lng: number; index: number }>;
      distance?: number;
      duration?: number;
    };
    date: string;
    time: string;
    vehicleId: string;
    availableSeats: number;
    price?: number; // Optional: Legacy field
    notes?: string;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.POOLING.CREATE, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  getOffers: () =>
    apiCall(API_CONFIG.ENDPOINTS.POOLING.LIST, {
      method: 'GET',
      requiresAuth: true,
    }),

  searchOffers: (params: {
    from?: string;
    to?: string;
    date?: string;
    time?: string; // e.g. "9:00 AM" — filter within ±2 hour window
    vehicleType?: string;
    fromLat: number; // Required for polyline matching
    fromLng: number; // Required for polyline matching
    toLat: number; // Required for polyline matching
    toLng: number; // Required for polyline matching
    pinkOnly?: boolean; // Filter for HerPooling (women only)
  }) => {
    // Validate coordinates are present
    if (params.fromLat === undefined || params.fromLng === undefined || 
        params.toLat === undefined || params.toLng === undefined) {
      console.error('❌ Missing coordinates in searchOffers:', params);
      return Promise.resolve({
        success: false,
        error: 'MISSING_COORDINATES',
        message: 'Coordinates are required for searching pools',
      });
    }

    // Log coordinates being sent
    if (__DEV__) {
      console.log('📍 SearchOffers API call with coordinates:', {
        from: { lat: params.fromLat, lng: params.fromLng },
        to: { lat: params.toLat, lng: params.toLng },
        date: params.date || 'ANY',
        time: params.time || 'ANY',
      });
    }

    // Build query string with coordinates (required for polyline matching)
    const queryParams: Record<string, string> = {
      fromLat: String(params.fromLat),
      fromLng: String(params.fromLng),
      toLat: String(params.toLat),
      toLng: String(params.toLng),
    };

    // Add optional parameters
    if (params.date) {
      // Handle both Date objects and strings
      if (params.date instanceof Date) {
        queryParams.date = params.date.toISOString().split('T')[0];
      } else if (typeof params.date === 'string') {
        queryParams.date = params.date;
      }
    }
    if (params.time) {
      queryParams.time = params.time;
    }
    if (params.vehicleType) {
      queryParams.vehicleType = params.vehicleType.toLowerCase();
    }
    if (params.pinkOnly === true) {
      queryParams.pinkOnly = 'true';
    }

    return apiCall(API_CONFIG.ENDPOINTS.POOLING.SEARCH, {
      method: 'GET',
      query: queryParams,
      requiresAuth: true,
    });
  },

  getOffer: (offerId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.POOLING.GET, {
      method: 'GET',
      params: { offerId },
      requiresAuth: false,
    }),

  calculatePrice: (data: {
    offerId: string;
    passengerRoute: {
      from: { address: string; lat: number; lng: number; city?: string; state?: string };
      to: { address: string; lat: number; lng: number; city?: string; state?: string };
    };
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.POOLING.CALCULATE_PRICE, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  suggestWaypoints: (params: { fromLat: number; fromLng: number; toLat: number; toLng: number }) =>
    apiCall(API_CONFIG.ENDPOINTS.POOLING.SUGGEST_WAYPOINTS, {
      method: 'GET',
      query: params,
      requiresAuth: true,
    }),

  suggestWaypointsFromPolyline: (data: {
    selectedPolyline: Array<{ lat: number; lng: number; index: number }>;
    intervalKm?: number;
    maxPoints?: number;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.POOLING.SUGGEST_WAYPOINTS_FROM_POLYLINE, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  getRouteAlternatives: (params: {
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
    maxAlternatives?: number;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.POOLING.ROUTE_ALTERNATIVES, {
      method: 'GET',
      query: params,
      requiresAuth: true,
    }),

  validateWaypoint: (params: {
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
    waypointLat: number;
    waypointLng: number;
    existingWaypoints?: Array<{ lat: number; lng: number }>;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.POOLING.VALIDATE_WAYPOINT, {
      method: 'POST',
      body: params,
      requiresAuth: true,
    }),

  deleteOffer: (offerId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.POOLING.DELETE, {
      method: 'DELETE',
      params: { offerId },
      requiresAuth: true,
    }),

  searchConnectedOffers: (params: {
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
    date?: string;
    time?: string;
    vehicleType?: string;
    pinkOnly?: boolean;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.POOLING.CONNECTED_SEARCH, {
      method: 'GET',
      query: params,
    }),
};

/**
 * Rental API calls
 */
export const rentalApi = {
  createOffer: (data: {
    ownerType: 'individual' | 'company';
    vehicleId: string;
    location: {
      address: string;
      lat: number;
      lng: number;
      city?: string;
      state?: string;
      pincode?: string;
    };
    date: string;
    availableFrom: string;
    availableUntil: string;
    pricePerHour: number;
    minimumHours: number;
    notes?: string;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.RENTAL.CREATE, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  getOffers: () =>
    apiCall(API_CONFIG.ENDPOINTS.RENTAL.LIST, {
      method: 'GET',
      requiresAuth: true,
    }),

  searchOffers: (params: {
    location?: string;
    date?: string;
    vehicleType?: string;
    lat?: number;
    lng?: number;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.RENTAL.SEARCH, {
      method: 'GET',
      params,
      requiresAuth: true,
    }),

  getOffer: (offerId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.RENTAL.GET, {
      method: 'GET',
      params: { offerId },
      requiresAuth: false,
    }),

  calculatePrice: (data: {
    vehicleId?: string;
    vehicleType?: 'bike' | 'scooty';
    brand?: string;
    model?: string;
    year?: number;
    seats?: number;
    fuelType?: 'Petrol' | 'Diesel' | 'Electric' | 'CNG';
    transmission?: 'Manual' | 'Automatic';
    location?: {
      city?: string;
      state?: string;
    };
    date?: string;
    availableFrom?: string;
    availableUntil?: string;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.RENTAL.CALCULATE_PRICE, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  getAvailableSlots: (offerId: string, date: string) =>
    apiCall(API_CONFIG.ENDPOINTS.RENTAL.AVAILABLE_SLOTS, {
      method: 'GET',
      params: { offerId },
      query: { date },
      requiresAuth: false,
    }),

  getCompanyOffers: (companyId: string, filters?: {
    status?: string;
    date?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.RENTAL.COMPANY_OFFERS, {
      method: 'GET',
      params: { companyId },
      query: filters,
      requiresAuth: true,
    }),

  getOfferBookings: (offerId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.RENTAL.OFFER_BOOKINGS, {
      method: 'GET',
      params: { offerId },
      requiresAuth: true,
    }),
};

/**
 * Booking API calls
 */
export const bookingApi = {
  createPoolingBooking: (data: {
    poolingOfferId: string;
    paymentMethod?: 'upi' | 'card' | 'wallet' | 'net_banking';
    seatsBooked?: number;
    coPassengers?: Array<{
      name: string;
      age: number;
      gender: 'Male' | 'Female' | 'Other';
    }>;
    passengerRoute: {
      from: { address: string; lat: number; lng: number; city?: string; state?: string };
      to: { address: string; lat: number; lng: number; city?: string; state?: string };
    };
    calculatedPrice?: {
      finalPrice: number;
      platformFee: number;
      totalAmount: number;
    };
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.BOOKING.CREATE_POOLING, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  createConnectedBooking: (data: {
    leg1OfferId: string;
    leg2OfferId: string;
    leg1Route: {
      from: { address: string; lat: number; lng: number; city?: string };
      to: { address: string; lat: number; lng: number; city?: string };
    };
    leg2Route: {
      from: { address: string; lat: number; lng: number; city?: string };
      to: { address: string; lat: number; lng: number; city?: string };
    };
    connectionPoint: { address: string; lat: number; lng: number; city?: string };
    paymentMethod?: string;
    leg1Price?: { finalPrice: number; platformFee: number; totalAmount: number };
    leg2Price?: { finalPrice: number; platformFee: number; totalAmount: number };
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.BOOKING.CREATE_CONNECTED, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  createRentalBooking: (data: {
    rentalOfferId: string;
    duration?: number;
    startTime?: string; // HH:mm format
    endTime?: string; // HH:mm format
    paymentMethod?: 'upi' | 'card' | 'wallet' | 'net_banking';
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.BOOKING.CREATE_RENTAL, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  getBookings: (params?: {
    status?: string;
    serviceType?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.BOOKING.LIST, {
      method: 'GET',
      params,
      requiresAuth: true,
    }),

  getBooking: (bookingId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.BOOKING.GET, {
      method: 'GET',
      params: { bookingId: String(bookingId) },
      requiresAuth: true,
    }),

  cancelBooking: (bookingId: string, reason?: string) =>
    apiCall(API_CONFIG.ENDPOINTS.BOOKING.CANCEL, {
      method: 'PUT',
      params: { bookingId },
      body: { reason },
      requiresAuth: true,
    }),

  previewCancellationFee: (bookingId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.BOOKING.CANCEL_PREVIEW, {
      method: 'GET',
      params: { bookingId },
      requiresAuth: true,
    }),

  updateBookingStatus: (bookingId: string, status: 'in_progress' | 'completed') =>
    apiCall(API_CONFIG.ENDPOINTS.BOOKING.UPDATE_STATUS, {
      method: 'PUT',
      params: { bookingId },
      body: { status },
      requiresAuth: true,
    }),

  getDriverBookings: (query?: {
    status?: string;
    serviceType?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.BOOKING.DRIVER_BOOKINGS, {
      method: 'GET',
      query,
      requiresAuth: true,
    }),

  getBookingByOffer: (offerId: string, serviceType: 'pooling' | 'rental') =>
    apiCall(API_CONFIG.ENDPOINTS.BOOKING.BY_OFFER, {
      method: 'GET',
      params: { offerId: String(offerId) },
      query: { serviceType },
      requiresAuth: true,
    }),
  getAllBookingsByOffer: (offerId: string, serviceType: 'pooling' | 'rental') =>
    apiCall(`${API_CONFIG.ENDPOINTS.BOOKING.BY_OFFER}/all`, {
      method: 'GET',
      params: { offerId: String(offerId) },
      query: { serviceType },
      requiresAuth: true,
    }),

  markPassengerGotIn: (bookingId: string) =>
    apiCall('/api/bookings/:bookingId/passenger/got-in', {
      method: 'POST',
      params: { bookingId },
      body: {}, // Send empty body object to satisfy Fastify JSON parser
      requiresAuth: true,
    }),

  markPassengerGotOut: (bookingId: string) =>
    apiCall('/api/bookings/:bookingId/passenger/got-out', {
      method: 'POST',
      params: { bookingId },
      body: {}, // Send empty body object to satisfy Fastify JSON parser
      requiresAuth: true,
    }),

  choosePaymentMethod: (bookingId: string, paymentMethod: 'offline_cash') =>
    apiCall(API_CONFIG.ENDPOINTS.BOOKING.CHOOSE_PAYMENT, {
      method: 'POST',
      params: { bookingId },
      body: { paymentMethod },
      requiresAuth: true,
    }),

  verifyPassengerCode: (bookingId: string, passengerCode: string, paymentMethod?: string) =>
    apiCall('/api/bookings/:bookingId/end-trip', {
      method: 'POST',
      params: { bookingId },
      body: { passengerCode, ...(paymentMethod ? { paymentMethod } : {}) },
      requiresAuth: true,
    }),

  startTrip: (offerId: string, serviceType: 'pooling' | 'rental') =>
    apiCall(API_CONFIG.ENDPOINTS.BOOKING.START_TRIP, {
      method: 'POST',
      body: { offerId, serviceType },
      requiresAuth: true,
    }),

  endTrip: (offerId: string, serviceType: 'pooling' | 'rental') =>
    apiCall(API_CONFIG.ENDPOINTS.BOOKING.END_TRIP, {
      method: 'POST',
      body: { offerId, serviceType },
      requiresAuth: true,
    }),

  getTripPassengers: (offerId: string, serviceType: 'pooling' | 'rental') =>
    apiCall('/api/bookings/trip/:offerId/passengers', {
      method: 'GET',
      params: { offerId },
      query: { serviceType },
      requiresAuth: true,
    }),
};

/**
 * Tracking API calls
 */
export const trackingApi = {
  updateLocation: (data: {
    bookingId: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.TRACKING.UPDATE_LOCATION, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  getDriverLocation: (bookingId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.TRACKING.DRIVER_LOCATION, {
      method: 'GET',
      params: { bookingId },
      requiresAuth: true,
    }),

  getLocationHistory: (bookingId: string, limit?: number) =>
    apiCall(API_CONFIG.ENDPOINTS.TRACKING.LOCATION_HISTORY, {
      method: 'GET',
      params: { bookingId },
      requiresAuth: true,
    }),

  getTripMetrics: (bookingId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.TRACKING.TRIP_METRICS, {
      method: 'GET',
      params: { bookingId },
      requiresAuth: true,
    }),
};

/**
 * Admin API calls
 */
export const adminApi = {
  login: (username: string, password: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.LOGIN, {
      method: 'POST',
      body: { username, password },
      requiresAuth: false,
    }),

  getDashboardStats: () =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.DASHBOARD_STATS, {
      method: 'GET',
      requiresAuth: true,
    }),

  getUsers: (params?: {
    status?: string;
    userType?: string;
    verified?: boolean;
    page?: number;
    limit?: number;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.USERS, {
      method: 'GET',
      query: params,
      requiresAuth: true,
    }),

  getUserDetails: (userId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.USER_DETAILS, {
      method: 'GET',
      params: { userId },
      requiresAuth: true,
    }),

  verifyUser: (userId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.VERIFY_USER, {
      method: 'POST',
      params: { userId },
      requiresAuth: true,
    }),

  suspendUser: (userId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.SUSPEND_USER, {
      method: 'POST',
      params: { userId },
      requiresAuth: true,
    }),

  activateUser: (userId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.ACTIVATE_USER, {
      method: 'POST',
      params: { userId },
      requiresAuth: true,
    }),

  // Pooling management
  getPoolingOffers: (params?: { status?: string; page?: number; limit?: number }) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.POOLING_OFFERS, {
      method: 'GET',
      query: params,
      requiresAuth: true,
    }),

  approvePoolingOffer: (offerId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.POOLING_APPROVE, {
      method: 'PUT',
      params: { offerId },
      body: {},
      requiresAuth: true,
    }),

  suspendPoolingOffer: (offerId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.POOLING_SUSPEND, {
      method: 'PUT',
      params: { offerId },
      body: {},
      requiresAuth: true,
    }),

  // Rental management
  getRentalOffers: (params?: { status?: string; page?: number; limit?: number }) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.RENTAL_OFFERS, {
      method: 'GET',
      query: params,
      requiresAuth: true,
    }),

  approveRentalOffer: (offerId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.RENTAL_APPROVE, {
      method: 'PUT',
      params: { offerId },
      body: {},
      requiresAuth: true,
    }),

  suspendRentalOffer: (offerId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.RENTAL_SUSPEND, {
      method: 'PUT',
      params: { offerId },
      body: {},
      requiresAuth: true,
    }),

  // Bookings
  getBookings: (params?: { status?: string; serviceType?: string; page?: number; limit?: number }) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.BOOKINGS, {
      method: 'GET',
      query: params,
      requiresAuth: true,
    }),

  getSettings: () =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.SETTINGS, {
      method: 'GET',
      requiresAuth: true,
    }),

  updateSettings: (settings: Record<string, any>) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.SETTINGS, {
      method: 'PUT',
      body: settings,
      requiresAuth: true,
    }),

  getMyPermissions: () =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.MY_PERMISSIONS, {
      method: 'GET',
      requiresAuth: true,
    }),

  getContentPages: () =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.CONTENT_PAGES, {
      method: 'GET',
      requiresAuth: true,
    }),

  upsertContentPage: (
    key: string,
    payload: {
      title: string;
      description?: string;
      payload: Record<string, any>;
      isPublished?: boolean;
    }
  ) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.CONTENT_PAGE_UPSERT, {
      method: 'PUT',
      params: { key },
      body: payload,
      requiresAuth: true,
    }),

  getMasterData: (type: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.MASTER_DATA_LIST, {
      method: 'GET',
      params: { type },
      requiresAuth: true,
    }),

  upsertMasterDataItem: (
    type: string,
    key: string,
    payload: {
      label: string;
      value?: string;
      metadata?: Record<string, any>;
      sortOrder?: number;
      isActive?: boolean;
    }
  ) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.MASTER_DATA_ITEM, {
      method: 'PUT',
      params: { type, key },
      body: payload,
      requiresAuth: true,
    }),

  deleteMasterDataItem: (type: string, key: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.MASTER_DATA_ITEM, {
      method: 'DELETE',
      params: { type, key },
      requiresAuth: true,
    }),

  getRoles: () =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.ROLES, {
      method: 'GET',
      requiresAuth: true,
    }),

  createRole: (payload: {
    roleKey: string;
    name: string;
    description?: string;
    permissions: string[];
    isActive?: boolean;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.ROLES, {
      method: 'POST',
      body: payload,
      requiresAuth: true,
    }),

  updateRole: (
    roleKey: string,
    payload: {
      name?: string;
      description?: string;
      permissions?: string[];
      isActive?: boolean;
    }
  ) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.ROLE_DETAIL, {
      method: 'PUT',
      params: { roleKey },
      body: payload,
      requiresAuth: true,
    }),

  deleteRole: (roleKey: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.ROLE_DETAIL, {
      method: 'DELETE',
      params: { roleKey },
      requiresAuth: true,
    }),

  getAdminUsers: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.ADMINS, {
      method: 'GET',
      query: params,
      requiresAuth: true,
    }),

  createAdminUser: (payload: {
    username: string;
    email: string;
    password: string;
    name: string;
    role: string;
    permissions?: string[];
    isActive?: boolean;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.ADMINS, {
      method: 'POST',
      body: payload,
      requiresAuth: true,
    }),

  updateAdminUser: (
    adminId: string,
    payload: {
      name?: string;
      email?: string;
      role?: string;
      permissions?: string[];
      isActive?: boolean;
    }
  ) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.ADMIN_DETAIL, {
      method: 'PUT',
      params: { adminId },
      body: payload,
      requiresAuth: true,
    }),

  resetAdminUserPassword: (adminId: string, password: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.ADMIN_RESET_PASSWORD, {
      method: 'PUT',
      params: { adminId },
      body: { password },
      requiresAuth: true,
    }),

  deleteAdminUser: (adminId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.ADMIN_DETAIL, {
      method: 'DELETE',
      params: { adminId },
      requiresAuth: true,
    }),
};

/**
 * Dashboard API calls
 */
export const dashboardApi = {
  getStats: () =>
    apiCall(API_CONFIG.ENDPOINTS.DASHBOARD.STATS, {
      method: 'GET',
      requiresAuth: true,
    }),

  getAboutStats: () =>
    apiCall(API_CONFIG.ENDPOINTS.DASHBOARD.ABOUT_STATS, {
      method: 'GET',
      requiresAuth: true,
    }),

  getFinancial: () =>
    apiCall(API_CONFIG.ENDPOINTS.DASHBOARD.FINANCIAL, {
      method: 'GET',
      requiresAuth: true,
    }),

  getHomeData: (lat?: number, lng?: number) =>
    apiCall(API_CONFIG.ENDPOINTS.DASHBOARD.HOME, {
      method: 'GET',
      query: {
        ...(lat !== undefined ? { lat } : {}),
        ...(lng !== undefined ? { lng } : {}),
      },
      requiresAuth: true,
    }),
};

/**
 * Saved Places API calls
 */
export const placesApi = {
  getAll: () =>
    apiCall(API_CONFIG.ENDPOINTS.PLACES.LIST, {
      method: 'GET',
      requiresAuth: true,
    }),

  save: (data: {
    label: 'home' | 'work' | 'custom';
    customLabel?: string;
    address: string;
    lat: number;
    lng: number;
    city?: string;
    state?: string;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.PLACES.SAVE, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  delete: (placeId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.PLACES.DELETE, {
      method: 'DELETE',
      params: { placeId },
      requiresAuth: true,
    }),
};

/**
 * Food API calls
 */
export const foodApi = {
  getFoodNearby: (params: {
    lat: number;
    lng: number;
    radius?: number;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.FOOD.NEARBY, {
      method: 'GET',
      query: params,
      requiresAuth: false,
    }),

  getFoodAlongRoute: (params: {
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
    category?: 'tiffin' | 'lunch' | 'dinner' | 'breakfast' | 'snacks';
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.FOOD.ALONG_ROUTE, {
      method: 'GET',
      query: params,
      requiresAuth: false,
    }),

  getFoodByCategory: (category: 'tiffin' | 'lunch' | 'dinner' | 'breakfast' | 'snacks', params: {
    lat: number;
    lng: number;
    radius?: number;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.FOOD.BY_CATEGORY, {
      method: 'GET',
      params: { category },
      query: { lat: params.lat, lng: params.lng, radius: params.radius },
      requiresAuth: false,
    }),

  getFood: (foodId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.FOOD.GET, {
      method: 'GET',
      params: { foodId },
      requiresAuth: false,
    }),

  createOrder: (data: {
    foodId: string;
    quantity: number;
    deliveryLocation: {
      address: string;
      lat: number;
      lng: number;
      city?: string;
      state?: string;
      pincode?: string;
    };
    paymentMethod: 'upi' | 'card' | 'wallet' | 'net_banking' | 'cash';
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.FOOD.ORDER, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  getOrders: () =>
    apiCall(API_CONFIG.ENDPOINTS.FOOD.ORDERS, {
      method: 'GET',
      requiresAuth: true,
    }),

  getOrder: (orderId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.FOOD.ORDER_DETAILS, {
      method: 'GET',
      params: { orderId },
      requiresAuth: true,
    }),

  initializeSampleData: () =>
    apiCall(API_CONFIG.ENDPOINTS.FOOD.INIT_SAMPLE, {
      method: 'GET',
      requiresAuth: false,
    }),
};

/**
 * Chat API calls
 */
export const chatApi = {
  getConversations: (filters?: { type?: 'pooling' | 'rental'; isActive?: boolean; page?: number; limit?: number }) =>
    apiCall(API_CONFIG.ENDPOINTS.CHAT.CONVERSATIONS, {
      method: 'GET',
      query: filters as any,
      requiresAuth: true,
    }),

  getConversation: (conversationId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.CHAT.CONVERSATION, {
      method: 'GET',
      params: { conversationId },
      requiresAuth: true,
    }),

  getGroupConversationByOffer: (offerId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.CHAT.GROUP_CONVERSATION_BY_OFFER, {
      method: 'GET',
      params: { offerId },
      requiresAuth: true,
    }),

  getConversationByBooking: (bookingId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.CHAT.CONVERSATION_BY_BOOKING, {
      method: 'GET',
      params: { bookingId },
      requiresAuth: true,
    }),

  markConversationRead: (conversationId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.CHAT.MARK_READ, {
      method: 'PUT',
      params: { conversationId },
      requiresAuth: true,
    }),

  getMessages: (conversationId: string, filters?: { page?: number; limit?: number; before?: string }) =>
    apiCall(API_CONFIG.ENDPOINTS.CHAT.MESSAGES, {
      method: 'GET',
      params: { conversationId },
      query: filters as any,
      requiresAuth: true,
    }),

  sendMessage: (conversationId: string, data: { message: string; type?: 'text' | 'location' | 'image'; location?: { lat: number; lng: number; address?: string }; imageUrl?: string }) =>
    apiCall(API_CONFIG.ENDPOINTS.CHAT.SEND_MESSAGE, {
      method: 'POST',
      params: { conversationId },
      body: data,
      requiresAuth: true,
    }),

  shareLocation: (conversationId: string, location: { lat: number; lng: number; address?: string }) =>
    apiCall(API_CONFIG.ENDPOINTS.CHAT.SHARE_LOCATION, {
      method: 'POST',
      params: { conversationId },
      body: location,
      requiresAuth: true,
    }),

  markMessageRead: (messageId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.CHAT.MARK_MESSAGE_READ, {
      method: 'PUT',
      params: { messageId },
      requiresAuth: true,
    }),

  markMessagesRead: (conversationId: string, messageIds?: string[]) =>
    apiCall(API_CONFIG.ENDPOINTS.CHAT.MARK_MESSAGES_READ, {
      method: 'PUT',
      params: { conversationId },
      body: { messageIds },
      requiresAuth: true,
    }),

  deleteMessage: (messageId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.CHAT.DELETE_MESSAGE, {
      method: 'DELETE',
      params: { messageId },
      requiresAuth: true,
    }),
};

/**
 * Wallet API calls
 */
export const walletApi = {
  getSummary: () =>
    apiCall(API_CONFIG.ENDPOINTS.WALLET.SUMMARY, {
      method: 'GET',
      requiresAuth: true,
    }),

  canBookRide: () =>
    apiCall(API_CONFIG.ENDPOINTS.WALLET.CAN_BOOK || '/api/wallet/can-book', {
      method: 'GET',
      requiresAuth: true,
    }),

  getTransactions: (options?: { page?: number; limit?: number; type?: string }) =>
    apiCall(API_CONFIG.ENDPOINTS.WALLET.TRANSACTIONS, {
      method: 'GET',
      query: options as any,
      requiresAuth: true,
    }),

  getConfig: () =>
    apiCall(API_CONFIG.ENDPOINTS.WALLET.CONFIG, {
      method: 'GET',
      requiresAuth: false,
    }),
};

export const withdrawalApi = {
  create: (data: {
    amount: number;
    paymentMethod: 'bank' | 'upi';
    bankAccount?: {
      accountNumber: string;
      ifscCode: string;
      accountHolderName: string;
      bankName: string;
    };
    upiId?: string;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.WITHDRAWAL.CREATE, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  getMyWithdrawals: (query?: { status?: string; page?: number; limit?: number }) =>
    apiCall(API_CONFIG.ENDPOINTS.WITHDRAWAL.MY_WITHDRAWALS, {
      method: 'GET',
      query,
      requiresAuth: true,
    }),

  getById: (withdrawalId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.WITHDRAWAL.GET, {
      method: 'GET',
      params: { withdrawalId },
      requiresAuth: true,
    }),
};

export const adminWithdrawalApi = {
  getPending: (query?: { page?: number; limit?: number }) =>
    apiCall(API_CONFIG.ENDPOINTS.WITHDRAWAL.ADMIN_PENDING, {
      method: 'GET',
      query,
      requiresAuth: true,
    }),

  getApproved: (query?: { page?: number; limit?: number }) =>
    apiCall(API_CONFIG.ENDPOINTS.WITHDRAWAL.ADMIN_APPROVED, {
      method: 'GET',
      query,
      requiresAuth: true,
    }),

  approve: (withdrawalId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.WITHDRAWAL.ADMIN_APPROVE, {
      method: 'POST',
      params: { withdrawalId },
      body: {},
      requiresAuth: true,
    }),

  complete: (withdrawalId: string, payload: { transactionId: string; notes?: string }) =>
    apiCall(API_CONFIG.ENDPOINTS.WITHDRAWAL.ADMIN_COMPLETE, {
      method: 'POST',
      params: { withdrawalId },
      body: payload,
      requiresAuth: true,
    }),

  reject: (withdrawalId: string, reason: string) =>
    apiCall(API_CONFIG.ENDPOINTS.WITHDRAWAL.ADMIN_REJECT, {
      method: 'POST',
      params: { withdrawalId },
      body: { reason },
      requiresAuth: true,
    }),
};

/**
 * Block API calls
 */
export const blockApi = {
  getBlockedUsers: () =>
    apiCall(API_CONFIG.ENDPOINTS.BLOCK.LIST, {
      method: 'GET',
      requiresAuth: true,
    }),

  blockUser: (data: { 
    blockedId: string; 
    reason?: string; 
    reasonCategory?: string; 
    bookingId?: string 
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.BLOCK.BLOCK_USER, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  unblockUser: (userId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.BLOCK.UNBLOCK_USER, {
      method: 'DELETE',
      params: { userId },
      requiresAuth: true,
    }),

  checkBlocked: (userId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.BLOCK.CHECK, {
      method: 'GET',
      params: { userId },
      requiresAuth: true,
    }),
};

/**
 * Refund API calls
 */
export const refundApi = {
  getPolicy: () =>
    apiCall(API_CONFIG.ENDPOINTS.REFUND.POLICY, {
      method: 'GET',
      requiresAuth: false,
    }),

  calculateRefund: (bookingId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.REFUND.CALCULATE, {
      method: 'GET',
      params: { bookingId },
      requiresAuth: true,
    }),

  getBookingRefund: (bookingId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.REFUND.BOOKING_REFUND, {
      method: 'GET',
      params: { bookingId },
      requiresAuth: true,
    }),

  getHistory: (options?: { page?: number; limit?: number }) =>
    apiCall(API_CONFIG.ENDPOINTS.REFUND.HISTORY, {
      method: 'GET',
      query: options as any,
      requiresAuth: true,
    }),
};

/**
 * Enhanced Rating API calls
 */
export const ratingApi = {
  create: (data: {
    bookingId: string;
    ratedUserId: string;
    serviceType: 'pooling' | 'rental';
    ratingType: 'passenger_to_driver' | 'driver_to_passenger';
    overallRating: number;
    punctuality?: number;
    vehicleCondition?: number;
    driving?: number;
    behavior?: number;
    communication?: number;
    service?: number;
    comment?: string;
    tags?: string[];
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.RATING.CREATE, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  canRate: (bookingId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.RATING.CAN_RATE, {
      method: 'GET',
      params: { bookingId },
      requiresAuth: true,
    }),

  getBreakdown: (userId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.RATING.BREAKDOWN, {
      method: 'GET',
      params: { userId },
      requiresAuth: false,
    }),

  getUserRatingsDetails: (userId: string, options?: { page?: number; limit?: number; ratingType?: string }) =>
    apiCall(API_CONFIG.ENDPOINTS.RATING.USER_RATINGS_DETAILS, {
      method: 'GET',
      params: { userId },
      query: options as any,
      requiresAuth: false,
    }),

  getTags: (ratingType: 'passenger_to_driver' | 'driver_to_passenger') =>
    apiCall(API_CONFIG.ENDPOINTS.RATING.TAGS, {
      method: 'GET',
      params: { ratingType },
      requiresAuth: false,
    }),

  getBookingRating: (bookingId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.RATING.BOOKING_RATING, {
      method: 'GET',
      params: { bookingId },
      requiresAuth: false,
    }),
};

/**
 * Analytics API calls (Admin)
 */
export const analyticsApi = {
  getRealtime: () =>
    apiCall(API_CONFIG.ENDPOINTS.ANALYTICS.REALTIME, {
      method: 'GET',
      requiresAuth: true,
    }),

  getTodayStats: () =>
    apiCall(API_CONFIG.ENDPOINTS.ANALYTICS.TODAY, {
      method: 'GET',
      requiresAuth: true,
    }),

  getTrends: (period: 'week' | 'month' = 'week') =>
    apiCall(API_CONFIG.ENDPOINTS.ANALYTICS.TRENDS, {
      method: 'GET',
      query: { period },
      requiresAuth: true,
    }),

  getPoolingStats: () =>
    apiCall(API_CONFIG.ENDPOINTS.ANALYTICS.POOLING, {
      method: 'GET',
      requiresAuth: true,
    }),

  getFinancialSummary: (period: 'week' | 'month' | 'year' = 'month') =>
    apiCall(API_CONFIG.ENDPOINTS.ANALYTICS.FINANCIAL, {
      method: 'GET',
      query: { period },
      requiresAuth: true,
    }),

  getUserGrowth: () =>
    apiCall(API_CONFIG.ENDPOINTS.ANALYTICS.USERS, {
      method: 'GET',
      requiresAuth: true,
    }),

  getTopEarners: (limit: number = 10) =>
    apiCall(API_CONFIG.ENDPOINTS.ANALYTICS.LEADERBOARD_EARNERS, {
      method: 'GET',
      query: { limit },
      requiresAuth: true,
    }),

  getMostActive: (limit: number = 10) =>
    apiCall(API_CONFIG.ENDPOINTS.ANALYTICS.LEADERBOARD_ACTIVE, {
      method: 'GET',
      query: { limit },
      requiresAuth: true,
    }),

  getHighestRated: (limit: number = 10) =>
    apiCall(API_CONFIG.ENDPOINTS.ANALYTICS.LEADERBOARD_RATED, {
      method: 'GET',
      query: { limit },
      requiresAuth: true,
    }),
};

/**
 * Notification API calls
 */
export const notificationApi = {
  getNotifications: (filters?: { read?: boolean; type?: string; page?: number; limit?: number }) =>
    apiCall(API_CONFIG.ENDPOINTS.NOTIFICATION.LIST, {
      method: 'GET',
      query: filters,
      requiresAuth: true,
    }),

  markAsRead: (notificationId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.NOTIFICATION.MARK_READ, {
      method: 'PUT',
      params: { notificationId },
      body: {},
      requiresAuth: true,
    }),

  markAllAsRead: () =>
    apiCall(API_CONFIG.ENDPOINTS.NOTIFICATION.MARK_ALL_READ, {
      method: 'PUT',
      body: {},
      requiresAuth: true,
    }),

  deleteNotification: (notificationId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.NOTIFICATION.DELETE, {
      method: 'DELETE',
      params: { notificationId },
      requiresAuth: true,
    }),

  getUnreadCount: () =>
    apiCall(API_CONFIG.ENDPOINTS.NOTIFICATION.UNREAD_COUNT, {
      method: 'GET',
      requiresAuth: true,
    }),
};

// ==================
// COIN API
// ==================
export const coinApi = {
  getBalance: () =>
    apiCall(API_CONFIG.ENDPOINTS.COIN.BALANCE, {
      method: 'GET',
      requiresAuth: true,
    }),

  getTransactions: (page: number = 1, limit: number = 20) =>
    apiCall(API_CONFIG.ENDPOINTS.COIN.TRANSACTIONS, {
      method: 'GET',
      requiresAuth: true,
      body: undefined,
      params: undefined,
    }),

  getDiscountPreview: (rideAmount: number) =>
    apiCall(`${API_CONFIG.ENDPOINTS.COIN.DISCOUNT_PREVIEW}?rideAmount=${rideAmount}`, {
      method: 'GET',
      requiresAuth: true,
    }),

  redeemCoins: (bookingId: string, coinsToUse: number) =>
    apiCall(API_CONFIG.ENDPOINTS.COIN.REDEEM, {
      method: 'POST',
      body: { bookingId, coinsToUse },
      requiresAuth: true,
    }),

  getMilestones: () =>
    apiCall(API_CONFIG.ENDPOINTS.COIN.MILESTONES, {
      method: 'GET',
      requiresAuth: true,
    }),
};

// ==================
// REFERRAL API
// ==================
export const referralApi = {
  getMyCode: () =>
    apiCall(API_CONFIG.ENDPOINTS.REFERRAL.MY_CODE, {
      method: 'GET',
      requiresAuth: true,
    }),

  getStats: () =>
    apiCall(API_CONFIG.ENDPOINTS.REFERRAL.STATS, {
      method: 'GET',
      requiresAuth: true,
    }),

  validateCode: (code: string) =>
    apiCall(API_CONFIG.ENDPOINTS.REFERRAL.VALIDATE, {
      method: 'POST',
      body: { code },
    }),
};

// ==================
// PROMO API
// ==================
export const promoApi = {
  submit: (platform: 'instagram_story' | 'instagram_reel' | 'youtube_short', proofUrl: string) =>
    apiCall(API_CONFIG.ENDPOINTS.PROMO.SUBMIT, {
      method: 'POST',
      body: { platform, proofUrl },
      requiresAuth: true,
    }),

  getMySubmissions: (page: number = 1, limit: number = 20) =>
    apiCall(API_CONFIG.ENDPOINTS.PROMO.MY_SUBMISSIONS, {
      method: 'GET',
      requiresAuth: true,
    }),
};

// ==================
// SOS API
// ==================
export const sosApi = {
  trigger: (location: { lat: number; lng: number; address?: string }, bookingId?: string) =>
    apiCall('/api/sos/trigger', {
      method: 'POST',
      body: { location, bookingId },
      requiresAuth: true,
    }),
  getHistory: (page: number = 1, limit: number = 20) =>
    apiCall(`/api/sos/history?page=${page}&limit=${limit}`, {
      method: 'GET',
      requiresAuth: true,
    }),
};

// ==================
// Feedback API
// ==================
export const feedbackApi = {
  submit: (data: {
    type: 'issue' | 'suggestion' | 'complaint';
    subject: string;
    description: string;
    priority?: 'high' | 'medium' | 'low';
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.FEEDBACK.SUBMIT, {
      method: 'POST',
      body: data,
      requiresAuth: true,
    }),

  getMyFeedback: (filters?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.FEEDBACK.MY_FEEDBACK, {
      method: 'GET',
      query: filters as any,
      requiresAuth: true,
    }),

  getById: (feedbackId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.FEEDBACK.GET, {
      method: 'GET',
      params: { feedbackId },
      requiresAuth: true,
    }),
};

// ==================
// Admin Feedback API
// ==================
export const adminFeedbackApi = {
  getAll: (filters?: {
    status?: string;
    type?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.FEEDBACK_LIST, {
      method: 'GET',
      query: filters as any,
      requiresAuth: true,
    }),

  getById: (feedbackId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.FEEDBACK_DETAIL, {
      method: 'GET',
      params: { feedbackId },
      requiresAuth: true,
    }),

  updateStatus: (feedbackId: string, status: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.FEEDBACK_UPDATE_STATUS, {
      method: 'PUT',
      params: { feedbackId },
      body: { status },
      requiresAuth: true,
    }),

  respond: (feedbackId: string, response: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.FEEDBACK_RESPOND, {
      method: 'POST',
      params: { feedbackId },
      body: { response },
      requiresAuth: true,
    }),

  assign: (feedbackId: string, assigneeAdminId: string) =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.FEEDBACK_ASSIGN, {
      method: 'PUT',
      params: { feedbackId },
      body: { assigneeAdminId },
      requiresAuth: true,
    }),

  getStats: () =>
    apiCall(API_CONFIG.ENDPOINTS.ADMIN.FEEDBACK_STATS, {
      method: 'GET',
      requiresAuth: true,
    }),
};

export default apiCall;
