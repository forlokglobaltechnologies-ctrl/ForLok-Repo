import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { JWTPayload } from '../types';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import Admin from '../models/Admin';
import AdminRole from '../models/AdminRole';

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
    adminContext?: {
      adminId: string;
      role: string;
      permissions: string[];
      isActive: boolean;
    };
  }
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  if (!config.jwt.secret) {
    throw new AuthenticationError('JWT configuration error');
  }
  try {
    const decoded = jwt.verify(token, config.jwt.secret as string) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token expired');
    }
    throw error;
  }
}

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    request.user = decoded;
  } catch (error) {
    throw error;
  }
}

export async function requireUserType(
  allowedTypes: ('individual' | 'company')[]
) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await authenticate(request, reply);

    if (!request.user) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!allowedTypes.includes(request.user.userType as 'individual' | 'company')) {
      throw new AuthorizationError(`Access denied. Required user type: ${allowedTypes.join(' or ')}`);
    }
  };
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await authenticate(request, reply);

  if (!request.user || request.user.userType !== 'admin') {
    throw new AuthorizationError('Admin access required');
  }

  const admin = await Admin.findOne({ adminId: request.user.userId }).select(
    'adminId role permissions isActive'
  );
  if (!admin || !admin.isActive) {
    throw new AuthorizationError('Admin account is inactive or not found');
  }

  let effectivePermissions = admin.permissions || [];
  if (admin.role !== 'super_admin' && effectivePermissions.length === 0) {
    const roleConfig = await AdminRole.findOne({ roleKey: admin.role, isActive: true })
      .select('permissions')
      .lean();
    effectivePermissions = roleConfig?.permissions || [];
  }

  request.adminContext = {
    adminId: admin.adminId,
    role: admin.role,
    permissions: effectivePermissions,
    isActive: admin.isActive,
  };
}

export function requireAdminPermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await requireAdmin(request, reply);

    const role = request.adminContext?.role;
    if (role === 'super_admin') {
      return;
    }

    const permissions = request.adminContext?.permissions || [];
    if (!permissions.includes(permission) && !permissions.includes('*')) {
      throw new AuthorizationError(`Missing required permission: ${permission}`);
    }
  };
}
