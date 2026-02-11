import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ImageBackground,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Car, Bike, Edit, Eye } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { vehicleApi, companyApi } from '@utils/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VehicleInformationScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('All');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const tabs = ['All', 'Cars', 'Bikes', 'Available'];

  useEffect(() => {
    loadUserInfo();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (userType) {
        loadVehicles();
      }
    }, [userType, companyId])
  );

  const loadUserInfo = async () => {
    try {
      const storedUserType = await AsyncStorage.getItem('userType');
      console.log('👤 User type from storage:', storedUserType);
      setUserType(storedUserType);

      if (storedUserType === 'company') {
        // Get company profile to get companyId
        console.log('🏢 Fetching company profile...');
        const response = await companyApi.getProfile();
        console.log('🏢 Company profile response:', response.success, response.data?.companyId);
        if (response.success && response.data?.companyId) {
          setCompanyId(response.data.companyId);
          console.log('✅ CompanyId set:', response.data.companyId);
        } else {
          console.error('❌ Failed to get companyId from profile');
        }
      }
    } catch (error) {
      console.error('❌ Error loading user info:', error);
    }
  };

  const loadVehicles = async () => {
    // Don't load if company user but companyId not yet loaded
    if (userType === 'company' && !companyId) {
      console.log('⏳ Waiting for companyId to load...');
      return;
    }

    try {
      setLoading(true);
      let response;

      if (userType === 'company' && companyId) {
        // Load company vehicles
        console.log('🚗 Loading company vehicles for companyId:', companyId);
        response = await vehicleApi.getCompanyVehicles(companyId);
      } else if (userType === 'company') {
        // Fallback: use regular vehicles endpoint which now handles companies
        console.log('🚗 Loading vehicles (company fallback)');
        response = await vehicleApi.getVehicles();
      } else {
        // Load individual user vehicles
        console.log('🚗 Loading individual user vehicles');
        response = await vehicleApi.getVehicles();
      }

      console.log('📦 Vehicle API response:', response.success, response.data?.length || 0, 'vehicles');

      if (response.success && response.data) {
        const vehiclesData = Array.isArray(response.data) ? response.data : [];
        console.log('✅ Loaded', vehiclesData.length, 'vehicles');
        
        // Map backend format to UI format
        const mappedVehicles = vehiclesData.map((vehicle: any) => ({
          id: vehicle.vehicleId || vehicle._id,
          vehicleId: vehicle.vehicleId || vehicle._id,
          type: vehicle.type === 'car' ? 'Car' : 'Bike',
          brand: `${vehicle.brand || ''} ${vehicle.vehicleModel || vehicle.model || ''}`.trim(),
          number: vehicle.number || 'N/A',
          status: vehicle.status === 'active' ? 'available' : vehicle.status || 'available',
          image: vehicle.photos?.front || vehicle.photos?.side || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400',
          seats: vehicle.seats,
          fuelType: vehicle.fuelType,
          transmission: vehicle.transmission,
          isVerified: vehicle.isVerified,
          ...vehicle,
        }));

        setVehicles(mappedVehicles);
      } else {
        console.warn('⚠️ No vehicles in response:', response);
        setVehicles([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading vehicles:', error);
      Alert.alert('Error', `Failed to load vehicles: ${error.message || 'Unknown error'}`);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Cars') return vehicle.type === 'Car';
    if (activeTab === 'Bikes') return vehicle.type === 'Bike';
    if (activeTab === 'Available') return vehicle.status === 'available';
    return true;
  });

  const totalVehicles = vehicles.length;
  const carsCount = vehicles.filter((v) => v.type === 'Car').length;
  const bikesCount = vehicles.filter((v) => v.type === 'Bike').length;

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../../../assets/onboarding2.jpg')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <BlurView intensity={50} style={styles.blurContainer}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('vehicleInventory.title')}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddVehicle' as never)}
              style={styles.addButton}
            >
              <Plus size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </BlurView>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            {t('vehicleInventory.total')}: {totalVehicles} {t('vehicleInventory.vehicles')}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Car size={20} color={COLORS.primary} />
              <Text style={styles.summaryItemText}>
                {t('vehicleInventory.cars')}: {carsCount}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Bike size={20} color={COLORS.primary} />
              <Text style={styles.summaryItemText}>
                {t('vehicleInventory.bikes')}: {bikesCount}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[styles.tabText, activeTab === tab && styles.activeTabText]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading vehicles...</Text>
          </View>
        ) : (
          <>
            {filteredVehicles.map((vehicle) => (
              <Card key={vehicle.id} style={styles.vehicleCard}>
                <Image source={{ uri: vehicle.image }} style={styles.vehicleImage} />
                <View style={styles.vehicleInfo}>
                  <View style={styles.vehicleHeader}>
                    {vehicle.type === 'Car' ? (
                      <Car size={24} color={COLORS.primary} />
                    ) : (
                      <Bike size={24} color={COLORS.primary} />
                    )}
                    <Text style={styles.vehicleBrand}>{vehicle.brand}</Text>
                  </View>
                  <Text style={styles.vehicleNumber}>{vehicle.number}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      vehicle.status === 'available'
                        ? styles.statusAvailable
                        : styles.statusBooked,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {t('vehicleInventory.status')}: {vehicle.status}
                    </Text>
                  </View>
                  <View style={styles.vehicleActions}>
                    <Button
                      title={t('common.edit')}
                      onPress={() => navigation.navigate('AddVehicle' as never, { vehicle } as never)}
                      variant="outline"
                      size="small"
                      style={styles.actionButton}
                    />
                    <Button
                      title={t('vehicleInventory.viewDetails')}
                      onPress={() => {}}
                      variant="primary"
                      size="small"
                      style={styles.actionButton}
                    />
                  </View>
                </View>
              </Card>
            ))}

            {filteredVehicles.length === 0 && !loading && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('vehicleInventory.noVehiclesFound')}</Text>
                <Button
                  title={t('vehicleInventory.addVehicle')}
                  onPress={() => navigation.navigate('AddVehicle' as never)}
                  variant="primary"
                  size="medium"
                  style={styles.addButtonEmpty}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerImage: {
    width: '100%',
    height: 200,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary,
    opacity: 0.6,
  },
  blurContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    height: '100%',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.white,
    fontWeight: 'bold',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { padding: SPACING.md },
  summaryCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  summaryText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  summaryItemText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xs,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  tab: {
    flex: 1,
    padding: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  vehicleCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  vehicleImage: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.md,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  vehicleBrand: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  vehicleNumber: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  statusAvailable: {
    backgroundColor: COLORS.success + '20',
  },
  statusBooked: {
    backgroundColor: COLORS.warning + '20',
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  addButtonEmpty: {
    minWidth: 200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    gap: SPACING.md,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
});

export default VehicleInformationScreen;
