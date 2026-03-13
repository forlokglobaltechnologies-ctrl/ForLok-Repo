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
import PricingFuelRate from '../../models/PricingFuelRate';
import PricingVehicleMileage from '../../models/PricingVehicleMileage';
import VehicleCatalogRequest from '../../models/VehicleCatalogRequest';
import { pricingDataService } from '../../services/pricing-data.service';
import { fuelSyncService } from '../../services/fuel-sync.service';

type FuelField = 'petrol' | 'diesel' | 'cng' | 'electricity';

interface FuelCityRow {
  city: string;
  state?: string;
  cityTier?: string;
  petrol?: number;
  diesel?: number;
  cng?: number;
  electricity?: number;
  trafficProfile?: string;
  isActive: boolean;
  effectiveFrom?: string;
  updatedAt?: string;
}

interface FuelVersion {
  versionId: string;
  createdAt: string;
  createdBy: string;
  note?: string;
  rollbackFromVersionId?: string;
  cities: Record<string, FuelCityRow>;
}

interface FuelDraft {
  cities: Record<string, FuelCityRow>;
  pendingBulkApproval: boolean;
  pendingBulkCount?: number;
  bulkApprovedAt?: string;
  bulkApprovedBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface FuelPricingConfig {
  activeVersionId?: string;
  versions: FuelVersion[];
  draft: FuelDraft;
}

const FUEL_SETTINGS_KEY = 'fuel_pricing_config';
const FUEL_FIELDS: FuelField[] = ['petrol', 'diesel', 'cng', 'electricity'];

const normalizeCityKey = (input?: string) => {
  const cleaned = String(input || '').trim();
  if (!cleaned) return '';
  if (cleaned.toUpperCase() === 'DEFAULT') return 'DEFAULT';
  return cleaned.toUpperCase().replace(/\s+/g, '_');
};

const normalizeMasterKey = (input?: string) =>
  String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const toTitleLabel = (value?: string) =>
  String(value || '')
    .trim()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const getAgeBucketFromLaunchYear = (launchYear?: number) => {
  if (!launchYear || !Number.isFinite(launchYear)) return '';
  const age = Math.max(0, new Date().getFullYear() - launchYear);
  if (age <= 2) return '0-2';
  if (age <= 4) return '2-4';
  if (age <= 6) return '4-6';
  return '6+';
};

const sortFuelCities = (cities: Record<string, FuelCityRow>) =>
  Object.entries(cities)
    .sort(([a], [b]) => (a === 'DEFAULT' ? -1 : b === 'DEFAULT' ? 1 : a.localeCompare(b)))
    .reduce<Record<string, FuelCityRow>>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});

const sanitizeFuelNumber = (value: unknown) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return undefined;
  return Number(num.toFixed(2));
};

