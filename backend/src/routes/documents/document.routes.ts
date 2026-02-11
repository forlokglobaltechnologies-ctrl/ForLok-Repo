import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { documentUploadService } from '../../services/document-upload.service';
import { documentService } from '../../services/document.service';
import { documentVerificationService } from '../../services/document-verification.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { validateFileUpload } from '../../middleware/upload.middleware';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import { ApiResponse, DocumentType } from '../../types';
import logger from '../../utils/logger';

// Request schemas
const verifyAadhaarSchema = z.object({
  aadhaarNumber: z.string().length(12).regex(/^\d+$/),
});

const verifyPANSchema = z.object({
  panNumber: z.string().length(10).regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/),
});

const verifyDrivingLicenseSchema = z.object({
  dlNumber: z.string().min(1),
  dob: z.string(),
  state: z.string().min(1),
});

const checkEligibilitySchema = z.object({
  serviceType: z.enum(['offering_pooling', 'offering_rental', 'taking_pooling', 'taking_rental']),
});

const verifyDocumentByNumberSchema = z.object({
  type: z.enum(['aadhaar', 'pan', 'driving_license']),
  documentNumber: z.string().min(1),
  dob: z.string().optional(), // For Driving License
  state: z.string().optional(), // For Driving License
});

export async function documentRoutes(fastify: FastifyInstance) {
  // Register multipart plugin for file uploads
  await fastify.register(multipart);

  /**
   * POST /api/documents/verify-by-number
   * Verify document by number only (no image upload) - for Aadhaar, PAN, Driving License
   */
  fastify.post(
    '/verify-by-number',
    {
      preHandler: [authenticate, validate(verifyDocumentByNumberSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { type, documentNumber, dob, state } = request.body as {
        type: 'aadhaar' | 'pan' | 'driving_license';
        documentNumber: string;
        dob?: string;
        state?: string;
      };

      const result = await documentVerificationService.verifyDocumentByNumber(
        userId,
        type,
        documentNumber,
        { dob, state }
      );

      const response: ApiResponse = {
        success: true,
        message: 'Document verified successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/documents/upload
   * Upload document image (for vehicle docs, user photo, etc.)
   * Note: Aadhaar, PAN, DL should use /verify-by-number instead
   */
  fastify.post(
    '/upload',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { type, companyId } = request.query as { type: string; companyId?: string };

      if (!type) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid document type',
          error: 'INVALID_DOCUMENT_TYPE',
        });
      }

      // Validate document type
      const validDocumentTypes: DocumentType[] = [
        'aadhar_front',
        'aadhar_back',
        'driving_license_front',
        'driving_license_back',
        'vehicle_front',
        'vehicle_back',
        'vehicle_side',
        'vehicle_interior',
        'vehicle_insurance',
        'vehicle_registration',
        'vehicle_pollution',
        'taxi_service_papers',
        'user_photo',
        'company_registration',
        'gst_certificate',
        'business_license',
      ];

      if (!validDocumentTypes.includes(type as DocumentType)) {
        return reply.status(400).send({
          success: false,
          message: `Invalid document type: ${type}. Allowed types: ${validDocumentTypes.join(', ')}`,
          error: 'INVALID_DOCUMENT_TYPE',
        });
      }

      // Check if this document type should use number verification
      const numberOnlyTypes = ['aadhar_front', 'aadhar_back', 'driving_license_front', 'driving_license_back'];
      if (numberOnlyTypes.includes(type)) {
        return reply.status(400).send({
          success: false,
          message: `Document type ${type} should use /verify-by-number endpoint instead of image upload`,
          error: 'USE_NUMBER_VERIFICATION',
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
      logger.info(`📤 Uploading document: type=${type}, userId=${userId}, size=${buffer.length}, mimeType=${data.mimetype}`);
      
      const document = await documentVerificationService.uploadDocumentImage(
        userId,
        companyId,
        type as DocumentType,
        buffer,
        data.mimetype,
        data.filename
      );

      // Ensure document has URL
      if (!document.url) {
        logger.error(`❌ Document uploaded but no URL found: documentId=${document.documentId}, document=`, document);
        return reply.status(500).send({
          success: false,
          message: 'Document uploaded but URL not found',
          error: 'MISSING_URL',
        });
      }

      logger.info(`✅ Document uploaded successfully: documentId=${document.documentId}, url=${document.url}, publicId=${document.publicId}`);

      // Verify document was saved to MongoDB
      const { documentUploadService } = await import('../../services/document-upload.service');
      const savedDoc = await documentUploadService.getDocumentById(document.documentId, userId);
      if (!savedDoc || !savedDoc.url) {
        logger.error(`❌ Document not found in MongoDB or missing URL: documentId=${document.documentId}`);
        return reply.status(500).send({
          success: false,
          message: 'Document not saved to database',
          error: 'DATABASE_ERROR',
        });
      }

      const response: ApiResponse = {
        success: true,
        message: 'Document uploaded successfully',
        data: {
          documentId: savedDoc.documentId,
          userId: savedDoc.userId,
          type: savedDoc.type,
          status: savedDoc.status,
          url: savedDoc.url, // Ensure URL is always included
          publicId: savedDoc.publicId,
          createdAt: savedDoc.createdAt,
          updatedAt: savedDoc.updatedAt,
        },
      };

      return reply.status(201).send(response);
    }
  );

  /**
   * GET /api/documents/user-documents
   * Get user documents (authenticated)
   */
  fastify.get(
    '/user-documents',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { companyId } = request.query as { companyId?: string };

      logger.info(`📥 Fetching documents for userId=${userId}, companyId=${companyId || 'none'}`);
      const documents = await documentUploadService.getUserDocuments(userId, companyId);
      logger.info(`📋 Returning ${documents.length} documents to frontend`);

      const response: ApiResponse = {
        success: true,
        message: 'Documents retrieved successfully',
        data: documents,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/documents/:documentId
   * Get document by ID (authenticated)
   */
  fastify.get(
    '/:documentId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { documentId } = request.params as { documentId: string };

      const document = await documentUploadService.getDocumentById(documentId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Document retrieved successfully',
        data: document,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * DELETE /api/documents/:documentId
   * Delete document (authenticated)
   */
  fastify.delete(
    '/:documentId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { documentId } = request.params as { documentId: string };

      await documentUploadService.deleteDocument(documentId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Document deleted successfully',
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/documents/verify-aadhaar
   * Verify Aadhaar card (authenticated)
   */
  fastify.post(
    '/verify-aadhaar',
    {
      preHandler: [authenticate, validate(verifyAadhaarSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { aadhaarNumber } = request.body as { aadhaarNumber: string };

      const result = await documentService.verifyAadhaar(aadhaarNumber);

      const response: ApiResponse = {
        success: result.verified,
        message: result.verified ? 'Aadhaar verified successfully' : 'Aadhaar verification failed',
        data: result,
      };

      return reply.status(result.verified ? 200 : 400).send(response);
    }
  );

  /**
   * POST /api/documents/verify-pan
   * Verify PAN card (authenticated)
   */
  fastify.post(
    '/verify-pan',
    {
      preHandler: [authenticate, validate(verifyPANSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { panNumber } = request.body as { panNumber: string };

      const result = await documentService.verifyPAN(panNumber);

      const response: ApiResponse = {
        success: result.verified,
        message: result.verified ? 'PAN verified successfully' : 'PAN verification failed',
        data: result,
      };

      return reply.status(result.verified ? 200 : 400).send(response);
    }
  );

  /**
   * POST /api/documents/verify-license
   * Verify Driving License (authenticated)
   */
  fastify.post(
    '/verify-license',
    {
      preHandler: [authenticate, validate(verifyDrivingLicenseSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { dlNumber, dob, state } = request.body as {
        dlNumber: string;
        dob: string;
        state: string;
      };

      const result = await documentService.verifyDrivingLicense(dlNumber, dob, state);

      const response: ApiResponse = {
        success: result.verified,
        message: result.verified ? 'Driving License verified successfully' : 'Driving License verification failed',
        data: result,
      };

      return reply.status(result.verified ? 200 : 400).send(response);
    }
  );

  /**
   * GET /api/documents/verification-status/:taskId
   * Get verification status (authenticated)
   */
  fastify.get(
    '/verification-status/:taskId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { taskId } = request.params as { taskId: string };

      const status = await documentService.getVerificationStatus(taskId);

      const response: ApiResponse = {
        success: true,
        message: 'Verification status retrieved successfully',
        data: status,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/documents/required
   * Get required documents for service type (authenticated)
   */
  fastify.get(
    '/required',
    {
      preHandler: [authenticate, validate(checkEligibilitySchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { serviceType } = request.query as {
        serviceType: 'offering_pooling' | 'offering_rental' | 'taking_pooling' | 'taking_rental';
      };

      const requiredDocs = documentUploadService.getRequiredDocuments(serviceType);

      const response: ApiResponse = {
        success: true,
        message: 'Required documents retrieved successfully',
        data: {
          serviceType,
          requiredDocuments: requiredDocs,
        },
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/documents/check-eligibility
   * Check if user can access service (authenticated)
   */
  fastify.post(
    '/check-eligibility',
    {
      preHandler: [authenticate, validate(checkEligibilitySchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { serviceType } = request.body as {
        serviceType: 'offering_pooling' | 'offering_rental' | 'taking_pooling' | 'taking_rental';
      };

      const eligibility = await documentUploadService.checkEligibility(userId, serviceType);

      const response: ApiResponse = {
        success: true,
        message: eligibility.eligible
          ? 'User is eligible for this service'
          : 'User is not eligible. Missing documents required.',
        data: eligibility,
      };

      return reply.status(200).send(response);
    }
  );
}
