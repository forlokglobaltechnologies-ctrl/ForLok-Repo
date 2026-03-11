import User from '../models/User';
import Booking from '../models/Booking';
import PoolingOffer from '../models/PoolingOffer';
import RentalOffer from '../models/RentalOffer';
import SavedPlace from '../models/SavedPlace';
import Document from '../models/Document';
import ReferralCode from '../models/ReferralCode';
import { NotFoundError } from '../utils/errors';
import logger from '../utils/logger';
import { walletService } from './wallet.service';
import { coinService } from './coin.service';
import { calculateDistance } from '../utils/helpers';

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

  async getAboutStats(): Promise<any> {
    try {
      const [totalUsers, totalRides, ratingStats] = await Promise.all([
        User.countDocuments({}),
        Booking.countDocuments({ status: 'completed' }),
        User.aggregate([
          { $match: { rating: { $gt: 0 } } },
          {
            $group: {
              _id: null,
              averageRating: { $avg: '$rating' },
            },
          },
        ]),
      ]);

      return {
        totalUsers,
        totalRides,
        averageRating: ratingStats.length > 0 ? parseFloat((ratingStats[0].averageRating || 0).toFixed(1)) : 0,
      };
    } catch (error) {
      logger.error('Error getting about stats:', error);
      throw error;
    }
  }

  /**
   * Get all data needed for the home screen in a single call
   */
  async getHomeScreenData(
    userId: string,
    lat?: number,
    lng?: number
  ): Promise<any> {
    try {
      const userFilter = {
        $or: [{ userId }, { 'driver.userId': userId }, { 'owner.userId': userId }],
      };

      const now = new Date();

      const [
        user,
        walletSummary,
        coinBalance,
        completedBookings,
        activeRide,
        savedPlaces,
        nearbyOffers,
        completedDistances,
        referralCode,
        verifiedDocs,
      ] = await Promise.all([
        User.findOne({ userId }),
        walletService.getWalletSummary(userId),
        coinService.getBalance(userId),
        Booking.countDocuments({ ...userFilter, status: 'completed' }),
        Booking.findOne({
          $or: [{ userId }, { 'driver.userId': userId }],
          status: { $in: ['confirmed', 'in_progress'] },
        }).sort({ createdAt: -1 }),
        SavedPlace.find({ userId }).sort({ label: 1, usageCount: -1 }).limit(12),
        PoolingOffer.find({
          status: { $in: ['active', 'pending'] },
          driverId: { $ne: userId },
          date: { $gte: now },
          availableSeats: { $gt: 0 },
        })
          .sort({ date: 1 })
          .limit(20)
          .lean(),
        Booking.find({ ...userFilter, status: 'completed' })
          .select('route.distance')
          .lean(),
        ReferralCode.findOne({ userId }).lean(),
        Document.find({ userId, status: 'verified' }).select('type').lean(),
      ]);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Filter nearby offers by distance if location provided
      let filteredNearby = nearbyOffers;
      if (lat && lng) {
        filteredNearby = nearbyOffers
          .map((offer: any) => {
            const dist = calculateDistance(
              lat,
              lng,
              offer.route?.from?.lat,
              offer.route?.from?.lng
            );
            return { ...offer, distanceFromUser: Math.round(dist * 10) / 10 };
          })
          .filter((o: any) => o.distanceFromUser <= 30)
          .sort((a: any, b: any) => a.distanceFromUser - b.distanceFromUser)
          .slice(0, 6);
      } else {
        filteredNearby = nearbyOffers.slice(0, 6);
      }

      // Calculate green impact — use real distances from completed bookings
      // Fallback: if no distance data, estimate 15km avg per ride
      const rawDistanceKm = completedDistances.reduce(
        (sum: number, b: any) => sum + (b.route?.distance || 0),
        0
      );
      const ridesCount = Math.max(completedBookings, user.totalTrips || 0);
      const totalDistanceKm = rawDistanceKm > 0 ? rawDistanceKm : ridesCount * 15;
      // Average car emits ~0.12 kg CO2 per km; carpooling saves roughly that per passenger
      const co2SavedKg = Math.round(totalDistanceKm * 0.12 * 10) / 10;

      const ecoLevel =
        ridesCount >= 50
          ? 'Eco Champion'
          : ridesCount >= 20
          ? 'Green Warrior'
          : ridesCount >= 10
          ? 'Earth Friend'
          : ridesCount >= 5
          ? 'Eco Starter'
          : 'Newcomer';

      // Verification badges
      const verifiedTypes = verifiedDocs.map((d: any) => d.type);

      return {
        user: {
          name: user.name,
          gender: user.gender,
          rating: user.rating,
          totalTrips: user.totalTrips,
          profilePhoto: user.profilePhoto,
          isVerified: user.isVerified,
          badges: user.badges || [],
        },
        financial: {
          walletBalance: parseFloat(walletSummary.balance.toFixed(2)),
        },
        coins: {
          balance: coinBalance.balance,
          totalEarned: coinBalance.totalEarned,
          worthInRupees: coinBalance.worthInRupees,
        },
        activeRide: activeRide
          ? {
              bookingId: activeRide.bookingId,
              status: activeRide.status,
              serviceType: activeRide.serviceType,
              route: activeRide.route,
              date: activeRide.date,
              driver: activeRide.driver,
              vehicle: activeRide.vehicle,
              isDriver: activeRide.driver?.userId === userId,
            }
          : null,
        savedPlaces: savedPlaces.map((p) => p.toJSON()),
        nearbyRides: filteredNearby.map((offer: any) => ({
          offerId: offer.offerId,
          driverName: offer.driverName,
          driverPhoto: offer.driverPhoto,
          rating: offer.rating,
          totalReviews: offer.totalReviews,
          from: offer.route?.from,
          to: offer.route?.to,
          date: offer.date,
          time: offer.time,
          price: offer.price,
          availableSeats: offer.availableSeats,
          vehicleType: offer.vehicle?.type,
          distanceFromUser: offer.distanceFromUser || null,
          isPinkPooling: offer.isPinkPooling || false,
        })),
        greenImpact: {
          co2SavedKg,
          totalRidesShared: ridesCount,
          totalDistanceKm: Math.round(totalDistanceKm),
          ecoLevel,
        },
        referral: {
          code: referralCode?.code || user.referralCode || null,
          totalReferrals: referralCode?.totalReferrals || 0,
          totalCoinsEarned: referralCode?.totalCoinsEarned || 0,
        },
        verification: {
          phone: true,
          email: !!user.email,
          aadhaar: verifiedTypes.includes('aadhaar'),
          pan: verifiedTypes.includes('pan'),
          license: verifiedTypes.includes('driving_license'),
          idVerified: user.isVerified,
        },
      };
    } catch (error) {
      logger.error('Error getting home screen data:', error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
