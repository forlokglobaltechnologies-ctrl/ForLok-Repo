# Forlok App — Complete Workflow Documentation

**Product:** Forlok — Carpooling, Rental & Logistics Platform
**Platform:** React Native (Mobile) + Fastify (Backend)
**Prepared from:** Full codebase analysis (March 2025)

---

## Table of Contents

1. [App Architecture Overview](#1-app-architecture-overview)
2. [Authentication Flow](#2-authentication-flow)
3. [Onboarding Flow](#3-onboarding-flow)
4. [Main Dashboard](#4-main-dashboard)
5. [Offer Services — Create a Ride](#5-offer-services--create-a-ride)
   - 5.1 [Create Pooling Offer](#51-create-pooling-offer)
   - 5.2 [Via Points & Intermediate Location Matching](#52-via-points--intermediate-location-matching)
   - 5.3 [Create Rental Offer](#53-create-rental-offer)
   - 5.4 [Create Load / Logistics Offer](#54-create-load--logistics-offer)
6. [Take Services — Search & Book a Ride](#6-take-services--search--book-a-ride)
   - 6.1 [Search Pooling](#61-search-pooling)
   - 6.2 [Intermediate / On-Route Passenger Matching](#62-intermediate--on-route-passenger-matching)
   - 6.3 [Pink Pooling (Her Pooling)](#63-pink-pooling-her-pooling)
   - 6.4 [Multi-Hop / Connected Rides](#64-multi-hop--connected-rides)
   - 6.5 [Search Rental](#65-search-rental)
7. [Booking & Confirmation Flow](#7-booking--confirmation-flow)
8. [Trip Tracking](#8-trip-tracking)
   - 8.1 [Passenger View](#81-passenger-view)
   - 8.2 [Driver View](#82-driver-view)
   - 8.3 [Payment at Trip End](#83-payment-at-trip-end)
9. [SOS Emergency System](#9-sos-emergency-system)
10. [Chat / Messaging](#10-chat--messaging)
11. [Wallet & Payments](#11-wallet--payments)
12. [Coins System](#12-coins-system)
    - 12.1 [Earning Coins](#121-earning-coins)
    - 12.2 [Redeeming Coins](#122-redeeming-coins)
13. [Ratings & Feedback](#13-ratings--feedback)
14. [Profile Management](#14-profile-management)
15. [Document Verification](#15-document-verification)
16. [Vehicle Management](#16-vehicle-management)
17. [Notifications](#17-notifications)
18. [Admin Dashboard](#18-admin-dashboard)
19. [Backend API Summary](#19-backend-api-summary)
20. [Terms & Conditions](#20-terms--conditions)
21. [Privacy Policy](#21-privacy-policy)

---

## 1. App Architecture Overview

### Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native (Expo) |
| Backend | Fastify (Node.js / TypeScript) |
| Database | MongoDB (Mongoose) |
| Maps / Routing | OSRM (Open Source Routing Machine) |
| Auth | JWT (Access + Refresh Tokens) + Firebase Phone Auth |
| Real-time | WebSocket (chat) |
| Storage | Cloud file upload (photos, documents) |

### Key Contexts (Mobile)

- **AuthContext** — manages login state, JWT tokens, auto-refresh
- **SOSContext** — tracks active booking ID, enables emergency alert button
- **LanguageContext** — multi-language support (i18n)
- **NotificationContext** — in-app push notification handling
- **ThemeContext** — light/dark theme
- **SnackbarContext** — global toast messages

### Navigation Structure

```
Splash
 ├── Onboarding (first-time users)
 ├── SignIn
 │    └── ForgotPassword / AdminLogin
 ├── SignUp
 └── MainDashboard (authenticated)
      ├── Bottom Tab: Home / Offer / Take / Profile
      ├── TripTracking
      ├── Wallet / EarnCoins
      ├── Chat / Conversation
      └── Admin screens (admin role only)
```

---

## 2. Authentication Flow

### 2.1 Sign Up

**Screen:** `SignUpScreen.tsx`
**API:** `POST /api/auth/signup`

1. User enters: **name**, **phone**, **email** (optional), **password**, **user type** (individual / company), optional **referral code**
2. Before signup, OTP is sent to phone: `POST /api/auth/send-otp` with `type: 'signup'`
3. User verifies OTP: `POST /api/auth/verify-otp`
4. On success, registration call creates user in MongoDB
5. Backend automatically credits **50 welcome coins** to new user
6. If a referral code was provided, **100 coins** are credited to the referrer
7. JWT access token + refresh token are returned
8. `AuthContext.login()` stores tokens in AsyncStorage and sets authenticated state

### 2.2 Sign In

**Screen:** `SignInScreen.tsx`
**API:** `POST /api/auth/signin`

1. User enters **username** (accepts: username / email / phone number) and **password**
2. On submit, `authApi.signin()` is called
3. Backend validates credentials, returns `{ user, tokens: { accessToken, refreshToken } }`
4. `AuthContext.login()` persists tokens and navigates to MainDashboard

### 2.3 Token Refresh

- Access tokens expire; the API client automatically calls `POST /api/auth/refresh-token` with the stored refresh token
- New tokens replace old ones transparently without forcing re-login

### 2.4 Forgot Password / Reset

**API:** `POST /api/auth/send-otp` (type: `reset_password`) → `POST /api/auth/verify-otp` → `POST /api/auth/reset-password`

1. User enters registered phone number
2. OTP sent to phone; user verifies
3. User sets a new password — takes effect immediately

### 2.5 Firebase Phone Auth (alternative)

**API:** `POST /api/auth/verify-firebase`
Firebase ID token (from Firebase SDK phone verification) is verified server-side as an alternative to OTP flow.

### 2.6 Sign Out

- `AuthContext.logout()` clears all tokens from AsyncStorage
- Navigation resets to Splash → SignIn

---

## 3. Onboarding Flow

**Screen:** `SplashScreen.tsx` → `OnboardingScreen`

1. On first launch, `SplashScreen` checks `@forlok_onboarding_seen` key in AsyncStorage
2. If **not seen** → navigate to Onboarding slides
3. If **seen but not logged in** → navigate directly to SignIn
4. If **authenticated** → navigate directly to MainDashboard (token restored from storage)

The splash screen also plays a letter-by-letter brand animation ("ForLok") while auth state resolves.

---

## 4. Main Dashboard

**Screen:** `MainDashboardScreen.tsx`
**API:** `GET /api/dashboard/...`

### What the Dashboard Shows

| Section | Description |
|---|---|
| Greeting + Avatar | User's name, profile photo |
| Location Bar | Current detected location (via `expo-location`) |
| Step Cards Carousel | 4-step ride guide: Search → Pick → Confirm → Enjoy |
| Coins Carousel | 3 rotating cards: Welcome Bonus, Refer & Earn, Social Reward |
| Quick Action Buttons | "Offer a Ride", "Take a Ride", "Wallet", "History" |
| Active Booking Banner | If user has an in-progress booking, a banner links to Trip Tracking |
| Nearby Offers | Pre-fetched nearby pooling offers |
| Recent Trips | Last few completed bookings |
| Notifications Bell | Unread notification count badge |

### Dashboard Data Flow

1. On focus, `dashboardApi.getSummary()` fetches: coin balance, active booking, recent trips
2. `placesApi` is called with current coordinates to resolve a readable location name
3. Notifications count badge is updated from `NotificationContext`
4. Coins carousel CTAs link to: Wallet (coins tab), EarnCoins screen, Share sheet

---

## 5. Offer Services — Create a Ride

**Screen:** `OfferServicesScreen.tsx`

The Offer Services hub presents two service cards:
- **Pooling** — share your daily commute
- **Rental** — offer your vehicle for hire (V2 feature, currently "coming soon")

---

### 5.1 Create Pooling Offer

**Screen:** `CreatePoolingOfferScreen.tsx`
**API:** `POST /api/pooling/offers`

#### Step-by-Step Flow

**Step 1 — Document Check**
- Before the form loads, backend is queried for uploaded documents
- Required documents for offering a ride: Driving License + Aadhar Card
- If missing → redirect to `DocumentVerification` screen

**Step 2 — Vehicle Selection**
- Fetches user's registered vehicles via `vehicleApi.getVehicles()`
- If a vehicle is "locked" (under review/dispute), it cannot be selected
- Driver selects the vehicle they will use for the ride

**Step 3 — Route Entry**
- Driver sets **From** and **To** locations using `LocationPicker` component
- The picker supports: text search (places API), current location button, map tap
- Once both locations are set, the app calls `poolingApi.suggestWaypoints(fromLat, fromLng, toLat, toLng)`

**Step 4 — Waypoint Selection (Intermediate Stops)**
- Backend generates and returns up to 5 suggested intermediate waypoints between From and To
- Waypoints are auto-generated by sampling the OSRM polyline at even intervals (10%–90% of route, skipping start/end zones)
- Each waypoint is reverse-geocoded to get a human-readable address
- Driver can select which suggested waypoints to include (max 5), or skip all
- Selected waypoints are ordered numerically along the route

**Step 5 — Trip Details**
- Date (calendar picker)
- Time (time picker, HH:mm format)
- Available seats (1–6)
- Optional notes (e.g. "No smoking", "Ladies only")
- Optional: Pink Pooling toggle (visible only for female drivers)

**Step 6 — Submit**
- Sends: `{ route: { from, to, waypoints }, date, time, vehicleId, availableSeats, notes, isPinkPooling? }`
- Backend service `poolingService.createOffer()`:
  1. Gets OSRM polyline between From and To
  2. Generates road segments from polyline
  3. Auto-generates additional waypoints if driver-provided count < minimum required
  4. Merges driver-selected and auto-generated waypoints
  5. Saves `PoolingOffer` document in MongoDB with `status: 'active'`
- On success, navigates back with a success snackbar

---

### 5.2 Via Points & Intermediate Location Matching

This is the core technical feature enabling intermediate passenger pickup.

#### What Via Points Are

Via points (waypoints) are GPS-labeled reference points **along** the driver's polyline between source (A) and destination (D). They are:
- **NOT** routing stops — the actual route and distance (A→D) never change
- **Metadata** — used only for passenger search matching

#### How They Are Generated

1. OSRM generates the road-following polyline (50–200+ GPS coordinates) between A and D
2. `generateAutoWaypoints()` samples the polyline at evenly spaced intervals (skipping first/last 10% of the route to avoid near-duplicate source/dest waypoints)
3. Each sampled point is reverse-geocoded to get a village/area name
4. Result: named reference points distributed along the actual road

#### Waypoint Count by Route Distance

| Route Distance | Minimum Waypoints |
|---|---|
| < 3 km | 1 |
| 3–10 km | 2 |
| 10–30 km | 3 |
| 30–100 km | 4 |
| 100–200 km | 5 |
| 200–400 km | 6 |
| > 400 km | 8 |

#### How Intermediate Passenger Matching Works

When a passenger at village B searches for a ride from B → C:
1. `isRouteOnPath()` checks whether B is within `maxDistanceKm` of the driver's polyline
2. The algorithm projects each polyline segment and calculates perpendicular distance from B to that segment
3. If B is within threshold → driver's route passes through or near B → match found
4. Same check applied to C (the passenger's destination)
5. Without a dense polyline, a straight 2-point line (A→D) would cause B to appear "off route" even if the road goes through it — this is why auto-waypoints and OSRM polylines are critical

---

### 5.3 Create Rental Offer

**Screen:** `CreateRentalOfferScreen.tsx`
**API:** `POST /api/rental/offers`

Rental offers allow vehicle owners to post their vehicle for hire.

**Fields:**
- Vehicle selection
- Available date range (start date / end date)
- Start and end times (HH:mm format)
- Price per hour
- Location (pickup address)
- Vehicle notes / terms

> **Note:** End Rental flow (`EndRentalScreen.tsx`) is marked as `RENTAL_COMING_SOON = true` and shows a "Coming Soon" Lottie animation. Full rental trip tracking is a V2 feature.

---

### 5.4 Create Load / Logistics Offer

**Screen:** Loads flow
**API:** `POST /api/loads/offers`
**Model:** `LoadOffer.ts`

Load/logistics allows users to offer a parcel delivery service or request parcel pickup.

**Parcel Details Captured:**
- Receiver name, phone, alternate phone
- Parcel category: documents / food / fragile / electronics / other
- Description, weight (kg), dimensions (cm), declared value
- Fragile flag

**OTP Verification Flow:**
- At pickup: driver marks "reached pickup", system generates `pickupOtp`
- Receiver verifies OTP → `pickupStatus: 'verified'`
- Photo proof can be uploaded for pickup and drop
- At drop: same OTP flow with `dropOtp` → `dropStatus: 'verified'`
- Booking only completes when both pickup and drop are verified

---

## 6. Take Services — Search & Book a Ride

**Screen:** `TakeServicesScreen.tsx`

The Take Services hub presents two options:
- **Take Pooling** — search for a shared ride
- **Take Rental** — search for a vehicle to rent

Both options check for required documents before proceeding:
- **Take Pooling**: Aadhar card required
- **Take Rental**: Aadhar card + Driving License required

If documents are missing, user is sent to `DocumentVerification` with a callback to resume navigation after upload.

---

### 6.1 Search Pooling

**Screen:** `SearchPoolingScreen.tsx` (TakeServices flow)
**API:** `GET /api/pooling/offers/connected-search`

#### Search Input

- From location (pickup point)
- To location (drop point)
- Date (calendar picker)
- Time (optional — defaults to ±1 hour window)
- Vehicle type filter (car / bike / any)
- Pink Only toggle (see section 6.3)

#### Search Execution

`poolingApi.searchConnectedOffers()` is called, which hits the connected-search endpoint. This returns both:
1. **Direct offers** — rides that can take the passenger all the way from A→B
2. **Connected rides** — two-hop rides where passenger transfers at a midpoint

#### Results Display

- Each result card shows: driver name/photo, vehicle info, departure time, available seats, estimated price
- Connected rides show both legs with transfer point and total journey time
- Filters available: sort by price / time / distance

---

### 6.2 Intermediate / On-Route Passenger Matching

When the passenger's pickup or drop is NOT the driver's exact source/destination:

**Backend matching logic (`poolingService.searchOffers()`):**

1. **Geo pre-filter**: Only considers offers whose source is within ±30km bounding box of passenger's search area
2. **Date/time filter**: Offer date matches; time within ±1 hour of passenger's requested time
3. **Route matching**: `isRouteOnPath(passengerFrom, passengerTo, offer.route.polyline, maxDistanceKm)` — checks both passenger pickup and drop against driver's polyline
4. **Seat availability**: Offer's remaining seats ≥ passenger's requested seats
5. **Pink filter**: If `pinkOnly=true`, only return offers where `isPinkPooling: true && driverGender: 'Female'`

Passenger pickup and drop segments are stored on the Booking record (`passengerPickupSegment`, `passengerDropSegment`) with `roadId`, coordinates, and estimated arrival time.

---

### 6.3 Pink Pooling (Her Pooling)

Pink Pooling is a female-only ride sharing feature for safety.

**How it works:**
- Only female drivers (verified `gender: 'Female'` in profile) can create Pink Pooling offers
- Toggle `isPinkPooling: true` is available only to female drivers in the create offer form
- Server-side validation: if `isPinkPooling: true` and driver's gender is not Female, the offer is rejected with `GENDER_RESTRICTION` error
- Passenger search: toggle "Pink Only" filter → `pinkOnly: true` query parameter
- Backend filters: `isPinkPooling: true AND driverGender: 'Female'`
- Result: female passengers can find rides exclusively with female drivers

**Data stored on PoolingOffer:**
```
isPinkPooling: Boolean
driverGender: 'Male' | 'Female' | 'Other'
```

---

### 6.4 Multi-Hop / Connected Rides

For routes where no single driver covers the full journey (e.g. village A → city C when no one goes directly), connected rides find a two-leg route.

**API:** `GET /api/pooling/offers/connected-search`
**Service method:** `poolingService.searchConnectedOffers()`

#### How Connected Search Works

1. **Leg 1 search**: Find offers from passenger origin (A) that pass through or near an intermediate city (B)
2. **Leg 2 search**: From each intermediate city B found, search for offers going to final destination (C)
3. **Pair validation**: Both legs must be available on the same date with compatible times (Leg 2 departure ≥ Leg 1 arrival + buffer time)
4. **Transfer point**: The geographic intersection between Leg 1's route and Leg 2's start

**Booking connected rides:**
- Two separate bookings are created, linked by a `connectedGroupId`
- Each booking has a `legOrder` (1 or 2) and `connectionPoint` (the transfer location)
- Total price = Leg 1 price + Leg 2 price

**Display:**
- Connected ride results show both legs with the transfer point address
- Estimated total journey time includes layover at transfer point

---

### 6.5 Search Rental

**Screen:** `SearchRentalScreen.tsx`
**API:** `GET /api/rental/offers/search`

- User enters: location, date range, vehicle type preference
- Results show available vehicles with: owner info, vehicle details, price per hour, availability calendar
- Passenger selects a rental offer, chooses pickup/drop times, and proceeds to booking

---

## 7. Booking & Confirmation Flow

**API:** `POST /api/bookings`

### Pooling Booking Steps

1. **Passenger selects offer** from search results
2. **Price Calculation**: `POST /api/pooling/calculate-price` with passenger's specific pickup/drop coordinates
   - Price is calculated based on the passenger's actual travel distance within the driver's route (not the full driver route distance)
   - Dynamic pricing considers: vehicle type, time of day, demand
3. **Co-passenger details**: Passenger can optionally add co-passenger names, ages, and genders
4. **Coin discount**: Passenger can choose to use coins for a discount (if balance available)
5. **Booking creation**:
   - `status: 'pending'` (waiting for driver confirmation) or `status: 'confirmed'` (auto-confirm)
   - `bookingId` and `bookingNumber` (display ID like `#YA20240115001`) generated
   - `paymentStatus: 'pending'` — payment not collected yet
6. **Driver notification**: Push notification sent to driver about new booking request
7. **Booking confirmation**: Driver accepts → `status: 'confirmed'`; booking card appears on passenger's dashboard

### Booking Data Model

| Field | Description |
|---|---|
| `bookingId` | Unique system ID |
| `bookingNumber` | Human-readable ID (e.g. #YA20240115001) |
| `userId` | Passenger user ID |
| `serviceType` | `pooling` / `rental` / `loads` |
| `poolingOfferId` | Reference to the pooling offer |
| `route` | Passenger-specific pickup/drop with polyline |
| `amount` | Base fare |
| `platformFee` | Forlok platform fee |
| `totalAmount` | amount + platformFee |
| `coinsUsed` | Coins applied as discount |
| `finalPayableAmount` | After coin discount |
| `paymentMethod` | Set at trip end (upi / cash / wallet) |
| `passengerStatus` | `waiting` → `got_in` → `got_out` |
| `status` | `pending` → `confirmed` → `in_progress` → `completed` |

---

## 8. Trip Tracking

**Screen:** `TripTrackingScreen.tsx`
**APIs:** `trackingApi`, `bookingApi`, `coinApi`

### 8.1 Passenger View

Once a booking is confirmed, the passenger can open Trip Tracking which shows:

| Element | Description |
|---|---|
| Map WebView | Live driver location on map (OpenStreetMap via HTML/JS) |
| Driver Card | Driver name, photo, vehicle number, phone call button |
| ETA | Estimated time until driver reaches passenger |
| Distance | Remaining distance to passenger |
| Chat Button | Opens in-app chat with driver |
| SOS Button | Emergency alert (see Section 9) |
| Trip Status | Current phase: Driver en-route / You're on board / Arrived |

**Live Tracking:**
- `trackingApi.getDriverLocation(bookingId)` is called on an interval (every ~10 seconds)
- Driver location updates are reflected on the map in real time
- ETA and distance are recalculated each update

**Status Transitions:**
- `passengerStatus: 'waiting'` → driver hasn't reached yet
- `passengerStatus: 'got_in'` → driver marked passenger as boarded
- `passengerStatus: 'got_out'` → driver marked passenger as dropped off → triggers payment flow

### 8.2 Driver View

During an active trip, the driver's interface shows:
- All confirmed passengers on this offer (names, pickup/drop points)
- Passenger verification: when passenger boards, driver marks them as "Got In"
- When driver reaches destination, marks passenger as "Got Out"
- OTP-based verification (for loads): driver verifies pickup OTP from receiver

### 8.3 Payment at Trip End

When `passengerStatus` transitions to `got_out`:

1. **Payment Choice Modal** appears on passenger's screen
2. Passenger selects payment method:
   - **UPI** — opens payment gateway flow
   - **Offline Cash** — marks paid in cash (no online transaction)
   - **Wallet** — deducts from Forlok wallet balance
3. Coin discount is applied to `finalPayableAmount` if coins were used at booking
4. On payment confirmation:
   - `paymentStatus: 'paid'`
   - `status: 'completed'`
5. **Coin Celebration** modal appears: Lottie animation + coins earned message
6. Trip completion triggers coin credit for the ride

**Passenger Verification Code:**
- After the passenger marks payment, a 4-digit `passengerCode` is generated
- Passenger shows this code to driver to confirm trip completion
- Prevents disputes about whether payment was made

---

## 9. SOS Emergency System

**Context:** `SOSContext` (active on every screen during a trip)
**API:** `POST /api/sos/trigger`, `GET /api/sos/history`

### How SOS Works

1. **Activation**: SOSContext sets `activeBookingId` whenever a TripTracking screen is mounted
2. **Trigger**: User taps the SOS button (visible during active trips)
3. **Data sent**: `{ location: { lat, lng }, bookingId? }`
4. **Backend actions**:
   - Creates an SOS record linked to the booking
   - Sends an **email alert** to the Forlok safety team with passenger name, location, and booking details
   - Stores SOS history for audit
5. **SOS History**: Users can view past SOS events via `GET /api/sos/history`

### SOS Availability

- The SOS button is accessible from TripTracking screen
- SOSContext ensures the active booking ID is available app-wide during a trip
- On trip completion (`clearActiveBooking()`), SOS context is cleared

---

## 10. Chat / Messaging

**API:** WebSocket (`/ws/chat`), REST (`/api/chat/...`)
**Backend Routes:** `conversation.routes.ts`, `message.routes.ts`

### Features

- Real-time messaging between driver and passenger for an active booking
- Conversation is created when a booking is confirmed
- Messages are persisted in `Conversation` and `Message` MongoDB collections
- WebSocket connection is established when chat screen opens; closes on exit
- Unread message count shown in notification badge

### Chat Flow

1. Passenger or driver taps "Message" icon on TripTracking or booking card
2. `chatApi.getOrCreateConversation(bookingId)` opens or creates the conversation
3. Previous messages loaded via REST; new messages sent/received over WebSocket
4. Messages include: text, timestamp, sender ID, read status

---

## 11. Wallet & Payments

**Screen:** `WalletScreen.tsx`
**API:** `walletApi`, `coinApi`
**Routes:** `/api/wallet/...`

### Wallet Features

The Wallet screen has two tabs: **Wallet** and **Coins**.

#### Wallet Tab

| Feature | Description |
|---|---|
| Wallet Balance | Current spendable balance (INR) |
| Top Up | Add money to wallet (opens Top Up modal with preset amounts) |
| Transaction History | Chronological list of credits and debits |
| Transaction Types | `credit` (money added) / `debit` (money spent) |
| Status per transaction | `pending` / `completed` / `failed` |

**Top Up Flow:**
1. User enters amount or selects preset (e.g. ₹100, ₹500, ₹1000)
2. Calls `walletApi.topUp(amount)` → initiates payment gateway
3. On payment success, wallet balance updates immediately

#### Withdrawal

- Drivers can request settlement/withdrawal of earnings
- **Settlement Flow**: Driver requests settlement → admin approves → amount transferred
- Settlement statuses: `pending` → `driver_requested` → `admin_approved` → `settled` / `rejected`
- `driverSettlementAmount` = totalAmount − platformFee

#### Payment Methods Supported

- UPI
- Card
- Wallet (Forlok wallet balance)
- Net Banking
- Offline Cash

---

## 12. Coins System

The Forlok Coins system is a loyalty and rewards program.

### 12.1 Earning Coins

**Screen:** `EarnCoinsScreen.tsx`
**API:** `coinApi`, `referralApi`, `promoApi`

| Method | Coins Earned | Details |
|---|---|---|
| Sign Up (Welcome Bonus) | 50 coins | Automatically credited at registration |
| Referral | 100 coins | Per friend who signs up using your code and completes their first ride |
| Complete a Ride | Variable | Coins credited on trip completion (shown in coin celebration modal) |
| Ride Milestones | Bonus | Milestone rewards (e.g., 10th ride, 50th ride) |
| Social Media Promo | Variable | Post Instagram story / reel or YouTube short about Forlok, submit proof URL |

**Referral Flow:**
1. User finds their unique referral code on EarnCoins screen
2. Shares code via the system Share sheet or copies it
3. New user enters referral code during sign up
4. After new user completes their first ride, 100 coins credited to referrer
5. Referral stats show: total referrals, pending, completed, total coins earned

**Social Promo Flow:**
1. User selects platform: Instagram Story, Instagram Reel, or YouTube Short
2. User posts content and submits the URL as proof
3. Admin reviews and approves the submission
4. Coins credited on approval

### 12.2 Redeeming Coins

**Where coins can be used:** Booking payment flow

1. At booking confirmation, user sees their coin balance and maximum applicable discount
2. Toggle "Use Coins" → system calculates:
   - `maxCoins`: how many coins can be applied (capped at a percentage of ride price)
   - `maxDiscount`: maximum INR discount from coins
   - `discountedAmount`: final payable amount after discount
3. `coinsUsed` and `coinDiscountAmount` stored on the Booking record
4. At trip end, coin balance is debited accordingly

**Coin Value:** 1 coin = some fraction of 1 INR (configurable server-side)

---

## 13. Ratings & Feedback

**API:** `/api/ratings/...`
**Screen:** `RatingModal` (common component)

### Rating Flow (After Trip Completion)

1. After trip status becomes `completed`, a rating prompt appears
2. **Passenger rates driver**: 1–5 stars + optional comment
3. **Driver rates passenger**: 1–5 stars + optional comment
4. Ratings are stored and averaged into user profiles
5. Average rating displayed on: profile screen, search results, trip tracking card

### Feedback & Bug Reporting

- **FeedbackScreen**: General feedback form (text + optional screenshot)
- **ReportBugScreen**: Bug report with category, description, and device info
- Both submit to backend for admin review

---

## 14. Profile Management

**Screen:** `ProfileScreen.tsx`
**API:** `userApi`, `documentApi`, `vehicleApi`, `uploadFile`

### Profile Sections

| Section | Details |
|---|---|
| Avatar | Upload from camera or gallery (`expo-image-picker`), uploaded to cloud |
| Personal Info | Name, phone, email, date of birth, gender |
| Statistics | Total rides offered, rides taken, average rating, total earnings |
| Vehicles | List of registered vehicles with status badges |
| Documents | Verification status (Aadhar, License, etc.) |
| Coin Balance | Quick view with link to Wallet |
| Settings | Language, theme, notifications |
| Logout | Confirmation modal before sign out |

### Edit Profile

**Screen:** `EditProfileScreen.tsx`

- User can update: display name, email, bio, home/work location
- Changes call `userApi.updateProfile()`

### Blocked Users

**Screen:** `BlockedUsersScreen.tsx`
**API:** `/api/block/...`

- Users can block other users they have interacted with
- Blocked users cannot see or book the blocker's offers
- Block modal accessible from booking/trip screens
- Blocked users list shows in Profile → Settings

---

## 15. Document Verification

**Screen:** `DocumentVerification` (accessed from TakeServices, OfferServices, Profile)
**API:** `documentApi`, `/api/documents/...`

### Required Documents by Service

| Service | Required Documents |
|---|---|
| Take Pooling (passenger) | Aadhar Card |
| Take Rental (passenger) | Aadhar Card + Driving License |
| Offer Pooling (driver) | Aadhar Card + Driving License |
| Offer Rental (owner) | Aadhar Card + Vehicle Registration |

### Document Upload Flow

1. User selects document type
2. Captures/selects image (front + back if needed)
3. `documentApi.uploadDocument(type, imageUri)` uploads file and creates document record
4. Document status: `pending` → `verified` / `rejected` (admin reviews)
5. Only documents with `status: 'verified'` count as complete
6. `hasAllRequiredDocuments(serviceType, documents)` checks completeness before allowing access

---

## 16. Vehicle Management

**Screen:** `AddVehicleScreen.tsx`, `VehicleDetailsScreen.tsx`
**API:** `vehicleApi`, `/api/vehicles/...`

### Add Vehicle

1. User enters: vehicle type (car / bike / scooty), brand, model, registration number, color, year
2. Optionally uploads vehicle registration document photo
3. Vehicle created with `status: 'active'` (or `pending` if registration needs review)
4. Vehicle appears in the vehicle selector when creating pooling/rental offers

### Vehicle Lock/Unlock

- Admin can lock a vehicle (e.g. if registration is disputed)
- Locked vehicles display a badge and cannot be selected for new offers
- Driver is notified when a vehicle is locked/unlocked

---

## 17. Notifications

**Screen:** Push notification handling + in-app notification center
**API:** `/api/notifications/...`
**Context:** `NotificationContext`

### Notification Types

| Event | Notification |
|---|---|
| New booking request | Driver receives: "New booking request for your ride" |
| Booking confirmed | Passenger receives: "Your booking is confirmed!" |
| Driver en-route | Passenger receives: "Your driver is on the way" |
| Trip started | Both receive trip start confirmation |
| Trip completed | Both receive: "Trip completed. Rate your experience." |
| Coin credited | "You earned X coins!" |
| Payment received | Driver: "Payment of ₹X received for booking #..." |
| SOS triggered | Admin/safety team email alert |
| Document verified | "Your document has been verified" |

---

## 18. Admin Dashboard

**Screen:** `AdminDashboardScreen.tsx`, `AdminLoginScreen.tsx`
**API:** `/api/admin/...`, `/api/admin/analytics/...`

### Admin Login

- Separate admin login pill on SignIn screen (top-right corner)
- Admin credentials are separate from user accounts
- `POST /api/admin/auth/signin`

### Admin Capabilities

| Feature | Description |
|---|---|
| User Management | View all users, details, verification status |
| Booking Overview | All bookings with filters by status/date/service type |
| Document Review | Approve / reject submitted documents |
| Vehicle Review | Approve / lock / unlock vehicles |
| Settlement Approval | Review driver settlement requests and approve/reject |
| SOS Alerts | View all triggered SOS events with location/booking data |
| Promo Submissions | Review and approve social media proof submissions |
| Analytics | Revenue, ride counts, user growth, platform fee totals |
| Refund Management | Process refunds for cancelled / disputed bookings |
| Withdrawal Management | Process driver withdrawal requests |

---

## 19. Backend API Summary

### Auth — `/api/auth/`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/send-otp` | Send OTP to phone or email |
| POST | `/verify-otp` | Verify OTP |
| POST | `/verify-firebase` | Verify Firebase phone auth token |
| POST | `/signup` | Register new user |
| POST | `/signin` | Login with username + password |
| POST | `/refresh-token` | Refresh JWT access token |
| POST | `/reset-password` | Reset password after OTP verification |

### Pooling — `/api/pooling/`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/offers` | Create pooling offer |
| GET | `/offers` | Get driver's own offers |
| GET | `/offers/:offerId` | Get single offer details |
| GET | `/offers/search` | Search offers by coordinates + filters |
| GET | `/offers/connected-search` | Search direct + multi-hop offers |
| GET | `/offers/nearby` | Get offers near a coordinate |
| PUT | `/offers/:offerId` | Update offer |
| DELETE | `/offers/:offerId` | Cancel/delete offer |
| POST | `/calculate-price` | Calculate price for passenger route |
| GET | `/suggest-waypoints` | Get suggested waypoints for a route |
| POST | `/migrate-polylines` | Backfill polylines on existing offers |

### Bookings — `/api/bookings/`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Create booking |
| GET | `/` | Get user's bookings |
| GET | `/:bookingId` | Get booking details |
| PATCH | `/:bookingId/status` | Update booking status |
| POST | `/:bookingId/cancel` | Cancel booking |
| POST | `/:bookingId/payment` | Record payment |

### SOS — `/api/sos/`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/trigger` | Trigger SOS alert |
| GET | `/history` | Get SOS event history |

### Wallet — `/api/wallet/`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/balance` | Get wallet balance |
| POST | `/topup` | Add money to wallet |
| GET | `/transactions` | Get transaction history |

### Coins — `/api/coins/`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/balance` | Get coin balance |
| GET | `/transactions` | Get coin transaction history |
| GET | `/milestones` | Get milestone progress |

### Other APIs

| Domain | Base Path | Key Endpoints |
|---|---|---|
| Vehicles | `/api/vehicles/` | CRUD vehicles |
| Documents | `/api/documents/` | Upload, list, verify documents |
| Tracking | `/api/tracking/` | Update/get driver location |
| Rental | `/api/rental/` | Rental offer CRUD + search |
| Loads | `/api/loads/` | Load offer CRUD + OTP verification |
| Ratings | `/api/ratings/` | Submit and fetch ratings |
| Referrals | `/api/referrals/` | Get referral code, stats |
| Promos | `/api/promos/` | Submit and view social proofs |
| Chat | `/api/chat/` | Conversations, messages |
| Notifications | `/api/notifications/` | List notifications, mark read |
| Withdrawals | `/api/withdrawals/` | Request and track driver withdrawals |
| Refunds | `/api/refund/` | Request and process refunds |
| Block | `/api/block/` | Block/unblock users |
| Places | `/api/places/` | Location autocomplete and reverse geocoding |
| Dashboard | `/api/dashboard/` | Aggregated dashboard summary |
| Admin | `/api/admin/` | All admin management endpoints |

---

---

## 20. Terms & Conditions

**Screen:** `TermsConditionsScreen.tsx` (accessible from Profile → Settings)
**Effective:** January 2024
**Company:** Forlok Technologies Pvt. Ltd., Hyderabad, Telangana, India

### Introduction

By downloading, installing, or using the Forlok mobile application, you agree to be bound by these Terms and Conditions. These Terms constitute a legally binding agreement between the User and Forlok Technologies Pvt. Ltd.

---

### Section 1 — Acceptance of Terms

By downloading, installing, or using the Forlok mobile application ("App"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, please do not use the App.

These Terms constitute a legally binding agreement between you ("User") and Forlok Technologies Pvt. Ltd. ("Company", "we", "us", or "our"), a company registered under the laws of India with its registered office in Hyderabad, Telangana.

---

### Section 2 — User Eligibility & Registration

To use Forlok, you must:

- Be at least 18 years of age
- Possess a valid government-issued ID (Aadhaar, PAN, Driving License, etc.)
- Provide accurate and complete registration information
- Maintain the security of your account credentials

Drivers must additionally hold a valid Indian driving license appropriate for the vehicle type and have valid vehicle registration and insurance documents. All driver documents are subject to verification before service activation.

---

### Section 3 — Pooling Services

Forlok's pooling service connects drivers with passengers traveling in similar directions. By using pooling services:

- Drivers agree to offer available seats on their pre-planned routes
- Passengers agree to share the ride with other verified users
- The fare is calculated based on distance, route, and number of seats
- Drivers must adhere to the declared route and pickup/drop-off points
- Cancellation policies apply as defined in the App for each booking
- Forlok acts as an intermediary platform and is not a transportation provider

---

### Section 4 — Rental Services

Forlok's rental service allows users to rent vehicles for personal or commercial use. By using rental services:

- The renter must provide a valid driving license and identity proof
- Vehicles must be returned in the same condition as received
- Fuel charges, toll fees, and any fines incurred are the renter's responsibility
- Insurance coverage is provided as per the vehicle's existing policy
- The security deposit is refundable upon satisfactory vehicle return
- Any damage beyond normal wear and tear will be charged to the renter

---

### Section 5 — Payments & Pricing

All payments on the Forlok platform are processed securely:

- Fares and rental charges are displayed before booking confirmation
- Payment methods include UPI, debit/credit cards, net banking, and Forlok Wallet
- Forlok charges a service fee (commission) on each transaction
- Drivers receive payouts after deduction of the platform commission
- All prices are in Indian Rupees (INR) and inclusive of applicable GST
- Refunds are processed within 5–7 business days to the original payment method
- Surge pricing may apply during peak demand periods

---

### Section 6 — Safety & Conduct

All users must adhere to safety standards and respectful conduct:

- Follow all applicable traffic rules and regulations
- Maintain a respectful and courteous attitude towards co-passengers
- Do not transport illegal substances, weapons, or hazardous materials
- Wear seatbelts at all times during the ride
- Report any safety concerns immediately through the in-app SOS feature
- Do not discriminate against users based on caste, religion, gender, or region
- Drivers must not operate vehicles under the influence of alcohol or drugs

---

### Section 7 — Prohibited Activities

The following activities are strictly prohibited on the Forlok platform:

- Creating fake or duplicate accounts
- Manipulating reviews, ratings, or booking data
- Circumventing the platform to arrange off-app transactions
- Harassing, threatening, or abusing other users
- Using the platform for any unlawful purpose
- Sharing account credentials with third parties
- Tampering with fare calculations or GPS data

Violation of these rules may result in immediate account suspension or termination.

---

### Section 8 — Cancellation & Refund Policy

**Pooling:**
- Free cancellation up to 30 minutes before departure time
- Cancellation within 30 minutes incurs a fee of up to 20% of the fare
- No-shows are charged the full fare amount

**Rentals:**
- Free cancellation up to 24 hours before the rental period
- Cancellation within 24 hours incurs a fee of up to 25% of the rental amount
- Refund for unused days is subject to a processing fee

Forlok reserves the right to modify cancellation policies with prior notice.

---

### Section 9 — Limitation of Liability

To the maximum extent permitted by applicable Indian law:

- Forlok is a technology platform and not a transportation company
- We do not guarantee availability, punctuality, or quality of rides
- We are not liable for any personal injury, property damage, or loss during rides
- Our total liability shall not exceed the amount paid for the specific service
- We are not responsible for actions of third-party drivers or passengers
- Force majeure events (natural disasters, strikes, etc.) absolve liability

---

### Section 10 — Governing Law & Disputes

These Terms are governed by and construed in accordance with the laws of India:

- Any disputes shall be subject to the exclusive jurisdiction of courts in Hyderabad, Telangana
- Disputes shall first be attempted to be resolved through mediation
- If mediation fails, arbitration under the Arbitration and Conciliation Act, 1996 shall apply
- The language of arbitration shall be English
- Consumer complaints can be filed with the National Consumer Disputes Redressal Commission as applicable

---

### Section 11 — Modifications to Terms

Forlok reserves the right to modify these Terms at any time:

- Users will be notified of material changes via email or in-app notifications
- Continued use of the App after changes constitutes acceptance
- Users who disagree with updated Terms should discontinue use
- Previous versions of Terms are available upon request

**Contact:** legal@forlok.com

---

## 21. Privacy Policy

**Screen:** `PrivacyPolicyScreen.tsx` (accessible from Profile → Settings)
**Last Updated:** January 2024
**Governing Law:** Information Technology Act, 2000 and Digital Personal Data Protection Act, 2023 of India

### Introduction

Forlok Technologies Pvt. Ltd. respects your privacy and is committed to protecting the personal information you share with us. This Privacy Policy explains what data we collect, how we use it, and the choices you have regarding your information. It applies to all users of the Forlok mobile application and related services.

---

### Section 1 — Information We Collect

**Personal Information:**
- Full name, email address, phone number
- Profile photo and date of birth
- Government-issued ID (Aadhaar, PAN, Driving License) for verification
- Bank account or UPI details for payment processing

**Vehicle Information (Drivers):**
- Driving license details and expiry
- Vehicle registration number, make, model, and year
- Vehicle insurance and fitness certificate details

**Usage Information:**
- Ride history, booking details, and transaction records
- In-app communications and support tickets
- App usage patterns and feature interactions

---

### Section 2 — Location Data

Location data is essential for our ride-sharing and rental services:

- We collect precise GPS location when the app is in use
- Background location is collected during active trips for safety and navigation
- Pickup and drop-off locations are stored for ride matching
- Location history is used to suggest frequently visited places
- You can disable location services in your device settings, but this may limit core app functionality

We do not sell your location data to third parties. Location data is retained only as long as necessary for service delivery and regulatory compliance.

---

### Section 3 — How We Use Your Information

Your information is used for the following purposes:

- Matching drivers and passengers for pooling rides
- Processing payments and facilitating transactions
- Verifying user identity and driver credentials
- Providing customer support and resolving disputes
- Sending booking confirmations, ride alerts, and receipts
- Improving our matching algorithms and route optimization
- Detecting and preventing fraud, spam, and abuse
- Complying with legal obligations and regulatory requirements
- Personalizing the app experience based on preferences

---

### Section 4 — Information Sharing

**With Other Users:**
- Your first name and profile photo are visible to ride partners
- Drivers see pickup/drop-off locations for booked passengers
- Your phone number may be shared temporarily during an active ride

**With Service Providers:**
- Payment processors (Razorpay, PhonePe) for transaction handling
- Cloud service providers (AWS) for data storage
- SMS and notification providers for communications
- Map services (Google Maps) for navigation

**With Authorities:**
- When required by law, court order, or government request
- To protect the safety of users and the public

---

### Section 5 — Data Security

We implement robust security measures to protect your data:

- All data transmitted between the app and servers is encrypted using TLS 1.3
- Sensitive data (passwords, payment info) is encrypted at rest using AES-256
- We conduct regular security audits and vulnerability assessments
- Access to user data is restricted to authorized personnel only
- Multi-factor authentication is available for account security
- We maintain compliance with PCI-DSS for payment card data
- Automated threat detection systems monitor for suspicious activities

While we strive to protect your data, no method of transmission over the internet is 100% secure.

---

### Section 6 — Device Permissions

The Forlok app requests the following device permissions:

| Permission | Purpose |
|---|---|
| Location | Required for ride matching, navigation, and live tracking |
| Camera | For profile photo upload and document scanning |
| Storage | For caching map data and saving receipts |
| Notifications | For ride updates, payment alerts, and messages |
| Phone | For direct calling between driver and passenger during rides |
| Contacts | Optional — for inviting friends and earning referral rewards |

You can manage permissions through your device settings at any time.

---

### Section 7 — Cookies & Analytics

We use cookies and analytics tools to improve our services:

- Session cookies to maintain your login state
- Preference cookies to remember your language and theme settings
- Analytics cookies (Google Analytics, Firebase) for usage insights
- Crash reporting tools (Sentry) for bug detection and fixes

We do not use cookies for cross-site advertising or tracking. You can disable non-essential cookies in the app settings.

---

### Section 8 — Data Retention & Deletion

| Data Type | Retention Period |
|---|---|
| Account data | Active period + 90 days after deletion |
| Transaction records | 7 years (Indian tax law requirement) |
| Ride history | 3 years (dispute resolution) |
| KYC documents | Per RBI and government regulations |
| Communication logs | 1 year |

**To request data deletion:**
- Use the "Delete Account" option in Settings
- Email privacy@forlok.com with your registered details

Deletion requests are processed within 30 days, subject to legal retention requirements.

---

### Section 9 — Children's Privacy

Forlok is not intended for users under the age of 18:

- We do not knowingly collect information from children under 18
- If we discover that a child under 18 has provided personal information, we will delete it immediately
- Parents or guardians who believe their child has provided information should contact privacy@forlok.com

---

### Section 10 — Updates to This Policy

We may update this Privacy Policy from time to time:

- Material changes will be communicated via email or in-app notification
- Continued use of the app after changes constitutes acceptance
- Previous versions of this policy are available upon request
- The "Last Updated" date reflects the most recent revision

---

### Your Rights Under Indian Data Protection Law

| Right | Description |
|---|---|
| Right to Access | Request a copy of your personal data |
| Right to Rectify | Correct inaccurate or incomplete data |
| Right to Delete | Request deletion of your personal data |
| Right to Restrict | Limit how your data is processed |
| Right to Portability | Receive your data in a portable format |
| Right to Object | Object to certain processing activities |

**Data Protection Officer Contact:** privacy@forlok.com

---

*Document generated from full codebase analysis of Forlok Technologies Pvt Ltd repository.*
*© 2024 Forlok Technologies Pvt. Ltd. All rights reserved. Registered in Hyderabad, Telangana, India.*
