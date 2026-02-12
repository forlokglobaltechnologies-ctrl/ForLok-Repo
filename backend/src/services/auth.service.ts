import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { config } from '../config/env';
import { JWTPayload, UserType } from '../types';
import User from '../models/User';
import OTPVerification from '../models/OTPVerification';
import { formatPhoneNumber, generateIndividualUserId, generateUserId } from '../utils/helpers';
import { AuthenticationError, NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';
import { otpService } from './otp.service';

class AuthService {
  /**
   * Generate JWT access token
   */
  generateAccessToken(payload: JWTPayload): string {
    const secret = config.jwt.secret;
    if (!secret || secret.trim() === '') {
      throw new Error('JWT_SECRET is not configured');
    }
    const options: SignOptions = {
      expiresIn: config.jwt.expiresIn as StringValue,
    };
    return jwt.sign(payload, secret as Secret, options);
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(payload: JWTPayload): string {
    const secret = config.jwt.refreshSecret;
    if (!secret || secret.trim() === '') {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }
    const options: SignOptions = {
      expiresIn: config.jwt.refreshExpiresIn as StringValue,
    };
    return jwt.sign(payload, secret as Secret, options);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string, isRefresh: boolean = false): JWTPayload {
    try {
      const secret = isRefresh ? config.jwt.refreshSecret : config.jwt.secret;
      if (!secret || secret.trim() === '') {
        throw new Error(isRefresh ? 'JWT_REFRESH_SECRET is not configured' : 'JWT_SECRET is not configured');
      }
      return jwt.verify(token, secret as Secret) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired');
      }
      throw new AuthenticationError('Invalid token');
    }
  }

  /**
   * Send OTP for phone verification
   * Returns OTP for development purposes (will be removed in production)
   */
  async sendOTP(phone: string, type: 'signup' | 'login' | 'reset_password' | 'verify_phone'): Promise<{ otp: string; expiresAt: Date }> {
    try {
      console.log('🔐 [AUTH SERVICE] Starting OTP generation...');
      console.log('🔐 [AUTH SERVICE] Input phone:', phone);
      console.log('🔐 [AUTH SERVICE] Input type:', type);

      const formattedPhone = formatPhoneNumber(phone);
      console.log('🔐 [AUTH SERVICE] Formatted phone:', formattedPhone);

      // Check if user exists for signup
      if (type === 'signup') {
        console.log('🔐 [AUTH SERVICE] Checking if user exists (signup flow)...');
        const existingUser = await User.findOne({ phone: formattedPhone });
        if (existingUser) {
          console.error('❌ [AUTH SERVICE] User already exists:', formattedPhone);
          throw new ConflictError('User already exists with this phone number');
        }
        console.log('✅ [AUTH SERVICE] User does not exist, proceeding with signup');
      }

      // Check if user exists for login/reset
      if (type === 'login' || type === 'reset_password') {
        console.log('🔐 [AUTH SERVICE] Checking if user exists (login/reset flow)...');
        const user = await User.findOne({ phone: formattedPhone });
        if (!user) {
          console.error('❌ [AUTH SERVICE] User not found:', formattedPhone);
          throw new NotFoundError('User not found');
        }
        console.log('✅ [AUTH SERVICE] User found:', user.userId);
      }

      // Generate OTP
      console.log('🔐 [AUTH SERVICE] Generating OTP...');
      const { otp, expiresAt } = otpService.generateOTPForStorage();
      console.log('✅ [AUTH SERVICE] OTP generated:', otp);
      console.log('✅ [AUTH SERVICE] OTP expires at:', expiresAt.toISOString());

      // Delete any existing OTP for this phone and type
      console.log('🔐 [AUTH SERVICE] Deleting existing OTPs for this phone and type...');
      const deleteResult = await OTPVerification.deleteMany({
        phone: formattedPhone,
        type,
        verified: false,
      });
      console.log('✅ [AUTH SERVICE] Deleted', deleteResult.deletedCount, 'existing OTPs');

      // Save OTP
      console.log('🔐 [AUTH SERVICE] Saving OTP to database...');
      const otpRecord = await OTPVerification.create({
        phone: formattedPhone,
        otp,
        type,
        expiresAt,
        attempts: 0,
        verified: false,
      });
      console.log('✅ [AUTH SERVICE] OTP saved to database with ID:', otpRecord._id);

      // Send OTP via SMS
      console.log('📱 [AUTH SERVICE] Attempting to send OTP via SMS...');
      try {
        const { smsService } = await import('./sms.service');
        const smsResult = await smsService.sendOTP(formattedPhone, otp);
        
        if (smsResult.success) {
          console.log('✅ [AUTH SERVICE] OTP sent via SMS successfully');
          logger.info(`OTP sent via SMS to ${formattedPhone}`, { type, messageId: smsResult.messageId });
        } else {
          console.warn('⚠️  [AUTH SERVICE] SMS sending failed:', smsResult.error);
          console.warn('⚠️  [AUTH SERVICE] OTP generated and stored but NOT sent via SMS');
          console.warn('⚠️  [AUTH SERVICE] Configure SMS provider (Twilio/MSG91) in .env to enable SMS sending');
          logger.warn(`OTP generated but SMS not sent to ${formattedPhone}`, { error: smsResult.error });
        }
      } catch (smsError: any) {
        console.warn('⚠️  [AUTH SERVICE] SMS service error:', smsError.message);
        console.warn('⚠️  [AUTH SERVICE] OTP generated and stored but NOT sent via SMS');
        logger.warn(`SMS service error for ${formattedPhone}`, { error: smsError });
      }

      // Log OTP generation
      logger.info(`OTP generated for ${formattedPhone}`, { type, otp, expiresAt });
      console.log('✅ [AUTH SERVICE] OTP generation completed successfully');
      console.log('📱 [AUTH SERVICE] OTP for development/testing:', otp);

      // Return OTP for development (remove in production)
      return { otp, expiresAt };

      // Note: For Firebase Phone Auth, the mobile app handles OTP sending/receiving
      // Backend verifies the Firebase ID token instead
    } catch (error: any) {
      console.error('❌ [AUTH SERVICE] Error in sendOTP:', error);
      console.error('❌ [AUTH SERVICE] Error message:', error.message);
      console.error('❌ [AUTH SERVICE] Error stack:', error.stack);
      logger.error('Error sending OTP:', error);
      throw error;
    }
  }

  /**
   * Send email OTP
   */
  async sendEmailOTP(email: string, type: 'verify_email'): Promise<{ otp: string; expiresAt: Date }> {
    try {
      console.log('📧 [AUTH SERVICE] Starting email OTP generation...');
      console.log('📧 [AUTH SERVICE] Input email:', email);

      const formattedEmail = email.toLowerCase().trim();

      // Generate OTP
      console.log('📧 [AUTH SERVICE] Generating OTP...');
      const { otp, expiresAt } = otpService.generateOTPForStorage();
      console.log('✅ [AUTH SERVICE] OTP generated:', otp);

      // Delete any existing OTP for this email and type
      console.log('📧 [AUTH SERVICE] Deleting existing OTPs for this email and type...');
      const deleteResult = await OTPVerification.deleteMany({
        email: formattedEmail,
        type,
        verified: false,
      });
      console.log('✅ [AUTH SERVICE] Deleted', deleteResult.deletedCount, 'existing OTPs');

      // Save OTP
      console.log('📧 [AUTH SERVICE] Saving OTP to database...');
      const otpRecord = await OTPVerification.create({
        email: formattedEmail,
        otp,
        type,
        expiresAt,
        attempts: 0,
        verified: false,
      });
      console.log('✅ [AUTH SERVICE] OTP saved to database with ID:', otpRecord._id);

      // Send OTP via email
      console.log('📧 [AUTH SERVICE] Attempting to send OTP via email...');
      try {
        const { emailService } = await import('./email.service');
        const emailResult = await emailService.sendOTP(formattedEmail, otp);
        
        if (emailResult.success) {
          console.log('✅ [AUTH SERVICE] OTP sent via email successfully');
          logger.info(`OTP sent via email to ${formattedEmail}`, { type, messageId: emailResult.messageId });
        } else {
          console.warn('⚠️  [AUTH SERVICE] Email sending failed:', emailResult.error);
          console.warn('⚠️  [AUTH SERVICE] OTP generated and stored but NOT sent via email');
          logger.warn(`OTP generated but email not sent to ${formattedEmail}`, { error: emailResult.error });
        }
      } catch (emailError: any) {
        console.warn('⚠️  [AUTH SERVICE] Email service error:', emailError.message);
        console.warn('⚠️  [AUTH SERVICE] OTP generated and stored but NOT sent via email');
        logger.warn(`Email service error for ${formattedEmail}`, { error: emailError });
      }

      console.log('✅ [AUTH SERVICE] Email OTP generation completed successfully');
      console.log('📧 [AUTH SERVICE] OTP for development/testing:', otp);

      return { otp, expiresAt };
    } catch (error: any) {
      console.error('❌ [AUTH SERVICE] Error in sendEmailOTP:', error);
      logger.error('Error sending email OTP:', error);
      throw error;
    }
  }

  /**
   * Verify OTP (for non-Firebase flows or backend verification)
   */
  async verifyOTP(
    phoneOrEmail: string,
    otp: string,
    type: 'signup' | 'login' | 'reset_password' | 'verify_phone' | 'verify_email'
  ): Promise<boolean> {
    try {
      // Determine if it's phone or email
      const isEmail = phoneOrEmail.includes('@');
      
      let query: any = { type, verified: false };
      
      if (isEmail) {
        query.email = phoneOrEmail.toLowerCase().trim();
      } else {
        const formattedPhone = formatPhoneNumber(phoneOrEmail);
        query.phone = formattedPhone;
      }

      const otpRecord = await OTPVerification.findOne(query).sort({ createdAt: -1 });

      if (!otpRecord) {
        throw new AuthenticationError('OTP not found or already used');
      }

      // Check if expired
      if (new Date() > otpRecord.expiresAt) {
        throw new AuthenticationError('OTP expired');
      }

      // Check attempts
      if (otpRecord.attempts >= 5) {
        throw new AuthenticationError('Maximum OTP attempts exceeded');
      }

      // Verify OTP
      if (otpRecord.otp !== otp) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        throw new AuthenticationError('Invalid OTP');
      }

      // Mark as verified
      otpRecord.verified = true;
      otpRecord.verifiedAt = new Date();
      await otpRecord.save();

      return true;
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      throw error;
    }
  }

  /**
   * Verify Firebase ID token (for Firebase Phone Auth)
   */
  async verifyFirebaseToken(phone: string, idToken: string): Promise<boolean> {
    try {
      return await otpService.verifyOTP(phone, idToken);
    } catch (error) {
      logger.error('Error verifying Firebase token:', error);
      throw new AuthenticationError('Invalid Firebase token');
    }
  }

  /**
   * Register new user
   */
  async registerUser(data: {
    phone: string;
    name: string;
    userType: UserType;
    email?: string;
    password: string;
    confirmPassword?: string; // For validation only, not stored
    gender?: 'Male' | 'Female' | 'Other';
    referralCode?: string;
  }): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
    try {
      console.log('🔐 [AUTH SERVICE] registerUser called with userType:', data.userType);
      console.log('🔐 [AUTH SERVICE] Full data:', JSON.stringify({ ...data, password: '***' }, null, 2));
      
      const formattedPhone = formatPhoneNumber(data.phone);

      // Check if user already exists
      const existingUser = await User.findOne({ phone: formattedPhone });
      if (existingUser) {
        throw new ConflictError('User already exists with this phone number');
      }

      // Generate unique user ID (LKU format for individuals, U format for companies)
      const userId = data.userType === 'individual' 
        ? await generateIndividualUserId()
        : await generateUserId('U'); // Fallback for other types

      console.log('🔐 [AUTH SERVICE] Creating user with userType:', data.userType);
      console.log('🔐 [AUTH SERVICE] Generated userId:', userId);

      // Create user - password will be hashed by User model's pre-save hook
      const user = await User.create({
        userId,
        phone: formattedPhone,
        name: data.name,
        userType: data.userType, // Explicitly set userType
        email: data.email,
        password: data.password, // Pass plain password, pre-save hook will hash it
        gender: data.gender, // Set gender if provided
        isVerified: false,
        isActive: true,
      });

      console.log('🔐 [AUTH SERVICE] User created successfully');
      console.log('🔐 [AUTH SERVICE] Saved userType:', user.userType);
      console.log('🔐 [AUTH SERVICE] User document:', JSON.stringify(user.toJSON(), null, 2));

      // Generate tokens
      const payload: JWTPayload = {
        userId: user.userId,
        userType: user.userType,
        phone: user.phone,
      };

      const accessToken = this.generateAccessToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      logger.info(`User registered: ${user.userId}`);

      // --- Coin Reward System integration ---
      try {
        const { coinService } = await import('./coin.service');
        const { referralService } = await import('./referral.service');

        // 1. Award signup bonus coins
        const signupCoins = await coinService.awardSignupBonus(user.userId);
        logger.info(`🪙 Signup bonus: ${signupCoins} coins awarded to new user ${user.userId}`);

        // Send coin_earned notification for signup bonus
        try {
          const { notificationService } = await import('./notification.service');
          await notificationService.createNotification({
            userId: user.userId,
            type: 'coin_earned',
            title: 'Welcome Bonus!',
            message: `You earned ${signupCoins} coins as a signup bonus! Start your FORLOK journey.`,
            data: { coins: signupCoins, reason: 'signup_bonus' },
          });
        } catch (notifErr) {
          logger.error('Failed to send signup bonus notification:', notifErr);
        }

        // 2. Generate referral code for the new user
        await referralService.generateReferralCode(user.userId);

        // 3. If referred by someone, apply the referral
        if (data.referralCode) {
          const referralResult = await referralService.validateAndApplyReferral(
            data.referralCode,
            user.userId
          );
          if (referralResult.valid) {
            logger.info(`🔗 Referral applied for user ${user.userId}: referrer earned ${referralResult.coinsAwarded} coins`);
          }
        }
      } catch (coinError) {
        // Don't fail registration if coin system has issues
        logger.error('🪙 Coin system error during registration (non-fatal):', coinError);
      }

      return {
        user: user.toJSON(),
        tokens: {
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      logger.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * Login user - accepts phone, email, userId, or name (username)
   */
  async loginUser(username: string, password: string): Promise<{
    user: any;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    try {
      if (!password) {
        throw new AuthenticationError('Password is required');
      }

      // Try to find user by phone, email, userId, or name (username)
      let user: any = null;
      
      // First, try userId (if it matches the pattern like LKU123456 or U123456)
      if (/^[A-Z]{2,3}\d+[A-Z0-9]*$/.test(username.toUpperCase())) {
        user = await User.findOne({ userId: username.toUpperCase() }).select('+password');
        if (user) {
          logger.info(`User found by userId: ${username}`);
        }
      }
      
      // Check if it's a phone number
      if (!user && /^[\d\s\+\-\(\)]+$/.test(username)) {
        const formattedPhone = formatPhoneNumber(username);
        user = await User.findOne({ phone: formattedPhone }).select('+password');
        if (user) {
          logger.info(`User found by phone: ${formattedPhone}`);
        }
      }
      
      // If not found, try email
      if (!user && username.includes('@')) {
        user = await User.findOne({ email: username.toLowerCase() }).select('+password');
        if (user) {
          logger.info(`User found by email: ${username.toLowerCase()}`);
        }
      }
      
      // If still not found, try by name (username) - case insensitive
      if (!user) {
        user = await User.findOne({ 
          name: { $regex: new RegExp(`^${username}$`, 'i') } 
        }).select('+password');
        if (user) {
          logger.info(`User found by name: ${username}`);
        }
      }

      if (!user) {
        logger.warn(`Login attempt failed - User not found for: ${username}`);
        throw new NotFoundError('User not found. Please check your username/phone/email and try again.');
      }

      if (!user.isActive) {
        throw new AuthenticationError('Account is inactive');
      }

      // Verify password
      if (!user.password) {
        throw new AuthenticationError('Password not set. Please reset your password.');
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid password');
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const payload: JWTPayload = {
        userId: user.userId,
        userType: user.userType,
        phone: user.phone,
      };

      const accessToken = this.generateAccessToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      logger.info(`User logged in: ${user.userId}`);

      return {
        user: user.toJSON(),
        tokens: {
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      logger.error('Error logging in user:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = this.verifyToken(refreshToken, true);

      // Verify user still exists and is active
      const user = await User.findOne({ userId: decoded.userId, isActive: true });
      if (!user) {
        throw new AuthenticationError('User not found or inactive');
      }

      // Generate new tokens
      const payload: JWTPayload = {
        userId: user.userId,
        userType: user.userType,
        phone: user.phone,
      };

      const newAccessToken = this.generateAccessToken(payload);
      const newRefreshToken = this.generateRefreshToken(payload);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      logger.error('Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(phone: string, newPassword: string): Promise<void> {
    try {
      const formattedPhone = formatPhoneNumber(phone);

      const user = await User.findOne({ phone: formattedPhone });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Set the new password - pre-save hook will hash it automatically
      user.password = newPassword;
      await user.save();

      logger.info(`Password reset for user: ${user.userId}`);
    } catch (error) {
      logger.error('Error resetting password:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
export default authService;
