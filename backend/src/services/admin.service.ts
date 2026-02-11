import User from '../models/User';
import Company from '../models/Company';
import PoolingOffer from '../models/PoolingOffer';
import RentalOffer from '../models/RentalOffer';
import Booking from '../models/Booking';
import Payment from '../models/Payment';
import Feedback from '../models/Feedback';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import { OfferStatus, BookingStatus } from '../types';

class AdminService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<any> {
    try {
      const [
        totalUsers,
        activeUsers,
        totalCompanies,
        totalBookings,
        todayBookings,
        totalRevenue,
        todayRevenue,
        pendingBookings,
        completedBookings,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        Company.countDocuments(),
        Booking.countDocuments(),
        Booking.countDocuments({
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        }),
        Payment.aggregate([
          { $match: { status: 'paid' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Payment.aggregate([
          {
            $match: {
              status: 'paid',
              createdAt: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0)),
              },
            },
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Booking.countDocuments({ status: 'pending' }),
        Booking.countDocuments({ status: 'completed' }),
      ]);

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
        },
        companies: {
          total: totalCompanies,
        },
        bookings: {
          total: totalBookings,
          today: todayBookings,
          pending: pendingBookings,
          completed: completedBookings,
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          today: todayRevenue[0]?.total || 0,
        },
      };
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get all users (admin)
   */
  async getAllUsers(filters?: {
    status?: string;
    userType?: string;
    verified?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ users: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = {};
      if (filters?.status === 'active') query.isActive = true;
      if (filters?.status === 'inactive') query.isActive = false;
      if (filters?.userType) query.userType = filters.userType;
      if (filters?.verified !== undefined) query.isVerified = filters.verified;

      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        users: users.map((u) => u.toJSON()),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Get user details (admin)
   */
  async getUserDetails(userId: string): Promise<any> {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Get user statistics
      const bookings = await Booking.countDocuments({ userId: user.userId });
      const payments = await Payment.aggregate([
        { $match: { userId: user.userId, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]);

      return {
        user: user.toJSON(),
        stats: {
          totalBookings: bookings,
          totalSpent: payments[0]?.total || 0,
        },
      };
    } catch (error) {
      logger.error('Error getting user details:', error);
      throw error;
    }
  }

  /**
   * Verify user (admin)
   */
  async verifyUser(userId: string): Promise<any> {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.isVerified = true;
      await user.save();

      logger.info(`User verified by admin: ${userId}`);

      return user.toJSON();
    } catch (error) {
      logger.error('Error verifying user:', error);
      throw error;
    }
  }

  /**
   * Suspend user (admin)
   */
  async suspendUser(userId: string): Promise<any> {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.isActive = false;
      await user.save();

      logger.info(`User suspended by admin: ${userId}`);

      return user.toJSON();
    } catch (error) {
      logger.error('Error suspending user:', error);
      throw error;
    }
  }

  /**
   * Activate user (admin)
   */
  async activateUser(userId: string): Promise<any> {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      user.isActive = true;
      await user.save();

      logger.info(`User activated by admin: ${userId}`);

      return user.toJSON();
    } catch (error) {
      logger.error('Error activating user:', error);
      throw error;
    }
  }

  /**
   * Get all pooling offers (admin)
   */
  async getAllPoolingOffers(filters?: {
    status?: OfferStatus;
    page?: number;
    limit?: number;
  }): Promise<{ offers: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = {};
      if (filters?.status) query.status = filters.status;

      const total = await PoolingOffer.countDocuments(query);
      const offers = await PoolingOffer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        offers: offers.map((o) => o.toJSON()),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting all pooling offers:', error);
      throw error;
    }
  }

  /**
   * Approve pooling offer (admin)
   */
  async approvePoolingOffer(offerId: string): Promise<any> {
    try {
      const offer = await PoolingOffer.findOne({ offerId });
      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      offer.status = 'active';
      await offer.save();

      logger.info(`Pooling offer approved: ${offerId}`);

      return offer.toJSON();
    } catch (error) {
      logger.error('Error approving pooling offer:', error);
      throw error;
    }
  }

  /**
   * Suspend pooling offer (admin)
   */
  async suspendPoolingOffer(offerId: string): Promise<any> {
    try {
      const offer = await PoolingOffer.findOne({ offerId });
      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      offer.status = 'suspended';
      await offer.save();

      logger.info(`Pooling offer suspended: ${offerId}`);

      return offer.toJSON();
    } catch (error) {
      logger.error('Error suspending pooling offer:', error);
      throw error;
    }
  }

  /**
   * Get all rental offers (admin)
   */
  async getAllRentalOffers(filters?: {
    status?: OfferStatus;
    page?: number;
    limit?: number;
  }): Promise<{ offers: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = {};
      if (filters?.status) query.status = filters.status;

      const total = await RentalOffer.countDocuments(query);
      const offers = await RentalOffer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        offers: offers.map((o) => o.toJSON()),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting all rental offers:', error);
      throw error;
    }
  }

  /**
   * Approve rental offer (admin)
   */
  async approveRentalOffer(offerId: string): Promise<any> {
    try {
      const offer = await RentalOffer.findOne({ offerId });
      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      offer.status = 'active';
      await offer.save();

      logger.info(`Rental offer approved: ${offerId}`);

      return offer.toJSON();
    } catch (error) {
      logger.error('Error approving rental offer:', error);
      throw error;
    }
  }

  /**
   * Suspend rental offer (admin)
   */
  async suspendRentalOffer(offerId: string): Promise<any> {
    try {
      const offer = await RentalOffer.findOne({ offerId });
      if (!offer) {
        throw new NotFoundError('Offer not found');
      }

      offer.status = 'suspended';
      await offer.save();

      logger.info(`Rental offer suspended: ${offerId}`);

      return offer.toJSON();
    } catch (error) {
      logger.error('Error suspending rental offer:', error);
      throw error;
    }
  }

  /**
   * Get all bookings (admin)
   */
  async getAllBookings(filters?: {
    status?: BookingStatus;
    serviceType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ bookings: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = {};
      if (filters?.status) query.status = filters.status;
      if (filters?.serviceType) query.serviceType = filters.serviceType;

      const total = await Booking.countDocuments(query);
      const bookings = await Booking.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        bookings: bookings.map((b) => b.toJSON()),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting all bookings:', error);
      throw error;
    }
  }

  /**
   * Get all feedback (admin)
   */
  async getAllFeedback(filters?: {
    status?: string;
    type?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<{ feedback: any[]; total: number; page: number; limit: number }> {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const query: any = {};
      if (filters?.status) query.status = filters.status;
      if (filters?.type) query.type = filters.type;
      if (filters?.priority) query.priority = filters.priority;

      const total = await Feedback.countDocuments(query);
      const feedback = await Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        feedback: feedback.map((f) => f.toJSON()),
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error getting all feedback:', error);
      throw error;
    }
  }

  /**
   * Resolve feedback (admin)
   */
  async resolveFeedback(feedbackId: string, adminId: string, response?: string): Promise<any> {
    try {
      const feedback = await Feedback.findOne({ feedbackId });
      if (!feedback) {
        throw new NotFoundError('Feedback not found');
      }

      feedback.status = 'resolved';
      if (response) {
        feedback.adminResponse = response;
      }
      feedback.respondedBy = adminId;
      feedback.respondedAt = new Date();
      await feedback.save();

      logger.info(`Feedback resolved: ${feedbackId}`);

      return feedback.toJSON();
    } catch (error) {
      logger.error('Error resolving feedback:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();
export default adminService;
