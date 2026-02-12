import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { normalize, wp, hp } from '@utils/responsive';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  Clock,
  TrendingUp,
  DollarSign,
  Car,
  KeyRound,
  MapPin,
  ChevronRight,
  User,
  Calendar,
  Inbox,
  CheckCircle,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { adminApi, analyticsApi } from '@utils/apiClient';

const RidesHistoryScreen = () => {
  const navigation = useNavigation();
  const [activeFilter, setActiveFilter] = useState('All');
  const [bookings, setBookings] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    totalRevenue: 0,
    pooling: { count: 0, revenue: 0 },
    rentals: { count: 0, revenue: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  const safeNum = (val: any): number => {
    if (val == null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    if (typeof val === 'object') return Number(val.amount ?? val.total ?? val.value ?? val.count ?? 0) || 0;
    return 0;
  };

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const params: any = { page, limit: 20 };
      if (activeFilter === 'Pooling') params.serviceType = 'pooling';
      else if (activeFilter === 'Rental') params.serviceType = 'rental';

      const [bookingsRes, dashRes, financialRes] = await Promise.all([
        adminApi.getBookings(params),
        adminApi.getDashboardStats(),
        analyticsApi.getFinancialSummary('month'),
      ]);

      // Bookings list
      if (bookingsRes.success && bookingsRes.data) {
        const d = bookingsRes.data;
        setBookings(d.bookings || d.data || (Array.isArray(d) ? d : []));
      }

      // Summary from dashboard stats + financial
      const dash = dashRes.success ? dashRes.data : {};
      const fin = financialRes.success ? financialRes.data : {};

      const bookingsData = dash?.bookings || dash;
      const revenueData = dash?.revenue || fin;
      const breakdown = fin?.breakdown || {};

      setSummary({
        total: safeNum(bookingsData?.total ?? bookingsData?.totalBookings),
        totalRevenue: safeNum(revenueData?.total ?? revenueData?.totalRevenue),
        pooling: {
          count: safeNum(bookingsData?.pooling ?? breakdown?.poolingCount),
          revenue: safeNum(breakdown?.pooling ?? revenueData?.poolingRevenue),
        },
        rentals: {
          count: safeNum(bookingsData?.rental ?? breakdown?.rentalCount),
          revenue: safeNum(breakdown?.rental ?? revenueData?.rentalRevenue),
        },
      });
    } catch (error) {
      console.error('Error fetching rides data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, page]);

  useEffect(() => { setPage(1); }, [activeFilter]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(true); };

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

  const formatDate = (d: string) => {
    if (!d) return 'N/A';
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const FILTERS = [
    { key: 'All', label: 'All', color: '#4A90D9' },
    { key: 'Pooling', label: 'Pooling', color: '#00B894' },
    { key: 'Rental', label: 'Rental', color: '#F39C12' },
  ];

  const getServiceConfig = (service: string) => {
    const s = (service || '').toLowerCase();
    if (s.includes('pool') || s === 'pooling') return { color: '#00B894', bg: '#00B894' + '15', icon: Car };
    return { color: '#F39C12', bg: '#F39C12' + '15', icon: KeyRound };
  };

  const getStatusConfig = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed') return { color: '#00B894', bg: '#00B894' + '15' };
    if (s === 'cancelled') return { color: '#E74C3C', bg: '#E74C3C' + '15' };
    if (s === 'pending' || s === 'upcoming') return { color: '#F39C12', bg: '#F39C12' + '15' };
    if (s === 'active' || s === 'in_progress') return { color: '#4A90D9', bg: '#4A90D9' + '15' };
    return { color: '#64748B', bg: '#F1F5F9' };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Hero Header */}
      <ImageBackground source={require('../../../assets/rideshistory.png')} style={styles.heroHeader} resizeMode="cover">
        <View style={styles.heroOverlay} />
        <BlurView intensity={20} tint="dark" style={styles.heroBlur}>
          <View style={styles.heroNav}>
            <TouchableOpacity style={styles.heroBackBtn} onPress={() => navigation.goBack()}>
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroTitle}>Rides History</Text>
              <Text style={styles.heroSubtitle}>
                {summary.total > 0 ? `${summary.total.toLocaleString()} total rides` : 'All bookings & transactions'}
              </Text>
            </View>
            <View style={{ width: 38 }} />
          </View>
        </BlurView>
      </ImageBackground>

      {/* Stats Strip */}
      <View style={styles.statsStrip}>
        <View style={styles.statsStripItem}>
          <View style={[styles.statsIcon, { backgroundColor: '#4A90D9' + '15' }]}><Clock size={16} color="#4A90D9" /></View>
          <Text style={[styles.statsValue, { color: '#4A90D9' }]}>{formatNumber(summary.total)}</Text>
          <Text style={styles.statsLabel}>Total</Text>
        </View>
        <View style={styles.statsStripItem}>
          <View style={[styles.statsIcon, { backgroundColor: '#00B894' + '15' }]}><DollarSign size={16} color="#00B894" /></View>
          <Text style={[styles.statsValue, { color: '#00B894' }]}>{formatCurrency(summary.totalRevenue)}</Text>
          <Text style={styles.statsLabel}>Revenue</Text>
        </View>
        <View style={styles.statsStripItem}>
          <View style={[styles.statsIcon, { backgroundColor: '#7B61FF' + '15' }]}><Car size={16} color="#7B61FF" /></View>
          <Text style={[styles.statsValue, { color: '#7B61FF' }]}>{formatNumber(summary.pooling.count)}</Text>
          <Text style={styles.statsLabel}>Pooling</Text>
        </View>
        <View style={styles.statsStripItem}>
          <View style={[styles.statsIcon, { backgroundColor: '#F39C12' + '15' }]}><KeyRound size={16} color="#F39C12" /></View>
          <Text style={[styles.statsValue, { color: '#F39C12' }]}>{formatNumber(summary.rentals.count)}</Text>
          <Text style={styles.statsLabel}>Rentals</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <TouchableOpacity key={f.key} style={[styles.tab, isActive && { backgroundColor: f.color, borderColor: f.color }]} activeOpacity={0.7} onPress={() => setActiveFilter(f.key)}>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Revenue Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardLabel}>Pooling Revenue</Text>
            </View>
            <Text style={[styles.summaryCardValue, { color: '#00B894' }]}>{formatCurrency(summary.pooling.revenue)}</Text>
            <Text style={styles.summaryCardSub}>{summary.pooling.count.toLocaleString()} rides</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardLabel}>Rental Revenue</Text>
            </View>
            <Text style={[styles.summaryCardValue, { color: '#F39C12' }]}>{formatCurrency(summary.rentals.revenue)}</Text>
            <Text style={styles.summaryCardSub}>{summary.rentals.count.toLocaleString()} rentals</Text>
          </View>
        </View>

        {/* Transaction List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Text style={styles.sectionCount}>{bookings.length} shown</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading rides...</Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}><Inbox size={48} color="#CBD5E1" /></View>
            <Text style={styles.emptyTitle}>No Rides Found</Text>
            <Text style={styles.emptyText}>No transactions match your filter.</Text>
          </View>
        ) : (
          bookings.map((tx: any) => {
            const bookingId = tx.bookingId || tx._id || tx.id;
            const service = tx.serviceType || tx.type || 'pooling';
            const svcConf = getServiceConfig(service);
            const SvcIcon = svcConf.icon;
            const statusConf = getStatusConfig(tx.status);
            const userName = tx.user?.name || tx.userName || tx.passenger?.name || 'User';
            const fromCity = tx.from?.city || tx.from?.address || (tx.route?.from?.city) || (tx.route?.from?.address) || (typeof tx.from === 'string' ? tx.from : '');
            const toCity = tx.to?.city || tx.to?.address || (tx.route?.to?.city) || (tx.route?.to?.address) || (typeof tx.to === 'string' ? tx.to : '');
            const route = fromCity && toCity ? `${fromCity} → ${toCity}` : (typeof tx.route === 'string' ? tx.route : tx.description || 'N/A');
            const rawRevenue = tx.totalAmount || tx.amount || tx.fare || tx.price || 0;
            const revenue = typeof rawRevenue === 'object' ? safeNum(rawRevenue) : rawRevenue;

            return (
              <TouchableOpacity
                key={bookingId}
                style={styles.txCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('TransactionDetails' as never, { transactionId: bookingId } as never)}
              >
                <View style={styles.txHeader}>
                  <View style={[styles.txServiceIcon, { backgroundColor: svcConf.bg }]}>
                    <SvcIcon size={18} color={svcConf.color} />
                  </View>
                  <View style={styles.txHeaderInfo}>
                    <Text style={styles.txId} numberOfLines={1}>#{bookingId}</Text>
                    <View style={styles.txServiceRow}>
                      <View style={[styles.txServiceBadge, { backgroundColor: svcConf.bg }]}>
                        <Text style={[styles.txServiceText, { color: svcConf.color }]}>{service.charAt(0).toUpperCase() + service.slice(1)}</Text>
                      </View>
                      <View style={[styles.txStatusBadge, { backgroundColor: statusConf.bg }]}>
                        <CheckCircle size={10} color={statusConf.color} />
                        <Text style={[styles.txStatusText, { color: statusConf.color }]}>{tx.status || 'N/A'}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.txRevenue}>
                    <Text style={styles.txRevenueText} numberOfLines={1}>{typeof revenue === 'number' ? `₹${revenue}` : revenue}</Text>
                    <ChevronRight size={16} color="#CBD5E1" />
                  </View>
                </View>

                <View style={styles.txDetailsRow}>
                  <View style={styles.txDetailItem}>
                    <User size={12} color="#94A3B8" />
                    <Text style={styles.txDetailText} numberOfLines={1}>{userName}</Text>
                  </View>
                  <View style={styles.txDetailItem}>
                    <MapPin size={12} color="#94A3B8" />
                    <Text style={styles.txDetailText} numberOfLines={1}>{route}</Text>
                  </View>
                  <View style={styles.txDetailItem}>
                    <Calendar size={12} color="#94A3B8" />
                    <Text style={styles.txDetailText}>{formatDate(tx.createdAt || tx.date)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Pagination */}
        {!loading && bookings.length > 0 && (
          <View style={styles.paginationRow}>
            <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} onPress={() => page > 1 && setPage(page - 1)} disabled={page === 1}>
              <Text style={styles.pageBtnText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.paginationInfo}>Page {page}</Text>
            <TouchableOpacity style={[styles.pageBtn, bookings.length < 20 && styles.pageBtnDisabled]} onPress={() => bookings.length >= 20 && setPage(page + 1)} disabled={bookings.length < 20}>
              <Text style={styles.pageBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  heroHeader: { height: Platform.OS === 'android' ? hp(17) + (StatusBar.currentHeight || 0) : hp(20), width: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 52, 96, 0.5)' },
  heroBlur: { flex: 1, justifyContent: 'flex-end', paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg },
  heroNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBackBtn: { width: normalize(38), height: normalize(38), borderRadius: normalize(19), backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  heroTitleWrap: { alignItems: 'center' },
  heroTitle: { fontFamily: FONTS.regular, fontSize: normalize(20), color: '#fff', fontWeight: '700' },
  heroSubtitle: { fontFamily: FONTS.regular, fontSize: normalize(12), color: 'rgba(255,255,255,0.7)', marginTop: normalize(2) },
  statsStrip: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: SPACING.lg, marginTop: -SPACING.md, borderRadius: normalize(14), padding: SPACING.sm, ...SHADOWS.md, zIndex: 10 },
  statsStripItem: { flex: 1, alignItems: 'center', paddingVertical: SPACING.xs },
  statsIcon: { width: normalize(32), height: normalize(32), borderRadius: normalize(10), justifyContent: 'center', alignItems: 'center', marginBottom: normalize(4) },
  statsValue: { fontFamily: FONTS.regular, fontSize: normalize(16), fontWeight: '800' },
  statsLabel: { fontFamily: FONTS.regular, fontSize: normalize(10), color: '#94A3B8', fontWeight: '500', marginTop: normalize(1) },
  tabsScroll: { marginTop: SPACING.md, maxHeight: normalize(48) },
  tabsContent: { paddingHorizontal: SPACING.lg, gap: SPACING.xs },
  tab: { paddingHorizontal: normalize(20), paddingVertical: normalize(9), borderRadius: normalize(20), backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  tabText: { fontFamily: FONTS.regular, fontSize: normalize(13), color: '#475569', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingTop: SPACING.md },
  summaryRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: normalize(14), padding: SPACING.md, ...SHADOWS.sm },
  summaryCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  summaryCardLabel: { fontFamily: FONTS.regular, fontSize: normalize(11), color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: normalize(0.3) },
  summaryCardValue: { fontFamily: FONTS.regular, fontSize: normalize(22), fontWeight: '800', marginBottom: normalize(2) },
  summaryCardSub: { fontFamily: FONTS.regular, fontSize: normalize(11), color: '#94A3B8', fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.lg, color: '#1E293B', fontWeight: '700' },
  sectionCount: { fontFamily: FONTS.regular, fontSize: normalize(12), color: '#94A3B8', fontWeight: '500' },
  loadingContainer: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  loadingText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.md },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  emptyIconWrap: { width: normalize(80), height: normalize(80), borderRadius: normalize(40), backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  emptyTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.lg, fontWeight: '700', color: '#1E293B', marginBottom: SPACING.xs },
  emptyText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: '#94A3B8' },
  txCard: { backgroundColor: '#fff', borderRadius: normalize(14), padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', ...SHADOWS.sm },
  txHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  txServiceIcon: { width: normalize(44), height: normalize(44), borderRadius: normalize(14), justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm, flexShrink: 0 },
  txHeaderInfo: { flex: 1, marginRight: SPACING.sm },
  txId: { fontFamily: FONTS.regular, fontSize: normalize(12), color: '#94A3B8', fontWeight: '500', marginBottom: normalize(4) },
  txServiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: normalize(6) },
  txServiceBadge: { paddingHorizontal: normalize(8), paddingVertical: normalize(3), borderRadius: normalize(8) },
  txServiceText: { fontFamily: FONTS.regular, fontSize: normalize(10), fontWeight: '700' },
  txStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: normalize(3), paddingHorizontal: normalize(8), paddingVertical: normalize(3), borderRadius: normalize(8) },
  txStatusText: { fontFamily: FONTS.regular, fontSize: normalize(10), fontWeight: '700' },
  txRevenue: { flexDirection: 'row', alignItems: 'center', gap: normalize(4), flexShrink: 0 },
  txRevenueText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, color: '#00B894', fontWeight: '700' },
  txDetailsRow: { flexDirection: 'column', gap: normalize(6), paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  txDetailItem: { flexDirection: 'row', alignItems: 'center', gap: normalize(6) },
  txDetailText: { fontFamily: FONTS.regular, fontSize: normalize(11), color: '#64748B', fontWeight: '500', flex: 1 },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.lg },
  pageBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F1F5F9' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  paginationInfo: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
});

export default RidesHistoryScreen;
