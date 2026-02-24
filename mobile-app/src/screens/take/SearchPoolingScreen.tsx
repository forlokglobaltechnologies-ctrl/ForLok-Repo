import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Alert, Platform, Modal, Animated, Dimensions, Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft, Search, Filter, Car, Bike, Star, MapPin, Calendar, Clock,
  ArrowRight, X, Navigation, Users, ChevronRight, Crosshair, Edit3,
  ArrowDownUp, Link2, Timer,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { Button as CustomButton } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { poolingApi, bookingApi, walletApi } from '@utils/apiClient';
import { LocationData } from '@components/common/LocationPicker';
import { normalize } from '@utils/responsive';

const { width: SCREEN_W } = Dimensions.get('window');

interface RouteParams {
  from?: LocationData;
  to?: LocationData;
  date?: string;
  vehicleType?: 'Car' | 'Bike' | 'Scooty';
  passengers?: number;
}

const SearchPoolingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { isPinkMode, theme } = useTheme();
  const params = (route.params as RouteParams) || {};

  const [offers, setOffers] = useState<any[]>([]);
  const [connectedRides, setConnectedRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromLocation, setFromLocation] = useState<LocationData | null>(params.from || null);
  const [toLocation, setToLocation] = useState<LocationData | null>(params.to || null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedConnectedRide, setSelectedConnectedRide] = useState<any>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [leg1PriceBreakdown, setLeg1PriceBreakdown] = useState<any>(null);
  const [leg2PriceBreakdown, setLeg2PriceBreakdown] = useState<any>(null);

  // "From" location popup
  const [showFromPopup, setShowFromPopup] = useState(false);
  const [gettingCurrentLoc, setGettingCurrentLoc] = useState(false);
  const popupAnim = useRef(new Animated.Value(0)).current;

  const initDate = (): Date => {
    if (params.date) {
      const parsed = new Date(params.date + 'T00:00:00');
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  };
  const [date, setDate] = useState<Date>(initDate);
  const [anyDate, setAnyDate] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [vehicleType, setVehicleType] = useState<'Car' | 'Bike' | 'Scooty' | null>(params.vehicleType || null);
  const [passengers, setPassengers] = useState<number>(params.passengers || 1);
  const [hasAutoSearched, setHasAutoSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterCount = (anyDate ? 0 : 1) + (time ? 1 : 0) + (vehicleType ? 1 : 0) + (passengers > 1 ? 1 : 0);

  // Show "from" popup if arriving with a "to" but no "from"
  useEffect(() => {
    if (toLocation && !fromLocation) {
      setTimeout(() => openFromPopup(), 400);
    }
  }, []);

  const openFromPopup = () => {
    setShowFromPopup(true);
    Animated.timing(popupAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  };
  const closeFromPopup = () => {
    Animated.timing(popupAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShowFromPopup(false));
  };

  const handleUseCurrentLocation = async () => {
    setGettingCurrentLoc(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to detect your current location');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      const resp = await fetch(`https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}&limit=1`, {
        headers: { 'User-Agent': 'Forlok-App/1.0' },
      });
      let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      let city = '';
      let state = '';
      if (resp.ok) {
        const data = await resp.json();
        const p = data?.features?.[0]?.properties;
        if (p) {
          const parts = [p.name, p.street, p.city || p.town || p.village, p.state].filter(Boolean);
          address = parts.join(', ');
          city = p.city || p.town || p.village || '';
          state = p.state || '';
        }
      }
      setFromLocation({ address, lat: latitude, lng: longitude, city, state });
      closeFromPopup();
    } catch (err) {
      console.error('Error getting location:', err);
      Alert.alert('Error', 'Could not get your current location');
    } finally {
      setGettingCurrentLoc(false);
    }
  };

  const handleCustomFrom = () => {
    closeFromPopup();
    setTimeout(() => {
      (navigation.navigate as any)('LocationPicker', {
        title: 'Select Pickup Location',
        onLocationSelect: (location: LocationData) => {
          setFromLocation(location);
          setOffers([]);
        },
      });
    }, 250);
  };

  const formatDateDisplay = (d: Date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(d); dateOnly.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateOnly.getTime() === today.getTime()) return 'Today';
    if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const formatTimeDisplay = (t: Date) => {
    let hours = t.getHours();
    const minutes = t.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) { setDate(selectedDate); setAnyDate(false); setOffers([]); }
  };
  const onTimeChange = (_event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) { setTime(selectedTime); setOffers([]); }
  };

  const loadOffers = async () => {
    if (!fromLocation || !toLocation) {
      Alert.alert('Missing Information', 'Please select both From and To locations');
      return;
    }
    if (!fromLocation.lat || !fromLocation.lng || !toLocation.lat || !toLocation.lng) {
      Alert.alert('Invalid Location', 'Please select valid locations with coordinates');
      return;
    }
    try {
      setLoading(true);
      setConnectedRides([]);
      const fromLat = typeof fromLocation.lat === 'number' ? fromLocation.lat : parseFloat(String(fromLocation.lat));
      const fromLng = typeof fromLocation.lng === 'number' ? fromLocation.lng : parseFloat(String(fromLocation.lng));
      const toLat = typeof toLocation.lat === 'number' ? toLocation.lat : parseFloat(String(toLocation.lat));
      const toLng = typeof toLocation.lng === 'number' ? toLocation.lng : parseFloat(String(toLocation.lng));
      if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
        Alert.alert('Invalid Coordinates', 'Location coordinates are invalid. Please reselect locations.');
        return;
      }
      const dateStr = anyDate ? undefined : date.toISOString().split('T')[0];
      const timeStr = time ? formatTimeDisplay(time) : undefined;
      const searchParams: any = { fromLat, fromLng, toLat, toLng, date: dateStr, time: timeStr, pinkOnly: isPinkMode };
      if (vehicleType) searchParams.vehicleType = vehicleType;

      // Use connected search API (returns both direct + connected)
      const response = await poolingApi.searchConnectedOffers(searchParams);
      if (response.success && response.data) {
        let offersData = response.data.direct || [];
        if (vehicleType) offersData = offersData.filter((o: any) => (o.vehicle?.type || '').toLowerCase() === vehicleType.toLowerCase());
        if (passengers > 1) offersData = offersData.filter((o: any) => (o.availableSeats || 0) >= passengers);
        setOffers(offersData);
        setConnectedRides(response.data.connected || []);
      } else {
        setOffers([]);
        setConnectedRides([]);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to load offers: ${error.message || 'Unknown error'}`);
      setOffers([]);
      setConnectedRides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAutoSearched && fromLocation?.lat && fromLocation?.lng && toLocation?.lat && toLocation?.lng
      && fromLocation.lat !== 0 && fromLocation.lng !== 0 && toLocation.lat !== 0 && toLocation.lng !== 0) {
      setHasAutoSearched(true);
      loadOffers();
    }
  }, [fromLocation, toLocation]);

  const handleSelectFromLocation = () => {
    (navigation.navigate as any)('LocationPicker', {
      title: 'Select Pickup Location',
      initialLocation: fromLocation || undefined,
      onLocationSelect: (location: LocationData) => { setFromLocation(location); setOffers([]); },
    });
  };
  const handleSelectToLocation = () => {
    (navigation.navigate as any)('LocationPicker', {
      title: 'Select Destination',
      initialLocation: toLocation || undefined,
      onLocationSelect: (location: LocationData) => { setToLocation(location); setOffers([]); },
    });
  };

  const swapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
    setOffers([]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      {/* ── Top Route Card ── */}
      <View style={[styles.topCard, { backgroundColor: '#FFFFFF' }]}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: theme.colors.text }]}>Find a Ride</Text>
          <TouchableOpacity
            onPress={() => setShowFilters((prev: boolean) => !prev)}
            style={[styles.filterHeaderBtn, { borderColor: showFilters ? theme.colors.primary : theme.colors.border }]}
            activeOpacity={0.8}
          >
            <Filter size={17} color={showFilters ? theme.colors.primary : theme.colors.textSecondary} />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={[styles.filterDropdownCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.filterDropdownTitle, { color: theme.colors.text }]}>Filters</Text>

            <View style={styles.filterActionsRow}>
              <TouchableOpacity
                style={[
                  styles.filterActionChip,
                  !anyDate ? { backgroundColor: `${theme.colors.primary}15`, borderColor: theme.colors.primary } : { borderColor: theme.colors.border },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={14} color={!anyDate ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.filterActionText, { color: !anyDate ? theme.colors.primary : theme.colors.textSecondary }]}>
                  {anyDate ? 'Any date' : formatDateDisplay(date)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterActionChip,
                  time ? { backgroundColor: `${theme.colors.primary}15`, borderColor: theme.colors.primary } : { borderColor: theme.colors.border },
                ]}
                onPress={() => setShowTimePicker(true)}
              >
                <Clock size={14} color={time ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.filterActionText, { color: time ? theme.colors.primary : theme.colors.textSecondary }]}>
                  {time ? formatTimeDisplay(time) : 'Any time'}
                </Text>
                {time && (
                  <TouchableOpacity
                    onPress={() => { setTime(null); setOffers([]); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={12} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Vehicle</Text>
            <View style={styles.filterRow}>
              {([null, 'Car', 'Bike', 'Scooty'] as const).map((vt) => (
                <TouchableOpacity
                  key={vt || 'all'}
                  style={[styles.filterPill, vehicleType === vt ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderWidth: 1 }]}
                  onPress={() => { setVehicleType(vt as any); if (vt === 'Bike' || vt === 'Scooty') setPassengers(1); setOffers([]); }}
                >
                  {vt === 'Car' && <Car size={14} color={vehicleType === vt ? '#FFF' : theme.colors.textSecondary} />}
                  {vt === 'Bike' && <Bike size={14} color={vehicleType === vt ? '#FFF' : theme.colors.textSecondary} />}
                  {vt === 'Scooty' && <MaterialCommunityIcons name="moped" size={14} color={vehicleType === vt ? '#FFF' : theme.colors.textSecondary} />}
                  <Text style={[styles.filterPillText, { color: vehicleType === vt ? '#FFF' : theme.colors.text }]}>{vt || 'All'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: theme.colors.text, marginTop: normalize(10) }]}>Seats</Text>
            <View style={styles.filterRow}>
              {[1, 2, 3, 4].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.filterPill, { minWidth: normalize(44) }, passengers === n ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderWidth: 1 }]}
                  onPress={() => { if ((vehicleType !== 'Bike' && vehicleType !== 'Scooty') || n === 1) { setPassengers(n); setOffers([]); } }}
                  disabled={(vehicleType === 'Bike' || vehicleType === 'Scooty') && n > 1}
                >
                  <Text style={[styles.filterPillText, { color: passengers === n ? '#FFF' : theme.colors.text }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterFooterRow}>
              <TouchableOpacity
                style={[styles.filterFooterBtn, { borderColor: theme.colors.border }]}
                onPress={() => {
                  setAnyDate(true);
                  setTime(null);
                  setVehicleType(null);
                  setPassengers(1);
                  setOffers([]);
                }}
              >
                <Text style={[styles.filterFooterText, { color: theme.colors.textSecondary }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterFooterBtn, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={[styles.filterFooterText, { color: '#FFF' }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Image
          source={require('../../../assets/forlok_find_a_ride_vector_white_bg_v2.png')}
          style={styles.findRideHero}
          resizeMode="contain"
        />

        {/* Route inputs */}
        <View style={styles.routeCard}>
          <View style={styles.routeDots}>
            <View style={[styles.dotGreen, { backgroundColor: '#4CAF50' }]} />
            <View style={[styles.dotLine, { backgroundColor: theme.colors.border }]} />
            <View style={[styles.dotRed, { backgroundColor: '#F44336' }]} />
          </View>
          <View style={styles.routeInputs}>
            <TouchableOpacity onPress={handleSelectFromLocation} style={[styles.routeInput, { borderColor: theme.colors.border }]} activeOpacity={0.7}>
              <Text style={[styles.routeInputText, fromLocation ? { color: theme.colors.text } : { color: '#999' }]} numberOfLines={1}>
                {fromLocation?.address?.split(',')[0] || fromLocation?.city || 'Pickup location'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSelectToLocation} style={[styles.routeInput, { borderColor: theme.colors.border }]} activeOpacity={0.7}>
              <Text style={[styles.routeInputText, toLocation ? { color: theme.colors.text } : { color: '#999' }]} numberOfLines={1}>
                {toLocation?.address?.split(',')[0] || toLocation?.city || 'Where to?'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={swapLocations} style={[styles.swapBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]} activeOpacity={0.7}>
            <ArrowDownUp size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>


        {/* Search button */}
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: theme.colors.primary, opacity: (!fromLocation || !toLocation || loading) ? 0.5 : 1 }]}
          onPress={loadOffers}
          disabled={!fromLocation || !toLocation || loading}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Search size={18} color="#FFF" />}
          <Text style={styles.searchBtnText}>{loading ? 'Searching...' : 'Search Rides'}</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDateChange} minimumDate={new Date()} />
      )}
      {showTimePicker && (
        <DateTimePicker value={time || new Date()} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onTimeChange} />
      )}

      {/* ── Results ── */}
      <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent} showsVerticalScrollIndicator={false}>
        {fromLocation && toLocation && !loading && (
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsTitle, { color: theme.colors.text }]}>
              {offers.length > 0 ? `${offers.length} ride${offers.length > 1 ? 's' : ''} available` : 'No rides found'}
            </Text>
            {offers.length > 0 && (
              <Text style={[styles.resultsSub, { color: theme.colors.textSecondary }]}>
                {fromLocation.city || fromLocation.address.split(',')[0]} → {toLocation.city || toLocation.address.split(',')[0]}
              </Text>
            )}
          </View>
        )}

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Finding the best rides...</Text>
          </View>
        )}

        {isPinkMode && offers.length > 0 && (
          <View style={[styles.pinkBanner, { backgroundColor: `${theme.colors.primary}15` }]}>
            <Text style={[styles.pinkBannerText, { color: theme.colors.primary }]}>HerPooling — Showing female drivers only</Text>
          </View>
        )}

        {offers.map((offer: any) => {
          const vType = (offer.vehicle?.type || '').toLowerCase();
          const isCarType = vType === 'car';
          const isScootyType = vType === 'scooty' || vType === 'scooter';
          return (
            <TouchableOpacity
              key={offer.offerId || offer._id}
              style={[styles.rideCard, { backgroundColor: theme.colors.surface }]}
              activeOpacity={0.8}
              onPress={() => (navigation.navigate as any)('PoolingDetails', {
                offerId: offer.offerId || offer._id,
                offer,
                passengerRoute: { from: fromLocation, to: toLocation },
                seatsRequested: passengers,
              })}
            >
              <View style={styles.rideTop}>
                <View style={[styles.rideAvatar, { backgroundColor: isCarType ? '#E3F2FD' : isScootyType ? '#F3E5F5' : '#FFF3E0' }]}>
                  {isCarType ? <Car size={20} color="#1565C0" /> : isScootyType ? <MaterialCommunityIcons name="moped" size={20} color="#6A1B9A" /> : <Bike size={20} color="#E65100" />}
                </View>
                <View style={styles.rideInfo}>
                  <Text style={[styles.rideDriver, { color: theme.colors.text }]}>{offer.driver?.name || 'Driver'}</Text>
                  <View style={styles.rideRating}>
                    <Star size={13} color="#F5A623" fill="#F5A623" />
                    <Text style={[styles.rideRatingText, { color: theme.colors.textSecondary }]}>
                      {Number(offer.driver?.rating || 0).toFixed(1)} ({offer.driver?.totalReviews || 0})
                    </Text>
                  </View>
                </View>
                <View style={styles.ridePrice}>
                  <Text style={[styles.ridePriceAmount, { color: theme.colors.primary }]}>₹{offer.price || 0}</Text>
                  <Text style={[styles.ridePricePer, { color: theme.colors.textSecondary }]}>per seat</Text>
                </View>
              </View>

              <View style={[styles.rideRoute, { borderTopColor: theme.colors.border }]}>
                <View style={styles.rideRouteRow}>
                  <View style={[styles.rideRouteDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={[styles.rideRouteText, { color: theme.colors.text }]} numberOfLines={1}>
                    {offer.route?.from?.city || offer.route?.from?.address?.split(',')[0] || 'Pickup'}
                  </Text>
                  <Text style={[styles.rideTime, { color: theme.colors.textSecondary }]}>
                    {offer.time || new Date(offer.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {offer.route?.waypoints && offer.route.waypoints.length > 0 && (
                  <View style={styles.viaRow}>
                    <View style={styles.viaDash} />
                    <Text style={[styles.viaText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      via {offer.route.waypoints
                        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
                        .map((wp: any) => wp.city || wp.address?.split(',')[0])
                        .join(', ')}
                    </Text>
                  </View>
                )}
                <View style={styles.rideRouteRow}>
                  <View style={[styles.rideRouteDot, { backgroundColor: '#F44336' }]} />
                  <Text style={[styles.rideRouteText, { color: theme.colors.text }]} numberOfLines={1}>
                    {offer.route?.to?.city || offer.route?.to?.address?.split(',')[0] || 'Drop'}
                  </Text>
                </View>
              </View>

              <View style={styles.rideBottom}>
                <View style={styles.rideTag}>
                  <Users size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.rideTagText, { color: theme.colors.textSecondary }]}>{offer.availableSeats || 0} seats left</Text>
                </View>
                {offer.vehicle?.name && (
                  <View style={styles.rideTag}>
                    <Text style={[styles.rideTagText, { color: theme.colors.textSecondary }]}>{offer.vehicle.name}</Text>
                  </View>
                )}
                <ChevronRight size={18} color={theme.colors.textSecondary} style={{ marginLeft: 'auto' }} />
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ── Connected Rides ── */}
        {connectedRides.length > 0 && (
          <View style={styles.connectedSection}>
            <View style={styles.connectedHeader}>
              <Link2 size={16} color={theme.colors.primary} />
              <Text style={[styles.connectedTitle, { color: theme.colors.text }]}>Connected Rides</Text>
            </View>
            <Text style={[styles.connectedSub, { color: theme.colors.textSecondary }]}>
              No single driver covers your route — chain 2 rides with a short transfer
            </Text>

            {connectedRides.map((ride: any, idx: number) => {
              const leg1 = ride.legs?.[0];
              const leg2 = ride.legs?.[1];
              if (!leg1 || !leg2) return null;
              const leg1VType = (leg1.offer?.vehicle?.type || '').toLowerCase();
              const leg2VType = (leg2.offer?.vehicle?.type || '').toLowerCase();

              return (
                <View
                  key={`connected-${idx}`}
                  style={[styles.connectedCard, { backgroundColor: theme.colors.surface }]}
                >
                  {/* Total summary */}
                  <View style={styles.connectedSummary}>
                    <Text style={[styles.connectedTotal, { color: theme.colors.primary }]}>
                      ₹{ride.totalPrice}
                    </Text>
                    <Text style={[styles.connectedDuration, { color: theme.colors.textSecondary }]}>
                      {ride.totalDuration}
                    </Text>
                  </View>

                  {/* Timeline */}
                  <View style={styles.timeline}>
                    {/* Leg 1 */}
                    <View style={styles.timelineRow}>
                      <View style={styles.timelineDotCol}>
                        <View style={[styles.timelineDotFilled, { backgroundColor: '#4CAF50' }]} />
                        <View style={[styles.timelineLine, { backgroundColor: '#4CAF50' }]} />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={[styles.timelineTime, { color: theme.colors.textSecondary }]}>{leg1.departureTime}</Text>
                        <Text style={[styles.timelinePlace, { color: theme.colors.text }]} numberOfLines={1}>
                          {leg1.from?.city || leg1.from?.address?.split(',')[0] || 'Pickup'}
                        </Text>
                        <View style={styles.timelineLeg}>
                          <View style={[styles.timelineLegIcon, { backgroundColor: leg1VType === 'car' ? '#E3F2FD' : '#FFF3E0' }]}>
                            {leg1VType === 'car'
                              ? <Car size={14} color="#1565C0" />
                              : <Bike size={14} color="#E65100" />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.timelineLegDriver, { color: theme.colors.text }]}>
                              {leg1.offer?.driverName || 'Driver'}
                            </Text>
                            <Text style={[styles.timelineLegInfo, { color: theme.colors.textSecondary }]}>
                              {leg1.duration} · ₹{leg1.price}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Transfer */}
                    <View style={styles.timelineRow}>
                      <View style={styles.timelineDotCol}>
                        <View style={[styles.timelineDotTransfer, { borderColor: '#FF9800' }]} />
                        <View style={[styles.timelineLine, { backgroundColor: '#FF9800' }]} />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={[styles.timelineTime, { color: theme.colors.textSecondary }]}>{leg1.arrivalTime}</Text>
                        <Text style={[styles.timelinePlace, { color: theme.colors.text }]} numberOfLines={1}>
                          {ride.transferPoint?.city || ride.transferPoint?.address?.split(',')[0] || 'Transfer'}
                        </Text>
                        <View style={[styles.waitBadge, { backgroundColor: '#FFF3E0' }]}>
                          <Timer size={12} color="#E65100" />
                          <Text style={styles.waitText}>Wait {ride.waitTime}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Leg 2 */}
                    <View style={styles.timelineRow}>
                      <View style={styles.timelineDotCol}>
                        <View style={[styles.timelineDotFilled, { backgroundColor: '#FF9800' }]} />
                        <View style={[styles.timelineLine, { backgroundColor: '#F44336' }]} />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={[styles.timelineTime, { color: theme.colors.textSecondary }]}>{leg2.departureTime}</Text>
                        <Text style={[styles.timelinePlace, { color: theme.colors.text }]} numberOfLines={1}>
                          {leg2.from?.city || leg2.from?.address?.split(',')[0] || 'Pickup'}
                        </Text>
                        <View style={styles.timelineLeg}>
                          <View style={[styles.timelineLegIcon, { backgroundColor: leg2VType === 'car' ? '#E3F2FD' : '#FFF3E0' }]}>
                            {leg2VType === 'car'
                              ? <Car size={14} color="#1565C0" />
                              : <Bike size={14} color="#E65100" />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.timelineLegDriver, { color: theme.colors.text }]}>
                              {leg2.offer?.driverName || 'Driver'}
                            </Text>
                            <Text style={[styles.timelineLegInfo, { color: theme.colors.textSecondary }]}>
                              {leg2.duration} · ₹{leg2.price}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Destination */}
                    <View style={styles.timelineRow}>
                      <View style={styles.timelineDotCol}>
                        <View style={[styles.timelineDotFilled, { backgroundColor: '#F44336' }]} />
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={[styles.timelineTime, { color: theme.colors.textSecondary }]}>{leg2.arrivalTime}</Text>
                        <Text style={[styles.timelinePlace, { color: theme.colors.text }]} numberOfLines={1}>
                          {leg2.to?.city || leg2.to?.address?.split(',')[0] || 'Destination'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Book Button */}
                  <TouchableOpacity
                    style={[styles.connectedBookBtn, { backgroundColor: theme.colors.primary }]}
                    activeOpacity={0.8}
                    disabled={priceLoading}
                    onPress={async () => {
                      setSelectedConnectedRide(ride);
                      setPriceLoading(true);
                      setLeg1PriceBreakdown(null);
                      setLeg2PriceBreakdown(null);
                      try {
                        const leg1 = ride.legs[0];
                        const leg2 = ride.legs[1];
                        const [p1, p2] = await Promise.all([
                          poolingApi.calculatePrice({
                            offerId: leg1.offer.offerId,
                            passengerRoute: {
                              from: { address: leg1.from.address, lat: leg1.from.lat, lng: leg1.from.lng, city: leg1.from.city },
                              to: { address: leg1.to.address, lat: leg1.to.lat, lng: leg1.to.lng, city: leg1.to.city },
                            },
                          }),
                          poolingApi.calculatePrice({
                            offerId: leg2.offer.offerId,
                            passengerRoute: {
                              from: { address: leg2.from.address, lat: leg2.from.lat, lng: leg2.from.lng, city: leg2.from.city },
                              to: { address: leg2.to.address, lat: leg2.to.lat, lng: leg2.to.lng, city: leg2.to.city },
                            },
                          }),
                        ]);
                        if (p1.success && p1.data && p2.success && p2.data) {
                          setLeg1PriceBreakdown(p1.data);
                          setLeg2PriceBreakdown(p2.data);
                          setShowBookingModal(true);
                        } else {
                          Alert.alert('Price Error', 'Could not calculate prices. Please try again.');
                        }
                      } catch (err: any) {
                        Alert.alert('Error', err.message || 'Failed to calculate prices');
                      } finally {
                        setPriceLoading(false);
                      }
                    }}
                  >
                    {priceLoading && selectedConnectedRide === ride ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Link2 size={16} color="#FFF" />
                        <Text style={styles.connectedBookText}>Book Connected Ride</Text>
                      </>
                    )}
                </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {!loading && fromLocation && toLocation && offers.length === 0 && connectedRides.length === 0 && (
          <View style={styles.emptyWrap}>
            <Search size={48} color={theme.colors.border} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No rides found</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>Try different dates, times, or locations</Text>
          </View>
        )}

        <View style={{ height: normalize(30) }} />
      </ScrollView>

      {/* ── Connected Booking Modal ── */}
      <Modal visible={showBookingModal} transparent animationType="slide" onRequestClose={() => setShowBookingModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Confirm Connected Ride</Text>

            {selectedConnectedRide && leg1PriceBreakdown && leg2PriceBreakdown && (
              <>
                {/* Leg 1 Summary */}
                <View style={[styles.modalLeg, { borderColor: theme.colors.border }]}>
                  <View style={styles.modalLegHeader}>
                    <View style={[styles.modalLegBadge, { backgroundColor: '#E8F5E9' }]}>
                      <Text style={[styles.modalLegBadgeText, { color: '#2E7D32' }]}>Leg 1</Text>
                    </View>
                    <Text style={[styles.modalLegPrice, { color: theme.colors.primary }]}>
                      ₹{Math.round(leg1PriceBreakdown.totalAmount)}
                    </Text>
                  </View>
                  <Text style={[styles.modalLegRoute, { color: theme.colors.text }]} numberOfLines={1}>
                    {selectedConnectedRide.legs?.[0]?.from?.city || selectedConnectedRide.legs?.[0]?.from?.address?.split(',')[0]}
                    {' → '}
                    {selectedConnectedRide.legs?.[0]?.to?.city || selectedConnectedRide.legs?.[0]?.to?.address?.split(',')[0]}
                  </Text>
                  <Text style={[styles.modalLegMeta, { color: theme.colors.textSecondary }]}>
                    {selectedConnectedRide.legs?.[0]?.offer?.driverName} · {selectedConnectedRide.legs?.[0]?.departureTime} - {selectedConnectedRide.legs?.[0]?.arrivalTime} · {selectedConnectedRide.legs?.[0]?.duration}
                  </Text>
                  <View style={styles.modalBreakdownRow}>
                    <Text style={[styles.modalBreakdownLabel, { color: theme.colors.textSecondary }]}>
                      {leg1PriceBreakdown.baseDistance?.toFixed(1)}km × ₹{leg1PriceBreakdown.baseRatePerKm}/km
                    </Text>
                    <Text style={[styles.modalBreakdownLabel, { color: theme.colors.textSecondary }]}>
                      Fee: ₹{Math.round(leg1PriceBreakdown.platformFee)}
                    </Text>
                  </View>
                </View>

                {/* Transfer */}
                <View style={styles.modalTransfer}>
                  <Timer size={14} color="#FF9800" />
                  <Text style={[styles.modalTransferText, { color: theme.colors.textSecondary }]}>
                    Transfer at {selectedConnectedRide.transferPoint?.city || selectedConnectedRide.transferPoint?.address?.split(',')[0]} · Wait {selectedConnectedRide.waitTime}
                  </Text>
                </View>

                {/* Leg 2 Summary */}
                <View style={[styles.modalLeg, { borderColor: theme.colors.border }]}>
                  <View style={styles.modalLegHeader}>
                    <View style={[styles.modalLegBadge, { backgroundColor: '#FFF3E0' }]}>
                      <Text style={[styles.modalLegBadgeText, { color: '#E65100' }]}>Leg 2</Text>
                    </View>
                    <Text style={[styles.modalLegPrice, { color: theme.colors.primary }]}>
                      ₹{Math.round(leg2PriceBreakdown.totalAmount)}
                    </Text>
                  </View>
                  <Text style={[styles.modalLegRoute, { color: theme.colors.text }]} numberOfLines={1}>
                    {selectedConnectedRide.legs?.[1]?.from?.city || selectedConnectedRide.legs?.[1]?.from?.address?.split(',')[0]}
                    {' → '}
                    {selectedConnectedRide.legs?.[1]?.to?.city || selectedConnectedRide.legs?.[1]?.to?.address?.split(',')[0]}
                  </Text>
                  <Text style={[styles.modalLegMeta, { color: theme.colors.textSecondary }]}>
                    {selectedConnectedRide.legs?.[1]?.offer?.driverName} · {selectedConnectedRide.legs?.[1]?.departureTime} - {selectedConnectedRide.legs?.[1]?.arrivalTime} · {selectedConnectedRide.legs?.[1]?.duration}
                  </Text>
                  <View style={styles.modalBreakdownRow}>
                    <Text style={[styles.modalBreakdownLabel, { color: theme.colors.textSecondary }]}>
                      {leg2PriceBreakdown.baseDistance?.toFixed(1)}km × ₹{leg2PriceBreakdown.baseRatePerKm}/km
                    </Text>
                    <Text style={[styles.modalBreakdownLabel, { color: theme.colors.textSecondary }]}>
                      Fee: ₹{Math.round(leg2PriceBreakdown.platformFee)}
                    </Text>
                  </View>
                </View>

                {/* Total */}
                <View style={[styles.modalTotal, { borderTopColor: theme.colors.border }]}>
                  <View>
                    <Text style={[styles.modalTotalLabel, { color: theme.colors.text }]}>Total</Text>
                    <Text style={[styles.modalBreakdownLabel, { color: theme.colors.textSecondary }]}>
                      Incl. ₹{Math.round(leg1PriceBreakdown.platformFee + leg2PriceBreakdown.platformFee)} platform fee
                    </Text>
                  </View>
                  <Text style={[styles.modalTotalPrice, { color: theme.colors.primary }]}>
                    ₹{Math.round(leg1PriceBreakdown.totalAmount + leg2PriceBreakdown.totalAmount)}
                  </Text>
                </View>

                <Text style={[styles.modalNote, { color: theme.colors.textSecondary }]}>
                  Payment is per-leg at trip end (cash or online). Wallet ₹100 minimum required.
                </Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { borderColor: theme.colors.border }]}
                    onPress={() => setShowBookingModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalCancelText, { color: theme.colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, { backgroundColor: theme.colors.primary, opacity: bookingInProgress ? 0.6 : 1 }]}
                    disabled={bookingInProgress}
                    activeOpacity={0.8}
                    onPress={async () => {
                      if (!selectedConnectedRide || !fromLocation || !toLocation || !leg1PriceBreakdown || !leg2PriceBreakdown) return;
                      try {
                        setBookingInProgress(true);

                        const walletCheck = await walletApi.canBookRide();
                        if (walletCheck.success && walletCheck.data && !walletCheck.data.canBook) {
                          const shortfall = walletCheck.data.shortfall || 0;
                          Alert.alert(
                            'Insufficient Wallet Balance',
                            `You need minimum ₹${walletCheck.data.requiredBalance || 100} to book. Please recharge ₹${shortfall} to continue.`,
                            [
                              { text: 'Recharge Now', onPress: () => { setShowBookingModal(false); navigation.navigate('Wallet' as never); } },
                              { text: 'Cancel', style: 'cancel' },
                            ]
                          );
                          setBookingInProgress(false);
                          return;
                        }

                        const leg1 = selectedConnectedRide.legs[0];
                        const leg2 = selectedConnectedRide.legs[1];
                        const result = await bookingApi.createConnectedBooking({
                          leg1OfferId: leg1.offer.offerId,
                          leg2OfferId: leg2.offer.offerId,
                          leg1Route: {
                            from: { address: leg1.from.address, lat: leg1.from.lat, lng: leg1.from.lng, city: leg1.from.city },
                            to: { address: leg1.to.address, lat: leg1.to.lat, lng: leg1.to.lng, city: leg1.to.city },
                          },
                          leg2Route: {
                            from: { address: leg2.from.address, lat: leg2.from.lat, lng: leg2.from.lng, city: leg2.from.city },
                            to: { address: leg2.to.address, lat: leg2.to.lat, lng: leg2.to.lng, city: leg2.to.city },
                          },
                          connectionPoint: selectedConnectedRide.transferPoint,
                          leg1Price: {
                            finalPrice: leg1PriceBreakdown.finalPrice,
                            platformFee: leg1PriceBreakdown.platformFee,
                            totalAmount: leg1PriceBreakdown.totalAmount,
                          },
                          leg2Price: {
                            finalPrice: leg2PriceBreakdown.finalPrice,
                            platformFee: leg2PriceBreakdown.platformFee,
                            totalAmount: leg2PriceBreakdown.totalAmount,
                          },
                        });
                        if (result.success) {
                          setShowBookingModal(false);
                          const combinedTotal = Math.round(leg1PriceBreakdown.totalAmount + leg2PriceBreakdown.totalAmount);
                          Alert.alert(
                            'Connected Ride Booked!',
                            `Your 2-leg journey is confirmed. Total: ₹${combinedTotal}`,
                            [{ text: 'View Bookings', onPress: () => (navigation.navigate as any)('History') },
                             { text: 'OK' }]
                          );
                          loadOffers();
                        } else {
                          Alert.alert('Booking Failed', result.message || 'Could not book connected ride');
                        }
                      } catch (err: any) {
                        Alert.alert('Error', err.message || 'Failed to book connected ride');
                      } finally {
                        setBookingInProgress(false);
                      }
                    }}
                  >
                    {bookingInProgress
                      ? <ActivityIndicator size="small" color="#FFF" />
                      : <Text style={styles.modalConfirmText}>Confirm Booking</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── From Location Popup ── */}
      {showFromPopup && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <TouchableOpacity style={styles.popupOverlay} activeOpacity={1} onPress={closeFromPopup}>
            <Animated.View style={[styles.popupCard, { backgroundColor: theme.colors.surface, opacity: popupAnim, transform: [{ translateY: popupAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
              <TouchableOpacity activeOpacity={1}>
                <Text style={[styles.popupTitle, { color: theme.colors.text }]}>Where are you starting from?</Text>
                <Text style={[styles.popupSub, { color: theme.colors.textSecondary }]}>
                  Going to {toLocation?.city || toLocation?.address?.split(',')[0] || 'destination'}
                </Text>

                <TouchableOpacity style={[styles.popupOption, { borderColor: theme.colors.border }]} onPress={handleUseCurrentLocation} activeOpacity={0.7}>
                  <View style={[styles.popupOptionIcon, { backgroundColor: '#E8F5E9' }]}>
                    {gettingCurrentLoc ? <ActivityIndicator size="small" color="#2E7D32" /> : <Crosshair size={20} color="#2E7D32" />}
                  </View>
                  <View style={styles.popupOptionInfo}>
                    <Text style={[styles.popupOptionTitle, { color: theme.colors.text }]}>Use current location</Text>
                    <Text style={[styles.popupOptionSub, { color: theme.colors.textSecondary }]}>Auto-detect via GPS</Text>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.popupOption, { borderColor: theme.colors.border }]} onPress={handleCustomFrom} activeOpacity={0.7}>
                  <View style={[styles.popupOptionIcon, { backgroundColor: '#E3F2FD' }]}>
                    <Edit3 size={20} color="#1565C0" />
                  </View>
                  <View style={styles.popupOptionInfo}>
                    <Text style={[styles.popupOptionTitle, { color: theme.colors.text }]}>Choose on map</Text>
                    <Text style={[styles.popupOptionSub, { color: theme.colors.textSecondary }]}>Search or pick a location</Text>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Top Card ──
  topCard: {
    paddingTop: normalize(44),
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  backBtn: { padding: normalize(6) },
  topTitle: { fontFamily: FONTS.medium, fontSize: normalize(18), fontWeight: 'bold' },
  filterHeaderBtn: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: normalize(-3),
    right: normalize(-3),
    minWidth: normalize(15),
    height: normalize(15),
    borderRadius: normalize(8),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: normalize(3),
  },
  filterBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(9),
    color: '#FFF',
    fontWeight: '700',
  },
  filterDropdownCard: {
    borderWidth: 1,
    borderRadius: normalize(14),
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  filterDropdownTitle: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '700', marginBottom: normalize(10) },
  filterActionsRow: { flexDirection: 'row', gap: normalize(8), marginBottom: normalize(10) },
  filterActionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: normalize(5),
    borderWidth: 1,
    borderRadius: normalize(20),
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(7),
  },
  filterActionText: { fontFamily: FONTS.medium, fontSize: normalize(11) },
  findRideHero: {
    width: '100%',
    height: normalize(174),
    marginBottom: SPACING.sm,
  },

  // ── Route Inputs ──
  routeCard: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  routeDots: { alignItems: 'center', marginRight: normalize(12), paddingVertical: normalize(4) },
  dotGreen: { width: normalize(10), height: normalize(10), borderRadius: normalize(5) },
  dotLine: { width: 2, height: normalize(28), marginVertical: normalize(3) },
  dotRed: { width: normalize(10), height: normalize(10), borderRadius: normalize(5) },
  routeInputs: { flex: 1, gap: normalize(8) },
  routeInput: {
    borderWidth: 1,
    borderRadius: normalize(12),
    paddingVertical: normalize(12),
    paddingHorizontal: SPACING.md,
  },
  routeInputText: { fontFamily: FONTS.medium, fontSize: normalize(14) },
  swapBtn: {
    width: normalize(34), height: normalize(34), borderRadius: normalize(17),
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginLeft: normalize(10),
  },

  // ── Filter Dropdown ──
  filterLabel: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '600', marginBottom: normalize(6) },
  filterRow: { flexDirection: 'row', gap: normalize(8), marginBottom: normalize(4) },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(5),
    paddingVertical: normalize(7), paddingHorizontal: normalize(14),
    borderRadius: normalize(20),
  },
  filterPillText: { fontFamily: FONTS.medium, fontSize: normalize(13) },
  filterFooterRow: { flexDirection: 'row', gap: normalize(8), marginTop: normalize(10) },
  filterFooterBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: normalize(12),
    paddingVertical: normalize(9),
  },
  filterFooterText: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '600' },

  // ── Search Button ──
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: normalize(8), paddingVertical: normalize(13),
    borderRadius: normalize(14), marginTop: normalize(4),
  },
  searchBtnText: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '600', color: '#FFF' },

  // ── Results ──
  results: { flex: 1, backgroundColor: '#FFFFFF' },
  resultsContent: { paddingHorizontal: SPACING.md, paddingTop: normalize(6), backgroundColor: '#FFFFFF' },
  resultsHeader: { marginBottom: SPACING.md },
  resultsTitle: { fontFamily: FONTS.medium, fontSize: normalize(17), fontWeight: 'bold' },
  resultsSub: { fontFamily: FONTS.regular, fontSize: normalize(13), marginTop: normalize(2) },
  loadingWrap: { alignItems: 'center', paddingVertical: normalize(60) },
  loadingText: { fontFamily: FONTS.regular, fontSize: normalize(14), marginTop: SPACING.md },
  pinkBanner: { padding: SPACING.sm, borderRadius: normalize(10), marginBottom: SPACING.md, alignItems: 'center' },
  pinkBannerText: { fontFamily: FONTS.medium, fontSize: normalize(12), fontWeight: '600' },

  // ── Ride Card ──
  rideCard: {
    borderRadius: normalize(16), marginBottom: normalize(12),
    padding: SPACING.md, ...SHADOWS.sm,
  },
  rideTop: { flexDirection: 'row', alignItems: 'center', marginBottom: normalize(12) },
  rideAvatar: {
    width: normalize(42), height: normalize(42), borderRadius: normalize(21),
    alignItems: 'center', justifyContent: 'center',
  },
  rideInfo: { flex: 1, marginLeft: normalize(12) },
  rideDriver: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '600' },
  rideRating: { flexDirection: 'row', alignItems: 'center', gap: normalize(4), marginTop: normalize(2) },
  rideRatingText: { fontFamily: FONTS.regular, fontSize: normalize(12) },
  ridePrice: { alignItems: 'flex-end' },
  ridePriceAmount: { fontFamily: FONTS.medium, fontSize: normalize(18), fontWeight: 'bold' },
  ridePricePer: { fontFamily: FONTS.regular, fontSize: normalize(11) },
  rideRoute: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: normalize(10), paddingBottom: normalize(10),
    gap: normalize(8),
  },
  rideRouteRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(10) },
  rideRouteDot: { width: normalize(8), height: normalize(8), borderRadius: normalize(4) },
  rideRouteText: { fontFamily: FONTS.regular, fontSize: normalize(13), flex: 1 },
  rideTime: { fontFamily: FONTS.medium, fontSize: normalize(12) },
  viaRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: normalize(2), gap: normalize(10) },
  viaDash: { width: normalize(4), height: normalize(16), borderLeftWidth: 1.5, borderLeftColor: '#BDBDBD', borderStyle: 'dashed', marginLeft: normalize(2) },
  viaText: { fontFamily: FONTS.regular, fontSize: normalize(11), fontStyle: 'italic', flex: 1 },
  rideBottom: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(10),
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F0F0F0',
    paddingTop: normalize(10),
  },
  rideTag: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(4),
    backgroundColor: '#F5F5F5', paddingVertical: normalize(4), paddingHorizontal: normalize(10),
    borderRadius: normalize(12),
  },
  rideTagText: { fontFamily: FONTS.regular, fontSize: normalize(11) },

  // ── Empty ──
  emptyWrap: { alignItems: 'center', paddingVertical: normalize(60) },
  emptyTitle: { fontFamily: FONTS.medium, fontSize: normalize(17), fontWeight: '600', marginTop: SPACING.md },
  emptySub: { fontFamily: FONTS.regular, fontSize: normalize(13), marginTop: normalize(4), textAlign: 'center' },

  // ── Connected Rides Section ──
  connectedSection: { marginTop: SPACING.lg },
  connectedHeader: { flexDirection: 'row', alignItems: 'center', gap: normalize(8), marginBottom: normalize(4) },
  connectedTitle: { fontFamily: FONTS.medium, fontSize: normalize(16), fontWeight: 'bold' },
  connectedSub: { fontFamily: FONTS.regular, fontSize: normalize(12), marginBottom: SPACING.md },
  connectedCard: {
    borderRadius: normalize(16), marginBottom: normalize(14),
    padding: SPACING.md, ...SHADOWS.sm,
  },
  connectedSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: normalize(12), paddingBottom: normalize(10),
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E0E0',
  },
  connectedTotal: { fontFamily: FONTS.medium, fontSize: normalize(20), fontWeight: 'bold' },
  connectedDuration: { fontFamily: FONTS.regular, fontSize: normalize(13) },
  connectedBookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: normalize(8), paddingVertical: normalize(12),
    borderRadius: normalize(12), marginTop: normalize(12),
  },
  connectedBookText: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '600', color: '#FFF' },

  // ── Timeline ──
  timeline: { paddingLeft: normalize(4) },
  timelineRow: { flexDirection: 'row', marginBottom: normalize(4) },
  timelineDotCol: { alignItems: 'center', width: normalize(20), marginRight: normalize(10) },
  timelineDotFilled: { width: normalize(10), height: normalize(10), borderRadius: normalize(5), zIndex: 1 },
  timelineDotTransfer: { width: normalize(12), height: normalize(12), borderRadius: normalize(6), borderWidth: 2, backgroundColor: '#FFF', zIndex: 1 },
  timelineLine: { width: 2, flex: 1, minHeight: normalize(40) },
  timelineContent: { flex: 1, paddingBottom: normalize(10) },
  timelineTime: { fontFamily: FONTS.medium, fontSize: normalize(11), marginBottom: normalize(2) },
  timelinePlace: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '600' },
  timelineLeg: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(8),
    marginTop: normalize(6), paddingVertical: normalize(6), paddingHorizontal: normalize(8),
    backgroundColor: '#FAFAFA', borderRadius: normalize(10),
  },
  timelineLegIcon: {
    width: normalize(28), height: normalize(28), borderRadius: normalize(14),
    alignItems: 'center', justifyContent: 'center',
  },
  timelineLegDriver: { fontFamily: FONTS.medium, fontSize: normalize(12), fontWeight: '600' },
  timelineLegInfo: { fontFamily: FONTS.regular, fontSize: normalize(11) },
  waitBadge: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(4),
    marginTop: normalize(4), paddingVertical: normalize(4), paddingHorizontal: normalize(8),
    borderRadius: normalize(8), alignSelf: 'flex-start',
  },
  waitText: { fontFamily: FONTS.medium, fontSize: normalize(11), color: '#E65100' },

  // ── Booking Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: normalize(24), borderTopRightRadius: normalize(24),
    padding: SPACING.lg, paddingBottom: normalize(40), maxHeight: '85%',
  },
  modalHandle: {
    width: normalize(36), height: normalize(4), borderRadius: normalize(2),
    backgroundColor: '#DDD', alignSelf: 'center', marginBottom: SPACING.md,
  },
  modalTitle: { fontFamily: FONTS.medium, fontSize: normalize(18), fontWeight: 'bold', marginBottom: SPACING.md },
  modalLeg: { borderWidth: 1, borderRadius: normalize(12), padding: SPACING.sm, marginBottom: normalize(8) },
  modalLegHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: normalize(6) },
  modalLegBadge: { paddingHorizontal: normalize(10), paddingVertical: normalize(3), borderRadius: normalize(8) },
  modalLegBadgeText: { fontFamily: FONTS.medium, fontSize: normalize(11), fontWeight: '600' },
  modalLegPrice: { fontFamily: FONTS.medium, fontSize: normalize(16), fontWeight: 'bold' },
  modalLegRoute: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '600', marginBottom: normalize(4) },
  modalLegMeta: { fontFamily: FONTS.regular, fontSize: normalize(12) },
  modalBreakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: normalize(4) },
  modalBreakdownLabel: { fontFamily: FONTS.regular, fontSize: normalize(11) },
  modalTransfer: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(6),
    paddingVertical: normalize(8), paddingHorizontal: SPACING.sm,
  },
  modalTransferText: { fontFamily: FONTS.regular, fontSize: normalize(12), flex: 1 },
  modalTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, paddingTop: SPACING.md, marginTop: SPACING.sm,
  },
  modalTotalLabel: { fontFamily: FONTS.medium, fontSize: normalize(16), fontWeight: 'bold' },
  modalTotalPrice: { fontFamily: FONTS.medium, fontSize: normalize(22), fontWeight: 'bold' },
  modalNote: { fontFamily: FONTS.regular, fontSize: normalize(11), marginTop: normalize(8), textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: normalize(12), marginTop: SPACING.lg },
  modalCancelBtn: {
    flex: 1, paddingVertical: normalize(14), borderRadius: normalize(12),
    borderWidth: 1, alignItems: 'center',
  },
  modalCancelText: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '600' },
  modalConfirmBtn: {
    flex: 2, paddingVertical: normalize(14), borderRadius: normalize(12),
    alignItems: 'center', justifyContent: 'center',
  },
  modalConfirmText: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '600', color: '#FFF' },

  // ── From Popup ──
  popupOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  popupCard: {
    borderTopLeftRadius: normalize(24), borderTopRightRadius: normalize(24),
    padding: SPACING.lg, paddingBottom: normalize(40),
  },
  popupTitle: { fontFamily: FONTS.medium, fontSize: normalize(20), fontWeight: 'bold', marginBottom: normalize(4) },
  popupSub: { fontFamily: FONTS.regular, fontSize: normalize(14), marginBottom: SPACING.lg },
  popupOption: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(14),
    paddingVertical: normalize(16), paddingHorizontal: SPACING.md,
    borderWidth: 1, borderRadius: normalize(16), marginBottom: SPACING.sm,
  },
  popupOptionIcon: {
    width: normalize(44), height: normalize(44), borderRadius: normalize(22),
    alignItems: 'center', justifyContent: 'center',
  },
  popupOptionInfo: { flex: 1 },
  popupOptionTitle: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '600' },
  popupOptionSub: { fontFamily: FONTS.regular, fontSize: normalize(12), marginTop: normalize(2) },
});

export default SearchPoolingScreen;
