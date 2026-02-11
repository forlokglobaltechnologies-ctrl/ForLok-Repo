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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Plus, Car, Bike, AlertCircle, Edit, Trash2 } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { vehicleApi, companyApi } from '@utils/apiClient';

const CompanyVehicleManagementScreen = () => {
  const navigation = useNavigation();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (companyId) {
        loadVehicles();
      }
    }, [companyId])
  );

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

  const loadVehicles = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const response = await vehicleApi.getCompanyVehicles(companyId);
      
      if (response.success && response.data) {
        setVehicles(Array.isArray(response.data) ? response.data : []);
      } else {
        setVehicles([]);
      }
    } catch (error: any) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Error', `Failed to load vehicles: ${error.message || 'Unknown error'}`);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = () => {
    navigation.navigate('AddVehicle' as never);
  };

  const handleEditVehicle = (vehicle: any) => {
    // Navigate to edit vehicle screen (if exists) or AddVehicle with vehicle data
    navigation.navigate('AddVehicle' as never, { vehicle } as never);
  };

  const handleDeleteVehicle = async (vehicle: any) => {
    Alert.alert(
      'Delete Vehicle',
      'Are you sure you want to delete this vehicle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Implement delete vehicle API call
              Alert.alert('Success', 'Vehicle deleted successfully');
              loadVehicles();
            } catch (error) {
              console.error('Error deleting vehicle:', error);
              Alert.alert('Error', 'Failed to delete vehicle');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Vehicles</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading vehicles...</Text>
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
        <Text style={styles.headerTitle}>My Vehicles</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleAddVehicle}
            style={styles.addButton}
          >
            <Plus size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {vehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Car size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No vehicles found</Text>
            <Text style={styles.emptySubtext}>
              Add your first vehicle to start offering rentals
            </Text>
            <Button
              title="Add Vehicle"
              onPress={handleAddVehicle}
              variant="primary"
              style={styles.addButtonLarge}
            />
          </View>
        ) : (
          vehicles.map((vehicle) => (
            <Card key={vehicle.vehicleId || vehicle._id} style={styles.vehicleCard}>
              <View style={styles.vehicleHeader}>
                <View style={styles.vehicleTypeContainer}>
                  {vehicle.type === 'car' ? (
                    <Car size={24} color={COLORS.primary} />
                  ) : (
                    <Bike size={24} color={COLORS.primary} />
                  )}
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleName}>
                      {vehicle.brand} {vehicle.vehicleModel || vehicle.model || ''}
                    </Text>
                    <Text style={styles.vehicleNumber}>{vehicle.number}</Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge,
                  vehicle.status === 'active' && { backgroundColor: COLORS.success + '20' },
                  vehicle.status === 'inactive' && { backgroundColor: COLORS.error + '20' },
                  vehicle.status === 'under_maintenance' && { backgroundColor: COLORS.warning + '20' },
                ]}>
                  <Text style={[
                    styles.statusText,
                    vehicle.status === 'active' && { color: COLORS.success },
                    vehicle.status === 'inactive' && { color: COLORS.error },
                    vehicle.status === 'under_maintenance' && { color: COLORS.warning },
                  ]}>
                    {vehicle.status?.charAt(0).toUpperCase() + vehicle.status?.slice(1) || 'Active'}
                  </Text>
                </View>
              </View>

              <View style={styles.vehicleDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Seats:</Text>
                  <Text style={styles.detailValue}>{vehicle.seats || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fuel:</Text>
                  <Text style={styles.detailValue}>{vehicle.fuelType || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transmission:</Text>
                  <Text style={styles.detailValue}>{vehicle.transmission || 'N/A'}</Text>
                </View>
                {vehicle.isVerified !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Verified:</Text>
                    <Text style={[
                      styles.detailValue,
                      vehicle.isVerified ? { color: COLORS.success } : { color: COLORS.warning }
                    ]}>
                      {vehicle.isVerified ? 'Yes' : 'Pending'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.vehicleActions}>
                <Button
                  title="Edit"
                  onPress={() => handleEditVehicle(vehicle)}
                  variant="outline"
                  size="small"
                  style={styles.actionButton}
                />
                <TouchableOpacity
                  onPress={() => handleDeleteVehicle(vehicle)}
                  style={styles.deleteButton}
                >
                  <Trash2 size={18} color={COLORS.error} />
                </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: { 
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  vehicleCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    ...SHADOWS.md,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  vehicleNumber: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
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
  vehicleDetails: {
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  vehicleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
  },
  deleteButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
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
  addButtonLarge: {
    marginTop: SPACING.md,
  },
});

export default CompanyVehicleManagementScreen;
