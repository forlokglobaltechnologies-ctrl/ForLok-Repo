import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { config } from '../../config/env';
import Admin from '../../models/Admin';
import { AuthenticationError } from '../../utils/errors';
import { validate } from '../../middleware/validation.middleware';
import { ApiResponse } from '../../types';
import logger from '../../utils/logger';

const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function adminAuthRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/admin/auth/login
   * Admin login
   */
  fastify.post(
    '/login',
    {
      preHandler: [validate(adminLoginSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };

      const admin = await Admin.findOne({ username: username.toLowerCase() }).select('+password');

      if (!admin) {
        throw new AuthenticationError('Invalid credentials');
      }

      if (!admin.isActive) {
        throw new AuthenticationError('Admin account is inactive');
      }

      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Update last login
      admin.lastLogin = new Date();
      await admin.save();

      // Generate tokens
      const payload = {
        userId: admin.adminId,
        userType: 'admin' as const,
        username: admin.username,
      };

      if (!config.jwt.secret || !config.jwt.refreshSecret) {
        return reply.status(500).send({ error: 'JWT configuration error' });
      }

      const options: SignOptions = {
        expiresIn: config.jwt.expiresIn as StringValue,
      };

      const accessToken = jwt.sign(payload, config.jwt.secret as Secret, options);

      const refreshOptions: SignOptions = {
        expiresIn: config.jwt.refreshExpiresIn as StringValue,
      };

      const refreshToken = jwt.sign(payload, config.jwt.refreshSecret as Secret, refreshOptions);

      logger.info(`Admin logged in: ${admin.adminId}`);

      const response: ApiResponse = {
        success: true,
        message: 'Admin login successful',
        data: {
          admin: admin.toJSON(),
          tokens: {
            accessToken,
            refreshToken,
          },
        },
      };

      return reply.status(200).send(response);
    }
  );
}
