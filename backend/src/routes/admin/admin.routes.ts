import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { adminService } from '../../services/admin.service';
import { feedbackService } from '../../services/feedback.service';
import {
  authenticate,
  requireAdmin,
  requireAdminPermission,
} from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';
import { ApiResponse, FeedbackStatus } from '../../types';
import { ADMIN_PERMISSIONS } from '../../constants/admin-permissions';
import ContentPage from '../../models/ContentPage';
import MasterDataItem from '../../models/MasterDataItem';
import AdminSetting from '../../models/AdminSetting';
import Admin from '../../models/Admin';
import AdminRole from '../../models/AdminRole';
import AdminAuditLog from '../../models/AdminAuditLog';

export async function adminRoutes(fastify: FastifyInstance) {
  const writeAuditLog = async (params: {
    actorAdminId: string;
    action: string;
    entityType: 'role' | 'admin_user';
    entityId: string;
    entityLabel?: string;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
  }) => {
    try {
      await AdminAuditLog.create(params);
    } catch (_error) {
      // Keep primary admin action successful even if audit logging fails.
    }
  };

  const rolePayloadSchema = z.object({
    roleKey: z
      .string()
      .min(2)
      .max(40)
      .regex(/^[a-z0-9_]+$/, 'roleKey must contain lowercase letters, numbers, or underscore'),
    name: z.string().min(2).max(80),
    description: z.string().max(300).optional(),
    permissions: z.array(z.string().min(1)).default([]),
    isActive: z.boolean().optional(),
  });

  const updateRoleSchema = z.object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(300).optional(),
    permissions: z.array(z.string().min(1)).optional(),
    isActive: z.boolean().optional(),
  });

  const createAdminSchema = z.object({
    username: z.string().min(3).max(40),
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2).max(80),
    role: z.string().min(2).max(40),
    permissions: z.array(z.string().min(1)).optional(),
    isActive: z.boolean().optional(),
  });

  const updateAdminSchema = z.object({
    name: z.string().min(2).max(80).optional(),
    email: z.string().email().optional(),
    role: z.string().min(2).max(40).optional(),
    permissions: z.array(z.string().min(1)).optional(),
    isActive: z.boolean().optional(),
  });

  const resetAdminPasswordSchema = z.object({
    password: z.string().min(8),
  });

  /**
   * GET /api/admin/dashboard/stats
   * Get dashboard statistics (admin)
   */
  fastify.get(
    '/dashboard/stats',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.DASHBOARD_VIEW)],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const stats = await adminService.getDashboardStats();

      const response: ApiResponse = {
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: stats,
      };

      return reply.status(200).send(response);
    }
  );

  fastify.get(
    '/me/permissions',
    {
      preHandler: [authenticate, requireAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const response: ApiResponse = {
        success: true,
        message: 'Admin permissions retrieved successfully',
        data: {
          adminId: request.adminContext?.adminId,
          role: request.adminContext?.role,
          permissions: request.adminContext?.permissions || [],
        },
      };
      return reply.status(200).send(response);
    }
  );

  // ==================
  // Admin Roles Routes
  // ==================

  fastify.get(
    '/roles',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.ROLES_VIEW)],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const roles = await AdminRole.find().sort({ isSystem: -1, name: 1 }).lean();
      return reply.status(200).send({
        success: true,
        message: 'Roles retrieved successfully',
        data: { roles },
      });
    }
  );

  fastify.post(
    '/roles',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.ROLES_MANAGE),
        validate(rolePayloadSchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const body = request.body as z.infer<typeof rolePayloadSchema>;
      const roleKey = body.roleKey.toLowerCase();

      const existing = await AdminRole.findOne({ roleKey });
      if (existing) {
        return reply.status(409).send({ success: false, message: 'Role key already exists' });
      }

      const role = await AdminRole.create({
        roleKey,
        name: body.name,
        description: body.description,
        permissions: Array.from(new Set(body.permissions || [])),
        isActive: body.isActive ?? true,
        isSystem: false,
        createdBy: adminId,
        updatedBy: adminId,
      });

      await writeAuditLog({
        actorAdminId: adminId,
        action: 'role.create',
        entityType: 'role',
        entityId: role.roleId,
        entityLabel: role.roleKey,
        changes: {
          after: {
            roleKey: role.roleKey,
            name: role.name,
            description: role.description,
            permissions: role.permissions,
            isActive: role.isActive,
          },
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Role created successfully',
        data: role,
      });
    }
  );

  fastify.put(
    '/roles/:roleKey',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.ROLES_MANAGE),
        validate(updateRoleSchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { roleKey } = request.params as { roleKey: string };
      const body = request.body as z.infer<typeof updateRoleSchema>;

      const role = await AdminRole.findOne({ roleKey: roleKey.toLowerCase() });
      if (!role) {
        return reply.status(404).send({ success: false, message: 'Role not found' });
      }
      const before = {
        roleKey: role.roleKey,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isActive: role.isActive,
      };

      if (body.name !== undefined) role.name = body.name;
      if (body.description !== undefined) role.description = body.description;
      if (body.permissions !== undefined) role.permissions = Array.from(new Set(body.permissions));
      if (body.isActive !== undefined) role.isActive = body.isActive;
      role.updatedBy = adminId;
      await role.save();

      await writeAuditLog({
        actorAdminId: adminId,
        action: 'role.update',
        entityType: 'role',
        entityId: role.roleId,
        entityLabel: role.roleKey,
        changes: {
          before,
          after: {
            roleKey: role.roleKey,
            name: role.name,
            description: role.description,
            permissions: role.permissions,
            isActive: role.isActive,
          },
        },
      });

      return reply.status(200).send({
        success: true,
        message: 'Role updated successfully',
        data: role,
      });
    }
  );

  fastify.delete(
    '/roles/:roleKey',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.ROLES_MANAGE)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actorAdminId = (request as any).user.userId;
      const { roleKey } = request.params as { roleKey: string };
      const role = await AdminRole.findOne({ roleKey: roleKey.toLowerCase() });
      if (!role) {
        return reply.status(404).send({ success: false, message: 'Role not found' });
      }
      if (role.isSystem) {
        return reply.status(400).send({ success: false, message: 'System role cannot be deleted' });
      }

      const linkedAdmins = await Admin.countDocuments({ role: role.roleKey });
      if (linkedAdmins > 0) {
        return reply.status(400).send({
          success: false,
          message: 'Role is assigned to admin users and cannot be deleted',
        });
      }

      await writeAuditLog({
        actorAdminId,
        action: 'role.delete',
        entityType: 'role',
        entityId: role.roleId,
        entityLabel: role.roleKey,
        changes: {
          before: {
            roleKey: role.roleKey,
            name: role.name,
            permissions: role.permissions,
            isActive: role.isActive,
          },
        },
      });

      await AdminRole.deleteOne({ _id: role._id });
      return reply.status(200).send({
        success: true,
        message: 'Role deleted successfully',
      });
    }
  );

  // =======================
  // Admin Users Management
  // =======================

  fastify.get(
    '/admins',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.ADMINS_VIEW)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { page?: string; limit?: string; search?: string; status?: string };
      const page = query.page ? Math.max(parseInt(query.page), 1) : 1;
      const limit = query.limit ? Math.min(Math.max(parseInt(query.limit), 1), 100) : 20;
      const skip = (page - 1) * limit;
      const filter: any = {};

      if (query.status === 'active') filter.isActive = true;
      if (query.status === 'inactive') filter.isActive = false;
      if (query.search) {
        const re = new RegExp(query.search, 'i');
        filter.$or = [{ username: re }, { email: re }, { name: re }, { adminId: re }];
      }

      const [admins, total] = await Promise.all([
        Admin.find(filter)
          .select('adminId username email name role permissions isActive lastLogin createdAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Admin.countDocuments(filter),
      ]);

      return reply.status(200).send({
        success: true,
        message: 'Admin users retrieved successfully',
        data: { admins, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
      });
    }
  );

  fastify.post(
    '/admins',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.ADMINS_MANAGE),
        validate(createAdminSchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actorAdminId = (request as any).user.userId;
      const body = request.body as z.infer<typeof createAdminSchema>;
      const roleKey = body.role.toLowerCase();

      const existing = await Admin.findOne({
        $or: [{ username: body.username.toLowerCase() }, { email: body.email.toLowerCase() }],
      });
      if (existing) {
        return reply.status(409).send({ success: false, message: 'Username or email already exists' });
      }

      let permissions = body.permissions ? Array.from(new Set(body.permissions)) : [];
      if (roleKey === 'super_admin') {
        permissions = ['*'];
      } else if (permissions.length === 0) {
        const roleConfig = await AdminRole.findOne({ roleKey, isActive: true }).lean();
        if (roleConfig) {
          permissions = roleConfig.permissions || [];
        }
      }

      const admin = await Admin.create({
        username: body.username.toLowerCase(),
        email: body.email.toLowerCase(),
        password: body.password,
        name: body.name,
        role: roleKey,
        permissions,
        isActive: body.isActive ?? true,
      });

      await writeAuditLog({
        actorAdminId,
        action: 'admin_user.create',
        entityType: 'admin_user',
        entityId: admin.adminId,
        entityLabel: admin.username,
        changes: {
          after: {
            username: admin.username,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            permissions: admin.permissions,
            isActive: admin.isActive,
          },
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Admin user created successfully',
        data: admin.toJSON(),
      });
    }
  );

  fastify.put(
    '/admins/:adminId',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.ADMINS_MANAGE),
        validate(updateAdminSchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actorAdminId = (request as any).user.userId;
      const { adminId } = request.params as { adminId: string };
      const body = request.body as z.infer<typeof updateAdminSchema>;

      const admin = await Admin.findOne({ adminId });
      if (!admin) {
        return reply.status(404).send({ success: false, message: 'Admin user not found' });
      }
      const before = {
        username: admin.username,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
        isActive: admin.isActive,
      };

      if (admin.adminId === actorAdminId && body.isActive === false) {
        return reply.status(400).send({ success: false, message: 'You cannot deactivate yourself' });
      }

      if (body.name !== undefined) admin.name = body.name;
      if (body.email !== undefined) admin.email = body.email.toLowerCase();

      let roleKey = admin.role;
      if (body.role !== undefined) {
        roleKey = body.role.toLowerCase();
        admin.role = roleKey;
      }

      if (roleKey === 'super_admin') {
        admin.permissions = ['*'];
      } else if (body.permissions !== undefined) {
        admin.permissions = Array.from(new Set(body.permissions));
      } else if (body.role !== undefined) {
        const roleConfig = await AdminRole.findOne({ roleKey, isActive: true }).lean();
        admin.permissions = roleConfig?.permissions || [];
      }

      if (body.isActive !== undefined) admin.isActive = body.isActive;
      await admin.save();

      await writeAuditLog({
        actorAdminId,
        action: 'admin_user.update',
        entityType: 'admin_user',
        entityId: admin.adminId,
        entityLabel: admin.username,
        changes: {
          before,
          after: {
            username: admin.username,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            permissions: admin.permissions,
            isActive: admin.isActive,
          },
        },
      });

      return reply.status(200).send({
        success: true,
        message: 'Admin user updated successfully',
        data: admin.toJSON(),
      });
    }
  );

  fastify.put(
    '/admins/:adminId/reset-password',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.ADMINS_MANAGE),
        validate(resetAdminPasswordSchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actorAdminId = (request as any).user.userId;
      const { adminId } = request.params as { adminId: string };
      const { password } = request.body as z.infer<typeof resetAdminPasswordSchema>;

      const admin = await Admin.findOne({ adminId }).select('+password');
      if (!admin) {
        return reply.status(404).send({ success: false, message: 'Admin user not found' });
      }

      admin.password = password;
      await admin.save();

      await writeAuditLog({
        actorAdminId,
        action: 'admin_user.reset_password',
        entityType: 'admin_user',
        entityId: admin.adminId,
        entityLabel: admin.username,
      });

      return reply.status(200).send({
        success: true,
        message: 'Admin password reset successfully',
      });
    }
  );

  fastify.delete(
    '/admins/:adminId',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.ADMINS_MANAGE)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const actorAdminId = (request as any).user.userId;
      const { adminId } = request.params as { adminId: string };
      const admin = await Admin.findOne({ adminId });
      if (!admin) {
        return reply.status(404).send({ success: false, message: 'Admin user not found' });
      }
      if (admin.adminId === actorAdminId) {
        return reply.status(400).send({ success: false, message: 'You cannot delete yourself' });
      }
      if (admin.role === 'super_admin') {
        return reply.status(400).send({ success: false, message: 'Super admin cannot be deleted' });
      }

      await writeAuditLog({
        actorAdminId,
        action: 'admin_user.delete',
        entityType: 'admin_user',
        entityId: admin.adminId,
        entityLabel: admin.username,
        changes: {
          before: {
            username: admin.username,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            permissions: admin.permissions,
            isActive: admin.isActive,
          },
        },
      });

      await Admin.deleteOne({ _id: admin._id });
      return reply.status(200).send({
        success: true,
        message: 'Admin user deleted successfully',
      });
    }
  );

  /**
   * GET /api/admin/users
   * Get all users (admin)
   */
  fastify.get(
    '/users',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.USERS_VIEW)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        status?: string;
        userType?: string;
        verified?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.userType) filters.userType = query.userType;
      if (query.verified !== undefined) filters.verified = query.verified === 'true';
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await adminService.getAllUsers(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Users retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/users/:userId
   * Get user details (admin)
   */
  fastify.get(
    '/users/:userId',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.USERS_VIEW)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };

      const userDetails = await adminService.getUserDetails(userId);

      const response: ApiResponse = {
        success: true,
        message: 'User details retrieved successfully',
        data: userDetails,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/users/:userId/verify
   * Verify user (admin)
   */
  fastify.put(
    '/users/:userId/verify',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.USERS_MANAGE)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };

      const user = await adminService.verifyUser(userId);

      const response: ApiResponse = {
        success: true,
        message: 'User verified successfully',
        data: user,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/users/:userId/suspend
   * Suspend user (admin)
   */
  fastify.put(
    '/users/:userId/suspend',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.USERS_MANAGE)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };

      const user = await adminService.suspendUser(userId);

      const response: ApiResponse = {
        success: true,
        message: 'User suspended successfully',
        data: user,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/users/:userId/activate
   * Activate user (admin)
   */
  fastify.put(
    '/users/:userId/activate',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.USERS_MANAGE)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId: string };

      const user = await adminService.activateUser(userId);

      const response: ApiResponse = {
        success: true,
        message: 'User activated successfully',
        data: user,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/pooling/offers
   * Get all pooling offers (admin)
   */
  fastify.get(
    '/pooling/offers',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.OFFERS_VIEW)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        status?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await adminService.getAllPoolingOffers(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Pooling offers retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/pooling/offers/:offerId/approve
   * Approve pooling offer (admin)
   */
  fastify.put(
    '/pooling/offers/:offerId/approve',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.OFFERS_MODERATE)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId } = request.params as { offerId: string };

      const offer = await adminService.approvePoolingOffer(offerId);

      const response: ApiResponse = {
        success: true,
        message: 'Pooling offer approved successfully',
        data: offer,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/pooling/offers/:offerId/suspend
   * Suspend pooling offer (admin)
   */
  fastify.put(
    '/pooling/offers/:offerId/suspend',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.OFFERS_MODERATE)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId } = request.params as { offerId: string };

      const offer = await adminService.suspendPoolingOffer(offerId);

      const response: ApiResponse = {
        success: true,
        message: 'Pooling offer suspended successfully',
        data: offer,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/rental/offers
   * Get all rental offers (admin)
   */
  fastify.get(
    '/rental/offers',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.OFFERS_VIEW)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        status?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await adminService.getAllRentalOffers(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Rental offers retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/rental/offers/:offerId/approve
   * Approve rental offer (admin)
   */
  fastify.put(
    '/rental/offers/:offerId/approve',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.OFFERS_MODERATE)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId } = request.params as { offerId: string };

      const offer = await adminService.approveRentalOffer(offerId);

      const response: ApiResponse = {
        success: true,
        message: 'Rental offer approved successfully',
        data: offer,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/rental/offers/:offerId/suspend
   * Suspend rental offer (admin)
   */
  fastify.put(
    '/rental/offers/:offerId/suspend',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.OFFERS_MODERATE)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId } = request.params as { offerId: string };

      const offer = await adminService.suspendRentalOffer(offerId);

      const response: ApiResponse = {
        success: true,
        message: 'Rental offer suspended successfully',
        data: offer,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/bookings
   * Get all bookings (admin)
   */
  fastify.get(
    '/bookings',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.BOOKINGS_VIEW)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        status?: string;
        serviceType?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.serviceType) filters.serviceType = query.serviceType;
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await adminService.getAllBookings(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Bookings retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  // =====================
  // PROMO REVIEW ENDPOINTS
  // =====================

  /**
   * GET /api/admin/promos
   * List promo submissions (admin)
   */
  fastify.get(
    '/promos',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.PROMOS_REVIEW)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { status?: string; page?: string; limit?: string };
      const status = query.status || 'pending';
      const page = query.page ? parseInt(query.page) : 1;
      const limit = query.limit ? parseInt(query.limit) : 20;
      const skip = (page - 1) * limit;

      const PromoSubmission = (await import('../../models/PromoSubmission')).default;
      const User = (await import('../../models/User')).default;

      const filter: any = {};
      if (status !== 'all') filter.status = status;

      const [submissions, total] = await Promise.all([
        PromoSubmission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        PromoSubmission.countDocuments(filter),
      ]);

      // Attach user names
      const userIds = [...new Set(submissions.map((s: any) => s.userId))];
      const users = await User.find({ userId: { $in: userIds } }).select('userId name').lean();
      const userMap = new Map(users.map((u: any) => [u.userId, u.name]));

      const enriched = submissions.map((s: any) => ({
        ...s,
        userName: userMap.get(s.userId) || 'Unknown',
      }));

      return reply.status(200).send({
        success: true,
        message: 'Promo submissions retrieved',
        data: { submissions: enriched, total, page, limit },
      });
    }
  );

  /**
   * PUT /api/admin/promos/:submissionId/approve
   * Approve promo and award coins (admin)
   */
  fastify.put(
    '/promos/:submissionId/approve',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.PROMOS_REVIEW)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { submissionId } = request.params as { submissionId: string };

      const PromoSubmission = (await import('../../models/PromoSubmission')).default;
      const { coinService } = await import('../../services/coin.service');
      const { notificationService } = await import('../../services/notification.service');

      const submission = await PromoSubmission.findOne({ submissionId });
      if (!submission) {
        return reply.status(404).send({ success: false, message: 'Submission not found' });
      }
      if (submission.status !== 'pending') {
        return reply.status(400).send({ success: false, message: 'Submission already reviewed' });
      }

      // Award coins
      const coins = await coinService.awardPromoCoins(submission.userId, submissionId, submission.platform);

      submission.status = 'approved';
      submission.reviewedBy = adminId;
      submission.coinsAwarded = coins;
      submission.reviewedAt = new Date();
      await submission.save();

      // Notify user
      await notificationService.createNotification({
        userId: submission.userId,
        type: 'promo_approved',
        title: 'Promotion Approved!',
        message: `Your ${submission.platform.replace(/_/g, ' ')} promotion was approved! You earned ${coins} coins.`,
        data: { submissionId, coins },
      });

      return reply.status(200).send({
        success: true,
        message: `Promo approved. ${coins} coins awarded.`,
        data: submission.toJSON(),
      });
    }
  );

  /**
   * PUT /api/admin/promos/:submissionId/reject
   * Reject promo submission (admin)
   */
  fastify.put(
    '/promos/:submissionId/reject',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.PROMOS_REVIEW)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { submissionId } = request.params as { submissionId: string };
      const { reason } = request.body as { reason?: string };

      const PromoSubmission = (await import('../../models/PromoSubmission')).default;
      const { notificationService } = await import('../../services/notification.service');

      const submission = await PromoSubmission.findOne({ submissionId });
      if (!submission) {
        return reply.status(404).send({ success: false, message: 'Submission not found' });
      }
      if (submission.status !== 'pending') {
        return reply.status(400).send({ success: false, message: 'Submission already reviewed' });
      }

      submission.status = 'rejected';
      submission.reviewedBy = adminId;
      submission.reviewNote = reason || 'Does not meet requirements';
      submission.reviewedAt = new Date();
      await submission.save();

      // Notify user
      await notificationService.createNotification({
        userId: submission.userId,
        type: 'promo_rejected',
        title: 'Promotion Rejected',
        message: `Your ${submission.platform.replace(/_/g, ' ')} promotion was not approved. ${reason || 'Please try again with valid content.'}`,
        data: { submissionId },
      });

      return reply.status(200).send({
        success: true,
        message: 'Promo submission rejected',
        data: submission.toJSON(),
      });
    }
  );

  /**
   * GET /api/admin/coins/stats
   * Coin system analytics (admin)
   */
  fastify.get(
    '/coins/stats',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.COINS_VIEW)],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const CoinWallet = (await import('../../models/CoinWallet')).default;
      const PromoSubmission = (await import('../../models/PromoSubmission')).default;

      const [wallets, promoStats] = await Promise.all([
        CoinWallet.aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              totalCoinsIssued: { $sum: '$totalEarned' },
              totalCoinsRedeemed: { $sum: '$totalRedeemed' },
              totalCoinsInCirculation: { $sum: '$balance' },
            },
          },
        ]),
        PromoSubmission.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      const stats = wallets[0] || {
        totalUsers: 0,
        totalCoinsIssued: 0,
        totalCoinsRedeemed: 0,
        totalCoinsInCirculation: 0,
      };

      const promos: any = { pending: 0, approved: 0, rejected: 0 };
      promoStats.forEach((p: any) => {
        promos[p._id] = p.count;
      });

      return reply.status(200).send({
        success: true,
        message: 'Coin system stats',
        data: { ...stats, promos },
      });
    }
  );

  // ==================
  // Admin Feedback Routes
  // ==================

  /**
   * GET /api/admin/feedback/stats
   * Get feedback statistics
   */
  fastify.get(
    '/feedback/stats',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.FEEDBACK_VIEW)],
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const stats = await feedbackService.getFeedbackStats();

      const response: ApiResponse = {
        success: true,
        message: 'Feedback stats retrieved',
        data: stats,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/feedback
   * Get all feedback (admin)
   */
  fastify.get(
    '/feedback',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.FEEDBACK_VIEW)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as {
        status?: string;
        type?: string;
        priority?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.type) filters.type = query.type;
      if (query.priority) filters.priority = query.priority;
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await feedbackService.getAllFeedback(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Feedback retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/admin/feedback/:feedbackId
   * Get feedback details (admin)
   */
  fastify.get(
    '/feedback/:feedbackId',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.FEEDBACK_VIEW)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { feedbackId } = request.params as { feedbackId: string };

      const feedback = await feedbackService.getFeedbackByIdAdmin(feedbackId);

      const response: ApiResponse = {
        success: true,
        message: 'Feedback retrieved successfully',
        data: feedback,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/admin/feedback/:feedbackId/status
   * Update feedback status (admin)
   */
  fastify.put(
    '/feedback/:feedbackId/status',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.FEEDBACK_MANAGE),
        validate(z.object({ status: z.enum(['pending', 'acknowledged', 'resolved', 'archived']) })),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { feedbackId } = request.params as { feedbackId: string };
      const { status } = request.body as { status: FeedbackStatus };
      const adminUserId = (request as any).user.userId;

      const feedback = await feedbackService.updateFeedbackStatus(
        feedbackId,
        status,
        adminUserId
      );

      const response: ApiResponse = {
        success: true,
        message: `Feedback status updated to ${status}`,
        data: feedback,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/admin/feedback/:feedbackId/respond
   * Respond to feedback (admin)
   */
  fastify.post(
    '/feedback/:feedbackId/respond',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.FEEDBACK_MANAGE),
        validate(z.object({ response: z.string().min(1).max(1000) })),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { feedbackId } = request.params as { feedbackId: string };
      const { response: responseText } = request.body as { response: string };
      const adminUserId = (request as any).user.userId;

      const feedback = await feedbackService.respondToFeedback(
        feedbackId,
        responseText,
        adminUserId
      );

      const apiResponse: ApiResponse = {
        success: true,
        message: 'Response sent successfully',
        data: feedback,
      };

      return reply.status(200).send(apiResponse);
    }
  );

  fastify.put(
    '/feedback/:feedbackId/assign',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.FEEDBACK_MANAGE),
        validate(z.object({ assigneeAdminId: z.string().min(1) })),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { feedbackId } = request.params as { feedbackId: string };
      const { assigneeAdminId } = request.body as { assigneeAdminId: string };
      const adminUserId = (request as any).user.userId;
      const feedback = await feedbackService.assignFeedback(feedbackId, assigneeAdminId, adminUserId);
      return reply.status(200).send({
        success: true,
        message: 'Feedback assigned successfully',
        data: feedback,
      });
    }
  );

  // CMS content management
  fastify.get(
    '/content-pages',
    { preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.CONTENT_VIEW)] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const pages = await ContentPage.find().sort({ updatedAt: -1 }).lean();
      return reply.status(200).send({ success: true, message: 'Content pages retrieved', data: { pages } });
    }
  );

  fastify.put(
    '/content-pages/:key',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.CONTENT_MANAGE),
        validate(
          z.object({
            title: z.string().min(1),
            description: z.string().optional(),
            payload: z.record(z.any()),
            isPublished: z.boolean().optional(),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { key } = request.params as { key: string };
      const body = request.body as {
        title: string;
        description?: string;
        payload: Record<string, any>;
        isPublished?: boolean;
      };

      const existing = await ContentPage.findOne({ key: key.toLowerCase() });
      const page = await ContentPage.findOneAndUpdate(
        { key: key.toLowerCase() },
        {
          key: key.toLowerCase(),
          title: body.title,
          description: body.description,
          payload: body.payload,
          isPublished: body.isPublished ?? true,
          updatedBy: adminId,
          createdBy: existing?.createdBy || adminId,
          publishedAt: body.isPublished === false ? undefined : new Date(),
          $inc: { version: 1 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return reply.status(200).send({
        success: true,
        message: 'Content page saved successfully',
        data: page,
      });
    }
  );

  // Master data management
  fastify.get(
    '/master-data/:type',
    { preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.MASTER_DATA_VIEW)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type } = request.params as { type: string };
      const items = await MasterDataItem.find({ type: type.toLowerCase() })
        .sort({ sortOrder: 1, label: 1 })
        .lean();
      return reply.status(200).send({
        success: true,
        message: 'Master data retrieved successfully',
        data: { items },
      });
    }
  );

  fastify.put(
    '/master-data/:type/:key',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.MASTER_DATA_MANAGE),
        validate(
          z.object({
            label: z.string().min(1),
            value: z.string().optional(),
            metadata: z.record(z.any()).optional(),
            sortOrder: z.number().optional(),
            isActive: z.boolean().optional(),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { type, key } = request.params as { type: string; key: string };
      const body = request.body as any;
      const item = await MasterDataItem.findOneAndUpdate(
        { type: type.toLowerCase(), key: key.toLowerCase() },
        {
          type: type.toLowerCase(),
          key: key.toLowerCase(),
          label: body.label,
          value: body.value,
          metadata: body.metadata || {},
          sortOrder: body.sortOrder ?? 0,
          isActive: body.isActive ?? true,
          updatedBy: adminId,
          createdBy: adminId,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return reply.status(200).send({
        success: true,
        message: 'Master data item saved successfully',
        data: item,
      });
    }
  );

  fastify.delete(
    '/master-data/:type/:key',
    {
      preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.MASTER_DATA_MANAGE)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type, key } = request.params as { type: string; key: string };
      await MasterDataItem.findOneAndDelete({ type: type.toLowerCase(), key: key.toLowerCase() });
      return reply.status(200).send({
        success: true,
        message: 'Master data item deleted successfully',
      });
    }
  );

  // Admin settings persistence
  fastify.get(
    '/settings',
    { preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_VIEW)] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const settings = await AdminSetting.findOne({ key: 'system' }).lean();
      return reply.status(200).send({
        success: true,
        message: 'Admin settings retrieved successfully',
        data: settings?.value || {},
      });
    }
  );

  fastify.put(
    '/settings',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_MANAGE),
        validate(z.record(z.any())),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const settingsPayload = request.body as Record<string, any>;
      const settings = await AdminSetting.findOneAndUpdate(
        { key: 'system' },
        { value: settingsPayload, updatedBy: adminId },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return reply.status(200).send({
        success: true,
        message: 'Admin settings updated successfully',
        data: settings.value,
      });
    }
  );
}
