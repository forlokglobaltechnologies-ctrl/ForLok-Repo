import { v2 as cloudinary } from 'cloudinary';
import { config } from './env';
import logger from '../utils/logger';

export function initializeCloudinary(): void {
  try {
    // Only initialize if credentials are provided
    if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
      logger.warn('⚠️  Cloudinary not configured - file uploads will not work');
      return;
    }

    // Validate API secret length (should be 40+ characters for Cloudinary)
    if (config.cloudinary.apiSecret.length < 32) {
      logger.warn('⚠️  Cloudinary API secret seems too short - this might cause signature errors');
    }

    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true,
      // Try SHA-256 if account requires it (some accounts only support SHA-256)
      signature_algorithm: 'sha256',
    });

    logger.info('✅ Cloudinary initialized successfully');
    logger.info(`☁️  Cloud Name: ${config.cloudinary.cloudName}`);
    logger.info(`☁️  API Key: ${config.cloudinary.apiKey.substring(0, 8)}...`);
    logger.info(`☁️  API Secret: ${config.cloudinary.apiSecret.substring(0, 8)}... (${config.cloudinary.apiSecret.length} chars)`);
    
    // Verify API secret format (should be alphanumeric with possible underscores/dashes)
    if (!/^[a-zA-Z0-9_-]+$/.test(config.cloudinary.apiSecret)) {
      logger.warn('⚠️  Cloudinary API secret contains unexpected characters - this might cause signature errors');
    }
  } catch (error) {
    logger.error('Failed to initialize Cloudinary:', error);
    // Don't throw - allow server to start without Cloudinary
  }
}

export async function uploadImage(
  file: Buffer | string,
  folder: string = config.cloudinary.folder,
  options?: {
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    transformation?: any[];
    publicId?: string;
  }
): Promise<{
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
}> {
  try {
    const uploadOptions: any = {
      folder: `${config.cloudinary.folder}/${folder}`,
      resource_type: options?.resourceType || 'auto',
      ...options,
    };

    const result = await cloudinary.uploader.upload(file as string, uploadOptions);
    
    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  } catch (error) {
    logger.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
}

export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Deleted image from Cloudinary: ${publicId}`);
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete file from Cloudinary');
  }
}

export async function uploadFromBuffer(
  buffer: Buffer,
  folder: string = config.cloudinary.folder,
  options?: any
): Promise<any> {
  try {
    // Determine resource type based on options or file extension
    let resourceType = options?.resource_type || 'auto';
    
    // If mimeType is provided in options, use it to determine resource type
    if (options?.mimeType) {
      const mimeType = options.mimeType.toLowerCase();
      if (mimeType === 'application/pdf' || mimeType.startsWith('application/')) {
        resourceType = 'raw';
      } else if (mimeType.startsWith('image/')) {
        resourceType = 'image';
      } else if (mimeType.startsWith('video/')) {
        resourceType = 'video';
      } else {
        resourceType = 'auto'; // Let Cloudinary auto-detect
      }
    }

    // Extract mimeType before destructuring (needed for data URI)
    const mimeType = options?.mimeType;
    
    // Create clean upload options without mimeType and any signature-related fields
    const { mimeType: _, signature, timestamp, api_key, ...cleanOptions } = options || {};
    
    // Clean folder path - remove leading/trailing slashes and normalize
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    const fullFolder = cleanFolder 
      ? `${config.cloudinary.folder}/${cleanFolder}`.replace(/\/+/g, '/')
      : config.cloudinary.folder;
    
    const uploadOptions: any = {
      folder: fullFolder,
      resource_type: resourceType,
    };

    // Only include public_id if provided, otherwise let Cloudinary generate it
    // This helps avoid signature issues
    if (cleanOptions.public_id) {
      uploadOptions.public_id = cleanOptions.public_id;
    }

    // Include other clean options (but exclude signature-related ones)
    Object.keys(cleanOptions).forEach(key => {
      if (key !== 'public_id' && key !== 'signature' && key !== 'timestamp' && key !== 'api_key') {
        uploadOptions[key] = cleanOptions[key];
      }
    });

    // Remove any signature-related fields that might interfere with SDK's automatic signing
    delete uploadOptions.signature;
    delete uploadOptions.timestamp;
    delete uploadOptions.api_key;

    console.log('☁️ [CLOUDINARY] Uploading file with options:', {
      folder: uploadOptions.folder,
      resource_type: uploadOptions.resource_type,
      public_id: uploadOptions.public_id || '(auto-generated)',
    });

    // Convert buffer to data URI for uploader.upload() method
    // This avoids signature issues with upload_stream
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${mimeType || 'application/octet-stream'};base64,${base64Data}`;

    // Use uploader.upload() - SDK will automatically sign with configured api_secret
    // If signature_algorithm is set to 'sha256', it will use that
    const result = await cloudinary.uploader.upload(dataUri, uploadOptions);
    
    console.log('☁️ [CLOUDINARY] Upload successful:', result?.secure_url);
    return result;
  } catch (error: any) {
    logger.error('Cloudinary uploadFromBuffer error:', error);
    console.error('☁️ [CLOUDINARY] Upload error:', error);
    console.error('☁️ [CLOUDINARY] Error message:', error?.message);
    console.error('☁️ [CLOUDINARY] Config check - Cloud Name:', config.cloudinary.cloudName);
    console.error('☁️ [CLOUDINARY] Config check - API Key exists:', !!config.cloudinary.apiKey);
    console.error('☁️ [CLOUDINARY] Config check - API Secret exists:', !!config.cloudinary.apiSecret);
    console.error('☁️ [CLOUDINARY] Config check - API Secret length:', config.cloudinary.apiSecret?.length);
    console.error('☁️ [CLOUDINARY] Config check - API Secret first 10 chars:', config.cloudinary.apiSecret?.substring(0, 10));
    
    // If signature error, provide helpful message
    if (error?.message?.includes('Invalid Signature')) {
      console.error('☁️ [CLOUDINARY] ⚠️  SIGNATURE ERROR DETECTED');
      console.error('☁️ [CLOUDINARY] Please verify:');
      console.error('☁️ [CLOUDINARY] 1. API Secret in .env matches your Cloudinary dashboard');
      console.error('☁️ [CLOUDINARY] 2. No extra spaces or quotes around API Secret in .env');
      console.error('☁️ [CLOUDINARY] 3. Your Cloudinary account signature algorithm setting');
    }
    
    throw error;
  }
}

export default cloudinary;
