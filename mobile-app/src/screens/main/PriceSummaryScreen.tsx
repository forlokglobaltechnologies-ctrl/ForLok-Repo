import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Switch, TextInput } from 'react-native';
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
      contextMultiplier?: number;
      contextAdjustment?: number;
      subtotal: number;
      platformFee: number;
      total: number;
    };
    explanation?: {
      lookup: {
        usedCsv: boolean;
        fallbackLevel: string;
        energyCostPerKm?: number;
        matchedVehicle?: {
          category: string;
          brand: string;
          model: string;
          fuelType: string;
          transmission: string;
          launchYear?: number;
          ageBucket?: string;
          mileageUnit?: string;
          realWorldMileageAvg?: number;
        };
        cityFuelSnapshot?: {
          city: string;
          state?: string;
          requestedCity?: string;
          requestedState?: string;
          matchType?: 'exact' | 'nearest_city' | 'default';
          petrol?: number;
          diesel?: number;
          cng?: number;
          electricity?: number;
        };
        confidenceScore: number;
      };
      multipliers: {
        context: { label: string; value: number };
        time: { label: string; value: number };
        supply: { label: string; value: number };
        totalRaw: number;
        totalApplied: number;
      };
      guardrails: {
        totalMultiplierMin: number;
        totalMultiplierMax: number;
        wasClamped: boolean;
        perSeatPerKmMin?: number;
        perSeatPerKmMax?: number;
        perSeatPerKmApplied?: number;
        wasPerSeatPerKmCapped?: boolean;
      };
      poolingShare?: {
        shareSeats: number;
        tripLevelPrice: number;
        perSeatPrice: number;
      };
    };
  };
}

