import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { vehicleService } from '../../services/vehicle.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { validateFileUpload } from '../../middleware/upload.middleware';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import { ApiResponse } from '../../types';

// Request schemas
const addVehicleSchema = z.object({
  userId: z.string().optional(),
  companyId: z.string().optional(),
  type: z.enum(['car', 'bike']),
  brand: z.string().min(1),
  model: z.string().optional(),
  year: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
  color: z.string().optional(),
  number: z.string().min(1),
  plateType: z.enum(['white', 'yellow', 'green']).optional(),
  seats: z.number().min(1).max(50),
  fuelType: z.enum(['Petrol', 'Diesel', 'Electric', 'CNG']),
  transmission: z.enum(['Manual', 'Automatic']),
  insuranceExpiry: z.string().datetime().optional(),
});

const updateVehicleSchema = z.object({
  brand: z.string().min(1).optional(),
  model: z.string().optional(),
  year: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
  color: z.string().optional(),
  seats: z.number().min(1).max(50).optional(),
  fuelType: z.enum(['Petrol', 'Diesel', 'Electric', 'CNG']).optional(),
  transmission: z.enum(['Manual', 'Automatic']).optional(),
  status: z.enum(['active', 'inactive', 'under_maintenance']).optional(),
  insuranceExpiry: z.string().datetime().optional(),
});

