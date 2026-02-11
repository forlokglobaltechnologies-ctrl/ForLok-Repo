import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../../services/auth.service';
import { validate } from '../../middleware/validation.middleware';
import {
  userRegistrationSchema,
  otpVerificationSchema,
  loginSchema,
} from '../../utils/validators';
import { z } from 'zod';
import { ApiResponse } from '../../types';

// Request body schemas
const sendOTPSchema = z.object({
  phone: z.string().min(10).max(15).optional(),
  email: z.string().email().optional(),
  type: z.enum(['signup', 'login', 'reset_password', 'verify_phone', 'verify_email']),
}).refine((data) => data.phone || data.email, {
  message: 'Either phone or email must be provided',
});

const firebaseVerificationSchema = z.object({
  phone: z.string().min(10).max(15),
  idToken: z.string(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

const resetPasswordSchema = z.object({
  phone: z.string().min(10).max(15),
  newPassword: z.string().min(8),
});

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/auth/send-otp
   * Send OTP to phone number
   */
  fastify.post(
    '/send-otp',
    {
      preHandler: [validate(sendOTPSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { phone, email, type } = request.body as { phone?: string; email?: string; type: string };

      console.log('📱 ========== OTP REQUEST RECEIVED ==========');
      console.log('📱 Phone:', phone);
      console.log('📧 Email:', email);
      console.log('📱 Type:', type);
      console.log('📱 Timestamp:', new Date().toISOString());
      console.log('📱 Request IP:', request.ip);

      try {
        let result;
        if (email && type === 'verify_email') {
          result = await authService.sendEmailOTP(email, type as any);
        } else if (phone) {
          result = await authService.sendOTP(phone, type as any);
        } else {
          return reply.status(400).send({
            success: false,
            message: 'Either phone or email must be provided',
            error: 'MISSING_PHONE_OR_EMAIL',
          });
        }

        console.log('✅ OTP processed successfully');
        console.log('📱 ===========================================\n');

        // Include OTP in response for development/testing
        // In production, remove this and only send success message
        const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
        
        const response: ApiResponse = {
          success: true,
          message: 'OTP sent successfully',
          // Include OTP in response for development (remove in production)
          // TODO: Remove OTP from response once SMS provider is configured
          data: isDevelopment 
            ? { 
                otp: result.otp, 
                expiresAt: result.expiresAt,
                message: 'OTP displayed for development. Configure SMS provider (Twilio/MSG91) in .env for production SMS sending.'
              }
            : undefined,
        };

        return reply.status(200).send(response);
      } catch (error: any) {
        console.error('❌ OTP REQUEST FAILED:', error);
        console.error('❌ Error Message:', error.message);
        console.error('❌ Error Stack:', error.stack);
        console.log('📱 ===========================================\n');
        throw error;
      }
    }
  );

  /**
   * POST /api/auth/verify-otp
   * Verify OTP (for non-Firebase flows)
   */
  fastify.post(
    '/verify-otp',
    {
      preHandler: [validate(otpVerificationSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { phone, email, otp, type } = request.body as {
        phone?: string;
        email?: string;
        otp: string;
        type: string;
      };

      const phoneOrEmail = phone || email;
      if (!phoneOrEmail) {
        return reply.status(400).send({
          success: false,
          message: 'Either phone or email must be provided',
          error: 'MISSING_PHONE_OR_EMAIL',
        });
      }

      const isValid = await authService.verifyOTP(phoneOrEmail, otp, type as any);

      if (!isValid) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid OTP',
          error: 'INVALID_OTP',
        });
      }

      const response: ApiResponse = {
        success: true,
        message: 'OTP verified successfully',
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/auth/verify-firebase
   * Verify Firebase ID token (for Firebase Phone Auth)
   */
  fastify.post(
    '/verify-firebase',
    {
      preHandler: [validate(firebaseVerificationSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { phone, idToken } = request.body as { phone: string; idToken: string };

      const isValid = await authService.verifyFirebaseToken(phone, idToken);

      if (!isValid) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid Firebase token',
          error: 'INVALID_TOKEN',
        });
      }

      const response: ApiResponse = {
        success: true,
        message: 'Firebase token verified successfully',
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/auth/signup
   * Register new user
   */
  fastify.post(
    '/signup',
    {
      preHandler: [validate(userRegistrationSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = request.body as {
        phone: string;
        name: string;
        userType: 'individual' | 'company';
        email?: string;
        password: string;
        confirmPassword?: string;
        referralCode?: string;
      };

      console.log('📝 [SIGNUP ROUTE] Received registration data:');
      console.log('📝 userType:', data.userType);
      console.log('📝 Full data:', JSON.stringify(data, null, 2));

      const result = await authService.registerUser(data);
      
      console.log('📝 [SIGNUP ROUTE] User created with userType:', result.user.userType);

      const response: ApiResponse = {
        success: true,
        message: 'User registered successfully',
        data: result,
      };

      return reply.status(201).send(response);
    }
  );

  /**
   * POST /api/auth/signin
   * Login user
   */
  fastify.post(
    '/signin',
    {
      preHandler: [validate(loginSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { username, password } = request.body as { username: string; password: string };

      const result = await authService.loginUser(username, password);

      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/auth/refresh-token
   * Refresh access token
   */
  fastify.post(
    '/refresh-token',
    {
      preHandler: [validate(refreshTokenSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { refreshToken } = request.body as { refreshToken: string };

      const tokens = await authService.refreshToken(refreshToken);

      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
        data: tokens,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/auth/reset-password
   * Reset password
   */
  fastify.post(
    '/reset-password',
    {
      preHandler: [validate(resetPasswordSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { phone, newPassword } = request.body as {
        phone: string;
        newPassword: string;
      };

      await authService.resetPassword(phone, newPassword);

      const response: ApiResponse = {
        success: true,
        message: 'Password reset successfully',
      };

      return reply.status(200).send(response);
    }
  );
}
