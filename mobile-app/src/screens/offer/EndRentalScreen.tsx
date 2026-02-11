import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  IndianRupee, 
  User, 
  Car, 
  MapPin,
  CreditCard,
  Wallet,
  AlertCircle,
  Info,
  Shield,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { bookingApi } from '@utils/apiClient';

const RENTAL_COMING_SOON = true; // V2 feature — flip to false to re-enable

const EndRentalScreen = () => {
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
  const params = route.params as any;
  const booking = params?.booking;
  const offer = params?.offer;

  const [loading, setLoading] = useState(false);

  const formatTime = (time: string | undefined): string => {
    if (!time) return 'N/A';
    try {
      const [hours, minutes] = time.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return 'N/A';
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
    } catch {
      return 'N/A';
    }
  };

  const calculateDuration = (startTime?: string, endTime?: string, duration?: number): number => {
    if (startTime && endTime) {
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);
      let durationMinutes = endMinutes - startMinutes;
      if (durationMinutes < 0) {
        durationMinutes += 24 * 60;
      }
      return Math.round((durationMinutes / 60) * 10) / 10; // Round to 1 decimal
    }
    return duration || 0;
  };

  const timeToMinutes = (timeStr: string): number => {
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    } catch {
      return 0;
    }
  };

  const handleCompleteRental = async () => {
    try {
      Alert.alert(
        'Complete Rental',
        'Have you received the vehicle back from the renter? Please verify the vehicle condition before completing.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Complete Rental',
            onPress: async () => {
              try {
                setLoading(true);
                
                const response = await bookingApi.updateBookingStatus(
                  booking.bookingId || booking._id,
                  'completed'
                );

                if (response.success) {
                  const isPending = booking.paymentStatus === 'pending';
                  Alert.alert(
                    '✅ Rental Completed Successfully',
                    isOfflineCash
                      ? `Rental completed!\n\n💵 Collect ₹${totalAmount.toFixed(2)} from renter in cash.\n\n⚠️ Platform fee (₹${platformFee.toFixed(2)}) has been deducted from your wallet.`
                      : `Rental completed!\n\n✅ Earnings (₹${ownerSettlement.toFixed(2)}) credited to your wallet.\n\n💰 You can request withdrawal from your dashboard.`,
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          navigation.goBack();
                        },
                      },
                    ]
                  );
                } else {
                  Alert.alert('Error', response.error || 'Failed to complete rental');
                }
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to complete rental');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete rental');
    }
  };

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={COLORS.error} />
          <Text style={styles.errorText}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const duration = calculateDuration(booking.startTime, booking.endTime, booking.duration);
  const rentalAmount = booking.amount || (offer?.pricePerHour || 0) * duration;
  const platformFee = booking.platformFee || Math.round(rentalAmount * 0.05 * 100) / 100;
  const totalAmount = booking.totalAmount || rentalAmount + platformFee;
  const ownerSettlement = rentalAmount; // Owner gets rental amount, platform keeps fee
  const isPending = booking.paymentStatus === 'pending';
  const isOfflineCash = booking.paymentMethod === 'offline_cash';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Rental</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <CheckCircle size={32} color={COLORS.success} />
          </View>
          <Text style={styles.bannerTitle}>Vehicle Return Verification</Text>
          <Text style={styles.bannerSubtitle}>
            Verify vehicle condition and complete the rental
          </Text>
        </View>

        {/* Renter Information Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <User size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Renter Information</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.renterSection}>
            {typeof booking.userId === 'object' && booking.userId?.photo && (
              <Image 
                source={{ uri: booking.userId.photo }} 
                style={styles.renterPhoto} 
              />
            )}
            <View style={styles.renterInfo}>
              <Text style={styles.renterName}>
                {typeof booking.userId === 'object' && booking.userId?.name 
                  ? booking.userId.name 
                  : booking.userId || 'Renter'}
              </Text>
              <Text style={styles.renterLabel}>Renter</Text>
            </View>
          </View>
        </Card>

        {/* Rental Details Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Clock size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Rental Details</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.detailItem}>
            <View style={styles.detailLeft}>
              <Clock size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Time Slot</Text>
            </View>
            <Text style={styles.detailValue}>
              {booking.startTime && booking.endTime
                ? `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`
                : `${duration} hours`}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailLeft}>
              <Clock size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Duration</Text>
            </View>
            <Text style={styles.detailValue}>{duration} hours</Text>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailLeft}>
              <MapPin size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Pickup Location</Text>
            </View>
            <Text style={[styles.detailValue, styles.addressText]} numberOfLines={2}>
              {offer?.location?.address || booking.route?.from?.address || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <View style={styles.detailLeft}>
              <Car size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Vehicle</Text>
            </View>
            <Text style={styles.detailValue}>
              {booking.vehicle?.brand || offer?.vehicle?.brand || 'N/A'} {booking.vehicle?.number || offer?.vehicle?.number || ''}
            </Text>
          </View>
        </Card>

        {/* Payment Information Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              {isOfflineCash ? (
                <Wallet size={20} color={COLORS.warning} />
              ) : (
                <CreditCard size={20} color={COLORS.success} />
              )}
            </View>
            <Text style={styles.cardTitle}>Payment Information</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.paymentMethodBadge}>
            <View style={[styles.paymentIconContainer, isOfflineCash ? styles.cashIconBg : styles.onlineIconBg]}>
              {isOfflineCash ? (
                <Wallet size={18} color={COLORS.warning} />
              ) : (
                <CreditCard size={18} color={COLORS.success} />
              )}
            </View>
            <Text style={styles.paymentMethodText}>
              {isOfflineCash ? 'Cash Payment' : 'Online Payment'}
            </Text>
            <View style={[styles.paymentStatusBadge, isOfflineCash ? styles.pendingBadge : styles.paidBadge]}>
              <Text style={[styles.paymentStatusText, isOfflineCash ? styles.pendingText : styles.paidText]}>
                {isOfflineCash ? 'Pay at Return' : 'Paid'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Settlement Summary Card */}
        <Card style={[styles.card, styles.settlementCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <IndianRupee size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Settlement Summary</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.settlementSection}>
            <View style={styles.settlementRow}>
              <Text style={styles.settlementLabel}>Rental Amount</Text>
              <Text style={styles.settlementValue}>₹{rentalAmount.toFixed(2)}</Text>
            </View>
            
            <View style={styles.settlementRow}>
              <View style={styles.feeRow}>
                <Text style={styles.settlementLabel}>Platform Fee</Text>
                <Info size={14} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.settlementValue}>₹{platformFee.toFixed(2)}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settlementRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
            </View>

            <View style={styles.settlementHighlight}>
              <View style={styles.settlementHighlightContent}>
                <Text style={styles.settlementHighlightLabel}>Your Settlement</Text>
                <Text style={styles.settlementHighlightSubtext}>
                  {isOfflineCash ? 'Amount to collect' : 'Added to wallet'}
                </Text>
              </View>
              <Text style={styles.settlementHighlightValue}>₹{ownerSettlement.toFixed(2)}</Text>
            </View>
          </View>

          {/* Payment Method Specific Notes */}
          {isOfflineCash ? (
            <View style={styles.infoBox}>
              <View style={styles.infoBoxHeader}>
                <AlertCircle size={18} color={COLORS.warning} />
                <Text style={styles.infoBoxTitle}>Cash Payment Instructions</Text>
              </View>
              <View style={styles.infoBoxContent}>
                <Text style={styles.infoBoxText}>
                  • Collect ₹{totalAmount.toFixed(2)} from renter in cash{'\n'}
                  • Platform fee (₹{platformFee.toFixed(2)}) deducted from your wallet{'\n'}
                  • Your wallet balance has been updated
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.infoBox, styles.successBox]}>
              <View style={styles.infoBoxHeader}>
                <CheckCircle size={18} color={COLORS.success} />
                <Text style={styles.infoBoxTitle}>Online Payment</Text>
              </View>
              <View style={styles.infoBoxContent}>
                <Text style={styles.infoBoxText}>
                  • Payment received online via Razorpay{'\n'}
                  • Earnings (₹{ownerSettlement.toFixed(2)}) credited to your wallet{'\n'}
                  • Request withdrawal from dashboard to receive payment
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Action Button */}
        <Button
          title={loading ? 'Processing...' : 'Complete Rental'}
          onPress={handleCompleteRental}
          variant="primary"
          size="large"
          style={styles.completeButton}
          disabled={loading}
          icon={loading ? <ActivityIndicator size="small" color={COLORS.white} /> : undefined}
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
    ...SHADOWS.md,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  banner: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  bannerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${COLORS.success}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  bannerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  bannerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  card: {
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  settlementCard: {
    borderWidth: 2,
    borderColor: `${COLORS.primary}20`,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  cardTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  renterSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  renterPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: SPACING.md,
    borderWidth: 2,
    borderColor: `${COLORS.primary}20`,
  },
  renterInfo: {
    flex: 1,
  },
  renterName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  renterLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.md,
  },
  detailLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  detailValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  addressText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  cashIconBg: {
    backgroundColor: `${COLORS.warning}15`,
  },
  onlineIconBg: {
    backgroundColor: `${COLORS.success}15`,
  },
  paymentMethodText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  paymentStatusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  pendingBadge: {
    backgroundColor: `${COLORS.warning}20`,
  },
  paidBadge: {
    backgroundColor: `${COLORS.success}20`,
  },
  paymentStatusText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  pendingText: {
    color: COLORS.warning,
  },
  paidText: {
    color: COLORS.success,
  },
  settlementSection: {
    marginBottom: SPACING.md,
  },
  settlementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  settlementLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  settlementValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  totalLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '700',
  },
  totalValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '700',
  },
  settlementHighlight: {
    backgroundColor: `${COLORS.primary}10`,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: `${COLORS.primary}30`,
  },
  settlementHighlightContent: {
    flex: 1,
  },
  settlementHighlightLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  settlementHighlightSubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  settlementHighlightValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: `${COLORS.warning}10`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  successBox: {
    backgroundColor: `${COLORS.success}10`,
    borderLeftColor: COLORS.success,
  },
  infoBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  infoBoxTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '700',
  },
  infoBoxContent: {
    marginLeft: SPACING.md + 4,
  },
  infoBoxText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 22,
  },
  completeButton: {
    marginTop: SPACING.lg,
    ...SHADOWS.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    fontWeight: '600',
  },
});

export default EndRentalScreen;
