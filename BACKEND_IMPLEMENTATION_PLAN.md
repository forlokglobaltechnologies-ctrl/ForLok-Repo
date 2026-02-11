# YAARYATRA Backend Implementation Plan

## Technology Stack

- **Framework**: Fastify (Node.js)
- **Database**: MongoDB Atlas
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary (Recommended - 25GB free tier)
- **Real-time**: WebSocket (via @fastify/websocket)
- **Payment Gateway**: Razorpay (India) / Stripe (International)
- **OTP Service**: MSG91 (India - 100 SMS/day free) / Firebase Phone Auth (10K/month free) / Twilio (Trial)
- **Document Verification**: Integration with UIDAI / IDfy APIs
- **Location Services**: Google Maps API ($200 free credit/month)

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── env.ts
│   │   └── constants.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Company.ts
│   │   ├── Vehicle.ts
│   │   ├── PoolingOffer.ts
│   │   ├── RentalOffer.ts
│   │   ├── Booking.ts
│   │   ├── Payment.ts
│   │   ├── Document.ts
│   │   ├── Rating.ts
│   │   ├── Notification.ts
│   │   ├── Feedback.ts
│   │   └── Admin.ts
│   ├── routes/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── companies/
│   │   ├── vehicles/
│   │   ├── pooling/
│   │   ├── rental/
│   │   ├── bookings/
│   │   ├── payments/
│   │   ├── documents/
│   │   ├── ratings/
│   │   ├── notifications/
│   │   ├── feedback/
│   │   ├── admin/
│   │   └── websocket/
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── otp.service.ts
│   │   ├── document.service.ts
│   │   ├── payment.service.ts
│   │   ├── location.service.ts
│   │   ├── notification.service.ts
│   │   ├── email.service.ts
│   │   └── websocket.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── upload.middleware.ts
│   │   └── error.middleware.ts
│   ├── utils/
│   │   ├── validators.ts
│   │   ├── helpers.ts
│   │   ├── errors.ts
│   │   └── logger.ts
│   ├── types/
│   │   └── index.ts
│   └── app.ts
├── tests/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Phase 1: Project Setup & Infrastructure (Week 1)

### 1.1 Project Initialization

**Deliverables:**
- Initialize Fastify project with TypeScript
- Setup ESLint, Prettier
- Configure environment variables
- Setup MongoDB Atlas connection
- Create base project structure

**Tasks:**
```bash
# Initialize project
npm init -y
npm install fastify @fastify/cors @fastify/helmet @fastify/jwt @fastify/multipart
npm install mongoose dotenv bcryptjs jsonwebtoken
npm install @fastify/websocket @fastify/static
npm install -D typescript @types/node ts-node nodemon
```

**Key Files:**
- `src/config/database.ts` - MongoDB connection
- `src/config/env.ts` - Environment variables validation
- `src/app.ts` - Fastify app initialization
- `.env.example` - Environment template

**📋 For detailed environment variables setup guide, see [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)**

**Environment Variables:**
```env
# Server
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/yaaryatra

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# OTP Service (Choose one provider)
OTP_PROVIDER=msg91
OTP_EXPIRES_IN=300
OTP_LENGTH=4

# MSG91 (Recommended for India - 100 SMS/day free)
MSG91_AUTH_KEY=your-msg91-auth-key
MSG91_SENDER_ID=YAARYA
MSG91_TEMPLATE_ID=your-template-id

# Alternative: Firebase Phone Auth (10K verifications/month free)
# OTP_PROVIDER=firebase
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_PRIVATE_KEY=your-private-key
# FIREBASE_CLIENT_EMAIL=your-client-email

# Alternative: Twilio (International - $15.50 trial credit)
# OTP_PROVIDER=twilio
# TWILIO_ACCOUNT_SID=your-account-sid
# TWILIO_AUTH_TOKEN=your-auth-token
# TWILIO_PHONE_NUMBER=+1234567890

# File Upload - Cloudinary (25GB free tier)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=yaaryatra

# Payment Gateway (Razorpay for India)
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Document Verification
UIDAI_API_KEY=your-uidai-key
IDFY_API_KEY=your-idfy-key

# Google Maps API ($200 free credit/month)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_MAPS_GEOCODING_API_KEY=your-geocoding-key

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_EMAIL=admin@yaaryatra.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:19006
```

### 1.2 Database Schema Design

**Collections:**
1. `users` - Individual users
2. `companies` - Company owners
3. `vehicles` - Vehicle information
4. `pooling_offers` - Pooling ride offers
5. `rental_offers` - Rental vehicle offers
6. `bookings` - All bookings (pooling & rental)
7. `payments` - Payment transactions
8. `documents` - User documents (Aadhar, License, etc.)
9. `ratings` - User ratings and reviews
10. `notifications` - User notifications
11. `feedback` - User feedback and complaints
12. `admins` - Admin users
13. `otp_verifications` - OTP storage (TTL index)
14. `sessions` - User sessions (optional)

