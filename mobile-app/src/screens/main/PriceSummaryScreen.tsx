import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Image, Switch, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, IndianRupee, CheckCircle, Info, MapPin, Circle } from 'lucide-react-native';
import { normalize } from '@utils/responsive';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';
import { bookingApi, coinApi } from '@utils/apiClient';

interface RouteParams {
  offerId: string;
  offer: any;
  seatsBooked?: number;
  coPassengers?: Array<{
    name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
  }>;
  passengerRoute: {
    from: { address: string; lat: number; lng: number };
    to: { address: string; lat: number; lng: number };
  };
  priceBreakdown: {
    baseDistance: number;
    baseRatePerKm: number;
    basePrice: number;
    timeMultiplier: number;
    timeMultiplierLabel: string;
    supplyMultiplier: number;
    supplyMultiplierLabel: string;
    finalPrice: number;
    platformFee: number;
    totalAmount: number;
    breakdown: {
      distance: number;
      baseRate: number;
      distanceCharge: number;
      timeMultiplier: number;
      timeCharge: number;
      supplyMultiplier: number;
      supplyAdjustment: number;
      subtotal: number;
      platformFee: number;
      total: number;
    };
  };
}

const PriceSummaryScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const params = (route.params as RouteParams) || {};
  const [bookingLoading, setBookingLoading] = useState(false);
  const [coinLoading, setCoinLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(0);
  const [maxCoinsAllowed, setMaxCoinsAllowed] = useState(0);
  const [maxDiscountAllowed, setMaxDiscountAllowed] = useState(0);
  const [useCoins, setUseCoins] = useState(false);
  const [coinsToUseInput, setCoinsToUseInput] = useState('');
  const seatsBooked = Math.max(
    1,
    params.seatsBooked || (Array.isArray(params.coPassengers) ? params.coPassengers.length + 1 : 1)
  );
  const coPassengers = params.coPassengers || [];
  const { priceBreakdown } = params;
  const perSeatTotal = Math.round(priceBreakdown?.breakdown?.total || 0);
  const totalAmount = perSeatTotal * seatsBooked;
  const fallbackMaxCoinsAllowed = Math.floor(totalAmount * 0.5 * 50);
  const effectiveMaxCoinsAllowed = Math.max(maxCoinsAllowed, fallbackMaxCoinsAllowed);
  const effectiveMaxDiscountAllowed = Math.floor(effectiveMaxCoinsAllowed / 50);

  const coinsToUse = useMemo(() => {
    const parsed = Number(coinsToUseInput || 0);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.floor(parsed);
  }, [coinsToUseInput]);

  const validationError = useMemo(() => {
    if (!useCoins || coinsToUse <= 0) return '';
    if (effectiveMaxCoinsAllowed <= 0) return 'Coin discount is not available for this ride.';
    if (coinsToUse > coinBalance) return 'Insufficient coins in your wallet.';
    if (coinsToUse > effectiveMaxCoinsAllowed) {
      return `Maximum coins allowed for this ride is ${effectiveMaxCoinsAllowed}.`;
    }
    return '';
  }, [coinBalance, coinsToUse, effectiveMaxCoinsAllowed, useCoins]);

  const coinDiscount = useMemo(() => Math.floor(coinsToUse / 50), [coinsToUse]);
  const payableAfterCoins = useMemo(() => {
    if (!useCoins || !!validationError || coinsToUse <= 0) return totalAmount;
    return Math.max(0, totalAmount - coinDiscount);
  }, [coinDiscount, coinsToUse, totalAmount, useCoins, validationError]);

  useEffect(() => {
    const fetchCoinMeta = async () => {
      try {
        setCoinLoading(true);
        const [balanceRes, previewRes] = await Promise.all([
          coinApi.getBalance(),
          coinApi.getDiscountPreview(totalAmount),
        ]);
        if (balanceRes.success && balanceRes.data) {
          setCoinBalance(balanceRes.data.balance || 0);
        }
        if (previewRes.success && previewRes.data) {
          setMaxCoinsAllowed(previewRes.data.maxCoins || 0);
          setMaxDiscountAllowed(previewRes.data.maxDiscount || 0);
        }
      } catch (error) {
        console.error('Error loading coin data:', error);
      } finally {
        setCoinLoading(false);
      }
    };

    fetchCoinMeta();
  }, [totalAmount]);

  const handleConfirmBooking = async () => {
    if (bookingLoading) return;
    if (useCoins) {
      if (coinsToUse <= 0) {
        Alert.alert('Enter Coins', 'Please enter how many coins you want to use.');
        return;
      }
      if (validationError) {
        Alert.alert('Invalid Coins', validationError);
        return;
      }
    }

    try {
      setBookingLoading(true);

      const response = await bookingApi.createPoolingBooking({
        poolingOfferId: params.offer?.offerId || params.offerId,
        seatsBooked,
        coPassengers,
        passengerRoute: params.passengerRoute,
        calculatedPrice: {
          finalPrice: params.priceBreakdown.finalPrice,
          platformFee: params.priceBreakdown.platformFee,
          totalAmount: params.priceBreakdown.totalAmount,
        },
      });

      if (response.success && response.data) {
        const bookingId = response.data.bookingId || response.data._id;
        let bookingData = response.data;

        if (useCoins && coinsToUse > 0 && !validationError) {
          try {
            const redeemRes = await coinApi.redeemCoins(bookingId, coinsToUse);
            if (redeemRes.success && redeemRes.data) {
              bookingData = {
                ...bookingData,
                coinsUsed: redeemRes.data.coinsRedeemed,
                coinDiscountAmount: redeemRes.data.discountInr,
                finalPayableAmount: redeemRes.data.finalPayableAmount,
              };
            }
          } catch (redeemError: any) {
            Alert.alert(
              'Booking Created',
              redeemError?.message || 'Booking is confirmed, but coin deduction failed. You can continue without coin discount.'
            );
          }
        }

        Alert.alert(
          'Booking Confirmed!',
          'Your ride has been booked. Settle manually with the driver at trip end.',
          [
            {
              text: 'View Booking',
              onPress: () => {
                navigation.navigate('BookingConfirmation' as never, {
                  bookingId,
                  booking: bookingData,
                } as never);
              },
            },
            { text: 'OK', onPress: () => navigation.navigate('MainDashboard' as never) },
          ]
        );
      } else {
        Alert.alert('Booking Failed', response.error || 'Failed to create booking. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };
  const { passengerRoute } = params;

  if (!priceBreakdown) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Price Summary</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Price information not available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Price Summary</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroWrap}>
          <Image source={require('../../../assets/forlok_price_summary_vector_white_bg_v2.png')} style={styles.heroImage} resizeMode="contain" />
        </View>

        <Card style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <Text style={styles.sectionTitle}>Trip Overview</Text>
            <View style={styles.seatPill}>
              <Text style={styles.seatPillText}>{seatsBooked} seat{seatsBooked > 1 ? 's' : ''}</Text>
            </View>
          </View>

          <View style={styles.routeTimeline}>
            <View style={styles.routePointCol}>
              <Circle size={12} color="#22C55E" fill="#22C55E" />
              <View style={styles.routeConnector} />
              <MapPin size={12} color="#EF4444" fill="#EF4444" />
            </View>
            <View style={styles.routePointInfo}>
              <View style={styles.routePointBlock}>
                <Text style={styles.routePointLabel}>Pickup</Text>
                <Text style={styles.routePointText}>{passengerRoute?.from?.address || 'N/A'}</Text>
              </View>
              <View style={styles.routePointBlock}>
                <Text style={styles.routePointLabel}>Drop-off</Text>
                <Text style={styles.routePointText}>{passengerRoute?.to?.address || 'N/A'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.tripMetaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipLabel}>Distance</Text>
              <Text style={styles.metaChipValue}>{priceBreakdown.breakdown.distance} km</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipLabel}>Per Seat</Text>
              <Text style={styles.metaChipValue}>₹{perSeatTotal}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.priceCard}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Distance:</Text>
            <Text style={styles.breakdownValue}>{priceBreakdown.breakdown.distance} km</Text>
          </View>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Base Rate:</Text>
            <Text style={styles.breakdownValue}>₹{priceBreakdown.breakdown.baseRate}/km</Text>
          </View>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Distance Charge:</Text>
            <Text style={styles.breakdownValue}>₹{priceBreakdown.breakdown.distanceCharge}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Time:</Text>
            <Text style={styles.breakdownValue}>{priceBreakdown.timeMultiplierLabel}</Text>
          </View>
          
          {priceBreakdown.breakdown.timeCharge > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Time Charge:</Text>
              <Text style={styles.breakdownValue}>+₹{priceBreakdown.breakdown.timeCharge}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Supply/Demand:</Text>
            <Text style={styles.breakdownValue}>{priceBreakdown.supplyMultiplierLabel}</Text>
          </View>
          
          {priceBreakdown.breakdown.supplyAdjustment !== 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Supply Adjustment:</Text>
              <Text style={[styles.breakdownValue, priceBreakdown.breakdown.supplyAdjustment < 0 && styles.negativeValue]}>
                {priceBreakdown.breakdown.supplyAdjustment > 0 ? '+' : ''}₹{Math.abs(priceBreakdown.breakdown.supplyAdjustment)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Subtotal:</Text>
            <Text style={styles.breakdownValue}>₹{priceBreakdown.breakdown.subtotal}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Fee:</Text>
            <Text style={styles.breakdownValue}>₹{priceBreakdown.breakdown.platformFee}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Per Seat Total:</Text>
            <Text style={styles.breakdownValue}>₹{perSeatTotal}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Booked Seats:</Text>
            <Text style={styles.breakdownValue}>{seatsBooked}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <View style={styles.totalAmountContainer}>
              <IndianRupee size={24} color={COLORS.primary} />
              <Text style={styles.totalAmount}>{totalAmount}</Text>
            </View>
          </View>

          {
            <>
              <View style={styles.divider} />
              <View style={styles.coinToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.coinTitle}>Apply Coins</Text>
                  <Text style={styles.coinSubtitle}>
                    {coinLoading
                      ? 'Loading coin details...'
                      : `Balance: ${coinBalance} | Max usable: ${effectiveMaxCoinsAllowed} (up to Rs ${Math.max(
                          maxDiscountAllowed,
                          effectiveMaxDiscountAllowed
                        )})`}
                  </Text>
                </View>
                <Switch value={useCoins} onValueChange={setUseCoins} />
              </View>

              {useCoins && (
                <View style={styles.coinInputWrap}>
                  <Text style={styles.coinInputLabel}>Enter coins to use</Text>
                  <TextInput
                    style={styles.coinInput}
                    value={coinsToUseInput}
                    onChangeText={setCoinsToUseInput}
                    keyboardType="numeric"
                    placeholder="Enter coin amount"
                    placeholderTextColor={COLORS.textSecondary}
                  />
                  {!!validationError && <Text style={styles.coinWarning}>{validationError}</Text>}
                  {!validationError && coinsToUse > 0 && (
                    <Text style={styles.coinSuccess}>
                      Discount: Rs {coinDiscount} | Final payable: Rs {payableAfterCoins}
                    </Text>
                  )}
                </View>
              )}
            </>
          }
        </Card>

        {coPassengers.length > 0 && (
          <Card style={styles.routeCard}>
            <Text style={styles.sectionTitle}>Additional Passengers</Text>
            {coPassengers.map((p, idx) => (
              <View key={`cp-${idx}`} style={styles.routeRow}>
                <Text style={styles.routeLabel}>{idx + 2}.</Text>
                <Text style={styles.routeValue}>{p.name} · {p.age} yrs · {p.gender}</Text>
              </View>
            ))}
          </Card>
        )}

        <View style={styles.infoCard}>
          <Info size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Price is calculated based on distance, time of day, and market supply/demand. You can pay online or cash at trip end.
          </Text>
        </View>

        <View style={styles.payInfoCard}>
          <Info size={18} color={COLORS.success} />
          <Text style={styles.payInfoText}>
            No in-app payment. Total payable for {seatsBooked} seat(s) is Rs {payableAfterCoins} at trip end.
          </Text>
        </View>

        <Button
          title={bookingLoading ? "Booking..." : "Confirm Booking"}
          onPress={handleConfirmBooking}
          variant="primary"
          size="large"
          style={styles.proceedButton}
          icon={bookingLoading ? undefined : <CheckCircle size={20} color={COLORS.white} />}
          disabled={bookingLoading}
        />
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
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  placeholder: { width: normalize(40) },
  scrollContent: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  heroWrap: { marginHorizontal: -SPACING.md, marginBottom: SPACING.md, backgroundColor: '#E9F1FF' },
  heroImage: {
    width: '100%',
    height: normalize(220),
  },
  routeCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.md,
  },
  priceCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.md,
  },
  sectionTitle: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 0,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  seatPill: {
    backgroundColor: '#E8EEFF',
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(5),
    borderRadius: normalize(16),
  },
  seatPillText: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: '700',
  },
  routeTimeline: {
    flexDirection: 'row',
    gap: normalize(10),
    marginBottom: SPACING.md,
  },
  routePointCol: {
    alignItems: 'center',
    paddingTop: normalize(4),
  },
  routeConnector: {
    width: 1.5,
    flex: 1,
    minHeight: normalize(28),
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderLeftWidth: 1.5,
    marginVertical: normalize(4),
  },
  routePointInfo: { flex: 1, gap: normalize(10) },
  routePointBlock: {},
  routePointLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: normalize(2),
  },
  routePointText: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  tripMetaRow: {
    flexDirection: 'row',
    gap: normalize(10),
  },
  metaChip: {
    flex: 1,
    backgroundColor: '#F6F8FC',
    borderRadius: normalize(10),
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(8),
  },
  metaChipLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  metaChipValue: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '700',
  },
  routeRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  routeLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    width: normalize(60),
  },
  routeValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    flex: 1,
    fontWeight: '500',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  breakdownLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  breakdownValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  negativeValue: {
    color: COLORS.success,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: SPACING.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  totalLabel: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '600',
  },
  totalAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  totalAmount: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${COLORS.primary}10`,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  infoText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: normalize(20),
  },
  payInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.success}15`,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: `${COLORS.success}30`,
  },
  payInfoText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    flex: 1,
    fontWeight: '500',
  },
  coinToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  coinTitle: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  coinSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  coinInputWrap: {
    marginTop: SPACING.sm,
  },
  coinInputLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    marginBottom: 6,
  },
  coinInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  coinWarning: {
    marginTop: 6,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: '#D32F2F',
    fontWeight: '600',
  },
  coinSuccess: {
    marginTop: 6,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.success,
    fontWeight: '600',
  },
  proceedButton: {
    marginBottom: SPACING.xl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
});

export default PriceSummaryScreen;
