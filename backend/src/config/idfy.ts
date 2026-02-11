import axios, { AxiosInstance } from 'axios';
import { config } from './env';
import logger from '../utils/logger';

class IDfyClient {
  private client: AxiosInstance;
  private mockMode: boolean;

  constructor() {
    // Check if IDfy credentials are available
    this.mockMode = !config.documentVerification.idfy.apiKey || config.documentVerification.idfy.apiKey === '';

    if (this.mockMode) {
      logger.warn('⚠️ IDfy Mock Mode: Verification will always succeed (no API key provided)');
    }

    this.client = axios.create({
      baseURL: config.documentVerification.idfy.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.documentVerification.idfy.apiKey || 'mock-key',
      },
      timeout: 30000,
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (request) => {
        logger.debug(`IDfy API Request: ${request.method} ${request.url}`);
        return request;
      },
      (error) => {
        logger.error('IDfy API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`IDfy API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('IDfy API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Verify Aadhaar number
   */
  async verifyAadhaar(aadhaarNumber: string): Promise<any> {
    try {
      if (this.mockMode) {
        logger.info(`[MOCK] Aadhaar verification successful: ${aadhaarNumber.substring(0, 4)}****`);
        return {
          task_id: `mock_task_${Date.now()}`,
          status: 'completed',
          result: {
            verified: true,
            aadhaar_number: aadhaarNumber,
          },
        };
      }

      const response = await this.client.post('/v3/tasks', {
        task: 'aadhaar_verification',
        group_id: 'aadhaar_verification',
        data: {
          aadhaar_number: aadhaarNumber,
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('Aadhaar verification error:', error);
      throw new Error(error.response?.data?.message || 'Failed to verify Aadhaar');
    }
  }

  /**
   * Verify PAN number
   */
  async verifyPAN(panNumber: string): Promise<any> {
    try {
      if (this.mockMode) {
        logger.info(`[MOCK] PAN verification successful: ${panNumber.substring(0, 2)}****${panNumber.substring(7)}`);
        return {
          task_id: `mock_task_${Date.now()}`,
          status: 'completed',
          result: {
            verified: true,
            pan_number: panNumber,
          },
        };
      }

      const response = await this.client.post('/v3/tasks', {
        task: 'pan_verification',
        group_id: 'pan_verification',
        data: {
          pan_number: panNumber,
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('PAN verification error:', error);
      throw new Error(error.response?.data?.message || 'Failed to verify PAN');
    }
  }

  /**
   * Verify Driving License
   */
  async verifyDrivingLicense(dlNumber: string, dob: string, state: string): Promise<any> {
    try {
      if (this.mockMode) {
        logger.info(`[MOCK] Driving License verification successful: ${dlNumber.substring(0, 2)}****`);
        return {
          task_id: `mock_task_${Date.now()}`,
          status: 'completed',
          result: {
            verified: true,
            dl_number: dlNumber,
            date_of_birth: dob,
            state: state,
          },
        };
      }

      const response = await this.client.post('/v3/tasks', {
        task: 'driving_license_verification',
        group_id: 'driving_license_verification',
        data: {
          dl_number: dlNumber,
          date_of_birth: dob,
          state: state,
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('Driving License verification error:', error);
      throw new Error(error.response?.data?.message || 'Failed to verify Driving License');
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<any> {
    try {
      if (this.mockMode || taskId.startsWith('mock_task_')) {
        logger.info(`[MOCK] Task status: ${taskId}`);
        return {
          task_id: taskId,
          status: 'completed',
          result: {
            verified: true,
          },
        };
      }

      const response = await this.client.get(`/v3/tasks/${taskId}`);
      return response.data;
    } catch (error: any) {
      logger.error('Get task status error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get task status');
    }
  }
}

export const idfyClient = new IDfyClient();
export default idfyClient;
