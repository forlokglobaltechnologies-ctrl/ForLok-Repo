/**
 * API Configuration
 * Backend API base URL and endpoints
 */

// Backend API Base URL
// For development: 
//   - Emulator/Simulator: Use http://localhost:3000 or http://10.0.2.2:3000 (Android emulator)
//   - Physical Device: Use your computer's IP address (e.g., http://192.168.1.100:3000)
//   - Find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)
// For production: Use your deployed backend URL

// Default: localhost (works for emulator/simulator)
// For physical device (Expo Go): use your computer's IP - run "ipconfig" to find it
// Current WiFi IP: 10.5.40.38 (update when you change networks)
const API_BASE_URL = __DEV__
  ? 'http://10.206.92.236:3000' // Your computer's IP for Expo physical device
  : 'https://api.yaaryatra.com'; // Production URL

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000, // 30 seconds
  ENDPOINTS: {
    // Authentication
    AUTH: {
      SEND_OTP: '/api/auth/send-otp',
      VERIFY_OTP: '/api/auth/verify-otp',
      VERIFY_FIREBASE: '/api/auth/verify-firebase',
      SIGNUP: '/api/auth/signup',
      SIGNIN: '/api/auth/signin',
      REFRESH_TOKEN: '/api/auth/refresh-token',
      RESET_PASSWORD: '/api/auth/reset-password',
    },
    // User Management
    USER: {
      PROFILE: '/api/users/profile',
      UPDATE_PROFILE: '/api/users/profile',
      UPLOAD_PHOTO: '/api/users/profile/photo',
      STATS: '/api/users/stats',
      LANGUAGE: '/api/users/language',
      CHANGE_PASSWORD: '/api/users/change-password',
      UPDATE_PHONE: '/api/users/update-phone',
      DELETE_ACCOUNT: '/api/users/account',
    },
    // Company Management
    COMPANY: {
      REGISTER: '/api/companies/register',
      PROFILE: '/api/companies/profile',
      UPDATE_PROFILE: '/api/companies/profile',
      UPLOAD_LOGO: '/api/companies/profile/logo',
      DASHBOARD: '/api/companies/dashboard',
      STATS: '/api/companies/stats',
      EARNINGS: '/api/companies/earnings',
      BOOKINGS: '/api/companies/bookings',
    },
    // Vehicle Management
    VEHICLE: {
      LIST: '/api/vehicles',
      CREATE: '/api/vehicles',
      GET: '/api/vehicles/:vehicleId',
      UPDATE: '/api/vehicles/:vehicleId',
      DELETE: '/api/vehicles/:vehicleId',
      UPLOAD_PHOTOS: '/api/vehicles/:vehicleId/photos',
      UPLOAD_DOCUMENTS: '/api/vehicles/:vehicleId/documents',
      COMPANY_VEHICLES: '/api/vehicles/company/:companyId',
    },
    // Document Management
    DOCUMENT: {
      UPLOAD: '/api/documents/upload',
      VERIFY_BY_NUMBER: '/api/documents/verify-by-number',
      USER_DOCUMENTS: '/api/documents/user-documents',
      GET: '/api/documents/:documentId',
      DELETE: '/api/documents/:documentId',
      VERIFY_AADHAAR: '/api/documents/verify-aadhaar',
      VERIFY_PAN: '/api/documents/verify-pan',
      VERIFY_LICENSE: '/api/documents/verify-license',
      REQUIRED: '/api/documents/required',
      CHECK_ELIGIBILITY: '/api/documents/check-eligibility',
    },
    // Pooling Offers
    POOLING: {
      CREATE: '/api/pooling/offers',
      LIST: '/api/pooling/offers',
      GET: '/api/pooling/offers/:offerId',
      SEARCH: '/api/pooling/offers/search',
      NEARBY: '/api/pooling/offers/nearby',
      UPDATE: '/api/pooling/offers/:offerId',
      DELETE: '/api/pooling/offers/:offerId',
      CALCULATE_PRICE: '/api/pooling/calculate-price',
    },
    // Rental Offers
    RENTAL: {
      CREATE: '/api/rental/offers',
      LIST: '/api/rental/offers',
      GET: '/api/rental/offers/:offerId',
      SEARCH: '/api/rental/offers/search',
      NEARBY: '/api/rental/offers/nearby',
      AVAILABILITY: '/api/rental/offers/:offerId/availability',
      AVAILABLE_SLOTS: '/api/rental/offers/:offerId/available-slots',
      UPDATE: '/api/rental/offers/:offerId',
      DELETE: '/api/rental/offers/:offerId',
      CALCULATE_PRICE: '/api/rental/offers/calculate-price',
      COMPANY_OFFERS: '/api/rental/offers/company/:companyId',
      OFFER_BOOKINGS: '/api/rental/offers/:offerId/bookings',
    },
    // Bookings
    BOOKING: {
      CREATE_POOLING: '/api/bookings/pooling',
      CREATE_RENTAL: '/api/bookings/rental',
      LIST: '/api/bookings',
      GET: '/api/bookings/:bookingId',
      CANCEL: '/api/bookings/:bookingId/cancel',
      UPDATE_STATUS: '/api/bookings/:bookingId/status',
      DRIVER_BOOKINGS: '/api/bookings/driver',
      BY_OFFER: '/api/bookings/by-offer/:offerId',
      HISTORY: '/api/bookings/history',
      UPCOMING: '/api/bookings/upcoming',
      PAST: '/api/bookings/past',
      CANCELLED: '/api/bookings/cancelled',
      TRIP_PASSENGERS: '/api/bookings/trip/:offerId/passengers',
      START_TRIP: '/api/bookings/start-trip',
      END_TRIP: '/api/bookings/end-trip',
    },
    // Payments
    PAYMENT: {
      CREATE: '/api/payments/create',
      VERIFY: '/api/payments/verify',
      GET: '/api/payments/:paymentId',
      LIST: '/api/payments',
      REFUND: '/api/payments/:paymentId/refund',
      METHODS: '/api/payments/methods',
      WEBHOOK: '/api/payments/webhook',
    },
    // Food
    FOOD: {
      SAMPLE_DATA: '/api/food/sample-data',
      BY_CATEGORY: '/api/food/category/:category',
      NEARBY: '/api/food/nearby',
      ALONG_ROUTE: '/api/food/along-route',
      GET: '/api/food/:foodId',
      ORDER: '/api/food/order',
      ORDERS: '/api/food/orders',
      ORDER_DETAILS: '/api/food/orders/:orderId',
    },
    // Ratings
    RATING: {
      CREATE: '/api/ratings',
      GET: '/api/ratings/:ratingId',
      USER_RATINGS: '/api/ratings/user/:userId',
      BOOKING_RATING: '/api/ratings/booking/:bookingId',
      UPDATE: '/api/ratings/:ratingId',
      DELETE: '/api/ratings/:ratingId',
    },
    // Notifications
    NOTIFICATION: {
      LIST: '/api/notifications',
      MARK_READ: '/api/notifications/:notificationId/read',
      MARK_ALL_READ: '/api/notifications/read-all',
      DELETE: '/api/notifications/:notificationId',
      UNREAD_COUNT: '/api/notifications/unread-count',
    },
    // Feedback
    FEEDBACK: {
      SUBMIT: '/api/feedback',
      MY_FEEDBACK: '/api/feedback/my-feedback',
      GET: '/api/feedback/:feedbackId',
    },
    // Admin
    ADMIN: {
      LOGIN: '/api/admin/auth/login',
      DASHBOARD_STATS: '/api/admin/dashboard/stats',
      USERS: '/api/admin/users',
      USER_DETAILS: '/api/admin/users/:userId',
      VERIFY_USER: '/api/admin/users/:userId/verify',
      SUSPEND_USER: '/api/admin/users/:userId/suspend',
      ACTIVATE_USER: '/api/admin/users/:userId/activate',
    },
    // Tracking
    TRACKING: {
      UPDATE_LOCATION: '/api/tracking/update-location',
      DRIVER_LOCATION: '/api/tracking/driver-location/:bookingId',
      LOCATION_HISTORY: '/api/tracking/location-history/:bookingId',
      TRIP_METRICS: '/api/tracking/trip-metrics/:bookingId',
    },
    // Dashboard
    DASHBOARD: {
      STATS: '/api/dashboard/stats',
      FINANCIAL: '/api/dashboard/financial',
    },
    // Chat
    CHAT: {
      CONVERSATIONS: '/api/chat/conversations',
      CONVERSATION: '/api/chat/conversations/:conversationId',
      GROUP_CONVERSATION_BY_OFFER: '/api/chat/conversations/offer/:offerId/group',
      CONVERSATION_BY_BOOKING: '/api/chat/conversations/booking/:bookingId',
      MARK_READ: '/api/chat/conversations/:conversationId/read',
      MESSAGES: '/api/chat/conversations/:conversationId/messages',
      SEND_MESSAGE: '/api/chat/conversations/:conversationId/messages',
      SHARE_LOCATION: '/api/chat/conversations/:conversationId/share-location',
      MARK_MESSAGE_READ: '/api/chat/messages/:messageId/read',
      MARK_MESSAGES_READ: '/api/chat/conversations/:conversationId/messages/read',
      DELETE_MESSAGE: '/api/chat/messages/:messageId',
    },
  },
};

/**
 * Get full API URL
 */
export const getApiUrl = (endpoint: string): string => {
  // Replace :param with actual values
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

/**
 * Replace URL parameters
 * Example: replaceUrlParams('/api/users/:userId', { userId: '123' })
 * Returns: '/api/users/123'
 * 
 * Note: URL-encodes parameter values to handle special characters like #, &, etc.
 */
export const replaceUrlParams = (url: string, params: Record<string, string>): string => {
  let result = url;
  Object.keys(params).forEach((key) => {
    // URL-encode the parameter value to handle special characters like #, &, etc.
    const encodedValue = encodeURIComponent(params[key]);
    result = result.replace(`:${key}`, encodedValue);
  });
  return result;
};

export default API_CONFIG;
