# eZway App - Features and Workflow Guide

## Overview

eZway is a mobility platform with multiple service modes and role-based experiences:

- Ride-Sharing (offer and take)
- Loads (parcel/cargo movement with OTP milestones)
- Rental modules (present in app structure, currently marked as coming soon in major user flows)
- Wallet and payment settlement
- Document verification and eligibility checks
- In-app chat, trip tracking, notifications, and admin operations

The system includes:

- A React Native mobile app for end users and admins
- A backend API + WebSocket layer for authentication, booking lifecycle, communication, and payments

This README focuses on product behavior and user workflows only. It intentionally avoids code details.

---

## User Roles and Access

### Individual user
- Can search and book Ride-Sharing trips
- Can create ride-sharing offers
- Can search and book loads (when loads feature is enabled)
- Can access profile, documents, wallet, booking history, and chat

### Company user
- Has a separate dashboard path in app routing
- Company-specific history/dashboard surfaces exist
- Some company paths use mock/placeholder data in current build

### Admin user
- Uses dedicated admin login flow
- Accesses admin dashboard for moderation, operations, and analytics

---

## Main App Navigation

After authentication, standard users use a tab-based app:

- `Take`: find and book services
- `Offer`: create services
- `Home`: dashboard with shortcuts and status cards
- `Loads`: load search and booking (shown only when loads feature flag is on)
- `Profile`: profile, documents, wallet, settings, history support paths

Additional flows open through stack navigation, including booking confirmation, tracking, chat, and admin screens.

---

## Core Features

## 1) Authentication and Account Entry

- On first open, users go through onboarding, then sign-in/sign-up
- Returning users are routed by saved session state
- Backend supports OTP flows, standard sign-up/sign-in, token refresh, and password reset
- Login supports role-based routing (admin/company/standard user)

### Workflow
1. User opens app
2. App checks onboarding + auth status
3. User signs in or signs up
4. Session is created
5. App routes user to role-appropriate dashboard

---

## 2) Document Verification and Eligibility

eZway gates some services behind document readiness checks.

- Document checks run when user attempts a gated action
- Required document list changes by service type
- Users can upload/manage documents and view verification progress
- Backend supports both number-based verification (for supported IDs) and file upload records

### Workflow
1. User starts a service flow (for example: creating an offer)
2. App checks document eligibility
3. If incomplete, user is redirected to document verification
4. User uploads/verifies required documents
5. User returns to service flow and continues

---

## 3) Ride-Sharing - Take a Ride

Users can search available rides, view details, and book.

- Search and filter ride-sharing options
- View route, timing, price, and provider details
- Confirm booking and move into active trip journey
- Post-booking communication is supported via conversation flow

### Workflow
1. User enters `Take` flow
2. User searches/selects a ride-sharing option
3. User reviews ride details
4. User sees fare summary and confirms booking
5. Booking confirmation screen appears
6. During active ride, tracking and communication features are available
7. Trip completes with payment/settlement steps

---

## 4) Ride-Sharing - Offer a Ride

Users can publish ride-sharing offers and manage them.

- Create ride-sharing offer with route/time/capacity/pricing details
- Offer appears in discoverable listings
- Booking lifecycle updates seat and status automatically
- Offer owners can monitor progress through app surfaces

### Workflow
1. User enters `Offer` flow
2. User fills ride-sharing offer details
3. Offer is submitted and stored
4. Other users discover and book
5. Offer state updates as bookings progress and trip completes

---

## 5) Loads - Search, Book, and Deliver

Loads is a dedicated flow for parcel/cargo movement and has its own tracking milestones.

- Search available loads
- Review load details and pricing
- Confirm booking
- Execute milestone-driven tracking flow with OTP verification
- Complete delivery with payment finalization

### Workflow
1. User opens `Loads` tab (if enabled)
2. User searches and selects a load
3. User reviews load details and fare summary
4. User confirms booking
5. In tracking flow, operational steps are completed:
   - pickup reached
   - pickup OTP verification
   - drop reached
   - payment selection
   - drop OTP verification
6. Delivery is marked completed

---

## 6) Create Load Offer

Service providers can post new load opportunities.

- Add pickup/drop context, receiver and parcel information
- Submit offer for matching/search visibility
- Offer can move through booking and fulfillment lifecycle

### Workflow
1. User opens create load offer
2. User enters load details
3. Offer is posted
4. Matching/booking happens through load search flows

---

## 7) Booking Lifecycle and Trip State

A common booking engine supports service-specific behavior.