const formatCurrency = (value: number) => `Rs ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
const formatSignedCurrency = (value: number) => {
  const rounded = Math.round(Number(value || 0));
  if (rounded > 0) return `+${formatCurrency(rounded)}`;
  if (rounded < 0) return `-${formatCurrency(Math.abs(rounded))}`;
  return formatCurrency(0);
};
const toTitleCase = (value?: string) =>
  value
    ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
    : '';

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
  const breakdown = priceBreakdown?.breakdown;
  const perSeatTotal = Math.round(priceBreakdown?.breakdown?.total || 0);
  const totalAmount = perSeatTotal * seatsBooked;
  const pricingExplain = priceBreakdown?.explanation;
  const matchedVehicle = pricingExplain?.lookup?.matchedVehicle;
  const cityFuelSnapshot = pricingExplain?.lookup?.cityFuelSnapshot;
  const energyCostPerKm = pricingExplain?.lookup?.energyCostPerKm;
  const fuelTypeNormalized = (matchedVehicle?.fuelType || '').toLowerCase();
  const fuelPriceUsed = (() => {
    if (!cityFuelSnapshot) return undefined;
    if (fuelTypeNormalized === 'petrol') return cityFuelSnapshot.petrol;
    if (fuelTypeNormalized === 'diesel') return cityFuelSnapshot.diesel;
    if (fuelTypeNormalized === 'cng') return cityFuelSnapshot.cng;
    if (fuelTypeNormalized === 'electric') return cityFuelSnapshot.electricity;
    return undefined;
  })();
  const fuelRateUnit =
    fuelTypeNormalized === 'cng' ? '/kg' : fuelTypeNormalized === 'electric' ? '/kWh' : '/litre';
  const mileageUsed = matchedVehicle?.realWorldMileageAvg;
  const derivedEnergyCostPerKm =
    typeof energyCostPerKm === 'number'
      ? energyCostPerKm
      : typeof fuelPriceUsed === 'number' && typeof mileageUsed === 'number' && mileageUsed > 0
        ? fuelPriceUsed / mileageUsed
        : undefined;
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
  const hasValidCoinDiscount = useCoins && !validationError && coinsToUse > 0 && coinDiscount > 0;

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

          {(matchedVehicle || cityFuelSnapshot || typeof energyCostPerKm === 'number') && (
            <View style={styles.inputInsightCard}>
              <Text style={styles.inputInsightTitle}>Fuel & Vehicle Inputs Used</Text>
              <View style={styles.inputInsightRow}>
                <Text style={styles.inputInsightLabel}>Vehicle</Text>
                <Text style={styles.inputInsightValue}>
                  {matchedVehicle
                    ? `${matchedVehicle.brand} ${matchedVehicle.model} (${toTitleCase(matchedVehicle.fuelType)})`
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.inputInsightRow}>
                <Text style={styles.inputInsightLabel}>Fuel Price Used</Text>
                <Text style={styles.inputInsightValue}>
                  {typeof fuelPriceUsed === 'number' ? `${formatCurrency(fuelPriceUsed)} ${fuelRateUnit}` : 'N/A'}
                </Text>
              </View>
              <View style={styles.inputInsightRow}>
                <Text style={styles.inputInsightLabel}>Fuel City Used</Text>
                <Text style={styles.inputInsightValue}>
                  {cityFuelSnapshot?.city
                    ? cityFuelSnapshot.matchType === 'nearest_city' && cityFuelSnapshot.requestedCity
                      ? `${cityFuelSnapshot.city} (nearest to ${cityFuelSnapshot.requestedCity})`
                      : cityFuelSnapshot.city
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.inputInsightRow}>
                <Text style={styles.inputInsightLabel}>Mileage Used</Text>
                <Text style={styles.inputInsightValue}>
                  {typeof mileageUsed === 'number'
                    ? `${mileageUsed} ${matchedVehicle?.mileageUnit || ''}`.trim()
                    : 'N/A'}
                </Text>
              </View>
              <View style={styles.inputInsightRow}>
                <Text style={styles.inputInsightLabel}>Energy Cost / km</Text>
                <Text style={styles.inputInsightValue}>
                  {typeof derivedEnergyCostPerKm === 'number' ? `${formatCurrency(derivedEnergyCostPerKm)}` : 'N/A'}
                </Text>
              </View>

              <Text style={styles.inputInsightProofMuted}>
                Base Rate Applied: {formatCurrency(breakdown.baseRate)}/km
              </Text>
            </View>
          )}

          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownSectionTitle}>Per Seat Calculation</Text>

            <View style={styles.formulaBox}>
              <Text style={styles.formulaLabel}>Distance x Base Rate</Text>
              <Text style={styles.formulaValue}>
                {breakdown.distance} km x {formatCurrency(breakdown.baseRate)}/km
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Distance Charge</Text>
              <Text style={styles.breakdownValuePill}>{formatCurrency(breakdown.distanceCharge)}</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Time Impact ({priceBreakdown.timeMultiplierLabel})</Text>
              <Text style={[styles.breakdownValuePill, breakdown.timeCharge < 0 && styles.discountValue]}>
                {formatSignedCurrency(breakdown.timeCharge)}
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Demand Impact ({priceBreakdown.supplyMultiplierLabel})</Text>
              <Text style={[styles.breakdownValuePill, breakdown.supplyAdjustment < 0 && styles.discountValue]}>
                {formatSignedCurrency(breakdown.supplyAdjustment)}
              </Text>
            </View>

            {typeof breakdown.contextAdjustment === 'number' && breakdown.contextAdjustment !== 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Context Adjustment</Text>
                <Text style={[styles.breakdownValuePill, breakdown.contextAdjustment < 0 && styles.discountValue]}>
                  {formatSignedCurrency(breakdown.contextAdjustment)}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Subtotal (Per Seat)</Text>
              <Text style={styles.breakdownValuePill}>{formatCurrency(breakdown.subtotal)}</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Platform Fee (Per Seat)</Text>
              <Text style={styles.breakdownValuePill}>{formatCurrency(breakdown.platformFee)}</Text>
            </View>

            <View style={styles.breakdownRowStrong}>
              <Text style={styles.breakdownLabelStrong}>Per Seat Total</Text>
              <Text style={styles.breakdownValueStrong}>{formatCurrency(perSeatTotal)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownSectionTitle}>Booking Total</Text>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Booked Seats</Text>
              <Text style={styles.breakdownValuePill}>{seatsBooked}</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Ride Total ({formatCurrency(perSeatTotal)} × {seatsBooked})</Text>
              <Text style={styles.breakdownValuePill}>{formatCurrency(totalAmount)}</Text>
            </View>

            {hasValidCoinDiscount && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Coin Discount ({coinsToUse} coins)</Text>
                <Text style={[styles.breakdownValuePill, styles.discountValue]}>
                  -{formatCurrency(coinDiscount)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Final Payable</Text>
            <View style={styles.totalAmountContainer}>
              <IndianRupee size={24} color={COLORS.primary} />
              <Text style={styles.totalAmount}>{Math.round(payableAfterCoins).toLocaleString('en-IN')}</Text>
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
  scrollContent: { paddingTop: SPACING.sm, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
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
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: normalize(10),
  },
  breakdownRowStrong: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: normalize(2),
    marginBottom: SPACING.sm,
  },
  breakdownLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: normalize(18),
  },
  breakdownLabelStrong: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '700',
  },
  breakdownValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  breakdownValuePill: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '700',
    backgroundColor: '#F7F8FB',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: normalize(10),
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(6),
    maxWidth: '46%',
    textAlign: 'right',
    overflow: 'hidden',
  },
  breakdownValueStrong: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '700',
  },
  discountValue: {
    color: COLORS.success,
  },
  negativeValue: {
    color: COLORS.success,
  },
  breakdownSection: {
    marginTop: SPACING.sm,
  },
  breakdownSectionTitle: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    fontWeight: '700',
  },
  formulaBox: {
    backgroundColor: '#F7F8FB',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(10),
    marginBottom: SPACING.sm,
  },
  formulaLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: normalize(4),
  },
  formulaValue: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '700',
    lineHeight: normalize(20),
  },
  inputInsightCard: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: '#F6F8FC',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    gap: normalize(6),
  },
  inputInsightTitle: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: normalize(2),
  },
  inputInsightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: normalize(8),
  },
  inputInsightLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    flex: 1,
  },
  inputInsightValue: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    lineHeight: normalize(16),
  },
  inputInsightProof: {
    marginTop: normalize(2),
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    lineHeight: normalize(16),
  },
  inputInsightProofMuted: {
    marginTop: normalize(2),
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    lineHeight: normalize(16),
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
  infoPillRow: {
    flexDirection: 'row',
    gap: normalize(8),
    marginTop: SPACING.sm,
  },
  infoPill: {
    flex: 1,
    backgroundColor: '#F6F8FC',
    borderRadius: normalize(10),
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(8),
  },
  infoPillLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  infoPillValue: {
    marginTop: normalize(2),
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '700',
  },
  explainHeading: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    marginBottom: normalize(6),
  },
  explainLine: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: normalize(4),
    lineHeight: normalize(18),
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