export async function vehicleRoutes(fastify: FastifyInstance) {
  // Register multipart plugin for file uploads
  await fastify.register(multipart);

  /**
   * POST /api/vehicles
   * Add new vehicle (authenticated)
   */
  fastify.post(
    '/',
    {
      preHandler: [authenticate, validate(addVehicleSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const userType = (request as any).user.userType;
      const data = request.body as any;

      // Set userId or companyId based on user type
      if (userType === 'company') {
        // For company users, companyId should be provided in request body
        // If not provided, fetch it from Company model
        if (!data.companyId) {
          const Company = (await import('../../models/Company')).default;
          const company = await Company.findOne({ userId });
          if (company) {
            data.companyId = company.companyId;
          } else {
            return reply.status(404).send({
              success: false,
              message: 'Company profile not found',
            });
          }
        }
        // Don't set userId for company vehicles
        delete data.userId;
      } else {
        data.userId = userId;
        // Don't set companyId for individual vehicles
        delete data.companyId;
      }

      // Convert insuranceExpiry string to Date if provided
      if (data.insuranceExpiry) {
        data.insuranceExpiry = new Date(data.insuranceExpiry);
      }

      const vehicle = await vehicleService.addVehicle(data);

      const response: ApiResponse = {
        success: true,
        message: 'Vehicle added successfully',
        data: vehicle,
      };

      return reply.status(201).send(response);
    }
  );

  /**
   * GET /api/vehicles
   * Get user's vehicles (authenticated)
   */
  fastify.get(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const userType = (request as any).user.userType;

      let vehicles;
      if (userType === 'company') {
        // Get companyId from Company model
        const Company = (await import('../../models/Company')).default;
        const company = await Company.findOne({ userId });
        if (!company) {
          return reply.status(404).send({
            success: false,
            message: 'Company profile not found',
          });
        }
        vehicles = await vehicleService.getCompanyVehicles(company.companyId);
      } else {
        vehicles = await vehicleService.getUserVehicles(userId);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Vehicles retrieved successfully',
        data: vehicles,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/vehicles/:vehicleId
   * Get vehicle details (authenticated)
   */
  fastify.get(
    '/:vehicleId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { vehicleId } = request.params as { vehicleId: string };

      const vehicle = await vehicleService.getVehicleById(vehicleId);

      const response: ApiResponse = {
        success: true,
        message: 'Vehicle retrieved successfully',
        data: vehicle,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/vehicles/:vehicleId
   * Update vehicle (authenticated)
   */
  fastify.put(
    '/:vehicleId',
    {
      preHandler: [authenticate, validate(updateVehicleSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { vehicleId } = request.params as { vehicleId: string };
      const data = request.body as any;

      // Verify ownership
      const isOwner = await vehicleService.verifyVehicleOwnership(vehicleId, userId);
      if (!isOwner) {
        return reply.status(403).send({
          success: false,
          message: 'You do not have permission to update this vehicle',
          error: 'FORBIDDEN',
        });
      }

      // Convert insuranceExpiry string to Date if provided
      if (data.insuranceExpiry) {
        data.insuranceExpiry = new Date(data.insuranceExpiry);
      }

      const vehicle = await vehicleService.updateVehicle(vehicleId, data);

      const response: ApiResponse = {
        success: true,
        message: 'Vehicle updated successfully',
        data: vehicle,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * DELETE /api/vehicles/:vehicleId
   * Delete vehicle (authenticated)
   */
  fastify.delete(
    '/:vehicleId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { vehicleId } = request.params as { vehicleId: string };

      // Verify ownership
      const isOwner = await vehicleService.verifyVehicleOwnership(vehicleId, userId);
      if (!isOwner) {
        return reply.status(403).send({
          success: false,
          message: 'You do not have permission to delete this vehicle',
          error: 'FORBIDDEN',
        });
      }

      await vehicleService.deleteVehicle(vehicleId);

      const response: ApiResponse = {
        success: true,
        message: 'Vehicle deleted successfully',
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/vehicles/:vehicleId/photos
   * Upload vehicle photo (authenticated)
   */
  fastify.post(
    '/:vehicleId/photos',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { vehicleId } = request.params as { vehicleId: string };
      const { photoType } = request.query as { photoType: string };

      // Verify ownership
      const isOwner = await vehicleService.verifyVehicleOwnership(vehicleId, userId);
      if (!isOwner) {
        return reply.status(403).send({
          success: false,
          message: 'You do not have permission to upload photos for this vehicle',
          error: 'FORBIDDEN',
        });
      }

      if (!photoType || !['front', 'back', 'side', 'interior'].includes(photoType)) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid photo type. Must be: front, back, side, or interior',
          error: 'INVALID_PHOTO_TYPE',
        });
      }

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
      const result = await vehicleService.uploadVehiclePhoto(
        vehicleId,
        photoType as any,
        buffer,
        data.mimetype
      );

      const response: ApiResponse = {
        success: true,
        message: 'Vehicle photo uploaded successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/vehicles/:vehicleId/documents
   * Upload vehicle document (authenticated)
   */
  fastify.post(
    '/:vehicleId/documents',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { vehicleId } = request.params as { vehicleId: string };
      const { documentType } = request.query as { documentType: string };

      // Verify ownership
      const isOwner = await vehicleService.verifyVehicleOwnership(vehicleId, userId);
      if (!isOwner) {
        return reply.status(403).send({
          success: false,
          message: 'You do not have permission to upload documents for this vehicle',
          error: 'FORBIDDEN',
        });
      }

      const allowedTypes = [
        'registrationCertificate',
        'insurance',
        'pollutionCertificate',
        'taxiServicePapers',
      ];

      if (!documentType || !allowedTypes.includes(documentType)) {
        return reply.status(400).send({
          success: false,
          message: `Invalid document type. Must be one of: ${allowedTypes.join(', ')}`,
          error: 'INVALID_DOCUMENT_TYPE',
        });
      }

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
      const result = await vehicleService.uploadVehicleDocument(
        vehicleId,
        documentType as any,
        buffer,
        data.mimetype
      );

      const response: ApiResponse = {
        success: true,
        message: 'Vehicle document uploaded successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/vehicles/company/:companyId
   * Get all vehicles for a company (authenticated)
   */
  fastify.get(
    '/company/:companyId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { companyId } = request.params as { companyId: string };
      const userId = (request as any).user.userId;

      // Verify user owns the company
      const Company = (await import('../../models/Company')).default;
      const company = await Company.findOne({ companyId });
      if (!company || company.userId !== userId) {
        return reply.status(403).send({
          success: false,
          message: 'You do not have permission to access this company',
        });
      }

      try {
        const vehicles = await vehicleService.getCompanyVehicles(companyId);

        const response: ApiResponse = {
          success: true,
          message: 'Company vehicles retrieved successfully',
          data: vehicles,
        };

        return reply.status(200).send(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          message: error.message || 'Failed to get company vehicles',
        };
        return reply.status(400).send(response);
      }
    }
  );
}
