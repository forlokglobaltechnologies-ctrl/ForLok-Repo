# Environment Variables Setup Guide for YAARYATRA Backend

## Complete Environment Variables List

### 1. Server Configuration
```env
# Server Settings
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:19006
```

### 2. Database (MongoDB Atlas)
```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/yaaryatra?retryWrites=true&w=majority
MONGODB_DB_NAME=yaaryatra
```

**How to get:**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account (M0 Free Tier - 512MB storage)
3. Create a cluster
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Replace `<password>` with your database password
7. Replace `<dbname>` with `yaaryatra`

### 3. JWT Authentication
```env
# JWT Secrets (Generate strong random strings)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters-long
JWT_REFRESH_EXPIRES_IN=30d
```

**How to generate:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Cloudinary (File Storage) - FREE TIER AVAILABLE
```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=yaaryatra
```

**How to get (FREE):**
1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for free account
3. Free tier includes:
   - 25 GB storage
   - 25 GB monthly bandwidth
   - Image/video transformations
   - Automatic optimization
4. Go to Dashboard → Settings → Access Keys
5. Copy:
   - Cloud Name
   - API Key
   - API Secret

**Cloudinary Free Tier Limits:**
- ✅ 25 GB storage
- ✅ 25 GB monthly bandwidth
- ✅ Unlimited transformations
- ✅ Auto-optimization
- ✅ CDN delivery
- ✅ Video support (up to 10 minutes)

### 5. OTP Services - FREE OPTIONS

#### Option A: MSG91 (Recommended for India - FREE TIER)
```env
# MSG91 Configuration
OTP_PROVIDER=msg91
MSG91_AUTH_KEY=your-msg91-auth-key
MSG91_SENDER_ID=YAARYA
MSG91_TEMPLATE_ID=your-template-id
OTP_EXPIRES_IN=300
```

