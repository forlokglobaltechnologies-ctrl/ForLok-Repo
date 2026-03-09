import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Car, AlertCircle, X, Clock, MessageCircle, MapPin, ArrowRight, Calendar, Users, Bike, ChevronRight, Play, Eye, Navigation } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { normalize, wp, hp } from '@utils/responsive';
import { COLORS, FONTS, SPACING, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { poolingApi, rentalApi } from '@utils/apiClient';

const OFFER_ACCENT = '#F99E3C';
const OFFER_ACCENT_DARK = '#D47B1B';
const MODAL_BLUE_GRADIENT: [string, string] = ['#F99E3C', '#E08E35'];
const MODAL_ORANGE_GRADIENT: [string, string] = ['#F99E3C', '#E08E35'];

const MyOffersScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('All');
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const tabs = ['All', 'Active', 'In Trip', 'Pending'];

  const loadOffers = async () => {
    try {
      setLoading(true);
      const [poolingResponse, rentalResponse] = await Promise.all([
        poolingApi.getOffers(),
        rentalApi.getOffers(),
      ]);

      const offers: any[] = [];

      if (poolingResponse.success && poolingResponse.data) {
        const poolingOffers = Array.isArray(poolingResponse.data) ? poolingResponse.data : [];
        const poolingMapped = poolingOffers.map((offer: any) => {
          const booked = Math.max(0, (offer.totalSeats || 0) - (offer.availableSeats ?? offer.totalSeats ?? 0));
          const rawDate = offer.date || '';
          const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
          const formattedTime = offer.time || (rawDate ? new Date(rawDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A');
          return {
            ...offer,
            id: offer.offerId || offer._id,
            type: 'pooling',
            offerId: offer.offerId || offer._id,
            route: {
              from: offer.route?.from?.address || 'Unknown',
              to: offer.route?.to?.address || 'Unknown',
            },
            rawDate,
            date: formattedDate,
            time: formattedTime,
            status: offer.status || 'active',
            seatsBooked: booked,
            totalSeats: offer.totalSeats || 0,
          };
        });
        offers.push(...poolingMapped);
      }

      if (rentalResponse.success && rentalResponse.data) {
        const rentalOffers = Array.isArray(rentalResponse.data) ? rentalResponse.data : [];
        const rentalMapped = rentalOffers.map((offer: any) => {
          const totalBookings = offer.totalBookings || 0;
          const formattedDate = offer.date ? new Date(offer.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
          const formattedTime = offer.time || (offer.date ? new Date(offer.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A');
          return {
            ...offer,
            id: offer.offerId || offer._id,
            type: 'rental',
            offerId: offer.offerId || offer._id,
            vehicle: {
              brand: offer.vehicle?.brand || 'Unknown',
              vehicleModel: offer.vehicle?.vehicleModel || offer.vehicle?.model || '',
              type: offer.vehicle?.type || 'car',
              photos: offer.vehicle?.photos || [],
              displayName: `${offer.vehicle?.brand || 'Unknown'} ${offer.vehicle?.vehicleModel || offer.vehicle?.model || ''}`,
            },
            duration: offer.duration || 'N/A',
            date: formattedDate,
            time: formattedTime,
            status: totalBookings > 0 ? 'booked' : (offer.status || 'active'),
            totalBookings: totalBookings,
            bookedBy: offer.bookedBy || null,
          };
        });
        offers.push(...rentalMapped);
      }

      const activeOffers = offers.filter((offer) => offer.status !== 'completed');
      setMyOffers(activeOffers);
      console.log(`✅ Loaded ${activeOffers.length} active offers (filtered out ${offers.length - activeOffers.length} completed) out of ${offers.length} total`);
    } catch (error: any) {
      console.error('❌ Error loading offers:', error);
      Alert.alert('Error', `Failed to load offers: ${error.message || 'Unknown error'}`);
      setMyOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOffers(); }, []);

  useFocusEffect(
    React.useCallback(() => { loadOffers(); }, [])
  );

  const filteredOffers = myOffers.filter((offer) => {
    if (offer.status === 'completed') return false;
    if (activeTab === 'All') return true;
    if (activeTab === 'Active') return offer.status === 'active' || offer.status === 'booked';
    if (activeTab === 'In Trip') return offer.status === 'in_progress';
    if (activeTab === 'Pending') return offer.status === 'pending';
    return offer.status === activeTab.toLowerCase();
  });

  const handleView = (offer: any) => {
    if (offer.type === 'pooling') {
      navigation.navigate('PoolingDetails' as never, { offer } as never);
    } else {
      navigation.navigate('OwnerRentalManagement' as never, { offerId: offer.offerId, offer } as never);
    }
  };

  const handleCancelPress = (offer: any) => {
    setSelectedOffer(offer);
    setCancelModalVisible(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedOffer) return;
    setCancelModalVisible(false);
    try {
      if (selectedOffer.type === 'pooling') {
        const res = await poolingApi.deleteOffer(selectedOffer.offerId);
        if (res.success) {
          setMyOffers((prev) => prev.filter((o) => o.offerId !== selectedOffer.offerId));
          Alert.alert('Deleted', 'Pooling offer deleted successfully.', [{ text: 'OK' }]);
        } else {
          Alert.alert('Error', res.error || res.message || 'Failed to delete offer.');
        }
      } else {
        Alert.alert('Info', 'Rental offer cancellation not yet supported.');
      }
    } catch (error: any) {
      Alert.alert('Cannot Delete', error.message || 'Failed to delete this offer. It may have active bookings.');
    }
    setSelectedOffer(null);
  };

  const getFromAddress = (offer: any) => {
    if (typeof offer.route?.from === 'string') return offer.route.from;
    return offer.route?.from?.address || 'Unknown';
  };

  const getToAddress = (offer: any) => {
    if (typeof offer.route?.to === 'string') return offer.route.to;
    return offer.route?.to?.address || 'Unknown';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active': return { bg: '#E8F5E9', color: '#2E7D32', label: 'Active', dotColor: '#4CAF50' };
      case 'in_progress': return { bg: '#FFF3E0', color: OFFER_ACCENT_DARK, label: 'In Trip', dotColor: OFFER_ACCENT };
      case 'booked': return { bg: '#FFF3E0', color: OFFER_ACCENT_DARK, label: 'Booked', dotColor: OFFER_ACCENT };
      case 'pending': return { bg: '#FFF3E0', color: '#E65100', label: 'Pending', dotColor: '#FF9800' };
      case 'expired': return { bg: '#F5F5F5', color: '#757575', label: 'Expired', dotColor: '#9E9E9E' };
      default: return { bg: '#F5F5F5', color: '#757575', label: status, dotColor: '#9E9E9E' };
    }
  };

  const getVehicleIcon = (offer: any) => {
    const vType = offer.vehicle?.type?.toLowerCase();
    if (vType === 'bike') return <Bike size={18} color={OFFER_ACCENT} />;
    if (vType === 'scooty') return <MaterialCommunityIcons name="moped" size={18} color={OFFER_ACCENT} />;
    return <Car size={18} color={OFFER_ACCENT} />;
  };

  const parseOfferDateTime = (offer: any): Date | null => {
    const dateStr = offer.rawDate || offer.date;
    if (!dateStr || !offer.time) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const timeMatch = offer.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!timeMatch) return null;
    let h = parseInt(timeMatch[1]);
    const m = parseInt(timeMatch[2]);
    const ampm = timeMatch[3]?.toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    else if (ampm === 'AM' && h === 12) h = 0;
    d.setHours(h, m, 0, 0);
    return d;
  };

  const canStartTrip = (offer: any) => {
    const offerDate = parseOfferDateTime(offer);
    if (!offerDate) return false;
    return Date.now() - offerDate.getTime() >= -(5 * 60 * 1000);
  };

  const getTimeRemaining = (offer: any) => {
    const offerDate = parseOfferDateTime(offer);
    if (!offerDate) return '';
    const diff = offerDate.getTime() - Date.now();
    if (diff <= 0) return '';
    const mins = Math.ceil(diff / 60000);
    if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const renderOfferCard = (offer: any) => {
    const status = getStatusConfig(offer.status);
    const isPooling = offer.type === 'pooling';
    const isInProgress = offer.status === 'in_progress';

    return (
      <TouchableOpacity
        key={offer.id}
        activeOpacity={0.7}
        onPress={() => {
          if (isInProgress) {
            navigation.navigate('DriverTrip' as never, { offerId: offer.offerId, offer } as never);
          } else if (!isPooling) {
            handleView(offer);
          }
        }}
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
      >
        {/* Top row: type icon + type label + status */}
        <View style={styles.cardTop}>
          <View style={[styles.typeIcon, { backgroundColor: OFFER_ACCENT + '12' }]}>
            {getVehicleIcon(offer)}
          </View>
          <View style={styles.typeInfo}>
            <Text style={[styles.typeLabel, { color: theme.colors.text }]}>
              {isPooling ? 'Pooling Ride' : 'Rental'}
            </Text>
            {isPooling && (
              <Text style={[styles.dateTimeInline, { color: theme.colors.textSecondary }]}>
                {offer.date} · {offer.time}
              </Text>
            )}
          </View>
          <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: status.dotColor }]} />
            <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Route (pooling) */}
        {isPooling && offer.route && (
          <View style={styles.routeWrap}>
            <View style={styles.routeTimeline}>
              <View style={[styles.routeDotGreen]} />
              <View style={[styles.routeConnector, { backgroundColor: theme.colors.border }]} />
              <View style={[styles.routeDotRed]} />
            </View>
            <View style={styles.routeAddresses}>
              <Text style={[styles.routeAddr, { color: theme.colors.text }]} numberOfLines={1}>
                {getFromAddress(offer)}
              </Text>
              <Text style={[styles.routeAddr, { color: theme.colors.text, marginTop: normalize(14) }]} numberOfLines={1}>
                {getToAddress(offer)}
              </Text>
            </View>
          </View>
        )}

        {/* Rental content */}
        {!isPooling && (
          <View style={styles.rentalWrap}>
            <Text style={[styles.vehicleName, { color: theme.colors.text }]}>
              {offer.vehicle?.displayName || `${offer.vehicle?.brand || ''} ${offer.vehicle?.vehicleModel || ''}`}
            </Text>
            <Text style={[styles.rentalMeta, { color: theme.colors.textSecondary }]}>
              {offer.date} · {offer.availableFrom || 'N/A'} – {offer.availableUntil || 'N/A'}
            </Text>
          </View>
        )}

        {/* Seats / Bookings info */}
        {isPooling && (
          <View style={styles.infoRow}>
            <View style={[styles.infoPill, { backgroundColor: theme.colors.background }]}>
              <Users size={12} color={OFFER_ACCENT} />
              <Text style={[styles.infoPillText, { color: theme.colors.text }]}>
                {offer.seatsBooked}/{offer.totalSeats} seats
              </Text>
            </View>
            {offer.pricePerSeat && (
              <View style={[styles.infoPill, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.infoPillText, { color: OFFER_ACCENT, fontWeight: '700' }]}>
                  ₹{offer.pricePerSeat}/seat
                </Text>
              </View>
            )}
          </View>
        )}

        {!isPooling && offer.totalBookings > 0 && (
          <View style={styles.infoRow}>
            <View style={[styles.infoPill, { backgroundColor: OFFER_ACCENT + '12' }]}>
              <Users size={12} color={OFFER_ACCENT} />
              <Text style={[styles.infoPillText, { color: OFFER_ACCENT, fontWeight: '600' }]}>
                {offer.totalBookings} booking{offer.totalBookings !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={[styles.actions, { borderTopColor: theme.colors.border }]}>
          {/* Chat button */}
          {(offer.seatsBooked > 0 || offer.totalBookings > 0) && (
            <TouchableOpacity
              style={[styles.chatBtn, { borderColor: theme.colors.border }]}
              onPress={() => navigation.navigate('ChatList' as never)}
            >
              <MessageCircle size={15} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Pooling: Start Trip / View Trip */}
          {isPooling && isInProgress && (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.primaryBtnSolid, { backgroundColor: OFFER_ACCENT_DARK }]}
              onPress={() => navigation.navigate('DriverTrip' as never, { offerId: offer.offerId, offer } as never)}
              activeOpacity={0.8}
            >
              <Navigation size={15} color="#FFF" />
              <Text style={styles.primaryBtnText}>View Trip</Text>
            </TouchableOpacity>
          )}

          {isPooling && !isInProgress && (offer.status === 'active' || offer.status === 'booked' || offer.status === 'pending') && offer.status !== 'completed' && (
            <>
              {canStartTrip(offer) ? (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => {
                    setMyOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: 'in_progress' } : o));
                    navigation.navigate('DriverTrip' as never, { offerId: offer.offerId, offer: { ...offer, status: 'in_progress' } } as never);
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#F99E3C', '#E08E35']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.primaryBtnGradient}
                  >
                    <Play size={15} color="#FFF" />
                    <Text style={styles.primaryBtnText}>Start Trip</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={[styles.waitBtn, { backgroundColor: theme.colors.background }]}>
                  <Clock size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.waitBtnText, { color: theme.colors.textSecondary }]}>
                    {getTimeRemaining(offer) ? `In ${getTimeRemaining(offer)}` : `At ${offer.time}`}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Rental: Manage */}
          {!isPooling && offer.totalBookings > 0 && (
            <TouchableOpacity
              style={[styles.primaryBtn, styles.primaryBtnSolid, { backgroundColor: OFFER_ACCENT }]}
              onPress={() => handleView(offer)}
              activeOpacity={0.8}
            >
              <Eye size={15} color="#FFF" />
              <Text style={styles.primaryBtnText}>Manage</Text>
            </TouchableOpacity>
          )}

          {/* Delete offer (pooling, not in_progress/completed) */}
          {isPooling && offer.status !== 'in_progress' && offer.status !== 'completed' && offer.status !== 'cancelled' && (
            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: '#E53E3E' }]}
              onPress={() => handleCancelPress(offer)}
              activeOpacity={0.7}
            >
              <X size={15} color="#E53E3E" />
            </TouchableOpacity>
          )}

          {/* View detail arrow (non-pooling) */}
          {!isPooling && (
            <TouchableOpacity style={[styles.arrowBtn, { backgroundColor: theme.colors.background }]} onPress={() => handleView(offer)}>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Clean header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Offers</Text>
          <Text style={[styles.headerSub, { color: theme.colors.textSecondary }]}>
            {filteredOffers.length} offer{filteredOffers.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ChatList' as never)} style={[styles.headerIconBtn, { backgroundColor: theme.colors.background }]}>
          <MessageCircle size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('OfferServices' as never)} style={[styles.headerIconBtn, { backgroundColor: OFFER_ACCENT }]}>
          <Plus size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          const count = myOffers.filter((o) => {
            if (o.status === 'completed') return false;
            if (tab === 'All') return true;
            if (tab === 'Active') return o.status === 'active' || o.status === 'booked';
            if (tab === 'In Trip') return o.status === 'in_progress';
            if (tab === 'Pending') return o.status === 'pending';
            return false;
          }).length;

          return (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}
              style={[styles.tab, isActive && [styles.tabActive, { borderBottomColor: OFFER_ACCENT }]]}>
              <Text style={[styles.tabText, { color: theme.colors.textSecondary }, isActive && { color: OFFER_ACCENT, fontWeight: '700' }]}>
                {tab}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: isActive ? OFFER_ACCENT : theme.colors.border }]}>
                  <Text style={[styles.tabBadgeText, { color: isActive ? '#FFF' : theme.colors.textSecondary }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={OFFER_ACCENT} />
            <Text style={[styles.centerText, { color: theme.colors.textSecondary }]}>Loading offers...</Text>
          </View>
        ) : filteredOffers.length === 0 ? (
          <View style={styles.centerWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: OFFER_ACCENT + '12' }]}>
              <Car size={32} color={OFFER_ACCENT} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No offers yet</Text>
            <Text style={[styles.centerText, { color: theme.colors.textSecondary }]}>Create your first ride or rental offer</Text>
            <TouchableOpacity style={[styles.createBtn, { backgroundColor: OFFER_ACCENT }]}
              onPress={() => navigation.navigate('OfferServices' as never)}>
              <Plus size={18} color="#FFF" />
              <Text style={styles.createBtnText}>Create Offer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredOffers.map(renderOfferCard)
        )}
      </ScrollView>

      {/* Cancel Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="fade" onRequestClose={() => setCancelModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setCancelModalVisible(false)}>
              <X size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <View style={[styles.modalIconWrap, { backgroundColor: '#FFEBEE' }]}>
              <AlertCircle size={32} color="#E53E3E" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Delete Offer?</Text>
            <Text style={[styles.modalMsg, { color: theme.colors.textSecondary }]}>
              This will permanently remove your {selectedOffer?.type === 'pooling' ? 'pooling' : 'rental'} offer. If passengers have booked, you'll need to cancel their bookings first.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCancelModalVisible(false)}>
                <LinearGradient
                  colors={MODAL_BLUE_GRADIENT}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.modalBtnGradient}
                >
                  <Text style={styles.modalCancelText}>Keep</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleCancelConfirm}>
                <LinearGradient
                  colors={MODAL_ORANGE_GRADIENT}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.modalBtnGradient}
                >
                  <Text style={styles.modalConfirmText}>Delete Offer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: normalize(14), paddingTop: normalize(48), paddingBottom: normalize(14), gap: normalize(10), ...SHADOWS.sm },
  backBtn: { paddingVertical: normalize(4), paddingRight: normalize(8) },
  headerCenter: { flex: 1 },
  headerTitle: { fontFamily: FONTS.medium, fontSize: normalize(20), fontWeight: '700' },
  headerSub: { fontFamily: FONTS.regular, fontSize: normalize(12), marginTop: normalize(1) },
  headerIconBtn: { width: normalize(36), height: normalize(36), borderRadius: normalize(12), alignItems: 'center', justifyContent: 'center' },

  // Tabs
  tabBar: { flexDirection: 'row', paddingHorizontal: normalize(6), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E0E0' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: normalize(5), paddingVertical: normalize(12), borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabActive: {},
  tabText: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '500' },
  tabBadge: { width: normalize(18), height: normalize(18), borderRadius: normalize(9), alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { fontFamily: FONTS.medium, fontSize: normalize(10), fontWeight: '700' },

  // Scroll
  scrollContent: { padding: normalize(14), paddingBottom: normalize(100) },

  // Card
  card: { borderRadius: normalize(14), padding: normalize(14), marginBottom: normalize(10), ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: normalize(10), marginBottom: normalize(12) },
  typeIcon: { width: normalize(38), height: normalize(38), borderRadius: normalize(10), alignItems: 'center', justifyContent: 'center' },
  typeInfo: { flex: 1 },
  typeLabel: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '600' },
  dateTimeInline: { fontFamily: FONTS.regular, fontSize: normalize(11), marginTop: normalize(2) },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: normalize(5), paddingHorizontal: normalize(10), paddingVertical: normalize(5), borderRadius: normalize(10) },
  statusDot: { width: normalize(6), height: normalize(6), borderRadius: normalize(3) },
  statusLabel: { fontFamily: FONTS.medium, fontSize: normalize(11), fontWeight: '700' },

  // Route
  routeWrap: { flexDirection: 'row', gap: normalize(10), marginBottom: normalize(10) },
  routeTimeline: { alignItems: 'center', paddingTop: normalize(3) },
  routeDotGreen: { width: normalize(8), height: normalize(8), borderRadius: normalize(4), backgroundColor: '#4CAF50' },
  routeConnector: { width: 1.5, height: normalize(18), marginVertical: normalize(3) },
  routeDotRed: { width: normalize(8), height: normalize(8), borderRadius: normalize(4), backgroundColor: '#E53E3E' },
  routeAddresses: { flex: 1 },
  routeAddr: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '500' },

  // Rental
  rentalWrap: { marginBottom: normalize(10) },
  vehicleName: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '600', marginBottom: normalize(3) },
  rentalMeta: { fontFamily: FONTS.regular, fontSize: normalize(12) },

  // Info pills
  infoRow: { flexDirection: 'row', gap: normalize(8), marginBottom: normalize(10), flexWrap: 'wrap' },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: normalize(5), paddingHorizontal: normalize(10), paddingVertical: normalize(5), borderRadius: normalize(8) },
  infoPillText: { fontFamily: FONTS.medium, fontSize: normalize(11), fontWeight: '500' },

  // Actions
  actions: { flexDirection: 'row', alignItems: 'center', gap: normalize(8), paddingTop: normalize(10), borderTopWidth: StyleSheet.hairlineWidth },
  chatBtn: { width: normalize(36), height: normalize(36), borderRadius: normalize(10), borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { borderRadius: normalize(10), flex: 1, overflow: 'hidden' },
  primaryBtnSolid: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), paddingHorizontal: normalize(16), paddingVertical: normalize(9), justifyContent: 'center' },
  primaryBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), paddingHorizontal: normalize(16), paddingVertical: normalize(9), justifyContent: 'center' },
  primaryBtnText: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '700', color: '#FFF' },
  waitBtn: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), paddingHorizontal: normalize(14), paddingVertical: normalize(9), borderRadius: normalize(10), flex: 1, justifyContent: 'center' },
  waitBtnText: { fontFamily: FONTS.medium, fontSize: normalize(12), fontWeight: '600' },
  arrowBtn: { width: normalize(34), height: normalize(34), borderRadius: normalize(10), alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: normalize(34), height: normalize(34), borderRadius: normalize(10), alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginLeft: 'auto' },

  // Empty / Loading
  centerWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: normalize(80), gap: normalize(10) },
  centerText: { fontFamily: FONTS.regular, fontSize: normalize(14), textAlign: 'center' },
  emptyIcon: { width: normalize(64), height: normalize(64), borderRadius: normalize(20), alignItems: 'center', justifyContent: 'center', marginBottom: normalize(6) },
  emptyTitle: { fontFamily: FONTS.medium, fontSize: normalize(18), fontWeight: '700' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: normalize(8), paddingHorizontal: normalize(24), paddingVertical: normalize(12), borderRadius: normalize(12), marginTop: normalize(6) },
  createBtnText: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '700', color: '#FFF' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modalSheet: { borderRadius: normalize(20), padding: SPACING.xl, width: '100%', maxWidth: wp(90), alignItems: 'center', ...SHADOWS.lg },
  modalClose: { position: 'absolute', top: SPACING.md, right: SPACING.md, padding: SPACING.xs, zIndex: 1 },
  modalIconWrap: { width: normalize(56), height: normalize(56), borderRadius: normalize(18), alignItems: 'center', justifyContent: 'center', marginBottom: normalize(12) },
  modalTitle: { fontFamily: FONTS.medium, fontSize: normalize(18), fontWeight: '700', marginBottom: normalize(6), textAlign: 'center' },
  modalMsg: { fontFamily: FONTS.regular, fontSize: normalize(13), textAlign: 'center', lineHeight: normalize(20), marginBottom: SPACING.lg },
  modalBtns: { flexDirection: 'row', gap: SPACING.md, width: '100%' },
  modalCancelBtn: { flex: 1, borderRadius: normalize(12), overflow: 'hidden' },
  modalConfirmBtn: { flex: 1, borderRadius: normalize(12), overflow: 'hidden' },
  modalBtnGradient: { paddingVertical: normalize(13), alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '600', color: '#FFF' },
  modalConfirmText: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '700', color: '#FFF' },
});

export default MyOffersScreen;
