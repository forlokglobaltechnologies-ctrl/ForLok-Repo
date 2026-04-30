import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
} from 'react-native';
import { normalize, wp, hp, SCREEN_WIDTH } from '@utils/responsive';
import { useNavigation } from '@react-navigation/native';
import { Menu, Bell, User, Bike, Clock, ChevronLeft, ChevronRight, DollarSign, BarChart, LayoutList } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';

const CompanyDashboardScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    scootiesCount: 0,
    bikesCount: 0,
    activeOffers: 0,
    totalBookings: 0,
    totalEarnings: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const carouselImages = [
    require('../../../assets/onboarding2.jpg'),
    require('../../../assets/pooling search.jpg'),
    require('../../../assets/user.jpg'),
    require('../../../assets/onboarding2.jpg'),
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get company profile first to get companyId
      const companyResponse = await (await import('@utils/apiClient')).companyApi.getProfile();
      if (companyResponse.success && companyResponse.data?.companyId) {
        setCompanyId(companyResponse.data.companyId);
      }

      const [statsResponse, bookingsResponse, vehiclesResponse] = await Promise.all([
        (await import('@utils/apiClient')).companyApi.getStats(),
        (await import('@utils/apiClient')).companyApi.getBookings({ limit: 5 }),
        companyResponse.data?.companyId 
          ? (await import('@utils/apiClient')).vehicleApi.getCompanyVehicles(companyResponse.data.companyId)
          : Promise.resolve({ success: false, data: [] }),
      ]);

      if (statsResponse.success && statsResponse.data) {
        // Calculate vehicle breakdown from vehicles data
        let scootiesCount = 0;
        let bikesCount = 0;

        if (vehiclesResponse.success && vehiclesResponse.data) {
          const vehicles = Array.isArray(vehiclesResponse.data) ? vehiclesResponse.data : [];
          scootiesCount = vehicles.filter((v: any) => {
            const t = (v.type || '').toLowerCase();
            return t === 'scooty' || t === 'scooter';
          }).length;
          bikesCount = vehicles.filter((v: any) => (v.type || '').toLowerCase() === 'bike').length;
        }

        setStats({
          totalVehicles: statsResponse.data.totalVehicles || 0,
          scootiesCount,
          bikesCount,
          activeOffers: statsResponse.data.activeOffers || 0,
          totalBookings: statsResponse.data.totalBookings || 0,
          totalEarnings: statsResponse.data.totalEarnings || 0,
        });
      }

      if (bookingsResponse.success && bookingsResponse.data?.bookings) {
        const bookings = bookingsResponse.data.bookings.slice(0, 5).map((booking: any) => ({
          id: booking.bookingId || booking._id,
          vehicle: `${booking.vehicle?.brand || ''} ${booking.vehicle?.number || ''}`,
          bookedBy: booking.renter?.name || 'Unknown',
          date: booking.date ? new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A',
          duration: booking.duration ? `${booking.duration} hours` : 'N/A',
          bookingId: booking.bookingId || booking._id,
        }));
        setRecentBookings(bookings);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? carouselImages.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => 
      prev === carouselImages.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton}>
          <Menu size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fleet dashboard</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications' as never)}
          >
            <Bell size={24} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('CompanyProfile' as never)}
          >
            <User size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          <ImageBackground
            source={carouselImages[currentImageIndex]}
            style={styles.carouselImage}
            resizeMode="cover"
          >
            <View style={styles.overlay} />
            <BlurView intensity={50} style={styles.blurContainer}>
              <TouchableOpacity
                style={styles.carouselArrow}
                onPress={goToPrevious}
              >
                <ChevronLeft size={24} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.carouselArrow, styles.carouselArrowRight]}
                onPress={goToNext}
              >
                <ChevronRight size={24} color={COLORS.white} />
              </TouchableOpacity>
            </BlurView>
          </ImageBackground>
          <View style={styles.carouselIndicators}>
            {carouselImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentImageIndex && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Statistics Boxes */}
        <View style={styles.statsContainer}>
          <Card style={styles.statBox}>
            <View style={styles.statIconContainer}>
              <Bike size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{stats.bikesCount}</Text>
            <Text style={styles.statLabel}>Bikes</Text>
          </Card>
          <Card style={styles.statBox}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="moped" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{stats.scootiesCount}</Text>
            <Text style={styles.statLabel}>Scooties</Text>
          </Card>
          <Card style={styles.statBox}>
            <View style={styles.statIconContainer}>
              <LayoutList size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{stats.totalVehicles}</Text>
            <Text style={styles.statLabel}>Total Vehicles</Text>
          </Card>
          <Card style={styles.statBox}>
            <View style={styles.statIconContainer}>
              <BarChart size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{stats.activeOffers}</Text>
            <Text style={styles.statLabel}>Active Offers</Text>
          </Card>
          <Card style={styles.statBox}>
            <View style={styles.statIconContainer}>
              <DollarSign size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>₹{(stats.totalEarnings / 1000).toFixed(0)}K</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </Card>
        </View>

        <View style={styles.quickActions}>
          <Button
            title="My Offers"
            onPress={() => navigation.navigate('CompanyMyOffers' as never)}
            variant="primary"
            size="medium"
            style={styles.quickActionButton}
          />
          <Button
            title="My Vehicles"
            onPress={() => navigation.navigate('CompanyVehicleManagement' as never)}
            variant="outline"
            size="medium"
            style={styles.quickActionButton}
          />
        </View>
        <View style={styles.quickActions}>
          <Button
            title="Earnings"
            onPress={() => navigation.navigate('CompanyEarnings' as never)}
            variant="outline"
            size="medium"
            style={styles.quickActionButton}
          />
          <Button
            title="Create Offer"
            onPress={() => navigation.navigate('CreateRentalOffer' as never)}
            variant="primary"
            size="medium"
            style={styles.quickActionButton}
          />
        </View>

        <Text style={styles.sectionTitle}>{t('companyDashboard.recentBookings')}</Text>
        {recentBookings.map((booking) => (
          <Card key={booking.id} style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <Bike size={24} color={COLORS.primary} />
              <Text style={styles.bookingVehicle}>{booking.vehicle}</Text>
            </View>
            <Text style={styles.bookingText}>{t('companyDashboard.bookedBy')}: {booking.bookedBy}</Text>
            <View style={styles.bookingFooter}>
              <View style={styles.bookingDate}>
                <Clock size={16} color={COLORS.textSecondary} />
                <Text style={styles.bookingDateText}>
                  {booking.date}, {booking.duration}
                </Text>
              </View>
              <Button
                title={t('companyDashboard.viewDetails')}
                onPress={() => navigation.navigate('BookingDetails' as never, { bookingId: booking.bookingId } as never)}
                variant="outline"
                size="small"
                style={styles.detailsButton}
              />
            </View>
          </Card>
        ))}
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <BarChart size={24} color={COLORS.textSecondary} />
          <Text style={styles.navLabel}>{t('companyDashboard.dashboard')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('VehicleInformation' as never)}
        >
          <Bike size={24} color={COLORS.textSecondary} />
          <Text style={styles.navLabel}>{t('companyDashboard.vehicles')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('CompanyHistory' as never)}
        >
          <Clock size={24} color={COLORS.textSecondary} />
          <Text style={styles.navLabel}>{t('companyDashboard.history')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('CompanyProfile' as never)}
        >
          <User size={24} color={COLORS.textSecondary} />
          <Text style={styles.navLabel}>{t('companyDashboard.profile')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.xl,
  },
  menuButton: { padding: SPACING.xs },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.white,
    fontWeight: 'bold',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  headerRight: { flexDirection: 'row', gap: SPACING.md },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  carouselContainer: {
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  carouselImage: {
    width: '100%',
    height: hp(25),
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary,
    opacity: 0.6,
  },
  blurContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  carouselArrow: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselArrowRight: {
    marginLeft: 'auto',
  },
  carouselIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  indicator: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    backgroundColor: COLORS.lightGray,
  },
  indicatorActive: {
    backgroundColor: COLORS.primary,
    width: normalize(24),
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.sm * 4) / 3,
    minWidth: normalize(100),
    alignItems: 'center',
    padding: SPACING.md,
    minHeight: normalize(120),
    justifyContent: 'center',
  },
  statIconContainer: {
    width: normalize(56),
    height: normalize(56),
    borderRadius: normalize(28),
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  quickActionButton: { flex: 1 },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  bookingCard: { padding: SPACING.md, marginBottom: SPACING.md },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  bookingVehicle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  bookingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  bookingDateText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  detailsButton: {},
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: SPACING.sm,
    paddingBottom: SPACING.md,
    ...SHADOWS.md,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  navLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});

export default CompanyDashboardScreen;
