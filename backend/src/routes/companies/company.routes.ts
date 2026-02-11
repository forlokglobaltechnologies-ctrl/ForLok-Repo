import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { companyService } from '../../services/company.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';
import { ApiResponse } from '../../types';
import { validateFileUpload } from '../../middleware/upload.middleware';
import multipart from '@fastify/multipart';

// Request schemas
const registerCompanySchema = z.object({
  userId: z.string(),
  companyName: z.string().min(1).max(200),
  registrationNumber: z.string().min(1),
  businessType: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  contactNumber: z.string().min(10).max(15),
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  gstNumber: z.string().optional(),
  documents: z.object({
    registrationCertificate: z.string().url().optional(),
    gstCertificate: z.string().url().optional(),
    businessLicense: z.string().url().optional(),
  }).optional(),
});

const updateCompanyProfileSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  businessType: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  contactNumber: z.string().min(10).max(15).optional(),
  email: z.string().email().optional(),
  gstNumber: z.string().optional(),
});

export async function companyRoutes(fastify: FastifyInstance) {
  // Register multipart plugin for file uploads
  await fastify.register(multipart);

  /**
   * POST /api/companies/register
   * Register company (authenticated)
   */
  fastify.post(
    '/register',
    {
      preHandler: [authenticate, validate(registerCompanySchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const data = request.body as any;

      // Ensure userId matches authenticated user
      if (data.userId !== userId) {
        return reply.status(403).send({
          success: false,
          message: 'Cannot register company for another user',
          error: 'FORBIDDEN',
        });
      }

      const company = await companyService.registerCompany(data);

      const response: ApiResponse = {
        success: true,
        message: 'Company registered successfully',
        data: company,
      };

      return reply.status(201).send(response);
    }
  );

  /**
   * GET /api/companies/profile/:companyId
   * Get company profile by companyId (authenticated) - for admin or public access
   * NOTE: This route must come BEFORE /profile to avoid route conflicts
   */
  fastify.get(
    '/profile/:companyId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { companyId } = request.params as { companyId: string };

      const company = await companyService.getCompanyProfile(companyId);

      const response: ApiResponse = {
        success: true,
        message: 'Company profile retrieved successfully',
        data: company,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/companies/profile
   * Get company profile by authenticated user's userId (authenticated)
   * NOTE: This route must come AFTER /profile/:companyId to avoid route conflicts
   */
  fastify.get(
    '/profile',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const company = await companyService.getCompanyByUserId(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Company profile retrieved successfully',
        data: company,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/companies/profile
   * Update company profile (authenticated)
   */
  fastify.put(
    '/profile',
    {
      preHandler: [authenticate, validate(updateCompanyProfileSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const data = request.body as any;

      // Get company by userId first
      const company = await companyService.getCompanyByUserId(userId);
      const updatedCompany = await companyService.updateCompanyProfile(
        company.companyId,
        data
      );

      const response: ApiResponse = {
        success: true,
        message: 'Company profile updated successfully',
        data: updatedCompany,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/companies/sync-documents
   * Sync company documents from Company.documents to Document collection (authenticated)
   * This is useful for existing companies that have documents in Company model but not in Document collection
   */
  fastify.post(
    '/sync-documents',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      try {
        const company = await companyService.getCompanyByUserId(userId);
        
        if (!company.documents || (!company.documents.registrationCertificate && !company.documents.gstCertificate && !company.documents.businessLicense)) {
          return reply.status(200).send({
            success: true,
            message: 'No documents to sync',
            data: { synced: 0 },
          });
        }

        const Document = (await import('../../models/Document')).default;
        const { generateUserId } = await import('../../utils/helpers');
        let syncedCount = 0;

        // Sync registration certificate (auto-verify when synced)
        if (company.documents.registrationCertificate) {
          const existingDoc = await Document.findOne({
            userId,
            type: 'company_registration',
          });
          if (!existingDoc) {
            await Document.create({
              documentId: generateUserId('DOC'),
              userId,
              companyId: company.companyId,
              type: 'company_registration',
              status: 'verified', // Auto-verify when synced
              url: company.documents.registrationCertificate,
              verificationData: {
                verified: true,
                verifiedAt: new Date(),
                verifiedBy: 'system',
              },
            });
            syncedCount++;
          }
        }

        // Sync GST certificate (auto-verify when synced)
        if (company.documents.gstCertificate) {
          const existingDoc = await Document.findOne({
            userId,
            type: 'gst_certificate',
          });
          if (!existingDoc) {
            await Document.create({
              documentId: generateUserId('DOC'),
              userId,
              companyId: company.companyId,
              type: 'gst_certificate',
              status: 'verified', // Auto-verify when synced
              url: company.documents.gstCertificate,
              verificationData: {
                verified: true,
                verifiedAt: new Date(),
                verifiedBy: 'system',
              },
            });
            syncedCount++;
          }
        }

        // Sync business license (auto-verify when synced)
        if (company.documents.businessLicense) {
          const existingDoc = await Document.findOne({
            userId,
            type: 'business_license',
          });
          if (!existingDoc) {
            await Document.create({
              documentId: generateUserId('DOC'),
              userId,
              companyId: company.companyId,
              type: 'business_license',
              status: 'verified', // Auto-verify when synced
              url: company.documents.businessLicense,
              verificationData: {
                verified: true,
                verifiedAt: new Date(),
                verifiedBy: 'system',
              },
            });
            syncedCount++;
          }
        }

        const response: ApiResponse = {
          success: true,
          message: `Synced ${syncedCount} document(s) to Document collection`,
          data: { synced: syncedCount },
        };

        return reply.status(200).send(response);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: 'Failed to sync documents',
          error: error.message,
        });
      }
    }
  );

  /**
   * POST /api/companies/profile/logo
   * Upload company logo (authenticated)
   */
  fastify.post(
    '/profile/logo',
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

      // Get company by userId
      const company = await companyService.getCompanyByUserId(userId);

      const buffer = await data.toBuffer();
      const result = await companyService.uploadCompanyLogo(
        company.companyId,
        buffer,
        data.mimetype
      );

      const response: ApiResponse = {
        success: true,
        message: 'Company logo uploaded successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/companies/dashboard
   * Get company dashboard (authenticated)
   */
  fastify.get(
    '/dashboard',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const company = await companyService.getCompanyByUserId(userId);
      const dashboard = await companyService.getCompanyDashboard(company.companyId);

      const response: ApiResponse = {
        success: true,
        message: 'Dashboard data retrieved successfully',
        data: dashboard,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/companies/stats
   * Get company statistics (authenticated)
   */
  fastify.get(
    '/stats',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const company = await companyService.getCompanyByUserId(userId);
      const stats = await companyService.getCompanyStats(company.companyId);

      const response: ApiResponse = {
        success: true,
        message: 'Statistics retrieved successfully',
        data: stats,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/companies/earnings
   * Get company earnings breakdown (authenticated)
   */
  fastify.get(
    '/earnings',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { startDate, endDate, status } = request.query as any;

      const company = await companyService.getCompanyByUserId(userId);
      
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (status) filters.status = status;

      const earnings = await companyService.getCompanyEarnings(company.companyId, filters);

      const response: ApiResponse = {
        success: true,
        message: 'Earnings retrieved successfully',
        data: earnings,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/companies/bookings
   * Get company bookings (authenticated)
   */
  fastify.get(
    '/bookings',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { status, startDate, endDate, page, limit } = request.query as any;

      const company = await companyService.getCompanyByUserId(userId);
      
      const filters: any = {};
      if (status) filters.status = status;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (page) filters.page = parseInt(page);
      if (limit) filters.limit = parseInt(limit);

      const result = await companyService.getCompanyBookings(company.companyId, filters);

      const response: ApiResponse = {
        success: true,
        message: 'Bookings retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );
}
