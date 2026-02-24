# Validation QA Checklist

## Scope
- Backend error contract (`message`, `error`, optional `fieldErrors`)
- Frontend inline red validation errors
- Frontend snackbar for non-field/API/network errors

## Auth & Registration
- Sign in with empty username -> inline red on username.
- Sign in with empty password -> inline red on password.
- Sign in with wrong credentials -> snackbar with backend message.
- Individual registration with invalid phone -> inline red + snackbar.
- Individual registration with weak password -> inline red + snackbar.
- Individual registration with mismatched passwords -> inline red.
- Individual registration with missing gender -> inline red.
- Individual registration with existing phone -> snackbar says: `This phone number already exists`.
- Company registration invalid phone/email/OTP -> inline red + snackbar.
- Company registration password mismatch/weak password -> inline red + snackbar.

## Offer / Booking / Payment
- Create pooling offer with backend failure -> snackbar shows real backend message.
- Create rental offer with vehicle/price failure -> snackbar message shown.
- Payment flow with missing booking id -> snackbar error shown.
- Payment order creation failure -> snackbar shows real backend message.

## Vehicle & Profile
- Add vehicle with upload failures -> snackbar message shown.
- Add vehicle create API conflict/failure -> snackbar shows backend message.
- Profile load failure -> snackbar message shown.
- Open invalid profile document URL -> snackbar message shown.

## Backend API Contract Checks
- Validation failure returns:
  - `success: false`
  - `error: VALIDATION_ERROR`
  - `message: Validation failed`
  - `fieldErrors: [{ field, message, code }]`
- Conflict case (duplicate phone) returns:
  - `success: false`
  - `error: CONFLICT`
  - `message: This phone number already exists`

## Automated Checks
- Run backend contract check:
  - `npm run test:validation-contract` (from `backend/`)
- Run lint checks on touched files before release.
