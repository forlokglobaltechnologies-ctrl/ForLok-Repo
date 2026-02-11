# YAARYATRA Codebase Analysis

**Generated:** February 4, 2026  
**Project:** YAARYATRA - Ride Sharing & Vehicle Rental Platform  
**Analysis Scope:** Complete codebase (Backend + Mobile App)

---

## Executive Summary

YAARYATRA is a comprehensive ride-sharing and vehicle rental platform built with a modern tech stack. The project consists of:

- **Backend**: Fastify-based Node.js API with MongoDB
- **Mobile App**: React Native with Expo
- **Architecture**: RESTful API with WebSocket support for real-time features
- **Status**: Production-ready with comprehensive feature set

---

## 1. Project Structure

### 1.1 Directory Organization

```
FORLOK/
├── backend/              # Node.js/Fastify backend
│   ├── src/
│   │   ├── config/      # Configuration files
│   │   ├── models/      # MongoDB/Mongoose models (20 models)
│   │   ├── routes/      # API route handlers (17 route modules)
│   │   ├── services/    # Business logic services (25+ services)
│   │   ├── middleware/   # Auth, validation, error handling
│   │   ├── utils/        # Helper functions
│   │   └── types/        # TypeScript type definitions
│   └── package.json
│
├── mobile-app/           # React Native/Expo mobile app
│   ├── src/
│   │   ├── screens/     # Screen components (40+ screens)
│   │   ├── components/  # Reusable components
│   │   ├── services/    # API & WebSocket services
│   │   ├── context/     # React Context providers
│   │   ├── config/      # API configuration
│   │   ├── locales/     # i18n translations (en, te, hi)
│   │   └── utils/       # Utility functions
│   └── package.json
│
└── Documentation files (README.md, WORKFLOW.md, etc.)
```

### 1.2 Technology Stack

#### Backend
- **Framework**: Fastify 4.24.3
- **Runtime**: Node.js (TypeScript)
- **Database**: MongoDB Atlas (Mongoose 8.0.3)
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **File Storage**: Cloudinary 1.41.0
- **Payment**: Razorpay 2.9.2
- **Real-time**: WebSocket (@fastify/websocket 8.3.0)
- **Validation**: Zod 3.22.4
- **Logging**: Winston 3.11.0
- **Email**: Nodemailer 7.0.12
- **OTP**: Firebase Admin SDK 12.0.0

#### Mobile App
- **Framework**: React Native 0.81.5 with Expo ~54.0.27
- **Navigation**: React Navigation 7.x (Stack + Tab)
- **State Management**: React Context API
- **i18n**: react-i18next 13.5.0 (English, Telugu, Hindi)
- **Maps**: Expo Location 19.0.8
- **Storage**: AsyncStorage, SecureStore
- **Notifications**: Expo Notifications 0.32.14
- **UI**: Custom components + Expo Vector Icons

---

## 2. Backend Architecture

### 2.1 Core Components

#### Models (20 Total)
- **User**: Individual and company users with ratings, earnings tracking
- **Company**: Business accounts with fleet management
- **Vehicle**: Vehicle registration and management
- **PoolingOffer**: Ride-sharing offers with route, pricing, seats
- **RentalOffer**: Vehicle rental offers with availability windows
- **Booking**: Unified booking model for pooling and rental
- **Payment**: Payment transactions with Razorpay integration
- **Document**: Document upload and verification
- **Rating**: User ratings and reviews
- **Notification**: In-app notifications
- **Conversation/Message**: Chat system
- **Tracking**: Trip location tracking
- **Food/FoodOrder**: Food booking along routes
- **Feedback**: User feedback management
- **Admin**: Admin account management
- **OTPVerification**: OTP verification records

