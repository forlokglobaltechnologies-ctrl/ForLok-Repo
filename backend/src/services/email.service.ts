import nodemailer from 'nodemailer';
import { config } from '../config/env';
import logger from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize email transporter
   */
  initialize(): void {
    try {
      const emailConfig = (config as any).email || {};
      
      if (!emailConfig.host || !emailConfig.port || !emailConfig.user || !emailConfig.password) {
        console.warn('⚠️  [EMAIL SERVICE] Email credentials not configured');
        console.warn('⚠️  [EMAIL SERVICE] Email OTP sending will be disabled');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.port === 465, // true for 465, false for other ports
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password,
        },
      });

      console.log('✅ [EMAIL SERVICE] Email transporter initialized');
      logger.info('Email service initialized');
    } catch (error) {
      console.error('❌ [EMAIL SERVICE] Failed to initialize:', error);
      logger.error('Failed to initialize email service:', error);
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.transporter) {
        console.warn('⚠️  [EMAIL SERVICE] Email transporter not initialized');
        return {
          success: false,
          error: 'Email service not configured',
        };
      }

      const mailOptions = {
        from: `"eZway" <${(config as any).email?.user || 'noreply@ezway.com'}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ [EMAIL SERVICE] Email sent successfully. Message ID:', info.messageId);
      logger.info(`Email sent to ${options.to}`, { messageId: info.messageId });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      console.error('❌ [EMAIL SERVICE] Failed to send email:', error);
      logger.error('Failed to send email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  /**
   * Send OTP via email
   */
  async sendOTP(email: string, otp: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification - eZway</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #071952 0%, #0A2A6B 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #FFFFFF; margin: 0; font-size: 28px;">eZway</h1>
          </div>
          <div style="background: #FFFFFF; padding: 40px; border: 1px solid #E0E0E0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #071952; margin-top: 0;">Email Verification</h2>
            <p>Hello,</p>
            <p>Thank you for registering with eZway. Please use the following OTP to verify your email address:</p>
            <div style="background: #F5F5F5; border: 2px dashed #071952; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <p style="font-size: 32px; font-weight: bold; color: #071952; letter-spacing: 5px; margin: 0;">${otp}</p>
            </div>
            <p>This OTP is valid for <strong>5 minutes</strong>. Please do not share this OTP with anyone.</p>
            <p style="color: #757575; font-size: 12px; margin-top: 30px;">If you did not request this verification, please ignore this email.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #757575; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Forlok Technologies Pvt. Ltd. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'eZway - Email Verification OTP',
      html,
    });
  }

  /**
   * Verify email transporter is ready
   */
  isReady(): boolean {
    return this.transporter !== null;
  }
}

export const emailService = new EmailService();
export default emailService;
