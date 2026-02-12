import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ImageBackground, ActivityIndicator, Alert, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Search, Filter, Car, Bike, Star, MapPin, Calendar, Clock, ArrowRight, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button as CustomButton } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { poolingApi } from '@utils/apiClient';
import { LocationData } from '@components/common/LocationPicker';

interface RouteParams {
  from?: LocationData;
  to?: LocationData;
  date?: string;
  vehicleType?: 'Car' | 'Bike';
  passengers?: number;
}

const SearchPoolingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { isPinkMode, theme } = useTheme();
  const params = (route.params as RouteParams) || {};
  
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromLocation, setFromLocation] = useState<LocationData | null>(params.from || null);
  const [toLocation, setToLocation] = useState<LocationData | null>(params.to || null);

  // Date state: parse from params or default to today
  const initDate = (): Date => {
    if (params.date) {
      const parsed = new Date(params.date + 'T00:00:00');
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  };
  const [date, setDate] = useState<Date>(initDate);
  const [anyDate, setAnyDate] = useState(false); // "Any Date" mode = skip date filter
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Time state: null = "Any time" (default)
  const [time, setTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [vehicleType, setVehicleType] = useState<'Car' | 'Bike' | null>(params.vehicleType || null);
  const [passengers, setPassengers] = useState<number>(params.passengers || 1);
  const [hasAutoSearched, setHasAutoSearched] = useState(false);

  // Format helpers
  const formatDateDisplay = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(d);
    dateOnly.setHours(0, 0, 0, 0);
    const isToday = dateOnly.getTime() === today.getTime();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = dateOnly.getTime() === tomorrow.getTime();

    const formatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (isToday) return `Today, ${formatted}`;
    if (isTomorrow) return `Tomorrow, ${formatted}`;
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTimeDisplay = (t: Date) => {
    let hours = t.getHours();
    const minutes = t.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : String(minutes);
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      setAnyDate(false);
      setOffers([]); // Clear stale results
      console.log('📅 [SearchPooling] Date changed to:', selectedDate.toISOString().split('T')[0]);
    }
  };

  const onTimeChange = (_event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setTime(selectedTime);
      setOffers([]); // Clear stale results
      console.log('🕐 [SearchPooling] Time changed to:', formatTimeDisplay(selectedTime));
    }
  };

  const loadOffers = async () => {
    if (!fromLocation || !toLocation) {
      Alert.alert('Missing Information', 'Please select both From and To locations');
      return;
    }

    // Validate coordinates are present
    if (!fromLocation.lat || !fromLocation.lng || !toLocation.lat || !toLocation.lng) {
      Alert.alert('Invalid Location', 'Please select valid locations with coordinates');
      console.error('❌ [SearchPooling] Missing coordinates:', { fromLocation, toLocation });
      return;
    }

    try {
      setLoading(true);
      
      // Ensure coordinates are numbers
      const fromLat = typeof fromLocation.lat === 'number' ? fromLocation.lat : parseFloat(String(fromLocation.lat));
      const fromLng = typeof fromLocation.lng === 'number' ? fromLocation.lng : parseFloat(String(fromLocation.lng));
      const toLat = typeof toLocation.lat === 'number' ? toLocation.lat : parseFloat(String(toLocation.lat));
      const toLng = typeof toLocation.lng === 'number' ? toLocation.lng : parseFloat(String(toLocation.lng));

      if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
        Alert.alert('Invalid Coordinates', 'Location coordinates are invalid. Please reselect locations.');
        console.error('❌ [SearchPooling] Invalid coordinates:', { fromLat, fromLng, toLat, toLng });
        return;
      }

      // Build date string: only send if not in "Any Date" mode
      const dateStr = anyDate ? undefined : date.toISOString().split('T')[0];
      // Build time string: only send if user explicitly selected a time
      const timeStr = time ? formatTimeDisplay(time) : undefined;

      console.log('🔍 [SearchPooling] Searching pools:', {
        from: { address: fromLocation.address, lat: fromLat, lng: fromLng },
        to: { address: toLocation.address, lat: toLat, lng: toLng },
        date: dateStr || 'ANY',
        time: timeStr || 'ANY',
        vehicleType: vehicleType || 'ALL',
        pinkOnly: isPinkMode,
      });

      const searchParams: any = {
        fromLat,
        fromLng,
        toLat,
        toLng,
        date: dateStr,
        time: timeStr,
        pinkOnly: isPinkMode,
      };
      if (vehicleType) {
        searchParams.vehicleType = vehicleType;
      }

      const response = await poolingApi.searchOffers(searchParams);
      
      if (response.success && response.data) {
        let offersData = response.data.offers || response.data || [];
        // Client-side filter by vehicle type (safety net)
        if (vehicleType) {
          offersData = offersData.filter((offer: any) => {
            const offerVType = (offer.vehicle?.type || offer.vehicleType || '').toLowerCase();
            return offerVType === vehicleType.toLowerCase();
          });
        }
        // Filter by minimum available seats if passengers filter is set
        if (passengers > 1) {
          offersData = offersData.filter((offer: any) => (offer.availableSeats || 0) >= passengers);
        }
        setOffers(offersData);
        console.log(`✅ [SearchPooling] Loaded ${offersData.length} pooling offers (vehicle: ${vehicleType || 'ALL'}, passengers: ${passengers})`);
      } else {
        console.warn('⚠️ [SearchPooling] No offers found:', response.error);
        setOffers([]);
      }
    } catch (error: any) {
      console.error('❌ [SearchPooling] Error loading offers:', error);
      Alert.alert('Error', `Failed to load offers: ${error.message || 'Unknown error'}`);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search when navigated from dashboard with valid locations
  useEffect(() => {
    if (
      !hasAutoSearched &&
      fromLocation?.lat && fromLocation?.lng &&
      toLocation?.lat && toLocation?.lng &&
      fromLocation.lat !== 0 && fromLocation.lng !== 0 &&
      toLocation.lat !== 0 && toLocation.lng !== 0
    ) {
      setHasAutoSearched(true);
      loadOffers();
    }
  }, [fromLocation, toLocation]);

  const handleSelectFromLocation = () => {
    navigation.navigate('LocationPicker' as never, {
      title: 'Select From Location',
      onLocationSelect: (location: LocationData) => {
        setFromLocation(location);
        setOffers([]); // Clear offers when location changes
      },
    } as never);
  };

  const handleSelectToLocation = () => {
    navigation.navigate('LocationPicker' as never, {
      title: 'Select To Location',
      onLocationSelect: (location: LocationData) => {
        setToLocation(location);
        setOffers([]); // Clear offers when location changes
      },
    } as never);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ImageBackground
        source={require('../../../assets/pooling search.jpg')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.overlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={50} style={styles.blurContainer}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={[styles.iconButton, styles.backButton]}
            >
              <ArrowLeft size={20} color={theme.colors.white} />
            </TouchableOpacity>
            <View style={styles.quotationContainer}>
              <Text style={[styles.quotationText, { color: theme.colors.white }]}>
                {t('searchPooling.quotation')}
              </Text>
            </View>
          </View>
        </BlurView>
      </ImageBackground>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Location Selection Card */}
        <View style={[styles.searchCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.searchCardTitle, { color: theme.colors.text }]}>Search Pooling Offers</Text>
          
          <TouchableOpacity onPress={handleSelectFromLocation} activeOpacity={0.7}>
            <Input
              label={t('dashboard.from')}
              value={fromLocation?.address || ''}
              placeholder="Select pickup location"
              editable={false}
              containerStyle={styles.locationInput}
              leftIcon={<MapPin size={20} color={theme.colors.primary} />}
            />
          </TouchableOpacity>

          <View style={styles.arrowDivider}>
            <ArrowRight size={18} color={theme.colors.textSecondary} />
          </View>

          <TouchableOpacity onPress={handleSelectToLocation} activeOpacity={0.7}>
            <Input
              label={t('dashboard.to')}
              value={toLocation?.address || ''}
              placeholder="Select destination"
              editable={false}
              containerStyle={styles.locationInput}
              leftIcon={<MapPin size={20} color={theme.colors.primary} />}
            />
          </TouchableOpacity>

          {/* Date Selection */}
          <View style={[styles.dateTimeSection, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Date</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  { borderColor: theme.colors.border },
                  anyDate && { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` },
                ]}
                onPress={() => { setAnyDate(true); setOffers([]); }}
              >
                <Text style={[styles.chipText, { color: anyDate ? theme.colors.primary : theme.colors.textSecondary }]}>Any Date</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.chip,
                  { borderColor: theme.colors.border, flex: 1 },
                  !anyDate && { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` },
                ]}
                onPress={() => { setAnyDate(false); setShowDatePicker(true); }}
              >
                <Calendar size={16} color={!anyDate ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.chipText, { color: !anyDate ? theme.colors.primary : theme.colors.textSecondary }]} numberOfLines={1}>
                  {!anyDate ? formatDateDisplay(date) : 'Select Date'}
                </Text>
              </TouchableOpacity>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>

          {/* Time Selection */}
          <View style={styles.dateTimeSection}>
            <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Time</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  { borderColor: theme.colors.border },
                  !time && { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` },
                ]}
                onPress={() => { setTime(null); setOffers([]); }}
              >
                <Text style={[styles.chipText, { color: !time ? theme.colors.primary : theme.colors.textSecondary }]}>Any Time</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.chip,
                  { borderColor: theme.colors.border, flex: 1 },
                  time != null && { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` },
                ]}
                onPress={() => setShowTimePicker(true)}
              >
                <Clock size={16} color={time ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.chipText, { color: time ? theme.colors.primary : theme.colors.textSecondary }]}>
                  {time ? formatTimeDisplay(time) : 'Select Time'}
                </Text>
                {time && (
                  <TouchableOpacity onPress={() => { setTime(null); setOffers([]); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={14} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
            {showTimePicker && (
              <DateTimePicker
                value={time || new Date()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
              />
            )}
            {time && (
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                Showing rides within 1 hour of selected time
              </Text>
            )}
          </View>

          {/* Vehicle Type Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Vehicle Type</Text>
            <View style={styles.vehicleFilterRow}>
              <TouchableOpacity
                style={[
                  styles.vehicleFilterBtn,
                  { borderColor: theme.colors.border },
                  vehicleType === null && { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` },
                ]}
                onPress={() => setVehicleType(null)}
              >
                <Text style={[styles.vehicleFilterText, { color: vehicleType === null ? theme.colors.primary : theme.colors.textSecondary }]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.vehicleFilterBtn,
                  { borderColor: theme.colors.border },
                  vehicleType === 'Car' && { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` },
                ]}
                onPress={() => { setVehicleType('Car'); setOffers([]); }}
              >
                <Car size={16} color={vehicleType === 'Car' ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.vehicleFilterText, { color: vehicleType === 'Car' ? theme.colors.primary : theme.colors.textSecondary }]}>Car</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.vehicleFilterBtn,
                  { borderColor: theme.colors.border },
                  vehicleType === 'Bike' && { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` },
                ]}
                onPress={() => { setVehicleType('Bike'); setPassengers(1); setOffers([]); }}
              >
                <Bike size={16} color={vehicleType === 'Bike' ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.vehicleFilterText, { color: vehicleType === 'Bike' ? theme.colors.primary : theme.colors.textSecondary }]}>Bike</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Passengers Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Passengers</Text>
            <View style={styles.vehicleFilterRow}>
              {[1, 2, 3, 4].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.passengerFilterBtn,
                    { borderColor: theme.colors.border },
                    passengers === num && { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}15` },
                    vehicleType === 'Bike' && num > 1 && { opacity: 0.4 },
                  ]}
                  onPress={() => {
                    if (vehicleType !== 'Bike' || num === 1) {
                      setPassengers(num);
                      setOffers([]);
                    }
                  }}
                  disabled={vehicleType === 'Bike' && num > 1}
                >
                  <Text style={[styles.vehicleFilterText, { color: passengers === num ? theme.colors.primary : theme.colors.textSecondary }]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {vehicleType === 'Bike' && (
              <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>Only 1 passenger for Bike</Text>
            )}
          </View>

          {/* Search Button */}
          <CustomButton
            title={loading ? 'Searching...' : 'Search Offers'}
            onPress={loadOffers}
            variant="primary"
            size="large"
            style={styles.searchButton}
            disabled={loading || !fromLocation || !toLocation}
          />
        </View>

        {/* Results Header */}
        {fromLocation && toLocation && (
          <View style={styles.resultsHeader}>
            <View style={styles.resultsHeaderLeft}>
              <Text style={[styles.resultsCount, { color: theme.colors.text }]}>
                {loading 
                  ? 'Searching...' 
                  : offers.length > 0 
                    ? `Found ${offers.length} ${offers.length === 1 ? 'pool' : 'pools'}`
                    : 'No pools found'}
              </Text>
              {offers.length > 0 && (
                <Text style={[styles.resultsSubtext, { color: theme.colors.textSecondary }]}>
                  {fromLocation.address.split(',')[0]} → {toLocation.address.split(',')[0]}
                </Text>
              )}
            </View>
            {offers.length > 0 && (
              <TouchableOpacity
                style={[styles.filterButton, { backgroundColor: `${theme.colors.primary}15` }]}
                onPress={() => navigation.navigate('Filter' as never)}
              >
                <Filter size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Searching for pooling offers...</Text>
          </View>
        ) : offers.length > 0 ? (
          <>
            {isPinkMode && (
              <View style={[styles.pinkModeBanner, { backgroundColor: theme.colors.primaryLight }]}>
                <Text style={[styles.pinkModeText, { color: theme.colors.primary }]}>
                  Showing only female drivers - HerPooling Mode
                </Text>
              </View>
            )}
            {offers.map((offer) => (
              <Card key={offer.offerId || offer._id} style={styles.offerCard}>
                <View style={styles.offerHeader}>
                  {offer.vehicle?.type?.toLowerCase() === 'car' ? (
                    <Car size={24} color={theme.colors.primary} />
                  ) : (
                    <Bike size={24} color={theme.colors.primary} />
                  )}
                  <Text style={[styles.timeText, { color: theme.colors.text }]}>
                    {offer.time || new Date(offer.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {isPinkMode && (
                    <View style={[styles.pinkBadge, { backgroundColor: theme.colors.primary }]}>
                      <Text style={[styles.pinkBadgeText, { color: theme.colors.white }]}>Pink</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.driverName, { color: theme.colors.text }]}>
                  {offer.driver?.name || offer.driverId || 'Driver'}
                </Text>
              <View style={styles.ratingContainer}>
                <Star size={16} color={theme.colors.warning} fill={theme.colors.warning} />
                <Text style={[styles.ratingText, { color: theme.colors.textSecondary }]}>
                  {Number(offer.driver?.rating || offer.rating || 0).toFixed(1)} ({offer.driver?.totalReviews || offer.totalReviews || 0} {t('common.reviews')})
                </Text>
              </View>
              <Text style={[styles.seatsText, { color: theme.colors.text }]}>
                {t('searchPooling.available')}: {offer.availableSeats || 0} {t('searchPooling.seats')}
              </Text>
              <Text style={[styles.priceText, { color: theme.colors.primary }]}>₹{offer.price || 0} {t('searchPooling.perPerson')}</Text>
              <CustomButton 
                title={t('searchPooling.viewDetails')} 
                onPress={() => navigation.navigate('PoolingDetails' as never, { 
                  offerId: offer.offerId || offer._id, 
                  offer,
                  passengerRoute: {
                    from: fromLocation,
                    to: toLocation,
                  }
                } as never)} 
                variant="primary" 
                size="small" 
                style={styles.detailsButton} 
              />
            </Card>
          ))}
          </>
        ) : fromLocation && toLocation && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.text }]}>No pooling offers found</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Try adjusting your search criteria or selecting different locations</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerImage: {
    width: '100%',
    height: 200,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '100%',
  },
  scrollContent: { padding: SPACING.md },
  searchCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  searchCardTitle: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.lg,
    marginBottom: SPACING.lg,
    fontWeight: '600',
  },
  locationInput: {
    marginBottom: SPACING.md,
  },
  arrowDivider: {
    alignItems: 'center',
    marginVertical: SPACING.xs,
    marginLeft: SPACING.md,
  },
  dateTimeSection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    borderTopWidth: 1,
    paddingTop: SPACING.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
  },
  filterSection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  filterLabel: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  vehicleFilterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  vehicleFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  passengerFilterBtn: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  vehicleFilterText: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
  },
  hintText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    marginTop: SPACING.xs,
  },
  searchButton: {
    marginTop: SPACING.sm,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  resultsHeaderLeft: {
    flex: 1,
  },
  resultsCount: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  resultsSubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerCard: { marginBottom: SPACING.md, padding: SPACING.md },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  timeText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, fontWeight: 'bold' },
  driverName: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, marginBottom: SPACING.xs },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  ratingText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm },
  seatsText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, marginBottom: SPACING.xs },
  priceText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, fontWeight: 'bold', marginBottom: SPACING.sm },
  detailsButton: { marginTop: SPACING.xs },
  loadMore: { alignItems: 'center', padding: SPACING.md },
  loadMoreText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    marginTop: SPACING.md,
  },
  pinkModeBanner: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  pinkModeText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  pinkBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: 'auto',
  },
  pinkBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
  },
});

export default SearchPoolingScreen;