#### Services (25+ Services)
- `auth.service.ts`: Authentication, registration, JWT management
- `booking.service.ts`: Booking creation, management, status updates
- `payment.service.ts`: Razorpay integration, payment verification
- `pooling.service.ts`: Pooling offer management, search, pricing
- `rental.service.ts`: Rental offer management, availability
- `document.service.ts`: Document upload, verification (IDfy integration)
- `tracking.service.ts`: Real-time location tracking
- `notification.service.ts`: Push notifications
- `chat.service.ts`: WebSocket chat implementation
- `tripScheduler.service.ts`: Automated trip start/end scheduling
- `price-calculation.service.ts`: Dynamic pricing algorithms
- And more...

#### Routes (17 Route Modules)
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management
- `/api/companies/*` - Company management
- `/api/vehicles/*` - Vehicle CRUD
- `/api/pooling/*` - Pooling offers
- `/api/rental/*` - Rental offers
- `/api/bookings/*` - Booking management
- `/api/payments/*` - Payment processing
- `/api/documents/*` - Document management
- `/api/tracking/*` - Location tracking
- `/api/chat/*` - Chat/messaging
- `/api/notifications/*` - Notifications
- `/api/ratings/*` - Ratings and reviews
- `/api/feedback/*` - Feedback system
- `/api/food/*` - Food booking
- `/api/admin/*` - Admin panel
- `/api/dashboard/*` - Dashboard stats

### 2.2 Authentication & Authorization

**Implementation:**
- JWT-based authentication with access + refresh tokens
- Token expiration: 7 days (access), 30 days (refresh)
- Password hashing with bcrypt (salt rounds: 10)
- Role-based access control (individual, company, admin)
- Middleware: `authenticate`, `requireUserType`, `requireAdmin`

**Security Features:**
- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- Input validation with Zod schemas
- Password strength requirements (8+ chars, uppercase, number)
- Secure token storage in mobile app (SecureStore)

### 2.3 Database Design

**MongoDB Atlas Connection:**
- Singleton pattern for database connection
- Connection pooling and timeout handling
- Automatic reconnection on disconnect
- Indexes on frequently queried fields

**Key Indexes:**
- Users: `phone`, `email`, `userId` (unique)
- Bookings: `userId`, `status`, `date`, `bookingId`
- Offers: `from`, `to`, `date`, `status`, `userId`
- Documents: `userId`, `type`, `status`

**Data Relationships:**
- User → Bookings (one-to-many)
- User → Vehicles (one-to-many)
- Company → Vehicles (one-to-many)
- Offer → Bookings (one-to-many)
- Booking → Payment (one-to-one)
- User → Documents (one-to-many)

### 2.4 Payment Processing

**Razorpay Integration:**
- Payment order creation
- Signature verification (HMAC SHA-256)
- Webhook handling for payment status updates
- Support for: UPI, Cards, Wallets, Net Banking, Offline Cash

**Payment Flow:**
1. Create payment order → Get Razorpay order ID
2. User completes payment in Razorpay checkout
3. Verify payment signature
4. Update booking status to "confirmed"
5. Handle webhooks for async updates

**Settlement System:**
- Online payments: Driver receives (amount - platform fee) via inflow
- Offline payments: Driver owes platform fee via outflow
- Settlement status tracking: pending → driver_requested → admin_approved → settled

### 2.5 Real-time Features

**WebSocket Implementation:**
- Fastify WebSocket plugin
- Chat system: Real-time messaging between users
- Location tracking: Periodic updates every 5 seconds
- Connection management: Authentication, reconnection handling

**Location Tracking:**
- GPS updates every 5 seconds or 10 meters
- Reverse geocoding for addresses
- Location history stored in TripLocation model
- ETA calculation based on current location

---

## 3. Mobile App Architecture

### 3.1 Screen Structure (40+ Screens)

**Authentication Flow:**
- `SplashScreen` → `OnboardingScreen` → `SignInScreen` / `SignUpScreen`
- `UserTypeSelectionScreen` → `IndividualRegistrationScreen` / `CompanyRegistrationScreen`
- `DocumentVerificationScreen` → `VerificationPendingScreen`

