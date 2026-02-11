import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Heart, Share2, MapPin, ArrowDown, Star, User, Calendar, Clock, Car, Tag, Users, IndianRupee, FileText } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';
import { poolingApi, bookingApi } from '@utils/apiClient';
import LocationPicker, { LocationData } from '@components/common/LocationPicker';

const PoolingDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const params = route.params as any;
  const offerId = params?.offerId;
  const passedOffer = params?.offer;
  const passedPassengerRoute = params?.passengerRoute; // Get passenger route from search
  
  const [offer, setOffer] = useState<any>(passedOffer || null);
  const [loading, setLoading] = useState(!!offerId && !passedOffer);
  const [joining, setJoining] = useState(false);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [passengerRoute, setPassengerRoute] = useState<{
    from: LocationData | null;
    to: LocationData | null;
  }>({
    from: passedPassengerRoute?.from || null,
    to: passedPassengerRoute?.to || null,
  });

  useEffect(() => {
    if (offerId) {
      // Always load fresh offer data to get enriched driver/passenger ratings
      loadOffer();
    }
  }, [offerId]);

  const loadOffer = async () => {
    if (!offerId) return;
    
    try {
      setLoading(true);
      const response = await poolingApi.getOffer(offerId);
      
      if (response.success && response.data) {
        setOffer(response.data);
        console.log('✅ Loaded offer details:', response.data);
      } else {
        Alert.alert('Error', response.error || 'Failed to load offer details');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('❌ Error loading offer:', error);
      Alert.alert('Error', `Failed to load offer: ${error.message || 'Unknown error'}`);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPool = async () => {
    if (!offer || !offer.offerId) {
      Alert.alert('Error', 'Offer information is missing');
      return;
    }

    if (offer.availableSeats <= 0) {
      Alert.alert('No Seats Available', 'This pooling offer is full. Please try another offer.');
      return;
    }

    // Check if passenger route is set
    if (!passengerRoute.from || !passengerRoute.to) {
      Alert.alert(
        'Select Your Route',
        'Please select your pickup and destination locations to calculate the price.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Select Locations',
            onPress: () => {
              // Show route selection UI or navigate to location picker
              // For now, use offer route as default
              setPassengerRoute({
                from: {
                  address: typeof offer.route?.from === 'string' ? offer.route.from : offer.route?.from?.address || '',
                  lat: typeof offer.route?.from === 'object' ? offer.route.from.lat : 0,
                  lng: typeof offer.route?.from === 'object' ? offer.route.from.lng : 0,
                  city: typeof offer.route?.from === 'object' ? offer.route.from.city : '',
                  state: typeof offer.route?.from === 'object' ? offer.route.from.state : '',
                },
                to: {
                  address: typeof offer.route?.to === 'string' ? offer.route.to : offer.route?.to?.address || '',
                  lat: typeof offer.route?.to === 'object' ? offer.route.to.lat : 0,
                  lng: typeof offer.route?.to === 'object' ? offer.route.to.lng : 0,
                  city: typeof offer.route?.to === 'object' ? offer.route.to.city : '',
                  state: typeof offer.route?.to === 'object' ? offer.route.to.state : '',
                },
              });
            },
          },
        ]
      );
      return;
    }

    try {
      setCalculatingPrice(true);
      console.log('💰 Calculating price for offer:', offer.offerId);

      // Calculate dynamic price
      const priceResponse = await poolingApi.calculatePrice({
        offerId: offer.offerId,
        passengerRoute: {
          from: {
            address: passengerRoute.from.address,
            lat: passengerRoute.from.lat,
            lng: passengerRoute.from.lng,
            city: passengerRoute.from.city,
            state: passengerRoute.from.state,
          },
          to: {
            address: passengerRoute.to.address,
            lat: passengerRoute.to.lat,
            lng: passengerRoute.to.lng,
            city: passengerRoute.to.city,
            state: passengerRoute.to.state,
          },
        },
      });

      if (priceResponse.success && priceResponse.data) {
        const priceBreakdown = priceResponse.data;
        console.log('✅ Price calculated:', priceBreakdown);

        // Navigate to price summary screen
        navigation.navigate('PriceSummary' as never, {
          offerId: offer.offerId,
          offer: offer,
          passengerRoute: {
            from: {
              address: passengerRoute.from.address,
              lat: passengerRoute.from.lat,
              lng: passengerRoute.from.lng,
            },
            to: {
              address: passengerRoute.to.address,
              lat: passengerRoute.to.lat,
              lng: passengerRoute.to.lng,
            },
          },
          priceBreakdown: priceBreakdown,
        } as never);
      } else {
        Alert.alert('Error', priceResponse.error || 'Failed to calculate price. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error calculating price:', error);
      Alert.alert('Error', error.message || 'Failed to calculate price. Please try again.');
    } finally {
      setCalculatingPrice(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading offer details...</Text>
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
  
  // Ensure vehicle properties exist with fallbacks
  const vehicleBrand = offer.vehicle?.brand || 'Vehicle';
  const vehicleNumber = offer.vehicle?.number || 'N/A';

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
        {/* Driver Card */}
        <View style={styles.driverCard}>
          <View style={styles.sectionHeader}>
            <User size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Driver Information</Text>
          </View>
          <View style={styles.divider} />
          <Image 
            source={{ uri: offer.driver?.photo || offer.driverPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400' }} 
            style={styles.driverPhoto} 
          />
          <Text style={styles.driverName}>{offer.driver?.name || offer.driverName || 'Driver'}</Text>
          <View style={styles.ratingContainer}>
            <Star size={18} color={COLORS.warning} fill={COLORS.warning} />
            <Text style={styles.ratingText}>
              {Number(offer.driver?.rating ?? offer.rating ?? 0).toFixed(1)} ({offer.driver?.totalReviews ?? offer.totalReviews ?? 0} reviews)
            </Text>
          </View>
          <Button title="View Profile" onPress={() => {}} variant="outline" size="small" style={styles.profileButton} />
        </View>

        {/* Route Card */}
        <View style={styles.routeCard}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('poolingDetails.route')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.routeFrom}>
            <View style={styles.routeIconContainer}>
              <MapPin size={18} color={COLORS.primary} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>{t('common.from')}</Text>
              <Text style={styles.routeText}>
                {typeof offer.route?.from === 'string' 
                  ? offer.route.from 
                  : offer.route?.from?.address || 'N/A'}
              </Text>
            </View>
          </View>
          <View style={styles.arrowContainer}>
            <ArrowDown size={24} color={COLORS.primary} />
          </View>
          <View style={styles.routeTo}>
            <View style={styles.routeIconContainer}>
              <MapPin size={18} color={COLORS.primary} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>{t('common.to')}</Text>
              <Text style={styles.routeText}>
                {typeof offer.route?.to === 'string' 
                  ? offer.route.to 
                  : offer.route?.to?.address || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.sectionHeader}>
            <Car size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('poolingDetails.tripDetails')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Calendar size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>{t('common.date')}</Text>
              <Text style={styles.detailValue}>{offer.date || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Clock size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>{t('common.time')}</Text>
              <Text style={styles.detailValue}>{offer.time || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Car size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>{t('poolingDetails.vehicle')}</Text>
              <Text style={styles.detailValue}>{vehicleBrand}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Tag size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>{t('poolingDetails.vehicleNumber')}</Text>
              <Text style={styles.detailValue}>{vehicleNumber}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Users size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>{t('poolingDetails.availableSeats')}</Text>
              <Text style={styles.detailValue}>{offer.availableSeats || 0} {t('poolingDetails.seats')}</Text>
            </View>
          </View>
        </View>

        {/* Pricing Card */}
        <View style={styles.pricingCard}>
          <View style={styles.sectionHeader}>
            <IndianRupee size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('poolingDetails.pricing')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>{t('poolingDetails.perPerson')}</Text>
            <View style={styles.pricingValueRow}>
              <IndianRupee size={20} color={COLORS.primary} />
              <Text style={styles.pricingValue}>{offer.price || 0}</Text>
            </View>
          </View>
        </View>

        {/* Notes Card */}
        {offer.notes && (
          <View style={styles.notesCard}>
            <View style={styles.sectionHeader}>
              <FileText size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>{t('poolingDetails.additionalNotes')}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.notesText}>{offer.notes}</Text>
          </View>
        )}

        {/* Passengers Card */}
        <View style={styles.passengersCard}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('poolingDetails.otherPassengers')}</Text>
          </View>
          <View style={styles.divider} />
          {(offer.passengers || []).length === 0 ? (
            <Text style={styles.noPassengersText}>No passengers yet</Text>
          ) : (
            (offer.passengers || []).map((p: any, index: number) => (
              <View key={p.userId || p.id || index} style={styles.passengerItem}>
                {p.photo ? (
                  <Image source={{ uri: p.photo }} style={styles.passengerAvatar} />
                ) : (
                  <View style={styles.passengerIconContainer}>
                    <User size={18} color={COLORS.primary} />
                  </View>
                )}
                <View style={styles.passengerInfo}>
                  <Text style={styles.passengerName}>{p.name}</Text>
                  <View style={styles.passengerMeta}>
                    <View style={styles.passengerRatingBadge}>
                      <Star size={12} color={COLORS.warning} fill={COLORS.warning} />
                      <Text style={styles.passengerRatingText}>
                        {Number(p.rating ?? 0).toFixed(1)}
                      </Text>
                      {(p.totalReviews ?? 0) > 0 && (
                        <Text style={styles.passengerReviewCount}>
                          ({p.totalReviews})
                        </Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: p.status === 'confirmed' ? COLORS.success + '20' : 
                                       p.status === 'cancelled' ? COLORS.error + '20' : 
                                       COLORS.warning + '20' 
                    }]}>
                      <Text style={[styles.statusBadgeText, { 
                        color: p.status === 'confirmed' ? COLORS.success : 
                               p.status === 'cancelled' ? COLORS.error : 
                               COLORS.warning 
                      }]}>
                        {p.status?.charAt(0).toUpperCase() + p.status?.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Passenger Route Display/Selection */}
        <View style={styles.routeSelectionCard}>
          <Text style={styles.sectionTitle}>Your Route</Text>
          {passengerRoute.from && passengerRoute.to ? (
            // Display route if already selected from search
            <>
              <View style={styles.routeDisplayItem}>
                <MapPin size={20} color={COLORS.primary} />
                <View style={styles.routeDisplayText}>
                  <Text style={styles.routeLabel}>Pickup</Text>
                  <Text style={styles.routeAddress}>{passengerRoute.from.address}</Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('LocationPicker' as never, {
                      title: 'Select Pickup Location',
                      onLocationSelect: (location: LocationData) => {
                        setPassengerRoute((prev) => ({ ...prev, from: location }));
                      },
                      initialLocation: passengerRoute.from || undefined,
                    } as never)
                  }
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.routeDisplayItem}>
                <MapPin size={20} color={COLORS.success} />
                <View style={styles.routeDisplayText}>
                  <Text style={styles.routeLabel}>Destination</Text>
                  <Text style={styles.routeAddress}>{passengerRoute.to.address}</Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('LocationPicker' as never, {
                      title: 'Select Destination',
                      onLocationSelect: (location: LocationData) => {
                        setPassengerRoute((prev) => ({ ...prev, to: location }));
                      },
                      initialLocation: passengerRoute.to || undefined,
                    } as never)
                  }
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // Allow selection if not passed from search
            <>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('LocationPicker' as never, {
                    title: 'Select Pickup Location',
                    onLocationSelect: (location: LocationData) => {
                      setPassengerRoute((prev) => ({ ...prev, from: location }));
                    },
                    initialLocation: passengerRoute.from || undefined,
                  } as never)
                }
              >
                <View style={styles.routeInput}>
                  <MapPin size={20} color={COLORS.primary} />
                  <Text style={[styles.routeInputText, !passengerRoute.from && styles.placeholderText]}>
                    {passengerRoute.from?.address || 'Select Pickup Location'}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('LocationPicker' as never, {
                    title: 'Select Destination',
                    onLocationSelect: (location: LocationData) => {
                      setPassengerRoute((prev) => ({ ...prev, to: location }));
                    },
                    initialLocation: passengerRoute.to || undefined,
                  } as never)
                }
              >
                <View style={styles.routeInput}>
                  <MapPin size={20} color={COLORS.primary} />
                  <Text style={[styles.routeInputText, !passengerRoute.to && styles.placeholderText]}>
                    {passengerRoute.to?.address || 'Select Destination'}
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Action Buttons */}
        <Button 
          title={calculatingPrice ? 'Calculating Price...' : joining ? 'Joining...' : t('poolingDetails.joinPool')} 
          onPress={handleJoinPool} 
          variant="primary" 
          size="large" 
          style={styles.joinButton}
          disabled={calculatingPrice || joining || !offer || offer.availableSeats <= 0}
        />
        <Button title={t('poolingDetails.messageDriver')} onPress={() => navigation.navigate('Chat' as never)} variant="outline" size="large" style={styles.messageButton} />
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
  headerRight: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  backButton: {
    padding: SPACING.xs,
  },
  iconButton: {
    padding: SPACING.xs,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  // Section Cards
  driverCard: {
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
    width: '100%',
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
  driverPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: SPACING.sm,
    borderWidth: 3,
    borderColor: COLORS.primary + '20',
  },
  driverName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.warning + '15',
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
  // Route Card
  routeCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  routeFrom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  routeTo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  routeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  routeText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: SPACING.xs,
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
    backgroundColor: COLORS.primary + '15',
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
  },
  pricingLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  pricingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pricingValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  // Notes Card
  notesCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  notesText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  // Passengers Card
  passengersCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  passengerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  passengerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primary + '20',
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  passengerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  passengerRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
  },
  passengerRatingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    fontWeight: '600',
  },
  passengerReviewCount: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
  },
  statusBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  noPassengersText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  joinButton: {
    marginBottom: SPACING.md,
  },
  messageButton: {
    marginBottom: SPACING.xl,
  },
  routeSelectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  routeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  routeInputText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.textSecondary,
  },
  routeDisplayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  routeDisplayText: {
    flex: 1,
  },
  routeLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  routeAddress: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  editButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  editButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default PoolingDetailsScreen;

