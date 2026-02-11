/**
 * SMS Service
 * Handles sending OTP via SMS using various providers
 */

import { config } from '../config/env';
import logger from '../utils/logger';

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SMSService {
  /**
   * Send OTP via SMS
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<SMSResult> {
    try {
      const smsConfig = (config as any).sms || {};
      const provider = smsConfig.provider || 'twilio';
      
      console.log('📱 [SMS SERVICE] Sending OTP via', provider);
      console.log('📱 [SMS SERVICE] Phone:', phoneNumber);
      console.log('📱 [SMS SERVICE] OTP:', otp);

      switch (provider) {
        case 'twilio':
          return await this.sendViaTwilio(phoneNumber, otp);
        case 'msg91':
          return await this.sendViaMSG91(phoneNumber, otp);
        case 'textlocal':
          return await this.sendViaTextLocal(phoneNumber, otp);
        case 'firebase':
          // Firebase doesn't support backend SMS sending
          // This would require client-side Firebase Phone Auth
          console.warn('⚠️  [SMS SERVICE] Firebase SMS requires client-side SDK');
          return {
            success: false,
            error: 'Firebase SMS requires client-side implementation. Use Twilio or MSG91 for backend SMS.',
          };
        default:
          throw new Error(`Unsupported SMS provider: ${provider}`);
      }
    } catch (error: any) {
      logger.error('Error sending SMS:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendViaTwilio(phoneNumber: string, otp: string): Promise<SMSResult> {
    try {
      const smsConfig = (config as any).sms || {};
      const twilioConfig = smsConfig.twilio || {};
      const accountSid = twilioConfig.accountSid;
      const authToken = twilioConfig.authToken;
      const fromNumber = twilioConfig.phoneNumber;

      if (!accountSid || !authToken || !fromNumber) {
        console.warn('⚠️  [SMS SERVICE] Twilio credentials not configured');
        console.warn('⚠️  [SMS SERVICE] OTP generated but NOT sent via SMS');
        console.warn('⚠️  [SMS SERVICE] Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to .env');
        return {
          success: false,
          error: 'Twilio credentials not configured. OTP generated but not sent.',
        };
      }

      // Dynamic import to avoid requiring twilio if not used
      let twilio;
      try {
        twilio = require('twilio');
      } catch (error) {
        console.warn('⚠️  [SMS SERVICE] Twilio package not installed. Install with: npm install twilio');
        return {
          success: false,
          error: 'Twilio package not installed. Run: npm install twilio',
        };
      }
      
      const client = twilio(accountSid, authToken);

      const message = await client.messages.create({
        body: `Your Forlok verification code is: ${otp}. Valid for 5 minutes.`,
        from: fromNumber,
        to: phoneNumber,
      });

      console.log('✅ [SMS SERVICE] SMS sent via Twilio. Message SID:', message.sid);
      logger.info(`SMS sent via Twilio to ${phoneNumber}`, { messageSid: message.sid });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error: any) {
      console.error('❌ [SMS SERVICE] Twilio error:', error);
      logger.error('Twilio SMS error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS via Twilio',
      };
    }
  }

  /**
   * Send SMS via MSG91
   */
  private async sendViaMSG91(phoneNumber: string, otp: string): Promise<SMSResult> {
    try {
      const authKey = (config as any).sms?.msg91?.authKey;
      const senderId = (config as any).sms?.msg91?.senderId;

      if (!authKey || !senderId) {
        console.warn('⚠️  [SMS SERVICE] MSG91 credentials not configured');
        return {
          success: false,
          error: 'MSG91 credentials not configured',
        };
      }

      // Format phone number (remove + and ensure country code)
      const formattedPhone = phoneNumber.replace(/\+/g, '');

      const response = await fetch('https://api.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authkey: authKey,
          mobile: formattedPhone,
          message: `Your Forlok verification code is ${otp}. Valid for 5 minutes.`,
          sender: senderId,
          otp: otp,
          otp_expiry: 5, // minutes
        }),
      });

      const data: any = await response.json();

      if (data.type === 'success') {
        console.log('✅ [SMS SERVICE] SMS sent via MSG91');
        return {
          success: true,
          messageId: data.request_id,
        };
      } else {
        throw new Error(data.message || 'MSG91 API error');
      }
    } catch (error: any) {
      console.error('❌ [SMS SERVICE] MSG91 error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS via MSG91',
      };
    }
  }

  /**
   * Send SMS via TextLocal
   */
  private async sendViaTextLocal(phoneNumber: string, otp: string): Promise<SMSResult> {
    try {
      const smsConfig = (config as any).sms || {};
      const textlocalConfig = smsConfig.textlocal || {};
      const apiKey = textlocalConfig.apiKey;
      const sender = textlocalConfig.sender || 'TXTLCL';

      if (!apiKey) {
        console.warn('⚠️  [SMS SERVICE] TextLocal credentials not configured');
        return {
          success: false,
          error: 'TextLocal credentials not configured',
        };
      }

      // Format phone number
      const formattedPhone = phoneNumber.replace(/\+/g, '');

      const response = await fetch('https://api.textlocal.in/send/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: apiKey,
          numbers: formattedPhone,
          message: `Your Forlok verification code is: ${otp}. Valid for 5 minutes.`,
          sender: sender,
        }),
      });

      const data: any = await response.json();

      if (data.status === 'success') {
        console.log('✅ [SMS SERVICE] SMS sent via TextLocal');
        return {
          success: true,
          messageId: data.batch_id,
        };
      } else {
        throw new Error(data.errors?.[0]?.message || 'TextLocal API error');
      }
    } catch (error: any) {
      console.error('❌ [SMS SERVICE] TextLocal error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS via TextLocal',
      };
    }
  }
}

export const smsService = new SMSService();
export default smsService;
