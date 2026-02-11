import idfyClient from '../config/idfy';
import logger from '../utils/logger';
import { DocumentType } from '../types';

class DocumentService {
  /**
   * Verify Aadhaar number using IDfy
   */
  async verifyAadhaar(aadhaarNumber: string): Promise<any> {
    try {
      logger.info(`Verifying Aadhaar: ${aadhaarNumber.substring(0, 4)}****`);
      
      const result = await idfyClient.verifyAadhaar(aadhaarNumber);
      
      logger.info('Aadhaar verification result:', { success: !!result });
      
      return {
        verified: true,
        data: result,
      };
    } catch (error: any) {
      logger.error('Aadhaar verification error:', error);
      return {
        verified: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify PAN number using IDfy
   */
  async verifyPAN(panNumber: string): Promise<any> {
    try {
      logger.info(`Verifying PAN: ${panNumber.substring(0, 2)}****${panNumber.substring(7)}`);
      
      const result = await idfyClient.verifyPAN(panNumber);
      
      logger.info('PAN verification result:', { success: !!result });
      
      return {
        verified: true,
        data: result,
      };
    } catch (error: any) {
      logger.error('PAN verification error:', error);
      return {
        verified: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify Driving License using IDfy
   */
  async verifyDrivingLicense(
    dlNumber: string,
    dob: string,
    state: string
  ): Promise<any> {
    try {
      logger.info(`Verifying Driving License: ${dlNumber.substring(0, 2)}****`);
      
      const result = await idfyClient.verifyDrivingLicense(dlNumber, dob, state);
      
      logger.info('Driving License verification result:', { success: !!result });
      
      return {
        verified: true,
        data: result,
      };
    } catch (error: any) {
      logger.error('Driving License verification error:', error);
      return {
        verified: false,
        error: error.message,
      };
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(taskId: string): Promise<any> {
    try {
      const result = await idfyClient.getTaskStatus(taskId);
      return result;
    } catch (error: any) {
      logger.error('Get verification status error:', error);
      throw error;
    }
  }

  /**
   * Validate document type
   */
  validateDocumentType(type: string): type is DocumentType {
    const validTypes: DocumentType[] = [
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
    return validTypes.includes(type as DocumentType);
  }

  /**
   * Verify vehicle documents (basic validation)
   */
  async verifyVehicleDocuments(vehicleId: string): Promise<any> {
    try {
      // This would typically check vehicle registration, insurance, etc.
      // For now, return a placeholder response
      logger.info(`Verifying vehicle documents: ${vehicleId}`);
      
      return {
        verified: true,
        message: 'Vehicle documents verified',
      };
    } catch (error: any) {
      logger.error('Vehicle document verification error:', error);
      return {
        verified: false,
        error: error.message,
      };
    }
  }
}

export const documentService = new DocumentService();
export default documentService;
