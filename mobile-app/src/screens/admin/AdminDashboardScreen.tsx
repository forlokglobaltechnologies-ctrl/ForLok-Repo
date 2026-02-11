import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ImageBackground,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import {
  Menu,
  Bell,
  Settings,
  User,
  LogOut,
  TrendingUp,
  Users,
  DollarSign,
  MessageSquare,
  Car,
  KeyRound,
  Clock,
  Shield,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Lightbulb,
  XCircle,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';
import { apiService } from '@services/api.service';
import { websocketService } from '@services/websocket.service';

const { width } = Dimensions.get('window');

const AdminDashboardScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const carouselImages = [
    require('../../../assets/onboarding2.jpg'),
    require('../../../assets/pooling search.jpg'),
    require('../../../assets/user.jpg'),
    require('../../../assets/signin.jpg'),
  ];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
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

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout'),
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all stored tokens
              await apiService.clearTokens();
              
              // Disconnect websocket
              websocketService.disconnect();
              
              // Reset navigation to SignIn screen and clear history
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'SignIn' }],
                })
              );
            } catch (error) {
              console.error('Logout error:', error);
              // Even if there's an error, navigate to SignIn
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'SignIn' }],
                })
              );
            }
          },
        },
      ]
    );
  };

  // Mock data
  const stats = {
    presentUsers: 1234,
    totalUsers: 45678,
    todayEarnings: 125450,
    totalEarnings: 24567890,
    pendingFeedback: 5,
    totalTransactions: 1234,
  };

  const recentTransactions = [
    { id: '1', user: 'Rajesh K.', service: 'Car Pool', date: '15 Jan', revenue: '₹450' },
    { id: '2', user: 'Priya M.', service: 'Rental', date: '15 Jan', revenue: '₹3,200' },
    { id: '3', user: 'Amit S.', service: 'Bike Pool', date: '14 Jan', revenue: '₹300' },
  ];

  const recentFeedback = [
    { id: '1', type: 'Payment Issue', user: 'User ID: 12345', status: 'Pending', icon: CreditCard },
    { id: '2', type: 'Feature Suggestion', user: 'User ID: 67890', status: 'Acknowledged', icon: Lightbulb },
    { id: '3', type: 'Complaint', user: 'User ID: 11111', status: 'Resolved', icon: XCircle },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Blue Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton}>
          <Menu size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.dashboard.title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications' as never)}
          >
            <Bell size={24} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('AdminSettings' as never)}
          >
            <Settings size={24} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleLogout}
          >
            <LogOut size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
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
              <Users size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{stats.presentUsers.toLocaleString()}</Text>
            <Text style={styles.statLabel}>{t('admin.dashboard.activeUsers')}</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t('admin.dashboard.live')}</Text>
            </View>
          </Card>
          <Card style={styles.statBox}>
            <View style={styles.statIconContainer}>
              <Users size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{(stats.totalUsers / 1000).toFixed(0)}K</Text>
            <Text style={styles.statLabel}>{t('admin.dashboard.totalUsers')}</Text>
            <View style={styles.growthIndicator}>
              <TrendingUp size={14} color={COLORS.success} />
              <Text style={styles.growthText}>+12%</Text>
            </View>
          </Card>
          <Card style={styles.statBox}>
            <View style={styles.statIconContainer}>
              <DollarSign size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>₹{(stats.todayEarnings / 1000).toFixed(0)}K</Text>
            <Text style={styles.statLabel}>{t('admin.dashboard.todaysEarnings')}</Text>
            <View style={styles.growthIndicator}>
              <TrendingUp size={14} color={COLORS.success} />
              <Text style={styles.growthText}>+15%</Text>
            </View>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>{t('admin.dashboard.quickActions')}</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('PoolingManagement' as never)}
            >
              <View style={styles.quickActionContent}>
                <View style={styles.quickActionIconContainer}>
                  <Car size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.quickActionText}>{t('admin.dashboard.pooling')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('RentalManagement' as never)}
            >
              <View style={styles.quickActionContent}>
                <View style={styles.quickActionIconContainer}>
                  <KeyRound size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.quickActionText}>{t('admin.dashboard.rental')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('RidesHistory' as never)}
            >
              <View style={styles.quickActionContent}>
                <View style={styles.quickActionIconContainer}>
                  <Clock size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.quickActionText}>{t('admin.dashboard.history')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('UserManagement' as never)}
            >
              <View style={styles.quickActionContent}>
                <View style={styles.quickActionIconContainer}>
                  <Users size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.quickActionText}>{t('admin.dashboard.users')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('FeedbackManagement' as never)}
            >
              <View style={styles.quickActionContent}>
                <View style={styles.quickActionIconContainer}>
                  <MessageSquare size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.quickActionText}>{t('admin.dashboard.feedback')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Analytics' as never)}
            >
              <View style={styles.quickActionContent}>
                <View style={styles.quickActionIconContainer}>
                  <TrendingUp size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.quickActionText}>{t('admin.dashboard.analytics')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('admin.dashboard.recentTransactions')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('RidesHistory' as never)}>
              <Text style={styles.viewAllText}>{t('admin.dashboard.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          {recentTransactions.map((transaction) => (
            <Card key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionUser}>{transaction.user}</Text>
                  <Text style={styles.transactionService}>{transaction.service}</Text>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={styles.transactionRevenue}>{transaction.revenue}</Text>
                  <Text style={styles.transactionDate}>{transaction.date}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => navigation.navigate('RidesHistory' as never)}
              >
                <Text style={styles.detailsButtonText}>{t('admin.dashboard.viewDetails')}</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>

        {/* Recent Feedback */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('admin.dashboard.recentFeedback')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FeedbackManagement' as never)}>
              <Text style={styles.viewAllText}>{t('admin.dashboard.viewAll')}</Text>
            </TouchableOpacity>
          </View>
          {recentFeedback.map((feedback) => {
            const IconComponent = feedback.icon;
            return (
              <Card key={feedback.id} style={styles.feedbackCard}>
                <View style={styles.feedbackHeader}>
                  <View style={styles.feedbackIconContainer}>
                    <IconComponent size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.feedbackInfo}>
                    <Text style={styles.feedbackType}>{feedback.type}</Text>
                    <Text style={styles.feedbackUser}>{feedback.user}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    feedback.status === 'Pending' && styles.statusPending,
                    feedback.status === 'Resolved' && styles.statusResolved,
                  ]}>
                    <Text style={styles.statusText}>{feedback.status}</Text>
                  </View>
                </View>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => navigation.navigate('FeedbackManagement' as never)}
              >
                <Text style={styles.viewButtonText}>{t('admin.dashboard.viewDetails')}</Text>
              </TouchableOpacity>
            </Card>
            );
          })}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <DollarSign size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.summaryValue}>₹{(stats.totalEarnings / 1000000).toFixed(1)}M</Text>
            <Text style={styles.summaryLabel}>{t('admin.dashboard.totalEarnings')}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <MessageSquare size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.summaryValue}>{stats.pendingFeedback}</Text>
            <Text style={styles.summaryLabel}>{t('admin.dashboard.pendingFeedback')}</Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.xl,
  },
  menuButton: {
    padding: SPACING.xs,
  },
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
  headerRight: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  iconButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  carouselContainer: {
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  carouselImage: {
    width: '100%',
    height: 200,
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.lightGray,
  },
  indicatorActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    minHeight: 140,
    justifyContent: 'center',
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    marginBottom: SPACING.xs,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  liveText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.success,
    fontWeight: '600',
  },
  growthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
  },
  growthText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.success,
    fontWeight: '600',
  },
  quickActionsContainer: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  quickActionCard: {
    width: (width - SPACING.md * 2 - SPACING.md) / 2,
    aspectRatio: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  quickActionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  viewAllText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  transactionCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionUser: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs / 2,
  },
  transactionService: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionRevenue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.xs / 2,
  },
  transactionDate: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  detailsButton: {
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '600',
  },
  feedbackCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  feedbackIconContainer: {
    marginRight: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackInfo: {
    flex: 1,
  },
  feedbackType: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs / 2,
  },
  feedbackUser: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.lightGray,
  },
  statusPending: {
    backgroundColor: COLORS.warning + '30',
  },
  statusResolved: {
    backgroundColor: COLORS.success + '30',
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    fontWeight: '600',
  },
  viewButton: {
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  viewButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    minHeight: 100,
    justifyContent: 'center',
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  summaryLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default AdminDashboardScreen;
