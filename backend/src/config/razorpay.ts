import Razorpay from 'razorpay';
import { config } from './env';
import logger from '../utils/logger';

let razorpayInstance: Razorpay | null = null;

export function initializeRazorpay(): Razorpay | null {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  // Only initialize if credentials are provided
  if (!config.payment.razorpay.keyId || !config.payment.razorpay.keySecret) {
    logger.warn('⚠️  Razorpay not configured - payment features will not work');
    return null;
  }

  try {
    razorpayInstance = new Razorpay({
      key_id: config.payment.razorpay.keyId,
      key_secret: config.payment.razorpay.keySecret,
    });

    logger.info('✅ Razorpay initialized successfully');
    return razorpayInstance;
  } catch (error) {
    logger.error('Failed to initialize Razorpay:', error);
    // Don't throw - allow server to start without Razorpay
    return null;
  }
}

export function getRazorpayInstance(): Razorpay {
  if (!razorpayInstance) {
    const instance = initializeRazorpay();
    if (!instance) {
      throw new Error('Razorpay not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env');
    }
    return instance;
  }
  return razorpayInstance;
}

export function verifyWebhookSignature(
  webhookBody: string,
  signature: string
): boolean {
  try {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', config.payment.razorpay.webhookSecret)
      .update(webhookBody)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    return false;
  }
}

export default razorpayInstance;