**Main Features:**
- `MainDashboardScreen`: Home screen with service options
- `SearchPoolingScreen` / `SearchRentalScreen`: Service search
- `CreatePoolingOfferScreen` / `CreateRentalOfferScreen`: Offer creation
- `PoolingDetailsScreen` / `RentalDetailsScreen`: Offer details
- `PaymentScreen`: Payment processing
- `TripTrackingScreen` / `DriverTripScreen`: Real-time tracking
- `ChatScreen`: In-app messaging
- `ProfileScreen` / `SettingsScreen`: User management

**Admin Screens:**
- `AdminDashboardScreen`: Analytics and stats
- `UserManagementScreen`: User oversight
- `PoolingManagementScreen` / `RentalManagementScreen`: Offer management
- `FeedbackManagementScreen`: Feedback handling
- `RidesHistoryScreen`: Transaction history

### 3.2 State Management

**React Context Providers:**
- `LanguageContext`: i18n language state
- `ThemeContext`: UI theme (including Pink Pooling mode)

**API Service:**
- Centralized `api.service.ts` with token management
- Automatic token refresh on 401 errors
- Token storage in AsyncStorage
- Request/response interceptors

**WebSocket Service:**
- Connection management
- Message queuing for offline support
- Reconnection logic
- Event handlers for chat and notifications

### 3.3 Internationalization

**Supported Languages:**
- English (en)
- Telugu (te)
- Hindi (hi) - planned

**Implementation:**
- react-i18next for translations
- Language preference stored in AsyncStorage + backend
- Instant language switching without app restart
- Translation files: `locales/en.json`, `locales/te.json`, `locales/hi.json`

### 3.4 Key Features

**Pink Pooling (Women-Only Pooling):**
- Gender verification at backend
- Pink-themed UI when active
- Exclusive access for female users
- Splash screen with Lottie animation

**Document Verification:**
- Contextual document collection (only when needed)
- Camera/gallery image picker
- Document status tracking
- Admin verification workflow

**Food Booking:**
- Route-based restaurant discovery
- Time-based filtering (Tiffin, Lunch, Dinner)
- Direct call integration
- Location grouping along route

---

## 4. API Endpoints Summary

### 4.1 Authentication (`/api/auth/*`)
- `POST /send-otp` - Send OTP via SMS/Email
- `POST /verify-otp` - Verify OTP
- `POST /verify-firebase` - Firebase phone auth
- `POST /signup` - User registration
- `POST /signin` - User login
- `POST /refresh-token` - Refresh JWT token
- `POST /reset-password` - Password reset

### 4.2 Pooling (`/api/pooling/*`)
- `POST /offers` - Create pooling offer
- `GET /offers` - List offers with filters
- `GET /offers/:offerId` - Get offer details
- `GET /offers/search` - Search offers
- `GET /offers/nearby` - Find nearby offers
- `POST /calculate-price` - Calculate pricing

### 4.3 Rental (`/api/rental/*`)
- `POST /offers` - Create rental offer
- `GET /offers` - List rental offers
- `GET /offers/:offerId/availability` - Check availability
- `GET /offers/:offerId/available-slots` - Get time slots
- `POST /offers/calculate-price` - Calculate rental price

### 4.4 Bookings (`/api/bookings/*`)
- `POST /pooling` - Create pooling booking
- `POST /rental` - Create rental booking
- `GET /` - List user bookings
- `GET /:bookingId` - Get booking details
- `POST /:bookingId/cancel` - Cancel booking
- `PUT /:bookingId/status` - Update status
- `POST /start-trip` - Start trip (driver)
- `POST /end-trip` - End trip (driver)

### 4.5 Payments (`/api/payments/*`)
- `POST /create` - Create payment order
- `POST /verify` - Verify payment
- `GET /:paymentId` - Get payment details
- `GET /` - List payments
- `POST /:paymentId/refund` - Process refund
- `POST /webhook` - Razorpay webhook handler

### 4.6 Tracking (`/api/tracking/*`)
- `POST /update-location` - Update driver location
- `GET /driver-location/:bookingId` - Get driver location
- `GET /location-history/:bookingId` - Get location history
- `GET /trip-metrics/:bookingId` - Get trip statistics