- Booking creation validates eligibility and service constraints
- Booking statuses update across confirmation, in-progress, completion, and cancellation
- Trip events are recorded and reflected to participants
- Conversation context can be linked from booking context

### Typical lifecycle
1. Booking requested/created
2. Booking confirmed
3. Trip/delivery started
4. In-progress milestones recorded
5. Payment mode selected and processed
6. Booking completed (or cancelled with applicable policy)

---

## 8) Payments, Wallet, and Settlements

eZway supports both online and cash-aligned completion paths, with wallet integration.

- Payment order creation and verification for online settlement
- Cash completion path with validation in delivery/trip closeout
- Wallet top-up, balance checks, and transaction history support
- Withdrawal lifecycle exists for payout operations with admin controls

### Workflow
1. User reaches payment step in booking lifecycle
2. User chooses payment method/path
3. System verifies/records payment outcome
4. Booking settlement is finalized
5. Wallet/ledger views reflect updated transactions

---

## 9) Real-Time Tracking

Tracking supports active trips and load movement visibility.

- Driver/provider location updates are recorded
- Participants can fetch latest location + travel metrics
- Tracking UIs represent progress states and operational steps

### Workflow
1. Trip or load enters active state
2. Location updates stream through backend tracking services
3. User sees current progress and key checkpoints
4. Tracking closes when booking is completed

---

## 10) In-App Chat and Conversations

Chat is tied to service context so participants can coordinate.

- Conversations are created around bookings/offers
- Participants exchange messages in near real time
- Read/unread and delivery state are maintained
- WebSocket flow supports live updates and typing indicators

### Workflow
1. Booking/offer creates conversation context
2. Participants open chat
3. Messages are exchanged and synced live
4. Read states update and persist

---

## 11) Notifications

eZway includes in-app notification management for major platform events.

- User can view notification list
- Read/read-all/delete flows are available
- Unread count supports quick awareness
- Event types include booking and operational updates

---

## 12) Home Dashboard Experience

Main dashboard acts as command center for users.

- Quick service entry points
- Active ride/load cards and contextual shortcuts
- Rewards/coins and service discovery cards
- Fast navigation into offers, bookings, and profile actions

---

## 13) Profile, History, and Account Utilities

- Profile view/edit flows
- Booking history surfaces
- Document status visibility
- Vehicle add/manage paths
- Settings/help/about access paths
- Coins and wallet-related utility screens

---

## 14) Admin Module

Admin has a dedicated auth and dashboard experience for platform operations.

- User moderation and verification controls
- Offer and booking oversight
- Payment/promo/feedback operational controls
- Analytics and high-level platform monitoring

### Admin workflow
1. Admin signs in from dedicated screen
2. Admin opens dashboard
3. Admin performs moderation and operational actions
4. Admin tracks platform metrics and issue status

---

## 15) Feature Availability Notes

Current implementation includes a few important availability flags and partial modules:

- Loads module is feature-flag controlled in mobile navigation
- Rental user journeys are present in navigation but marked as coming soon in major screens
- Some company/admin support surfaces rely on placeholder or partial integrations in current state

These notes are important for release planning and QA expectations.

---

## End-to-End User Journeys (Quick Map)

### Journey A: New user to first booking
1. Onboarding
2. Sign-up/sign-in
3. Document check (if required)
4. Service search
5. Details and price summary
6. Booking confirmation
7. Tracking and completion

### Journey B: Service provider to completed service
1. Sign-in
2. Document/vehicle readiness
3. Create offer (ride-sharing/load)
4. Receive booking
5. Execute trip/delivery milestones
6. Complete payment and settlement

### Journey C: Admin operations cycle
1. Admin login
2. Dashboard review
3. Moderation/approval actions
4. Payment and issue oversight
5. Analytics review

---

## Summary

eZway is built around role-based mobility workflows with strong lifecycle handling:

- Discover or create services
- Validate user readiness through documents
- Manage bookings through milestone states
- Complete payment and settlement reliably
- Keep participants informed through tracking, chat, and notifications
- Maintain platform quality through admin moderation and analytics

This document represents current app behavior based on the present mobile and backend codebase.

---

## Play Store deployment (mobile app)

Automated CI/CD for the Android app is set up so that:

- **Push to `main`** → build and deploy to the Play Store **production** track.
- **Push to `playstore`** branch → build and deploy to the Play Store **internal** track (closed testing).

Setup steps, required GitHub secrets, and **production keystore / SHA keys** for Play Console are documented in **[PLAY_STORE_DEPLOY.md](./PLAY_STORE_DEPLOY.md)**.
