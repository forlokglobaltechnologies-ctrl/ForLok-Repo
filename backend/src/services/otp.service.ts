import { getFirebaseAuth } from '../config/firebase';
import { config } from '../config/env';
import { generateOTP } from '../utils/helpers';
import logger from '../utils/logger';
import { OTPType } from '../types';

class OTPService {
  /**
   * Send OTP using Firebase Phone Authentication
   */
  async sendOTP(phone: string, type: OTPType): Promise<{ otp: string; expiresAt: Date }> {
    try {
      if (config.otp.provider !== 'firebase') {
        throw new Error('Firebase OTP provider not configured');
      }

      // Generate OTP
      const otp = generateOTP(config.otp.length);
      const expiresAt = new Date(Date.now() + config.otp.expiresIn * 1000);

      // In production, Firebase Phone Auth handles OTP sending automatically
      // For backend verification, we'll store OTP in database
      // The mobile app will use Firebase SDK to send/receive OTP
      
      logger.info(`OTP generated for ${phone}`, { type, expiresAt });

      // Note: In actual implementation, Firebase Phone Auth works differently:
      // 1. Mobile app requests OTP via Firebase SDK
      // 2. Firebase sends OTP to phone
      // 3. User enters OTP in mobile app
      // 4. Mobile app verifies with Firebase
      // 5. Backend receives Firebase ID token for verification
      
      // For now, return OTP (in production, this would be stored in DB for verification)
      return {
        otp,
        expiresAt,
      };
    } catch (error) {
      logger.error('Error sending OTP:', error);
      throw new Error('Failed to send OTP');
    }
  }

  /**
   * Verify OTP (when using Firebase, verification happens on client side)
   * Backend verifies the Firebase ID token
   */
  async verifyOTP(phone: string, idToken: string): Promise<boolean> {
    try {
      if (config.otp.provider !== 'firebase') {
        throw new Error('Firebase OTP provider not configured');
      }

      const auth = getFirebaseAuth();
      
      // Verify the Firebase ID token
      const decodedToken = await auth.verifyIdToken(idToken);
      
      // Check if phone number matches
      if (decodedToken.phone_number !== phone) {
        return false;
      }

      logger.info(`OTP verified for ${phone}`);
      return true;
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      return false;
    }
  }

  /**
   * Generate OTP for storage (when not using Firebase direct verification)
   */
  generateOTPForStorage(): { otp: string; expiresAt: Date } {
    console.log('🔢 [OTP SERVICE] Generating OTP...');
    console.log('🔢 [OTP SERVICE] OTP Length:', config.otp.length);
    console.log('🔢 [OTP SERVICE] OTP Expires In:', config.otp.expiresIn, 'seconds');
    
    const otp = generateOTP(config.otp.length);
    const expiresAt = new Date(Date.now() + config.otp.expiresIn * 1000);
    
    console.log('✅ [OTP SERVICE] OTP generated:', otp);
    console.log('✅ [OTP SERVICE] OTP expires at:', expiresAt.toISOString());
    
    return {
      otp,
      expiresAt,
    };
  }
}

export const otpService = new OTPService();
export default otpService;
