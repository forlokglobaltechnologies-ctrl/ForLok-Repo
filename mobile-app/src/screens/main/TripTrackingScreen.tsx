import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Phone, MessageCircle, Info, MapPin, Clock, Navigation, AlertCircle, CreditCard, Banknote, CheckCircle, Coins } from 'lucide-react-native';
import { normalize, wp, hp } from '@utils/responsive';
import { COLORS, FONTS, SPACING } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { useSOS } from '@context/SOSContext';
import { trackingApi, bookingApi, paymentApi, coinApi } from '@utils/apiClient';
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

    // Poll for location updates + booking status every 5 seconds
    locationIntervalRef.current = setInterval(() => {
      fetchDriverLocation();
      fetchTripMetrics();
      loadBooking(); // Re-check booking status (detects got_out / completed)
    }, 5000);
  };

  const fetchDriverLocation = async () => {
    if (!bookingId) return;

    try {
      const response = await trackingApi.getDriverLocation(bookingId);
      if (response.success && response.data) {
        const location = response.data.location;
        setDriverLocation({ lat: location.lat, lng: location.lng });
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
        setEta(response.data.eta || 0);
        setDistance(response.data.distance || 0);
        setDuration(response.data.duration || '0m');
      }
    } catch (error: any) {
      console.error('Error fetching trip metrics:', error);
    }
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
    if (useCoins && coinDiscount.maxDiscount > 0) {
      return coinDiscount.discountedAmount;
    }
    return booking?.totalAmount || 0;
  };

  const redeemCoinsBeforePayment = async () => {
    if (!useCoins || coinDiscount.maxCoins <= 0 || !bookingId) return;
    try {
      await coinApi.redeemCoins(bookingId, coinDiscount.maxCoins);
    } catch (err) {
      console.log('Coin redemption error:', err);
    }
  };

  // ========== PAYMENT FLOW ==========
  const handleChooseOnline = async () => {
    if (!bookingId || paymentProcessing) return;
    setPaymentProcessing(true);

    try {
      // Redeem coins first if applied
      await redeemCoinsBeforePayment();

      const response = await bookingApi.choosePaymentMethod(bookingId, 'online');
      if (response.success && response.data) {
        const { paymentOrder } = response.data;
        if (paymentOrder?.razorpayOrderId) {
          // Simulate test payment success
          try {
            const simulateRes = await paymentApi.simulateTestPayment(paymentOrder.razorpayOrderId);
            if (simulateRes.success) {
              setShowPaymentChoice(false);
              setTripCompleted(true);
              // Show coin celebration
              setCoinsEarnedText('Ride completed! You earned coins!');
              setShowCoinCelebration(true);
              setTimeout(() => setShowCoinCelebration(false), 4000);
            } else {
              Alert.alert('Payment Processing', 'Payment is being processed. Please wait.');
            }
          } catch (simErr) {
            Alert.alert('Payment Error', 'Could not complete payment. Please try again.');
          }
        }
      } else {
        Alert.alert('Error', response.message || 'Could not initiate online payment.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Payment failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

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
        Alert.alert('Error', response.message || 'Could not process cash payment.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => {}}>
            <Phone size={24} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Chat' as never)}
            style={styles.headerButton}
          >
            <MessageCircle size={24} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}}>
            <Info size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.statusBar, tripCompleted && styles.statusBarCompleted, showPaymentChoice && styles.statusBarPayment]}>
        <Text style={styles.statusText}>
          {tripCompleted ? '✅ Trip Completed' : showPaymentChoice ? '💳 Payment Required' : passengerCode ? '🔑 Show Code to Driver' : t('tripTracking.tripInProgress')}
        </Text>
        {!tripCompleted && !showPaymentChoice && !passengerCode && (
          <Text style={styles.etaText}>{t('tripTracking.eta')}: {eta} {t('common.minutes')}</Text>
        )}
      </View>

      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color={COLORS.primary} />
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
        <Card style={styles.tripDetailsCard}>
          <Text style={styles.sectionTitle}>{t('tripTracking.tripDetails')}:</Text>
          <View style={styles.detailItem}>
            <MapPin size={20} color={COLORS.primary} />
            <Text style={styles.detailText}>
              {t('tripTracking.pickup')}: {typeof booking?.route?.from === 'string' 
                ? booking.route.from 
                : booking?.route?.from?.address || 'N/A'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <MapPin size={20} color={COLORS.primary} />
            <Text style={styles.detailText}>
              {t('tripTracking.drop')}: {typeof booking?.route?.to === 'string' 
                ? booking.route.to 
                : booking?.route?.to?.address || 'N/A'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Clock size={20} color={COLORS.primary} />
            <Text style={styles.detailText}>
              {t('tripTracking.started')}: {booking?.time || booking?.date ? new Date(booking.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Navigation size={20} color={COLORS.primary} />
            <Text style={styles.detailText}>{t('tripTracking.distance')}: {distance} km</Text>
          </View>
          <View style={styles.detailItem}>
            <Clock size={20} color={COLORS.primary} />
            <Text style={styles.detailText}>{t('tripTracking.duration')}: {duration}</Text>
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
            </View>
          </View>
          <View style={styles.driverActions}>
            <Button
              title={t('tripTracking.call')}
              onPress={() => {}}
              variant="primary"
              size="small"
              style={styles.actionButton}
            />
            <Button
              title={t('tripTracking.message')}
              onPress={() => navigation.navigate('Chat' as never)}
              variant="outline"
              size="small"
              style={styles.actionButton}
            />
          </View>
        </Card>

        {/* ========== PAYMENT CHOICE (shown when driver marks got_out) ========== */}
        {showPaymentChoice && (
          <Card style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>Trip Ended — Choose Payment</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Total Amount</Text>
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
                style={[styles.paymentOption, styles.paymentOnline]}
                onPress={handleChooseOnline}
                disabled={paymentProcessing}
              >
                <CreditCard size={28} color={COLORS.white} />
                <Text style={styles.paymentOptionText}>Pay Online</Text>
                <Text style={styles.paymentOptionSub}>UPI / Card / Net Banking</Text>
                {paymentProcessing && <ActivityIndicator size="small" color={COLORS.white} style={{ marginTop: 8 }} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentOption, styles.paymentCash]}
                onPress={handleChooseCash}
                disabled={paymentProcessing}
              >
                <Banknote size={28} color={COLORS.white} />
                <Text style={styles.paymentOptionText}>Pay Cash</Text>
                <Text style={styles.paymentOptionSub}>Pay driver directly</Text>
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
              Amount: ₹{booking?.totalAmount || 0} (Cash)
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
              title={t('tripTracking.bookFood')}
              onPress={() => {
                const fromLocation = typeof booking?.route?.from === 'object' 
                  ? booking.route.from 
                  : { address: booking?.route?.from || 'N/A' };
                const toLocation = typeof booking?.route?.to === 'object' 
                  ? booking.route.to 
                  : { address: booking?.route?.to || 'N/A' };
                
                navigation.navigate('BookFood' as never, { 
                  from: fromLocation.address || fromLocation,
                  to: toLocation.address || toLocation,
                  fromLat: fromLocation.lat,
                  fromLng: fromLocation.lng,
                  toLat: toLocation.lat,
                  toLng: toLocation.lng,
                } as never);
              }}
              variant="primary"
              size="medium"
              style={styles.emergencyButton}
            />
            <Button
              title={t('tripTracking.emergencyContact')}
              onPress={() => {}}
              variant="outline"
              size="medium"
              style={styles.emergencyButton}
            />
            <Button
              title={t('tripTracking.reportIssue')}
              onPress={() => {}}
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
  container: { flex: 1, backgroundColor: COLORS.background },
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
    gap: SPACING.md,
  },
  headerButton: {
    marginLeft: SPACING.sm,
  },
  statusBar: {
    backgroundColor: COLORS.primary + '20',
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  etaText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  mapContainer: {
    height: hp(37),
    backgroundColor: COLORS.lightGray,
    position: 'relative',
  },
  webView: {
    flex: 1,
    height: hp(37),
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
    marginTop: SPACING.lg,
  },
  scrollContent: { padding: SPACING.md },
  tripDetailsCard: { padding: SPACING.md, marginBottom: SPACING.md },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  detailText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  driverCard: { padding: SPACING.md, marginBottom: SPACING.md },
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
  },
  driverActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
  },
  emergencyContainer: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  emergencyButton: {
    marginBottom: SPACING.sm,
  },
  // Status bar variants
  statusBarCompleted: {
    backgroundColor: COLORS.success + '20',
  },
  statusBarPayment: {
    backgroundColor: '#FFF3CD',
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
