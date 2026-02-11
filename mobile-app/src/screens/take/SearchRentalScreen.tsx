import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { ArrowLeft, Search, Filter, Star, MapPin, Calendar, Clock } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { rentalApi } from '@utils/apiClient';

interface RouteParams {
  location?: { address: string; lat: number; lng: number };
  date?: string;
  duration?: string;
}

const RENTAL_COMING_SOON = true; // V2 feature — flip to false to re-enable

const SearchRentalScreen = () => {
  const navigation = useNavigation();

  if (RENTAL_COMING_SOON) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', top: 50, left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <LottieView source={require('../../../assets/videos/Coming soon.json')} autoPlay loop style={{ width: 300, height: 300 }} />
      </View>
    );
  }

  const route = useRoute();
  const { t } = useLanguage();
  const params = (route.params as RouteParams) || {};
  
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({
    location: params.location?.address || 'Bangalore',
    date: params.date || new Date().toISOString().split('T')[0],
    duration: params.duration || '4 hours',
  });

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const response = await rentalApi.searchOffers({
        lat: params.location?.lat,
        lng: params.location?.lng,
        date: params.date,
      });
      
      if (response.success && response.data) {
        const offersData = response.data.offers || response.data || [];
        setOffers(offersData);
        console.log(`✅ Loaded ${offersData.length} rental offers`);
      } else {
        console.warn('⚠️ No offers found:', response.error);
        setOffers([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading offers:', error);
      Alert.alert('Error', `Failed to load offers: ${error.message || 'Unknown error'}`);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../../../assets/rental_search.jpg')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <BlurView intensity={50} style={styles.blurContainer}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={[styles.iconButton, styles.backButton]}
            >
              <ArrowLeft size={20} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.quotationContainer}>
              <Text style={styles.quotationText}>
                "Rent your perfect ride{'\n'}and explore with freedom"
              </Text>
            </View>
          </View>
        </BlurView>
      </ImageBackground>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.routeCard}>
          <View style={styles.routeInfo}>
            <View style={styles.locationRow}>
              <View style={styles.locationItem}>
                <MapPin size={20} color={COLORS.primary} />
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationLabel}>Location</Text>
                  <Text style={styles.locationName}>{searchParams.location}</Text>
                </View>
              </View>
            </View>
            <View style={styles.dateRow}>
              <Calendar size={18} color={COLORS.textSecondary} />
              <Text style={styles.dateText}>
                {new Date(searchParams.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.durationRow}>
              <Clock size={18} color={COLORS.textSecondary} />
              <Text style={styles.durationText}>Duration: {searchParams.duration}</Text>
            </View>
          </View>
        </View>
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {loading ? 'Loading...' : `Found ${offers.length} rentals`}
          </Text>
          <View style={styles.actionIcons}>
            <TouchableOpacity style={styles.actionIconButton} onPress={loadOffers}>
              <Search size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionIconButton}
              onPress={() => navigation.navigate('Filter' as never)}
            >
              <Filter size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading offers...</Text>
          </View>
        ) : offers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No rental offers found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search criteria</Text>
          </View>
        ) : (
          offers.map((rental) => {
            // Get vehicle image - prioritize uploaded photos, fallback to internet images
            const getVehicleImageUri = () => {
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
              const vehicleType = rental.vehicle?.type?.toLowerCase() || 'car';
              if (vehicleType === 'bike') {
                return 'https://images.unsplash.com/photo-1558980664-769d59546b3b?w=400&h=300&fit=crop';
              }
              return 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop';
            };

            // Format time from HH:mm to 12-hour format
            const formatTime = (timeString: string) => {
              if (!timeString) return '';
              try {
                const [hours, minutes] = timeString.split(':');
                const hour = parseInt(hours, 10);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const hour12 = hour % 12 || 12;
                return `${hour12}:${minutes} ${ampm}`;
              } catch {
                return timeString;
              }
            };

            const ownerName = rental.ownerName || rental.owner?.name || 'Owner';
            const timingText = rental.availableFrom && rental.availableUntil
              ? `${formatTime(rental.availableFrom)} - ${formatTime(rental.availableUntil)}`
              : '';

            return (
            <Card key={rental.offerId || rental._id} style={styles.rentalCard}>
              <Image 
                  source={{ uri: getVehicleImageUri() }} 
                style={styles.vehicleImage} 
                  resizeMode="cover"
              />
              <Text style={styles.vehicleName}>
                {rental.vehicle?.brand || 'Unknown'} {rental.vehicle?.vehicleModel || rental.vehicle?.model || ''}
              </Text>
              
              {/* Owner/Company Name */}
              <View style={styles.ownerContainer}>
                <Text style={styles.ownerLabel}>
                  {rental.ownerType === 'company' ? 'Company' : 'Owner'}:
                </Text>
                <Text style={styles.ownerName}>{ownerName}</Text>
              </View>

              {/* Timing */}
              {timingText ? (
                <View style={styles.timingContainer}>
                  <Clock size={14} color={COLORS.textSecondary} />
                  <Text style={styles.timingText}>{timingText}</Text>
                </View>
              ) : null}

              <View style={styles.ratingContainer}>
                <Star size={16} color={COLORS.warning} fill={COLORS.warning} />
                <Text style={styles.ratingText}>
                  {rental.owner?.rating || rental.rating || 0} ({rental.owner?.totalReviews || rental.totalReviews || 0} {t('common.reviews')})
                </Text>
              </View>
              <Text style={styles.priceText}>₹{rental.pricePerHour || rental.price || 0}/{t('searchRental.perHour')}</Text>
              <Button 
                title={t('searchRental.viewDetails')} 
                onPress={() => navigation.navigate('RentalDetails' as never, { offerId: rental.offerId || rental._id, rental } as never)} 
                variant="primary" 
                size="small" 
                style={styles.detailsButton} 
              />
            </Card>
            );
          })
        )}
        <TouchableOpacity style={styles.loadMore}>
          <Text style={styles.loadMoreText}>{t('searchRental.loadMore')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerImage: {
    width: '100%',
    height: 200,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary,
    opacity: 0.6,
  },
  blurContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    height: '100%',
    position: 'relative',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: SPACING.md,
    top: SPACING.xl,
  },
  quotationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  quotationText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '100%',
  },
  scrollContent: { padding: SPACING.md },
  routeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  routeInfo: {
    gap: SPACING.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  locationItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  locationName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  dateText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  durationText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: { 
    fontFamily: FONTS.regular, 
    fontSize: FONTS.sizes.sm, 
    color: COLORS.textSecondary, 
    marginBottom: SPACING.lg,
    paddingTop: 2,
  },
  rentalCard: { marginBottom: SPACING.md, padding: SPACING.md },
  vehicleImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: SPACING.sm },
  vehicleName: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.text, marginBottom: SPACING.xs, fontWeight: 'bold' },
  ownerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  ownerLabel: { 
    fontFamily: FONTS.regular, 
    fontSize: FONTS.sizes.sm, 
    color: COLORS.textSecondary,
  },
  ownerName: { 
    fontFamily: FONTS.regular, 
    fontSize: FONTS.sizes.sm, 
    color: COLORS.text, 
    fontWeight: '600',
    flex: 1,
  },
  timingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  timingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  ratingText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  priceText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.primary, fontWeight: 'bold', marginBottom: SPACING.sm },
  detailsButton: { marginTop: SPACING.xs },
  loadMore: { alignItems: 'center', padding: SPACING.md },
  loadMoreText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.primary },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
});

export default SearchRentalScreen;

