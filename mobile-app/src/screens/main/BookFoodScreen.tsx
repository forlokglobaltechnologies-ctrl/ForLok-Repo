import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, MapPin, Clock, Star, Phone, Utensils } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';
import { foodApi } from '@utils/apiClient';

interface Shop {
  id: string;
  name: string;
  category: 'tiffin' | 'lunch' | 'dinner';
  address: string;
  timing: string;
  rating: string;
  phone: string;
}

interface IntermediateLocation {
  name: string;
  state: string;
  shops: Shop[];
}

interface RouteData {
  from: string;
  to: string;
  intermediateLocations: IntermediateLocation[];
}

const BookFoodScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const params = (route.params as any) || {};
  // Support both string addresses and location objects
  const from = typeof params.from === 'string' ? params.from : params.from?.address || params.from;
  const to = typeof params.to === 'string' ? params.to : params.to?.address || params.to;
  // Try to get coordinates if available (from route params or location objects)
  const fromLat = params.fromLat || (typeof params.from === 'object' && params.from?.lat ? params.from.lat : null);
  const fromLng = params.fromLng || (typeof params.from === 'object' && params.from?.lng ? params.from.lng : null);
  const toLat = params.toLat || (typeof params.to === 'object' && params.to?.lat ? params.to.lat : null);
  const toLng = params.toLng || (typeof params.to === 'object' && params.to?.lng ? params.to.lng : null);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<'tiffin' | 'lunch' | 'dinner' | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [foodShops, setFoodShops] = useState<any[]>([]);
  const [fromLocation, setFromLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [toLocation, setToLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load food shops when screen is focused or category changes
  useEffect(() => {
    loadFoodShops();
  }, [selectedCategory]);

  // Geocode addresses to get coordinates
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
    }
    return null;
  };

  // Load food shops from backend
  const loadFoodShops = async () => {
    try {
      setLoading(true);
      console.log('🍔 Loading food shops for route:', { from, to });

      // Get coordinates for from and to locations
      // First check if coordinates were passed directly
      let fromCoords = (fromLat && fromLng) ? { lat: fromLat, lng: fromLng } : fromLocation;
      let toCoords = (toLat && toLng) ? { lat: toLat, lng: toLng } : toLocation;

      // If we don't have coordinates, try to geocode addresses
      if (!fromCoords && from) {
        console.log('📍 Geocoding from address:', from);
        fromCoords = await geocodeAddress(from);
        if (fromCoords) {
          setFromLocation(fromCoords);
        }
      }

      if (!toCoords && to) {
        console.log('📍 Geocoding to address:', to);
        toCoords = await geocodeAddress(to);
        if (toCoords) {
          setToLocation(toCoords);
        }
      }

      // If we still don't have coordinates, use default Bangalore coordinates
      if (!fromCoords) {
        console.log('⚠️ Using default from location (Bangalore)');
        fromCoords = { lat: 12.9716, lng: 77.5946 }; // Bangalore default
      }

      if (!toCoords) {
        console.log('⚠️ Using default to location (Bangalore)');
        toCoords = { lat: 12.9352, lng: 77.6245 }; // Bangalore default
      }

      console.log('📍 Route coordinates:', { fromCoords, toCoords });

      // Fetch food shops along route
      // Build query params - only include category if not 'all'
      const queryParams: any = {
        fromLat: fromCoords.lat,
        fromLng: fromCoords.lng,
        toLat: toCoords.lat,
        toLng: toCoords.lng,
      };
      
      // Only add category if it's not 'all'
      if (selectedCategory !== 'all') {
        queryParams.category = selectedCategory;
      }
      
      const response = await foodApi.getFoodAlongRoute(queryParams);

      console.log('📦 Food API response:', response);

      if (response.success && response.data) {
        // Transform backend data to match frontend format
        const transformedData = response.data.map((item: any) => ({
          location: item.location,
          shops: item.shops.map((shop: any) => ({
            id: shop.id,
            name: shop.name,
            category: shop.category,
            address: shop.address,
            timing: shop.timing,
            rating: shop.rating,
            phone: shop.phone || '+91 9876543210',
          })),
        }));

        setFoodShops(transformedData);
        console.log('✅ Loaded food shops:', transformedData.length, 'locations');
      } else {
        console.log('⚠️ No food shops found or API error:', response.error);
        setFoodShops([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading food shops:', error);
      setFoodShops([]);
    } finally {
      setLoading(false);
    }
  };

  // Get current time category
  const getTimeCategory = (): 'tiffin' | 'lunch' | 'dinner' => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 11) return 'tiffin';
    if (hour >= 11 && hour < 16) return 'lunch';
    return 'dinner';
  };

  // Filter data based on selected category
  const filteredData = selectedCategory === 'all' 
    ? foodShops 
    : foodShops.map((locationGroup) => ({
        ...locationGroup,
        shops: locationGroup.shops.filter((shop: Shop) => shop.category === selectedCategory),
      })).filter((locationGroup) => locationGroup.shops.length > 0);
  
  const timeCategory = getTimeCategory();

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch((err) => {
      console.error('Error making phone call:', err);
    });
  };

  const renderShopItem = ({ item }: { item: Shop }) => (
    <View style={styles.shopCard}>
      <View style={styles.shopHeader}>
        <View style={styles.shopIconContainer}>
          <Utensils size={24} color={COLORS.white} />
        </View>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{item.name}</Text>
          <View style={styles.shopMeta}>
            <View style={styles.ratingContainer}>
              <Star size={16} color={COLORS.warning} fill={COLORS.warning} />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.shopDetails}>
        <View style={styles.detailRow}>
          <MapPin size={18} color={COLORS.primary} />
          <Text style={styles.detailText} numberOfLines={2}>{item.address}</Text>
        </View>
        <View style={styles.detailRow}>
          <Clock size={18} color={COLORS.primary} />
          <Text style={styles.detailText}>{item.timing}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.callButton}
        onPress={() => handleCall(item.phone)}
        activeOpacity={0.8}
      >
        <Phone size={18} color={COLORS.white} />
        <Text style={styles.callButtonText}>{t('bookFood.call')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLocationSection = ({ item }: { item: { location: IntermediateLocation; shops: Shop[] } }) => (
    <View style={styles.locationSection}>
      <View style={styles.locationHeader}>
        <View style={styles.locationIconContainer}>
          <MapPin size={22} color={COLORS.white} />
        </View>
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{item.location.name}</Text>
          <Text style={styles.locationState}>{item.location.state}</Text>
        </View>
        <View style={styles.shopCountBadge}>
          <Text style={styles.shopCountText}>{item.shops.length}</Text>
        </View>
      </View>
      <FlatList
        data={item.shops}
        renderItem={renderShopItem}
        keyExtractor={(shop) => shop.id}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.shopSeparator} />}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('bookFood.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Route Info Card */}
      <View style={styles.routeInfoCard}>
        <View style={styles.routeInfo}>
          <View style={styles.routeItem}>
            <View style={styles.routeIcon}>
              <MapPin size={18} color={COLORS.white} />
            </View>
            <Text style={styles.routeText} numberOfLines={1}>{from || 'N/A'}</Text>
          </View>
          <View style={styles.routeArrowContainer}>
            <View style={styles.routeArrowLine} />
            <Text style={styles.routeArrow}>→</Text>
            <View style={styles.routeArrowLine} />
          </View>
          <View style={styles.routeItem}>
            <View style={styles.routeIcon}>
              <MapPin size={18} color={COLORS.white} />
            </View>
            <Text style={styles.routeText} numberOfLines={1}>{to || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>{t('bookFood.filterByTime')}</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterButtons}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedCategory === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedCategory('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedCategory === 'all' && styles.filterButtonTextActive,
              ]}
            >
              {t('bookFood.current')} ({timeCategory})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedCategory === 'tiffin' && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedCategory('tiffin')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedCategory === 'tiffin' && styles.filterButtonTextActive,
              ]}
            >
              {t('bookFood.tiffin')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedCategory === 'lunch' && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedCategory('lunch')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedCategory === 'lunch' && styles.filterButtonTextActive,
              ]}
            >
              {t('bookFood.lunch')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedCategory === 'dinner' && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedCategory('dinner')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedCategory === 'dinner' && styles.filterButtonTextActive,
              ]}
            >
              {t('bookFood.dinner')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Shops List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.emptyText}>Loading food shops...</Text>
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Utensils size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>{t('bookFood.noShopsFound')}</Text>
            <Text style={styles.emptySubtext}>
              {`No ${selectedCategory === 'all' ? getTimeCategory() : selectedCategory} shops available on this route`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredData}
            renderItem={renderLocationSection}
            keyExtractor={(item, index) => `${item.location.name}-${index}`}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
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
    paddingVertical: SPACING.lg,
    paddingTop: SPACING.xl + 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  backButton: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 40,
  },
  routeInfoCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  routeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  routeArrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  routeArrowLine: {
    width: 20,
    height: 2,
    backgroundColor: COLORS.primary,
  },
  routeArrow: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  filterContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  filterLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },
  filterButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  filterButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
  locationSection: {
    marginBottom: SPACING.xl,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 4,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.white}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.white,
    fontWeight: '700',
    marginBottom: 2,
  },
  locationState: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: `${COLORS.white}CC`,
    fontWeight: '500',
  },
  shopCountBadge: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.round,
    minWidth: 40,
    alignItems: 'center',
  },
  shopCountText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: '700',
  },
  shopCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shopSeparator: {
    height: SPACING.sm,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  shopIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    letterSpacing: 0.2,
  },
  shopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${COLORS.warning}15`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
  },
  ratingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.warning,
    fontWeight: '700',
  },
  categoryBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
  },
  categoryText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  shopDetails: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  detailText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  callButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    fontWeight: '700',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default BookFoodScreen;
