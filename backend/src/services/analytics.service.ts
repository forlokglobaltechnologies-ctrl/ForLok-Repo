import User from '../models/User';
import Booking from '../models/Booking';
import PoolingOffer from '../models/PoolingOffer';
import RentalOffer from '../models/RentalOffer';
import Payment from '../models/Payment';
import Refund from '../models/Refund';
import Rating from '../models/Rating';
import Withdrawal from '../models/Withdrawal';
import logger from '../utils/logger';


interface LeaderboardEntry {
  userId: string;
  name: string;
  photo?: string;
  value: number;
}

class AnalyticsService {
  /**
   * Get real-time statistics
   */
  async getRealTimeStats(): Promise<{
    activeTrips: number;
    onlineDrivers: number;
    pendingBookings: number;
    todayRevenue: number;
    todayTrips: number;
    activeOffers: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        activeTrips,
        pendingBookings,
        todayPayments,
        todayCompletedTrips,
        activePoolingOffers,
        activeRentalOffers,
      ] = await Promise.all([
        Booking.countDocuments({ status: 'in_progress' }),
        Booking.countDocuments({ status: 'pending' }),
        Payment.aggregate([
          { $match: { status: 'paid', createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Booking.countDocuments({ status: 'completed', tripCompletedAt: { $gte: today } }),
        PoolingOffer.countDocuments({ status: { $in: ['active', 'booked'] } }),
        RentalOffer.countDocuments({ status: { $in: ['active', 'booked'] } }),
      ]);

      return {
        activeTrips,
        onlineDrivers: 0, // Would need WebSocket tracking
        pendingBookings,
        todayRevenue: todayPayments[0]?.total || 0,
        todayTrips: todayCompletedTrips,
        activeOffers: activePoolingOffers + activeRentalOffers,
      };
    } catch (error) {
      logger.error('Error getting real-time stats:', error);
      throw error;
    }
  }

  /**
   * Get statistics for today
   */
  async getTodayStats(): Promise<{
    users: { total: number; new: number; growth: number };
    trips: { total: number; completed: number; cancelled: number; growth: number };
    revenue: { total: number; platform: number; growth: number };
    offers: { pooling: number; rental: number };
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const [
        totalUsers,
        newUsersToday,
        newUsersYesterday,
        tripsToday,
        completedTripsToday,
        cancelledTripsToday,
        tripsYesterday,
        revenueToday,
        revenueYesterday,
        poolingOffers,
        rentalOffers,
      ] = await Promise.all([
        User.countDocuments({ isActive: true }),
        User.countDocuments({ createdAt: { $gte: today } }),
        User.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),
        Booking.countDocuments({ createdAt: { $gte: today } }),
        Booking.countDocuments({ status: 'completed', tripCompletedAt: { $gte: today } }),
        Booking.countDocuments({ status: 'cancelled', cancelledAt: { $gte: today } }),
        Booking.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),
        Payment.aggregate([
          { $match: { status: 'paid', createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' }, platform: { $sum: '$platformFee' } } },
        ]),
        Payment.aggregate([
          { $match: { status: 'paid', createdAt: { $gte: yesterday, $lt: today } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        PoolingOffer.countDocuments({ status: { $in: ['active', 'booked'] } }),
        RentalOffer.countDocuments({ status: { $in: ['active', 'booked'] } }),
      ]);

      const todayRevenueTotal = revenueToday[0]?.total || 0;
      const yesterdayRevenueTotal = revenueYesterday[0]?.total || 0;

      return {
        users: {
          total: totalUsers,
          new: newUsersToday,
          growth: newUsersYesterday > 0 
            ? Math.round(((newUsersToday - newUsersYesterday) / newUsersYesterday) * 100) 
            : 100,
        },
        trips: {
          total: tripsToday,
          completed: completedTripsToday,
          cancelled: cancelledTripsToday,
          growth: tripsYesterday > 0 
            ? Math.round(((tripsToday - tripsYesterday) / tripsYesterday) * 100) 
            : 100,
        },
        revenue: {
          total: todayRevenueTotal,
          platform: revenueToday[0]?.platform || 0,
          growth: yesterdayRevenueTotal > 0 
            ? Math.round(((todayRevenueTotal - yesterdayRevenueTotal) / yesterdayRevenueTotal) * 100) 
            : 100,
        },
        offers: {
          pooling: poolingOffers,
          rental: rentalOffers,
        },
      };
    } catch (error) {
      logger.error('Error getting today stats:', error);
      throw error;
    }
  }

  /**
   * Get trend data for charts
   */
  async getTrendData(period: 'week' | 'month'): Promise<{
    labels: string[];
    trips: number[];
    revenue: number[];
    users: number[];
  }> {
    try {
      const days = period === 'week' ? 7 : 30;
      const labels: string[] = [];
      const trips: number[] = [];
      const revenue: number[] = [];
      const users: number[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const [dayTrips, dayRevenue, dayUsers] = await Promise.all([
          Booking.countDocuments({
            status: 'completed',
            tripCompletedAt: { $gte: date, $lt: nextDate },
          }),
          Payment.aggregate([
            { $match: { status: 'paid', createdAt: { $gte: date, $lt: nextDate } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
          ]),
          User.countDocuments({ createdAt: { $gte: date, $lt: nextDate } }),
        ]);

        labels.push(date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }));
        trips.push(dayTrips);
        revenue.push(dayRevenue[0]?.total || 0);
        users.push(dayUsers);
      }

      return { labels, trips, revenue, users };
    } catch (error) {
      logger.error('Error getting trend data:', error);
      throw error;
    }
  }

  /**
   * Get top earning drivers
   */
  async getTopEarners(limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const users = await User.find({ totalEarnings: { $gt: 0 } })
        .sort({ totalEarnings: -1 })
        .limit(limit)
        .select('userId name profilePhoto totalEarnings');

      return users.map((u) => ({
        userId: u.userId,
        name: u.name,
        photo: u.profilePhoto,
        value: u.totalEarnings,
      }));
    } catch (error) {
      logger.error('Error getting top earners:', error);
      throw error;
    }
  }

  /**
   * Get most active users (by trips)
   */
  async getMostActiveUsers(limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const users = await User.find({ totalTrips: { $gt: 0 } })
        .sort({ totalTrips: -1 })
        .limit(limit)
        .select('userId name profilePhoto totalTrips');

      return users.map((u) => ({
        userId: u.userId,
        name: u.name,
        photo: u.profilePhoto,
        value: u.totalTrips,
      }));
    } catch (error) {
      logger.error('Error getting most active users:', error);
      throw error;
    }
  }

  /**
   * Get highest rated drivers
   */
  async getHighestRatedDrivers(limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const users = await User.find({ rating: { $gt: 0 }, totalReviews: { $gte: 5 } })
        .sort({ rating: -1, totalReviews: -1 })
        .limit(limit)
        .select('userId name profilePhoto rating totalReviews');

      return users.map((u) => ({
        userId: u.userId,
        name: u.name,
        photo: u.profilePhoto,
        value: u.rating,
      }));
    } catch (error) {
      logger.error('Error getting highest rated drivers:', error);
      throw error;
    }
  }

  /**
   * Get pooling specific statistics
   */
  async getPoolingStats(): Promise<{
    totalTrips: number;
    avgPassengersPerTrip: number;
    seatOccupancyRate: number;
    popularRoutes: Array<{ from: string; to: string; count: number }>;
    peakHours: Array<{ hour: number; count: number }>;
    avgRating: number;
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Total pooling trips
      const totalTrips = await Booking.countDocuments({
        serviceType: 'pooling',
        status: 'completed',
        tripCompletedAt: { $gte: thirtyDaysAgo },
      });

      // Average passengers per trip
      const passengersAggregation = await PoolingOffer.aggregate([
        { $match: { status: 'completed', updatedAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: null,
            avgPassengers: { $avg: { $size: '$passengers' } },
            totalSeats: { $sum: '$totalSeats' },
            filledSeats: { $sum: { $size: '$passengers' } },
          },
        },
      ]);

      // Popular routes
      const popularRoutes = await Booking.aggregate([
        { $match: { serviceType: 'pooling', status: 'completed' } },
        {
          $group: {
            _id: { from: '$route.from.city', to: '$route.to.city' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]);

      // Peak hours
      const peakHoursAggregation = await Booking.aggregate([
        { $match: { serviceType: 'pooling', status: 'completed' } },
        {
          $project: {
            hour: { $hour: '$tripStartedAt' },
          },
        },
        {
          $group: {
            _id: '$hour',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Average rating for pooling
      const ratingAggregation = await Rating.aggregate([
        { $match: { serviceType: 'pooling', isVisible: true } },
        { $group: { _id: null, avgRating: { $avg: '$overallRating' } } },
      ]);

      const passengersData = passengersAggregation[0] || { avgPassengers: 0, totalSeats: 0, filledSeats: 0 };

      return {
        totalTrips,
        avgPassengersPerTrip: parseFloat((passengersData.avgPassengers || 0).toFixed(2)),
        seatOccupancyRate: passengersData.totalSeats > 0
          ? parseFloat(((passengersData.filledSeats / passengersData.totalSeats) * 100).toFixed(1))
          : 0,
        popularRoutes: popularRoutes.map((r) => ({
          from: r._id.from || 'Unknown',
          to: r._id.to || 'Unknown',
          count: r.count,
        })),
        peakHours: peakHoursAggregation.map((h) => ({
          hour: h._id,
          count: h.count,
        })),
        avgRating: ratingAggregation[0]?.avgRating || 0,
      };
    } catch (error) {
      logger.error('Error getting pooling stats:', error);
      throw error;
    }
  }

  /**
   * Get financial summary
   */
  async getFinancialSummary(period: 'week' | 'month' | 'year'): Promise<{
    totalRevenue: number;
    platformEarnings: number;
    pendingSettlements: number;
    totalRefunds: number;
    pendingWithdrawals: number;
    breakdown: {
      pooling: number;
      rental: number;
    };
  }> {
    try {
      const startDate = new Date();
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const [
        revenueData,
        poolingRevenue,
        rentalRevenue,
        refundTotal,
        pendingWithdrawals,
        pendingSettlements,
      ] = await Promise.all([
        Payment.aggregate([
          { $match: { status: 'paid', createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' }, platform: { $sum: '$platformFee' } } },
        ]),
        Booking.aggregate([
          { $match: { serviceType: 'pooling', paymentStatus: 'paid', createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Booking.aggregate([
          { $match: { serviceType: 'rental', paymentStatus: 'paid', createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Refund.aggregate([
          { $match: { status: 'completed', createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$refundAmount' } } },
        ]),
        Withdrawal.aggregate([
          { $match: { status: 'pending' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Withdrawal.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      return {
        totalRevenue: revenueData[0]?.total || 0,
        platformEarnings: revenueData[0]?.platform || 0,
        pendingSettlements: pendingSettlements[0]?.total || 0,
        totalRefunds: refundTotal[0]?.total || 0,
        pendingWithdrawals: pendingWithdrawals[0]?.total || 0,
        breakdown: {
          pooling: poolingRevenue[0]?.total || 0,
          rental: rentalRevenue[0]?.total || 0,
        },
      };
    } catch (error) {
      logger.error('Error getting financial summary:', error);
      throw error;
    }
  }

  /**
   * Get user growth statistics
   */
  async getUserGrowthStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    newThisMonth: number;
    growthRate: number;
    byType: { individual: number; company: number };
  }> {
    try {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const lastMonth = new Date(thisMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const [
        totalUsers,
        activeUsers,
        verifiedUsers,
        newThisMonth,
        newLastMonth,
        individualCount,
        companyCount,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ isVerified: true }),
        User.countDocuments({ createdAt: { $gte: thisMonth } }),
        User.countDocuments({ createdAt: { $gte: lastMonth, $lt: thisMonth } }),
        User.countDocuments({ userType: 'individual' }),
        User.countDocuments({ userType: 'company' }),
      ]);

      const growthRate = newLastMonth > 0 
        ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100) 
        : 100;

      return {
        totalUsers,
        activeUsers,
        verifiedUsers,
        newThisMonth,
        growthRate,
        byType: {
          individual: individualCount,
          company: companyCount,
        },
      };
    } catch (error) {
      logger.error('Error getting user growth stats:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
