import Document from '../models/Document';
import { generateUserId } from '../utils/helpers';
import logger from '../utils/logger';
import { documentService } from './document.service';
import { userService } from './user.service';
import { DocumentType } from '../types';

class DocumentVerificationService {
  /**
   * Verify document by number only (no image upload required)
   * For Aadhaar, PAN, Driving License
   */
  async verifyDocumentByNumber(
    userId: string,
    type: 'aadhaar' | 'pan' | 'driving_license',
    documentNumber: string,
    additionalData?: {
      dob?: string; // For Driving License
      state?: string; // For Driving License
    }
  ): Promise<any> {
    try {
      // Map document type to document model types
      const documentTypeMap: Record<string, DocumentType[]> = {
        aadhaar: ['aadhar_front', 'aadhar_back'],
        pan: ['aadhar_front'], // PAN uses same structure
        driving_license: ['driving_license_front', 'driving_license_back'],
      };

      const documentTypes = documentTypeMap[type];
      if (!documentTypes) {
        throw new Error(`Invalid document type: ${type}`);
      }

      // Verify document number via IDfy (or mock mode)
      let verificationResult;
      if (type === 'aadhaar') {
        verificationResult = await documentService.verifyAadhaar(documentNumber);
      } else if (type === 'pan') {
        verificationResult = await documentService.verifyPAN(documentNumber);
      } else if (type === 'driving_license') {
        if (!additionalData?.dob || !additionalData?.state) {
          throw new Error('DOB and State are required for Driving License verification');
        }
        verificationResult = await documentService.verifyDrivingLicense(
          documentNumber,
          additionalData.dob,
          additionalData.state
        );
      }

      // In mock mode, verificationResult.verified will be true
      // In real mode, check if verification succeeded
      if (!verificationResult.verified) {
        throw new Error(verificationResult.error || 'Document verification failed');
      }

      // Store additional data for Driving License
      const additionalInfo: any = {};
      if (type === 'driving_license' && additionalData) {
        additionalInfo.dob = additionalData.dob;
        additionalInfo.state = additionalData.state;
      }

      // Create/update document records
      const documents = [];
      const taskId = verificationResult.data?.task_id || verificationResult.data?.taskId;

      for (const docType of documentTypes) {
        // Check if document already exists
        const existingDoc = await Document.findOne({
          userId,
          type: docType,
          status: { $in: ['pending', 'verified'] },
        });

        if (existingDoc) {
          // Update existing document
          existingDoc.documentNumber = documentNumber;
          existingDoc.status = 'verified';
          existingDoc.verificationData = {
            verified: true,
            verifiedAt: new Date(),
            verifiedBy: 'system',
            idfyTaskId: taskId,
          };
          // Store additional info in metadata
          if (Object.keys(additionalInfo).length > 0) {
            existingDoc.metadata = {
              ...existingDoc.metadata,
              ...additionalInfo,
            };
          }
          await existingDoc.save();
          documents.push(existingDoc.toJSON());
        } else {
          // Create new document - ALWAYS STORE IN DATABASE
          const documentId = generateUserId('DOC');
          const document = await Document.create({
            documentId,
            userId,
            type: docType,
            status: 'verified',
            documentNumber, // Store document number in DB
            verificationData: {
              verified: true,
              verifiedAt: new Date(),
              verifiedBy: 'system',
              idfyTaskId: taskId,
            },
            metadata: Object.keys(additionalInfo).length > 0 ? additionalInfo : undefined,
          });
          documents.push(document.toJSON());
        }
      }

      logger.info(`Document verified by number: ${type} for user ${userId}`);

      // Check and update user verification status
      try {
        await userService.checkAndUpdateVerificationStatus(userId);
      } catch (error) {
        logger.warn('Failed to update user verification status:', error);
        // Don't fail the document verification if this check fails
      }

      return {
        verified: true,
        documents,
        taskId,
      };
    } catch (error) {
      logger.error('Error verifying document by number:', error);
      throw error;
    }
  }

  /**
   * Upload document image (for vehicle docs, user photo, etc.)
   * Images are required for: vehicle_front, vehicle_back, vehicle_side, vehicle_interior, vehicle_insurance, user_photo
   */
  async uploadDocumentImage(
    userId: string,
    companyId: string | undefined,
    type: DocumentType,
    file: Buffer,
    mimeType: string,
    originalName?: string
  ): Promise<any> {
    try {
      // Check if this document type requires image/document upload
      const requiresImage = [
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
      ].includes(type);

      if (!requiresImage) {
        throw new Error(`Document type ${type} does not require image/document upload. Use number verification instead.`);
      }

      // Import upload service
      const { documentUploadService } = await import('./document-upload.service');

      return await documentUploadService.uploadDocument(
        userId,
        companyId,
        type,
        file,
        mimeType,
        originalName
      );
    } catch (error) {
      logger.error('Error uploading document image:', error);
      throw error;
    }
  }
}

export const documentVerificationService = new DocumentVerificationService();
export default documentVerificationService;
