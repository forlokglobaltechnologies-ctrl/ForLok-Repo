import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { ArrowLeft, Clock, User, MapPin, IndianRupee, CheckCircle, XCircle, Play, Square } from 'lucide-react-native';
import { normalize, wp, hp } from '@utils/responsive';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { bookingApi, rentalApi } from '@utils/apiClient';

const RENTAL_COMING_SOON = true; // V2 feature — flip to false to re-enable

const OwnerRentalManagementScreen = () => {
  const navigation = useNavigation();

  if (RENTAL_COMING_SOON) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', top: normalize(50), left: normalize(16), zIndex: 10, width: normalize(40), height: normalize(40), borderRadius: normalize(20), backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <LottieView source={require('../../../assets/videos/Coming soon.json')} autoPlay loop style={{ width: wp(75), height: wp(75) }} />
      </View>
    );
  }

  const route = useRoute();
  const { t } = useLanguage();
  const params = route.params as any;
  const offerId = params?.offerId || params?.offer?.offerId;

  const [offer, setOffer] = useState<any>(params?.offer || null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (offerId) {
      loadData();
    }
  }, [offerId]);

  // Update current time every minute to refresh button availability
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load offer if not provided
      if (!offer && offerId) {
        const offerResponse = await rentalApi.getOffer(offerId);
        if (offerResponse.success && offerResponse.data) {
          setOffer(offerResponse.data);
        }
      }

      // Load all bookings for this offer
      console.log('📋 Loading all bookings for offer:', offerId);
      const bookingsResponse = await bookingApi.getAllBookingsByOffer(offerId, 'rental');
      console.log('📦 Bookings API response:', bookingsResponse);
      
      if (bookingsResponse.success && bookingsResponse.data) {
        const bookingsList = Array.isArray(bookingsResponse.data) 
          ? bookingsResponse.data 
          : [];
        
        console.log('📋 Processed bookings list:', bookingsList);
        console.log('✅ Total bookings:', bookingsList.length, bookingsList);
        setBookings(bookingsList);
      } else {
        console.warn('⚠️ No bookings found or API error:', bookingsResponse.error);
        setBookings([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading data:', error);
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRental = async (bookingId: string) => {
    try {
      Alert.alert(
        'Start Rental',
        'Have you handed over the vehicle to the renter?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Handover Vehicle',
            onPress: async () => {
              try {
                // Update booking status to in_progress and record tripStartedAt
                const response = await bookingApi.updateBookingStatus(bookingId, 'in_progress');
                if (response.success) {
                  Alert.alert('Success', 'Rental started successfully. Vehicle handed over to renter.');
                  loadData();
                } else {
                  Alert.alert('Error', response.error || 'Failed to start rental');
                }
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to start rental');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start rental');
    }
  };

  const handleEndRental = (booking: any) => {
    navigation.navigate('EndRental' as never, { booking, offer } as never);
  };

  const formatTime = (time: string | undefined): string => {
    if (!time) return 'N/A';
    try {
      // Handle both HH:mm format and other formats
      const timeStr = String(time).trim();
      if (!timeStr || timeStr === 'undefined' || timeStr === 'null') return 'N/A';
      
      const parts = timeStr.split(':');
      if (parts.length < 2) return 'N/A';
      
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      
      if (isNaN(hours) || isNaN(minutes)) return 'N/A';
      
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
    } catch (error) {
      console.warn('Error formatting time:', time, error);
      return 'N/A';
    }
  };

  // Convert time string (HH:mm) to minutes since midnight
  const timeToMinutes = (timeStr: string | undefined): number => {
    if (!timeStr) return 0;
    try {
      const parts = timeStr.split(':');
      if (parts.length < 2) return 0;
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return 0;
      return hours * 60 + minutes;
    } catch {
      return 0;
    }
  };

  // Check if current time is within the booking's start time window (with buffer)
  const canStartRental = (booking: any): { canStart: boolean; message?: string } => {
    if (!booking.startTime) {
      return { canStart: false, message: 'Start time not set' };
    }

    const now = currentTime;
    const bookingDate = booking.date ? new Date(booking.date) : new Date();
    
    // Get today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDateOnly = new Date(bookingDate);
    bookingDateOnly.setHours(0, 0, 0, 0);

    // Check if booking date is today
    if (bookingDateOnly.getTime() !== today.getTime()) {
      const daysDiff = Math.floor((bookingDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 0) {
        return { canStart: false, message: `Available in ${daysDiff} day${daysDiff > 1 ? 's' : ''}` };
      } else {
        return { canStart: false, message: 'Booking date has passed' };
      }
    }

    // Check if current time is at or near the booking start time
    const startTimeMinutes = timeToMinutes(booking.startTime);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Allow starting 10 minutes before the scheduled time and up to 2 hours after
    const bufferBefore = 10; // minutes
    const bufferAfter = 120; // 2 hours
    
    if (currentMinutes >= (startTimeMinutes - bufferBefore) && 
        currentMinutes <= (startTimeMinutes + bufferAfter)) {
      return { canStart: true };
    } else if (currentMinutes < (startTimeMinutes - bufferBefore)) {
      const minutesUntilStart = startTimeMinutes - bufferBefore - currentMinutes;
      const hours = Math.floor(minutesUntilStart / 60);
      const mins = minutesUntilStart % 60;
      if (hours > 0) {
        return { canStart: false, message: `Available in ${hours}h ${mins}m` };
      } else {
        return { canStart: false, message: `Available in ${mins}m` };
      }
    } else {
      return { canStart: false, message: 'Start time window has passed' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return COLORS.info;
      case 'in_progress':
        return COLORS.warning;
      case 'completed':
        return COLORS.success;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle size={16} color={COLORS.info} />;
      case 'in_progress':
        return <Play size={16} color={COLORS.warning} />;
      case 'completed':
        return <CheckCircle size={16} color={COLORS.success} />;
      default:
        return <XCircle size={16} color={COLORS.textSecondary} />;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!offer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Offer not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Rentals</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Offer Summary */}
        <Card style={styles.offerCard}>
          <View style={styles.offerHeader}>
            <Image
              source={{
                uri: offer.vehicle?.photos?.front || 
                     (Array.isArray(offer.vehicle?.photos) ? offer.vehicle.photos[0] : '') ||
                     'https://via.placeholder.com/100'
              }}
              style={styles.vehicleImage}
            />
            <View style={styles.offerInfo}>
              <Text style={styles.vehicleName}>
                {offer.vehicle?.brand} {offer.vehicle?.year}
              </Text>
              <Text style={styles.vehicleNumber}>{offer.vehicle?.number}</Text>
              <View style={styles.offerMeta}>
                <Clock size={14} color={COLORS.textSecondary} />
                <Text style={styles.offerMetaText}>
                  {formatTime(offer.availableFrom)} - {formatTime(offer.availableUntil)}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{bookings.length}</Text>
              <Text style={styles.statLabel}>Total Bookings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {bookings.filter((b) => b.status === 'in_progress').length}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {bookings.filter((b) => b.status === 'completed').length}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </Card>

        {/* Bookings List */}
        <Text style={styles.sectionTitle}>Bookings</Text>
        {bookings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No bookings yet</Text>
          </Card>
        ) : (
          bookings.map((booking) => (
            <Card key={booking.bookingId || booking._id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={styles.bookingInfo}>
                  <View style={styles.renterInfo}>
                    <User size={18} color={COLORS.primary} />
                    <Text style={styles.renterName}>
                      {typeof booking.userId === 'object' && booking.userId?.name 
                        ? booking.userId.name 
                        : booking.renter?.name || booking.userName || 'Renter'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}15` }]}>
                    {getStatusIcon(booking.status)}
                    <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                      {booking.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.bookingDetails}>
                <View style={styles.detailRow}>
                  <Clock size={16} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>
                    {booking.startTime && booking.endTime
                      ? `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`
                      : `${booking.duration || 0} hours`}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <IndianRupee size={16} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>₹{booking.totalAmount || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MapPin size={16} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>{offer.location?.address || booking.route?.from?.address || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailText, { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary }]}>
                    Completion Mode: {booking.paymentMethod === 'offline_cash' ? 'Manual settlement' : booking.paymentMethod?.toUpperCase() || 'Trip-end confirmation'} | Status: {booking.paymentStatus || 'pending'}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              {/* Show Start Rental for confirmed bookings (payment happens at trip end) */}
              {(booking.status === 'confirmed' || booking.status === 'pending') && (
                (() => {
                  const startCheck = canStartRental(booking);
                  if (startCheck.canStart) {
                    return (
                      <Button
                        title="Start Rental / Handover Vehicle"
                        onPress={() => handleStartRental(booking.bookingId || booking._id)}
                        variant="primary"
                        size="small"
                        style={styles.actionButton}
                      />
                    );
                  } else {
                    return (
                      <View style={styles.waitingContainer}>
                        <Text style={styles.waitingText}>
                          {startCheck.message || `Available at ${formatTime(booking.startTime)}`}
                        </Text>
                      </View>
                    );
                  }
                })()
              )}
              {booking.status === 'in_progress' && (
                <Button
                  title="End Rental / Receive Vehicle"
                  onPress={() => handleEndRental(booking)}
                  variant="primary"
                  size="small"
                  style={styles.actionButton}
                />
              )}
              {booking.status === 'completed' && (
                <View style={styles.completedInfo}>
                  <Text style={styles.completedText}>
                    Settlement: ₹{booking.driverSettlementAmount || booking.amount || 0}
                  </Text>
                </View>
              )}
            </Card>
          ))
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.xl,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.white,
    fontWeight: '600',
  },
  headerRight: {
    width: normalize(40),
  },
  scrollContent: {
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  offerCard: {
    marginBottom: SPACING.md,
  },
  offerHeader: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  vehicleImage: {
    width: normalize(80),
    height: normalize(80),
    borderRadius: BORDER_RADIUS.md,
  },
  offerInfo: {
    flex: 1,
  },
  vehicleName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  vehicleNumber: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  offerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  offerMetaText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  emptyCard: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  bookingCard: {
    marginBottom: SPACING.md,
  },
  bookingHeader: {
    marginBottom: SPACING.md,
  },
  bookingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  renterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  renterName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  bookingDetails: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  actionButton: {
    marginTop: SPACING.sm,
  },
  completedInfo: {
    backgroundColor: `${COLORS.success}15`,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  completedText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.success,
    fontWeight: '600',
    textAlign: 'center',
  },
  waitingContainer: {
    backgroundColor: `${COLORS.warning}15`,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  waitingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.warning,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default OwnerRentalManagementScreen;
