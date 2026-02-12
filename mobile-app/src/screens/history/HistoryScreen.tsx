import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Calendar, Search, Car, Key, Clock, MapPin, ArrowRight, ChevronRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { normalize, wp, hp } from '@utils/responsive';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { BottomTabNavigator } from '@components/navigation/BottomTabNavigator';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { bookingApi, rentalApi } from '@utils/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HistoryScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('All');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const tabs = [t('history.all'), t('history.upcoming'), t('history.past'), t('history.cancelled')];

  const loadBookings = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading bookings...');

      const response = await bookingApi.getBookings();
      
      if (response.success && response.data) {
        const bookingsData = response.data.bookings || response.data || [];
        
        // Map backend booking format to UI format
        const mappedBookings = bookingsData.map((booking: any) => ({
          id: booking.bookingId || booking._id,
          bookingId: booking.bookingId || booking._id,
          type: booking.serviceType || 'pooling',
          status: booking.status || 'pending',
          date: booking.date ? new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
          time: booking.time || new Date(booking.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          route: booking.route ? {
            from: typeof booking.route.from === 'string' ? booking.route.from : booking.route.from?.address || 'N/A',
            to: typeof booking.route.to === 'string' ? booking.route.to : booking.route.to?.address || 'N/A',
          } : null,
          vehicle: booking.vehicle ? {
            brand: booking.vehicle.brand || 'N/A',
            number: booking.vehicle.number || 'N/A',
            type: booking.vehicle.type || 'car',
          } : null,
          driver: booking.driver || booking.owner || null,
          duration: booking.duration || null,
          amount: booking.amount || booking.totalAmount || 0,
          paymentMethod: booking.paymentMethod || 'N/A',
          paymentStatus: booking.paymentStatus || 'pending',
          passengers: booking.passengers || [],
          ...booking, // Keep original data for details screen
        }));

        setBookings(mappedBookings);
        console.log(`✅ Loaded ${mappedBookings.length} bookings`);
      } else {
        console.warn('⚠️ No bookings found:', response.error);
        setBookings([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading bookings:', error);
      Alert.alert('Error', `Failed to load bookings: ${error.message || 'Unknown error'}`);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentUserId();
    loadBookings();
  }, []);

  const loadCurrentUserId = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      setCurrentUserId(userId);
    } catch (error) {
      console.error('Error loading current user ID:', error);
    }
  };

  // Reload when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadBookings();
    }, [])
  );

  const getTabKey = (tabLabel: string) => {
    // Map translated labels to keys
    if (tabLabel === t('history.all')) return 'All';
    if (tabLabel === t('history.upcoming')) return 'Upcoming';
    if (tabLabel === t('history.past')) return 'Past';
    if (tabLabel === t('history.cancelled')) return 'Cancelled';
    return tabLabel;
  };

  const filteredBookings = bookings.filter((booking) => {
    const tabKey = getTabKey(activeTab);
    if (tabKey === 'All') return true;
    if (tabKey === 'Upcoming') return booking.status === 'confirmed' || booking.status === 'pending' || booking.status === 'in_progress';
    if (tabKey === 'Past') return booking.status === 'completed';
    if (tabKey === 'Cancelled') return booking.status === 'cancelled';
    return true;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed': return { bg: '#2196F3' + '15', color: '#2196F3' };
      case 'pending': return { bg: '#FF9800' + '15', color: '#FF9800' };
      case 'in_progress': return { bg: '#4CAF50' + '15', color: '#4CAF50' };
      case 'completed': return { bg: '#4CAF50' + '15', color: '#4CAF50' };
      case 'cancelled': return { bg: '#F44336' + '15', color: '#F44336' };
      default: return { bg: '#9E9E9E' + '15', color: '#9E9E9E' };
    }
  };

  const getFromText = (booking: any) => {
    if (!booking.route) return 'N/A';
    return typeof booking.route.from === 'string' ? booking.route.from : booking.route.from?.address || 'N/A';
  };

  const getToText = (booking: any) => {
    if (!booking.route) return 'N/A';
    return typeof booking.route.to === 'string' ? booking.route.to : booking.route.to?.address || 'N/A';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ImageBackground
        source={require('../../../assets/history.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.overlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={50} style={styles.blurContainer}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.iconButton}
            >
              <ArrowLeft size={20} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('history.title')}</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconButton}>
                <Calendar size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Search size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </ImageBackground>

      <View style={[styles.tabs, { backgroundColor: theme.colors.surface }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && [styles.activeTab, { borderBottomColor: theme.colors.primary }]]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === tab && { color: theme.colors.primary, fontWeight: '700' }]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading bookings...</Text>
          </View>
        ) : filteredBookings.length > 0 ? (
          filteredBookings.map((booking) => {
            const sts = getStatusStyle(booking.status);
            return (
              <TouchableOpacity
                key={booking.id || booking.bookingId}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('BookingDetails' as never, {
                  bookingId: booking.bookingId || booking.id,
                  booking: booking,
                } as never)}
              >
                <View style={[styles.bookingCard, { backgroundColor: theme.colors.surface }]}>
                  {/* Card Header */}
                  <View style={[styles.bookingHeader, { borderBottomColor: theme.colors.border }]}>
                    <View style={[styles.typeIcon, { backgroundColor: theme.colors.primary + '12' }]}>
                      {booking.type === 'pooling' ? (
                        <Car size={18} color={theme.colors.primary} />
                      ) : (
                        <Key size={18} color={theme.colors.primary} />
                      )}
                    </View>
                    <Text style={[styles.bookingType, { color: theme.colors.text }]}>
                      {booking.type === 'pooling' ? t('history.pooling') : t('history.rental')}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: sts.bg }]}>
                      <Text style={[styles.statusPillText, { color: sts.color }]}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  {/* Route Display */}
                  {booking.route && (
                    <View style={styles.routeSection}>
                      <View style={[styles.routeBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                        <MapPin size={14} color={theme.colors.primary} />
                        <Text style={[styles.routeText, { color: theme.colors.text }]} numberOfLines={1}>
                          {getFromText(booking)}
                        </Text>
                      </View>
                      <View style={[styles.routeArrow, { backgroundColor: theme.colors.primary + '15' }]}>
                        <ArrowRight size={14} color={theme.colors.primary} />
                      </View>
                      <View style={[styles.routeBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                        <MapPin size={14} color="#F44336" />
                        <Text style={[styles.routeText, { color: theme.colors.text }]} numberOfLines={1}>
                          {getToText(booking)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Meta Row */}
                  <View style={styles.metaRow}>
                    <View style={[styles.metaChip, { backgroundColor: theme.colors.background }]}>
                      <Calendar size={12} color={theme.colors.primary} />
                      <Text style={[styles.metaChipText, { color: theme.colors.text }]}>{booking.date}</Text>
                    </View>
                    {booking.time && (
                      <View style={[styles.metaChip, { backgroundColor: theme.colors.background }]}>
                        <Clock size={12} color={theme.colors.primary} />
                        <Text style={[styles.metaChipText, { color: theme.colors.text }]}>{booking.time}</Text>
                      </View>
                    )}
                    {booking.vehicle && (
                      <View style={[styles.metaChip, { backgroundColor: theme.colors.background }]}>
                        <Car size={12} color={theme.colors.primary} />
                        <Text style={[styles.metaChipText, { color: theme.colors.text }]}>
                          {booking.vehicle.brand}{booking.vehicle.number ? ` (${booking.vehicle.number})` : ''}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Footer */}
                  <View style={[styles.bookingFooter, { borderTopColor: theme.colors.border }]}>
                    <Button
                      title={t('history.viewDetails')}
                      onPress={() => navigation.navigate('BookingDetails' as never, {
                        bookingId: booking.bookingId || booking.id,
                        booking: booking,
                      } as never)}
                      variant="outline"
                      size="small"
                      style={styles.detailsButton}
                    />
                    {booking.status === 'completed' && (
                      <Button
                        title={t('history.rate')}
                        onPress={() => navigation.navigate('Rating' as never, { booking } as never)}
                        variant="primary"
                        size="small"
                        style={styles.rateButton}
                      />
                    )}
                    <View style={{ marginLeft: 'auto' }}>
                      <ChevronRight size={18} color={theme.colors.textSecondary} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Car size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.text }]}>No bookings found</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              {activeTab === t('history.all')
                ? 'You haven\'t made any bookings yet'
                : `No ${activeTab.toLowerCase()} bookings`}
            </Text>
          </View>
        )}
      </ScrollView>
      <BottomTabNavigator />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ── Header ── */
  headerImage: {
    width: '100%',
    height: hp(18),
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.78,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: normalize(22),
    color: '#FFF',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: normalize(0.4),
  },
  headerRight: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  iconButton: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Tabs ── */
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: normalize(13),
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {},
  tabText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    fontWeight: '500',
  },

  /* ── Scroll ── */
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },

  /* ── Booking Card ── */
  bookingCard: {
    borderRadius: normalize(16),
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  typeIcon: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  bookingType: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: normalize(15),
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(4),
    borderRadius: normalize(20),
  },
  statusPillText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    fontWeight: '700',
    letterSpacing: normalize(0.3),
  },

  /* ── Route Display ── */
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(6),
    marginBottom: SPACING.sm,
  },
  routeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: normalize(12),
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(10),
    gap: normalize(6),
  },
  routeText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    fontWeight: '500',
    lineHeight: normalize(16),
  },
  routeArrow: {
    width: normalize(26),
    height: normalize(26),
    borderRadius: normalize(13),
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Meta Chips ── */
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(8),
    marginBottom: SPACING.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(5),
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(5),
    borderRadius: normalize(20),
  },
  metaChipText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    fontWeight: '500',
  },

  /* ── Footer ── */
  bookingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  detailsButton: {},
  rateButton: {},

  /* ── Empty & Loading ── */
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    marginTop: SPACING.md,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
    gap: SPACING.sm,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(16),
    fontWeight: '600',
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
  },
});

export default HistoryScreen;

