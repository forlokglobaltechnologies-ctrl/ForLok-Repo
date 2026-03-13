import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, MessageCircle, MapPin, Clock, Banknote, CheckCircle, Coins } from 'lucide-react-native';
import { normalize, wp, hp } from '@utils/responsive';
import { COLORS, FONTS, SPACING } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { AppLoader } from '@components/common/AppLoader';
import { useLanguage } from '@context/LanguageContext';
import { useSOS } from '@context/SOSContext';
import { trackingApi, bookingApi, coinApi } from '@utils/apiClient';
import { WebView } from 'react-native-webview';
import LottieView from 'lottie-react-native';

interface RouteParams {
  bookingId?: string;
  booking?: any;
}

const TripTrackingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { setActiveBooking, clearActiveBooking } = useSOS();
  const params = (route.params as RouteParams) || {};
  const bookingId = params.bookingId || params.booking?.bookingId;
  
  const [booking, setBooking] = useState<any>(params.booking || null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastLocationUpdatedAt, setLastLocationUpdatedAt] = useState<Date | null>(null);
  const [eta, setEta] = useState(0);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState('0m');
  const [loading, setLoading] = useState(true);
  const [mapHTML, setMapHTML] = useState<string>('');
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Payment flow states
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [passengerCode, setPassengerCode] = useState<string | null>(null);
  const [tripCompleted, setTripCompleted] = useState(false);

  // Coin discount states
  const [coinBalance, setCoinBalance] = useState(0);
  const [coinWorthInRupees, setCoinWorthInRupees] = useState(0);
  const [useCoins, setUseCoins] = useState(false);
  const [coinDiscount, setCoinDiscount] = useState({ maxCoins: 0, maxDiscount: 0, discountedAmount: 0 });

  // Coin celebration modal
  const [showCoinCelebration, setShowCoinCelebration] = useState(false);
  const [coinsEarnedText, setCoinsEarnedText] = useState('');
  const DEFAULT_MAP_CENTER = { lat: 20.5937, lng: 78.9629 };

  const toPositiveNumber = (value: any): number | null => {
    const n = Number(value);
    if (Number.isNaN(n) || n <= 0) return null;
    return n;
  };

  const normalizeDistanceKm = (rawDistance: number | null): number | null => {
    if (!rawDistance) return null;
    // Some providers return meters; convert when clearly in meters range.
    return rawDistance > 200 ? rawDistance / 1000 : rawDistance;
  };

  const normalizeDurationMinutes = (rawDuration: number | null): number | null => {
    if (!rawDuration) return null;
    // Some providers return seconds; convert when clearly in seconds range.
    return rawDuration > 600 ? rawDuration / 60 : rawDuration;
  };

  const formatDurationText = (totalMinutes: number): string => {
    const rounded = Math.max(1, Math.round(totalMinutes));
    const hours = Math.floor(rounded / 60);
    const minutes = rounded % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const applyBookingRouteMetrics = (bookingData: any) => {
    const rawDistance =
      toPositiveNumber(bookingData?.route?.distance) ??
      toPositiveNumber(bookingData?.distance) ??
      toPositiveNumber(bookingData?.estimatedDistance);

    const rawDuration =
      toPositiveNumber(bookingData?.route?.duration) ??
      toPositiveNumber(bookingData?.duration) ??
      toPositiveNumber(bookingData?.estimatedDuration);

    const distanceKm = normalizeDistanceKm(rawDistance);
    const durationMinutes = normalizeDurationMinutes(rawDuration);

    if (distanceKm) {
      setDistance(Math.round(distanceKm * 10) / 10);
    }
    if (durationMinutes) {
      setDuration(formatDurationText(durationMinutes));
      if (eta <= 0) {
        setEta(Math.max(1, Math.round(durationMinutes)));
      }
    }
  };

  useEffect(() => {
    if (bookingId) {
      loadBooking();
      startLocationTracking();
      setActiveBooking(bookingId);
    }

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      clearActiveBooking();
    };
  }, [bookingId]);

  const loadBooking = async () => {
    if (!bookingId) return;

    try {
      const response = await bookingApi.getBooking(bookingId);
      if (response.success && response.data) {
        setBooking(response.data);
        applyBookingRouteMetrics(response.data);

        // Ensure map is visible even before live driver GPS arrives.
        if (!driverLocation) {
          const fallback = getFallbackCoordinates(response.data);
          updateMap(fallback.lat, fallback.lng);
        }
        
        // If driver marked passenger as got_out → show payment choice
        if (response.data.passengerStatus === 'got_out' && !response.data.paymentMethod) {
          setShowPaymentChoice(true);
        }
        // If trip is completed
        if (response.data.status === 'completed' && !tripCompleted) {
          setTripCompleted(true);
          setShowPaymentChoice(false);
          setPassengerCode(null);
          // Show coin celebration
          setCoinsEarnedText('Ride completed! You earned coins!');
          setShowCoinCelebration(true);
          setTimeout(() => setShowCoinCelebration(false), 4000);
        }
      }
    } catch (error: any) {
      console.error('Error loading booking:', error);
    }
  };

  const startLocationTracking = () => {
    // Fetch location immediately
    fetchDriverLocation();
    fetchTripMetrics();

    // Poll for location updates + booking status every 5 minutes
    locationIntervalRef.current = setInterval(() => {
      fetchDriverLocation();
      fetchTripMetrics();
      loadBooking(); // Re-check booking status (detects got_out / completed)
    }, 300000);
  };

  const fetchDriverLocation = async () => {
    if (!bookingId) return;

    try {
      const response = await trackingApi.getDriverLocation(bookingId);
      if (response.success && response.data) {
        const location = response.data.location;
        setDriverLocation({ lat: location.lat, lng: location.lng });
        setLastLocationUpdatedAt(new Date());
        updateMap(location.lat, location.lng);
      }
    } catch (error: any) {
      console.error('Error fetching driver location:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTripMetrics = async () => {
    if (!bookingId) return;

    try {
      const response = await trackingApi.getTripMetrics(bookingId);
      if (response.success && response.data) {
        const etaMinutes = Number(response.data.eta);
        const distanceKm = Number(response.data.distance);
        const durationText = response.data.duration;

        if (!Number.isNaN(etaMinutes) && etaMinutes > 0) {
          setEta(etaMinutes);
        } else if (booking) {
          applyBookingRouteMetrics(booking);
        }
        if (!Number.isNaN(distanceKm) && distanceKm > 0) {
          setDistance(distanceKm);
        } else if (booking) {
          applyBookingRouteMetrics(booking);
        }
        if (durationText && typeof durationText === 'string') {
          setDuration(durationText);
        } else if (booking) {
          applyBookingRouteMetrics(booking);
        }
      }
    } catch (error: any) {
      console.error('Error fetching trip metrics:', error);
    }
  };

  const getFallbackCoordinates = (bookingData?: any) => {
    const from =
      typeof bookingData?.route?.from === 'object' && bookingData?.route?.from
        ? bookingData.route.from
        : null;
    const to =
      typeof bookingData?.route?.to === 'object' && bookingData?.route?.to
        ? bookingData.route.to
        : null;

    const fromLat = from?.lat;
    const fromLng = from?.lng;
    if (typeof fromLat === 'number' && typeof fromLng === 'number') {
      return { lat: fromLat, lng: fromLng };
    }

    const toLat = to?.lat;
    const toLng = to?.lng;
    if (typeof toLat === 'number' && typeof toLng === 'number') {
      return { lat: toLat, lng: toLng };
    }

    return DEFAULT_MAP_CENTER;
  };

  const getTripStartedAt = () => {
    const startedAt = booking?.tripStartedAt || booking?.startedAt || booking?.updatedAt;
    return startedAt ? new Date(startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  };

  useEffect(() => {
    // Keep a real map visible even before tracking data arrives.
    if (!mapHTML) {
      const fallback = getFallbackCoordinates(booking);
      updateMap(fallback.lat, fallback.lng);
    }
  }, [booking, mapHTML]);

  const handleOpenChat = async () => {
    if (!bookingId && !booking?.bookingId && !booking?.id) {
      navigation.navigate('ChatList' as never);
      return;
    }

    const effectiveBookingId = bookingId || booking?.bookingId || booking?.id;
    const otherUser = booking?.driver || booking?.owner || null;

    navigation.navigate(
      'Chat' as never,
      {
        bookingId: effectiveBookingId,
        type: booking?.serviceType || (booking?.rentalOfferId ? 'rental' : 'pooling'),
        otherUser,
      } as never
    );
  };

  const handleReportIssue = () => {
    navigation.navigate(
      'Feedback' as never,
      {
        type: 'issue',
        subject: `Trip issue: ${bookingId || booking?.bookingId || ''}`,
        description: `Please help with issue for booking ${bookingId || booking?.bookingId || ''}.`,
      } as never
    );
  };

  const updateMap = (lat: number, lng: number) => {
    const destinationLat = typeof booking?.route?.to === 'object' 
      ? booking.route.to.lat 
      : booking?.route?.to?.lat || lat;
    const destinationLng = typeof booking?.route?.to === 'object' 
      ? booking.route.to.lng 
      : booking?.route?.to?.lng || lng;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map').setView([${lat}, ${lng}], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    
    // Driver location marker
    const driverMarker = L.marker([${lat}, ${lng}], {
      icon: L.divIcon({
        className: 'driver-marker',
        html: '<div style="background: ${COLORS.primary}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(map);
    
    // Destination marker
    const destMarker = L.marker([${destinationLat}, ${destinationLng}], {
      icon: L.divIcon({
        className: 'dest-marker',
        html: '<div style="background: ${COLORS.success}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(map);
    
    // Route line
    const routeLine = L.polyline([
      [${lat}, ${lng}],
      [${destinationLat}, ${destinationLng}]
    ], {
      color: '${COLORS.primary}',
      weight: 4,
      opacity: 0.7
    }).addTo(map);
    
    // Fit bounds to show both markers
    map.fitBounds([
      [${lat}, ${lng}],
      [${destinationLat}, ${destinationLng}]
    ], { padding: [50, 50] });
    
    // Update driver marker position (for real-time updates)
    function updateDriverPosition(newLat, newLng) {
      driverMarker.setLatLng([newLat, newLng]);
      routeLine.setLatLngs([
        [newLat, newLng],
        [${destinationLat}, ${destinationLng}]
      ]);
      map.fitBounds([
        [newLat, newLng],
        [${destinationLat}, ${destinationLng}]
      ], { padding: [50, 50] });
    }
    
    // Expose update function to parent
    window.updateDriverPosition = updateDriverPosition;
  </script>
</body>
</html>
    `;
    setMapHTML(html);
  };

  const handleWebViewMessage = (event: any) => {
    // Handle any messages from WebView if needed
  };

  // ========== COIN DISCOUNT ==========
  useEffect(() => {
    if (showPaymentChoice && booking?.totalAmount) {
      fetchCoinDiscount();
    }
  }, [showPaymentChoice]);

  const fetchCoinDiscount = async () => {
    try {
      const [balanceRes, discountRes] = await Promise.all([
        coinApi.getBalance(),
        coinApi.getDiscountPreview(booking?.totalAmount || 0),
      ]);
      if (balanceRes.success && balanceRes.data) {
        setCoinBalance(balanceRes.data.balance);
        setCoinWorthInRupees(balanceRes.data.worthInRupees);
      }
      if (discountRes.success && discountRes.data) {
        setCoinDiscount({
          maxCoins: discountRes.data.maxCoins,
          maxDiscount: discountRes.data.maxDiscount,
          discountedAmount: discountRes.data.discountedAmount,
        });
      }
    } catch (err) {
      console.log('Could not fetch coin discount:', err);
    }
  };

  const handleToggleCoins = () => {
    setUseCoins(!useCoins);
  };

  const getDisplayAmount = () => {
    if (booking?.finalPayableAmount != null) {
      return booking.finalPayableAmount;
    }
    if (useCoins && coinDiscount.maxDiscount > 0) {
      return coinDiscount.discountedAmount;
    }
    return booking?.totalAmount || 0;
  };

  const redeemCoinsBeforePayment = async () => {
    if (!useCoins || coinDiscount.maxCoins <= 0 || !bookingId) return;
    try {
      const res = await coinApi.redeemCoins(bookingId, coinDiscount.maxCoins);
      if (res?.success && res?.data?.finalPayableAmount != null) {
        setBooking((prev: any) => ({
          ...(prev || {}),
          finalPayableAmount: res.data.finalPayableAmount,
          coinDiscountAmount: res.data.discountInr ?? prev?.coinDiscountAmount ?? 0,
          coinsUsed: res.data.coinsRedeemed ?? prev?.coinsUsed ?? 0,
        }));
      }
    } catch (err) {
      console.log('Coin redemption error:', err);
    }
  };

  // ========== PAYMENT FLOW ==========

  const handleChooseCash = async () => {
    if (!bookingId || paymentProcessing) return;
    setPaymentProcessing(true);

    try {
      // Redeem coins first if applied
      await redeemCoinsBeforePayment();

      const response = await bookingApi.choosePaymentMethod(bookingId, 'offline_cash');
      if (response.success && response.data) {
        setPassengerCode(response.data.passengerCode);
        setShowPaymentChoice(false);
      } else {
        Alert.alert('Error', response.message || 'Could not generate completion code.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const statusLabel = tripCompleted
    ? 'Trip Completed'
    : showPaymentChoice
      ? 'Settle & Confirm'
      : passengerCode
        ? 'Show Code to Driver'
        : t('tripTracking.tripInProgress');

  const pickupText =
    typeof booking?.route?.from === 'string' ? booking.route.from : booking?.route?.from?.address || 'N/A';
  const dropText =
    typeof booking?.route?.to === 'string' ? booking.route.to : booking?.route?.to?.address || 'N/A';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Live Trip Tracking</Text>
        </View>
        <View>
          <TouchableOpacity
            onPress={handleOpenChat}
            style={styles.headerIconButton}
          >
            <MessageCircle size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statusBar}>
        <View
          style={[
            styles.statusBadge,
            tripCompleted && styles.statusBadgeCompleted,
            showPaymentChoice && styles.statusBadgePayment,
          ]}
        >
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
        <Text style={styles.etaText}>
          ETA: {eta} {t('common.minutes')}
        </Text>
      </View>

      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.mapPlaceholder}>
            <AppLoader size="large" color={COLORS.primary} />
            <Text style={styles.mapHint}>Loading map...</Text>
          </View>
        ) : mapHTML ? (
          <WebView
            source={{ html: mapHTML }}
            style={styles.webView}
            javaScriptEnabled={true}
            onMessage={handleWebViewMessage}
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapHint}>{t('tripTracking.liveMapView')}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>ETA</Text>
            <Text style={styles.metricValue}>{eta} min</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('tripTracking.distance')}</Text>
            <Text style={styles.metricValue}>{distance} km</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('tripTracking.duration')}</Text>
            <Text style={styles.metricValue}>{duration}</Text>
          </View>
        </View>

        <Card style={styles.tripDetailsCard}>
          <Text style={styles.sectionTitle}>{t('tripTracking.tripDetails')}</Text>
          <View style={styles.detailItem}>
            <View style={styles.detailIconWrap}>
              <MapPin size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.detailText}>
              {t('tripTracking.pickup')}: {pickupText}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <View style={styles.detailIconWrap}>
              <MapPin size={16} color={COLORS.success} />
            </View>
            <Text style={styles.detailText}>
              {t('tripTracking.drop')}: {dropText}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <View style={styles.detailIconWrap}>
              <Clock size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.detailText}>
              {t('tripTracking.started')}: {getTripStartedAt()}
            </Text>
          </View>
        </Card>

        <Card style={styles.driverCard}>
          <View style={styles.driverInfo}>
            <Image
              source={{ uri: booking?.driver?.photo || booking?.owner?.photo || 'https://via.placeholder.com/100' }}
              style={styles.driverPhoto}
            />
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{booking?.driver?.name || booking?.owner?.name || 'Driver'}</Text>
              <Text style={styles.driverRating}>⭐ {booking?.driver?.rating || 0} ({booking?.driver?.totalReviews || 0} {t('common.reviews')})</Text>
              <Text style={styles.driverMeta}>
                {driverLocation
                  ? `Driver location: ${driverLocation.lat.toFixed(5)}, ${driverLocation.lng.toFixed(5)}`
                  : 'Driver location: waiting for GPS...'}
              </Text>
              {lastLocationUpdatedAt && (
                <Text style={styles.driverMeta}>
                  Last updated: {lastLocationUpdatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.driverActions}>
            <Button
              title={t('tripTracking.message')}
              onPress={handleOpenChat}
              variant="outline"
              size="small"
              style={styles.singleActionButton}
            />
          </View>
        </Card>

        {/* ========== PAYMENT CHOICE (shown when driver marks got_out) ========== */}
        {showPaymentChoice && (
          <Card style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>Trip Ended — Settle Manually</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Payable Amount</Text>
              <Text style={[styles.amountValue, useCoins && coinDiscount.maxDiscount > 0 && { textDecorationLine: 'line-through', color: COLORS.textSecondary, fontSize: 18 }]}>
                ₹{booking?.totalAmount || 0}
              </Text>
            </View>
            {useCoins && coinDiscount.maxDiscount > 0 && (
              <View style={styles.amountRow}>
                <Text style={[styles.amountLabel, { color: '#F5A623' }]}>After Coin Discount</Text>
                <Text style={[styles.amountValue, { color: '#27AE60' }]}>₹{getDisplayAmount()}</Text>
              </View>
            )}
            {booking?.platformFee ? (
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Ride Fare: ₹{booking?.amount || 0} + Platform Fee: ₹{booking?.platformFee}</Text>
              </View>
            ) : null}

            {/* Coin Discount Toggle */}
            {coinBalance > 0 && coinDiscount.maxCoins > 0 && (
              <TouchableOpacity
                style={[styles.coinToggleRow, useCoins && styles.coinToggleActive]}
                onPress={handleToggleCoins}
              >
                <View style={styles.coinToggleLeft}>
                  <Coins size={20} color={useCoins ? '#F5A623' : COLORS.textSecondary} />
                  <View>
                    <Text style={[styles.coinToggleText, useCoins && { color: '#8B5E00' }]}>
                      Apply {coinDiscount.maxCoins} coins
                    </Text>
                    <Text style={styles.coinToggleSub}>
                      Save ₹{coinDiscount.maxDiscount} | You have {coinBalance} coins
                    </Text>
                  </View>
                </View>
                <View style={[styles.coinToggleSwitch, useCoins && styles.coinToggleSwitchOn]}>
                  <View style={[styles.coinToggleThumb, useCoins && styles.coinToggleThumbOn]} />
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.paymentButtons}>
              <TouchableOpacity
                style={[styles.paymentOption, styles.paymentCash, { width: '100%' }]}
                onPress={handleChooseCash}
                disabled={paymentProcessing}
              >
                <Banknote size={28} color={COLORS.white} />
                <Text style={styles.paymentOptionText}>I Paid Driver — Generate Code</Text>
                <Text style={styles.paymentOptionSub}>Manual payment done outside app</Text>
                {paymentProcessing && <AppLoader size="small" color={COLORS.white} style={{ marginTop: 8 }} />}
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* ========== CASH CODE DISPLAY (shown after passenger chooses cash) ========== */}
        {passengerCode && !tripCompleted && (
          <Card style={styles.codeCard}>
            <CheckCircle size={40} color={COLORS.success} />
            <Text style={styles.codeTitle}>Tell This Code to Your Driver</Text>
            <View style={styles.codeDisplay}>
              <Text style={styles.codeText}>{passengerCode}</Text>
            </View>
            <Text style={styles.codeHint}>
              The driver will enter this code to complete the trip.{'\n'}
              Amount: ₹{booking?.finalPayableAmount ?? booking?.totalAmount ?? 0} (Manual Payment)
            </Text>
          </Card>
        )}

        {/* ========== TRIP COMPLETED ========== */}
        {tripCompleted && (
          <Card style={styles.completedCard}>
            <CheckCircle size={48} color={COLORS.success} />
            <Text style={styles.completedTitle}>Trip Completed!</Text>
            <Text style={styles.completedAmount}>₹{booking?.totalAmount || 0}</Text>
            <Text style={styles.completedHint}>Thank you for riding with us.</Text>
            <Button
              title="Back to Home"
              onPress={() => navigation.navigate('MainDashboard' as never)}
              variant="primary"
              size="large"
              style={{ marginTop: 16 }}
            />
          </Card>
        )}

        {/* ========== ACTIONS (hidden during payment flow) ========== */}
        {!showPaymentChoice && !passengerCode && !tripCompleted && (
          <View style={styles.emergencyContainer}>
            <Button
              title={t('tripTracking.reportIssue')}
              onPress={handleReportIssue}
              variant="outline"
              size="medium"
              style={styles.emergencyButton}
            />
          </View>
        )}
      </ScrollView>

      {/* ========== COIN CELEBRATION MODAL ========== */}
      <Modal
        visible={showCoinCelebration}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCoinCelebration(false)}
      >
        <TouchableOpacity
          style={styles.celebrationOverlay}
          activeOpacity={1}
          onPress={() => setShowCoinCelebration(false)}
        >
          <View style={styles.celebrationContent}>
            <LottieView
              source={require('../../../assets/videos/reward.json')}
              autoPlay
              loop={false}
              style={styles.celebrationLottie}
            />
            <Text style={styles.celebrationTitle}>Coins Earned!</Text>
            <Text style={styles.celebrationText}>{coinsEarnedText}</Text>
            <Text style={styles.celebrationHint}>Check your Wallet for details</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + SPACING.sm : SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  headerIconButton: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    backgroundColor: COLORS.primary + '16',
  },
  statusBadgeCompleted: {
    backgroundColor: COLORS.success + '20',
  },
  statusBadgePayment: {
    backgroundColor: '#FFF3CD',
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  etaText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '700',
  },
  mapContainer: {
    height: hp(30),
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    position: 'relative',
  },
  webView: {
    flex: 1,
    height: hp(30),
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  userMarker: {
    top: '40%',
    left: '30%',
  },
  destinationMarker: {
    bottom: '20%',
    right: '20%',
  },
  markerLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    marginTop: SPACING.xs,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mapHint: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  scrollContent: { padding: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.xl },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '700',
  },
  tripDetailsCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  detailIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  detailText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    flex: 1,
  },
  driverCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  driverInfo: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  driverPhoto: {
    width: normalize(60),
    height: normalize(60),
    borderRadius: normalize(30),
  },
  driverDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  driverName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  driverRating: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  driverMeta: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  driverActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  singleActionButton: {
    width: '100%',
  },
  emergencyContainer: {
    marginTop: SPACING.xs,
  },
  emergencyButton: {
    borderRadius: 12,
  },
  // Payment choice card
  paymentCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center' as const,
  },
  paymentTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold' as const,
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center' as const,
  },
  amountRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    width: '100%' as const,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E0E0E0',
    marginBottom: SPACING.sm,
  },
  amountLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  amountValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold' as const,
    color: COLORS.primary,
  },
  feeRow: {
    marginBottom: SPACING.md,
  },
  feeLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  paymentButtons: {
    flexDirection: 'row' as const,
    gap: SPACING.md,
    width: '100%' as const,
    marginTop: SPACING.md,
  },
  paymentOption: {
    flex: 1,
    padding: SPACING.lg,
    borderRadius: normalize(12),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  paymentOnline: {
    backgroundColor: COLORS.primary,
  },
  paymentCash: {
    backgroundColor: COLORS.success || '#4CAF50',
  },
  paymentOptionText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold' as const,
    color: COLORS.white,
    marginTop: SPACING.sm,
  },
  paymentOptionSub: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.white + 'CC',
    marginTop: 4,
    textAlign: 'center' as const,
  },
  // Coin discount toggle
  coinToggleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%' as any,
  },
  coinToggleActive: {
    backgroundColor: '#FFF8E7',
    borderColor: '#F5A623' + '60',
  },
  coinToggleLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.sm,
    flex: 1,
  },
  coinToggleText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  coinToggleSub: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  coinToggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    justifyContent: 'center' as const,
    padding: 2,
  },
  coinToggleSwitchOn: {
    backgroundColor: '#F5A623',
  },
  coinToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  coinToggleThumbOn: {
    alignSelf: 'flex-end' as const,
  },
  // Cash code display
  codeCard: {
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    alignItems: 'center' as const,
  },
  codeTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold' as const,
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    textAlign: 'center' as const,
  },
  codeDisplay: {
    backgroundColor: COLORS.primary + '15',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 40,
    paddingVertical: 20,
    marginBottom: SPACING.md,
  },
  codeText: {
    fontFamily: FONTS.regular,
    fontSize: 48,
    fontWeight: 'bold' as const,
    color: COLORS.primary,
    letterSpacing: 12,
    textAlign: 'center' as const,
  },
  codeHint: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  // Trip completed card
  completedCard: {
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    alignItems: 'center' as const,
  },
  completedTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold' as const,
    color: COLORS.success || '#4CAF50',
    marginTop: SPACING.md,
  },
  completedAmount: {
    fontFamily: FONTS.regular,
    fontSize: 36,
    fontWeight: 'bold' as const,
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  completedHint: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center' as const,
  },
  // Coin celebration modal styles
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '85%',
    maxWidth: 340,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  celebrationLottie: {
    width: 200,
    height: 200,
  },
  celebrationTitle: {
    fontFamily: FONTS.regular,
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#F5A623',
    marginTop: SPACING.sm,
  },
  celebrationText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    textAlign: 'center' as const,
    marginTop: SPACING.sm,
  },
  celebrationHint: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center' as const,
  },
});

export default TripTrackingScreen;
