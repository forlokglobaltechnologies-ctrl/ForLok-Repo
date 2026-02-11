import User from '../models/User';
import Document from '../models/Document';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';
import { formatPhoneNumber } from '../utils/helpers';

class UserService {
  /**
   * Get user profile by userId
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }
      return user.toJSON();
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    data: {
      name?: string;
      email?: string;
      dateOfBirth?: Date;
      gender?: 'Male' | 'Female' | 'Other';
      language?: 'en' | 'te' | 'hi';
    }
  ): Promise<any> {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Update fields
      if (data.name !== undefined) user.name = data.name;
      if (data.email !== undefined) {
        // Check if email is already taken by another user
        const existingUser = await User.findOne({
          email: data.email.toLowerCase(),
          userId: { $ne: userId },
        });
        if (existingUser) {
          throw new ConflictError('Email already in use');
        }
        user.email = data.email.toLowerCase();
      }
      if (data.dateOfBirth !== undefined) user.dateOfBirth = data.dateOfBirth;
      if (data.gender !== undefined) user.gender = data.gender;
      if (data.language !== undefined) user.language = data.language;

      await user.save();

      logger.info(`User profile updated: ${userId}`);

      return user.toJSON();
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(userId: string, file: Buffer, _mimeType: string): Promise<any> {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Delete old photo if exists
      if (user.profilePhoto) {
        try {
          const { deleteImage } = await import('../config/cloudinary');
          const publicId = user.profilePhoto.split('/').pop()?.split('.')[0];
          if (publicId) {
            await deleteImage(publicId);
          }
        } catch (error) {
          logger.warn('Could not delete old profile photo:', error);
        }
      }

      // Upload new photo using uploadFromBuffer for Buffer type
      const { uploadFromBuffer } = await import('../config/cloudinary');
      const uploadResult: any = await uploadFromBuffer(
        file,
        'users/profile',
        {
          public_id: `user_${userId}_${Date.now()}`,
        }
      );

      user.profilePhoto = uploadResult?.secure_url || uploadResult?.url;
      await user.save();

      logger.info(`Profile photo uploaded for user: ${userId}`);

      return {
        profilePhoto: user.profilePhoto,
      };
    } catch (error) {
      logger.error('Error uploading profile photo:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<any> {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      return {
        totalTrips: user.totalTrips,
        totalEarnings: user.totalEarnings,
        totalSpent: user.totalSpent,
        rating: user.rating,
        totalReviews: user.totalReviews,
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Update language preference
   */
  async updateLanguage(userId: string, language: 'en' | 'te' | 'hi'): Promise<any> {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.language = language;
      await user.save();

      logger.info(`Language updated for user ${userId}: ${language}`);

      return {
        language: user.language,
      };
    } catch (error) {
      logger.error('Error updating language:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await User.findOne({ userId }).select('+password');
      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!user.password) {
        throw new ConflictError('User does not have a password set');
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new ConflictError('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info(`Password changed for user: ${userId}`);
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Update phone number (requires OTP verification)
   */
  async updatePhone(userId: string, newPhone: string): Promise<any> {
    try {
      const formattedPhone = formatPhoneNumber(newPhone);

      // Check if phone is already taken
      const existingUser = await User.findOne({ phone: formattedPhone });
      if (existingUser && existingUser.userId !== userId) {
        throw new ConflictError('Phone number already in use');
      }

      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.phone = formattedPhone;
      await user.save();

      logger.info(`Phone updated for user ${userId}: ${formattedPhone}`);

      return {
        phone: user.phone,
      };
    } catch (error) {
      logger.error('Error updating phone:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string): Promise<void> {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Soft delete - mark as inactive
      user.isActive = false;
      await user.save();

      logger.info(`Account deactivated for user: ${userId}`);
    } catch (error) {
      logger.error('Error deleting account:', error);
      throw error;
    }
  }

  /**
   * Check and update user verification status based on required documents
   * For individual users: Aadhaar and Driving License must be verified
   * For company users: Company Registration, GST Certificate, and Business License must be verified
   */
  async checkAndUpdateVerificationStatus(userId: string): Promise<boolean> {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      let requiredDocs: string[] = [];
      
      if (user.userType === 'individual') {
        // For individual users: Aadhaar and Driving License
        requiredDocs = ['aadhar_front', 'aadhar_back', 'driving_license_front', 'driving_license_back'];
      } else if (user.userType === 'company') {
        // For company users: Company Registration, GST Certificate, Business License
        requiredDocs = ['company_registration', 'gst_certificate', 'business_license'];
      } else {
        // Unknown user type, don't verify
        return false;
      }

      // Check if all required documents are verified
      const verifiedDocuments = await Document.find({
        userId,
        type: { $in: requiredDocs },
        status: 'verified',
      });

      // For Aadhaar and DL, check if at least one side is verified (both are created together)
      const hasAadhaar = verifiedDocuments.some(
        (doc) => doc.type === 'aadhar_front' || doc.type === 'aadhar_back'
      );
      const hasDrivingLicense = verifiedDocuments.some(
        (doc) => doc.type === 'driving_license_front' || doc.type === 'driving_license_back'
      );
      const hasCompanyRegistration = verifiedDocuments.some(
        (doc) => doc.type === 'company_registration'
      );
      const hasGstCertificate = verifiedDocuments.some(
        (doc) => doc.type === 'gst_certificate'
      );
      const hasBusinessLicense = verifiedDocuments.some(
        (doc) => doc.type === 'business_license'
      );

      let isVerified = false;

      if (user.userType === 'individual') {
        // Individual users need both Aadhaar and Driving License
        isVerified = hasAadhaar && hasDrivingLicense;
      } else if (user.userType === 'company') {
        // Company users need all three documents
        isVerified = hasCompanyRegistration && hasGstCertificate && hasBusinessLicense;
      }

      // Update user verification status if it changed
      if (user.isVerified !== isVerified) {
        user.isVerified = isVerified;
        await user.save();
        logger.info(
          `User verification status updated for ${userId}: ${isVerified ? 'VERIFIED' : 'UNVERIFIED'}`
        );
      }

      return isVerified;
    } catch (error) {
      logger.error('Error checking user verification status:', error);
      return false;
    }
  }
}

export const userService = new UserService();
export default userService;
