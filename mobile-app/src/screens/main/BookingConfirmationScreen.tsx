import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, CheckCircle, Calendar, Clock, MapPin, User, IndianRupee, CreditCard, Share2, FileText, Check, Car, MessageCircle, XCircle } from 'lucide-react-native';
import { normalize } from '@utils/responsive';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { bookingApi } from '@utils/apiClient';

const BookingConfirmationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const params = route.params as any;
  const passedBooking = params?.booking;
  const bookingId = params?.bookingId || passedBooking?.bookingId || passedBooking?._id;

  const [booking, setBooking] = useState<any>(passedBooking || null);
  const [loading, setLoading] = useState(!!bookingId && !passedBooking);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (bookingId && !passedBooking) {
      loadBooking();
    }
  }, [bookingId]);

  const loadBooking = async () => {
    if (!bookingId) return;

    try {
      setLoading(true);
      console.log('📋 Loading booking confirmation:', bookingId);

      const response = await bookingApi.getBooking(bookingId);
      
      if (response.success && response.data) {
        setBooking(response.data);
        console.log('✅ Loaded booking:', response.data);
      } else {
        Alert.alert('Error', response.error || 'Failed to load booking details');
      }
    } catch (error: any) {
      console.error('❌ Error loading booking:', error);
      Alert.alert('Error', `Failed to load booking: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    const bId = booking?.bookingId || bookingId;
    if (!bId) return;

    setCancelling(true);
    try {
      // First fetch preview
      const preview = await bookingApi.previewCancellationFee(bId);
      if (!preview.success) {
        Alert.alert('Error', preview.message || 'Could not load cancellation details');
        setCancelling(false);
        return;
      }

      const info = preview.data;
      const title = info.isFirstCancellation
        ? 'Cancel Booking (Free)'
        : `Cancel Booking (Fee: ₹${info.cancellationFee})`;
      const message = info.isFirstCancellation
        ? 'This is your first cancellation — no charges will apply.\n\nAre you sure you want to cancel?'
        : `Cancellation fee: ₹${info.cancellationFee} (${info.feePercentage}% of ₹${info.rideAmount})\n\nThis amount will be deducted from your wallet.\n\nAre you sure?`;

      setCancelling(false);

      Alert.alert(title, message, [
        { text: 'No, Keep Booking', style: 'cancel' },
        {
          text: info.cancellationFee > 0 ? `Yes, Pay ₹${info.cancellationFee} & Cancel` : 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const result = await bookingApi.cancelBooking(bId, 'Cancelled by user');
              if (result.success) {
                const details = result.data?.cancellationDetails;
                Alert.alert(
                  'Booking Cancelled',
                  details?.message || 'Your booking has been cancelled.',
                  [{ text: 'OK', onPress: () => navigation.navigate('MainDashboard' as never) }]
                );
              } else {
                Alert.alert('Error', result.message || 'Failed to cancel booking');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel booking');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load cancellation details');
      setCancelling(false);
    }
  };

  const formatTime = (timeStr?: string): string => {
    if (!timeStr) return 'N/A';
    // Handle both HH:mm and 12-hour formats
    const ampmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (ampmMatch) {
      return timeStr; // Already formatted
    }
    // Convert HH:mm to 12-hour format
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const formatDate = (dateStr?: string | Date): string => {
    if (!dateStr) return 'N/A';
    const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getPaymentStatusDisplay = () => {
    if (booking?.paymentStatus === 'paid') {
      return { text: t('bookingConfirmation.paymentSuccessful'), color: COLORS.success };
    } else if (booking?.paymentStatus === 'pending') {
      return { text: 'Payment at trip end', color: COLORS.warning };
      return { text: 'Payment Pending', color: COLORS.warning };
    } else if (booking?.paymentStatus === 'failed') {
      return { text: 'Payment Failed', color: COLORS.error };
    }
    return { text: booking?.paymentStatus || 'N/A', color: COLORS.textSecondary };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isRental = booking.serviceType === 'rental';
  const paymentStatus = getPaymentStatusDisplay();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('bookingConfirmation.title')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Icon Container */}
        <View style={styles.successContainer}>
          <View style={styles.successIconWrapper}>
            <View style={styles.checkCircle}>
              <Check size={48} color={COLORS.white} strokeWidth={4} />
            </View>
          </View>
          <Text style={styles.title}>{t('bookingConfirmation.confirmed')}</Text>
          <Text style={styles.subtitle}>{t('bookingConfirmation.subtitle')}</Text>
          <View style={styles.bookingIdContainer}>
            <Text style={styles.bookingIdLabel}>{t('bookingConfirmation.bookingId')}</Text>
            <Text style={styles.bookingId}>{booking.bookingId || booking.bookingNumber || 'N/A'}</Text>
          </View>
        </View>

        {/* Trip/Rental Details Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            {isRental ? <Car size={20} color={COLORS.primary} /> : <MapPin size={20} color={COLORS.primary} />}
            <Text style={styles.sectionTitle}>
              {isRental ? 'Rental Details' : t('bookingConfirmation.tripDetails')}
            </Text>
          </View>
          <View style={styles.divider} />
          
          {isRental ? (
            <>
              {/* Rental: Show duration and time slot */}
              {booking.startTime && booking.endTime && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Clock size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Rental Period</Text>
                    <Text style={styles.detailValue}>
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </Text>
                  </View>
                </View>
              )}
              {booking.duration && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Clock size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{booking.duration} hours</Text>
                  </View>
                </View>
              )}
              {booking.rentalOfferId && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <MapPin size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Pickup Location</Text>
                    <Text style={styles.detailValue}>
                      {booking.route?.from?.address || booking.location?.address || 'N/A'}
                    </Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              {/* Pooling: Show route */}
              {booking.route && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <MapPin size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>{t('bookingConfirmation.route')}</Text>
                    <Text style={styles.detailValue}>
                      {typeof booking.route.from === 'string' 
                        ? booking.route.from 
                        : booking.route.from?.address || 'N/A'} → {typeof booking.route.to === 'string' 
                        ? booking.route.to 
                        : booking.route.to?.address || 'N/A'}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Calendar size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>{t('common.date')}</Text>
              <Text style={styles.detailValue}>{formatDate(booking.date)}</Text>
            </View>
          </View>
          
          {booking.time && (
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Clock size={18} color={COLORS.primary} />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>{t('common.time')}</Text>
                <Text style={styles.detailValue}>{formatTime(booking.time)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Vehicle Details Card */}
        {booking.vehicle && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Car size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Vehicle Details</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Car size={18} color={COLORS.primary} />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Vehicle</Text>
                <Text style={styles.detailValue}>
                  {booking.vehicle.brand || 'N/A'} {booking.vehicle.vehicleModel || booking.vehicle.model || ''}
                </Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Car size={18} color={COLORS.primary} />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Vehicle Number</Text>
                <Text style={styles.detailValue}>{booking.vehicle.number || 'N/A'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Driver/Owner Information Card */}
        {(booking.driver || booking.owner) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <User size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>
                {isRental ? 'Owner Information' : t('bookingConfirmation.driverInformation')}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.driverInfo}>
              {((booking.driver || booking.owner)?.photo) && (
                <Image 
                  source={{ uri: (booking.driver || booking.owner)?.photo }} 
                  style={styles.driverPhoto} 
                />
              )}
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{(booking.driver || booking.owner)?.name || 'N/A'}</Text>
                {(booking.driver || booking.owner)?.rating && (
                  <View style={styles.ratingContainer}>
                    <Text style={styles.ratingText}>
                      ⭐ {(booking.driver || booking.owner)?.rating || 0} ({t('bookingConfirmation.rating')})
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Payment Summary Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <IndianRupee size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('bookingConfirmation.paymentSummary')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Rental Amount</Text>
            <Text style={styles.paymentValue}>₹{booking.amount || 0}</Text>
          </View>
          {booking.platformFee > 0 && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Platform Fee</Text>
              <Text style={styles.paymentValue}>₹{booking.platformFee || 0}</Text>
            </View>
          )}
          {booking.totalAmount && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Total Amount</Text>
              <Text style={styles.paymentValue}>₹{booking.totalAmount || 0}</Text>
            </View>
          )}
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>{t('bookingConfirmation.paymentMethod')}</Text>
            <View style={styles.paymentMethodContainer}>
              <CreditCard size={16} color={COLORS.primary} />
              <Text style={styles.paymentMethodText}>
                {booking.paymentMethod === 'upi'
                  ? 'UPI'
                  : booking.paymentMethod === 'card'
                  ? 'Card'
                  : booking.paymentMethod === 'offline_cash'
                  ? 'Cash'
                  : booking.paymentMethod === 'net_banking'
                  ? 'Net Banking'
                  : 'Pay at trip end'}
              </Text>
            </View>
          </View>
          <View style={[styles.paymentStatusContainer, { backgroundColor: `${paymentStatus.color}15` }]}>
            <CheckCircle size={16} color={paymentStatus.color} />
            <Text style={[styles.paymentStatusText, { color: paymentStatus.color }]}>
              {paymentStatus.text}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button 
            title={t('bookingConfirmation.viewBookingDetails')} 
            onPress={() => navigation.navigate('BookingDetails' as never, { 
              bookingId: booking.bookingId || booking._id,
              booking: booking 
            } as never)} 
            variant="primary" 
            size="large" 
            style={styles.button} 
          />
          
          {/* Message Driver/Owner Button */}
          {(booking.driver || booking.owner) && (
            <Button 
              title={isRental ? 'Message Owner' : 'Message Driver'} 
              onPress={async () => {
                try {
                  const chatApi = (await import('@utils/apiClient')).chatApi;
                  
                  // Get conversations to find the one for this booking
                  const conversationsResponse = await chatApi.getConversations({
                    type: isRental ? 'rental' : 'pooling',
                    status: 'active',
                  });
                  
                  if (conversationsResponse.success && conversationsResponse.data?.conversations) {
                    const conversation = conversationsResponse.data.conversations.find(
                      (c: any) => c.bookingId === booking.bookingId
                    );
                    
                    if (conversation) {
                      // Find other participant (driver/owner)
                      const otherUser = conversation.participants.find(
                        (p: any) => p.userId !== booking.userId && (p.role === 'driver' || p.role === 'owner')
                      );
                      
                      navigation.navigate('Chat' as never, {
                        conversationId: conversation.conversationId,
                        bookingId: booking.bookingId,
                        type: isRental ? 'rental' : 'pooling',
                        otherUser: otherUser || (isRental ? booking.owner : booking.driver),
                      } as never);
                    } else {
                      // Conversation doesn't exist yet, navigate to chat list
                      navigation.navigate('ChatList' as never);
                    }
                  } else {
                    navigation.navigate('ChatList' as never);
                  }
                } catch (error) {
                  console.error('Error navigating to chat:', error);
                  navigation.navigate('ChatList' as never);
                }
              }}
              variant="outline" 
              size="large" 
              style={styles.messageButton}
              icon={<MessageCircle size={20} color={COLORS.primary} />}
            />
          )}
          
          <View style={styles.secondaryButtons}>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => {}}
            >
              <Share2 size={20} color={COLORS.primary} />
              <Text style={styles.secondaryButtonText}>{t('bookingConfirmation.shareBooking')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('MainDashboard' as never)}
            >
              <FileText size={20} color={COLORS.primary} />
              <Text style={styles.secondaryButtonText}>{t('bookingConfirmation.goToHome')}</Text>
            </TouchableOpacity>
          </View>

          {/* Cancel Booking Button */}
          {booking?.status !== 'cancelled' && booking?.status !== 'completed' && booking?.status !== 'in_progress' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelBooking}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <XCircle size={18} color="#DC2626" />
                  <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.lg,
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '600',
  },
  headerRight: {
    width: normalize(24),
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  successContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  successIconWrapper: {
    width: normalize(120),
    height: normalize(120),
    borderRadius: normalize(60),
    backgroundColor: `${COLORS.success}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  checkCircle: {
    width: normalize(80),
    height: normalize(80),
    borderRadius: normalize(40),
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  title: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  bookingIdContainer: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  bookingIdLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  bookingId: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  detailIconContainer: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  detailValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  driverInfo: {
    alignItems: 'center',
  },
  driverName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  paymentLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  paymentValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    fontWeight: '600',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '500',
    marginLeft: SPACING.xs,
  },
  paymentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  paymentStatusText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.success,
    fontWeight: '500',
    marginLeft: SPACING.xs,
  },
  buttonContainer: {
    marginTop: SPACING.md,
  },
  button: {
    marginBottom: SPACING.md,
  },
  messageButton: {
    marginBottom: SPACING.md,
  },
  secondaryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  secondaryButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: SPACING.xs,
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
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '600',
  },
  driverPhoto: {
    width: normalize(60),
    height: normalize(60),
    borderRadius: normalize(30),
    marginRight: SPACING.md,
    borderWidth: 2,
    borderColor: `${COLORS.primary}20`,
  },
  driverDetails: {
    flex: 1,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  cancelButtonText: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
});

export default BookingConfirmationScreen;