### 4.7 Chat (`/api/chat/*`)
- `GET /conversations` - List conversations
- `GET /conversations/:conversationId` - Get conversation
- `GET /conversations/:conversationId/messages` - Get messages
- `POST /conversations/:conversationId/messages` - Send message
- `POST /conversations/:conversationId/share-location` - Share location

**Total Endpoints:** 100+ API endpoints

---

## 5. Code Quality & Best Practices

### 5.1 Strengths

✅ **TypeScript**: Full TypeScript implementation with strict mode  
✅ **Modular Architecture**: Clear separation of concerns (routes, services, models)  
✅ **Error Handling**: Comprehensive error middleware with custom error classes  
✅ **Validation**: Zod schemas for request validation  
✅ **Logging**: Winston logger with structured logging  
✅ **Security**: Helmet, CORS, rate limiting, password hashing  
✅ **Documentation**: Extensive inline comments and README files  
✅ **Code Organization**: Consistent file structure and naming conventions  
✅ **Environment Configuration**: Centralized config with validation  
✅ **Database Indexing**: Proper indexes on frequently queried fields  

### 5.2 Areas for Improvement

⚠️ **Testing**: No test files found (`.test.ts`, `.spec.ts`)  
⚠️ **API Versioning**: No version prefix (`/api/v1/`) - may cause breaking changes  
⚠️ **Error Messages**: Some error messages could be more user-friendly  
⚠️ **Code Duplication**: Some repeated logic in services could be extracted  
⚠️ **Type Safety**: Some `any` types used (should use proper interfaces)  
⚠️ **Environment Variables**: `.env` file contains sensitive data (should use `.env.example`)  
⚠️ **Database Migrations**: No migration system for schema changes  
⚠️ **API Documentation**: No OpenAPI/Swagger documentation  
⚠️ **Caching**: No caching layer (Redis) for frequently accessed data  
⚠️ **Monitoring**: No APM or error tracking (Sentry, etc.)  

### 5.3 Security Considerations

**Good Practices:**
- Password hashing with bcrypt
- JWT token expiration
- CORS configuration
- Helmet security headers
- Rate limiting
- Input validation

**Recommendations:**
- Add API rate limiting per user (not just global)
- Implement request ID tracking for debugging
- Add security audit logging
- Consider adding 2FA for admin accounts
- Implement password complexity requirements
- Add brute-force protection for login endpoints
- Use environment variables for all secrets (not hardcoded)

---

## 6. Feature Completeness

### 6.1 Core Features ✅

- ✅ User Authentication (Phone OTP, Email, Firebase)
- ✅ User Registration (Individual & Company)
- ✅ Document Verification (Contextual collection)
- ✅ Pooling Offers (Create, Search, Book)
- ✅ Rental Offers (Create, Search, Book)
- ✅ Payment Integration (Razorpay)
- ✅ Real-time Tracking (GPS, WebSocket)
- ✅ In-app Chat (WebSocket)
- ✅ Ratings & Reviews
- ✅ Notifications (Push, In-app)
- ✅ Admin Dashboard
- ✅ Multi-language Support (English, Telugu)
- ✅ Pink Pooling (Women-only feature)
- ✅ Food Booking Along Route

### 6.2 Advanced Features ✅

- ✅ Dynamic Pricing Calculation
- ✅ Settlement System (Online/Offline payments)
- ✅ Trip Scheduler (Auto-start/end trips)
- ✅ Location History
- ✅ Booking History with Filters
- ✅ Company Fleet Management
- ✅ Document Verification (IDfy integration)
- ✅ Feedback System
- ✅ Emergency Contacts
- ✅ SOS Features

### 6.3 Missing/Incomplete Features

- ❌ Unit Tests
- ❌ Integration Tests
- ❌ E2E Tests
- ❌ API Documentation (Swagger/OpenAPI)
- ❌ Email Templates (currently basic)
- ❌ SMS Service Integration (Firebase only)
- ❌ Analytics Dashboard (basic stats only)
- ❌ Export Reports (CSV/PDF)
- ❌ Push Notification Scheduling
- ❌ Offline Mode Support

