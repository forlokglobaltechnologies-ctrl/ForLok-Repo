import React, { useState, useEffect } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Car, AlertCircle, X, Clock, MessageCircle } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { rentalApi, companyApi } from '@utils/apiClient';

const CompanyMyOffersScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('All');
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const tabs = ['All', 'Active', 'Pending', 'Booked', 'Expired'];

  // Get company profile to get companyId
  useEffect(() => {
    const loadCompanyProfile = async () => {
      try {
        const response = await companyApi.getProfile();
        if (response.success && response.data?.companyId) {
          setCompanyId(response.data.companyId);
        }
      } catch (error) {
        console.error('Error loading company profile:', error);
      }
    };
    loadCompanyProfile();
  }, []);

  const loadOffers = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const filters: any = {};
      if (activeTab !== 'All') {
        filters.status = activeTab.toLowerCase();
      }

      const response = await rentalApi.getCompanyOffers(companyId, filters);

      if (response.success && response.data) {
        const offersData = response.data.offers || response.data || [];
        
        // Load booking counts for each offer
        const bookingApi = (await import('@utils/apiClient')).bookingApi;
        const offersWithBookings = await Promise.all(
          offersData.map(async (offer: any) => {
            let totalBookings = 0;
            try {
              const bookingsResponse = await bookingApi.getAllBookingsByOffer(offer.offerId || offer._id, 'rental');
              if (bookingsResponse.success && bookingsResponse.data) {
                const bookingsList = Array.isArray(bookingsResponse.data) 
                  ? bookingsResponse.data 
                  : [];
                totalBookings = bookingsList.filter((b: any) => 
                  b.status !== 'cancelled' && b.status !== 'completed'
                ).length;
              }
            } catch (error) {
              console.warn('Failed to load bookings for offer:', offer.offerId, error);
            }
            
            return {
              id: offer.offerId || offer._id,
              type: 'rental',
              offerId: offer.offerId || offer._id,
              vehicle: {
                brand: offer.vehicle?.brand || 'Unknown',
                vehicleModel: offer.vehicle?.vehicleModel || offer.vehicle?.model || '',
                type: offer.vehicle?.type || 'car',
                photos: offer.vehicle?.photos || [],
                displayName: `${offer.vehicle?.brand || 'Unknown'} ${offer.vehicle?.vehicleModel || offer.vehicle?.model || ''}`,
              },
              date: offer.date ? new Date(offer.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
              availableFrom: offer.availableFrom || '',
              availableUntil: offer.availableUntil || '',
              pricePerHour: offer.pricePerHour || 0,
              status: totalBookings > 0 ? 'booked' : (offer.status || 'active'),
              totalBookings: totalBookings,
              ...offer,
            };
          })
        );

        // Filter out completed offers
        const activeOffers = offersWithBookings.filter((offer) => offer.status !== 'completed');
        setMyOffers(activeOffers);
      } else {
        setMyOffers([]);
      }
    } catch (error: any) {
      console.error('Error loading offers:', error);
      Alert.alert('Error', `Failed to load offers: ${error.message || 'Unknown error'}`);
      setMyOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadOffers();
    }
  }, [companyId, activeTab]);

  useFocusEffect(
    React.useCallback(() => {
      if (companyId) {
        loadOffers();
      }
    }, [companyId])
  );

  const filteredOffers = myOffers.filter((offer) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Active') return offer.status === 'active';
    if (activeTab === 'Pending') return offer.status === 'pending';
    if (activeTab === 'Booked') return offer.status === 'booked' || offer.totalBookings > 0;
    if (activeTab === 'Expired') return offer.status === 'expired';
    return true;
  });

  const handleView = (offer: any) => {
    navigation.navigate('CompanyOfferDetails' as never, { offerId: offer.offerId, offer } as never);
  };

  const handleChat = async (offer: any) => {
    try {
      const chatApi = (await import('@utils/apiClient')).chatApi;
      // For rental, get conversation by booking
      // Since company can have multiple bookings, navigate to chat list filtered by offer
      navigation.navigate('ChatList' as never);
    } catch (error) {
      console.error('Error navigating to chat:', error);
    }
  };

  const handleCancel = async (offer: any) => {
    try {
      // Cancel offer logic
      Alert.alert('Cancel Offer', 'Are you sure you want to cancel this offer?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            // Implement cancel offer API call
            Alert.alert('Success', 'Offer cancelled successfully');
            loadOffers();
          },
        },
      ]);
    } catch (error) {
      console.error('Error cancelling offer:', error);
    }
  };

  if (loading && myOffers.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Rental Offers</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateRentalOffer' as never)}
              style={styles.addButton}
            >
              <Plus size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading offers...</Text>
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
        <Text style={styles.headerTitle}>My Rental Offers</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateRentalOffer' as never)}
            style={styles.addButton}
          >
            <Plus size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Offers List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {filteredOffers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Car size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No offers found</Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'All' 
                ? 'Create your first rental offer to get started'
                : `No ${activeTab.toLowerCase()} offers`}
            </Text>
            {activeTab === 'All' && (
              <Button
                title="Create Offer"
                onPress={() => navigation.navigate('CreateRentalOffer' as never)}
                variant="primary"
                style={styles.createButton}
              />
            )}
          </View>
        ) : (
          filteredOffers.map((offer) => (
            <Card key={offer.id} style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <View style={styles.offerTypeContainer}>
                  <Car size={20} color={COLORS.primary} />
                  <Text style={styles.offerType}>Rental</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  offer.status === 'active' && { backgroundColor: COLORS.success + '20' },
                  offer.status === 'pending' && { backgroundColor: COLORS.warning + '20' },
                  offer.status === 'booked' && { backgroundColor: COLORS.primary + '20' },
                  offer.status === 'expired' && { backgroundColor: COLORS.error + '20' },
                ]}>
                  <Text style={[
                    styles.statusText,
                    offer.status === 'active' && { color: COLORS.success },
                    offer.status === 'pending' && { color: COLORS.warning },
                    offer.status === 'booked' && { color: COLORS.primary },
                    offer.status === 'expired' && { color: COLORS.error },
                  ]}>
                    {offer.status?.charAt(0).toUpperCase() + offer.status?.slice(1) || 'Active'}
                  </Text>
                </View>
              </View>

              <View style={styles.offerContent}>
                <Text style={styles.vehicleName}>{offer.vehicle?.displayName || 'Unknown Vehicle'}</Text>
                <View style={styles.offerDetails}>
                  <View style={styles.detailRow}>
                    <Clock size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>
                      {offer.date} • {offer.availableFrom} - {offer.availableUntil}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailText}>
                      ₹{offer.pricePerHour}/hour
                    </Text>
                  </View>
                  {offer.totalBookings > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.bookingsText}>
                        {offer.totalBookings} {offer.totalBookings === 1 ? 'booking' : 'bookings'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.offerActions}>
                <Button
                  title="View"
                  onPress={() => handleView(offer)}
                  variant="outline"
                  size="small"
                  style={styles.actionButton}
                />
                {offer.totalBookings > 0 && (
                  <TouchableOpacity
                    onPress={() => handleChat(offer)}
                    style={styles.chatButton}
                  >
                    <MessageCircle size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
                {(offer.status === 'active' || offer.status === 'pending') && (
                  <Button
                    title="Cancel"
                    onPress={() => handleCancel(offer)}
                    variant="outline"
                    size="small"
                    style={[styles.actionButton, styles.cancelButton]}
                  />
                )}
              </View>
            </Card>
          ))
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  addButton: {
    padding: SPACING.xs,
  },
  tabs: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.xs,
    ...SHADOWS.sm,
  },
  tab: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginHorizontal: SPACING.xs,
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: { 
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  offerCard: { 
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    ...SHADOWS.md,
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  offerTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  offerType: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '700',
    letterSpacing: 0.3,
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
  offerContent: {
    marginBottom: SPACING.md,
  },
  vehicleName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  offerDetails: {
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  bookingsText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  offerActions: {
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
  cancelButton: {
    borderColor: COLORS.error,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
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
    gap: SPACING.md,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    fontWeight: '600',
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  createButton: {
    marginTop: SPACING.md,
  },
});

export default CompanyMyOffersScreen;
