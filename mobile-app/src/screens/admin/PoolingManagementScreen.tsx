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
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  Car,
  CheckCircle,
  Clock,
  Shield,
  MapPin,
  Calendar,
  Users,
  ChevronRight,
  Inbox,
  AlertCircle,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { normalize, wp, hp } from '@utils/responsive';
import { adminApi, analyticsApi } from '@utils/apiClient';
import useMasterData from '../../hooks/useMasterData';

const formatNumber = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

const PoolingManagementScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('all');
  const [offers, setOffers] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, suspended: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalOffers, setTotalOffers] = useState(0);
  const { items: poolingStatusItems } = useMasterData('pooling_offer_status', [
    { type: 'pooling_offer_status', key: 'active', label: 'Active' },
    { type: 'pooling_offer_status', key: 'pending', label: 'Pending' },
    { type: 'pooling_offer_status', key: 'expired', label: 'Expired' },
    { type: 'pooling_offer_status', key: 'suspended', label: 'Suspended' },
  ]);

  const getTabMeta = (key: string) => {
    const map: Record<string, { icon: any; color: string }> = {
      all: { icon: Inbox, color: '#F99E3C' },
      active: { icon: CheckCircle, color: '#00B894' },
      pending: { icon: Clock, color: '#F39C12' },
      expired: { icon: AlertCircle, color: '#94A3B8' },
      suspended: { icon: Shield, color: '#E74C3C' },
    };
    return map[key] || { icon: Inbox, color: '#94A3B8' };
  };

  const tabs = [
    { key: 'all', label: 'All', ...getTabMeta('all') },
    ...poolingStatusItems.map((item: any) => {
      const key = String(item.value || item.key || '').toLowerCase();
      const label = String(item.label || item.value || item.key || key);
      return { key, label, ...getTabMeta(key) };
    }).filter((item: any) => item.key),
  ];

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const params: any = { page, limit: 20 };
      if (activeTab !== 'all') params.status = activeTab;

      const [offersRes, statsRes] = await Promise.all([
        adminApi.getPoolingOffers(params),
        analyticsApi.getPoolingStats(),
      ]);

      if (offersRes.success && offersRes.data) {
        const d = offersRes.data;
        setOffers(d.offers || d.data || (Array.isArray(d) ? d : []));
        setTotalOffers(d.total || d.totalCount || 0);
      }

      if (statsRes.success && statsRes.data) {
        const s = statsRes.data;
        setStats({
          total: s.totalTrips || s.total || 0,
          active: s.activeOffers || s.active || 0,
          pending: s.pendingOffers || s.pending || 0,
          suspended: s.suspendedOffers || s.suspended || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching pooling data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, page]);

  useEffect(() => { setPage(1); }, [activeTab]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(true); };

  const handleApprove = async (offerId: string) => {
    try {
      await adminApi.approvePoolingOffer(offerId);
      fetchData(true);
    } catch (e) { console.error('Approve error:', e); }
  };

  const handleSuspend = async (offerId: string) => {
    try {
      await adminApi.suspendPoolingOffer(offerId);
      fetchData(true);
    } catch (e) { console.error('Suspend error:', e); }
  };

  const formatDate = (d: string) => {
    if (!d) return 'N/A';
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const statItems = [
    { label: 'Total', value: stats.total, color: '#F99E3C', icon: Car },
    { label: 'Active', value: stats.active, color: '#00B894', icon: CheckCircle },
    { label: 'Pending', value: stats.pending, color: '#F39C12', icon: Clock },
    { label: 'Suspended', value: stats.suspended, color: '#E74C3C', icon: Shield },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Hero Header */}
      <ImageBackground source={require('../../../assets/poolingm.png')} style={styles.heroHeader} resizeMode="cover">
        <View style={styles.heroOverlay} />
        <BlurView intensity={20} tint="dark" style={styles.heroBlur}>
          <View style={styles.heroNav}>
            <TouchableOpacity style={styles.heroBackBtn} onPress={() => navigation.goBack()}>
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroTitle}>Pooling Management</Text>
              <Text style={styles.heroSubtitle}>
                {totalOffers > 0 ? `${totalOffers.toLocaleString()} total offers` : 'Manage pooling offers'}
              </Text>
            </View>
            <View style={{ width: normalize(38) }} />
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
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <TouchableOpacity key={tab.key} style={[styles.tab, isActive && { backgroundColor: tab.color }]} activeOpacity={0.7} onPress={() => setActiveTab(tab.key)}>
              <Icon size={14} color={isActive ? '#fff' : tab.color} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Offer Cards */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading offers...</Text>
          </View>
        ) : offers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}><Inbox size={48} color="#CBD5E1" /></View>
            <Text style={styles.emptyTitle}>No Offers Found</Text>
            <Text style={styles.emptyText}>No pooling offers match the selected filter.</Text>
          </View>
        ) : (
          offers.map((offer: any) => {
            const offerId = offer.offerId || offer._id || offer.id;
            const driverName = offer.driverName || offer.user?.name || offer.driver?.name || 'Unknown';
            const fromObj = offer.from || offer.route?.from || offer.fromLocation;
            const toObj = offer.to || offer.route?.to || offer.toLocation;
            const fromCity = typeof fromObj === 'string' ? fromObj : (fromObj?.city || fromObj?.address || '');
            const toCity = typeof toObj === 'string' ? toObj : (toObj?.city || toObj?.address || '');
            const route = fromCity && toCity
              ? `${fromCity} → ${toCity}`
              : (typeof offer.route === 'string' ? offer.route : offer.description || 'N/A');
            const veh = offer.vehicle;
            const vehicle = typeof veh === 'string'
              ? veh
              : veh?.model || veh?.brand
                ? `${veh.type || veh.brand || 'Vehicle'}${veh.model ? ` ${veh.model}` : ''}${veh.year ? ` (${veh.year})` : ''}`
                : offer.vehicleType || 'N/A';
            const seatsAvailable = offer.seatsAvailable ?? offer.availableSeats ?? '?';
            const totalSeats = offer.totalSeats ?? offer.seats ?? '?';
            const rawPrice = offer.pricePerSeat || offer.price || 0;
            const price = typeof rawPrice === 'object' ? (rawPrice.amount || rawPrice.value || 0) : rawPrice;
            const status = offer.status || 'active';
            const date = offer.departureDate || offer.departureTime || offer.createdAt;

            return (
              <View key={offerId} style={styles.offerCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.cardServiceIcon, { backgroundColor: '#F99E3C' + '15' }]}>
                    <Car size={20} color="#F99E3C" />
                  </View>
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardDriverName}>{driverName}</Text>
                    <Text style={styles.cardOfferId}>{offerId}</Text>
                  </View>
                  <View style={[styles.statusBadge, status === 'active' && styles.statusActive, status === 'pending' && styles.statusPending]}>
                    <Text style={styles.statusText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <MapPin size={14} color="#64748B" />
                    <Text style={styles.detailText} numberOfLines={1}>{route}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Calendar size={14} color="#64748B" />
                    <Text style={styles.detailText} numberOfLines={1}>{formatDate(date)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Car size={14} color="#64748B" />
                    <Text style={styles.detailText} numberOfLines={1}>{vehicle}</Text>
                  </View>
                  <View style={styles.detailMeta}>
                    <View style={styles.detailMetaItem}>
                      <Users size={12} color="#94A3B8" />
                      <Text style={styles.detailMetaText}>{seatsAvailable}/{totalSeats}</Text>
                    </View>
                    <Text style={styles.priceText}>{typeof price === 'number' ? `₹${price}` : price}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('PoolingOfferDetails' as never, { offerId } as never)}>
                    <Text style={styles.actionButtonText}>View Details</Text>
                    <ChevronRight size={14} color="#F99E3C" />
                  </TouchableOpacity>
                  {status === 'pending' && (
                    <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => handleApprove(offerId)}>
                      <CheckCircle size={14} color="#fff" />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                  )}
                  {status !== 'suspended' && (
                    <TouchableOpacity style={[styles.actionButton, styles.suspendButton]} onPress={() => handleSuspend(offerId)}>
                      <AlertCircle size={14} color="#E74C3C" />
                      <Text style={styles.suspendButtonText}>Suspend</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}

        {!loading && offers.length > 0 && (
          <>
            <View style={styles.paginationRow}>
              <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} onPress={() => page > 1 && setPage(page - 1)} disabled={page === 1}>
                <Text style={styles.pageBtnText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.paginationInfo}>Page {page}</Text>
              <TouchableOpacity style={[styles.pageBtn, offers.length < 20 && styles.pageBtnDisabled]} onPress={() => offers.length >= 20 && setPage(page + 1)} disabled={offers.length < 20}>
                <Text style={styles.pageBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.totalInfo}>{totalOffers > 0 ? `${totalOffers.toLocaleString()} total offers` : `${offers.length} offers shown`}</Text>
          </>
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
  statsStrip: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: SPACING.lg, marginTop: -SPACING.md, borderRadius: normalize(14), padding: SPACING.sm, ...SHADOWS.sm, zIndex: 10 },
  statsStripItem: { flex: 1, alignItems: 'center', paddingVertical: SPACING.xs },
  statsStripIcon: { width: normalize(32), height: normalize(32), borderRadius: normalize(10), justifyContent: 'center', alignItems: 'center', marginBottom: normalize(4) },
  statsStripValue: { fontFamily: FONTS.regular, fontSize: normalize(18), fontWeight: '800' },
  statsStripLabel: { fontFamily: FONTS.regular, fontSize: normalize(10), color: '#94A3B8', fontWeight: '500', marginTop: normalize(1) },
  tabsScroll: { marginTop: SPACING.md, maxHeight: normalize(48) },
  tabsContent: { paddingHorizontal: SPACING.lg, gap: SPACING.xs },
  tab: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), paddingHorizontal: normalize(14), paddingVertical: normalize(8), borderRadius: normalize(20), backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  tabText: { fontFamily: FONTS.regular, fontSize: normalize(12), color: '#475569', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingTop: SPACING.md },
  loadingContainer: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  loadingText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.md },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  emptyIconWrap: { width: normalize(80), height: normalize(80), borderRadius: normalize(40), backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  emptyTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.lg, fontWeight: '700', color: '#1E293B', marginBottom: SPACING.xs },
  emptyText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: '#94A3B8' },
  offerCard: { backgroundColor: '#fff', borderRadius: normalize(14), padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: '#F1F5F9', ...SHADOWS.sm },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  cardServiceIcon: { width: normalize(40), height: normalize(40), borderRadius: normalize(12), justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  cardHeaderInfo: { flex: 1 },
  cardDriverName: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, color: '#1E293B', fontWeight: '600', marginBottom: normalize(2) },
  cardOfferId: { fontFamily: FONTS.regular, fontSize: normalize(11), color: '#94A3B8', fontWeight: '500' },
  statusBadge: { paddingHorizontal: normalize(10), paddingVertical: normalize(4), borderRadius: normalize(10), backgroundColor: '#F1F5F9' },
  statusActive: { backgroundColor: '#00B894' + '15' },
  statusPending: { backgroundColor: '#F39C12' + '15' },
  statusText: { fontFamily: FONTS.regular, fontSize: normalize(10), color: '#64748B', fontWeight: '700' },
  detailsRow: { marginBottom: SPACING.md },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), marginBottom: normalize(6) },
  detailText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: '#64748B', flex: 1 },
  detailMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.xs, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  detailMetaItem: { flexDirection: 'row', alignItems: 'center', gap: normalize(4) },
  detailMetaText: { fontFamily: FONTS.regular, fontSize: normalize(12), color: '#94A3B8', fontWeight: '500' },
  priceText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: '#1E293B', fontWeight: '700' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md, backgroundColor: '#F99E3C' + '15', gap: normalize(6) },
  actionButtonText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: '#F99E3C', fontWeight: '600' },
  approveButton: { backgroundColor: '#00B894' },
  approveButtonText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: '#fff', fontWeight: '600' },
  suspendButton: { backgroundColor: '#E74C3C' + '15' },
  suspendButtonText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: '#E74C3C', fontWeight: '600' },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.lg },
  pageBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.sm, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F1F5F9' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  paginationInfo: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  totalInfo: { fontFamily: FONTS.regular, fontSize: normalize(12), color: '#94A3B8', textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.xs },
});

export default PoolingManagementScreen;
