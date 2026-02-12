import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, IndianRupee, CheckCircle, Info } from 'lucide-react-native';
import { normalize } from '@utils/responsive';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';
import { bookingApi, walletApi } from '@utils/apiClient';

interface RouteParams {
  offerId: string;
  offer: any;
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

  const handleConfirmBooking = async () => {
    if (bookingLoading) return;

    try {
      setBookingLoading(true);

      // Check wallet balance — passengers need ₹100 minimum
      const walletCheck = await walletApi.canBookRide();
      if (walletCheck.success && walletCheck.data && !walletCheck.data.canBook) {
        const shortfall = walletCheck.data.shortfall || 0;
        Alert.alert(
          'Insufficient Wallet Balance',
          `You need minimum ₹${walletCheck.data.requiredBalance || 100} to book a ride. Please recharge ₹${shortfall} to continue.`,
          [
            { text: 'Recharge Now', onPress: () => navigation.navigate('Wallet' as never) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setBookingLoading(false);
        return;
      }

      const response = await bookingApi.createPoolingBooking({
        poolingOfferId: params.offer?.offerId || params.offerId,
        passengerRoute: params.passengerRoute,
        calculatedPrice: {
          finalPrice: params.priceBreakdown.finalPrice,
          platformFee: params.priceBreakdown.platformFee,
          totalAmount: params.priceBreakdown.totalAmount,
        },
      });

      if (response.success && response.data) {
        const bookingId = response.data.bookingId || response.data._id;
        Alert.alert(
          'Booking Confirmed!',
          'Your ride has been booked. Payment will be collected at the end of the trip.',
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

  const { priceBreakdown, passengerRoute } = params;

  if (!priceBreakdown) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={COLORS.white} />
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
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Price Summary</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.routeCard}>
          <Text style={styles.sectionTitle}>Route</Text>
          <View style={styles.routeRow}>
            <Text style={styles.routeLabel}>From:</Text>
            <Text style={styles.routeValue}>{passengerRoute?.from?.address || 'N/A'}</Text>
          </View>
          <View style={styles.routeRow}>
            <Text style={styles.routeLabel}>To:</Text>
            <Text style={styles.routeValue}>{passengerRoute?.to?.address || 'N/A'}</Text>
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

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <View style={styles.totalAmountContainer}>
              <IndianRupee size={24} color={COLORS.primary} />
              <Text style={styles.totalAmount}>{priceBreakdown.breakdown.total}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.infoCard}>
          <Info size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Price is calculated based on distance, time of day, and market supply/demand. You can pay online or cash at trip end.
          </Text>
        </View>

        <View style={styles.payInfoCard}>
          <Info size={18} color={COLORS.success} />
          <Text style={styles.payInfoText}>
            No payment now. You pay at the end of the trip (online or cash).
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
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.xl,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  placeholder: { width: normalize(40) },
  scrollContent: { padding: SPACING.md },
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
    marginBottom: SPACING.md,
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
