import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  Car,
  Bike,
  Tag,
  Fuel,
  Settings,
  Calendar,
  FileText,
  CheckCircle,
  X,
  Edit,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { vehicleApi, documentApi } from '@utils/apiClient';

interface RouteParams {
  vehicleId: string;
}

const VehicleDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { vehicleId } = (route.params as RouteParams) || {};

  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  useEffect(() => {
    if (vehicleId) {
      loadVehicleDetails();
      loadVehicleDocuments();
    }
  }, [vehicleId]);

  const loadVehicleDetails = async () => {
    try {
      setLoading(true);
      const response = await vehicleApi.getVehicle(vehicleId);
      if (response.success && response.data) {
        setVehicle(response.data);
      } else {
        Alert.alert('Error', response.error || 'Failed to load vehicle details');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load vehicle details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadVehicleDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const response = await documentApi.getUserDocuments();
      if (response.success && response.data) {
        // Filter vehicle-related documents
        const vehicleDocTypes = [
          'vehicle_registration',
          'vehicle_insurance',
          'vehicle_pollution',
          'taxi_service_papers',
          'vehicle_front',
          'vehicle_back',
        ];
        const vehicleDocs = response.data.filter((doc: any) =>
          vehicleDocTypes.includes(doc.type)
        );
        setDocuments(vehicleDocs);
      }
    } catch (error: any) {
      console.error('Error loading vehicle documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading vehicle details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vehicle Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Vehicle not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const vehicleType = vehicle.type?.toLowerCase() || 'car';
  const isCar = vehicleType === 'car';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Details</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditVehicle' as never, { vehicleId: vehicle.vehicleId } as never)}
        >
          <Edit size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Vehicle Photo */}
        {vehicle.photos?.front && (
          <View style={styles.photoContainer}>
            <Image source={{ uri: vehicle.photos.front }} style={styles.vehiclePhoto} />
          </View>
        )}

        {/* Basic Information */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            {isCar ? <Car size={20} color={COLORS.primary} /> : <Bike size={20} color={COLORS.primary} />}
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Car size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Brand & Model</Text>
              <Text style={styles.detailValue}>
                {vehicle.brand || 'N/A'} {vehicle.vehicleModel || vehicle.model || ''}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Tag size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Vehicle Number</Text>
              <Text style={styles.detailValue}>{vehicle.number || 'N/A'}</Text>
            </View>
          </View>

          {vehicle.year && (
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Calendar size={18} color={COLORS.primary} />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Year</Text>
                <Text style={styles.detailValue}>{vehicle.year}</Text>
              </View>
            </View>
          )}

          {vehicle.color && (
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Settings size={18} color={COLORS.primary} />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Color</Text>
                <Text style={styles.detailValue}>{vehicle.color}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Vehicle Specifications */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Settings size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Specifications</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Car size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>
                {vehicle.type ? vehicle.type.charAt(0).toUpperCase() + vehicle.type.slice(1) : 'N/A'}
              </Text>
            </View>
          </View>

          {vehicle.seats && (
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Car size={18} color={COLORS.primary} />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Seats</Text>
                <Text style={styles.detailValue}>{vehicle.seats}</Text>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Fuel size={18} color={COLORS.primary} />
            </View>
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Fuel Type</Text>
              <Text style={styles.detailValue}>{vehicle.fuelType || 'N/A'}</Text>
            </View>
          </View>

          {vehicle.transmission && (
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Settings size={18} color={COLORS.primary} />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Transmission</Text>
                <Text style={styles.detailValue}>{vehicle.transmission}</Text>
              </View>
            </View>
          )}

          {vehicle.insuranceExpiry && (
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Calendar size={18} color={COLORS.primary} />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Insurance Expiry</Text>
                <Text style={styles.detailValue}>
                  {new Date(vehicle.insuranceExpiry).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Vehicle Documents */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Documents</Text>
          </View>
          <View style={styles.divider} />

          {loadingDocuments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading documents...</Text>
            </View>
          ) : documents.length > 0 ? (
            documents.map((doc: any) => {
              const isPDF = doc.url && doc.url.toLowerCase().endsWith('.pdf');
              const isImage = doc.url && !isPDF;

              return (
                <TouchableOpacity
                  key={doc.documentId || doc._id}
                  style={styles.documentItem}
                  onPress={() => {
                    if (doc.url) {
                      Linking.openURL(doc.url).catch((err) => {
                        Alert.alert('Error', 'Could not open document');
                      });
                    }
                  }}
                >
                  {isImage ? (
                    <View style={styles.documentImageContainer}>
                      <Image source={{ uri: doc.url }} style={styles.documentImage} />
                    </View>
                  ) : (
                    <View style={styles.documentIconContainer}>
                      {doc.status === 'verified' ? (
                        <CheckCircle size={20} color={COLORS.success} />
                      ) : doc.status === 'pending' ? (
                        <ActivityIndicator size={20} color={COLORS.warning} />
                      ) : (
                        <FileText size={20} color={isPDF ? COLORS.primary : COLORS.error} />
                      )}
                    </View>
                  )}
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentText}>
                      {doc.type === 'vehicle_registration' ? 'Registration Certificate (RC)' :
                       doc.type === 'vehicle_insurance' ? 'Insurance Certificate' :
                       doc.type === 'vehicle_pollution' ? 'Pollution Certificate (PUC)' :
                       doc.type === 'taxi_service_papers' ? 'Taxi Service Papers' :
                       doc.type === 'vehicle_front' ? 'Vehicle Front Photo' :
                       doc.type === 'vehicle_back' ? 'Vehicle Back Photo' :
                       doc.type}
                      {isPDF && ' (PDF)'}
                    </Text>
                    <View style={[
                      styles.verifiedBadge,
                      doc.status === 'verified' ? { backgroundColor: COLORS.success + '15' } :
                      doc.status === 'pending' ? { backgroundColor: COLORS.warning + '15' } :
                      { backgroundColor: COLORS.error + '15' }
                    ]}>
                      <Text style={[
                        styles.verifiedText,
                        doc.status === 'verified' ? { color: COLORS.success } :
                        doc.status === 'pending' ? { color: COLORS.warning } :
                        { color: COLORS.error }
                      ]}>
                        {doc.status === 'verified' ? 'Verified' :
                         doc.status === 'pending' ? 'Pending' : 'Rejected'}
                      </Text>
                    </View>
                  </View>
                  {doc.url && (
                    <FileText size={20} color={COLORS.textSecondary} />
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No documents uploaded</Text>
            </View>
          )}
        </Card>

        {/* Vehicle Photos */}
        {(vehicle.photos?.front || vehicle.photos?.back || vehicle.photos?.side || vehicle.photos?.interior) && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Car size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Photos</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.photosGrid}>
              {vehicle.photos.front && (
                <View style={styles.photoItem}>
                  <Text style={styles.photoLabel}>Front</Text>
                  <Image source={{ uri: vehicle.photos.front }} style={styles.photoThumbnail} />
                </View>
              )}
              {vehicle.photos.back && (
                <View style={styles.photoItem}>
                  <Text style={styles.photoLabel}>Back</Text>
                  <Image source={{ uri: vehicle.photos.back }} style={styles.photoThumbnail} />
                </View>
              )}
              {vehicle.photos.side && (
                <View style={styles.photoItem}>
                  <Text style={styles.photoLabel}>Side</Text>
                  <Image source={{ uri: vehicle.photos.side }} style={styles.photoThumbnail} />
                </View>
              )}
              {vehicle.photos.interior && (
                <View style={styles.photoItem}>
                  <Text style={styles.photoLabel}>Interior</Text>
                  <Image source={{ uri: vehicle.photos.interior }} style={styles.photoThumbnail} />
                </View>
              )}
            </View>
          </Card>
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
    fontWeight: 'bold',
  },
  placeholder: { width: 40 },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  photoContainer: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  vehiclePhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  card: {
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: 'bold',
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
    gap: SPACING.md,
  },
  detailIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  detailValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  documentImageContainer: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  documentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  documentIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  verifiedText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  emptyState: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  photoItem: {
    width: '48%',
  },
  photoLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  photoThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: BORDER_RADIUS.md,
    resizeMode: 'cover',
  },
});

export default VehicleDetailsScreen;