---

## 7. Performance Considerations

### 7.1 Backend

**Current:**
- MongoDB indexes on key fields
- Connection pooling
- Efficient query patterns

**Recommendations:**
- Add Redis caching for frequently accessed data
- Implement pagination for all list endpoints (some missing)
- Add database query optimization (use `.lean()` where appropriate)
- Implement background job queue (Bull/BullMQ) for heavy tasks
- Add CDN for static assets (Cloudinary already used)
- Consider read replicas for MongoDB

### 7.2 Mobile App

**Current:**
- Image optimization via Cloudinary
- Lazy loading in some screens
- Efficient state management

**Recommendations:**
- Implement image caching
- Add request debouncing for search
- Optimize re-renders with React.memo
- Implement virtualized lists for long lists
- Add offline data caching
- Optimize bundle size (code splitting)

---

## 8. Deployment & Configuration

### 8.1 Environment Variables

**Backend (.env):**
- Server: PORT, NODE_ENV, API_BASE_URL, FRONTEND_URL
- Database: MONGODB_URI, MONGODB_DB_NAME
- JWT: JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET
- Firebase: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
- Cloudinary: CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET
- Razorpay: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
- Email: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD
- Admin: ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL

**Mobile App:**
- API_BASE_URL configured in `src/config/api.ts`
- Currently: `http://10.106.51.16:3000` (dev) / `https://api.yaaryatra.com` (prod)

### 8.2 Deployment Readiness

**Backend:**
- ✅ Production-ready structure
- ✅ Environment configuration
- ✅ Error handling
- ✅ Logging
- ⚠️ Missing: Health check endpoints (only `/health` basic)
- ⚠️ Missing: Graceful shutdown handling (partially implemented)

**Mobile App:**
- ✅ Expo configuration
- ✅ Production build ready
- ⚠️ Missing: App Store/Play Store configuration
- ⚠️ Missing: Push notification certificates

---

## 9. Recommendations

### 9.1 Immediate Priorities

1. **Add Testing**
   - Unit tests for services
   - Integration tests for API endpoints
   - E2E tests for critical flows

2. **API Documentation**
   - Add Swagger/OpenAPI documentation
   - Document all endpoints with examples

3. **Error Handling**
   - Standardize error responses
   - Add error codes for client handling
   - Improve user-friendly error messages

4. **Security Hardening**
   - Remove sensitive data from `.env` (use `.env.example`)
   - Add request ID tracking
   - Implement per-user rate limiting
   - Add security audit logging

### 9.2 Short-term Improvements

1. **Performance**
   - Add Redis caching
   - Implement pagination everywhere
   - Optimize database queries

2. **Monitoring**
   - Add APM (Application Performance Monitoring)
   - Error tracking (Sentry)
   - Log aggregation (ELK stack or similar)

3. **Code Quality**
   - Remove `any` types
   - Extract duplicated code
   - Add JSDoc comments

### 9.3 Long-term Enhancements

1. **Scalability**
   - Microservices architecture (if needed)
   - Load balancing
   - Database sharding

2. **Features**
   - Advanced analytics
   - Machine learning for pricing
   - Social features
   - Loyalty program

---

## 10. Conclusion

**Overall Assessment:** ⭐⭐⭐⭐ (4/5)

YAARYATRA is a **well-architected, feature-rich platform** with:

✅ **Strengths:**
- Comprehensive feature set
- Modern tech stack
- Clean code structure
- Good security practices
- Real-time capabilities
- Multi-language support

⚠️ **Areas for Growth:**
- Testing coverage
- API documentation
- Performance optimization
- Monitoring and observability

**Recommendation:** The codebase is **production-ready** but would benefit from adding tests, documentation, and monitoring before scaling to a large user base.

---

**Analysis Date:** February 4, 2026  
**Analyzed By:** AI Code Analysis Tool  
**Total Files Analyzed:** 200+ files  
**Lines of Code:** ~15,000+ (estimated)
