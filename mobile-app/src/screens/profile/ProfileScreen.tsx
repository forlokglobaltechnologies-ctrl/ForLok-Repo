import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image, ActivityIndicator, Alert, Linking } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { ArrowLeft, Settings, Star, CheckCircle, Car, Bike, Edit, Eye, Mail, Phone, Calendar, User, Cake, CreditCard, BarChart, DollarSign, LogOut, ChevronRight, FileText, Shield, Hash } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';
import { userApi, documentApi, uploadFile, vehicleApi } from '@utils/apiClient';
import { apiService } from '@services/api.service';
import { websocketService } from '@services/websocket.service';
import * as ImagePicker from 'expo-image-picker';
import { BottomTabNavigator } from '@components/navigation/BottomTabNavigator';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadDocuments();
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const response = await vehicleApi.getVehicles();
      if (response.success && response.data) {
        setVehicles(response.data);
        console.log(`✅ Loaded ${response.data.length} vehicles`);
      } else {
        console.warn('⚠️ No vehicles found or API error:', response.error);
        setVehicles([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading vehicles:', error);
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  // Update profile photo when documents are loaded
  useEffect(() => {
    if (documents.length > 0 && user && !user.profilePhoto) {
      const userPhotoDoc = documents.find((d: any) => d.type === 'user_photo' && d.url);
      if (userPhotoDoc && userPhotoDoc.url) {
        setUser((prev: any) => ({
          ...prev,
          profilePhoto: userPhotoDoc.url,
        }));
      }
    }
  }, [documents, user]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await userApi.getProfile();
      if (response.success && response.data) {
        setUser(response.data);
        
        // If no profile photo, check for user_photo document
        if (!response.data.profilePhoto && documents.length > 0) {
          const userPhotoDoc = documents.find((d: any) => d.type === 'user_photo' && d.url);
          if (userPhotoDoc && userPhotoDoc.url) {
            // Update user with photo from document
            setUser((prev: any) => ({
              ...prev,
              profilePhoto: userPhotoDoc.url,
            }));
          }
        }
      } else {
        Alert.alert('Error', response.error || 'Failed to load profile');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      setDocumentsLoading(true);
      console.log('📥 Loading documents from backend...');
      const response = await documentApi.getUserDocuments();
      console.log('📥 Documents API response:', {
        success: response.success,
        dataLength: response.data?.length || 0,
        data: response.data,
        error: response.error,
      });
      
      if (response.success && response.data) {
        console.log(`✅ Loaded ${response.data.length} documents`);
        setDocuments(response.data);
        
        // Check if there's a user_photo document and update user profile photo if needed
        const userPhotoDoc = response.data.find((d: any) => d.type === 'user_photo' && d.url);
        if (userPhotoDoc && userPhotoDoc.url && (!user?.profilePhoto || user.profilePhoto !== userPhotoDoc.url)) {
          // Reload user profile to get updated profilePhoto
          await loadUserProfile();
        }
      } else {
        console.warn('⚠️ No documents found or API error:', response.error || 'Unknown error');
        setDocuments([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading documents:', error);
      Alert.alert('Error', `Failed to load documents: ${error.message || 'Unknown error'}`);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleChangePhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos');
        return;
      }

      // Show options
      Alert.alert(
        'Change Profile Photo',
        'Choose an option',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                aspect: [1, 1],
              });

              if (!result.canceled && result.assets[0]) {
                await uploadProfilePhoto(result.assets[0].uri);
              }
            },
          },
          {
            text: 'Gallery',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                aspect: [1, 1],
              });

              if (!result.canceled && result.assets[0]) {
                await uploadProfilePhoto(result.assets[0].uri);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open image picker');
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      
      // Upload to profile photo endpoint
      const response = await userApi.uploadPhoto({
        uri,
        type: 'image/jpeg',
        name: `profile_photo_${Date.now()}.jpg`,
      });

      if (response.success && response.data?.profilePhoto) {
        // Update local state
        setUser((prev: any) => ({
          ...prev,
          profilePhoto: response.data.profilePhoto,
        }));
        Alert.alert('✅ Success', 'Profile photo updated successfully!');
      } else {
        Alert.alert('❌ Upload Failed', response.error || 'Failed to upload profile photo');
      }
    } catch (error: any) {
      Alert.alert('❌ Upload Failed', error.message || 'Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logout'),
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all stored tokens
              await apiService.clearTokens();
              
              // Disconnect websocket
              websocketService.disconnect();
              
              // Reset navigation to SignIn screen and clear history
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'SignIn' }],
                })
              );
            } catch (error) {
              console.error('Logout error:', error);
              // Even if there's an error, navigate to SignIn
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'SignIn' }],
                })
              );
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No profile data available</Text>
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
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings' as never)}>
          <Settings size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profileImageContainer}>
            {user.profilePhoto ? (
              <Image 
                source={{ uri: user.profilePhoto }} 
                style={styles.profilePhoto}
                onError={() => {
                  // If image fails to load, try to get from documents
                  const userPhotoDoc = documents.find((d: any) => d.type === 'user_photo' && d.url);
                  if (userPhotoDoc && userPhotoDoc.url && userPhotoDoc.url !== user.profilePhoto) {
                    setUser((prev: any) => ({
                      ...prev,
                      profilePhoto: userPhotoDoc.url,
                    }));
                  }
                }}
              />
            ) : (
              <View style={[styles.profilePhoto, { backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                <User size={48} color={COLORS.primary} />
              </View>
            )}
            <TouchableOpacity
              style={styles.editIconButton}
              onPress={handleChangePhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size={16} color={COLORS.white} />
              ) : (
                <Edit size={16} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{user.name || 'User'}</Text>
          <View style={styles.userIdContainer}>
            <Hash size={14} color={COLORS.primary} />
            <Text style={styles.userIdText}>ID: {user.userId || 'N/A'}</Text>
          </View>
          {/* Verification Status Badge */}
          <View style={[
            styles.verificationBadge,
            user.isVerified 
              ? { backgroundColor: COLORS.success + '15', borderColor: COLORS.success }
              : { backgroundColor: COLORS.warning + '15', borderColor: COLORS.warning }
          ]}>
            <Shield 
              size={14} 
              color={user.isVerified ? COLORS.success : COLORS.warning} 
              fill={user.isVerified ? COLORS.success : 'none'}
            />
            <Text style={[
              styles.verificationText,
              { color: user.isVerified ? COLORS.success : COLORS.warning }
            ]}>
              {user.isVerified ? 'Verified' : 'Unverified'}
            </Text>
          </View>
          <View style={styles.ratingContainer}>
            <Star size={18} color={COLORS.warning} fill={COLORS.warning} />
            <Text style={styles.ratingText}>{user.rating || 0} {t('profile.averageRating')}</Text>
          </View>
        </View>

        {/* Personal Information Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <User size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('profile.personalInformation')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Hash size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValue}>{user.userId || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Mail size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.infoLabel}>{t('common.email')}</Text>
            <Text style={styles.infoValue}>{user.email || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Phone size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.infoLabel}>{t('common.phone')}</Text>
            <Text style={styles.infoValue}>{user.phone || 'N/A'}</Text>
          </View>
          {user.dateOfBirth && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Cake size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.infoLabel}>{t('common.dateOfBirth')}</Text>
              <Text style={styles.infoValue}>{new Date(user.dateOfBirth).toLocaleDateString()}</Text>
            </View>
          )}
          {user.gender && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <User size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.infoLabel}>{t('common.gender')}</Text>
              <Text style={styles.infoValue}>{user.gender}</Text>
            </View>
          )}
        </View>

        {/* Documents Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('profile.documents')}</Text>
          </View>
          <View style={styles.divider} />
          {documentsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading documents...</Text>
            </View>
          ) : documents.length > 0 ? (
            <>
              {/* Display image documents (photos) - Only user photo, vehicle photos shown in VehicleDetailsScreen */}
              {documents
                .filter((doc: any) => {
                  // Only show user_photo here, vehicle photos are shown in VehicleDetailsScreen
                  return doc.url && doc.type === 'user_photo' && !doc.url.toLowerCase().endsWith('.pdf');
                })
                .map((doc: any) => (
                  <View key={doc.documentId || doc._id} style={styles.documentItem}>
                    <View style={styles.documentImageContainer}>
                      <Image source={{ uri: doc.url }} style={styles.documentImage} />
                    </View>
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentText}>User Photo</Text>
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
                  </View>
                ))}

              {/* Vehicle Documents Section */}
              {documents.some((doc: any) => 
                ['vehicle_registration', 'vehicle_insurance', 'vehicle_pollution', 'taxi_service_papers'].includes(doc.type)
              ) && (
                <View style={styles.vehicleDocumentsSection}>
                  <Text style={styles.sectionSubtitle}>Vehicle Documents</Text>
                  {documents
                    .filter((doc: any) => 
                      ['vehicle_registration', 'vehicle_insurance', 'vehicle_pollution', 'taxi_service_papers'].includes(doc.type)
                    )
                    .map((doc: any) => {
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
                               doc.type === 'taxi_service_papers' ? 'Taxi Service Papers' : doc.type}
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
                            <ChevronRight size={20} color={COLORS.textSecondary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
              )}

              {/* Display other documents (Aadhaar, DL, etc.) */}
              {documents
                .filter((doc: any) => {
                  // Exclude business documents (only for company profiles)
                  const businessDocTypes = ['business_license', 'gst_certificate', 'company_registration'];
                  if (businessDocTypes.includes(doc.type)) {
                    return false;
                  }
                  // Exclude image-only documents (shown separately above) - Only user_photo, vehicle photos shown in VehicleDetailsScreen
                  if (doc.type === 'user_photo' && doc.url && !doc.url.toLowerCase().endsWith('.pdf')) {
                    return false;
                  }
                  // Exclude vehicle documents (shown in separate section above)
                  const vehicleDocTypes = ['vehicle_registration', 'vehicle_insurance', 'vehicle_pollution', 'taxi_service_papers'];
                  if (vehicleDocTypes.includes(doc.type)) {
                    return false;
                  }
                  return true;
                })
                .map((doc: any) => {
                  const isPDF = doc.url && doc.url.toLowerCase().endsWith('.pdf');
                  const isImage = doc.url && !isPDF && ['vehicle_insurance', 'vehicle_registration', 'vehicle_pollution', 'taxi_service_papers'].includes(doc.type);
                  
                  return (
                    <TouchableOpacity
                      key={doc.documentId || doc._id}
                      style={styles.documentItem}
                      onPress={() => {
                        if (doc.url) {
                          // Open document in browser/viewer
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
                      {doc.type === 'aadhar_front' || doc.type === 'aadhar_back' ? 'Aadhaar Card' :
                       doc.type === 'driving_license_front' || doc.type === 'driving_license_back' ? 'Driving License' :
                           doc.type === 'vehicle_insurance' ? 'Vehicle Insurance' :
                           doc.type === 'vehicle_registration' ? 'Registration Certificate (RC)' :
                           doc.type === 'vehicle_pollution' ? 'Pollution Certificate (PUC)' :
                           doc.type === 'taxi_service_papers' ? 'Taxi Service Papers' :
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
                        <ChevronRight size={20} color={COLORS.textSecondary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No documents uploaded yet</Text>
            </View>
          )}
        </View>

        {/* Vehicles Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Car size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('profile.myVehicles')}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddVehicle' as never)}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          {loadingVehicles ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading vehicles...</Text>
            </View>
          ) : vehicles.length > 0 ? (
            vehicles.map((vehicle: any, index: number) => (
              <View key={vehicle.vehicleId || vehicle._id || index} style={styles.vehicleItem}>
                <View style={styles.vehicleIconContainer}>
                  {vehicle.type?.toLowerCase() === 'car' ? (
                    <Car size={24} color={COLORS.primary} />
                  ) : (
                    <Bike size={24} color={COLORS.primary} />
                  )}
                </View>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>
                    {vehicle.brand || 'Unknown'} {vehicle.vehicleModel || vehicle.model || ''}
                  </Text>
                  <Text style={styles.vehicleNumber}>{vehicle.number || 'N/A'}</Text>
                  {vehicle.seats && (
                    <Text style={styles.vehicleDetails}>{vehicle.seats} seats • {vehicle.fuelType || 'N/A'}</Text>
                  )}
                </View>
                <View style={styles.vehicleActions}>
                  <TouchableOpacity 
                    style={styles.vehicleActionButton}
                    onPress={() => navigation.navigate('EditVehicle' as never, { vehicleId: vehicle.vehicleId } as never)}
                  >
                    <Edit size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.vehicleActionButton}
                    onPress={() => navigation.navigate('VehicleDetails' as never, { vehicleId: vehicle.vehicleId } as never)}
                  >
                    <Eye size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Car size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyStateText}>No vehicles added yet</Text>
              <TouchableOpacity
                style={styles.addVehicleButton}
                onPress={() => navigation.navigate('AddVehicle' as never)}
              >
                <Text style={styles.addVehicleButtonText}>+ Add Vehicle</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Statistics Card */}
        <View style={styles.statsCard}>
          <View style={styles.sectionHeader}>
            <BarChart size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>{t('profile.statistics')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <BarChart size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.statValue}>{user.totalTrips}</Text>
              <Text style={styles.statLabel}>{t('profile.totalTrips')}</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Star size={20} color={COLORS.warning} />
              </View>
              <Text style={styles.statValue}>{user.rating}</Text>
              <Text style={styles.statLabel}>{t('profile.averageRating')}</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <DollarSign size={20} color={COLORS.success} />
              </View>
              <Text style={styles.statValue}>₹{user.totalEarnings}</Text>
              <Text style={styles.statLabel}>{t('profile.totalEarnings')}</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('MyOffers' as never)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Car size={20} color={COLORS.primary} />
              </View>
            <Text style={styles.menuText}>My Offers</Text>
            </View>
            <ChevronRight size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Payment' as never)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <CreditCard size={20} color={COLORS.primary} />
              </View>
            <Text style={styles.menuText}>Payment Methods</Text>
            </View>
            <ChevronRight size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('HelpSupport' as never)}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Shield size={20} color={COLORS.primary} />
              </View>
            <Text style={styles.menuText}>Help & Support</Text>
            </View>
            <ChevronRight size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <FileText size={20} color={COLORS.primary} />
              </View>
            <Text style={styles.menuText}>About</Text>
            </View>
            <ChevronRight size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, styles.logoutIconContainer]}>
                <LogOut size={20} color={COLORS.error} />
              </View>
            <Text style={[styles.menuText, styles.logoutText]}>{t('profile.logout')}</Text>
            </View>
            <ChevronRight size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomTabNavigator />
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
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  // Profile Header Card
  profileHeaderCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.primary + '20',
  },
  editIconButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    ...SHADOWS.sm,
  },
  profileName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  profileUsername: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  userIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  userIdText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.xs,
    alignSelf: 'center',
  },
  verificationText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.warning + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  ratingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  // Section Cards
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
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
    backgroundColor: COLORS.lightGray,
    marginBottom: SPACING.md,
  },
  // Personal Information
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    textAlign: 'right',
  },
  // Documents
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  documentIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  documentText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  verifiedBadge: {
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  verifiedText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.success,
    fontWeight: '600',
  },
  documentImageContainer: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  documentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  documentInfo: {
    flex: 1,
    marginLeft: SPACING.md,
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
  vehicleDocumentsSection: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sectionSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  // Vehicles
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  vehicleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  vehicleNumber: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  vehicleDetails: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
  },
  addVehicleButton: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  addVehicleButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  vehicleActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  // Statistics
  statsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  // Menu
  menuContainer: {
    marginTop: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  logoutItem: {
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  logoutIconContainer: {
    backgroundColor: COLORS.error + '15',
  },
  logoutText: {
    color: COLORS.error,
    fontWeight: '600',
  },
});

export default ProfileScreen;

