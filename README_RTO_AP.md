# ForLok Mobility Platform - Technical & Regulatory Brief (Andhra Pradesh)

## Purpose of This Document

This document is prepared for submission/discussion with the Regional Transport Office (RTO) / State Transport Authority (STA), Andhra Pradesh, to:

- Present a clear technical overview of the platform.
- Seek legal classification and licensing guidance before launch.
- Confirm operational compliance requirements under applicable transport laws.
- Provide a practical checklist of approvals, documents, and questions for authorities.

This brief is based on repository-level technical analysis of the current application implementation.

---

## 1) Platform Working Overview (Refined)

ForLok is a mobile technology platform designed to support organized shared mobility and pooling within urban areas. The platform connects drivers/vehicle owners and passengers traveling in the same or similar direction through a digital matching workflow.

The platform:

- enables user registration, verification, ride discovery, and booking;
- includes driver and vehicle onboarding flows with document submission;
- provides digital trip records, booking history, and payment tracking;
- includes safety-focused capabilities (for example SOS and trip location tracking);
- does **not** own vehicles and functions as a digital intermediary.

The intended objective is lawful, transparent, and safety-oriented operation aligned with the Motor Vehicles Act, 1988, Central Motor Vehicles Rules, and Andhra Pradesh state-level transport/aggregator directions as applicable.

---

## 2) System Architecture (Codebase-Derived)

### 2.1 Components

- `mobile-app/`: Expo React Native app for end users and embedded admin screens.
- `backend/`: Node.js Fastify API server with MongoDB (Mongoose), auth, booking, payment, document verification, admin, and tracking modules.

### 2.2 Technology Stack

- **Mobile:** Expo, React Native, TypeScript.
- **Backend:** Node.js, Fastify, TypeScript, Mongoose/MongoDB.
- **Security/Auth:** JWT access + refresh, OTP flows, role checks.
- **Storage/Infra:** MongoDB, Cloudinary for document media.
- **Payments:** Razorpay integration (with webhook handling).
- **Location/Routing:** GPS/location features with map/routing utility services.
- **KYC/Verification:** Aadhaar/PAN/DL-oriented verification flows (with integration hooks and fallback modes).

### 2.3 Functional Modules Identified

- Authentication (OTP, login, password reset, token refresh)
- User and company profile management
- Driver/vehicle onboarding
- Document verification and uploads
- Pooling/rental/booking flows
- Payment and wallet/withdrawal handling
- Trip tracking and route/location updates
- SOS emergency events and notifications
- Admin login and admin operational APIs

---

## 3) Operational Model for Regulatory Context

The current implementation indicates the platform is intended to operate as a **digital intermediary** enabling passenger-driver matching and trip management, with fare/payment and safety telemetry features. It appears functionally close to an aggregator-style model and therefore likely requires explicit classification by competent transport authority before public operations.

Key points for authority review:

- Platform-mediated trip discovery, matching, booking, and payment.
- Driver/vehicle/document onboarding with verification status tracking.
- Geo-location and trip event recording.
- Distinct user categories including admin role controls.
- No direct vehicle ownership by platform.

---

## 4) Data Categories Processed (Compliance-Relevant)

The code indicates processing of the following categories:

### 4.1 Identity & Account Data

- Name, phone, email, login credentials, profile metadata.
- OTP verification records and authentication tokens.

### 4.2 Driver/Vehicle/KYC Data

- Vehicle registration details, type/specifications, insurance-related fields.
- Aadhaar/PAN/DL verification attributes and status.
- Uploaded supporting documents (stored through media service integration).

### 4.3 Trip & Location Data

- Pickup/drop coordinates and route details.
- Ongoing trip location updates (GPS records and associated metadata).
- Booking status history and trip logs.

### 4.4 Payment & Financial Data

- Payment order/payment IDs, signatures/verification metadata.
- Wallet/withdrawal transaction attributes.

### 4.5 Safety Data

- SOS trigger events, timestamps, location points, and alert handling.

---

## 5) Approvals / Permissions to Seek (Andhra Pradesh)

The following approvals or clarifications should be formally sought from AP Transport authorities:

1. **Aggregator classification determination:** Whether this platform is treated as a transport aggregator under state rules.
2. **License requirement:** Whether Aggregator License (or equivalent permit/authorization) is mandatory prior to launch.
3. **Vehicle permit framework:** Whether vehicles used through platform require contract carriage/commercial permits or other specific authorizations.
4. **Private vehicle participation rule:** Whether cost-sharing rides by private vehicles are permissible and under what conditions.
5. **Driver eligibility requirements:** Minimum license class, badge, police verification, medical fitness, etc.
6. **Fare/pricing constraints:** Whether dynamic pricing is allowed; if caps, disclosures, and fare formula approvals are required.
7. **Safety obligations:** Mandatory panic button/SOS integration standards, control-room integration, incident reporting requirements.
8. **Data sharing/reporting:** Required APIs/format/frequency for sharing trip, driver, vehicle, and complaint data with department.
9. **Grievance and compliance governance:** Nodal officer requirements, local office address, complaint SLAs, and audit obligations.
10. **Insurance and liability:** Mandatory coverage types for vehicle, passenger, third-party, and platform-level liabilities.

