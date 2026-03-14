import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });

const envSchema = z.object({
  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_BASE_URL: z.string().url().optional().default('https://forlok-repo-1.onrender.com'),
  FRONTEND_URL: z.string().url().optional().default('http://10.254.10.16:19006'),

  // Database
  MONGODB_URI: z.string().url().optional(),
  MONGODB_DB_NAME: z.string().default('forlok'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters').optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // OTP - Firebase + SMS Provider
  OTP_PROVIDER: z.enum(['firebase', 'msg91', 'twilio', 'textlocal']).default('firebase'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  OTP_EXPIRES_IN: z.string().default('300'),
  OTP_LENGTH: z.string().default('4'),
  // SMS Provider (for sending OTP via SMS)
  SMS_PROVIDER: z.enum(['twilio', 'msg91', 'textlocal', 'firebase']).default('twilio'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),
  TEXTLOCAL_API_KEY: z.string().optional(),
  TEXTLOCAL_SENDER: z.string().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  CLOUDINARY_FOLDER: z.string().default('forlok'),

  // Document Verification - IDfy
  DOCUMENT_VERIFICATION_PROVIDER: z.string().default('idfy'),
  IDFY_API_KEY: z.string().optional(), // Optional - empty for mock mode
  IDFY_API_URL: z.string().url().default('https://api.idfy.in'),

  // Payment - Razorpay
  PAYMENT_PROVIDER: z.string().default('razorpay'),
  RAZORPAY_KEY_ID: z.string().optional(), // Optional - only if using payments
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Maps - OpenStreetMap (no API key needed)
  MAPS_PROVIDER: z.enum(['openstreetmap', 'google']).default('openstreetmap'),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GOOGLE_MAPS_GEOCODING_API_KEY: z.string().optional(),

  // OSRM - Open Source Routing Machine
  OSRM_BASE_URL: z.string().url().default('http://router.project-osrm.org'),
  OSRM_TIMEOUT_MS: z.string().default('10000'),
  OSRM_RETRY_ATTEMPTS: z.string().default('2'),
  OSRM_RETRY_DELAY_MS: z.string().default('1000'),

  // Admin
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  ADMIN_EMAIL: z.string().email().optional(),

  // WebSocket
  WEBSOCKET_ENABLED: z.string().default('true'),
  WEBSOCKET_PORT: z.string().default('3001'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // Email (for OTP and notifications)
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().default('587'),
  EMAIL_SECURE: z.string().default('false'),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),

  // SOS
  SOS_EMAIL_TARGET: z.string().email().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    
    // Validate Firebase credentials if Firebase is selected
    // Note: Firebase can use JSON file, so env vars are optional
    if (parsed.OTP_PROVIDER === 'firebase') {
      // Check if JSON file exists (handled in firebase.ts)
      // If not, check env variables
      const fs = require('fs');
      const path = require('path');
      const firebaseJsonPath = path.join(__dirname, '../../yaaryathra-firebase-adminsdk-fbsvc-f7903b1e81.json');
      
      if (!fs.existsSync(firebaseJsonPath)) {
        // JSON file doesn't exist, require env variables
        if (!parsed.FIREBASE_PROJECT_ID || !parsed.FIREBASE_PRIVATE_KEY || !parsed.FIREBASE_CLIENT_EMAIL) {
          console.warn('⚠️  Firebase JSON file not found. Please provide Firebase credentials in .env or place JSON file in backend/ folder');
        }
      } else {
        console.log('✅ Firebase JSON file found - will use it for initialization');
      }
    }

    // Warn about missing optional but recommended values
    if (!parsed.CLOUDINARY_CLOUD_NAME) {
      console.warn('⚠️  Cloudinary not configured - file uploads will not work');
    }

    if (!parsed.IDFY_API_KEY) {
      console.warn('⚠️  IDfy API key not set - running in mock mode (verification always succeeds)');
    }

    // Validate required fields (even though schema allows optional for flexibility)
    if (!parsed.MONGODB_URI) {
      console.error('❌ MONGODB_URI is required in .env file');
      console.error('   Get from: https://www.mongodb.com/cloud/atlas');
      process.exit(1);
    }

    if (!parsed.JWT_SECRET || !parsed.JWT_REFRESH_SECRET) {
      console.error('❌ JWT_SECRET and JWT_REFRESH_SECRET are required in .env file');
      console.error('   Generate with: openssl rand -base64 32');
      console.error('   Or: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
      process.exit(1);
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('❌ Environment validation error:', error);
    }
    process.exit(1);
  }
}

export const env = validateEnv();

// Export commonly used values as constants
export const config = {
  server: {
    port: parseInt(env.PORT, 10),
    nodeEnv: env.NODE_ENV,
    apiBaseUrl: env.API_BASE_URL || 'http://localhost:3000',
    frontendUrl: env.FRONTEND_URL || 'http://localhost:19006',
  },
  database: {
    uri: env.MONGODB_URI || '',
    dbName: env.MONGODB_DB_NAME,
  },
  jwt: {
    secret: env.JWT_SECRET || '',
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET || '',
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  otp: {
    provider: env.OTP_PROVIDER,
    expiresIn: parseInt(env.OTP_EXPIRES_IN, 10),
    length: parseInt(env.OTP_LENGTH, 10),
    firebase: {
      projectId: env.FIREBASE_PROJECT_ID,
      privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
    },
  },
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: env.CLOUDINARY_API_KEY || '',
    apiSecret: env.CLOUDINARY_API_SECRET || '',
    folder: env.CLOUDINARY_FOLDER,
  },
  documentVerification: {
    provider: env.DOCUMENT_VERIFICATION_PROVIDER,
    idfy: {
      apiKey: env.IDFY_API_KEY,
      apiUrl: env.IDFY_API_URL,
    },
  },
  payment: {
    provider: env.PAYMENT_PROVIDER,
    razorpay: {
      keyId: env.RAZORPAY_KEY_ID || '',
      keySecret: env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || '',
    },
  },
  maps: {
    provider: env.MAPS_PROVIDER,
    google: {
      apiKey: env.GOOGLE_MAPS_API_KEY,
      geocodingApiKey: env.GOOGLE_MAPS_GEOCODING_API_KEY,
    },
  },
  osrm: {
    baseUrl: env.OSRM_BASE_URL,
    timeoutMs: parseInt(env.OSRM_TIMEOUT_MS, 10),
    retryAttempts: parseInt(env.OSRM_RETRY_ATTEMPTS, 10),
    retryDelayMs: parseInt(env.OSRM_RETRY_DELAY_MS, 10),
  },
  admin: {
    username: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD || 'admin123456',
    email: env.ADMIN_EMAIL || 'admin@forlok.com',
  },
  websocket: {
    enabled: env.WEBSOCKET_ENABLED === 'true',
    port: parseInt(env.WEBSOCKET_PORT, 10),
  },
  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },
  sms: {
    provider: (env.SMS_PROVIDER as 'twilio' | 'msg91' | 'textlocal' | 'firebase') || 'twilio',
    twilio: {
      accountSid: env.TWILIO_ACCOUNT_SID || '',
      authToken: env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: env.TWILIO_PHONE_NUMBER || '',
    },
    msg91: {
      authKey: env.MSG91_AUTH_KEY || '',
      senderId: env.MSG91_SENDER_ID || '',
    },
    textlocal: {
      apiKey: env.TEXTLOCAL_API_KEY || '',
      sender: env.TEXTLOCAL_SENDER || 'TXTLCL',
    },
  },
  email: {
    host: env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(env.EMAIL_PORT, 10) || 587,
    secure: env.EMAIL_SECURE === 'true',
    user: env.EMAIL_USER || '',
    password: env.EMAIL_PASSWORD || '',
  },
  sos: {
    emailTarget: env.SOS_EMAIL_TARGET || 'n210438@rguktn.ac.in',
  },
};
