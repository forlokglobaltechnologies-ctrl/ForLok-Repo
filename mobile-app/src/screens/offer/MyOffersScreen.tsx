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
  ImageBackground,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Car, AlertCircle, X, Clock, MessageCircle, MapPin, ArrowRight, Calendar, Users, Bike, ChevronRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { poolingApi, rentalApi } from '@utils/apiClient';

// Component to check if trip can be started based on time
const StartTripButton = ({ offer, onPress }: { offer: any; onPress: () => void }) => {
  const [canStart, setCanStart] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Don't show button if offer is completed
  if (offer.status === 'completed') {
    return null;
  }

  useEffect(() => {
    const checkTime = () => {
      // Don't allow starting if offer is completed
      if (offer.status === 'completed') {
        setCanStart(false);
        return;
      }

      if (!offer.date || !offer.time) {
        setCanStart(false);
        return;
      }

      const now = new Date();
      const offerDate = new Date(offer.date);
      const offerTime = offer.time; // Format: "9:00 AM" or "09:00"

      // Parse offer time
      const timeMatch = offerTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!timeMatch) {
        setCanStart(false);
        return;
      }

      let offerHour = parseInt(timeMatch[1]);
      const offerMinute = parseInt(timeMatch[2]);
      const ampm = timeMatch[3]?.toUpperCase();

      // Convert to 24-hour format
      if (ampm === 'PM' && offerHour !== 12) {
        offerHour += 12;
      } else if (ampm === 'AM' && offerHour === 12) {
        offerHour = 0;
      }

      // Set offer date and time
      offerDate.setHours(offerHour, offerMinute, 0, 0);

      // Check if current time is at or after offer time (allow 5 minutes buffer)
      const timeDifference = now.getTime() - offerDate.getTime();
      const fiveMinutesInMs = 5 * 60 * 1000;

      if (timeDifference >= -fiveMinutesInMs) {
        setCanStart(true);
        setTimeRemaining('');
      } else {
        setCanStart(false);
        const minutesUntilStart = Math.ceil(-timeDifference / (60 * 1000));
        const hours = Math.floor(minutesUntilStart / 60);
        const minutes = minutesUntilStart % 60;
        if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setTimeRemaining(`${minutes}m`);
        }
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [offer.date, offer.time]);

  return (
    <View style={styles.startTripContainer}>
      <Button
        title={canStart ? "Start Trip" : `Start at ${offer.time}`}
        onPress={onPress}
        variant={canStart ? "primary" : "outline"}
        size="small"
        style={[styles.actionButton, !canStart && styles.disabledButton]}
        disabled={!canStart}
        icon={!canStart && <Clock size={16} color={COLORS.textSecondary} />}
      />
      {!canStart && timeRemaining && (
        <Text style={styles.timeRemainingText}>Wait {timeRemaining}</Text>
      )}
    </View>
  );
};

const MyOffersScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('All');
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const tabs = [t('common.all'), t('myOffers.active'), t('myOffers.pending'), t('myOffers.expired')];

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
        // Use data already on the offer — no extra API calls needed
        const poolingMapped = poolingOffers.map((offer: any) => {
          // Backend already tracks availableSeats; booked = total - available
          const booked = Math.max(0, (offer.totalSeats || 0) - (offer.availableSeats ?? offer.totalSeats ?? 0));
          return {
            id: offer.offerId || offer._id,
            type: 'pooling',
            offerId: offer.offerId || offer._id,
            route: {
              from: offer.route?.from?.address || 'Unknown',
              to: offer.route?.to?.address || 'Unknown',
            },
            date: offer.date ? new Date(offer.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
            time: offer.time || new Date(offer.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            status: offer.status || 'active',
            seatsBooked: booked,
            totalSeats: offer.totalSeats || 0,
            ...offer,
          };
        });
        offers.push(...poolingMapped);
      }

      if (rentalResponse.success && rentalResponse.data) {
        const rentalOffers = Array.isArray(rentalResponse.data) ? rentalResponse.data : [];
        // Use data already on the offer — no extra API calls needed
        const rentalMapped = rentalOffers.map((offer: any) => {
          const totalBookings = offer.totalBookings || 0;
          return {
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
            date: offer.date ? new Date(offer.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
            time: offer.time || new Date(offer.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            status: totalBookings > 0 ? 'booked' : (offer.status || 'active'),
            totalBookings: totalBookings,
            bookedBy: offer.bookedBy || null,
            ...offer,
          };
        });
        offers.push(...rentalMapped);
      }

      // Filter out completed offers - they should only appear in History
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

  useEffect(() => {
    loadOffers();
  }, []);

  // Reload offers when screen comes into focus (to catch status changes like completed)
  useFocusEffect(
    React.useCallback(() => {
      loadOffers();
    }, [])
  );

  const filteredOffers = myOffers.filter((offer) => {
    // Completed offers are already filtered out in loadOffers, but double-check here
    if (offer.status === 'completed') return false;
    
    if (activeTab === 'All') return true;
    if (activeTab === 'Active') return offer.status === 'active';
    if (activeTab === 'Pending') return offer.status === 'pending';
    if (activeTab === 'Expired') return offer.status === 'expired';
    return offer.status === activeTab.toLowerCase();
  });

  const handleView = (offer: any) => {
    if (offer.type === 'pooling') {
      navigation.navigate('PoolingDetails' as never, { offer } as never);
    } else {
      // Navigate to rental management screen for owners
      navigation.navigate('OwnerRentalManagement' as never, { offerId: offer.offerId, offer } as never);
    }
  };

  const handleEdit = (offer: any) => {
    if (offer.type === 'pooling') {
      navigation.navigate('CreatePoolingOffer' as never, { offer } as never);
    } else {
      navigation.navigate('CreateRentalOffer' as never, { offer } as never);
    }
  };

  const handleCancelPress = (offer: any) => {
    setSelectedOffer(offer);
    setCancelModalVisible(true);
  };

  const handleCancelConfirm = () => {
    // Mock cancel functionality
    setCancelModalVisible(false);
    const offerType = selectedOffer?.type === 'pooling' ? t('myOffers.pooling') : t('myOffers.rental');
    Alert.alert(
      t('myOffers.cancelled'),
      t('myOffers.offerCancelled', { type: offerType }),
      [{ text: t('common.ok') }]
    );
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active': return { bg: '#4CAF50' + '15', color: '#4CAF50' };
      case 'booked': return { bg: '#2196F3' + '15', color: '#2196F3' };
      case 'pending': return { bg: '#FF9800' + '15', color: '#FF9800' };
      case 'expired': return { bg: '#9E9E9E' + '15', color: '#9E9E9E' };
      case 'completed': return { bg: '#4CAF50' + '15', color: '#4CAF50' };
      default: return { bg: '#9E9E9E' + '15', color: '#9E9E9E' };
    }
  };

  const getVehicleImageUri = (offer: any) => {
    const photos = offer.vehicle?.photos;
    if (photos) {
      if (Array.isArray(photos) && photos.length > 0) return photos[0];
      if (photos.front) return photos.front;
    }
    return offer.vehicle?.type === 'bike'
      ? 'https://images.unsplash.com/photo-1558980664-769d59546b3b?w=400&h=300&fit=crop'
      : 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Hero Header ── */}
      <ImageBackground
        source={require('../../../assets/myoffers.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={40} style={styles.blurContainer}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.navTitle}>{t('myOffers.title')}</Text>
              <Text style={styles.navSubtitle}>{filteredOffers.length} offer{filteredOffers.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => navigation.navigate('ChatList' as never)} style={styles.navButton}>
                <MessageCircle size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('OfferServices' as never)} style={styles.navButton}>
                <Plus size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </ImageBackground>

      {/* ── Filter Tabs ── */}
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
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading offers...</Text>
          </View>
        ) : filteredOffers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Car size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{t('myOffers.noOffers')}</Text>
            <Button
              title={t('myOffers.createOffer')}
              onPress={() => navigation.navigate('OfferServices' as never)}
              variant="primary"
              size="medium"
              style={styles.createButton}
            />
          </View>
        ) : (
          filteredOffers.map((offer) => {
            const statusStyle = getStatusStyle(offer.status);
            const isPooling = offer.type === 'pooling';
            return (
            <TouchableOpacity
              key={offer.id}
              onPress={isPooling ? undefined : () => handleView(offer)}
              activeOpacity={isPooling ? 1 : 0.7}
              disabled={isPooling}
            >
              <View style={[styles.offerCard, { backgroundColor: theme.colors.surface }]}>
                {/* Card Header */}
                <View style={[styles.offerHeader, { borderBottomColor: theme.colors.border }]}>
                  <View style={[styles.offerTypeIcon, { backgroundColor: theme.colors.primary + '12' }]}>
                    {offer.type === 'pooling' ? (
                      (offer.vehicle?.type?.toLowerCase() === 'bike' ? <Bike size={20} color={theme.colors.primary} /> : <Car size={20} color={theme.colors.primary} />)
                    ) : (
                      <Car size={20} color={theme.colors.primary} />
                    )}
                  </View>
                  <Text style={[styles.offerType, { color: theme.colors.text }]}>
                    {offer.type === 'pooling' ? t('myOffers.pooling') : t('myOffers.rental')}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusPillText, { color: statusStyle.color }]}>
                      {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* ── Pooling Offer Content ── */}
                {offer.type === 'pooling' && offer.route && (
                  <View style={styles.poolingContent}>
                    {/* Route Display - Input-style boxes with arrow */}
                    <View style={styles.routeSection}>
                      <View style={[styles.routeBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                        <MapPin size={16} color={theme.colors.primary} />
                        <Text style={[styles.routeText, { color: theme.colors.text }]} numberOfLines={1}>
                          {getFromAddress(offer)}
                        </Text>
                      </View>
                      <View style={styles.routeArrow}>
                        <ArrowRight size={18} color={theme.colors.primary} />
                      </View>
                      <View style={[styles.routeBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                        <MapPin size={16} color="#F44336" />
                        <Text style={[styles.routeText, { color: theme.colors.text }]} numberOfLines={1}>
                          {getToAddress(offer)}
                        </Text>
                      </View>
                    </View>

                    {/* Date/Time + Seats Row */}
                    <View style={styles.metaRow}>
                      <View style={[styles.metaChip, { backgroundColor: theme.colors.background }]}>
                        <Calendar size={13} color={theme.colors.primary} />
                        <Text style={[styles.metaChipText, { color: theme.colors.text }]}>{offer.date}</Text>
                      </View>
                      <View style={[styles.metaChip, { backgroundColor: theme.colors.background }]}>
                        <Clock size={13} color={theme.colors.primary} />
                        <Text style={[styles.metaChipText, { color: theme.colors.text }]}>{offer.time}</Text>
                      </View>
                      {offer.status === 'active' && (
                        <View style={[styles.metaChip, { backgroundColor: theme.colors.primary + '12' }]}>
                          <Users size={13} color={theme.colors.primary} />
                          <Text style={[styles.metaChipText, { color: theme.colors.primary, fontWeight: '600' }]}>
                            {offer.seatsBooked}/{offer.totalSeats}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* ── Rental Offer Content ── */}
                {offer.type === 'rental' && (
                  <View style={styles.rentalContent}>
                    <Image source={{ uri: getVehicleImageUri(offer) }} style={styles.vehicleImage} resizeMode="cover" />
                    <Text style={[styles.offerVehicle, { color: theme.colors.text }]}>
                      {offer.vehicle?.displayName || `${offer.vehicle?.brand || 'Unknown'} ${offer.vehicle?.vehicleModel || offer.vehicle?.model || ''}`}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.metaChip, { backgroundColor: theme.colors.background }]}>
                        <Calendar size={13} color={theme.colors.primary} />
                        <Text style={[styles.metaChipText, { color: theme.colors.text }]}>
                          {offer.date ? new Date(offer.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
                        </Text>
                      </View>
                      <View style={[styles.metaChip, { backgroundColor: theme.colors.background }]}>
                        <Clock size={13} color={theme.colors.primary} />
                        <Text style={[styles.metaChipText, { color: theme.colors.text }]}>
                          {offer.availableFrom || 'N/A'} - {offer.availableUntil || 'N/A'}
                        </Text>
                      </View>
                    </View>
                    {offer.totalBookings > 0 && (
                      <View style={[styles.metaChip, { backgroundColor: theme.colors.primary + '12', alignSelf: 'flex-start' }]}>
                        <Users size={13} color={theme.colors.primary} />
                        <Text style={[styles.metaChipText, { color: theme.colors.primary, fontWeight: '600' }]}>
                          {offer.totalBookings} booking{offer.totalBookings !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                    {offer.status === 'booked' && offer.bookedBy && (
                      <Text style={[styles.bookedByText, { color: theme.colors.textSecondary }]}>
                        {t('myOffers.bookedBy')}: {offer.bookedBy}
                      </Text>
                    )}
                  </View>
                )}

                {/* ── Actions ── */}
                <View style={[styles.actionsContainer, { borderTopColor: theme.colors.border }]}>
                  {(offer.seatsBooked > 0 || offer.totalBookings > 0) && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('ChatList' as never)}
                      style={[styles.chatButton, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '08' }]}
                    >
                      <MessageCircle size={16} color={theme.colors.primary} />
                      <Text style={[styles.chatButtonText, { color: theme.colors.primary }]}>Chat</Text>
                    </TouchableOpacity>
                  )}
                  {offer.type === 'pooling' && (offer.status === 'active' || offer.status === 'booked' || offer.status === 'pending') && (
                    <StartTripButton
                      offer={offer}
                      onPress={() => {
                        navigation.navigate('DriverTrip' as never, {
                          offerId: offer.offerId,
                          offer: offer,
                        } as never);
                      }}
                    />
                  )}
                  {offer.type === 'rental' && offer.totalBookings > 0 && (
                    <Button
                      title="Manage Bookings"
                      onPress={() => handleView(offer)}
                      variant="primary"
                      size="small"
                      style={styles.actionButton}
                    />
                  )}
                  {offer.type !== 'pooling' && (
                    <TouchableOpacity style={styles.viewDetailArrow} onPress={() => handleView(offer)}>
                      <ChevronRight size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setCancelModalVisible(false)}
            >
              <X size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.modalIcon}>
              <AlertCircle size={48} color={COLORS.error} />
            </View>

            <Text style={styles.modalTitle}>{t('myOffers.cancelOffer')}</Text>
            <Text style={styles.modalMessage}>
              {t('myOffers.cancelConfirmMessage', { type: selectedOffer?.type === 'pooling' ? t('myOffers.pooling') : t('myOffers.rental') })}
              {'\n\n'}
              {t('myOffers.cannotUndo')}
            </Text>

            <View style={styles.modalButtons}>
              <Button
                title={t('myOffers.noKeepIt')}
                onPress={() => setCancelModalVisible(false)}
                variant="outline"
                size="medium"
                style={styles.modalButton}
              />
              <Button
                title={t('myOffers.yesCancel')}
                onPress={handleCancelConfirm}
                variant="primary"
                size="medium"
                style={[styles.modalButton, styles.confirmCancelButton]}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  /* ── Container ── */
  container: {
    flex: 1,
  },

  /* ── Hero Header ── */
  headerImage: {
    width: '100%',
    height: 170,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.78,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  navTitle: {
    fontFamily: FONTS.regular,
    fontSize: 22,
    color: '#FFF',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  navSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },

  /* ── Tabs ── */
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.xs,
    ...SHADOWS.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginHorizontal: 2,
  },
  activeTab: {},
  tabText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: '500',
  },

  /* ── Scroll ── */
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },

  /* ── Offer Card ── */
  offerCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  offerTypeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  offerType: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  /* ── Pooling Route Display ── */
  poolingContent: {
    marginBottom: SPACING.xs,
  },
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 6,
  },
  routeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  routeText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  routeArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Meta Chips ── */
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  metaChipText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: '500',
  },

  /* ── Rental Content ── */
  rentalContent: {
    marginBottom: SPACING.xs,
  },
  vehicleImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    backgroundColor: '#F0F0F0',
  },
  offerVehicle: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  bookedByText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    marginTop: SPACING.xs,
  },

  /* ── Actions ── */
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chatButtonText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: '600',
  },
  actionButton: {
    flex: 1,
    ...SHADOWS.sm,
  },
  viewDetailArrow: {
    marginLeft: 'auto',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Empty & Loading ── */
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
    gap: SPACING.md,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    textAlign: 'center',
  },
  createButton: {
    minWidth: 200,
    ...SHADOWS.md,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    marginTop: SPACING.md,
  },

  /* ── Cancel Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    padding: SPACING.xs,
    zIndex: 1,
  },
  modalIcon: {
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  modalTitle: {
    fontFamily: FONTS.regular,
    fontSize: 20,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    ...SHADOWS.sm,
  },
  confirmCancelButton: {
    backgroundColor: COLORS.error,
  },

  /* ── Start Trip ── */
  startTripContainer: {
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  timeRemainingText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
});

export default MyOffersScreen;