**Indexes Required:**
- Users: `phone`, `email`, `userId`
- Companies: `registrationNumber`, `email`, `phone`
- Pooling Offers: `from`, `to`, `date`, `status`, `userId`
- Rental Offers: `location`, `date`, `status`, `companyId`
- Bookings: `userId`, `offerId`, `status`, `date`
- Documents: `userId`, `type`, `status`

### 1.3 Base Middleware & Utilities

**Deliverables:**
- Error handling middleware
- Request logging
- CORS configuration
- Rate limiting
- Request validation utilities
- Response formatting utilities

---

## Phase 2: Authentication & Authorization (Week 2)

### 2.1 User Authentication

**Endpoints:**
```
POST   /api/auth/signup              - User registration
POST   /api/auth/signin               - User login
POST   /api/auth/refresh-token        - Refresh JWT token
POST   /api/auth/logout               - Logout user
POST   /api/auth/forgot-password      - Request password reset
POST   /api/auth/reset-password        - Reset password with token
POST   /api/auth/verify-otp           - Verify OTP
POST   /api/auth/resend-otp           - Resend OTP
```

**Features:**
- Phone number registration with OTP verification
- JWT token generation (access + refresh tokens)
- Password hashing with bcrypt
- Session management
- Token refresh mechanism
- Rate limiting on auth endpoints

**Models:**
```typescript
// User Model
{
  _id: ObjectId,
  userId: String (unique),
  phone: String (unique, indexed),
  name: String,
  email: String (optional),
  password: String (hashed, optional),
  userType: 'individual' | 'company',
  isVerified: Boolean,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date
}

// OTP Verification Model
{
  _id: ObjectId,
  phone: String (indexed),
  otp: String,
  type: 'signup' | 'login' | 'reset-password',
  expiresAt: Date (TTL index),
  attempts: Number,
  verified: Boolean
}
```

### 2.2 Admin Authentication

**Endpoints:**
```
POST   /api/admin/auth/login          - Admin login
POST   /api/admin/auth/refresh-token  - Refresh admin token
POST   /api/admin/auth/logout         - Admin logout
```

**Features:**
- Separate admin authentication
- Role-based access control (RBAC)
- Admin session management

**Models:**
```typescript
// Admin Model
{
  _id: ObjectId,
  adminId: String (unique),
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  role: 'super_admin' | 'admin' | 'moderator',
  permissions: Array<String>,
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date
}
```

### 2.3 Authorization Middleware

**Deliverables:**
- JWT verification middleware
- Role-based access control
- User ownership verification
- Admin permission checking

---

## Phase 3: User Management (Week 3)

### 3.1 Individual User Registration

**Endpoints:**
```
POST   /api/users/register             - Register individual user
GET    /api/users/profile              - Get user profile
PUT    /api/users/profile              - Update user profile
POST   /api/users/profile/photo        - Upload profile photo
GET    /api/users/stats                - Get user statistics
PUT    /api/users/language              - Update language preference
DELETE /api/users/account              - Delete user account
```

**Features:**
- Step 1: Phone verification with OTP
- Step 2: Name entry and profile creation
- Profile photo upload
- User statistics (trips, ratings, earnings)
- **Language preference storage** (NEW):
  - Language preference saved during registration (if selected in SignUp)
  - Can be updated via `PUT /api/users/language`
  - Returns language preference in profile API
  - Default: 'en' (English)

**Models:**
```typescript
// Extended User Model
{
  ...baseUserFields,
  profilePhoto: String (URL),
  dateOfBirth: Date (optional),
  gender: 'male' | 'female' | 'other' (optional),
  language: String (default: 'en', enum: ['en', 'te']), // Language preference
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: { lat: Number, lng: Number }
  },
  stats: {
    totalTrips: Number,
    totalEarnings: Number,
    averageRating: Number,
    totalRatings: Number
  }
}
```

### 3.2 Company Registration

**Endpoints:**
```
POST   /api/companies/register         - Register company
GET    /api/companies/profile          - Get company profile
PUT    /api/companies/profile          - Update company profile
POST   /api/companies/profile/photo    - Upload company logo
GET    /api/companies/dashboard         - Get company dashboard
GET    /api/companies/stats            - Get company statistics
```

**Features:**
- Multi-step registration (3 steps)
- Company document upload
- Company verification process
- Dashboard with earnings and bookings

