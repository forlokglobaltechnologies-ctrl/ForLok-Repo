/**
 * API Configuration
 * Backend API base URL and endpoints
 *
 * Backend target is currently forced to development URL.
 */

const DEV_API_URL = 'http://172.22.211.16:3000';
const PROD_API_URL = 'https://forlok-repo-1.onrender.com';

const API_BASE_URL = PROD_API_URL;

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 60000,
  ENDPOINTS: {
    // Authentication
    AUTH: {
      SEND_OTP: '/api/auth/send-otp',
      VERIFY_OTP: '/api/auth/verify-otp',
      VERIFY_FIREBASE: '/api/auth/verify-firebase',
      SIGNUP: '/api/auth/signup',
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
      NOTIFICATION_PREFERENCES: '/api/users/preferences/notifications',
      UPDATE_PHONE: '/api/users/update-phone',
      DELETE_ACCOUNT: '/api/users/account',
    },
    CONTENT: {
      LIST: '/api/content',
      GET: '/api/content/:key',
    },
    MASTER_DATA: {
      GET_BY_TYPE: '/api/master-data/:type',
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
      CATALOG_REQUESTS: '/api/vehicles/catalog-requests',
      FUEL_TYPES: '/api/vehicles/catalog/fuel-types',
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
      SUGGEST_WAYPOINTS: '/api/pooling/suggest-waypoints',
      SUGGEST_WAYPOINTS_FROM_POLYLINE: '/api/pooling/suggest-waypoints-from-polyline',
      VALIDATE_WAYPOINT: '/api/pooling/validate-waypoint',
      ROUTE_ALTERNATIVES: '/api/pooling/routes/alternatives',
      CONNECTED_SEARCH: '/api/pooling/offers/connected-search',
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
      CREATE_CONNECTED: '/api/bookings/connected',
      CREATE_RENTAL: '/api/bookings/rental',
      LIST: '/api/bookings',
      GET: '/api/bookings/:bookingId',
      CANCEL: '/api/bookings/:bookingId/cancel',
      CANCEL_PREVIEW: '/api/bookings/:bookingId/cancel-preview',
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
      CHOOSE_PAYMENT: '/api/bookings/:bookingId/choose-payment',
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
      USER_RATINGS_DETAILS: '/api/ratings/user/:userId/details',
      BOOKING_RATING: '/api/ratings/booking/:bookingId',
      UPDATE: '/api/ratings/:ratingId',
      DELETE: '/api/ratings/:ratingId',
      CAN_RATE: '/api/ratings/can-rate/:bookingId',
      BREAKDOWN: '/api/ratings/breakdown/:userId',
      TAGS: '/api/ratings/tags/:ratingType',
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
      // Users
      USERS: '/api/admin/users',
      USER_DETAILS: '/api/admin/users/:userId',
      VERIFY_USER: '/api/admin/users/:userId/verify',
      SUSPEND_USER: '/api/admin/users/:userId/suspend',
      ACTIVATE_USER: '/api/admin/users/:userId/activate',
      // Pooling
      POOLING_OFFERS: '/api/admin/pooling/offers',
      POOLING_APPROVE: '/api/admin/pooling/offers/:offerId/approve',
      POOLING_SUSPEND: '/api/admin/pooling/offers/:offerId/suspend',
      // Rental
      RENTAL_OFFERS: '/api/admin/rental/offers',
      RENTAL_APPROVE: '/api/admin/rental/offers/:offerId/approve',
      RENTAL_SUSPEND: '/api/admin/rental/offers/:offerId/suspend',
      // Bookings
      BOOKINGS: '/api/admin/bookings',
      // Feedback
      FEEDBACK_LIST: '/api/admin/feedback',
      FEEDBACK_DETAIL: '/api/admin/feedback/:feedbackId',
      FEEDBACK_UPDATE_STATUS: '/api/admin/feedback/:feedbackId/status',
      FEEDBACK_RESPOND: '/api/admin/feedback/:feedbackId/respond',
      FEEDBACK_STATS: '/api/admin/feedback/stats',
      FEEDBACK_ASSIGN: '/api/admin/feedback/:feedbackId/assign',
      SETTINGS: '/api/admin/settings',
      MY_PERMISSIONS: '/api/admin/me/permissions',
      CONTENT_PAGES: '/api/admin/content-pages',
      CONTENT_PAGE_UPSERT: '/api/admin/content-pages/:key',
      MASTER_DATA_LIST: '/api/admin/master-data/:type',
      MASTER_DATA_ITEM: '/api/admin/master-data/:type/:key',
      VEHICLE_CATALOG_REQUESTS: '/api/admin/vehicle-catalog-requests',
      VEHICLE_CATALOG_REVIEW: '/api/admin/vehicle-catalog-requests/:requestId/review',
      ROLES: '/api/admin/roles',
      ROLE_DETAIL: '/api/admin/roles/:roleKey',
      ADMINS: '/api/admin/admins',
      ADMIN_DETAIL: '/api/admin/admins/:adminId',
      ADMIN_RESET_PASSWORD: '/api/admin/admins/:adminId/reset-password',
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
      HOME: '/api/dashboard/home',
      ABOUT_STATS: '/api/dashboard/about-stats',
    },
    // Saved Places
    PLACES: {
      LIST: '/api/places',
      SAVE: '/api/places',
      DELETE: '/api/places/:placeId',
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
    // Wallet
    WALLET: {
      SUMMARY: '/api/wallet/summary',
      CAN_BOOK: '/api/wallet/can-book',
      CAN_BOOK_OFFLINE: '/api/wallet/can-book-offline',
      TOP_UP: '/api/wallet/top-up',
      TRANSACTIONS: '/api/wallet/transactions',
      CONFIG: '/api/wallet/config',
    },
    WITHDRAWAL: {
      CREATE: '/api/withdrawals/create',
      MY_WITHDRAWALS: '/api/withdrawals/my-withdrawals',
      GET: '/api/withdrawals/:withdrawalId',
      ADMIN_PENDING: '/api/withdrawals/admin/pending',
      ADMIN_APPROVED: '/api/withdrawals/admin/approved',
      ADMIN_APPROVE: '/api/withdrawals/admin/:withdrawalId/approve',
      ADMIN_COMPLETE: '/api/withdrawals/admin/:withdrawalId/complete',
      ADMIN_REJECT: '/api/withdrawals/admin/:withdrawalId/reject',
    },
    PAYMENT: {
      WALLET_TOP_UP: '/api/payments/wallet/top-up',
      VERIFY: '/api/payments/verify',
      SIMULATE_TEST: '/api/payments/simulate-test',
    },
    // Block Users
    BLOCK: {
      LIST: '/api/blocks',
      BLOCK_USER: '/api/blocks',
      UNBLOCK_USER: '/api/blocks/:userId',
      CHECK: '/api/blocks/check/:userId',
    },
    // Refund
    REFUND: {
      POLICY: '/api/refunds/policy',
      CALCULATE: '/api/refunds/calculate/:bookingId',
      BOOKING_REFUND: '/api/refunds/booking/:bookingId',
      HISTORY: '/api/refunds/history',
    },
    // Coins
    COIN: {
      BALANCE: '/api/coins/balance',
      TRANSACTIONS: '/api/coins/transactions',
      DISCOUNT_PREVIEW: '/api/coins/discount-preview',
      REDEEM: '/api/coins/redeem',
      MILESTONES: '/api/coins/milestones',
    },
    // Referrals
    REFERRAL: {
      MY_CODE: '/api/referrals/my-code',
      STATS: '/api/referrals/stats',
      VALIDATE: '/api/referrals/validate',
    },
    // Promotions
    PROMO: {
      SUBMIT: '/api/promos/submit',
      MY_SUBMISSIONS: '/api/promos/my-submissions',
    },
    // Admin Analytics
    ANALYTICS: {
      REALTIME: '/api/admin/analytics/realtime',
      TODAY: '/api/admin/analytics/today',
      TRENDS: '/api/admin/analytics/trends',
      POOLING: '/api/admin/analytics/pooling',
      FINANCIAL: '/api/admin/analytics/financial',
      USERS: '/api/admin/analytics/users',
      LEADERBOARD_EARNERS: '/api/admin/analytics/leaderboards/earners',
      LEADERBOARD_ACTIVE: '/api/admin/analytics/leaderboards/active',
      LEADERBOARD_RATED: '/api/admin/analytics/leaderboards/rated',
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