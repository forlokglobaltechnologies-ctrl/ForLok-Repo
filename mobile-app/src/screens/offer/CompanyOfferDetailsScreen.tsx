import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Car, MapPin, Calendar, Clock, MessageCircle, User, IndianRupee, Star } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { rentalApi } from '@utils/apiClient';

const CompanyOfferDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as any;
  const offerId = params?.offerId || params?.offer?.offerId;
  const passedOffer = params?.offer;

  const [offer, setOffer] = useState<any>(passedOffer || null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(!!offerId && !passedOffer);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    if (offerId) {
      loadOffer();
      loadBookings();
    }
  }, [offerId]);

  const loadOffer = async () => {
    if (!offerId) return;

    try {
      setLoading(true);
      const response = await rentalApi.getOffer(offerId);
      
      if (response.success && response.data) {
        setOffer(response.data);
      } else {
        Alert.alert('Error', 'Failed to load offer details');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Error loading offer:', error);
      Alert.alert('Error', error.message || 'Failed to load offer details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    if (!offerId) return;

    try {
      setLoadingBookings(true);
      const response = await rentalApi.getOfferBookings(offerId);
      
      if (response.success && response.data) {
        const bookingsData = Array.isArray(response.data) ? response.data : [];
        setBookings(bookingsData);
      } else {
        setBookings([]);
      }
    } catch (error: any) {
      console.error('Error loading bookings:', error);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleViewBooking = (booking: any) => {
    navigation.navigate('BookingDetails' as never, { 
      bookingId: booking.bookingId || booking._id,
      booking 
    } as never);
  };

  const handleChatWithRenter = async (booking: any) => {
    try {
      navigation.navigate('Chat' as never, {
        bookingId: booking.bookingId || booking._id,
        type: 'rental',
        otherUser: booking.renter || null,
      } as never);
    } catch (error) {
      console.error('Error navigating to chat:', error);
    }
  };

  const handleManageRental = (booking: any) => {
    navigation.navigate('OwnerRentalManagement' as never, {
      offerId: offerId,
      bookingId: booking.bookingId || booking._id,
    } as never);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offer Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading offer...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!offer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offer Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Offer not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offer Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Offer Details Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Car size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.vehicleName}>
            {offer.vehicle?.brand || 'Unknown'} {offer.vehicle?.vehicleModel || offer.vehicle?.model || ''}
          </Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vehicle Number:</Text>
            <Text style={styles.detailValue}>{offer.vehicle?.number || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{offer.vehicle?.type?.toUpperCase() || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Seats:</Text>
            <Text style={styles.detailValue}>{offer.vehicle?.seats || 'N/A'}</Text>
          </View>
        </Card>

        {/* Location & Date Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Location & Availability</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <MapPin size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailValue}>{offer.location?.address || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Calendar size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailValue}>
              {offer.date ? new Date(offer.date).toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              }) : 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailValue}>
              {offer.availableFrom} - {offer.availableUntil}
            </Text>
          </View>
        </Card>

        {/* Pricing Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <IndianRupee size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Pricing</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price per hour:</Text>
            <Text style={[styles.detailValue, styles.priceText]}>
              <IndianRupee size={16} color={COLORS.primary} />
              {offer.pricePerHour || 0}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Minimum hours:</Text>
            <Text style={styles.detailValue}>{offer.minimumHours || 0} hours</Text>
          </View>
        </Card>

        {/* Bookings Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <User size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>
              Bookings ({bookings.length})
            </Text>
          </View>
          <View style={styles.divider} />

          {loadingBookings ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading bookings...</Text>
            </View>
          ) : bookings.length === 0 ? (
            <View style={styles.emptyBookingsContainer}>
              <Text style={styles.emptyText}>No bookings yet</Text>
            </View>
          ) : (
            bookings.map((booking, index) => (
              <View key={booking.bookingId || booking._id || index} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View>
                    <Text style={styles.bookingNumber}>
                      #{booking.bookingNumber || booking.bookingId || 'N/A'}
                    </Text>
                    <Text style={styles.renterName}>
                      {booking.renter?.name || 'Unknown Renter'}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    booking.status === 'confirmed' && { backgroundColor: COLORS.success + '20' },
                    booking.status === 'pending' && { backgroundColor: COLORS.warning + '20' },
                    booking.status === 'in_progress' && { backgroundColor: COLORS.primary + '20' },
                    booking.status === 'completed' && { backgroundColor: COLORS.textSecondary + '20' },
                  ]}>
                    <Text style={[
                      styles.statusText,
                      booking.status === 'confirmed' && { color: COLORS.success },
                      booking.status === 'pending' && { color: COLORS.warning },
                      booking.status === 'in_progress' && { color: COLORS.primary },
                      booking.status === 'completed' && { color: COLORS.textSecondary },
                    ]}>
                      {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || 'Pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingDetails}>
                  <View style={styles.detailRow}>
                    <Clock size={14} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>
                      {booking.startTime} - {booking.endTime} ({booking.duration} hours)
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <IndianRupee size={14} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>
                      {booking.amount || 0} (Platform fee: {booking.platformFee || 0})
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingActions}>
                  <Button
                    title="View Details"
                    onPress={() => handleViewBooking(booking)}
                    variant="outline"
                    size="small"
                    style={styles.actionButton}
                  />
                  <TouchableOpacity
                    onPress={() => handleChatWithRenter(booking)}
                    style={styles.chatButton}
                  >
                    <MessageCircle size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                  {(booking.status === 'confirmed' || booking.status === 'in_progress') && (
                    <Button
                      title="Manage"
                      onPress={() => handleManageRental(booking)}
                      variant="primary"
                      size="small"
                      style={styles.actionButton}
                    />
                  )}
                </View>
              </View>
            ))
          )}
        </Card>
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
    paddingVertical: SPACING.lg,
    paddingTop: SPACING.xl + 8,
    backgroundColor: COLORS.primary,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: { 
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  sectionCard: {
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    ...SHADOWS.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  vehicleName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  detailLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  priceText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  bookingCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  bookingNumber: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  renterName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  bookingDetails: {
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  detailText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  bookingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionButton: {
    flex: 1,
  },
  chatButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.textSecondary,
  },
  emptyBookingsContainer: {
    padding: SPACING.md,
    alignItems: 'center',
  },
});

export default CompanyOfferDetailsScreen;
