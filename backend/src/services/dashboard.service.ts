import User from '../models/User';
import Booking from '../models/Booking';
import PoolingOffer from '../models/PoolingOffer';
import RentalOffer from '../models/RentalOffer';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import { walletService } from './wallet.service';
import { coinService } from './coin.service';

class DashboardService {
  /**
   * Get dashboard statistics for a user
   */
  async getDashboardStats(userId: string): Promise<any> {
    try {
      // Run ALL queries in parallel for maximum speed
      const userFilter = { $or: [{ userId }, { 'driver.userId': userId }, { 'owner.userId': userId }] };

      const [
        user,
        walletSummary,
        coinBalance,
        totalBookings,
        activeBookings,
        completedBookings,
        totalOffers,
        totalRentalOffers,
        activeOffers,
        recentBookings,
        upcomingTrips,
      ] = await Promise.all([
        User.findOne({ userId }),
        walletService.getWalletSummary(userId),
        coinService.getBalance(userId),
        Booking.countDocuments(userFilter),
        Booking.countDocuments({ ...userFilter, status: { $in: ['pending', 'confirmed', 'in_progress'] } }),
        Booking.countDocuments({ ...userFilter, status: 'completed' }),
        PoolingOffer.countDocuments({ driverId: userId }),
        RentalOffer.countDocuments({ ownerId: userId }),
        PoolingOffer.countDocuments({ driverId: userId, status: { $in: ['active', 'pending', 'booked'] } }),
        Booking.find(userFilter).sort({ createdAt: -1 }).limit(5),
        Booking.find({ ...userFilter, status: { $in: ['pending', 'confirmed'] }, date: { $gte: new Date() } }).sort({ date: 1 }).limit(5),
      ]);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return {
        user: {
          name: user.name,
          gender: user.gender,
          rating: user.rating,
          totalTrips: user.totalTrips,
          totalEarnings: user.totalEarnings,
          totalSpent: user.totalSpent,
        },
        financial: {
          walletBalance: parseFloat(walletSummary.balance.toFixed(2)),
          canBookRide: walletSummary.canBookRide,
          canGiveRide: walletSummary.canGiveRide,
          minimumRequired: walletSummary.minimumRequired,
          minimumForDriver: walletSummary.minimumForDriver,
        },
        bookings: {
          total: totalBookings,
          active: activeBookings,
          completed: completedBookings,
        },
        offers: {
          total: totalOffers + totalRentalOffers,
          active: activeOffers,
        },
        coins: {
          balance: coinBalance.balance,
          totalEarned: coinBalance.totalEarned,
          worthInRupees: coinBalance.worthInRupees,
        },
        recentBookings: recentBookings.map((b) => b.toJSON()),
        upcomingTrips: upcomingTrips.map((b) => b.toJSON()),
      };
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get user's financial summary
   */
  async getFinancialSummary(userId: string): Promise<any> {
    try {
      const user = await User.findOne({ userId });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Get all completed bookings where user is driver
      const driverBookings = await Booking.find({
        'driver.userId': userId,
        status: 'completed',
      });

      // Get all completed bookings where user is owner
      const ownerBookings = await Booking.find({
        'owner.userId': userId,
        status: 'completed',
      });

      const allDriverBookings = [...driverBookings, ...ownerBookings];

      // Calculate total earnings
      const totalEarnings = allDriverBookings.reduce(
        (sum, booking) => sum + (booking.amount || 0),
        0
      );

      // Calculate total platform fees
      const totalPlatformFees = allDriverBookings.reduce(
        (sum, booking) => sum + (booking.platformFee || 0),
        0
      );

      // Get wallet balance
      const wallet = await walletService.getWalletSummary(userId);

      return {
        walletBalance: parseFloat(wallet.balance.toFixed(2)),
        canBookRide: wallet.canBookRide,
        canGiveRide: wallet.canGiveRide,
        minimumRequired: wallet.minimumRequired,
        minimumForDriver: wallet.minimumForDriver,
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        totalPlatformFees: parseFloat(totalPlatformFees.toFixed(2)),
        cancellationCount: user.cancellationCount || 0,
      };
    } catch (error) {
      logger.error('Error getting financial summary:', error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