**Models:**
```typescript
// Company Model
{
  _id: ObjectId,
  companyId: String (unique),
  userId: ObjectId (ref: User),
  companyName: String,
  registrationNumber: String (unique, indexed),
  businessType: String,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: { lat: Number, lng: Number }
  },
  contactNumber: String,
  email: String,
  logo: String (URL),
  documents: {
    registrationCertificate: String (URL),
    gstCertificate: String (URL),
    panCard: String (URL)
  },
  verificationStatus: 'pending' | 'approved' | 'rejected',
  isActive: Boolean,
  stats: {
    totalVehicles: Number,
    totalBookings: Number,
    totalEarnings: Number,
    averageRating: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 3.3 User Settings

**Endpoints:**
```
GET    /api/users/settings             - Get user settings
PUT    /api/users/settings             - Update user settings
POST   /api/users/change-password     - Change password
POST   /api/users/update-phone         - Update phone number
POST   /api/users/verify-new-phone    - Verify new phone with OTP
PUT    /api/users/language             - Update language preference
```

**Language Preference Endpoint:**
```
PUT /api/users/language
Body: { language: 'en' | 'te' }
Response: { success: true, language: 'en' | 'te' }
```
- Updates user's language preference
- Returns updated language
- Used when user changes language from Settings screen

---

## Phase 4: Document Verification (Week 4)

### 4.1 Document Upload & Storage

**Endpoints:**
```
POST   /api/documents/upload           - Upload document
GET    /api/documents/user-documents  - Get user documents
GET    /api/documents/:id             - Get specific document
DELETE /api/documents/:id             - Delete document
```

**Features:**
- Multi-file upload (Aadhar front/back, License front/back, Vehicle photos)
- Document type validation
- File size and format validation
- Secure storage (S3/Cloudinary)
- Document status tracking

**Models:**
```typescript
// Document Model
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  type: 'aadhar' | 'driving_license' | 'user_photo' | 'vehicle_info',
  frontImage: String (URL),
  backImage: String (URL, optional),
  vehicleNumber: String (optional, for vehicle_info),
  vehiclePhotos: Array<String> (URLs, optional),
  insurancePapers: Array<String> (URLs, optional),
  verificationStatus: 'pending' | 'verified' | 'rejected',
  rejectionReason: String (optional),
  verifiedAt: Date (optional),
  verifiedBy: ObjectId (ref: Admin, optional),
  createdAt: Date,
  updatedAt: Date
}
```

### 4.2 Document Verification Service

**Endpoints:**
```
POST   /api/documents/verify-aadhar    - Verify Aadhar card
POST   /api/documents/verify-license   - Verify Driving License
POST   /api/documents/verify-vehicle   - Verify vehicle documents
GET    /api/documents/verification-status - Get verification status
```

**Features:**
- Integration with UIDAI API for Aadhar verification
- Integration with IDfy/Perfios for License verification
- Vehicle document validation
- Admin verification workflow
- Automatic verification status updates

**Service Integration:**
- UIDAI Sample Client API (for development)
- IDfy API (for production)
- Perfios API (alternative)

### 4.3 Smart Document Checking

**Logic:**
- Check existing documents before service access
- Determine required documents based on service type:
  - **Offering Pooling**: Aadhar + License
  - **Offering Rental**: Aadhar only
  - **Taking Pooling**: Aadhar only
  - **Taking Rental**: Aadhar + License
- Only request missing documents
- Cache document status for performance

**Endpoints:**
```
GET    /api/documents/required         - Get required documents for service
POST   /api/documents/check-eligibility - Check if user can access service
```

---

## Phase 5: Vehicle Management (Week 5)

### 5.1 Vehicle CRUD Operations

**Endpoints:**
```
POST   /api/vehicles                   - Add new vehicle
GET    /api/vehicles                   - Get user's vehicles
GET    /api/vehicles/:id               - Get vehicle details
PUT    /api/vehicles/:id               - Update vehicle
DELETE /api/vehicles/:id               - Delete vehicle
POST   /api/vehicles/:id/photos        - Upload vehicle photos
POST   /api/vehicles/:id/documents    - Upload vehicle documents
```

**Features:**
- Vehicle registration
- Multiple photos upload
- Insurance and registration document upload
- Vehicle availability management

**Models:**
```typescript
// Vehicle Model
{
  _id: ObjectId,
  vehicleId: String (unique),
  userId: ObjectId (ref: User),
  companyId: ObjectId (ref: Company, optional),
  type: 'Car' | 'Bike',
  make: String,
  model: String,
  year: Number,
  color: String,
  vehicleNumber: String (unique, indexed),
  registrationNumber: String,
  seats: Number,
  fuelType: 'Petrol' | 'Diesel' | 'Electric' | 'CNG',
  transmission: 'Manual' | 'Automatic',
  photos: Array<String> (URLs),
  documents: {
    registrationCertificate: String (URL),
    insurance: String (URL),
    pollutionCertificate: String (URL)
  },
  isAvailable: Boolean,
  isVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Phase 6: Pooling Services (Week 6-7)

### 6.1 Create Pooling Offer

**Endpoints:**
```
POST   /api/pooling/offers             - Create pooling offer
GET    /api/pooling/offers/my-offers   - Get user's offers
GET    /api/pooling/offers/:id          - Get offer details
PUT    /api/pooling/offers/:id          - Update offer
DELETE /api/pooling/offers/:id         - Delete offer
PUT    /api/pooling/offers/:id/status  - Update offer status
GET    /api/pooling/offers/:id/bookings - Get bookings for offer
```

**Features:**
- Create pooling offer with route, date, time, vehicle
- Seat availability management
- Price per person setting
- Offer status management (active, completed, cancelled)
- Automatic expiry of past offers

**Models:**
```typescript
// Pooling Offer Model
{
  _id: ObjectId,
  offerId: String (unique),
  userId: ObjectId (ref: User),
  vehicleId: ObjectId (ref: Vehicle),
  from: {
    name: String,
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  to: {
    name: String,
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  date: Date,
  time: String,
  vehicleType: 'Car' | 'Bike',
  totalSeats: Number,
  availableSeats: Number,
  pricePerPerson: Number,
  notes: String,
  status: 'active' | 'full' | 'completed' | 'cancelled' | 'expired',
  passengers: Array<{
    userId: ObjectId (ref: User),
    bookingId: ObjectId (ref: Booking),
    status: 'confirmed' | 'pending'
  }>,
  views: Number,
  bookings: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### 6.2 Search Pooling Offers

**Endpoints:**
```
GET    /api/pooling/offers/search      - Search pooling offers
GET    /api/pooling/offers/filter      - Filter offers
GET    /api/pooling/offers/nearby      - Get nearby offers
```

**Features:**
- Search by from/to locations
- Filter by date, time, vehicle type, price range
- Sort by price, rating, departure time
- Pagination support
- Location-based search (nearby offers)

**Query Parameters:**
```
?from=location&to=location&date=YYYY-MM-DD
&vehicleType=Car|Bike&minPrice=0&maxPrice=1000
&sortBy=price|rating|time&page=1&limit=20
```

### 6.3 Pooling Booking

**Endpoints:**
```
POST   /api/pooling/offers/:id/book     - Book pooling seat
GET    /api/pooling/bookings/:id       - Get booking details
PUT    /api/pooling/bookings/:id/cancel - Cancel booking
```

**Features:**
- Seat booking with payment
- Automatic seat availability update
- Booking confirmation
- Cancellation with refund policy

---

## Phase 7: Rental Services (Week 8-9)

### 7.1 Create Rental Offer

**Endpoints:**
```
POST   /api/rental/offers              - Create rental offer
GET    /api/rental/offers/my-offers    - Get user's offers
GET    /api/rental/offers/:id          - Get offer details
PUT    /api/rental/offers/:id          - Update offer
DELETE /api/rental/offers/:id          - Delete offer
PUT    /api/rental/offers/:id/status   - Update offer status
GET    /api/rental/offers/:id/availability - Check availability
```

**Features:**
- Create rental offer with pickup location, date, time slots
- Hourly pricing
- Minimum rental hours
- Vehicle selection from user's fleet
- Availability calendar

**Models:**
```typescript
// Rental Offer Model
{
  _id: ObjectId,
  offerId: String (unique),
  userId: ObjectId (ref: User),
  companyId: ObjectId (ref: Company, optional),
  vehicleId: ObjectId (ref: Vehicle),
  pickupLocation: {
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  date: Date,
  availableFrom: String (time),
  availableUntil: String (time),
  pricePerHour: Number,
  minimumHours: Number,
  vehicleType: 'Car' | 'Bike',
  status: 'active' | 'booked' | 'completed' | 'cancelled' | 'expired',
  bookings: Array<ObjectId> (ref: Booking),
  views: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### 7.2 Search Rental Offers

**Endpoints:**
```
GET    /api/rental/offers/search       - Search rental offers
GET    /api/rental/offers/filter       - Filter offers
GET    /api/rental/offers/nearby       - Get nearby offers
```

**Features:**
- Search by location, date, vehicle type
- Filter by price range, availability
- Time slot availability checking
- Pagination

### 7.3 Rental Booking

**Endpoints:**
```
POST   /api/rental/offers/:id/book     - Book rental
GET    /api/rental/bookings/:id        - Get booking details
PUT    /api/rental/bookings/:id/cancel - Cancel booking
POST   /api/rental/bookings/:id/extend - Extend rental duration
```

**Features:**
- Duration selection (hours)
- Time slot selection
- Total price calculation
- Booking confirmation
- Extension requests

---

## Phase 8: Booking Management (Week 10)

### 8.1 Booking System

**Endpoints:**
```
GET    /api/bookings                   - Get user bookings
GET    /api/bookings/:id               - Get booking details
PUT    /api/bookings/:id/cancel        - Cancel booking
POST   /api/bookings/:id/rate          - Rate booking
GET    /api/bookings/history           - Get booking history
GET    /api/bookings/upcoming          - Get upcoming bookings
GET    /api/bookings/past              - Get past bookings
GET    /api/bookings/cancelled         - Get cancelled bookings
```

**Features:**
- Unified booking system for pooling and rental
- Booking status tracking
- Cancellation with refund calculation
- Rating system
- Booking history with filters

**Models:**
```typescript
// Booking Model
{
  _id: ObjectId,
  bookingId: String (unique),
  userId: ObjectId (ref: User),
  offerId: ObjectId,
  offerType: 'pooling' | 'rental',
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
  
  // Pooling specific
  seats: Number (optional),
  
  // Rental specific
  duration: Number (hours, optional),
  startTime: Date (optional),
  endTime: Date (optional),
  
  // Common
  route: {
    from: Object,
    to: Object
  },
  date: Date,
  time: String,
  vehicle: ObjectId (ref: Vehicle),
  driver: ObjectId (ref: User, optional),
  
  // Pricing
  baseAmount: Number,
  platformFee: Number,
  totalAmount: Number,
  refundAmount: Number (if cancelled),
  
  // Payment
  paymentId: ObjectId (ref: Payment),
  paymentStatus: 'pending' | 'paid' | 'refunded',
  
  // Rating
  rating: {
    value: Number (1-5),
    comment: String,
    ratedAt: Date
  },
  
  // Tracking
  tracking: {
    currentLocation: { lat: Number, lng: Number },
    startLocation: { lat: Number, lng: Number },
    endLocation: { lat: Number, lng: Number },
    startedAt: Date,
    completedAt: Date
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### 8.2 Booking Status Updates

**Features:**
- Real-time status updates
- Automatic status transitions
- Notification triggers
- WebSocket events for live updates

---

## Phase 9: Payment Integration (Week 11)

### 9.1 Payment Gateway Integration

**Endpoints:**
```
POST   /api/payments/create            - Create payment
POST   /api/payments/verify            - Verify payment
GET    /api/payments/:id               - Get payment details
POST   /api/payments/:id/refund        - Process refund
GET    /api/payments/methods           - Get payment methods
POST   /api/payments/webhook           - Payment webhook
```

**Features:**
- Razorpay/Stripe integration
- Payment method selection (UPI, Card, Wallet, Net Banking)
- Payment verification
- Refund processing
- Payment webhook handling
- Transaction history

**Models:**
```typescript
// Payment Model
{
  _id: ObjectId,
  paymentId: String (unique),
  bookingId: ObjectId (ref: Booking),
  userId: ObjectId (ref: User),
  amount: Number,
  currency: String (default: 'INR'),
  method: 'upi' | 'card' | 'wallet' | 'netbanking',
  status: 'pending' | 'processing' | 'success' | 'failed' | 'refunded',
  gateway: 'razorpay' | 'stripe',
  gatewayTransactionId: String,
  gatewayOrderId: String,
  receipt: String,
  refundAmount: Number,
  refundId: String,
  refundedAt: Date,
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### 9.2 Refund Management

**Features:**
- Automatic refund calculation based on cancellation policy
- Refund processing
- Refund status tracking
- Refund notifications

**Cancellation Policy:**
- Pooling: Full refund if cancelled 24h before, 50% if 12h before, no refund if <12h
- Rental: Full refund if cancelled 48h before, 50% if 24h before, no refund if <24h

---

## Phase 10: Real-time Features (Week 12)

### 10.1 WebSocket Implementation

**Endpoints:**
```
WS     /ws/trips/:id                   - Trip tracking WebSocket
WS     /ws/chat/:id                   - Chat WebSocket
WS     /ws/notifications               - Notifications WebSocket
```

**Features:**
- Real-time trip location updates
- Live chat messaging
- Push notifications
- Connection management
- Reconnection handling

### 10.2 Trip Tracking

**Endpoints:**
```
GET    /api/trips/:id/location         - Get current location
POST   /api/trips/:id/location/update  - Update location (driver)
GET    /api/trips/:id/eta              - Get ETA
POST   /api/trips/:id/start            - Start trip
POST   /api/trips/:id/complete         - Complete trip
POST   /api/trips/:id/emergency        - Emergency contact
```

**Features:**
- Real-time location sharing
- ETA calculation
- Route tracking
- Emergency button
- Location history

### 10.3 Chat System

**Endpoints:**
```
GET    /api/chat/conversations         - Get conversations
GET    /api/chat/:id/messages          - Get messages
POST   /api/chat/:id/messages          - Send message
POST   /api/chat/:id/share-location    - Share location
POST   /api/chat/:id/read              - Mark as read
```

**Features:**
- Real-time messaging
- Location sharing
- Message read receipts
- Message history
- File sharing (optional)

**Models:**
```typescript
// Chat Conversation Model
{
  _id: ObjectId,
  conversationId: String (unique),
  participants: Array<ObjectId> (ref: User),
  type: 'pooling' | 'rental',
  bookingId: ObjectId (ref: Booking),
  lastMessage: {
    text: String,
    senderId: ObjectId,
    sentAt: Date
  },
  unreadCount: {
    userId: Number
  },
  createdAt: Date,
  updatedAt: Date
}

// Chat Message Model
{
  _id: ObjectId,
  conversationId: ObjectId (ref: Conversation),
  senderId: ObjectId (ref: User),
  message: String,
  type: 'text' | 'location' | 'image',
  location: { lat: Number, lng: Number } (optional),
  imageUrl: String (optional),
  readBy: Array<ObjectId>,
  sentAt: Date
}
```

---

## Phase 11: Notifications (Week 13)

### 11.1 Notification System

**Endpoints:**
```
GET    /api/notifications              - Get notifications
PUT    /api/notifications/:id/read     - Mark as read
PUT    /api/notifications/read-all     - Mark all as read
DELETE /api/notifications/:id         - Delete notification
GET    /api/notifications/unread-count - Get unread count
POST   /api/notifications/preferences  - Update preferences
```

**Features:**
- Push notifications (Expo Push Notifications / FCM)
- In-app notifications
- Email notifications (optional)
- SMS notifications (critical events)
- Notification preferences
- Notification history

**Models:**
```typescript
// Notification Model
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  type: 'booking_confirmed' | 'booking_cancelled' | 'payment_success' | 
        'trip_started' | 'trip_completed' | 'new_message' | 'rating_received' |
        'offer_approved' | 'offer_rejected' | 'document_verified',
  title: String,
  message: String,
  data: Object (additional data),
  read: Boolean,
  readAt: Date,
  createdAt: Date
}
```

**Notification Types:**
- Booking confirmations
- Payment success/failure
- Trip updates
- New messages
- Rating received
- Document verification status
- Offer approvals/rejections

---

## Phase 12: Ratings & Reviews (Week 14)

### 12.1 Rating System

**Endpoints:**
```
POST   /api/ratings                    - Create rating
GET    /api/ratings/:id                - Get rating
PUT    /api/ratings/:id                - Update rating
DELETE /api/ratings/:id                - Delete rating
GET    /api/ratings/user/:userId       - Get user ratings
GET    /api/ratings/booking/:bookingId - Get booking rating
```

**Features:**
- Rating after trip completion
- Review comments
- Rating aggregation
- Rating display on profiles
- Rating moderation

**Models:**
```typescript
// Rating Model
{
  _id: ObjectId,
  ratingId: String (unique),
  bookingId: ObjectId (ref: Booking),
  ratedBy: ObjectId (ref: User),
  ratedTo: ObjectId (ref: User),
  rating: Number (1-5),
  comment: String,
  type: 'driver' | 'passenger' | 'vehicle' | 'service',
  isVisible: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Phase 13: Admin Module (Week 15-16)

### 13.1 Admin Dashboard

**Endpoints:**
```
GET    /api/admin/dashboard/stats      - Get dashboard statistics
GET    /api/admin/dashboard/earnings   - Get earnings data
GET    /api/admin/dashboard/users      - Get user statistics
GET    /api/admin/dashboard/transactions - Get transaction data
```

**Features:**
- Real-time user count
- Total registered users
- Today's earnings
- Total earnings
- Service breakdown
- Growth metrics

### 13.2 User Management

**Endpoints:**
```
GET    /api/admin/users                - Get all users
GET    /api/admin/users/:id            - Get user details
PUT    /api/admin/users/:id/verify     - Verify user
PUT    /api/admin/users/:id/suspend    - Suspend user
PUT    /api/admin/users/:id/activate   - Activate user
DELETE /api/admin/users/:id            - Delete user
GET    /api/admin/users/filter          - Filter users
GET    /api/admin/users/export          - Export users
```

**Features:**
- User listing with pagination
- User verification
- User suspension/activation
- User profile viewing
- User statistics
- Bulk actions
- Export functionality

### 13.3 Pooling Management

**Endpoints:**
```
GET    /api/admin/pooling/offers       - Get all pooling offers
GET    /api/admin/pooling/offers/:id   - Get offer details
PUT    /api/admin/pooling/offers/:id/approve - Approve offer
PUT    /api/admin/pooling/offers/:id/suspend - Suspend offer
PUT    /api/admin/pooling/offers/:id/flag - Flag offer
GET    /api/admin/pooling/offers/filter - Filter offers
```

**Features:**
- Offer listing with filters
- Offer approval/rejection
- Offer suspension
- Flag suspicious offers
- Offer statistics
- Bulk actions

### 13.4 Rental Management

**Endpoints:**
```
GET    /api/admin/rental/offers        - Get all rental offers
GET    /api/admin/rental/offers/:id    - Get offer details
PUT    /api/admin/rental/offers/:id/approve - Approve offer
PUT    /api/admin/rental/offers/:id/suspend - Suspend offer
PUT    /api/admin/rental/offers/:id/flag - Flag offer
GET    /api/admin/rental/offers/filter - Filter offers
```

**Features:**
- Similar to pooling management
- Rental-specific filters
- Vehicle verification

### 13.5 Rides History

**Endpoints:**
```
GET    /api/admin/bookings/history     - Get all bookings
GET    /api/admin/bookings/:id         - Get booking details
GET    /api/admin/bookings/filter       - Filter bookings
GET    /api/admin/bookings/export       - Export bookings
```

**Features:**
- Complete booking history
- Filter by date, status, service type
- Export to CSV/Excel
- Booking analytics

### 13.6 Feedback Management

**Endpoints:**
```
GET    /api/admin/feedback             - Get all feedback
GET    /api/admin/feedback/:id         - Get feedback details
PUT    /api/admin/feedback/:id/resolve - Resolve feedback
PUT    /api/admin/feedback/:id/acknowledge - Acknowledge feedback
POST   /api/admin/feedback/:id/response - Add admin response
GET    /api/admin/feedback/filter      - Filter feedback
```

**Features:**
- Feedback listing
- Feedback categorization
- Resolution tracking
- Admin responses
- Feedback analytics

### 13.7 Analytics

**Endpoints:**
```
GET    /api/admin/analytics/revenue    - Revenue analytics
GET    /api/admin/analytics/users      - User analytics
GET    /api/admin/analytics/services   - Service analytics
GET    /api/admin/analytics/trends     - Trend analysis
GET    /api/admin/analytics/export      - Export analytics
```

**Features:**
- Revenue charts and graphs
- User growth metrics
- Service distribution
- Trend analysis
- Custom date ranges
- Export functionality

---

## Phase 14: Additional Features (Week 17)

### 14.1 Food Booking Integration

**Endpoints:**
```
GET    /api/food/shops/route           - Get shops along route
GET    /api/food/shops/:id              - Get shop details
POST   /api/food/orders                - Create food order
GET    /api/food/orders                - Get user orders
```

**Features:**
- Shop listing by route
- Time-based filtering (tiffin, lunch, dinner)
- Shop details
- Order placement (future integration)

### 14.2 Help & Support

**Endpoints:**
```
POST   /api/support/tickets            - Create support ticket
GET    /api/support/tickets            - Get user tickets
GET    /api/support/tickets/:id        - Get ticket details
PUT    /api/support/tickets/:id         - Update ticket
GET    /api/support/faq                - Get FAQ
```

**Features:**
- Support ticket system
- FAQ management
- Ticket status tracking
- Admin response system

### 14.3 Feedback System

**Endpoints:**
```
POST   /api/feedback                   - Submit feedback
GET    /api/feedback/my-feedback       - Get user feedback
GET    /api/feedback/:id               - Get feedback details
```

**Features:**
- User feedback submission
- Feedback categorization
- Feedback history

---

## Phase 15: Testing & Quality Assurance (Week 18)

### 15.1 Unit Testing

**Tools:**
- Jest
- Supertest (API testing)
- MongoDB Memory Server (for testing)

**Coverage:**
- All service functions
- API endpoints
- Middleware functions
- Utility functions

### 15.2 Integration Testing

**Coverage:**
- Authentication flow
- Booking flow
- Payment flow
- Document verification flow
- Real-time features

### 15.3 Performance Testing

**Tools:**
- Artillery
- k6
- Apache Bench

**Metrics:**
- Response times
- Throughput
- Error rates
- Database query performance

### 15.4 Security Testing

**Checks:**
- SQL injection prevention
- XSS prevention
- CSRF protection
- Authentication bypass
- Authorization checks
- Rate limiting
- Input validation

---

## Phase 16: Deployment & DevOps (Week 19-20)

### 16.1 Environment Setup

**Environments:**
- Development
- Staging
- Production

**Configuration:**
- Environment variables
- Database connections
- API keys
- Service URLs

### 16.2 CI/CD Pipeline

**Tools:**
- GitHub Actions / GitLab CI / Jenkins

**Steps:**
- Code linting
- Unit tests
- Build
- Deploy to staging
- Integration tests
- Deploy to production

### 16.3 Deployment

**Platforms:**
- AWS EC2 / ECS
- Google Cloud Run
- Heroku
- DigitalOcean
- Railway / Render

**Requirements:**
- Node.js runtime
- MongoDB Atlas connection
- Environment variables
- SSL certificates
- Domain configuration

### 16.4 Monitoring & Logging

**Tools:**
- PM2 (process management)
- Winston (logging)
- Sentry (error tracking)
- New Relic / Datadog (APM)

**Metrics:**
- Server health
- API response times
- Error rates
- Database performance
- Memory usage
- CPU usage

### 16.5 Backup & Recovery

**Strategies:**
- MongoDB Atlas automated backups
- Database replication
- Point-in-time recovery
- Disaster recovery plan

---

## API Documentation

### 16.6 API Documentation

**Tools:**
- Swagger/OpenAPI
- Postman Collection
- API Blueprint

**Sections:**
- Authentication
- Endpoints documentation
- Request/Response examples
- Error codes
- Rate limits

---

## Security Considerations

### 17.1 Security Measures

1. **Authentication:**
   - JWT tokens with expiration
   - Refresh token rotation
   - Secure password hashing (bcrypt)
   - OTP verification

2. **Authorization:**
   - Role-based access control
   - Resource ownership verification
   - Admin permission checks

3. **Data Protection:**
   - HTTPS/TLS encryption
   - Sensitive data encryption at rest
   - PII protection
   - GDPR compliance

4. **API Security:**
   - Rate limiting
   - Input validation
   - SQL injection prevention
   - XSS prevention
   - CSRF protection
   - CORS configuration

5. **File Security:**
   - File type validation
   - File size limits
   - Virus scanning (optional)
   - Secure file storage

---

## Database Indexes Strategy

### 18.1 Critical Indexes

```javascript
// Users Collection
db.users.createIndex({ phone: 1 }, { unique: true })
db.users.createIndex({ email: 1 }, { sparse: true, unique: true })
db.users.createIndex({ userId: 1 }, { unique: true })
db.users.createIndex({ createdAt: -1 })

// Companies Collection
db.companies.createIndex({ registrationNumber: 1 }, { unique: true })
db.companies.createIndex({ userId: 1 })
db.companies.createIndex({ verificationStatus: 1 })

// Pooling Offers Collection
db.pooling_offers.createIndex({ from: "text", to: "text" })
db.pooling_offers.createIndex({ date: 1, status: 1 })
db.pooling_offers.createIndex({ userId: 1 })
db.pooling_offers.createIndex({ createdAt: -1 })
db.pooling_offers.createIndex({ "from.coordinates": "2dsphere" })
db.pooling_offers.createIndex({ "to.coordinates": "2dsphere" })

// Rental Offers Collection
db.rental_offers.createIndex({ "pickupLocation.coordinates": "2dsphere" })
db.rental_offers.createIndex({ date: 1, status: 1 })
db.rental_offers.createIndex({ userId: 1 })
db.rental_offers.createIndex({ createdAt: -1 })

// Bookings Collection
db.bookings.createIndex({ userId: 1, status: 1 })
db.bookings.createIndex({ offerId: 1 })
db.bookings.createIndex({ bookingId: 1 }, { unique: true })
db.bookings.createIndex({ date: -1 })
db.bookings.createIndex({ createdAt: -1 })

// Payments Collection
db.payments.createIndex({ paymentId: 1 }, { unique: true })
db.payments.createIndex({ bookingId: 1 })
db.payments.createIndex({ userId: 1 })
db.payments.createIndex({ status: 1 })
db.payments.createIndex({ createdAt: -1 })

// Documents Collection
db.documents.createIndex({ userId: 1, type: 1 })
db.documents.createIndex({ verificationStatus: 1 })

// OTP Verifications Collection (TTL)
db.otp_verifications.createIndex({ phone: 1 })
db.otp_verifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

---

## Performance Optimization

### 19.1 Database Optimization

- Connection pooling
- Query optimization
- Index optimization
- Aggregation pipelines
- Caching frequently accessed data

### 19.2 API Optimization

- Response compression
- Pagination
- Field selection (projection)
- Caching strategies
- Rate limiting

### 19.3 Caching Strategy

**Tools:**
- Redis (for session, OTP, frequently accessed data)
- MongoDB query result caching

**Cache Keys:**
- User profiles
- Popular routes
- Recent searches
- Dashboard statistics

---

## Error Handling

### 20.1 Error Types

- Validation errors (400)
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Conflict errors (409)
- Server errors (500)

### 20.2 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

---

## Rate Limiting

### 21.1 Rate Limits

- Authentication endpoints: 5 requests/minute
- OTP endpoints: 3 requests/5 minutes
- General API: 100 requests/minute
- File upload: 10 requests/minute
- Admin endpoints: 200 requests/minute

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | Week 1 | Project setup, database schema |
| Phase 2 | Week 2 | Authentication system |
| Phase 3 | Week 3 | User management |
| Phase 4 | Week 4 | Document verification |
| Phase 5 | Week 5 | Vehicle management |
| Phase 6-7 | Week 6-7 | Pooling services |
| Phase 8-9 | Week 8-9 | Rental services |
| Phase 10 | Week 10 | Booking management |
| Phase 11 | Week 11 | Payment integration |
| Phase 12 | Week 12 | Real-time features |
| Phase 13 | Week 13 | Notifications |
| Phase 14 | Week 14 | Ratings & reviews |
| Phase 15-16 | Week 15-16 | Admin module |
| Phase 17 | Week 17 | Additional features |
| Phase 18 | Week 18 | Testing |
| Phase 19-20 | Week 19-20 | Deployment |

**Total Duration: 20 weeks (5 months)**

---

## Dependencies & Prerequisites

### External Services Required:
1. MongoDB Atlas account
2. AWS S3 / Cloudinary account (file storage)
3. Razorpay / Stripe account (payments)
4. Twilio / AWS SNS (SMS/OTP)
5. UIDAI / IDfy API access (document verification)
6. Google Maps API key (location services)
7. Expo Push Notifications / FCM (push notifications)

### Team Requirements:
- Backend Developer (Node.js/Fastify)
- Database Administrator
- DevOps Engineer
- QA Engineer

---

## Success Metrics

### Technical Metrics:
- API response time < 200ms (p95)
- Uptime > 99.9%
- Error rate < 0.1%
- Database query time < 100ms

### Business Metrics:
- User registration completion rate
- Booking success rate
- Payment success rate
- Document verification time
- User satisfaction (ratings)

---

## Notes

1. **Development Approach:**
   - Start with Phase 1-2 (foundation)
   - Implement core features first (Phases 3-11)
   - Add admin features (Phases 15-16)
   - Polish and optimize (Phases 17-20)

2. **API Versioning:**
   - Use `/api/v1/` prefix for all endpoints
   - Plan for future versioning

3. **Code Quality:**
   - Follow TypeScript best practices
   - Write comprehensive tests
   - Document all functions
   - Code reviews for all PRs

4. **Scalability:**
   - Design for horizontal scaling
   - Use load balancers
   - Database replication
   - Caching layer

5. **Monitoring:**
   - Set up alerts for critical errors
   - Monitor API performance
   - Track business metrics
   - Regular security audits

---

## Conclusion

This implementation plan provides a comprehensive roadmap for building the YAARYATRA backend using Fastify and MongoDB Atlas. Each phase builds upon the previous one, ensuring a solid foundation for the entire system. Regular testing, code reviews, and monitoring will ensure a robust and scalable backend infrastructure.