**How to get (FREE):**
1. Go to [MSG91](https://msg91.com/)
2. Sign up for free account
3. Free tier includes:
   - 100 SMS per day
   - DLT registration required (free)
4. Go to Dashboard → API → Auth Key
5. Create sender ID (e.g., "YAARYA")
6. Create OTP template

**MSG91 Free Tier:**
- ✅ 100 SMS/day
- ✅ DLT registration (free)
- ✅ OTP templates
- ✅ Delivery reports

#### Option B: Twilio (International - FREE TRIAL)
```env
# Twilio Configuration
OTP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
OTP_EXPIRES_IN=300
```

**How to get:**
1. Go to [Twilio](https://www.twilio.com/)
2. Sign up (free trial: $15.50 credit)
3. Get Account SID and Auth Token from dashboard
4. Buy a phone number (or use trial number)

**Twilio Free Trial:**
- ✅ $15.50 free credit
- ✅ Trial phone number
- ✅ ~100 SMS (depending on country)

#### Option C: Firebase Phone Auth (FREE - Google)
```env
# Firebase Configuration
OTP_PROVIDER=firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
OTP_EXPIRES_IN=300
```

**How to get:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project
3. Enable Phone Authentication
4. Go to Project Settings → Service Accounts
5. Generate new private key
6. Free tier: 10,000 verifications/month

**Firebase Free Tier:**
- ✅ 10,000 phone verifications/month
- ✅ No SMS charges (uses Google's infrastructure)
- ✅ Built-in security

#### Option D: TextLocal (India - FREE TIER)
```env
# TextLocal Configuration
OTP_PROVIDER=textlocal
TEXTLOCAL_API_KEY=your-api-key
TEXTLOCAL_SENDER=YAARYA
OTP_EXPIRES_IN=300
```

**How to get:**
1. Go to [TextLocal](https://www.textlocal.in/)
2. Sign up for free account
3. Free tier: 100 SMS/day
4. Get API key from dashboard

**TextLocal Free Tier:**
- ✅ 100 SMS/day
- ✅ DLT support
- ✅ Delivery tracking

### 6. Payment Gateway (Razorpay - India)
```env
# Razorpay Configuration
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

**How to get:**
1. Go to [Razorpay](https://razorpay.com/)
2. Sign up for account
3. Go to Settings → API Keys
4. Generate Test Keys (for development)
5. Activate account for live keys

**Razorpay:**
- ✅ No setup fees
- ✅ 2% transaction fee
- ✅ Test mode available

### 7. Google Maps API (Location Services)
```env
# Google Maps Configuration
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_MAPS_GEOCODING_API_KEY=your-geocoding-key
```

**How to get (FREE):**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. Enable:
   - Maps JavaScript API
   - Geocoding API
   - Places API
   - Directions API
4. Go to Credentials → Create API Key
5. Restrict API key to your domain

**Google Maps Free Tier:**
- ✅ $200 free credit/month
- ✅ ~28,000 map loads/month
- ✅ ~40,000 geocoding requests/month

### 8. Document Verification (Optional)
```env
# Document Verification APIs
IDFY_API_KEY=your-idfy-api-key
IDFY_API_URL=https://api.idfy.in
UIDAI_API_KEY=your-uidai-key (if available)
```

**Note:** Document verification APIs are usually paid services. Consider implementing basic validation first.

### 9. Email Service (Optional - for notifications)
```env
# Email Configuration (using Nodemailer with Gmail)
EMAIL_PROVIDER=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yaaryatra.com
```

**How to get Gmail App Password:**
1. Enable 2FA on your Google account
2. Go to Google Account → Security
3. App passwords → Generate
4. Use this password (not your regular password)

### 10. Admin Configuration
```env
# Admin Settings
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_EMAIL=admin@yaaryatra.com
```

### 11. WebSocket Configuration
```env
# WebSocket Settings
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=3001
```

### 12. Rate Limiting
```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Complete .env.example File

Create a `.env.example` file in your backend root:

```env
# ============================================
# YAARYATRA Backend Environment Variables
# ============================================

# Server Configuration
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:19006

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/yaaryatra?retryWrites=true&w=majority
MONGODB_DB_NAME=yaaryatra

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-characters-long
JWT_REFRESH_EXPIRES_IN=30d

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=yaaryatra

# OTP Service (Choose one)
# Option 1: MSG91 (Recommended for India)
OTP_PROVIDER=msg91
MSG91_AUTH_KEY=your-msg91-auth-key
MSG91_SENDER_ID=YAARYA
MSG91_TEMPLATE_ID=your-template-id

# Option 2: Twilio (International)
# OTP_PROVIDER=twilio
# TWILIO_ACCOUNT_SID=your-account-sid
# TWILIO_AUTH_TOKEN=your-auth-token
# TWILIO_PHONE_NUMBER=+1234567890

# Option 3: Firebase (Google)
# OTP_PROVIDER=firebase
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_PRIVATE_KEY=your-private-key
# FIREBASE_CLIENT_EMAIL=your-client-email

# Option 4: TextLocal (India)
# OTP_PROVIDER=textlocal
# TEXTLOCAL_API_KEY=your-api-key
# TEXTLOCAL_SENDER=YAARYA

OTP_EXPIRES_IN=300
OTP_LENGTH=4

# Payment Gateway (Razorpay)
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_MAPS_GEOCODING_API_KEY=your-geocoding-key

# Document Verification (Optional)
IDFY_API_KEY=your-idfy-api-key
IDFY_API_URL=https://api.idfy.in

# Email Service (Optional)
EMAIL_PROVIDER=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yaaryatra.com

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_EMAIL=admin@yaaryatra.com

# WebSocket
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Setup Steps

### Step 1: Create .env file
```bash
cd backend
cp .env.example .env
```

### Step 2: Get all API keys
Follow the "How to get" instructions above for each service.

### Step 3: Fill in .env file
Edit `.env` with your actual credentials.

### Step 4: Validate environment variables
Create `src/config/env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_BASE_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),

  // Database
  MONGODB_URI: z.string().url(),
  MONGODB_DB_NAME: z.string(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  CLOUDINARY_FOLDER: z.string().default('yaaryatra'),

  // OTP
  OTP_PROVIDER: z.enum(['msg91', 'twilio', 'firebase', 'textlocal']),
  OTP_EXPIRES_IN: z.string().default('300'),
  OTP_LENGTH: z.string().default('4'),

  // MSG91
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Firebase
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),

  // TextLocal
  TEXTLOCAL_API_KEY: z.string().optional(),
  TEXTLOCAL_SENDER: z.string().optional(),

  // Payment
  PAYMENT_PROVIDER: z.string().default('razorpay'),
  RAZORPAY_KEY_ID: z.string(),
  RAZORPAY_KEY_SECRET: z.string(),
  RAZORPAY_WEBHOOK_SECRET: z.string(),

  // Google Maps
  GOOGLE_MAPS_API_KEY: z.string(),
  GOOGLE_MAPS_GEOCODING_API_KEY: z.string().optional(),

  // Admin
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().min(8),
  ADMIN_EMAIL: z.string().email(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    process.exit(1);
  }
}

export const env = validateEnv();
```

---

## Recommended Free Services Summary

| Service | Free Tier | Best For |
|---------|-----------|----------|
| **Cloudinary** | 25 GB storage, 25 GB bandwidth | File storage ✅ |
| **MSG91** | 100 SMS/day | OTP in India ✅ |
| **Firebase Phone Auth** | 10K verifications/month | OTP (no SMS cost) ✅ |
| **TextLocal** | 100 SMS/day | OTP in India ✅ |
| **Twilio** | $15.50 credit | International OTP |
| **MongoDB Atlas** | 512 MB storage | Database ✅ |
| **Google Maps** | $200 credit/month | Location services ✅ |
| **Razorpay** | No setup fee | Payments (2% fee) ✅ |

---

## Quick Start Checklist

- [ ] Create MongoDB Atlas account and get connection string
- [ ] Create Cloudinary account and get credentials
- [ ] Choose OTP provider (MSG91 recommended for India)
- [ ] Get OTP provider API keys
- [ ] Create Razorpay account and get test keys
- [ ] Get Google Maps API key
- [ ] Generate JWT secrets (use crypto.randomBytes)
- [ ] Create .env file with all credentials
- [ ] Test each service connection

---

## Security Best Practices

1. **Never commit .env file** - Add to `.gitignore`
2. **Use strong secrets** - Minimum 32 characters for JWT
3. **Rotate secrets regularly** - Especially in production
4. **Use different keys for dev/staging/prod**
5. **Restrict API keys** - Set IP/domain restrictions where possible
6. **Monitor usage** - Set up alerts for free tier limits

---

## Next Steps

After setting up environment variables:
1. Create `src/config/env.ts` with validation
2. Create `src/config/database.ts` for MongoDB connection
3. Create `src/config/cloudinary.ts` for Cloudinary setup
4. Create `src/services/otp.service.ts` for OTP implementation
5. Test each service connection individually
