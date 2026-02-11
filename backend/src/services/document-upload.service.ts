import Document from '../models/Document';
import User from '../models/User';
import { generateUserId } from '../utils/helpers';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import { uploadFromBuffer, deleteImage } from '../config/cloudinary';
import { userService } from './user.service';
import { DocumentType, DocumentStatus } from '../types';

class DocumentUploadService {
  /**
   * Upload document
   */
  async uploadDocument(
    userId: string,
    companyId: string | undefined,
    type: DocumentType,
    file: Buffer,
    mimeType: string,
    originalName?: string
  ): Promise<any> {
    try {
      // Check if document of this type already exists for this user
      const existingDoc = await Document.findOne({
        userId,
        type,
        status: { $in: ['pending', 'verified'] },
      });

      if (existingDoc) {
        // Delete old document from Cloudinary
        if (existingDoc.publicId) {
          try {
            await deleteImage(existingDoc.publicId);
          } catch (error) {
            logger.warn('Could not delete old document from Cloudinary:', error);
          }
        }

        // Update existing document
        const uploadResult: any = await uploadFromBuffer(file, `documents/${userId}`, {
          public_id: `${type}_${Date.now()}`,
          mimeType: mimeType, // Pass mimeType to determine resource_type
        });

        // Ensure we have a URL from Cloudinary
        const documentUrl = uploadResult.secure_url || uploadResult.url;
        if (!documentUrl) {
          logger.error(`❌ No URL returned from Cloudinary upload for existing document type: ${type}`);
          throw new Error('Failed to get document URL from Cloudinary');
        }

        existingDoc.url = documentUrl;
        existingDoc.publicId = uploadResult.public_id;
        existingDoc.status = 'pending';
        existingDoc.verificationData = {
          verified: false,
        };
        if (originalName) {
          existingDoc.metadata = {
            originalName,
            mimeType,
            size: file.length,
          };
        }
        await existingDoc.save();

        logger.info(`✅ Document updated: documentId=${existingDoc.documentId}, url=${existingDoc.url}, publicId=${existingDoc.publicId}`);

        // If this is a user_photo document, also update the user's profilePhoto
        if (type === 'user_photo' && uploadResult.secure_url) {
          try {
            const user = await User.findOne({ userId });
            if (user) {
              // Delete old profile photo from Cloudinary if exists
              if (user.profilePhoto) {
                try {
                  const oldPublicId = user.profilePhoto.split('/').pop()?.split('.')[0];
                  if (oldPublicId && !oldPublicId.includes('user_photo')) {
                    // Only delete if it's not already a user_photo document
                    await deleteImage(oldPublicId);
                  }
                } catch (error) {
                  logger.warn('Could not delete old profile photo:', error);
                }
              }
              user.profilePhoto = uploadResult.secure_url;
              await user.save();
              logger.info(`User profile photo updated: ${userId}`);
            }
          } catch (error) {
            logger.warn('Failed to update user profile photo:', error);
            // Don't fail the document upload if this update fails
          }
        }

        return existingDoc.toJSON();
      }

      // Create new document
      const documentId = generateUserId('DOC');
      const uploadResult: any = await uploadFromBuffer(file, `documents/${userId}`, {
        public_id: `${type}_${Date.now()}`,
        mimeType: mimeType, // Pass mimeType to determine resource_type
      });

      // Ensure we have a URL from Cloudinary
      const documentUrl = uploadResult.secure_url || uploadResult.url;
      if (!documentUrl) {
        logger.error(`❌ No URL returned from Cloudinary upload for document type: ${type}`);
        throw new Error('Failed to get document URL from Cloudinary');
      }

      logger.info(`📝 Creating document in MongoDB: documentId=${documentId}, userId=${userId}, type=${type}, url=${documentUrl}`);

      // Auto-verify image documents when uploaded to Cloudinary
      // Business documents and image-only documents (photos) don't need manual verification
      const autoVerifyDocTypes = [
        'company_registration',
        'gst_certificate',
        'business_license',
        'user_photo',
        'vehicle_front',
        'vehicle_back',
        'vehicle_side',
        'vehicle_interior',
        'vehicle_insurance',
        'vehicle_registration',
        'vehicle_pollution',
        'taxi_service_papers',
      ];
      const isAutoVerifyDoc = autoVerifyDocTypes.includes(type);
      const documentStatus = isAutoVerifyDoc ? 'verified' : 'pending';
      const verificationData = isAutoVerifyDoc
        ? {
            verified: true,
            verifiedAt: new Date(),
            verifiedBy: 'system',
          }
        : {
            verified: false,
          };

      const document = await Document.create({
        documentId,
        userId,
        companyId,
        type,
        status: documentStatus,
        url: documentUrl,
        publicId: uploadResult.public_id,
        verificationData,
        metadata: originalName
          ? {
              originalName,
              mimeType,
              size: file.length,
            }
          : undefined,
      });

      if (isAutoVerifyDoc) {
        logger.info(`✅ Document auto-verified: ${type} for userId=${userId}`);
      }

      // Verify document was saved
      const savedDoc = await Document.findOne({ documentId });
      if (!savedDoc) {
        logger.error(`❌ Document was not saved to MongoDB: documentId=${documentId}`);
        throw new Error('Failed to save document to database');
      }

      logger.info(`✅ Document saved successfully: documentId=${documentId}, url=${savedDoc.url}, publicId=${savedDoc.publicId}`);

      // If this is a user_photo document, also update the user's profilePhoto
      if (type === 'user_photo' && uploadResult.secure_url) {
        try {
          const user = await User.findOne({ userId });
          if (user) {
            // Delete old profile photo from Cloudinary if exists
            if (user.profilePhoto) {
              try {
                const oldPublicId = user.profilePhoto.split('/').pop()?.split('.')[0];
                if (oldPublicId && !oldPublicId.includes('user_photo')) {
                  // Only delete if it's not already a user_photo document
                  await deleteImage(oldPublicId);
                }
              } catch (error) {
                logger.warn('Could not delete old profile photo:', error);
              }
            }
            user.profilePhoto = uploadResult.secure_url;
            await user.save();
            logger.info(`User profile photo updated: ${userId}`);
          }
        } catch (error) {
          logger.warn('Failed to update user profile photo:', error);
          // Don't fail the document upload if this update fails
        }
      }

      // Check and update user verification status (if document is verified)
      if (document.status === 'verified') {
        try {
          await userService.checkAndUpdateVerificationStatus(userId);
        } catch (error) {
          logger.warn('Failed to update user verification status:', error);
          // Don't fail the document upload if this check fails
        }
      }

      return document.toJSON();
    } catch (error) {
      logger.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Get user documents
   */
  async getUserDocuments(userId: string, companyId?: string): Promise<any[]> {
    try {
      const query: any = { userId };
      if (companyId) {
        query.companyId = companyId;
      }

      logger.info(`🔍 Fetching documents for userId=${userId}, companyId=${companyId || 'none'}`);
      const documents = await Document.find(query).sort({ createdAt: -1 });
      logger.info(`📋 Found ${documents.length} documents for user ${userId}`);
      
      const result = documents.map((doc) => {
        const docJson = doc.toJSON();
        logger.info(`📄 Document: type=${docJson.type}, url=${docJson.url || 'NO URL'}, status=${docJson.status}`);
        return docJson;
      });
      
      return result;
    } catch (error) {
      logger.error('Error getting user documents:', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId: string, userId: string): Promise<any> {
    try {
      const document = await Document.findOne({ documentId, userId });
      if (!document) {
        throw new NotFoundError('Document not found');
      }
      return document.toJSON();
    } catch (error) {
      logger.error('Error getting document by ID:', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      const document = await Document.findOne({ documentId, userId });
      if (!document) {
        throw new NotFoundError('Document not found');
      }

      // Delete from Cloudinary
      if (document.publicId) {
        try {
          await deleteImage(document.publicId);
        } catch (error) {
          logger.warn('Could not delete document from Cloudinary:', error);
        }
      }

      // Delete from database
      await Document.deleteOne({ documentId });

      logger.info(`Document deleted: ${documentId}`);
    } catch (error) {
      logger.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get required documents for service type
   */
  getRequiredDocuments(serviceType: 'offering_pooling' | 'offering_rental' | 'taking_pooling' | 'taking_rental'): DocumentType[] {
    switch (serviceType) {
      case 'offering_pooling':
        return ['aadhar_front', 'aadhar_back', 'driving_license_front', 'driving_license_back'];
      case 'offering_rental':
        return ['aadhar_front', 'aadhar_back'];
      case 'taking_pooling':
        return ['aadhar_front', 'aadhar_back'];
      case 'taking_rental':
        return ['aadhar_front', 'aadhar_back', 'driving_license_front', 'driving_license_back'];
      default:
        return [];
    }
  }

  /**
   * Check if user has required documents for service
   */
  async checkEligibility(userId: string, serviceType: 'offering_pooling' | 'offering_rental' | 'taking_pooling' | 'taking_rental'): Promise<{
    eligible: boolean;
    missingDocuments: DocumentType[];
    pendingDocuments: DocumentType[];
  }> {
    try {
      const requiredDocs = this.getRequiredDocuments(serviceType);
      
      // For Aadhaar, check if at least one side is verified (both front and back are created together)
      // For DL, check if at least one side is verified
      const userDocuments = await Document.find({
        userId,
        type: { $in: requiredDocs },
        status: 'verified',
      });

      // Group by base type (aadhar_front and aadhar_back count as one aadhar)
      const verifiedBaseTypes = new Set<string>();
      userDocuments.forEach((doc) => {
        if (doc.type === 'aadhar_front' || doc.type === 'aadhar_back') {
          verifiedBaseTypes.add('aadhar');
        } else if (doc.type === 'driving_license_front' || doc.type === 'driving_license_back') {
          verifiedBaseTypes.add('driving_license');
        } else {
          verifiedBaseTypes.add(doc.type);
        }
      });

      // Check which required documents are missing
      const missingDocuments: DocumentType[] = [];
      requiredDocs.forEach((docType) => {
        if (docType === 'aadhar_front' || docType === 'aadhar_back') {
          if (!verifiedBaseTypes.has('aadhar')) {
            missingDocuments.push('aadhar_front');
          }
        } else if (docType === 'driving_license_front' || docType === 'driving_license_back') {
          if (!verifiedBaseTypes.has('driving_license')) {
            missingDocuments.push('driving_license_front');
          }
        } else {
          if (!verifiedBaseTypes.has(docType)) {
            missingDocuments.push(docType);
          }
        }
      });

      // Remove duplicates (already handled by Set logic above)

      // Check for pending documents
      const pendingDocs = await Document.find({
        userId,
        type: { $in: requiredDocs },
        status: { $in: ['pending', 'under_review'] },
      });
      const pendingTypes = pendingDocs.map((doc) => doc.type);

      return {
        eligible: missingDocuments.length === 0,
        missingDocuments,
        pendingDocuments: pendingTypes,
      };
    } catch (error) {
      logger.error('Error checking eligibility:', error);
      throw error;
    }
  }

  /**
   * Update document verification status (admin only)
   */
  async updateVerificationStatus(
    documentId: string,
    status: DocumentStatus,
    verifiedBy: string,
    rejectionReason?: string,
    idfyTaskId?: string
  ): Promise<any> {
    try {
      const document = await Document.findOne({ documentId });
      if (!document) {
        throw new NotFoundError('Document not found');
      }

      document.status = status;
      if (document.verificationData) {
        document.verificationData.verified = status === 'verified';
        document.verificationData.verifiedAt = status === 'verified' ? new Date() : undefined;
        document.verificationData.verifiedBy = verifiedBy;
        document.verificationData.rejectionReason = rejectionReason;
        if (idfyTaskId) {
          document.verificationData.idfyTaskId = idfyTaskId;
        }
      }

      await document.save();

      logger.info(`Document verification status updated: ${documentId} - ${status}`);

      // Check and update user verification status when document status changes
      try {
        await userService.checkAndUpdateVerificationStatus(document.userId);
      } catch (error) {
        logger.warn('Failed to update user verification status:', error);
        // Don't fail the status update if this check fails
      }

      return document.toJSON();
    } catch (error) {
      logger.error('Error updating verification status:', error);
      throw error;
    }
  }
}

export const documentUploadService = new DocumentUploadService();
export default documentUploadService;
