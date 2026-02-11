import admin from 'firebase-admin';
import { config } from './env';
import logger from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs';

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase(): void {
  if (firebaseApp) {
    logger.info('Firebase already initialized');
    return;
  }

  if (config.otp.provider !== 'firebase') {
    logger.warn('Firebase not configured - OTP provider is not firebase');
    return;
  }

  try {
    // Try to load from JSON file first
    const firebaseJsonPath = path.join(__dirname, '../../yaaryathra-firebase-adminsdk-fbsvc-f7903b1e81.json');
    
    if (fs.existsSync(firebaseJsonPath)) {
      // Load from JSON file
      const serviceAccount = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      logger.info('✅ Firebase initialized successfully from JSON file');
    } else if (config.otp.firebase.projectId && config.otp.firebase.privateKey && config.otp.firebase.clientEmail) {
      // Fallback to environment variables
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.otp.firebase.projectId,
          privateKey: config.otp.firebase.privateKey,
          clientEmail: config.otp.firebase.clientEmail,
        }),
      });
      logger.info('✅ Firebase initialized successfully from environment variables');
    } else {
      throw new Error('Firebase credentials are missing. Please provide either JSON file or environment variables.');
    }
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

export function getFirebaseApp(): admin.app.App {
  if (!firebaseApp) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return firebaseApp;
}

export function getFirebaseAuth(): admin.auth.Auth {
  return getFirebaseApp().auth();
}

export default firebaseApp;
