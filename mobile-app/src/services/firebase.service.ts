/**
 * Firebase Phone Authentication Service
 * Handles OTP sending and verification via Firebase
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  PhoneAuthProvider, 
  signInWithCredential,
  Auth,
  ConfirmationResult,
  RecaptchaVerifier
} from 'firebase/auth';

// Firebase configuration
// Get this from Firebase Console: Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyReplaceWithYourActualKey", // Replace with your Firebase API key
  authDomain: "yaaryathra.firebaseapp.com", // Replace with your project domain
  projectId: "yaaryathra", // Your Firebase project ID
  storageBucket: "yaaryathra.appspot.com", // Replace with your storage bucket
  messagingSenderId: "123456789", // Replace with your sender ID
  appId: "1:123456789:web:abcdef", // Replace with your app ID
};

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * Initialize Firebase
 */
export function initializeFirebase(): void {
  if (firebaseApp) {
    return;
  }

  try {
    // Check if Firebase is already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firebaseApp = existingApps[0];
    } else {
      firebaseApp = initializeApp(firebaseConfig);
    }
    
    auth = getAuth(firebaseApp);
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error);
    throw error;
  }
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    initializeFirebase();
  }
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }
  return auth;
}

/**
 * Send OTP via Firebase Phone Authentication
 * This will automatically send SMS to the phone number
 */
export async function sendOTP(phoneNumber: string): Promise<ConfirmationResult> {
  try {
    const authInstance = getFirebaseAuth();
    
    // Format phone number (ensure it starts with + and country code)
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber.replace(/\D/g, '')}`;
    
    console.log('📱 [FIREBASE] Sending OTP to:', formattedPhone);
    
    // For React Native, we need to use reCAPTCHA verifier
    // Note: This is different from web - React Native uses phone auth differently
    // For React Native, use @react-native-firebase/auth instead
    
    // For Expo, we'll use a workaround or switch to @react-native-firebase/auth
    // For now, this is a placeholder - you'll need to install @react-native-firebase/auth
    
    // IMPORTANT: For React Native/Expo, you need to:
    // 1. Install: npm install @react-native-firebase/app @react-native-firebase/auth
    // 2. Configure native modules
    // 3. Use the React Native Firebase API
    
    throw new Error('Firebase Phone Auth requires @react-native-firebase/auth. Please install it or use backend OTP flow.');
    
  } catch (error: any) {
    console.error('❌ [FIREBASE] Error sending OTP:', error);
    throw error;
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(
  confirmationResult: ConfirmationResult,
  code: string
): Promise<{ idToken: string; phoneNumber: string }> {
  try {
    const credential = PhoneAuthProvider.credential(
      confirmationResult.verificationId,
      code
    );
    
    const result = await signInWithCredential(getFirebaseAuth(), credential);
    const idToken = await result.user.getIdToken();
    
    return {
      idToken,
      phoneNumber: result.user.phoneNumber || '',
    };
  } catch (error: any) {
    console.error('❌ [FIREBASE] Error verifying OTP:', error);
    throw error;
  }
}

/**
 * Initialize Firebase on app start
 */
initializeFirebase();

export default { initializeFirebase, getFirebaseAuth, sendOTP, verifyOTP };
