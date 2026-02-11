# YAARYATRA - Complete Project Documentation

## Table of Contents
1. [What is YAARYATRA?](#what-is-yaaryatra)
2. [Core Features](#core-features)
3. [User Types & Roles](#user-types--roles)
4. [Complete User Flows](#complete-user-flows)
5. [Service Types](#service-types)
6. [Payment System](#payment-system)
7. [Document Verification](#document-verification)
8. [Chat & Messaging](#chat--messaging)
9. [Notifications](#notifications)
10. [Food Ordering](#food-ordering)
11. [Trip Tracking](#trip-tracking)
12. [Rating & Reviews](#rating--reviews)
13. [Admin Features](#admin-features)
14. [Data Flow Overview](#data-flow-overview)
15. [Technical Architecture](#technical-architecture)

---

## What is YAARYATRA?

YAARYATRA is a comprehensive ride-sharing and vehicle rental platform that connects travelers going to the same destination (Pooling) and enables vehicle owners to rent out their vehicles (Rental). The platform facilitates cost-sharing for travelers and provides income opportunities for vehicle owners.

### Key Concept
- **Pooling**: Share rides with other travelers going to the same destination and split costs
- **Rental**: Rent vehicles (cars/bikes) from individual owners or companies for specific durations
- **Food Ordering**: Order food from vendors along your travel route
- **Real-time Tracking**: Track trips in real-time with live location updates

---

## Core Features

### 1. User Registration & Authentication
- **Phone-based Registration**: Simple 2-step process
  - Step 1: Phone number + OTP verification
  - Step 2: Name entry
- **No Email/Password Required**: Streamlined registration
- **User Types**: Individual or Company
- **Language Support**: English, Telugu, Hindi
- **Document Upload**: Contextual (only when needed for services)

### 2. Pooling Services
**For Drivers:**
- Create pooling offers with route, date, time, vehicle details
- Set available seats and price per person
- Accept/reject booking requests
- Manage passengers
- Track earnings

**For Passengers:**
- Search for pooling rides matching their route
- Filter by date, time, vehicle type, price
- Book seats in available pools
- Chat with driver and other passengers
- Track trip in real-time

**Features:**
- Dynamic pricing based on distance and route
- Route matching algorithm (finds similar routes)
- Seat availability management
- Group chat for each pooling offer
- Passenger verification codes

### 3. Rental Services
**For Vehicle Owners:**
- Create rental offers with vehicle details
- Set availability time slots
- Set price per hour and minimum rental duration
- Manage bookings and availability
- Track earnings

**For Renters:**
- Search for available vehicles by location
- Filter by vehicle type, price, availability
- Book vehicles for specific time slots
- Chat with vehicle owner
- Track vehicle pickup/drop-off

**Features:**
- Hourly rental pricing
- Time slot management
- Vehicle availability calendar
- Individual and company vehicle rentals
- Vehicle verification system

### 4. Vehicle Management
- Add multiple vehicles (cars/bikes)
- Upload vehicle photos (front, back, side, interior)
- Upload vehicle documents (registration, insurance, pollution certificate)
- Vehicle status management (active, inactive, under maintenance)
- Vehicle verification by admin

### 5. Booking System
- **Booking Flow:**
  1. User searches for pooling/rental
  2. Views offer details
  3. Selects seats/duration
  4. Proceeds to payment
  5. Booking confirmed
  6. Receives booking confirmation

- **Booking Statuses:**
  - Pending: Awaiting confirmation
  - Confirmed: Booking accepted
  - In Progress: Trip started
  - Completed: Trip finished
  - Cancelled: Booking cancelled

- **Booking Features:**
  - Unique booking IDs (#YA20240115001)
  - Booking history
  - Cancellation with refunds
  - Multiple passengers per pooling booking
  - Passenger status tracking (waiting, got_in, got_out)

### 6. Payment System
**Payment Methods:**
- UPI
- Credit/Debit Cards
- Net Banking
- Digital Wallet
- Offline Cash (for drivers)

**Payment Flow:**
1. User selects payment method
2. Payment processed through Razorpay
3. Payment confirmation
4. Booking confirmed
5. Receipt generated

**Payment Features:**
- Secure payment gateway integration
- Platform fee calculation (10% default)
- Refund processing
- Payment history
- Settlement for drivers (online/offline payments)
- Driver earnings tracking

### 7. Document Verification
**Document Types:**
- Aadhar Card (front & back)
- Driving License (front & back)
- User Photo
- Vehicle Registration Certificate
- Vehicle Insurance
- Pollution Certificate
- Taxi Service Papers (for commercial vehicles)
- Company Registration (for companies)
- GST Certificate (for companies)

**Verification Flow:**
1. User uploads documents when needed
2. Documents stored in Cloudinary
3. Admin reviews documents
4. Documents verified/rejected
5. User notified of status

**Features:**
- Contextual document upload (only when needed)
- Number-only verification for Aadhar/PAN/DL
- Image verification for vehicle documents
- Document status tracking
- Re-upload capability for rejected documents

### 8. Chat & Messaging
**Chat Types:**
- **Individual Chat**: Between driver/passenger or owner/renter
- **Group Chat**: For pooling offers (driver + all passengers)

**Message Types:**
- Text messages
- Location sharing
- Images
- System messages (booking confirmations, etc.)

**Features:**
- Real-time messaging via WebSocket
- Read receipts
- Message delivery status
- Chat history
- Unread message counts
- Group chat for pooling rides

### 9. Notifications
**Notification Types:**
- Booking requests
- Booking confirmations
- Booking cancellations
- Payment received
- Rating requests
- Document verified/rejected
- Trip reminders
- Chat messages

**Features:**
- Push notifications
- In-app notifications
- Email notifications
- SMS notifications (optional)
- Notification preferences
- Notification history

### 10. Food Ordering
**Features:**
- Browse food vendors along travel route
- Filter by meal type (Tiffin, Lunch, Dinner, Breakfast, Snacks)
- Time-based filtering (shows available meals based on current time)
- View vendor ratings and reviews
- Order food for delivery
- Track order status

**Food Order Flow:**
1. User views route (pooling/rental)
2. Clicks "Book Food"
3. Sees food vendors along route
4. Filters by meal type
5. Selects vendor and food item
6. Places order
7. Vendor prepares and delivers

### 11. Trip Tracking
**Features:**
- Real-time location tracking
- Driver location updates
- Passenger location (optional)
- Route visualization on map
- ETA calculation
- Trip progress tracking
- Location history (stored for 7 days)

**Tracking Flow:**
1. Trip starts
2. Driver location updates every few seconds
3. Location stored in database
4. Passengers can view driver location
5. Route displayed on map
6. ETA updated in real-time
7. Trip completion

### 12. Rating & Review System
**Rating Aspects:**
- Overall rating (1-5 stars)
- Punctuality
- Vehicle condition
- Driving skills
- Service quality

**Features:**
- Rate after trip completion
- Written reviews
- Rating history
- Average rating calculation
- Rating-based user profiles
- Review moderation

### 13. Company Features
**Company Registration:**
- Company details (name, registration number, GST)
- Business information
- Company documents upload
- Admin verification

**Company Dashboard:**
- View all company vehicles
- Manage vehicle fleet
- Track bookings
- View earnings
- Company statistics

**Company Vehicle Management:**
- Add multiple vehicles
- Bulk vehicle operations
- Vehicle availability management
- Booking management per vehicle

### 14. Admin Panel
**Admin Features:**
- User management (view, verify, suspend users)
- Pooling offer management (approve, suspend, flag)
- Rental offer management
- Transaction history
- Earnings overview
- Feedback management
- Document verification queue
- Analytics and reports
- Platform settings

**Admin Roles:**
- Super Admin: Full access
- Admin: Limited access
- Moderator: Content moderation only

---

## User Types & Roles

### 1. Individual User
**Can:**
- Create pooling offers
- Create rental offers
- Book pooling rides
- Book rental vehicles
- Rate and review
- Chat with other users
- Order food
- Track trips

**Registration:**
- Phone number + OTP
- Name
- Documents (when needed)

### 2. Company User
**Can:**
- Manage vehicle fleet
- Create rental offers
- View company dashboard
- Track company earnings
- Manage company vehicles

**Registration:**
- Company details
- Registration number
- GST number (optional)
- Company documents
- Admin verification required

### 3. Admin User
**Can:**
- Manage all users
- Verify documents
- Approve/suspend offers
- View all transactions
- Generate reports
- Manage platform settings

---

## Complete User Flows

### Flow 1: Individual User Registration
```
1. User opens app
2. Views onboarding slides
3. Clicks "Sign Up"
4. Selects language (English/Telugu/Hindi)
5. Selects "Individual" user type
6. Enters phone number
7. Receives OTP via SMS
8. Enters OTP
9. Enters name
10. Registration complete → Main Dashboard
```

### Flow 2: Creating a Pooling Offer
```
1. User clicks "Offer Services" → "Pooling"
2. System checks if documents uploaded
   - If NO → Document upload screen
   - If YES → Create pooling form
3. User enters:
   - From location
   - To location
   - Date
   - Time
   - Vehicle type (Car/Bike)
   - Available seats
   - Price per person (optional - auto-calculated)
   - Notes
4. System calculates price based on distance
5. User confirms and creates offer
6. Offer status: Pending → Admin approval → Active
7. Offer visible to other users
8. User receives booking requests
9. User accepts/rejects requests
10. Group chat created automatically
```

### Flow 3: Booking a Pooling Ride
```
1. User searches for pooling rides
   - Enters from/to locations
   - Selects date
   - Selects vehicle type
   - Number of passengers
2. System shows matching offers
3. User views offer details
4. User clicks "Join Pool"
5. System checks if documents uploaded
   - If NO → Document upload screen
   - If YES → Payment screen
6. User selects payment method
7. Payment processed
8. Booking confirmed
9. Notification sent to driver
10. Group chat access granted
11. User can track trip when it starts
```

### Flow 4: Creating a Rental Offer
```
1. User clicks "Offer Services" → "Rental"
2. System checks if documents uploaded
   - If NO → Document upload screen
   - If YES → Create rental form
3. User selects vehicle from their vehicles
4. User enters:
   - Pickup location
   - Date
   - Available time slots (from - to)
   - Price per hour
   - Minimum rental hours
   - Notes
5. User creates offer
6. Offer status: Pending → Admin approval → Active
7. Offer visible to other users
8. User receives booking requests
9. User accepts/rejects requests
```

### Flow 5: Booking a Rental Vehicle
```
1. User searches for rental vehicles
   - Enters location
   - Selects date
   - Selects vehicle type
   - Duration needed
2. System shows available rentals
3. User views rental details
4. User selects rental duration
5. User selects time slot
6. System calculates total price
7. User proceeds to payment
8. Payment processed
9. Booking confirmed
10. Notification sent to owner
11. Chat access granted
```

### Flow 6: Trip Execution (Pooling)
```
1. Trip date/time arrives
2. System auto-starts trip (or driver manually starts)
3. Booking status: Confirmed → In Progress
4. Real-time tracking begins
5. Driver location updates every few seconds
6. Passengers can view driver location
7. Driver picks up passengers
8. Passenger status: Waiting → Got In
9. Trip continues with live tracking
10. Driver reaches destination
11. Passengers get out
12. System generates 4-digit code for passenger verification
13. Driver enters code to confirm passenger exit
14. Trip status: In Progress → Completed
15. Rating request sent to all participants
```

### Flow 7: Payment Settlement (Driver)
```
1. Trip completed
2. Payment received (online) or pending (offline cash)
3. Driver views earnings:
   - Total amount
   - Platform fee (10%)
   - Driver settlement amount
4. For online payments:
   - Amount in driver's inflow account
   - Driver can request settlement
   - Admin approves settlement
   - Money transferred to driver
5. For offline cash payments:
   - Amount in driver's outflow account
   - Driver owes platform fee
   - Driver pays platform fee
   - Settlement complete
```

### Flow 8: Document Verification
```
1. User tries to use service (create offer or book)
2. System checks if documents uploaded
3. If NO:
   - Shows document upload screen
   - Lists required documents
   - User uploads documents
   - Documents stored in Cloudinary
   - Status: Pending
4. Admin reviews documents
5. Admin approves/rejects
6. User notified
7. If approved: User can use services
8. If rejected: User can re-upload
```

### Flow 9: Chat Flow
```
1. Booking created
2. System creates conversation:
   - Individual chat: Driver ↔ Passenger or Owner ↔ Renter
   - Group chat: Driver + All Passengers (for pooling)
3. Users can send messages
4. Messages delivered via WebSocket
5. Read receipts updated
6. Unread counts maintained
7. Chat history stored
8. Users can share location
9. Users can send images
```

### Flow 10: Food Ordering
```
1. User has active booking (pooling/rental)
2. User clicks "Book Food"
3. System shows route (from → to)
4. System finds food vendors along route
5. System filters by current time:
   - Morning (6 AM - 11 AM): Tiffin
   - Afternoon (11 AM - 4 PM): Lunch
   - Evening (4 PM - 11 PM): Dinner
6. User selects meal type filter
7. User views vendors grouped by location
8. User selects vendor and food item
9. User places order
10. Order status: Pending → Confirmed → Preparing → Ready → Out for Delivery → Delivered
11. User tracks order
```

---

## Service Types

### 1. Pooling Service
**Purpose:** Share rides and split costs

**How it Works:**
- Driver creates offer with route and available seats
- Passengers search and book seats
- Multiple passengers can join same ride
- Cost split among passengers
- Driver earns money
- Passengers save money

**Key Features:**
- Route matching
- Dynamic pricing
- Seat management
- Group chat
- Real-time tracking

### 2. Rental Service
**Purpose:** Rent vehicles for specific durations

**How it Works:**
- Owner creates rental offer with vehicle and time slots
- Renters search and book vehicles
- Renters pay per hour
- Minimum rental duration enforced
- Owner earns money
- Renters get vehicle access

**Key Features:**
- Hourly pricing
- Time slot management
- Vehicle availability
- Individual and company rentals

---

## Payment System

### Payment Methods
1. **UPI**: Unified Payments Interface
2. **Card**: Credit/Debit cards
3. **Net Banking**: Bank transfers
4. **Wallet**: Digital wallets
5. **Offline Cash**: Cash payment to driver

### Payment Flow
```
User selects payment method
    ↓
Payment details entered
    ↓
Payment processed (Razorpay)
    ↓
Payment success/failure
    ↓
If success:
    - Booking confirmed
    - Receipt generated
    - Notification sent
    - Driver/Owner notified
If failure:
    - User can retry
    - Alternative payment methods shown
```

### Platform Fee
- Default: 10% of booking amount
- Configurable by admin
- Deducted from total amount
- Driver/Owner receives: Total - Platform Fee

### Settlement Flow
```
Trip Completed
    ↓
Payment Status Check
    ↓
If Online Payment:
    - Amount in driver's inflow account
    - Driver requests settlement
    - Admin approves
    - Money transferred
If Offline Cash:
    - Amount in driver's outflow account
    - Driver pays platform fee
    - Settlement complete
```

---

## Document Verification

### When Documents are Required
- **Creating Pooling Offer**: Aadhar, License, User Photo, Vehicle Documents
- **Creating Rental Offer**: Aadhar, License, User Photo, Vehicle Documents
- **Booking Pooling**: Aadhar, License, User Photo (basic)
- **Booking Rental**: Aadhar, License, User Photo (basic)

### Verification Process
```
User uploads documents
    ↓
Documents stored (Cloudinary)
    ↓
Admin reviews documents
    ↓
Admin approves/rejects
    ↓
User notified
    ↓
If approved: Can use services
If rejected: Can re-upload
```

### Document Types
- **Personal**: Aadhar, Driving License, User Photo
- **Vehicle**: Registration, Insurance, Pollution Certificate, Photos
- **Company**: Registration Certificate, GST, Business License

---

## Chat & Messaging

### Chat Types
1. **Individual Chat**: One-on-one conversation
2. **Group Chat**: Multiple participants (pooling rides)

### Message Types
- Text messages
- Location sharing
- Images
- System messages

### Chat Flow
```
Booking Created
    ↓
Conversation Created
    ↓
Users can send messages
    ↓
Messages delivered (WebSocket)
    ↓
Read receipts updated
    ↓
Unread counts maintained
```

### Features
- Real-time messaging
- Read receipts
- Delivery status
- Chat history
- Unread message counts
- Group chat for pooling

---

## Notifications

### Notification Types
- Booking requests
- Booking confirmations
- Booking cancellations
- Payment received
- Rating requests
- Document verified/rejected
- Trip reminders
- Chat messages

### Notification Channels
- Push notifications (mobile app)
- In-app notifications
- Email notifications
- SMS notifications (optional)

### Notification Flow
```
Event Occurs (booking, payment, etc.)
    ↓
Notification Created
    ↓
Notification Sent to User
    ↓
User Receives Notification
    ↓
User Views Notification
    ↓
Notification Marked as Read
```

---

## Food Ordering

### How it Works
1. User has active booking (pooling/rental)
2. System shows route
3. System finds food vendors along route
4. Vendors grouped by intermediate locations
5. User filters by meal type
6. User selects vendor and orders
7. Order tracked until delivery

### Meal Types
- **Tiffin**: 6 AM - 11 AM
- **Lunch**: 11 AM - 4 PM
- **Dinner**: 4 PM - 11 PM
- **Breakfast**: Early morning
- **Snacks**: Anytime

### Order Flow
```
User selects "Book Food"
    ↓
Route displayed
    ↓
Vendors found along route
    ↓
User filters by meal type
    ↓
User selects vendor
    ↓
User places order
    ↓
Order confirmed
    ↓
Vendor prepares
    ↓
Order delivered
```

---

## Trip Tracking

### How it Works
1. Trip starts
2. Driver location updates every few seconds
3. Location stored in database
4. Passengers view driver location on map
5. Route displayed
6. ETA calculated
7. Trip progress tracked

### Tracking Features
- Real-time location updates
- Route visualization
- ETA calculation
- Location history (7 days)
- Driver and passenger locations

### Tracking Flow
```
Trip Starts
    ↓
Location Updates Begin
    ↓
Location Stored Every Few Seconds
    ↓
Passengers View Live Map
    ↓
Route Displayed
    ↓
ETA Updated
    ↓
Trip Completes
    ↓
Tracking Stops
```

---

## Rating & Reviews

### Rating Aspects
- Overall rating (1-5 stars)
- Punctuality
- Vehicle condition
- Driving skills
- Service quality

### Rating Flow
```
Trip Completed
    ↓
Rating Request Sent
    ↓
User Rates Experience
    ↓
Rating Saved
    ↓
Average Rating Updated
    ↓
Rating Visible on Profile
```

### Features
- Rate after trip completion
- Multiple rating aspects
- Written reviews
- Rating history
- Average rating calculation

---

## Admin Features

### User Management
- View all users
- Verify users
- Suspend users
- View user details
- View user transactions

### Offer Management
- View all pooling offers
- View all rental offers
- Approve/reject offers
- Suspend offers
- Flag suspicious offers

### Transaction Management
- View all transactions
- Filter transactions
- View transaction details
- Export transactions
- Generate reports

### Document Verification
- View pending documents
- Review documents
- Approve/reject documents
- Request additional documents

### Analytics & Reports
- User analytics
- Revenue analytics
- Service analytics
- Custom reports
- Export data

### Platform Settings
- Platform fee configuration
- Verification settings
- Notification settings
- System configuration

---

## Data Flow Overview

### User Registration Flow
```
Mobile App → Backend API → Database
    ↓
Phone Number → OTP Service → SMS Sent
    ↓
OTP Verification → User Created → JWT Token
    ↓
Token Stored → User Logged In
```

### Booking Flow
```
User Searches → Backend API → Database Query
    ↓
Offers Found → Displayed to User
    ↓
User Selects Offer → Payment Initiated
    ↓
Payment Gateway → Payment Processed
    ↓
Booking Created → Notifications Sent
    ↓
Chat Created → Users Can Communicate
```

### Trip Tracking Flow
```
Trip Starts → Location Updates Begin
    ↓
Mobile App → Backend API → Database
    ↓
Location Stored → WebSocket Broadcast
    ↓
Other Users Receive → Map Updated
    ↓
Trip Completes → Tracking Stops
```

### Payment Flow
```
User Selects Payment → Payment Details Entered
    ↓
Backend API → Razorpay Gateway
    ↓
Payment Processed → Status Updated
    ↓
Booking Confirmed → Receipt Generated
    ↓
Notifications Sent → Users Notified
```

### Document Upload Flow
```
User Uploads Document → Mobile App
    ↓
Backend API → Cloudinary Storage
    ↓
Document URL Stored → Database Updated
    ↓
Admin Reviews → Status Updated
    ↓
User Notified → Can Use Services
```

---

## Technical Architecture

### Backend
- **Framework**: Fastify (Node.js)
- **Database**: MongoDB
- **File Storage**: Cloudinary
- **Payment Gateway**: Razorpay
- **Real-time**: WebSocket
- **Authentication**: JWT
- **OTP Service**: Firebase/SMS

### Frontend (Mobile App)
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **State Management**: Context API
- **Language**: i18next (English, Telugu, Hindi)
- **Maps**: Expo Location
- **Notifications**: Expo Notifications

### Key Services
- **Auth Service**: User authentication
- **Booking Service**: Booking management
- **Payment Service**: Payment processing
- **Document Service**: Document management
- **Chat Service**: Messaging
- **Notification Service**: Notifications
- **Tracking Service**: Location tracking
- **Food Service**: Food ordering
- **Rating Service**: Ratings and reviews

### API Structure
- `/api/auth` - Authentication
- `/api/users` - User management
- `/api/pooling` - Pooling services
- `/api/rental` - Rental services
- `/api/bookings` - Booking management
- `/api/payments` - Payment processing
- `/api/documents` - Document management
- `/api/chat` - Messaging
- `/api/notifications` - Notifications
- `/api/tracking` - Location tracking
- `/api/food` - Food ordering
- `/api/ratings` - Ratings
- `/api/admin` - Admin operations

---

## Summary

YAARYATRA is a comprehensive ride-sharing and vehicle rental platform with the following key features:

1. **Pooling**: Share rides and split costs
2. **Rental**: Rent vehicles by the hour
3. **Food Ordering**: Order food along travel routes
4. **Real-time Tracking**: Track trips live
5. **Chat**: Communicate with drivers/passengers
6. **Payments**: Multiple payment methods
7. **Document Verification**: Secure document management
8. **Ratings**: Rate and review experiences
9. **Admin Panel**: Complete platform management
10. **Multi-language**: English, Telugu, Hindi support

The platform serves three main user types:
- **Individual Users**: Can offer and book services
- **Company Users**: Can manage vehicle fleets
- **Admin Users**: Can manage the entire platform

All features are integrated seamlessly to provide a complete travel and vehicle rental solution.

---

*Document Version: 1.0*  
*Last Updated: 2024*  
*Project: YAARYATRA - Ride Sharing & Vehicle Rental Platform*
