import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Linking } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, CreditCard, Phone, Building, Wallet, CheckCircle, IndianRupee, Banknote } from 'lucide-react-native';
import { normalize } from '@utils/responsive';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';
import { useSnackbar } from '@context/SnackbarContext';
import { paymentApi, bookingApi } from '@utils/apiClient';
import { WebView } from 'react-native-webview';
import { getUserErrorMessage } from '@utils/errorUtils';

interface RouteParams {
  bookingId?: string;
  booking?: any;
  offer?: any;
  type?: 'pooling' | 'rental';
  passengerRoute?: {
    from: { address: string; lat: number; lng: number };
    to: { address: string; lat: number; lng: number };
  };
  priceBreakdown?: any;
}

const PaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { showSnackbar } = useSnackbar();
  const params = (route.params as RouteParams) || {};
  
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'wallet' | 'net_banking'>('upi');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [checkoutHTML, setCheckoutHTML] = useState<string | null>(null);
  const [booking, setBooking] = useState<any>(params.booking || null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(params.bookingId || booking?.bookingId || booking?._id || null);

  useEffect(() => {
    if (params.bookingId && !booking) {
      loadBooking();
    }
  }, [params.bookingId]);

  const loadBooking = async () => {
    // Booking should already be passed, but if not, we can fetch it
    // For now, we'll use the passed booking
  };

  const handlePayNow = async () => {
    // If no booking exists, create one first (coming from PriceSummaryScreen or RentalDetailsScreen)
    let currentBookingId = activeBookingId || params.bookingId || booking?.bookingId || booking?._id;
    
    // Handle pooling booking creation
    if (!activeBookingId && params.offer && params.passengerRoute && params.priceBreakdown && params.type === 'pooling') {
      try {
        setLoading(true);
        console.log('📦 Creating pooling booking before payment...');
        
        const bookingResponse = await bookingApi.createPoolingBooking({
          poolingOfferId: params.offer.offerId,
          paymentMethod: paymentMethod,
          passengerRoute: params.passengerRoute,
          calculatedPrice: {
            finalPrice: params.priceBreakdown.finalPrice,
            platformFee: params.priceBreakdown.platformFee,
            totalAmount: params.priceBreakdown.totalAmount,
          },
        });

        if (bookingResponse.success && bookingResponse.data) {
          const newBookingId = bookingResponse.data.bookingId || bookingResponse.data._id;
          setActiveBookingId(newBookingId);
          setBooking(bookingResponse.data);
          currentBookingId = newBookingId;
          console.log('✅ Booking created:', newBookingId);
        } else {
          showSnackbar({ message: getUserErrorMessage(bookingResponse as any, 'Failed to create booking'), type: 'error' });
          setLoading(false);
          return;
        }
      } catch (error: any) {
        console.error('❌ Error creating booking:', error);
        showSnackbar({ message: error.message || 'Failed to create booking', type: 'error' });
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    // Handle rental booking creation
    if (!activeBookingId && params.offer && params.priceBreakdown && params.type === 'rental') {
      try {
        setLoading(true);
        console.log('📦 Creating rental booking before payment...');
        
        const bookingData: any = {
          rentalOfferId: params.offer.offerId,
          paymentMethod: paymentMethod,
        };

        // Add time slot if provided
        if (params.startTime && params.endTime) {
          bookingData.startTime = params.startTime;
          bookingData.endTime = params.endTime;
        } else if (params.duration) {
          bookingData.duration = params.duration;
        }

        const bookingResponse = await bookingApi.createRentalBooking(bookingData);

        if (bookingResponse.success && bookingResponse.data) {
          const newBookingId = bookingResponse.data.bookingId || bookingResponse.data._id;
          setActiveBookingId(newBookingId);
          setBooking(bookingResponse.data);
          currentBookingId = newBookingId;
          console.log('✅ Rental booking created:', newBookingId);
        } else {
          showSnackbar({ message: getUserErrorMessage(bookingResponse as any, 'Failed to create booking'), type: 'error' });
          setLoading(false);
          return;
        }
      } catch (error: any) {
        console.error('❌ Error creating rental booking:', error);
        showSnackbar({ message: error.message || 'Failed to create booking', type: 'error' });
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    if (!currentBookingId) {
      showSnackbar({ message: 'Booking information is missing', type: 'error' });
      return;
    }

    // Update activeBookingId state
    setActiveBookingId(currentBookingId);

    // Payment is now processed at trip end (after OTP verification)
    // At booking time, we just confirm the booking
    // Razorpay checkout opens after "Get Out" + OTP at trip end

    try {
      setLoading(true);
      console.log('💳 Creating payment order for booking:', activeBookingId);

      // Create payment order via backend
      const paymentResponse = await paymentApi.createPayment({
        bookingId: currentBookingId,
        paymentMethod,
      });

      if (paymentResponse.success && paymentResponse.data) {
        const { razorpayOrder, payment } = paymentResponse.data;
        console.log('✅ Payment order created:', razorpayOrder);

        // TEST MODE: Simulate payment success directly instead of opening Razorpay checkout
        // This is used because test keys are configured
        const razorpayOrderId = razorpayOrder?.id || razorpayOrder?.orderId || payment?.razorpayOrderId;
        
        if (razorpayOrderId) {
          setProcessing(true);
          try {
            console.log('🧪 Simulating test payment for order:', razorpayOrderId);
            const simulateRes = await paymentApi.simulateTestPayment(razorpayOrderId);
            
            if (simulateRes.success) {
              setPaymentSuccess(true);
              const totalAmt = razorpayOrder?.amount ? (razorpayOrder.amount / 100).toFixed(2) : payment?.totalAmount || '';
              const isRental = params.type === 'rental';
              Alert.alert(
                'Payment Successful!',
                `₹${totalAmt} paid successfully.\n\n${isRental ? 'Your rental booking has been confirmed.' : 'Your booking has been confirmed. You can now join the pool.'}`,
                [
                  {
                    text: isRental ? 'View Booking' : 'Join Pool',
                    onPress: () => {
                      const bookingId = activeBookingId || params.bookingId || booking?.bookingId || booking?._id;
                      navigation.navigate('BookingConfirmation' as never, {
                        bookingId: bookingId,
                        booking: booking,
                      } as never);
                    },
                  },
                  {
                    text: 'OK',
                  },
                ]
              );
            } else {
              Alert.alert('Payment Failed', simulateRes.error || 'Payment simulation failed. Please try again.');
            }
          } catch (simError: any) {
            console.error('❌ Test payment simulation error:', simError);
            Alert.alert('Payment Error', simError.message || 'Failed to process payment. Please try again.');
          } finally {
            setProcessing(false);
          }
        } else {
          // Fallback: open Razorpay WebView checkout
          const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    button {
      background: ${COLORS.primary};
      color: white;
      border: none;
      padding: 15px 30px;
      font-size: 16px;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Complete Payment</h2>
    <p>Amount: ₹${(razorpayOrder.amount / 100).toFixed(2)}</p>
    <button onclick="openCheckout()">Pay Now</button>
  </div>
  <script>
    function openCheckout() {
      var options = {
        key: "${razorpayOrder.key}",
        amount: ${razorpayOrder.amount},
        currency: "${razorpayOrder.currency}",
        order_id: "${razorpayOrder.id}",
        name: "Forlok",
        description: "Pooling Booking Payment",
        handler: function (response) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'success',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          }));
        },
        prefill: {
          contact: "",
          email: ""
        },
        theme: {
          color: "${COLORS.primary.replace('#', '')}"
        },
        modal: {
          ondismiss: function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'cancelled'
            }));
          }
        }
      };
      var rzp = new Razorpay(options);
      rzp.open();
    }
    // Auto-open checkout
    setTimeout(openCheckout, 500);
  </script>
</body>
</html>
          `;
          
          setCheckoutHTML(htmlContent);
          setShowWebView(true);
        }
      } else {
        showSnackbar({ message: getUserErrorMessage(paymentResponse as any, 'Failed to create payment order'), type: 'error' });
      }
    } catch (error: any) {
      console.error('❌ Error creating payment:', error);
      showSnackbar({ message: error.message || 'Failed to initiate payment', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 WebView message:', data);

      if (data.type === 'success') {
        // Verify payment with backend
        await handlePaymentSuccess(data);
      } else if (data.type === 'cancelled') {
        setShowWebView(false);
        Alert.alert('Payment Cancelled', 'Payment was cancelled. You can try again.');
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const handlePaymentSuccess = async (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    setShowWebView(false);
    setProcessing(true);

    try {
      console.log('✅ Verifying payment:', paymentData);

      // Verify payment with backend
      const verifyResponse = await paymentApi.verifyPayment({
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
      });

      if (verifyResponse.success) {
        setPaymentSuccess(true);
        // After successful payment, show "Join Pool" option
        const isRental = params.type === 'rental';
        Alert.alert(
          'Payment Successful!',
          isRental 
            ? 'Your rental booking has been confirmed.'
            : 'Your booking has been confirmed. You can now join the pool.',
          [
            {
              text: isRental ? 'View Booking' : 'Join Pool',
              onPress: () => {
                // Navigate to booking confirmation or trip tracking
                const bookingId = activeBookingId || params.bookingId || booking?.bookingId || booking?._id;
                navigation.navigate('BookingConfirmation' as never, {
                  bookingId: bookingId,
                  booking: booking,
                } as never);
              },
            },
            {
              text: 'View Booking Details',
              onPress: () => {
                const bookingId = activeBookingId || params.bookingId || booking?.bookingId || booking?._id;
                navigation.navigate('BookingDetails' as never, {
                  bookingId: bookingId,
                  booking: booking,
                } as never);
              },
            },
            {
              text: 'OK',
              onPress: () => {
                // Don't navigate away, let user see the "Join Pool" button
              },
            },
          ]
        );
      } else {
        Alert.alert('Payment Verification Failed', verifyResponse.error || 'Please contact support if payment was deducted.');
      }
    } catch (error: any) {
      console.error('❌ Error verifying payment:', error);
      Alert.alert(
        'Payment Verification Error',
        'Payment was successful but verification failed. Please contact support with your payment ID: ' + paymentData.razorpay_payment_id
      );
    } finally {
      setProcessing(false);
    }
  };

  const getBookingSummary = () => {
    if (!booking && !params.offer) return null;
    
    const data = booking || params.offer;
    const isPooling = params.type === 'pooling' || booking?.serviceType === 'pooling';
    
    // Use passenger route if available (from search), otherwise use offer route
    const routeFrom = params.passengerRoute?.from || data.route?.from;
    const routeTo = params.passengerRoute?.to || data.route?.to;
    
    // Get amounts from priceBreakdown if available, otherwise from booking
    const amount = params.priceBreakdown?.finalPrice || booking?.amount || 0;
    const platformFee = params.priceBreakdown?.platformFee || booking?.platformFee || 0;
    const totalAmount = params.priceBreakdown?.totalAmount || booking?.totalAmount || (amount + platformFee);
    
    return {
      route: isPooling 
        ? `${typeof routeFrom === 'object' ? routeFrom.address?.split(',')[0] : routeFrom?.split(',')[0] || 'From'} → ${typeof routeTo === 'object' ? routeTo.address?.split(',')[0] : routeTo?.split(',')[0] || 'To'}`
        : data.location?.address?.split(',')[0] || 'Location',
      date: data.date ? new Date(data.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
      time: data.time || 'N/A',
      amount: amount,
      platformFee: platformFee,
      totalAmount: totalAmount,
    };
  };

  const summary = getBookingSummary();

  if (showWebView && checkoutHTML) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity onPress={() => setShowWebView(false)}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.webViewHeaderTitle}>Complete Payment</Text>
          <View style={styles.placeholder} />
        </View>
        <WebView
          source={{ html: checkoutHTML }}
          onMessage={handleWebViewMessage}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.webViewLoadingText}>Loading payment gateway...</Text>
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payment.title')}</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {summary && (
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{t('payment.bookingSummary')}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Route:</Text>
              <Text style={styles.summaryValue}>{summary.route}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date:</Text>
              <Text style={styles.summaryValue}>{summary.date}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time:</Text>
              <Text style={styles.summaryValue}>{summary.time}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Amount:</Text>
              <Text style={styles.summaryValue}>₹{summary.amount}</Text>
            </View>
            {summary.platformFee > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Platform Fee:</Text>
                <Text style={styles.summaryValue}>₹{summary.platformFee}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <View style={styles.totalAmountContainer}>
                <IndianRupee size={20} color={COLORS.primary} />
                <Text style={styles.totalAmount}>
                  {summary.totalAmount || (summary.amount + (summary.platformFee || 0))}
                </Text>
              </View>
            </View>
          </Card>
        )}

        <Text style={styles.methodLabel}>{t('payment.selectPaymentMethod')}</Text>
        {(['upi', 'card', 'wallet', 'net_banking'] as const).map((method) => (
          <TouchableOpacity
            key={method}
            style={[styles.methodCard, paymentMethod === method && styles.methodSelected]}
            onPress={() => setPaymentMethod(method)}
          >
            {method === 'card' && <CreditCard size={24} color={paymentMethod === method ? COLORS.primary : COLORS.textSecondary} />}
            {method === 'upi' && <Phone size={24} color={paymentMethod === method ? COLORS.primary : COLORS.textSecondary} />}
            {method === 'net_banking' && <Building size={24} color={paymentMethod === method ? COLORS.primary : COLORS.textSecondary} />}
            {method === 'wallet' && <Wallet size={24} color={paymentMethod === method ? COLORS.primary : COLORS.textSecondary} />}
            
            <Text style={[styles.methodText, paymentMethod === method && styles.methodTextSelected]}>
              {method === 'card' ? t('payment.creditDebitCard') : method === 'upi' ? t('payment.upi') : method === 'net_banking' ? t('payment.netBanking') : method === 'wallet' ? t('payment.wallet') : 'Offline Cash'}
            </Text>
            {paymentMethod === method && <CheckCircle size={24} color={COLORS.primary} />}
          </TouchableOpacity>
        ))}

        {/* Show different buttons based on payment status */}
        {paymentSuccess ? (
          <Button 
            title={loading ? 'Creating Booking...' : (params.type === 'rental' ? 'View Booking' : 'Join Pool')} 
            onPress={() => {
              if (paymentSuccess || activeBookingId) {
                navigation.navigate('BookingConfirmation' as never, {
                  bookingId: activeBookingId || params.bookingId || booking?.bookingId || booking?._id,
                  booking: booking,
                } as never);
              } else {
                handlePayNow();
              }
            }} 
            variant="primary" 
            size="large" 
            style={styles.payButton}
            disabled={loading || processing}
          />
        ) : (
        <Button 
          title={loading || processing ? 'Processing...' : t('payment.payNow')} 
          onPress={handlePayNow} 
          variant="primary" 
          size="large" 
          style={styles.payButton}
            disabled={loading || processing || (!params.bookingId && !booking && !params.offer)}
        />
        )}
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
    fontWeight: 'bold' 
  },
  placeholder: { width: normalize(40) },
  scrollContent: { padding: SPACING.md },
  summaryCard: { 
    padding: SPACING.lg, 
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.md,
  },
  summaryTitle: { 
    fontFamily: FONTS.medium, 
    fontSize: FONTS.sizes.lg, 
    color: COLORS.text, 
    fontWeight: '600', 
    marginBottom: SPACING.md 
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '500',
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
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  totalLabel: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.md,
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
    fontSize: FONTS.sizes.xl,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  methodLabel: { 
    fontFamily: FONTS.medium, 
    fontSize: FONTS.sizes.md, 
    color: COLORS.text, 
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  methodCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: SPACING.md, 
    backgroundColor: COLORS.white, 
    borderRadius: BORDER_RADIUS.md, 
    marginBottom: SPACING.sm, 
    borderWidth: 1, 
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  methodSelected: { 
    borderColor: COLORS.primary, 
    backgroundColor: `${COLORS.primary}10` 
  },
  methodText: { 
    flex: 1, 
    fontFamily: FONTS.regular, 
    fontSize: FONTS.sizes.md, 
    color: COLORS.text, 
    marginLeft: SPACING.xs 
  },
  methodTextSelected: { 
    color: COLORS.primary, 
    fontWeight: '600' 
  },
  payButton: { 
    marginTop: SPACING.lg, 
    marginBottom: SPACING.xl 
  },
  webViewHeader: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.xl,
  },
  webViewHeaderTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  webViewLoadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
});

export default PaymentScreen;