---

## 6) Formal Questions to Ask RTO/STA (Ready-to-Use)

Use the following question set in your representation letter/meeting:

1. Is our platform, as a digital intermediary for pooled/shared rides, classified as an aggregator under Andhra Pradesh law?
2. If yes, what exact license category applies and which authority grants it (RTO/STA/Transport Commissioner)?
3. Can private non-transport vehicles participate in cost-sharing pooling? If yes, what caps/conditions apply?
4. Is conversion to transport/commercial category mandatory for all participating vehicles?
5. Are city-wise route, zone, or operating-hour restrictions applicable?
6. What are mandatory driver onboarding checks (badge, police verification, training, medical)?
7. What are mandatory vehicle standards (fitness, age limit, permit class, insurance endorsements)?
8. What are required in-app safety features (panic button, live trip tracking, emergency contacts, women safety options)?
9. What is the required data retention period for trip logs, KYC records, and payment records?
10. What data must be shared with transport authorities, in which format, and at what frequency?
11. Are there prescribed rules for commission/service fee/fare transparency and invoice format?
12. Is any prior technical integration/sandbox certification required with state systems?
13. What pre-launch inspection or compliance audit is required?
14. What fees, bank guarantees, renewals, and validity period apply to the license?
15. What penalties, suspension triggers, and appeal process are applicable?

---

## 7) Suggested Submission Packet (Documents to Prepare)

Prepare the following before filing:

### 7.1 Company & Legal

- Certificate of incorporation, PAN, GST, registered office proof.
- Board resolution/authorization for filing.
- Authorized signatory ID and contact details.

### 7.2 Technical & Operations

- Architecture note (mobile app + backend + security controls).
- Feature list (booking, tracking, SOS, payments, grievance support).
- Data-flow diagram (user onboarding -> booking -> trip -> payment -> records).
- Incident response and support process.

### 7.3 Compliance & Safety

- Driver onboarding SOP and vehicle eligibility SOP.
- Document verification SOP (Aadhaar/PAN/DL/insurance/RC checks).
- Safety SOP (SOS escalation, emergency contact process, reporting chain).
- Grievance redressal policy with SLA timelines.

### 7.4 Privacy & User Terms

- Privacy Policy (purpose limitation, retention, rights, grievance contact).
- Terms & Conditions (roles, liabilities, dispute process, prohibited use).
- Consent artifacts and audit trail format.

### 7.5 Financial

- Payment flow and settlement process note.
- Insurance policy copies/coverage matrix.
- Fee structure and user fare transparency statement.

---

## 8) Code-Based Risk/Gap Register (Pre-Launch Actions)

The following technical/compliance improvements are advisable before production launch:

1. **Token storage hardening:** Move auth tokens from general async storage to secure storage mechanism on device.
2. **Consent auditability:** Persist explicit Terms/Privacy acceptance with timestamp and policy version at registration and policy updates.
3. **Disable test/mock behavior in production:** Ensure OTP/payment/document verification mock/debug paths are fully blocked in release environments.
4. **Credential hygiene:** Remove any hardcoded/default operational credentials and enforce secure secrets management.
5. **API contract consistency:** Validate endpoint constants and backend route parity to avoid operational/legal reporting mismatches.
6. **Retention policy implementation:** Define and enforce retention/deletion schedules for trip, KYC, and financial logs.
7. **Regulatory reporting readiness:** Add export/report jobs aligned to authority-requested schema and cadence.

---

## 9) Recommended Compliance Roadmap

### Phase A - Legal Classification & Licensing

- Obtain written classification and license checklist from AP Transport authority.
- Freeze operating model (pooling-only vs commercial aggregator, pricing model, city scope).
- File license/approval application with complete annexures.

### Phase B - Technical Compliance Hardening

- Implement/verify all mandatory controls (security, safety, consent, logging, reporting).
- Conduct internal compliance audit and penetration/security checks.
- Prepare nodal compliance team and escalation matrix.

### Phase C - Controlled Launch

- Start pilot in approved geography/vehicle category only.
- Monitor grievances, incidents, and data reporting adherence.
- Submit periodic compliance statements to authority as required.

---

## 10) Draft Representation Paragraph (Can Reuse)

We respectfully request guidance and approval from the competent transport authorities of Andhra Pradesh for lawful operation of our technology platform for organized ride pooling/shared mobility. The platform functions as a digital intermediary connecting riders and drivers, with safety, verification, trip logging, and digital transaction capabilities. We seek formal clarification regarding applicable aggregator classification, required licensing, vehicle/driver permit requirements, data-sharing obligations, and safety compliance conditions. We are committed to implementing all mandated controls and commencing operations only after obtaining necessary approvals.

---

## 11) Important Note

This document is a technical and operational brief derived from current code implementation and should be reviewed by a qualified transport-regulatory legal counsel before final filing.

