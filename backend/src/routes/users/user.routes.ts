import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { userService } from '../../services/user.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { validateFileUpload } from '../../middleware/upload.middleware';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import { ApiResponse } from '../../types';

// Request schemas
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  language: z.enum(['en', 'te', 'hi']).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

const updatePhoneSchema = z.object({
  phone: z.string().min(10).max(15),
});

const updateLanguageSchema = z.object({
  language: z.enum(['en', 'te', 'hi']),
});

export async function userRoutes(fastify: FastifyInstance) {
  // Register multipart plugin for file uploads
  await fastify.register(multipart);
  /**
   * GET /api/users/profile
   * Get user profile (authenticated)
   */
  fastify.get(
    '/profile',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const profile = await userService.getUserProfile(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Profile retrieved successfully',
        data: profile,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/users/profile
   * Update user profile (authenticated)
   */
  fastify.put(
    '/profile',
    {
      preHandler: [authenticate, validate(updateProfileSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const data = request.body as any;

      // Convert dateOfBirth string to Date if provided
      if (data.dateOfBirth) {
        data.dateOfBirth = new Date(data.dateOfBirth);
      }

      const profile = await userService.updateUserProfile(userId, data);

      const response: ApiResponse = {
        success: true,
        message: 'Profile updated successfully',
        data: profile,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/users/profile/photo
   * Upload profile photo (authenticated)
   */
  fastify.post(
    '/profile/photo',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          message: 'No file uploaded',
          error: 'NO_FILE',
        });
      }

      // Validate file
      const validationError = validateFileUpload(data);
      if (validationError) {
        return reply.status(400).send({
          success: false,
          message: validationError,
          error: 'INVALID_FILE',
        });
      }

      const buffer = await data.toBuffer();
      const result = await userService.uploadProfilePhoto(
        userId,
        buffer,
        data.mimetype
      );

      const response: ApiResponse = {
        success: true,
        message: 'Profile photo uploaded successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/users/stats
   * Get user statistics (authenticated)
   */
  fastify.get(
    '/stats',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const stats = await userService.getUserStats(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Statistics retrieved successfully',
        data: stats,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/users/language
   * Update language preference (authenticated)
   */
  fastify.put(
    '/language',
    {
      preHandler: [authenticate, validate(updateLanguageSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { language } = request.body as { language: 'en' | 'te' | 'hi' };

      const result = await userService.updateLanguage(userId, language);

      const response: ApiResponse = {
        success: true,
        message: 'Language preference updated successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/users/change-password
   * Change password (authenticated)
   */
  fastify.post(
    '/change-password',
    {
      preHandler: [authenticate, validate(changePasswordSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { currentPassword, newPassword } = request.body as {
        currentPassword: string;
        newPassword: string;
      };

      await userService.changePassword(userId, currentPassword, newPassword);

      const response: ApiResponse = {
        success: true,
        message: 'Password changed successfully',
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/users/update-phone
   * Update phone number (authenticated, requires OTP verification first)
   */
  fastify.post(
    '/update-phone',
    {
      preHandler: [authenticate, validate(updatePhoneSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { phone } = request.body as { phone: string };

      const result = await userService.updatePhone(userId, phone);

      const response: ApiResponse = {
        success: true,
        message: 'Phone number updated successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * DELETE /api/users/account
   * Delete user account (authenticated)
   */
  fastify.delete(
    '/account',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      await userService.deleteAccount(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Account deleted successfully',
      };

      return reply.status(200).send(response);
    }
  );
}
