import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import {
  KeyRound,
  CheckCircle,
  Clock,
  Shield,
  MapPin,
  Calendar,
  ChevronRight,
  Inbox,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { adminApi } from '@utils/apiClient';

const formatNumber = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toString();
};

const RentalManagementScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('All');
  const [rentals, setRentals] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, approved: 0, pending: 0, suspended: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalRentals, setTotalRentals] = useState(0);

  const tabs = ['All', 'Active', 'Pending', 'Expired', 'Suspended'];

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const params: any = { page, limit: 20 };
      if (activeTab !== 'All') params.status = activeTab.toLowerCase();

      const [rentalsRes, statsRes] = await Promise.all([
        adminApi.getRentalOffers(params),
        adminApi.getDashboardStats(),
      ]);

      let rentalsList: any[] = [];
      if (rentalsRes.success && rentalsRes.data) {
        const d = rentalsRes.data;
        rentalsList = d.offers || d.rentals || d.data || (Array.isArray(d) ? d : []);
        setRentals(rentalsList);
        setTotalRentals(d.total || d.totalCount || rentalsList.length || 0);
      }

      if (statsRes.success && statsRes.data) {
        const s = statsRes.data;
        const rentalStats = s.rentals || s.rental || s;
        if (__DEV__) console.log('📊 Rental stats raw:', JSON.stringify(rentalStats, null, 2));

        // Compute counts from the list as a fallback
        const countByStatus = (st: string) => rentalsList.filter((r: any) => (r.status || '').toLowerCase() === st).length;

        setStats({
          total: rentalStats.total || rentalStats.totalOffers || rentalStats.totalRentals || rentalsList.length || 0,
          active: rentalStats.active || rentalStats.activeOffers || rentalStats.activeRentals || countByStatus('active') || 0,
          approved: rentalStats.approved || rentalStats.approvedOffers || rentalStats.approvedRentals || countByStatus('approved') || 0,
          pending: rentalStats.pending || rentalStats.pendingOffers || rentalStats.pendingRentals || countByStatus('pending') || 0,
          suspended: rentalStats.suspended || rentalStats.suspendedOffers || rentalStats.suspendedRentals || countByStatus('suspended') || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching rental data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, page]);

  useEffect(() => { setPage(1); }, [activeTab]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(true); };

  const handleApprove = async (offerId: string) => {
    try { await adminApi.approveRentalOffer(offerId); fetchData(true); }
    catch (e) { console.error('Approve error:', e); }
  };

  const handleSuspend = async (offerId: string) => {
    try { await adminApi.suspendRentalOffer(offerId); fetchData(true); }
    catch (e) { console.error('Suspend error:', e); }
  };

  const formatDate = (d: string) => {
    if (!d) return 'N/A';
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'active') return styles.statusActive;
    if (s === 'pending') return styles.statusPending;
    if (s === 'expired') return styles.statusExpired;
    if (s === 'suspended') return styles.statusSuspended;
    return {};
  };

  const statItems = [
    { label: 'Total', value: stats.total, color: COLORS.primary, icon: KeyRound },
    { label: 'Approved', value: stats.approved || stats.active, color: '#00B894', icon: CheckCircle },
    { label: 'Pending', value: stats.pending, color: '#F39C12', icon: Clock },
    { label: 'Suspended', value: stats.suspended, color: '#E74C3C', icon: Shield },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Hero Header */}
      <ImageBackground source={require('../../../assets/rentalm.png')} style={styles.heroHeader} resizeMode="cover">
        <View style={styles.heroOverlay} />
        <BlurView intensity={20} tint="dark" style={styles.heroBlur}>
          <View style={styles.heroNav}>
            <TouchableOpacity style={styles.heroBackBtn} onPress={() => navigation.goBack()}>
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroTitle}>Rental Management</Text>
              <Text style={styles.heroSubtitle}>
                {totalRentals > 0 ? `${totalRentals.toLocaleString()} total rentals` : 'Manage all vehicle rentals'}
              </Text>
            </View>
            <View style={{ width: 38 }} />
          </View>
        </BlurView>
      </ImageBackground>

      {/* Floating Stats Strip */}
      <View style={styles.statsStrip}>
        {statItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <View key={idx} style={styles.statsStripItem}>
              <View style={[styles.statsStripIcon, { backgroundColor: item.color + '15' }]}>
                <Icon size={16} color={item.color} />
              </View>
              <Text style={[styles.statsStripValue, { color: item.color }]}>{formatNumber(item.value)}</Text>
              <Text style={styles.statsStripLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity key={tab} style={[styles.tab, isActive && { backgroundColor: COLORS.primary }]} activeOpacity={0.7} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
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

        {/* Rental Cards */}
        <View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading rentals...</Text>
            </View>
          ) : rentals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}><Inbox size={48} color="#CBD5E1" /></View>
              <Text style={styles.emptyTitle}>No Rentals Found</Text>
              <Text style={styles.emptyText}>No rental offers match the selected filter.</Text>
            </View>
          ) : (
            rentals.map((rental: any) => {
              const offerId = rental.offerId || rental._id || rental.id;
              const ownerName = rental.ownerName || rental.user?.name || rental.owner?.name || 'Unknown';
              const veh = rental.vehicle;
              const vehicle = typeof veh === 'string'
                ? veh
                : veh?.model || veh?.brand
                  ? `${veh.type || veh.brand || 'Vehicle'}${veh.model ? ` ${veh.model}` : ''}${veh.year ? ` (${veh.year})` : ''}`
                  : rental.vehicleModel || 'N/A';
              const vehicleNum = (typeof veh === 'object' ? veh?.number || veh?.registrationNumber : '') || rental.vehicleNumber || '';
              const loc = rental.location;
              const location = typeof loc === 'string' ? loc : loc?.city || loc?.address || rental.city || 'N/A';
              const date = rental.availableFrom || rental.startDate || rental.createdAt;
              const endDate = rental.availableTo || rental.endDate;
              const rawPrice = rental.pricePerHour || rental.pricePerDay || rental.price || 0;
              const price = typeof rawPrice === 'object' ? (rawPrice.amount || rawPrice.value || 0) : rawPrice;
              const priceUnit = rental.pricePerHour ? '/hour' : rental.pricePerDay ? '/day' : '';
              const status = rental.status || 'active';

              return (
                <View key={offerId} style={[styles.rentalCard, styles.rentalCardSpacing]}>
                  <View style={styles.rentalCardHeader}>
                    <View style={styles.rentalCardHeaderLeft}>
                      <View style={styles.rentalIconWrap}><KeyRound size={20} color={COLORS.primary} /></View>
                      <View style={styles.rentalHeaderText}>
                        <Text style={styles.rentalOwnerName}>{ownerName}</Text>
                        <Text style={styles.rentalIdText}>ID: {offerId}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, getStatusBadgeStyle(status)]}>
                      <Text style={styles.statusBadgeText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                    </View>
                  </View>

                  <View style={styles.rentalDetails}>
                    <View style={styles.detailRow}>
                      <KeyRound size={16} color={COLORS.textSecondary} style={styles.detailIcon} />
                      <Text style={styles.detailValue} numberOfLines={1}>{vehicle}{vehicleNum ? ` • ${vehicleNum}` : ''}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MapPin size={16} color={COLORS.textSecondary} style={styles.detailIcon} />
                      <Text style={styles.detailValue} numberOfLines={1}>{location}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Calendar size={16} color={COLORS.textSecondary} style={styles.detailIcon} />
                      <Text style={styles.detailValue} numberOfLines={1}>{formatDate(date)}{endDate ? ` - ${formatDate(endDate)}` : ''}</Text>
                    </View>
                  </View>

                  <View style={styles.rentalFooter}>
                    <View style={styles.priceBadge}>
                      <Text style={styles.priceText}>{typeof price === 'number' ? `₹${price}${priceUnit}` : price}</Text>
                    </View>
                    <View style={styles.rentalActions}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('RentalDetails' as never, { rentalId: offerId } as never)}>
                        <Text style={styles.actionBtnText}>View Details</Text>
                        <ChevronRight size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                      {status === 'pending' && (
                        <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(offerId)}>
                          <CheckCircle size={16} color="#fff" />
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                      )}
                      {status !== 'suspended' && (
                        <TouchableOpacity style={[styles.actionBtn, styles.suspendBtn]} onPress={() => handleSuspend(offerId)}>
                          <AlertCircle size={16} color={COLORS.error} />
                          <Text style={styles.suspendBtnText}>Suspend</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Pagination */}
        {!loading && rentals.length > 0 && (
          <>
            <View style={styles.paginationRow}>
              <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} onPress={() => page > 1 && setPage(page - 1)} disabled={page === 1}>
                <Text style={styles.pageBtnText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.paginationInfo}>Page {page}</Text>
              <TouchableOpacity style={[styles.pageBtn, rentals.length < 20 && styles.pageBtnDisabled]} onPress={() => rentals.length >= 20 && setPage(page + 1)} disabled={rentals.length < 20}>
                <Text style={styles.pageBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.totalInfo}>{totalRentals > 0 ? `${totalRentals.toLocaleString()} total rentals` : `${rentals.length} rentals shown`}</Text>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  heroHeader: { height: Platform.OS === 'android' ? 140 + (StatusBar.currentHeight || 0) : 160, width: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 52, 96, 0.5)' },
  heroBlur: { flex: 1, justifyContent: 'flex-end', paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg },
  heroNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBackBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  heroTitleWrap: { alignItems: 'center' },
  heroTitle: { fontFamily: FONTS.regular, fontSize: 20, color: '#fff', fontWeight: '700' },
  heroSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statsStrip: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: SPACING.lg, marginTop: -SPACING.md, borderRadius: 14, padding: SPACING.sm, ...SHADOWS.sm, zIndex: 10 },
  statsStripItem: { flex: 1, alignItems: 'center', paddingVertical: SPACING.xs },
  statsStripIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  statsStripValue: { fontFamily: FONTS.regular, fontSize: 18, fontWeight: '800' },
  statsStripLabel: { fontFamily: FONTS.regular, fontSize: 10, color: '#94A3B8', fontWeight: '500', marginTop: 1 },
  tabsScroll: { marginTop: SPACING.md, maxHeight: 48 },
  tabsContent: { paddingHorizontal: SPACING.lg, gap: SPACING.xs },
  tab: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  tabText: { fontFamily: FONTS.regular, fontSize: 13, color: '#475569', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingTop: SPACING.md },
  loadingContainer: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  loadingText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.md },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  emptyTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.lg, fontWeight: '700', color: '#1E293B', marginBottom: SPACING.xs },
  emptyText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: '#94A3B8' },
  rentalCardSpacing: { marginBottom: SPACING.sm },
  rentalCard: { borderRadius: 14, borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#fff', padding: SPACING.md, ...SHADOWS.sm },
  rentalCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rentalCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rentalIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary + '12', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  rentalHeaderText: { flex: 1 },
  rentalOwnerName: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  rentalIdText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm, backgroundColor: '#F1F5F9' },
  statusActive: { backgroundColor: '#00B894' + '15' },
  statusPending: { backgroundColor: '#F39C12' + '15' },
  statusExpired: { backgroundColor: '#94A3B8' + '15' },
  statusSuspended: { backgroundColor: '#E74C3C' + '15' },
  statusBadgeText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.text },
  rentalDetails: { marginBottom: SPACING.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  detailIcon: { marginRight: SPACING.sm },
  detailValue: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.text, flex: 1 },
  rentalFooter: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: SPACING.md },
  priceBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.primary + '12', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm, marginBottom: SPACING.md },
  priceText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.primary },
  rentalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primary + '15', gap: 6 },
  actionBtnText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.primary },
  approveBtn: { backgroundColor: '#00B894' },
  approveBtnText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '600', color: '#fff' },
  suspendBtn: { backgroundColor: '#E74C3C' + '15' },
  suspendBtnText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '600', color: '#E74C3C' },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.lg },
  pageBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F1F5F9' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  paginationInfo: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  totalInfo: { fontFamily: FONTS.regular, fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.xs },
});

export default RentalManagementScreen;
