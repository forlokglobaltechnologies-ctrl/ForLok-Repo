import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  FlatList,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  Settings,
  LogOut,
  TrendingUp,
  Users,
  DollarSign,
  MessageSquare,
  Car,
  KeyRound,
  Clock,
  ChevronRight,
  CheckCircle,
  Lightbulb,
  Coins,
  BarChart3,
  Shield,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Circle,
  Zap,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { useAuth } from '@context/AuthContext';
import { adminApi, analyticsApi, apiCall } from '@utils/apiClient';
import { normalize, wp, hp, SCREEN_WIDTH } from '@utils/responsive';

const CAROUSEL_HEIGHT = hp(22);
const STAT_CARD_WIDTH = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2;

// ── Carousel images ──────────────────────────────────────────────
const CAROUSEL_IMAGES = [
  require('../../../assets/admin1.png'),
  require('../../../assets/admin2.png'),
  require('../../../assets/admin3.png'),
  require('../../../assets/admin4.png'),
  require('../../../assets/admin5.png'),
];

// ── Quick-action config ──────────────────────────────────────────
const QUICK_ACTIONS = [
  { key: 'pooling', icon: Car, label: 'Pooling', color: '#4A90D9', route: 'PoolingManagement' },
  { key: 'rental', icon: KeyRound, label: 'Rentals', color: '#7B61FF', route: 'RentalManagement' },
  { key: 'users', icon: Users, label: 'Users', color: '#00B894', route: 'UserManagement' },
  { key: 'history', icon: Clock, label: 'History', color: '#F39C12', route: 'RidesHistory' },
  { key: 'feedback', icon: MessageSquare, label: 'Feedback', color: '#E74C3C', route: 'FeedbackManagement' },
  { key: 'analytics', icon: BarChart3, label: 'Analytics', color: '#0984E3', route: 'Analytics' },
  { key: 'promos', icon: Lightbulb, label: 'Promos', color: '#F5A623', route: 'AdminPromoReview' },
];

const AdminDashboardScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animDone, setAnimDone] = useState(false);
  const [dataDone, setDataDone] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  // Real data states
  const [stats, setStats] = useState<any>({
    users: { total: 0, active: 0 },
    bookings: { total: 0, today: 0, pending: 0, completed: 0 },
    revenue: { total: 0, today: 0 },
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [coinStats, setCoinStats] = useState<any>(null);
  const [pendingPromos, setPendingPromos] = useState(0);

  // ── Data fetch ────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, realtimeRes, coinStatsRes, pendingPromosRes] = await Promise.all([
        adminApi.getDashboardStats(),
        analyticsApi.getRealtime().catch(() => ({ success: false })),
        apiCall('/api/admin/coins/stats', { method: 'GET', requiresAuth: true }).catch(() => ({ success: false })),
        apiCall('/api/admin/promos?status=pending', { method: 'GET', requiresAuth: true }).catch(() => ({ success: false })),
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (realtimeRes.success && realtimeRes.data?.recentActivity) setRecentActivity(realtimeRes.data.recentActivity);
      if (coinStatsRes.success && coinStatsRes.data) setCoinStats(coinStatsRes.data);
      if (pendingPromosRes.success) {
        const submissions = pendingPromosRes.data?.submissions || pendingPromosRes.data || [];
        setPendingPromos(Array.isArray(submissions) ? submissions.length : 0);
      }
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
    } finally {
      setDataDone(true);
    }
  }, []);

  // Start data fetch and 3-second animation timer together
  useEffect(() => {
    fetchDashboardData();
    const timer = setTimeout(() => setAnimDone(true), 3000);
    return () => clearTimeout(timer);
  }, [fetchDashboardData]);

  // Only hide loading when BOTH animation and data are done
  useEffect(() => {
    if (animDone && dataDone) setLoading(false);
  }, [animDone, dataDone]);

  // ── Auto-scroll carousel ──────────────────────────────────────
  useEffect(() => {
    autoScrollTimer.current = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % CAROUSEL_IMAGES.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3500);
    return () => { if (autoScrollTimer.current) clearInterval(autoScrollTimer.current); };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  // ── Carousel item ─────────────────────────────────────────────
  const renderCarouselItem = ({ item }: { item: any }) => (
    <View style={styles.carouselSlide}>
      <Image source={item} style={styles.carouselImage} resizeMode="cover" />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ─── Dark gradient header ─────────────────────────────── */}
      <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.adminAvatarWrap}>
              <Shield size={18} color="#4A90D9" />
            </View>
            <View>
              <Text style={styles.headerGreeting}>Welcome back</Text>
              <Text style={styles.headerTitle}>Admin Panel</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('Notifications' as never)}
            >
              <Bell size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation.navigate('AdminSettings' as never)}
            >
              <Settings size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={logout}
            >
              <LogOut size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A90D9" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Carousel ───────────────────────────────────────── */}
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={CAROUSEL_IMAGES}
            renderItem={renderCarouselItem}
            keyExtractor={(_, i) => `slide-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slideWidth = SCREEN_WIDTH - SPACING.lg * 2;
              const index = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
              if (index >= 0 && index < CAROUSEL_IMAGES.length) {
                setActiveSlide(index);
              }
            }}
            scrollEventThrottle={200}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH - SPACING.lg * 2,
              offset: (SCREEN_WIDTH - SPACING.lg * 2) * index,
              index,
            })}
          />
          <View style={styles.dotsRow}>
            {CAROUSEL_IMAGES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, activeSlide === i && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* ─── Stat Cards (2x2 grid) ─────────────────────────── */}
        <View style={styles.statsGrid}>
          {/* Active Users */}
          <View style={[styles.statCard, { backgroundColor: '#EBF5FF' }]}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconWrap, { backgroundColor: '#4A90D9' }]}>
                <Activity size={18} color="#fff" />
              </View>
              <View style={styles.liveBadge}>
                <Circle size={6} color="#00B894" fill="#00B894" />
                <Text style={styles.liveBadgeText}>Live</Text>
              </View>
            </View>
            <Text style={[styles.statCardValue, { color: '#4A90D9' }]}>
              {formatNumber(stats.users?.active || 0)}
            </Text>
            <Text style={styles.statCardLabel}>Active Users</Text>
          </View>

          {/* Total Users */}
          <View style={[styles.statCard, { backgroundColor: '#F0EBFF' }]}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconWrap, { backgroundColor: '#7B61FF' }]}>
                <Users size={18} color="#fff" />
              </View>
            </View>
            <Text style={[styles.statCardValue, { color: '#7B61FF' }]}>
              {formatNumber(stats.users?.total || 0)}
            </Text>
            <Text style={styles.statCardLabel}>Total Users</Text>
          </View>

          {/* Today's Revenue */}
          <View style={[styles.statCard, { backgroundColor: '#E8FFF3' }]}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconWrap, { backgroundColor: '#00B894' }]}>
                <DollarSign size={18} color="#fff" />
              </View>
              <View style={styles.trendBadge}>
                <ArrowUpRight size={12} color="#00B894" />
                <Text style={[styles.trendText, { color: '#00B894' }]}>Today</Text>
              </View>
            </View>
            <Text style={[styles.statCardValue, { color: '#00B894' }]}>
              {formatCurrency(stats.revenue?.today || 0)}
            </Text>
            <Text style={styles.statCardLabel}>Today's Revenue</Text>
          </View>

          {/* Total Revenue */}
          <View style={[styles.statCard, { backgroundColor: '#FFF3E8' }]}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconWrap, { backgroundColor: '#F39C12' }]}>
                <TrendingUp size={18} color="#fff" />
              </View>
            </View>
            <Text style={[styles.statCardValue, { color: '#F39C12' }]}>
              {formatCurrency(stats.revenue?.total || 0)}
            </Text>
            <Text style={styles.statCardLabel}>Total Revenue</Text>
          </View>
        </View>

        {/* ─── Quick Actions ──────────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <TouchableOpacity
                  key={action.key}
                  style={styles.quickActionCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate(action.route as never)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color + '15' }]}>
                    <Icon size={22} color={action.color} />
                  </View>
                  <Text style={styles.quickActionLabel} numberOfLines={1}>{action.label}</Text>
                  {action.key === 'promos' && pendingPromos > 0 && (
                    <View style={styles.actionBadge}>
                      <Text style={styles.actionBadgeText}>{pendingPromos}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Bookings Overview ──────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bookings Overview</Text>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('RidesHistory' as never)}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={14} color="#4A90D9" />
            </TouchableOpacity>
          </View>

          <View style={styles.bookingRow}>
            {/* Today */}
            <View style={styles.bookingCard}>
              <LinearGradient
                colors={['#4A90D9', '#357ABD']}
                style={styles.bookingCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Zap size={20} color="#fff" />
                <Text style={styles.bookingCardValue}>{stats.bookings?.today || 0}</Text>
                <Text style={styles.bookingCardLabel}>Today</Text>
              </LinearGradient>
            </View>

            {/* Pending */}
            <View style={styles.bookingCard}>
              <LinearGradient
                colors={['#F39C12', '#E67E22']}
                style={styles.bookingCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Clock size={20} color="#fff" />
                <Text style={styles.bookingCardValue}>{stats.bookings?.pending || 0}</Text>
                <Text style={styles.bookingCardLabel}>Pending</Text>
              </LinearGradient>
            </View>

            {/* Completed */}
            <View style={styles.bookingCard}>
              <LinearGradient
                colors={['#00B894', '#00A884']}
                style={styles.bookingCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.bookingCardValue}>{stats.bookings?.completed || 0}</Text>
                <Text style={styles.bookingCardLabel}>Completed</Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* ─── Coin System Overview ───────────────────────────── */}
        {coinStats && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Coin System</Text>
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => navigation.navigate('AdminPromoReview' as never)}
              >
                <Text style={styles.viewAllText}>Manage</Text>
                <ChevronRight size={14} color="#4A90D9" />
              </TouchableOpacity>
            </View>

            <View style={styles.coinRow}>
              <View style={styles.coinCard}>
                <View style={[styles.coinIconWrap, { backgroundColor: '#F5A623' + '20' }]}>
                  <Coins size={20} color="#F5A623" />
                </View>
                <Text style={styles.coinValue}>{formatNumber(coinStats.totalCoinsInCirculation || 0)}</Text>
                <Text style={styles.coinLabel}>In Circulation</Text>
              </View>
              <View style={styles.coinCard}>
                <View style={[styles.coinIconWrap, { backgroundColor: '#00B894' + '20' }]}>
                  <TrendingUp size={20} color="#00B894" />
                </View>
                <Text style={styles.coinValue}>{formatNumber(coinStats.totalCoinsIssued || 0)}</Text>
                <Text style={styles.coinLabel}>Total Issued</Text>
              </View>
              <View style={styles.coinCard}>
                <View style={[styles.coinIconWrap, { backgroundColor: '#4A90D9' + '20' }]}>
                  <DollarSign size={20} color="#4A90D9" />
                </View>
                <Text style={styles.coinValue}>{formatNumber(coinStats.totalCoinsRedeemed || 0)}</Text>
                <Text style={styles.coinLabel}>Redeemed</Text>
              </View>
            </View>

            {/* Promo breakdown pills */}
            {coinStats.promos && (
              <View style={styles.promoSection}>
                <Text style={styles.promoSectionTitle}>Promo Submissions</Text>
                <View style={styles.promoPillRow}>
                  <View style={[styles.promoPill, { backgroundColor: '#F39C12' + '15' }]}>
                    <Text style={[styles.promoPillValue, { color: '#F39C12' }]}>
                      {coinStats.promos.pending || 0}
                    </Text>
                    <Text style={styles.promoPillLabel}>Pending</Text>
                  </View>
                  <View style={[styles.promoPill, { backgroundColor: '#00B894' + '15' }]}>
                    <Text style={[styles.promoPillValue, { color: '#00B894' }]}>
                      {coinStats.promos.approved || 0}
                    </Text>
                    <Text style={styles.promoPillLabel}>Approved</Text>
                  </View>
                  <View style={[styles.promoPill, { backgroundColor: '#E74C3C' + '15' }]}>
                    <Text style={[styles.promoPillValue, { color: '#E74C3C' }]}>
                      {coinStats.promos.rejected || 0}
                    </Text>
                    <Text style={styles.promoPillLabel}>Rejected</Text>
                  </View>
                </View>

                {(coinStats.promos.pending || 0) > 0 && (
                  <TouchableOpacity
                    style={styles.reviewButton}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('AdminPromoReview' as never)}
                  >
                    <LinearGradient
                      colors={['#F5A623', '#E69500']}
                      style={styles.reviewButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Lightbulb size={16} color="#fff" />
                      <Text style={styles.reviewButtonText}>
                        Review {coinStats.promos.pending} Pending
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* ─── Recent Activity ────────────────────────────────── */}
        {recentActivity.length > 0 && (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => navigation.navigate('RidesHistory' as never)}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <ChevronRight size={14} color="#4A90D9" />
              </TouchableOpacity>
            </View>

            {recentActivity.slice(0, 4).map((activity: any, idx: number) => (
              <TouchableOpacity
                key={activity.bookingId || idx}
                style={styles.activityCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('RidesHistory' as never)}
              >
                <View style={styles.activityIconWrap}>
                  <DollarSign size={18} color="#4A90D9" />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityUser} numberOfLines={1}>
                    {activity.passengerName || activity.driverName || 'User'}
                  </Text>
                  <Text style={styles.activityType}>
                    {activity.type || activity.status || 'Ride'} &middot;{' '}
                    {activity.createdAt
                      ? new Date(activity.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : ''}
                  </Text>
                </View>
                <View style={styles.activityAmount}>
                  <Text style={styles.activityAmountText}>
                    ₹{activity.amount || activity.totalAmount || 0}
                  </Text>
                  <ChevronRight size={14} color={COLORS.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* bottom spacing */}
        <View style={{ height: SPACING.xl * 2 }} />
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  /* ── Container & Loading ────────────────────────────────────── */
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingAnimation: {
    width: normalize(200),
    height: normalize(200),
  },
  loadingText: {
    marginTop: SPACING.sm,
    color: '#64748B',
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
  },

  /* ── Header ─────────────────────────────────────────────────── */
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + SPACING.md : 54,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  adminAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 144, 217, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGreeting: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.6)',
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: '#fff',
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Scroll ─────────────────────────────────────────────────── */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },

  /* ── Carousel ───────────────────────────────────────────────── */
  carouselContainer: {
    marginBottom: SPACING.lg,
    borderRadius: normalize(16),
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...SHADOWS.md,
  },
  carouselSlide: {
    width: SCREEN_WIDTH - SPACING.lg * 2,
    height: CAROUSEL_HEIGHT,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: normalize(10),
    gap: normalize(6),
    backgroundColor: '#fff',
  },
  dot: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    backgroundColor: '#4A90D9',
    width: normalize(24),
    borderRadius: normalize(12),
  },

  /* ── Stat Cards ─────────────────────────────────────────────── */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: STAT_CARD_WIDTH,
    borderRadius: normalize(16),
    padding: SPACING.md,
    minHeight: normalize(120),
    ...SHADOWS.sm,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statIconWrap: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(4),
    backgroundColor: '#00B894' + '15',
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(3),
    borderRadius: normalize(12),
  },
  liveBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    color: '#00B894',
    fontWeight: '700',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(2),
  },
  trendText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    fontWeight: '600',
  },
  statCardValue: {
    fontFamily: FONTS.regular,
    fontSize: normalize(24),
    fontWeight: '800',
    marginBottom: normalize(2),
  },
  statCardLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: '#64748B',
    fontWeight: '500',
  },

  /* ── Section Shared ─────────────────────────────────────────── */
  sectionWrap: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: '#1E293B',
    fontWeight: '700',
    marginBottom: 0,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(2),
  },
  viewAllText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#4A90D9',
    fontWeight: '600',
  },

  /* ── Quick Actions ──────────────────────────────────────────── */
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  quickActionCard: {
    width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm * 3) / 4,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    position: 'relative',
  },
  quickActionIcon: {
    width: normalize(50),
    height: normalize(50),
    borderRadius: normalize(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  quickActionLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
  },
  actionBadge: {
    position: 'absolute',
    top: normalize(8),
    right: normalize(4),
    backgroundColor: '#E74C3C',
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F5F7FA',
  },
  actionBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(9),
    color: '#fff',
    fontWeight: '800',
  },

  /* ── Bookings Row ───────────────────────────────────────────── */
  bookingRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  bookingCard: {
    flex: 1,
    borderRadius: normalize(14),
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  bookingCardGradient: {
    padding: SPACING.md,
    alignItems: 'center',
    minHeight: normalize(100),
    justifyContent: 'center',
    gap: normalize(6),
  },
  bookingCardValue: {
    fontFamily: FONTS.regular,
    fontSize: normalize(22),
    color: '#fff',
    fontWeight: '800',
  },
  bookingCardLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },

  /* ── Coin System ────────────────────────────────────────────── */
  coinRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  coinCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: normalize(14),
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  coinIconWrap: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  coinValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  coinLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },

  /* ── Promo Section ──────────────────────────────────────────── */
  promoSection: {
    marginTop: SPACING.md,
  },
  promoSectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#475569',
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  promoPillRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  promoPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: normalize(12),
  },
  promoPillValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    fontWeight: '800',
  },
  promoPillLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    color: '#64748B',
    marginTop: normalize(2),
    fontWeight: '500',
  },
  reviewButton: {
    borderRadius: normalize(12),
    overflow: 'hidden',
  },
  reviewButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: normalize(12),
    gap: SPACING.xs,
  },
  reviewButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#fff',
    fontWeight: '700',
  },

  /* ── Recent Activity ────────────────────────────────────────── */
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: normalize(14),
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  activityIconWrap: {
    width: normalize(42),
    height: normalize(42),
    borderRadius: normalize(12),
    backgroundColor: '#4A90D9' + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  activityInfo: {
    flex: 1,
  },
  activityUser: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#1E293B',
    fontWeight: '600',
    marginBottom: normalize(2),
  },
  activityType: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: '#94A3B8',
  },
  activityAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(4),
  },
  activityAmountText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#00B894',
    fontWeight: '700',
  },
});

export default AdminDashboardScreen;
