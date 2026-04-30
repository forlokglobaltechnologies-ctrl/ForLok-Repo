import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { ArrowLeft, Heart, Share2, Star, Minus, Plus, Tag, Fuel, Settings, MapPin, IndianRupee, Clock, User } from 'lucide-react-native';
import { VehicleTypeIcon } from '@utils/vehicleDisplay';
import { normalize, wp, hp } from '@utils/responsive';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Card } from '@components/common/Card';
import TimeSlotSelector from '@components/common/TimeSlotSelector';
import { useLanguage } from '@context/LanguageContext';
import { rentalApi, bookingApi, walletApi } from '@utils/apiClient';
import { reviewsCountLong } from '@utils/reviewDisplay';

const RENTAL_COMING_SOON = true; // V2 feature — flip to false to re-enable

const RentalDetailsScreen = () => {
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
  const offerId = params?.offerId;
  const passedRental = params?.rental || params?.offer;
  
  const [rental, setRental] = useState<any>(passedRental || null);
  const [loading, setLoading] = useState(!!offerId && !passedRental);
  const [hours, setHours] = useState(2);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [availableSlots, setAvailableSlots] = useState<any>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (offerId && !passedRental) {
      loadOffer();
    }
  }, [offerId]);

  useEffect(() => {
    if (rental && rental.offerId) {
      loadAvailableSlots();
    }
  }, [rental]);

  const loadOffer = async () => {
    if (!offerId) return;
    
    try {
      setLoading(true);
      const response = await rentalApi.getOffer(offerId);
      
      if (response.success && response.data) {
        setRental(response.data);
        console.log('✅ Loaded rental offer details:', response.data);
      } else {
        Alert.alert(t('common.error'), response.error || t('rentalDetails.bookingFailed'));
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('❌ Error loading offer:', error);
      Alert.alert(t('common.error'), error.message || t('rentalDetails.bookingFailed'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    const offerId = rental?.offerId || rental?._id;
    if (!offerId || !rental?.date) {
      console.log('⚠️ Cannot load slots - missing offerId or date:', { offerId, date: rental?.date });
      return;
    }

    try {
      setLoadingSlots(true);
      // Format date as ISO string
      const dateStr = rental.date instanceof Date 
        ? rental.date.toISOString() 
        : typeof rental.date === 'string' 
          ? rental.date 
          : new Date(rental.date).toISOString();
      
      console.log('📅 Loading available slots for:', { offerId, date: dateStr });
      const response = await rentalApi.getAvailableSlots(offerId, dateStr);
      
      if (response.success && response.data) {
        setAvailableSlots(response.data);
        console.log('✅ Loaded available slots:', response.data);
      } else {
        console.warn('⚠️ Failed to load slots:', response.error);
        // Set empty slots so TimeSlotSelector still shows
        setAvailableSlots({ availableSlots: [], bookedSlots: [] });
      }
    } catch (error: any) {
      console.error('❌ Error loading available slots:', error);
      // Set empty slots so TimeSlotSelector still shows
      setAvailableSlots({ availableSlots: [], bookedSlots: [] });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSlotSelect = (start: string, end: string, slotDuration: number) => {
    setStartTime(start);
    setEndTime(end);
    setDuration(slotDuration);
    setHours(slotDuration); // Update hours for display
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('rentalDetails.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!rental) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Offer not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const calculatedDuration = duration || hours;
  const totalAmount = (rental.pricePerHour || rental.price || 0) * calculatedDuration;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Heart size={24} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Share2 size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Image 
          source={{ 
            uri: (() => {
              // Check if photos exist in various formats
              if (rental.vehicle?.photos) {
                // If photos is an array
                if (Array.isArray(rental.vehicle.photos) && rental.vehicle.photos.length > 0) {
                  return rental.vehicle.photos[0];
                }
                // If photos is an object with front property
                if (rental.vehicle.photos.front) {
                  return rental.vehicle.photos.front;
                }
                // If photos is an object, get first value
                if (typeof rental.vehicle.photos === 'object') {
                  const photoValues = Object.values(rental.vehicle.photos).filter(Boolean);
                  if (photoValues.length > 0) {
                    return photoValues[0] as string;
                  }
                }
              }
              // Fallback to internet images based on vehicle type
              const vehicleType = rental.vehicle?.type?.toLowerCase() || 'bike';
              if (vehicleType === 'scooty' || vehicleType === 'scooter') {
                return 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=400&h=300&fit=crop';
              }
              return 'https://images.unsplash.com/photo-1558980664-769d59546b3b?w=400&h=300&fit=crop';
            })()
          }} 
          style={styles.vehicleImage} 
          resizeMode="cover"
        />
        
        {/* Owner Card */}
        <View style={styles.ownerCard}>
          <View style={styles.sectionHeader}>
            <User size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('rentalDetails.ownerInformation')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.ownerInfo}>
            <Image 
              source={{ uri: rental.owner?.photo || rental.owner?.profilePhoto || 'https://via.placeholder.com/100' }} 
              style={styles.ownerPhoto} 
            />
            <View style={styles.ownerDetails}>
              <Text style={styles.ownerName}>{rental.owner?.name || 'Owner'}</Text>
              <View style={styles.ratingContainer}>
                <Star size={18} color={COLORS.warning} fill={COLORS.warning} />
                <Text style={styles.ratingText}>
                  {rental.owner?.rating || rental.rating || 0} ({reviewsCountLong(rental.owner?.totalReviews ?? rental.totalReviews, t)})
                </Text>
              </View>
            </View>
          </View>
          <Button title={t('rentalDetails.viewOwnerProfile')} onPress={() => {}} variant="outline" size="small" style={styles.profileButton} />
        </View>

        {/* Vehicle Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.sectionHeader}>
            <VehicleTypeIcon type={rental.vehicle?.type} size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('rentalDetails.vehicleDetails')}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.vehicleName}>
            {rental.vehicle?.brand || 'Unknown'} {rental.vehicle?.year || ''} {rental.vehicle?.vehicleModel || rental.vehicle?.model || ''}
          </Text>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Tag size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>{t('rentalDetails.vehicleNumber')}</Text>
              <Text style={styles.detailValue}>{rental.vehicle?.number || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <VehicleTypeIcon type={rental.vehicle?.type} size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>{t('rentalDetails.typeSeats')}</Text>
              <Text style={styles.detailValue}>
                {rental.vehicle?.type || 'N/A'} | {rental.vehicle?.seats || 0} {t('rentalDetails.seats')}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Fuel size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>{t('rentalDetails.fuelTransmission')}</Text>
              <Text style={styles.detailValue}>
                {rental.vehicle?.fuelType || rental.vehicle?.fuel || 'N/A'} | {rental.vehicle?.transmission || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Location Card */}
        <View style={styles.locationCard}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('rentalDetails.pickupLocation')}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.locationText}>{rental.location.address}</Text>
        </View>

        {/* Pricing Card */}
        <View style={styles.pricingCard}>
          <View style={styles.sectionHeader}>
            <IndianRupee size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('rentalDetails.pricing')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>{t('rentalDetails.perHour')}</Text>
            <Text style={styles.pricingValue}>₹{rental.pricePerHour || rental.price || 0}/{t('rentalDetails.hour')}</Text>
          </View>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>{t('rentalDetails.minimum')}</Text>
            <Text style={styles.pricingValue}>{rental.minimumHours || 1} {t('rentalDetails.hours')}</Text>
          </View>
        </View>

        {/* Time Slot Selection */}
        {loadingSlots ? (
          <View style={styles.durationCard}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>{t('rentalDetails.selectDuration')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>{t('rentalDetails.loading')}</Text>
            </View>
          </View>
        ) : rental.availableFrom && rental.availableUntil ? (
          <TimeSlotSelector
            availableFrom={rental.availableFrom}
            availableUntil={rental.availableUntil}
            bookedSlots={availableSlots?.bookedSlots || []}
            minimumHours={rental.minimumHours || 1}
            onSlotSelect={handleSlotSelect}
            selectedStartTime={startTime}
            selectedEndTime={endTime}
          />
        ) : (
        <View style={styles.durationCard}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('rentalDetails.selectDuration')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.durationControls}>
            <TouchableOpacity 
              style={[styles.durationButton, hours <= rental.minimumHours && styles.durationButtonDisabled]}
              onPress={() => setHours(Math.max(rental.minimumHours, hours - 1))}
              disabled={hours <= rental.minimumHours}
            >
              <Minus size={20} color={hours <= rental.minimumHours ? COLORS.textSecondary : COLORS.primary} />
            </TouchableOpacity>
            <View style={styles.durationDisplay}>
              <Text style={styles.durationCount}>{hours}</Text>
            <Text style={styles.durationUnit}>{t('rentalDetails.hours')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.durationButton}
              onPress={() => setHours(hours + 1)}
            >
              <Plus size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
        )}

        {/* Total Amount */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{t('rentalDetails.total')}</Text>
          <View style={styles.totalRow}>
            <IndianRupee size={28} color={COLORS.primary} />
            <Text style={styles.totalText}>{totalAmount.toLocaleString()}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <Button 
          title={bookingLoading ? t('common.loading') : t('rentalDetails.bookNow')} 
          onPress={async () => {
            if (bookingLoading) return;

            let bookingData: any = {
              rentalOfferId: rental.offerId,
            };

            if (startTime && endTime) {
              bookingData.startTime = startTime;
              bookingData.endTime = endTime;
              bookingData.duration = calculatedDuration;
            } else if (hours >= rental.minimumHours) {
              bookingData.duration = hours;
            } else {
              Alert.alert(t('common.error'), t('rentalDetails.pleaseSelectTimeSlot'));
              return;
            }

            try {
              setBookingLoading(true);

              // Check wallet balance — passengers need ₹100 minimum
              const walletCheck = await walletApi.canBookRide();
              if (walletCheck.success && walletCheck.data && !walletCheck.data.canBook) {
                const shortfall = walletCheck.data.shortfall || 0;
                Alert.alert(
                  'Insufficient Wallet Balance',
                  `You need minimum ₹${walletCheck.data.requiredBalance || 100} to book. Please recharge ₹${shortfall} to continue.`,
                  [
                    { text: 'Recharge Now', onPress: () => navigation.navigate('Wallet' as never) },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
                setBookingLoading(false);
                return;
              }

              const response = await bookingApi.createRentalBooking(bookingData);

              if (response.success && response.data) {
                const bookingId = response.data.bookingId || response.data._id;
                Alert.alert(
                  t('rentalDetails.bookingSuccess'),
                  'Your rental has been booked. Settle manually at trip end.',
                  [
                    {
                      text: 'View Booking',
                      onPress: () => {
                        navigation.navigate('BookingConfirmation' as never, {
                          bookingId,
                          booking: response.data,
                        } as never);
                      },
                    },
                    { text: t('common.ok'), onPress: () => navigation.navigate('MainDashboard' as never) },
                  ]
                );
              } else {
                Alert.alert(t('rentalDetails.bookingFailed'), response.error || t('rentalDetails.bookingFailed'));
              }
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message || t('rentalDetails.bookingFailed'));
            } finally {
              setBookingLoading(false);
            }
          }} 
          variant="primary" 
          size="large" 
          style={styles.bookButton}
          disabled={bookingLoading || (!startTime && !endTime && hours < rental.minimumHours)}
        />
        <Button title={t('rentalDetails.messageOwner')} onPress={() => navigation.navigate('Chat' as never)} variant="outline" size="large" style={styles.messageButton} />
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
  iconButton: {
    padding: SPACING.xs,
  },
  headerRight: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  vehicleImage: {
    width: '100%',
    height: hp(31),
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  // Section Cards
  ownerCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginBottom: SPACING.md,
    width: '100%',
  },
  vehicleName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    backgroundColor: `${COLORS.warning}15`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  ratingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  profileButton: {
    marginTop: SPACING.sm,
  },
  // Details Card
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  // Location Card
  locationCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  locationText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  // Pricing Card
  pricingCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  pricingLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  pricingValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  // Duration Card
  durationCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  durationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  durationButton: {
    width: normalize(48),
    height: normalize(48),
    borderRadius: normalize(24),
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  durationButtonDisabled: {
    backgroundColor: COLORS.lightGray,
    borderColor: COLORS.lightGray,
  },
  durationDisplay: {
    alignItems: 'center',
    minWidth: normalize(80),
  },
  durationCount: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  durationUnit: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  // Total Card
  totalCard: {
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: `${COLORS.primary}30`,
  },
  totalLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxxl,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  bookButton: {
    marginBottom: SPACING.md,
  },
  messageButton: {
    marginBottom: SPACING.xl,
  },
});

export default RentalDetailsScreen;

