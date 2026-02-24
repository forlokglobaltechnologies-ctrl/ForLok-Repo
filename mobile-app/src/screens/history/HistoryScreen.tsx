import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Car, Bike, Key, ChevronRight, Star, Link2, Navigation } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { normalize, wp, hp } from '@utils/responsive';
import { FONTS } from '@constants/theme';
import { useTheme } from '@context/ThemeContext';
import { useAuth } from '@context/AuthContext';
import { bookingApi } from '@utils/apiClient';

const shorten = (addr: string, maxLen = 30): string => {
  if (!addr || addr === 'N/A') return 'Unknown';
  const parts = addr.split(',');
  const short = parts[0].trim();
  return short.length > maxLen ? short.substring(0, maxLen) + '...' : short;
};

const HistoryScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const tabs = ['Upcoming', 'Completed', 'Cancelled'];

  const loadBookings = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const response = await bookingApi.getBookings();

      if (response.success && response.data) {
        const bookingsData = response.data.bookings || response.data || [];

        const mapped = bookingsData.map((b: any) => {
          const rawDate = b.date || '';
          const fmtDate = rawDate
            ? new Date(rawDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            : '';
          const fmtTime = b.time || (rawDate ? new Date(rawDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '');
          return {
            ...b,
            id: b.bookingId || b._id,
            bookingId: b.bookingId || b._id,
            type: b.serviceType || 'pooling',
            status: b.status || 'pending',
            date: fmtDate,
            time: fmtTime,
            from: typeof b.route?.from === 'string' ? b.route.from : b.route?.from?.address || 'N/A',
            to: typeof b.route?.to === 'string' ? b.route.to : b.route?.to?.address || 'N/A',
            vehicleBrand: b.vehicle?.brand || '',
            vehicleNumber: b.vehicle?.number || '',
            vehicleType: b.vehicle?.type || 'car',
            amount: b.totalAmount || b.amount || 0,
            totalAmount: b.totalAmount || b.amount || 0,
            platformFee: b.platformFee || 0,
            connectedGroupId: b.connectedGroupId || null,
            legOrder: b.legOrder || null,
            connectionPoint: b.connectionPoint || null,
          };
        });

        const connectedGroups = new Map<string, any[]>();
        const standalone: any[] = [];
        for (const b of mapped) {
          if (b.connectedGroupId) {
            const group = connectedGroups.get(b.connectedGroupId) || [];
            group.push(b);
            connectedGroups.set(b.connectedGroupId, group);
          } else {
            standalone.push(b);
          }
        }

        const grouped: any[] = [...standalone];
        connectedGroups.forEach((legs, groupId) => {
          legs.sort((a: any, b: any) => (a.legOrder || 0) - (b.legOrder || 0));
          const leg1 = legs[0];
          const leg2 = legs[1];
          const combinedAmount = legs.reduce((sum: number, l: any) => sum + (l.totalAmount || l.amount || 0), 0);
          grouped.push({
            ...leg1,
            id: groupId,
            _isConnectedGroup: true,
            legs,
            combinedAmount,
            from: leg1?.from || 'N/A',
            to: leg2?.to || leg1?.to || 'N/A',
            transferCity: leg1?.connectionPoint?.city || leg1?.connectionPoint?.address?.split(',')?.[0] || 'Transfer',
          });
        });

        setBookings(grouped);
      } else {
        setBookings([]);
      }
    } catch (error: any) {
      console.error('Error loading bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadBookings(); }, []);
  useFocusEffect(React.useCallback(() => { loadBookings(); }, []));

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings(true);
  };

  const filterFn = (b: any) => {
    if (activeTab === 'Upcoming') return b.status === 'confirmed' || b.status === 'pending' || b.status === 'in_progress';
    if (activeTab === 'Completed') return b.status === 'completed';
    if (activeTab === 'Cancelled') return b.status === 'cancelled';
    return true;
  };

  const filteredBookings = bookings.filter(filterFn);

  const getTabCount = (tab: string) => {
    const fn = (b: any) => {
      if (tab === 'Upcoming') return b.status === 'confirmed' || b.status === 'pending' || b.status === 'in_progress';
      if (tab === 'Completed') return b.status === 'completed';
      if (tab === 'Cancelled') return b.status === 'cancelled';
      return true;
    };
    return bookings.filter(fn).length;
  };

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'confirmed': return { color: '#1976D2', label: 'Confirmed' };
      case 'pending': return { color: '#F57C00', label: 'Pending' };
      case 'in_progress': return { color: '#2E7D32', label: 'In Progress' };
      case 'completed': return { color: '#2E7D32', label: 'Completed' };
      case 'cancelled': return { color: '#C62828', label: 'Cancelled' };
      default: return { color: '#757575', label: status };
    }
  };

  const VehicleIcon = ({ type, size = 18 }: { type: string; size?: number }) => {
    if (type === 'bike') return <Bike size={size} color={theme.colors.textSecondary} />;
    if (type === 'scooty') return <MaterialCommunityIcons name="moped" size={size} color={theme.colors.textSecondary} />;
    return <Car size={size} color={theme.colors.textSecondary} />;
  };

  const renderCard = ({ item: b }: { item: any }) => {
    const isConnected = b._isConnectedGroup;
    const isPooling = b.type === 'pooling';
    const st = isConnected
      ? getStatusMeta(b.legs?.find((l: any) => l.status === 'cancelled')?.status || b.legs?.find((l: any) => l.status === 'in_progress')?.status || b.legs?.[0]?.status || 'pending')
      : getStatusMeta(b.status);
    const amount = isConnected ? b.combinedAmount : b.amount;
    const isLive = isConnected
      ? b.legs?.some((l: any) => l.status === 'in_progress')
      : b.status === 'in_progress';

    const onPress = () => {
      if (isConnected) {
        navigation.navigate('BookingDetails' as never, { bookingId: b.legs?.[0]?.bookingId, booking: b.legs?.[0], connectedLegs: b.legs } as never);
      } else {
        navigation.navigate('BookingDetails' as never, { bookingId: b.bookingId, booking: b } as never);
      }
    };

    return (
      <TouchableOpacity
        key={b.id}
        activeOpacity={0.6}
        onPress={onPress}
        style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      >
        {/* Row 1: Icon + Route + Amount */}
        <View style={s.cardMain}>
          <View style={[s.iconCircle, { backgroundColor: isConnected ? '#E8EAF6' : (isPooling ? theme.colors.primary + '12' : '#FFF3E0') }]}>
            {isConnected
              ? <Link2 size={18} color="#3F51B5" />
              : isPooling
                ? <VehicleIcon type={b.vehicleType} />
                : <Key size={18} color="#E65100" />}
          </View>

          <View style={s.cardBody}>
            <View style={s.routeRow}>
              <Text style={[s.locationText, { color: theme.colors.text }]} numberOfLines={1}>
                {shorten(b.from)}
              </Text>
              <View style={s.arrowWrap}>
                <View style={[s.arrowLine, { backgroundColor: theme.colors.border }]} />
                <Navigation size={10} color={theme.colors.textSecondary} style={{ transform: [{ rotate: '90deg' }] }} />
              </View>
              <Text style={[s.locationText, { color: theme.colors.text }]} numberOfLines={1}>
                {shorten(isConnected ? b.to : b.to)}
              </Text>
            </View>

            {isConnected && (
              <Text style={[s.transferLabel, { color: '#FF9800' }]}>
                via {b.transferCity} · 2 legs
              </Text>
            )}

            <View style={s.metaRow}>
              <Text style={[s.metaText, { color: theme.colors.textSecondary }]}>
                {isConnected ? 'Connected' : isPooling ? 'Pooling' : 'Rental'}
              </Text>
              <View style={s.metaDot} />
              <Text style={[s.metaText, { color: theme.colors.textSecondary }]}>
                {b.date}{b.time ? ` · ${b.time}` : ''}
              </Text>
              {b.vehicleBrand && !isConnected ? (
                <>
                  <View style={s.metaDot} />
                  <Text style={[s.metaText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {b.vehicleBrand}
                  </Text>
                </>
              ) : null}
            </View>
          </View>

          <View style={s.amountCol}>
            {amount > 0 && (
              <Text style={[s.amountText, { color: theme.colors.text }]}>
                ₹{Math.round(amount)}
              </Text>
            )}
            <ChevronRight size={16} color={theme.colors.border} style={{ marginTop: normalize(2) }} />
          </View>
        </View>

        {/* Row 2: Status bar */}
        <View style={[s.statusBar, { borderTopColor: theme.colors.border + '60' }]}>
          {isLive ? (
            <View style={s.liveBadge}>
              <View style={s.liveDot} />
              <Text style={s.liveLabel}>Live</Text>
            </View>
          ) : (
            <Text style={[s.statusLabel, { color: st.color }]}>{st.label}</Text>
          )}

          {b.status === 'completed' && !isConnected && (
            <TouchableOpacity
              style={s.rateBtn}
              onPress={() => navigation.navigate('Rating' as never, { booking: b } as never)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Star size={13} color="#F9A825" />
              <Text style={s.rateLabel}>Rate</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>My Rides</Text>
      </View>

      {/* ── Tabs ── */}
      <View style={[s.tabRow, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        {tabs.map((tab) => {
          const active = activeTab === tab;
          const count = getTabCount(tab);
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[s.tab, active && s.tabActive, active && { borderBottomColor: theme.colors.primary }]}
            >
              <Text style={[s.tabText, { color: theme.colors.textSecondary }, active && { color: theme.colors.primary }]}>
                {tab}
              </Text>
              {count > 0 && (
                <View style={[s.tabBadge, { backgroundColor: active ? theme.colors.primary : theme.colors.border }]}>
                  <Text style={[s.tabBadgeText, { color: active ? '#FFF' : theme.colors.textSecondary }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={s.center}>
          <View style={[s.emptyCircle, { backgroundColor: theme.colors.border + '40' }]}>
            <Car size={28} color={theme.colors.textSecondary} />
          </View>
          <Text style={[s.emptyTitle, { color: theme.colors.text }]}>No {activeTab.toLowerCase()} rides</Text>
          <Text style={[s.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Your rides will appear here once you book
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        />
      )}

    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: normalize(48),
    paddingBottom: normalize(14),
    paddingHorizontal: normalize(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: normalize(36),
    height: normalize(36),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: normalize(8),
  },
  headerTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(22),
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: normalize(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(5),
    paddingVertical: normalize(12),
    paddingHorizontal: normalize(14),
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(13.5),
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: normalize(5),
  },
  tabBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(10.5),
    fontWeight: '700',
  },

  listContent: {
    paddingHorizontal: normalize(16),
    paddingTop: normalize(12),
    paddingBottom: normalize(100),
  },

  card: {
    borderRadius: normalize(12),
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: normalize(10),
    overflow: 'hidden',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: normalize(14),
    gap: normalize(12),
  },
  iconCircle: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: normalize(2),
  },
  cardBody: {
    flex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(6),
    marginBottom: normalize(4),
  },
  locationText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(14),
    fontWeight: '600',
    flexShrink: 1,
  },
  arrowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(2),
    paddingHorizontal: normalize(2),
  },
  arrowLine: {
    width: normalize(12),
    height: 1.5,
    borderRadius: 1,
  },
  transferLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    marginBottom: normalize(4),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: normalize(4),
    marginTop: normalize(2),
  },
  metaText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11.5),
  },
  metaDot: {
    width: normalize(3),
    height: normalize(3),
    borderRadius: normalize(1.5),
    backgroundColor: '#BDBDBD',
  },
  amountCol: {
    alignItems: 'flex-end',
    paddingTop: normalize(2),
  },
  amountText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(15),
    fontWeight: '700',
  },

  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(9),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusLabel: {
    fontFamily: FONTS.medium,
    fontSize: normalize(11.5),
    fontWeight: '600',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(5),
    backgroundColor: '#E8F5E9',
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(3),
    borderRadius: normalize(6),
  },
  liveDot: {
    width: normalize(6),
    height: normalize(6),
    borderRadius: normalize(3),
    backgroundColor: '#4CAF50',
  },
  liveLabel: {
    fontFamily: FONTS.medium,
    fontSize: normalize(11),
    fontWeight: '700',
    color: '#2E7D32',
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(4),
    backgroundColor: '#FFF8E1',
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(4),
    borderRadius: normalize(6),
  },
  rateLabel: {
    fontFamily: FONTS.medium,
    fontSize: normalize(11),
    fontWeight: '700',
    color: '#F9A825',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: normalize(80),
  },
  emptyCircle: {
    width: normalize(64),
    height: normalize(64),
    borderRadius: normalize(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: normalize(16),
  },
  emptyTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(16),
    fontWeight: '700',
    marginBottom: normalize(4),
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    textAlign: 'center',
    paddingHorizontal: normalize(40),
  },
});

export default HistoryScreen;
