import Company from '../models/Company';
import User from '../models/User';
import { NotFoundError, ConflictError } from '../utils/errors';
import { generateCompanyId } from '../utils/helpers';
import logger from '../utils/logger';

class CompanyService {
  /**
   * Register company
   */
  async registerCompany(data: {
    userId: string;
    companyName: string;
    registrationNumber: string;
    businessType: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    contactNumber: string;
    email: string;
    username: string;
    password: string;
    gstNumber?: string;
    documents?: {
      registrationCertificate?: string;
      gstCertificate?: string;
      businessLicense?: string;
    };
  }): Promise<any> {
    try {
      // Check if user exists
      const user = await User.findOne({ userId: data.userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if registration number already exists
      const existingCompany = await Company.findOne({
        registrationNumber: data.registrationNumber.toUpperCase(),
      });
      if (existingCompany) {
        throw new ConflictError('Company with this registration number already exists');
      }

      // Check if email already exists
      const existingEmail = await Company.findOne({ email: data.email.toLowerCase() });
      if (existingEmail) {
        throw new ConflictError('Company with this email already exists');
      }

      // Check if username already exists
      const existingUsername = await Company.findOne({
        username: data.username.toLowerCase(),
      });
      if (existingUsername) {
        throw new ConflictError('Username already taken');
      }

      // Generate unique company ID (LKC format)
      const companyId = await generateCompanyId();

      // Create company - password will be hashed by Company model's pre-save hook
      const company = await Company.create({
        companyId,
        userId: data.userId,
        companyName: data.companyName,
        registrationNumber: data.registrationNumber.toUpperCase(),
        businessType: data.businessType,
        address: data.address,
        city: data.city.trim(),
        state: data.state.trim(),
        pincode: data.pincode.trim(),
        contactNumber: data.contactNumber,
        email: data.email.toLowerCase(),
        username: data.username.toLowerCase(),
        password: data.password, // Pass plain password, pre-save hook will hash it
        gstNumber: data.gstNumber?.toUpperCase(),
        documents: data.documents || {},
        isVerified: false,
        isActive: true,
      });

      logger.info(`Company registered: ${company.companyId}`);

      // If documents were provided, also save them to Document collection
      if (data.documents && (data.documents.registrationCertificate || data.documents.gstCertificate || data.documents.businessLicense)) {
        try {
          const Document = (await import('../models/Document')).default;
          const { generateUserId } = await import('../utils/helpers');

          // Create Document entries for each uploaded document
          // Auto-verify business documents when uploaded to Cloudinary
          if (data.documents.registrationCertificate) {
            const existingDoc = await Document.findOne({
              userId: data.userId,
              type: 'company_registration',
            });
            if (!existingDoc) {
              await Document.create({
                documentId: generateUserId('DOC'),
                userId: data.userId,
                companyId: company.companyId,
                type: 'company_registration',
                status: 'verified', // Auto-verify when uploaded
                url: data.documents.registrationCertificate,
                verificationData: {
                  verified: true,
                  verifiedAt: new Date(),
                  verifiedBy: 'system',
                },
              });
              logger.info(`✅ Created and auto-verified Document entry for company_registration: ${company.companyId}`);
            }
          }
          if (data.documents.gstCertificate) {
            const existingDoc = await Document.findOne({
              userId: data.userId,
              type: 'gst_certificate',
            });
            if (!existingDoc) {
              await Document.create({
                documentId: generateUserId('DOC'),
                userId: data.userId,
                companyId: company.companyId,
                type: 'gst_certificate',
                status: 'verified', // Auto-verify when uploaded
                url: data.documents.gstCertificate,
                verificationData: {
                  verified: true,
                  verifiedAt: new Date(),
                  verifiedBy: 'system',
                },
              });
              logger.info(`✅ Created and auto-verified Document entry for gst_certificate: ${company.companyId}`);
            }
          }
          if (data.documents.businessLicense) {
            const existingDoc = await Document.findOne({
              userId: data.userId,
              type: 'business_license',
            });
            if (!existingDoc) {
              await Document.create({
                documentId: generateUserId('DOC'),
                userId: data.userId,
                companyId: company.companyId,
                type: 'business_license',
                status: 'verified', // Auto-verify when uploaded
                url: data.documents.businessLicense,
                verificationData: {
                  verified: true,
                  verifiedAt: new Date(),
                  verifiedBy: 'system',
                },
              });
              logger.info(`✅ Created and auto-verified Document entry for business_license: ${company.companyId}`);
            }
          }

          // Check and update user verification status after creating documents
          try {
            const userService = (await import('./user.service')).userService;
            await userService.checkAndUpdateVerificationStatus(data.userId);
          } catch (error) {
            logger.warn('Failed to update user verification status after document creation:', error);
          }
        } catch (error) {
          logger.warn('Failed to create Document entries for company documents:', error);
          // Don't fail registration if document sync fails
        }
      }

      return company.toJSON();
    } catch (error) {
      logger.error('Error registering company:', error);
      throw error;
    }
  }

  /**
   * Get company profile
   */
  async getCompanyProfile(companyId: string): Promise<any> {
    try {
      const company = await Company.findOne({ companyId });
      if (!company) {
        throw new NotFoundError('Company not found');
      }
      return company.toJSON();
    } catch (error) {
      logger.error('Error getting company profile:', error);
      throw error;
    }
  }

  /**
   * Get company by userId
   */
  async getCompanyByUserId(userId: string): Promise<any> {
    try {
      const company = await Company.findOne({ userId });
      if (!company) {
        throw new NotFoundError('Company not found');
      }
      return company.toJSON();
    } catch (error) {
      logger.error('Error getting company by userId:', error);
      throw error;
    }
  }

  /**
   * Update company profile
   */
  async updateCompanyProfile(
    companyId: string,
    data: {
      companyName?: string;
      businessType?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      contactNumber?: string;
      email?: string;
      gstNumber?: string;
    }
  ): Promise<any> {
    try {
      const company = await Company.findOne({ companyId });
      if (!company) {
        throw new NotFoundError('Company not found');
      }

      // Update fields
      if (data.companyName !== undefined) company.companyName = data.companyName;
      if (data.businessType !== undefined) company.businessType = data.businessType;
      if (data.address !== undefined) company.address = data.address;
      if (data.city !== undefined) company.city = data.city;
      if (data.state !== undefined) company.state = data.state;
      if (data.pincode !== undefined) company.pincode = data.pincode;
      if (data.contactNumber !== undefined) company.contactNumber = data.contactNumber;
      if (data.email !== undefined) {
        // Check if email is already taken
        const existingCompany = await Company.findOne({
          email: data.email.toLowerCase(),
          companyId: { $ne: companyId },
        });
        if (existingCompany) {
          throw new ConflictError('Email already in use');
        }
        company.email = data.email.toLowerCase();
      }
      if (data.gstNumber !== undefined) company.gstNumber = data.gstNumber.toUpperCase();

      await company.save();

      logger.info(`Company profile updated: ${companyId}`);

      return company.toJSON();
    } catch (error) {
      logger.error('Error updating company profile:', error);
      throw error;
    }
  }

  /**
   * Upload company logo
   */
  async uploadCompanyLogo(companyId: string, file: Buffer, _mimeType: string): Promise<any> {
    try {
      const company = await Company.findOne({ companyId });
      if (!company) {
        throw new NotFoundError('Company not found');
      }

      // Upload logo using uploadFromBuffer for Buffer type
      const { uploadFromBuffer } = await import('../config/cloudinary');
      const uploadResult: any = await uploadFromBuffer(
        file,
        'companies/logo',
        {
          public_id: `company_${companyId}_${Date.now()}`,
        }
      );

      // Note: Company model doesn't have logo field, but we can add it to documents or create a separate field
      // For now, we'll store it in a way that can be accessed
      // You may need to update the Company model to include a logo field

      logger.info(`Company logo uploaded: ${companyId}`);

      return {
        logo: uploadResult.secure_url,
      };
    } catch (error) {
      logger.error('Error uploading company logo:', error);
      throw error;
    }
  }

  /**
   * Get company dashboard data
   */
  async getCompanyDashboard(companyId: string): Promise<any> {
    try {
      const company = await Company.findOne({ companyId });
      if (!company) {
        throw new NotFoundError('Company not found');
      }

      return {
        company: company.toJSON(),
        stats: {
          totalVehicles: company.totalVehicles,
          totalBookings: company.totalBookings,
          totalEarnings: company.totalEarnings,
          averageRating: company.averageRating,
        },
      };
    } catch (error) {
      logger.error('Error getting company dashboard:', error);
      throw error;
    }
  }

  /**
   * Get company statistics
   */
  async getCompanyStats(companyId: string): Promise<any> {
    try {
      const company = await Company.findOne({ companyId });
      if (!company) {
        throw new NotFoundError('Company not found');
      }

      // Get real-time stats from bookings and offers
      const RentalOffer = (await import('../models/RentalOffer')).default;
      const Booking = (await import('../models/Booking')).default;
      const Vehicle = (await import('../models/Vehicle')).default;

      // Count active offers
      const activeOffers = await RentalOffer.countDocuments({
        ownerId: company.userId,
        ownerType: 'company',
        status: { $in: ['active', 'pending'] },
      });

      // Count bookings by status
      const bookingsStats = await Booking.aggregate([
        {
          $match: {
            serviceType: 'rental',
            'owner.userId': company.userId,
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const bookingsByStatus: any = {};
      bookingsStats.forEach((stat: any) => {
        bookingsByStatus[stat._id] = stat.count;
      });

      // Calculate total earnings from completed bookings
      const earningsData = await Booking.aggregate([
        {
          $match: {
            serviceType: 'rental',
            'owner.userId': company.userId,
            status: 'completed',
            paymentStatus: 'paid',
          },
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: { $subtract: ['$amount', '$platformFee'] } },
            totalRevenue: { $sum: '$amount' },
            totalBookings: { $sum: 1 },
          },
        },
      ]);

      const earnings = earningsData[0] || {
        totalEarnings: 0,
        totalRevenue: 0,
        totalBookings: 0,
      };

      // Count vehicles
      const totalVehicles = await Vehicle.countDocuments({
        companyId: company.companyId,
        status: { $ne: 'inactive' },
      });

      return {
        totalVehicles,
        activeOffers,
        totalBookings: earnings.totalBookings,
        bookingsByStatus,
        totalEarnings: earnings.totalEarnings,
        totalRevenue: earnings.totalRevenue,
        averageRating: company.averageRating,
        pendingSettlements: earnings.totalEarnings - company.totalEarnings, // Difference indicates pending
      };
    } catch (error) {
      logger.error('Error getting company stats:', error);
      throw error;
    }
  }

  /**
   * Get company earnings breakdown
   */
  async getCompanyEarnings(companyId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: 'pending' | 'settled';
  }): Promise<any> {
    try {
      const company = await Company.findOne({ companyId });
      if (!company) {
        throw new NotFoundError('Company not found');
      }

      const Booking = (await import('../models/Booking')).default;

      const query: any = {
        serviceType: 'rental',
        'owner.userId': company.userId,
      };

      if (filters?.startDate || filters?.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.createdAt.$lte = filters.endDate;
        }
      }

      if (filters?.status === 'settled') {
        query.settlementStatus = 'settled';
      } else if (filters?.status === 'pending') {
        query.settlementStatus = { $ne: 'settled' };
      }

      const bookings = await Booking.find(query)
        .sort({ createdAt: -1 })
        .lean();

      const earnings = bookings.map((booking: any) => ({
        bookingId: booking.bookingId,
        bookingNumber: booking.bookingNumber,
        renter: booking.userId ? {
          userId: booking.userId,
          name: booking.renter?.name || 'Unknown',
        } : null,
        vehicle: booking.vehicle,
        date: booking.date,
        amount: booking.amount,
        platformFee: booking.platformFee,
        earnings: booking.amount - booking.platformFee,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        settlementStatus: booking.settlementStatus || 'pending',
        createdAt: booking.createdAt,
      }));

      const totalEarnings = earnings.reduce((sum, e) => sum + e.earnings, 0);
      const totalRevenue = earnings.reduce((sum, e) => sum + e.amount, 0);
      const totalPlatformFee = earnings.reduce((sum, e) => sum + e.platformFee, 0);

      return {
        earnings,
        summary: {
          totalEarnings,
          totalRevenue,
          totalPlatformFee,
          totalBookings: earnings.length,
        },
      };
    } catch (error) {
      logger.error('Error getting company earnings:', error);
      throw error;
    }
  }

  /**
   * Get company bookings
   */
  async getCompanyBookings(companyId: string, filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ bookings: any[]; total: number; page: number; limit: number }> {
    try {
      const company = await Company.findOne({ companyId });
      if (!company) {
        throw new NotFoundError('Company not found');
      }

      const Booking = (await import('../models/Booking')).default;
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = {
        serviceType: 'rental',
        'owner.userId': company.userId,
      };

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.startDate || filters?.endDate) {
        query.date = {};
        if (filters.startDate) {
          query.date.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.date.$lte = filters.endDate;
        }
      }

      const total = await Booking.countDocuments(query);
      const bookings = await Booking.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Populate renter information
      const User = (await import('../models/User')).default;
      const bookingsWithRenter = await Promise.all(
        bookings.map(async (booking: any) => {
          if (booking.userId) {
            try {
              const user = await User.findOne({ userId: booking.userId })
                .select('userId name profilePhoto rating totalReviews')
                .lean();
              if (user) {
                booking.renter = {
                  userId: user.userId,
                  name: user.name,
                  photo: user.profilePhoto,
                  rating: user.rating,
                  totalReviews: user.totalReviews,
                };
              }
            } catch (error) {
              logger.warn(`Failed to fetch renter for booking ${booking.bookingId}:`, error);
            }
          }
          return booking;
        })
      );

      return {
        bookings: bookingsWithRenter,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting company bookings:', error);
      throw error;
    }
  }
}

export const companyService = new CompanyService();
export default companyService;