const sanitizeFuelCityRow = (input: Partial<FuelCityRow>, fallbackCityKey?: string): FuelCityRow => {
  const key = normalizeCityKey(input.city || fallbackCityKey || 'DEFAULT');
  return {
    city: input.city?.trim() || (key === 'DEFAULT' ? 'DEFAULT' : key.replace(/_/g, ' ')),
    state: input.state?.trim() || (key === 'DEFAULT' ? 'NA' : undefined),
    cityTier: (input.cityTier || (key === 'DEFAULT' ? 'mixed' : 'urban')) as string,
    petrol: sanitizeFuelNumber(input.petrol),
    diesel: sanitizeFuelNumber(input.diesel),
    cng: sanitizeFuelNumber(input.cng),
    electricity: sanitizeFuelNumber(input.electricity),
    trafficProfile: (input.trafficProfile || (key === 'DEFAULT' ? 'medium' : 'medium')) as string,
    isActive: input.isActive !== false,
    effectiveFrom: input.effectiveFrom || new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
};

const readPricingJsonSeedCities = (): Record<string, FuelCityRow> => {
  return {
    DEFAULT: sanitizeFuelCityRow(
      { city: 'DEFAULT', cityTier: 'mixed', petrol: 105, diesel: 92, cng: 85, electricity: 12, isActive: true },
      'DEFAULT'
    ),
  };
};

const persistFuelCitiesToPricingJson = (cities: Record<string, FuelCityRow>) => {
  void cities;
  pricingDataService.reload();
  return true;
};

const cloneCities = (cities: Record<string, FuelCityRow>) =>
  JSON.parse(JSON.stringify(cities || {})) as Record<string, FuelCityRow>;

const isWithinTenPercent = (nextValue?: number, baseValue?: number) => {
  if (baseValue === undefined || baseValue <= 0 || nextValue === undefined) return true;
  const delta = Math.abs(nextValue - baseValue) / baseValue;
  return delta <= 0.1;
};

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

  // Fuel pricing governance (admin managed, engine multipliers fixed)
  fastify.get(
    '/pricing/fuel',
    { preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_VIEW)] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const setting = await AdminSetting.findOne({ key: FUEL_SETTINGS_KEY }).lean();
      let value = (setting?.value || {}) as Partial<FuelPricingConfig>;
      if (!value.versions || value.versions.length === 0) {
        const seedCities = readPricingJsonSeedCities();
        const seedVersion: FuelVersion = {
          versionId: `fuel_v_${Date.now()}`,
          createdAt: new Date().toISOString(),
          createdBy: 'system_seed',
          note: 'Seeded from pricing_engine_data.json',
          cities: cloneCities(seedCities),
        };
        value = {
          activeVersionId: seedVersion.versionId,
          versions: [seedVersion],
          draft: {
            cities: cloneCities(seedCities),
            pendingBulkApproval: false,
            updatedAt: new Date().toISOString(),
            updatedBy: 'system_seed',
          },
        };
        await AdminSetting.findOneAndUpdate(
          { key: FUEL_SETTINGS_KEY },
          { key: FUEL_SETTINGS_KEY, value },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      const activeVersion = (value.versions || []).find((v) => v.versionId === value.activeVersionId) || value.versions?.[0];
      const draftCities = cloneCities(value.draft?.cities || activeVersion?.cities || {});
      if (!draftCities.DEFAULT) {
        draftCities.DEFAULT = sanitizeFuelCityRow(
          { city: 'DEFAULT', cityTier: 'mixed', petrol: 105, diesel: 92, cng: 85, electricity: 12, isActive: true },
          'DEFAULT'
        );
      }

      return reply.status(200).send({
        success: true,
        message: 'Fuel pricing config retrieved successfully',
        data: {
          activeVersionId: value.activeVersionId,
          activeVersion,
          draft: {
            ...(value.draft || { pendingBulkApproval: false }),
            cities: sortFuelCities(draftCities),
          },
          versions: (value.versions || []).map((v) => ({
            versionId: v.versionId,
            createdAt: v.createdAt,
            createdBy: v.createdBy,
            note: v.note,
            rollbackFromVersionId: v.rollbackFromVersionId,
            cityCount: Object.keys(v.cities || {}).length,
          })),
        },
      });
    }
  );

  fastify.get(
    '/pricing/health',
    { preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_VIEW)] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const report = pricingDataService.getPricingHealthReport();
      return reply.status(200).send({
        success: true,
        message: 'Pricing data health report generated successfully',
        data: report,
      });
    }
  );

  fastify.get(
    '/pricing/sync-summary',
    { preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_VIEW)] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const [fuelRows, mileageRows] = await Promise.all([
        PricingFuelRate.countDocuments({ isActive: true }),
        PricingVehicleMileage.countDocuments({ recordStatus: { $ne: 'inactive' } }),
      ]);
      const health = pricingDataService.getPricingHealthReport();
      return reply.status(200).send({
        success: true,
        message: 'Pricing sync summary retrieved successfully',
        data: {
          fuelRows,
          mileageRows,
          health,
        },
      });
    }
  );

  fastify.post(
    '/pricing/sync-now',
    { preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_MANAGE)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const result = await fuelSyncService.syncMyPetrolPrice(adminId);
      const syncedFuelLabels = Array.from(
        new Set(
          (result.pages || []).map((page: any) => {
            const fuel = String(page?.fuel || '').toLowerCase();
            if (fuel === 'autogas') return 'AutoGas';
            if (fuel === 'lpg') return 'LPG';
            if (fuel === 'cng') return 'CNG';
            if (fuel === 'electricity' || fuel === 'electric') return 'Electric';
            if (fuel === 'diesel') return 'Diesel';
            return 'Petrol';
          })
        )
      );
      await Promise.all(
        syncedFuelLabels.map((label) => {
          const key = normalizeMasterKey(label);
          return MasterDataItem.findOneAndUpdate(
            { type: 'fuel_type', key },
            {
              type: 'fuel_type',
              key,
              label,
              value: label.toLowerCase(),
              metadata: { source: 'fuel_sync', dynamic: true },
              isActive: true,
              sortOrder: 0,
              updatedBy: adminId,
              createdBy: adminId,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        })
      );
      await pricingDataService.refreshFromDatabase();
      return reply.status(200).send({
        success: true,
        message: 'Fuel rates synced from scrape source and saved to database',
        data: result,
      });
    }
  );

  fastify.get(
    '/pricing/fuel-rates',
    { preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_VIEW)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = (request.query as {
        page?: string;
        limit?: string;
        search?: string;
        state?: string;
        cityTier?: string;
        fuelType?: string;
      }) || {};

      const page = Math.max(1, Number(query.page || 1));
      const limit = Math.min(200, Math.max(1, Number(query.limit || 20)));
      const skip = (page - 1) * limit;

      const where: Record<string, any> = {};
      const searchText = String(query.search || '').trim();
      const stateText = String(query.state || '').trim();
      const cityTierText = String(query.cityTier || '').trim();
      const fuelTypeText = String(query.fuelType || '').trim().toLowerCase();

      if (searchText) {
        const regex = new RegExp(searchText, 'i');
        where.$or = [{ city: regex }, { state: regex }, { cityKey: regex }];
      }
      if (stateText) where.state = new RegExp(stateText, 'i');
      if (cityTierText) where.cityTier = cityTierText;
      if (['petrol', 'diesel', 'cng', 'electricity'].includes(fuelTypeText)) {
        where[fuelTypeText] = { $exists: true, $ne: null };
      }

      const [rows, total] = await Promise.all([
        PricingFuelRate.find(where).sort({ cityKey: 1 }).skip(skip).limit(limit).lean(),
        PricingFuelRate.countDocuments(where),
      ]);

      return reply.status(200).send({
        success: true,
        message: 'Fuel rates retrieved successfully',
        data: {
          items: rows,
          pagination: {
            page,
            limit,
            total,
            pages: Math.max(1, Math.ceil(total / limit)),
          },
        },
      });
    }
  );

  fastify.put(
    '/pricing/fuel-rates/:cityKey',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_MANAGE),
        validate(
          z.object({
            city: z.string().optional(),
            state: z.string().optional(),
            cityTier: z.string().optional(),
            petrol: z.number().min(0).optional(),
            diesel: z.number().min(0).optional(),
            cng: z.number().min(0).optional(),
            electricity: z.number().min(0).optional(),
            trafficProfile: z.string().optional(),
            isActive: z.boolean().optional(),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { cityKey } = request.params as { cityKey: string };
      const body = request.body as any;
      const normalizedCityKey = normalizeCityKey(cityKey);
      if (!normalizedCityKey) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid city key',
        });
      }

      const updated = await PricingFuelRate.findOneAndUpdate(
        { cityKey: normalizedCityKey },
        {
          cityKey: normalizedCityKey,
          city: body.city,
          state: body.state,
          cityTier: body.cityTier,
          petrol: body.petrol,
          diesel: body.diesel,
          cng: body.cng,
          electricity: body.electricity,
          trafficProfile: body.trafficProfile || 'medium',
          isActive: body.isActive !== false,
          source: 'manual',
          effectiveDate: new Date().toISOString().slice(0, 10),
          updatedBy: adminId,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await pricingDataService.refreshFromDatabase();
      return reply.status(200).send({
        success: true,
        message: 'Fuel rate saved successfully',
        data: updated,
      });
    }
  );

  fastify.get(
    '/pricing/vehicles',
    { preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_VIEW)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = (request.query as { page?: string; limit?: string; search?: string }) || {};
      const page = Math.max(1, Number(query.page || 1));
      const limit = Math.min(200, Math.max(1, Number(query.limit || 20)));
      const skip = (page - 1) * limit;

      const where: Record<string, any> = { recordStatus: { $ne: 'inactive' } };
      const searchText = String(query.search || '').trim();
      if (searchText) {
        const regex = new RegExp(searchText, 'i');
        where.$or = [
          { vehicleCategory: regex },
          { brand: regex },
          { vehicleModel: regex },
          { fuelType: regex },
          { transmission: regex },
        ];
      }

      const [rows, total] = await Promise.all([
        PricingVehicleMileage.find(where)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PricingVehicleMileage.countDocuments(where),
      ]);
      const normalizedRows = rows.map((row: any) => ({
        ...row,
        model: row.vehicleModel || row.model || '',
      }));
      return reply.status(200).send({
        success: true,
        message: 'Pricing mileage rows retrieved successfully',
        data: {
          items: normalizedRows,
          pagination: {
            page,
            limit,
            total,
            pages: Math.max(1, Math.ceil(total / limit)),
          },
        },
      });
    }
  );

  fastify.post(
    '/pricing/vehicles',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_MANAGE),
        validate(
          z.object({
            vehicleCategory: z.string().min(1),
            brand: z.string().min(1),
            model: z.string().min(1),
            fuelType: z.string().min(1),
            transmission: z.string().min(1),
            launchYear: z.number().optional(),
            vehicleAgeBucket: z.string().optional(),
            realWorldMileageAvg: z.number().positive(),
            mileageUnit: z.string().min(1),
            estimatedCostPerKmInr: z.number().nonnegative().optional(),
            cityTier: z.string().optional(),
            trafficProfile: z.string().optional(),
            confidenceScore: z.number().min(0).max(100).optional(),
            pricingEligible: z.string().optional(),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const body = request.body as any;
      const row = await PricingVehicleMileage.findOneAndUpdate(
        {
          vehicleCategory: body.vehicleCategory,
          brand: body.brand,
          vehicleModel: body.model,
          fuelType: body.fuelType,
          transmission: body.transmission,
          vehicleAgeBucket: body.vehicleAgeBucket || '',
        },
        {
          vehicleCategory: body.vehicleCategory,
          brand: body.brand,
          vehicleModel: body.model,
          fuelType: body.fuelType,
          transmission: body.transmission,
          launchYear: body.launchYear,
          vehicleAgeBucket: body.vehicleAgeBucket || '',
          realWorldMileageAvg: body.realWorldMileageAvg,
          mileageUnit: body.mileageUnit,
          estimatedCostPerKmInr: body.estimatedCostPerKmInr,
          cityTier: body.cityTier,
          trafficProfile: body.trafficProfile,
          confidenceScore: body.confidenceScore,
          pricingEligible: body.pricingEligible || 'Y',
          fallbackLevel: 'model_exact',
          recordStatus: 'active',
          source: 'manual',
          updatedBy: adminId,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      await pricingDataService.refreshFromDatabase();
      return reply.status(200).send({
        success: true,
        message: 'Pricing mileage row saved successfully',
        data: row,
      });
    }
  );

  fastify.get(
    '/vehicle-catalog-requests',
    { preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_VIEW)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { status = 'pending' } = (request.query as { status?: string }) || {};
      const query: Record<string, any> = {};
      if (status && status !== 'all') query.status = status;
      const rows = await VehicleCatalogRequest.find(query).sort({ createdAt: -1 }).lean();
      const normalizedRows = rows.map((row: any) => ({
        ...row,
        model: row.vehicleModel || row.model || '',
      }));
      return reply.status(200).send({
        success: true,
        message: 'Vehicle catalog requests retrieved successfully',
        data: normalizedRows,
      });
    }
  );

  fastify.post(
    '/vehicle-catalog-requests/:requestId/review',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_MANAGE),
        validate(
          z.object({
            action: z.enum(['approve', 'reject']),
            reviewNote: z.string().max(1000).optional(),
            confidenceScore: z.number().min(0).max(100).optional(),
            cityTier: z.string().optional(),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { requestId } = request.params as { requestId: string };
      const body = request.body as any;

      const pendingRequest = await VehicleCatalogRequest.findOne({ requestId });
      if (!pendingRequest) {
        return reply.status(404).send({
          success: false,
          message: 'Vehicle request not found',
        });
      }
      if (pendingRequest.status !== 'pending') {
        return reply.status(400).send({
          success: false,
          message: `Vehicle request already reviewed (${pendingRequest.status})`,
        });
      }

      if (body.action === 'approve') {
        const brandLabel = toTitleLabel(pendingRequest.brand);
        const modelLabel = String(pendingRequest.vehicleModel || '').trim();
        const fuelLabel = toTitleLabel(pendingRequest.fuelType);
        const vehicleCategory = pendingRequest.vehicleType === 'car' ? '4-wheeler' : '2-wheeler';
        const brandKey = normalizeMasterKey(brandLabel);
        const modelKey = normalizeMasterKey(`${brandLabel}_${modelLabel}`);
        const fuelKey = normalizeMasterKey(fuelLabel);
        const ageBucket = getAgeBucketFromLaunchYear(pendingRequest.launchYear);
        const transmission = toTitleLabel(pendingRequest.transmission || 'Manual') || 'Manual';

        await Promise.all([
          MasterDataItem.findOneAndUpdate(
            { type: 'vehicle_brand', key: brandKey },
            {
              type: 'vehicle_brand',
              key: brandKey,
              label: brandLabel,
              value: brandKey,
              metadata: { vehicleType: pendingRequest.vehicleType },
              isActive: true,
              sortOrder: 0,
              updatedBy: adminId,
              createdBy: adminId,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          ),
          MasterDataItem.findOneAndUpdate(
            { type: 'vehicle_model', key: modelKey },
            {
              type: 'vehicle_model',
              key: modelKey,
              label: modelLabel,
              value: normalizeMasterKey(modelLabel),
              metadata: {
                vehicleType: pendingRequest.vehicleType,
                brandKey,
                brand: brandLabel,
              },
              isActive: true,
              sortOrder: 0,
              updatedBy: adminId,
              createdBy: adminId,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          ),
          MasterDataItem.findOneAndUpdate(
            { type: 'fuel_type', key: fuelKey },
            {
              type: 'fuel_type',
              key: fuelKey,
              label: fuelLabel,
              value: fuelKey,
              metadata: { source: 'vehicle_request' },
              isActive: true,
              sortOrder: 0,
              updatedBy: adminId,
              createdBy: adminId,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          ),
          PricingVehicleMileage.findOneAndUpdate(
            {
              vehicleCategory,
              brand: brandLabel,
              vehicleModel: modelLabel,
              fuelType: fuelLabel,
              transmission,
              vehicleAgeBucket: ageBucket,
            },
            {
              vehicleCategory,
              brand: brandLabel,
              vehicleModel: modelLabel,
              fuelType: fuelLabel,
              transmission,
              launchYear: pendingRequest.launchYear,
              vehicleAgeBucket: ageBucket,
              realWorldMileageAvg: pendingRequest.realWorldMileageAvg,
              mileageUnit: pendingRequest.mileageUnit || 'kmpl',
              estimatedCostPerKmInr: pendingRequest.estimatedCostPerKmInr,
              cityTier: body.cityTier || pendingRequest.cityTier || 'mixed',
              confidenceScore: body.confidenceScore ?? 70,
              pricingEligible: 'Y',
              fallbackLevel: 'model_exact',
              recordStatus: 'active',
              source: 'manual',
              updatedBy: adminId,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          ),
        ]);
      }

      const reviewed = await VehicleCatalogRequest.findOneAndUpdate(
        { requestId },
        {
          status: body.action === 'approve' ? 'approved' : 'rejected',
          adminReviewNote: body.reviewNote || '',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
        { new: true }
      );

      if (body.action === 'approve') {
        await pricingDataService.refreshFromDatabase();
      }

      return reply.status(200).send({
        success: true,
        message: body.action === 'approve' ? 'Vehicle request approved successfully' : 'Vehicle request rejected',
        data: reviewed,
      });
    }
  );

  fastify.put(
    '/pricing/fuel/draft/cities/:cityKey',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_MANAGE),
        validate(
          z.object({
            city: z.string().optional(),
            state: z.string().optional(),
            cityTier: z.string().optional(),
            petrol: z.number().min(0).optional(),
            diesel: z.number().min(0).optional(),
            cng: z.number().min(0).optional(),
            electricity: z.number().min(0).optional(),
            trafficProfile: z.string().optional(),
            isActive: z.boolean().optional(),
            effectiveFrom: z.string().optional(),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { cityKey } = request.params as { cityKey: string };
      const key = normalizeCityKey(cityKey);
      if (!key) {
        return reply.status(400).send({ success: false, message: 'Invalid city key' });
      }

      const body = request.body as Partial<FuelCityRow>;
      const setting = await AdminSetting.findOne({ key: FUEL_SETTINGS_KEY });
      if (!setting) {
        return reply.status(404).send({ success: false, message: 'Fuel pricing config not initialized' });
      }

      const value = (setting.value || {}) as FuelPricingConfig;
      const draft = value.draft || { cities: {}, pendingBulkApproval: false };
      const prev = draft.cities?.[key];
      const next = sanitizeFuelCityRow({ ...prev, ...body }, key);
      if (key === 'DEFAULT' && next.isActive === false) {
        return reply.status(400).send({ success: false, message: 'DEFAULT city row must remain active' });
      }

      draft.cities = { ...(draft.cities || {}), [key]: next };
      draft.updatedAt = new Date().toISOString();
      draft.updatedBy = adminId;

      value.draft = { ...draft };
      setting.value = value as any;
      setting.updatedBy = adminId;
      await setting.save();
      persistFuelCitiesToPricingJson(value.draft.cities || {});

      return reply.status(200).send({
        success: true,
        message: 'Fuel city draft updated',
        data: { cityKey: key, city: next, draft: value.draft },
      });
    }
  );

  fastify.delete(
    '/pricing/fuel/draft/cities/:cityKey',
    { preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_MANAGE)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { cityKey } = request.params as { cityKey: string };
      const key = normalizeCityKey(cityKey);
      if (key === 'DEFAULT') {
        return reply.status(400).send({ success: false, message: 'DEFAULT city row cannot be deleted' });
      }

      const setting = await AdminSetting.findOne({ key: FUEL_SETTINGS_KEY });
      if (!setting) {
        return reply.status(404).send({ success: false, message: 'Fuel pricing config not initialized' });
      }

      const value = (setting.value || {}) as FuelPricingConfig;
      const draft = value.draft || { cities: {}, pendingBulkApproval: false };
      const nextCities = { ...(draft.cities || {}) };
      delete nextCities[key];
      draft.cities = nextCities;
      draft.updatedAt = new Date().toISOString();
      draft.updatedBy = adminId;
      value.draft = draft;
      setting.value = value as any;
      setting.updatedBy = adminId;
      await setting.save();

      return reply.status(200).send({ success: true, message: 'Fuel city row removed from draft' });
    }
  );

  fastify.post(
    '/pricing/fuel/draft/bulk',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_MANAGE),
        validate(
          z.object({
            rows: z.array(
              z.object({
                cityKey: z.string().optional(),
                city: z.string().optional(),
                state: z.string().optional(),
                cityTier: z.string().optional(),
                petrol: z.number().min(0).optional(),
                diesel: z.number().min(0).optional(),
                cng: z.number().min(0).optional(),
                electricity: z.number().min(0).optional(),
                trafficProfile: z.string().optional(),
                isActive: z.boolean().optional(),
                effectiveFrom: z.string().optional(),
              })
            ).min(1),
            note: z.string().optional(),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const body = request.body as { rows: Array<Partial<FuelCityRow> & { cityKey?: string }> };
      const setting = await AdminSetting.findOne({ key: FUEL_SETTINGS_KEY });
      if (!setting) {
        return reply.status(404).send({ success: false, message: 'Fuel pricing config not initialized' });
      }

      const value = (setting.value || {}) as FuelPricingConfig;
      const draft = value.draft || { cities: {}, pendingBulkApproval: false };
      const nextCities = { ...(draft.cities || {}) };
      for (const row of body.rows) {
        const key = normalizeCityKey(row.cityKey || row.city);
        if (!key) continue;
        const merged = sanitizeFuelCityRow({ ...(nextCities[key] || {}), ...row }, key);
        if (key === 'DEFAULT' && merged.isActive === false) {
          return reply.status(400).send({ success: false, message: 'DEFAULT city row must remain active' });
        }
        nextCities[key] = merged;
      }
      if (!nextCities.DEFAULT) {
        return reply.status(400).send({ success: false, message: 'DEFAULT city row is required' });
      }

      value.draft = {
        ...(value.draft || { pendingBulkApproval: false, cities: {} }),
        cities: sortFuelCities(nextCities),
        pendingBulkApproval: true,
        pendingBulkCount: body.rows.length,
        bulkApprovedAt: undefined,
        bulkApprovedBy: undefined,
        updatedAt: new Date().toISOString(),
        updatedBy: adminId,
      };
      setting.value = value as any;
      setting.updatedBy = adminId;
      await setting.save();
      persistFuelCitiesToPricingJson(value.draft.cities || {});

      return reply.status(200).send({
        success: true,
        message: `Bulk draft saved (${body.rows.length} rows). Approval required before publish.`,
        data: value.draft,
      });
    }
  );

  fastify.post(
    '/pricing/fuel/draft/approve-bulk',
    { preHandler: [authenticate, requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_MANAGE)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const role = request.adminContext?.role;
      if (role !== 'super_admin') {
        return reply.status(403).send({ success: false, message: 'Bulk approval requires super-admin' });
      }
      const adminId = (request as any).user.userId;
      const setting = await AdminSetting.findOne({ key: FUEL_SETTINGS_KEY });
      if (!setting) {
        return reply.status(404).send({ success: false, message: 'Fuel pricing config not initialized' });
      }
      const value = (setting.value || {}) as FuelPricingConfig;
      const draft = value.draft || { cities: {}, pendingBulkApproval: false };
      draft.pendingBulkApproval = false;
      draft.bulkApprovedAt = new Date().toISOString();
      draft.bulkApprovedBy = adminId;
      value.draft = draft;
      setting.value = value as any;
      setting.updatedBy = adminId;
      await setting.save();
      return reply.status(200).send({ success: true, message: 'Bulk draft approved', data: draft });
    }
  );

  fastify.post(
    '/pricing/fuel/publish',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_MANAGE),
        validate(
          z.object({
            note: z.string().optional(),
            overrideLimit: z.boolean().optional(),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const role = request.adminContext?.role;
      const body = request.body as { note?: string; overrideLimit?: boolean };
      const setting = await AdminSetting.findOne({ key: FUEL_SETTINGS_KEY });
      if (!setting) {
        return reply.status(404).send({ success: false, message: 'Fuel pricing config not initialized' });
      }

      const value = (setting.value || {}) as FuelPricingConfig;
      const draft = value.draft || { cities: {}, pendingBulkApproval: false };
      const draftCities = { ...(draft.cities || {}) };
      if (!draftCities.DEFAULT || draftCities.DEFAULT.isActive === false) {
        return reply.status(400).send({ success: false, message: 'DEFAULT city row must exist and remain active' });
      }
      if (draft.pendingBulkApproval) {
        return reply.status(400).send({ success: false, message: 'Bulk update is pending approval' });
      }

      const activeVersion =
        (value.versions || []).find((v) => v.versionId === value.activeVersionId) || value.versions?.[0];
      const baselineCities = activeVersion?.cities || {};
      const defaultBaseline = baselineCities.DEFAULT || draftCities.DEFAULT;

      for (const [cityKey, row] of Object.entries(draftCities)) {
        const baseline = baselineCities[cityKey] || defaultBaseline;
        for (const field of FUEL_FIELDS) {
          const nextVal = row[field];
          const baseVal = baseline?.[field];
          if (!isWithinTenPercent(nextVal, baseVal)) {
            const canOverride = body.overrideLimit === true && role === 'super_admin';
            if (!canOverride) {
              return reply.status(400).send({
                success: false,
                message: `Update exceeds ±10% for ${cityKey} ${field}. Super-admin override required.`,
                error: 'FUEL_UPDATE_LIMIT_EXCEEDED',
              });
            }
          }
        }
      }

      const versionId = `fuel_v_${Date.now()}`;
      const newVersion: FuelVersion = {
        versionId,
        createdAt: new Date().toISOString(),
        createdBy: adminId,
        note: body.note || 'Fuel prices published',
        cities: sortFuelCities(cloneCities(draftCities)),
      };

      const versions = [...(value.versions || []), newVersion];
      value.versions = versions.slice(-50);
      value.activeVersionId = versionId;
      value.draft = {
        ...draft,
        cities: cloneCities(newVersion.cities),
        pendingBulkApproval: false,
        pendingBulkCount: undefined,
        updatedAt: new Date().toISOString(),
        updatedBy: adminId,
      };

      setting.value = value as any;
      setting.updatedBy = adminId;
      await setting.save();

      return reply.status(200).send({
        success: true,
        message: 'Fuel pricing published successfully',
        data: { activeVersionId: versionId, version: newVersion },
      });
    }
  );

  fastify.post(
    '/pricing/fuel/rollback/:versionId',
    {
      preHandler: [
        authenticate,
        requireAdminPermission(ADMIN_PERMISSIONS.SETTINGS_MANAGE),
        validate(z.object({ note: z.string().optional() })),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const role = request.adminContext?.role;
      if (role !== 'super_admin') {
        return reply.status(403).send({ success: false, message: 'Rollback requires super-admin' });
      }
      const adminId = (request as any).user.userId;
      const { versionId } = request.params as { versionId: string };
      const body = request.body as { note?: string };
      const setting = await AdminSetting.findOne({ key: FUEL_SETTINGS_KEY });
      if (!setting) {
        return reply.status(404).send({ success: false, message: 'Fuel pricing config not initialized' });
      }
      const value = (setting.value || {}) as FuelPricingConfig;
      const target = (value.versions || []).find((v) => v.versionId === versionId);
      if (!target) {
        return reply.status(404).send({ success: false, message: 'Version not found' });
      }

      const newVersionId = `fuel_v_${Date.now()}`;
      const rollbackVersion: FuelVersion = {
        versionId: newVersionId,
        createdAt: new Date().toISOString(),
        createdBy: adminId,
        note: body.note || `Rollback to ${versionId}`,
        rollbackFromVersionId: versionId,
        cities: sortFuelCities(cloneCities(target.cities)),
      };

      value.versions = [...(value.versions || []), rollbackVersion].slice(-50);
      value.activeVersionId = newVersionId;
      value.draft = {
        cities: cloneCities(rollbackVersion.cities),
        pendingBulkApproval: false,
        updatedAt: new Date().toISOString(),
        updatedBy: adminId,
      };

      setting.value = value as any;
      setting.updatedBy = adminId;
      await setting.save();

      return reply.status(200).send({
        success: true,
        message: `Rolled back successfully using ${versionId}`,
        data: { activeVersionId: newVersionId, version: rollbackVersion },
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
