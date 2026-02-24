import React, { useState, useEffect, useRef } from 'react';
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
  ImageBackground,
  Modal,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Settings,
  Star,
  CheckCircle,
  Car,
  Bike,
  Edit,
  Eye,
  Phone,
  Calendar,
  User,
  Cake,

  BarChart,
  DollarSign,
  LogOut,
  ChevronRight,
  FileText,
  Shield,
  Wallet,
  MessageSquare,
  Info,
  Coins,
  Gift,
  Trophy,
  MapPin,
  TrendingUp,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { normalize, wp, hp } from '@utils/responsive';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { useSnackbar } from '@context/SnackbarContext';
import { userApi, documentApi, uploadFile, vehicleApi } from '@utils/apiClient';
import { apiService } from '@services/api.service';
import { useAuth } from '@context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { getUserErrorMessage } from '@utils/errorUtils';

const AVATAR_SIZE = normalize(60);

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { logout: authLogout } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const lottieRef = useRef<LottieView>(null);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setLoggingOut(true);
    // Play lottie animation, then logout after a short delay
    lottieRef.current?.play();
    setTimeout(async () => {
      try {
        // Clear tokens and auth state
        await authLogout();
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('userRole');
        await AsyncStorage.removeItem('userName');

        setShowLogoutModal(false);
        setLoggingOut(false);

        // Reset navigation to Sign In
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'SignIn' }],
          })
        );
      } catch (error) {
        console.error('Logout error:', error);
        setLoggingOut(false);
        setShowLogoutModal(false);
        showSnackbar({ message: 'Failed to logout. Please try again.', type: 'error' });
      }
    }, 2000);
  };

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
      } else {
        setVehicles([]);
      }
    } catch (error: any) {
      console.error('Error loading vehicles:', error);
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    if (documents.length > 0 && user && !user.profilePhoto) {
      const userPhotoDoc = documents.find((d: any) => d.type === 'user_photo' && d.url);
      if (userPhotoDoc && userPhotoDoc.url) {
        setUser((prev: any) => ({ ...prev, profilePhoto: userPhotoDoc.url }));
      }
    }
  }, [documents, user]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await userApi.getProfile();
      if (response.success && response.data) {
        setUser(response.data);
        if (!response.data.profilePhoto && documents.length > 0) {
          const userPhotoDoc = documents.find((d: any) => d.type === 'user_photo' && d.url);
          if (userPhotoDoc && userPhotoDoc.url) {
            setUser((prev: any) => ({ ...prev, profilePhoto: userPhotoDoc.url }));
          }
        }
      } else {
        showSnackbar({ message: getUserErrorMessage(response as any, 'Failed to load profile'), type: 'error' });
      }
    } catch (error: any) {
      showSnackbar({ message: error.message || 'Failed to load profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      setDocumentsLoading(true);
      const response = await documentApi.getUserDocuments();
      if (response.success && response.data) {
        setDocuments(response.data);
        const userPhotoDoc = response.data.find((d: any) => d.type === 'user_photo' && d.url);
        if (userPhotoDoc && userPhotoDoc.url && (!user?.profilePhoto || user.profilePhoto !== userPhotoDoc.url)) {
          await loadUserProfile();
        }
      } else {
        setDocuments([]);
      }
    } catch (error: any) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleChangePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos');
        return;
      }
      Alert.alert('Change Profile Photo', 'Choose an option', [
        {
          text: 'Camera',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 0.8,
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
              allowsEditing: false,
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              await uploadProfilePhoto(result.assets[0].uri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } catch (error: any) {
      showSnackbar({ message: error.message || 'Failed to open image picker', type: 'error' });
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      const response = await userApi.uploadPhoto({
        uri,
        type: 'image/jpeg',
        name: `profile_photo_${Date.now()}.jpg`,
      });
      if (response.success && response.data?.profilePhoto) {
        setUser((prev: any) => ({ ...prev, profilePhoto: response.data.profilePhoto }));
        Alert.alert('Success', 'Profile photo updated successfully!');
      } else {
        Alert.alert('Upload Failed', response.error || 'Failed to upload profile photo');
      }
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const getDocStatusStyle = (status: string) => {
    if (status === 'verified') return { bg: '#4CAF50' + '15', color: '#4CAF50', label: 'Verified' };
    if (status === 'pending') return { bg: '#FF9800' + '15', color: '#FF9800', label: 'Pending' };
    return { bg: '#F44336' + '15', color: '#F44336', label: 'Rejected' };
  };

  const getDocLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      aadhar_front: 'Aadhaar Card',
      aadhar_back: 'Aadhaar Card',
      driving_license_front: 'Driving License',
      driving_license_back: 'Driving License',
      vehicle_registration: 'Registration Certificate (RC)',
      vehicle_insurance: 'Insurance Certificate',
      vehicle_pollution: 'Pollution Certificate (PUC)',
      taxi_service_papers: 'Taxi Service Papers',
      user_photo: 'User Photo',
    };
    return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // ── Loading State ──
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ImageBackground
          source={require('../../../assets/forlok_profile_banner_blue_bg_v1.png')}
          style={styles.headerImage}
          resizeMode="cover"
        >
          <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
          <BlurView intensity={40} style={styles.blurContainer}>
            <View style={styles.headerNav}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
                <ArrowLeft size={22} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.navTitle}>Profile</Text>
              <View style={styles.navPlaceholder} />
            </View>
          </BlurView>
        </ImageBackground>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingLabel, { color: theme.colors.textSecondary }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingWrap}>
          <Text style={[styles.loadingLabel, { color: theme.colors.textSecondary }]}>No profile data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const menuItems = [
    { icon: Wallet, label: 'Wallet', screen: 'Wallet', color: theme.colors.primary },
    { icon: Coins, label: 'Earn Coins', screen: 'EarnCoins', color: '#F5A623' },
    { icon: MessageSquare, label: 'My Reviews', screen: 'Reviews', params: { userId: user?.userId, userName: user?.name }, color: theme.colors.primary },
    { icon: Car, label: 'My Offers', screen: 'MyOffers', color: theme.colors.primary },
    { icon: Shield, label: 'Help & Support', screen: 'HelpSupport', color: theme.colors.primary },
    { icon: Info, label: 'About', screen: 'About', color: theme.colors.primary },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Hero Header with Image ── */}
        <ImageBackground
          source={require('../../../assets/forlok_profile_banner_blue_bg_v1.png')}
          style={styles.headerImage}
          resizeMode="cover"
        >
          <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
          <BlurView intensity={40} style={styles.blurContainer}>
            <View style={styles.headerNav}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
                <ArrowLeft size={22} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.navTitle}>My Profile</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings' as never)}
                style={styles.navButton}
              >
                <Settings size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </BlurView>
        </ImageBackground>

        {/* ── Profile Card (overlapping header) ── */}
        <View style={[styles.profileCard, { backgroundColor: theme.colors.surface }]}>
          {/* Top row: Avatar + Name + Edit */}
          <View style={styles.profileTopRow}>
            <View style={styles.avatarWrap}>
              {user.profilePhoto ? (
                <Image
                  source={{ uri: user.profilePhoto }}
                  style={[styles.avatar, { borderColor: theme.colors.surface }]}
                  onError={() => {
                    const userPhotoDoc = documents.find((d: any) => d.type === 'user_photo' && d.url);
                    if (userPhotoDoc && userPhotoDoc.url && userPhotoDoc.url !== user.profilePhoto) {
                      setUser((prev: any) => ({ ...prev, profilePhoto: userPhotoDoc.url }));
                    }
                  }}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { borderColor: theme.colors.surface, backgroundColor: theme.colors.primary + '15' }]}>
                  <User size={28} color={theme.colors.primary} />
                </View>
              )}
              <TouchableOpacity
                style={[styles.editAvatarBtn, { backgroundColor: theme.colors.primary, borderColor: theme.colors.surface }]}
                onPress={handleChangePhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size={10} color="#FFF" />
                ) : (
                  <Edit size={10} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.profileNameSection}>
              <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>{user.name || 'User'}</Text>
              <Text style={[styles.userIdText, { color: theme.colors.textSecondary }]}>#{user.userId || 'N/A'}</Text>
              <View style={styles.badgesRow}>
                <View style={[styles.profileBadge, { backgroundColor: user.isVerified ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Shield size={11} color={user.isVerified ? '#4CAF50' : '#FF9800'} fill={user.isVerified ? '#4CAF50' : 'none'} />
                  <Text style={[styles.profileBadgeText, { color: user.isVerified ? '#4CAF50' : '#FF9800' }]}>
                    {user.isVerified ? 'Verified' : 'Unverified'}
                  </Text>
                </View>
                <View style={[styles.profileBadge, { backgroundColor: '#FFF8E1' }]}>
                  <Star size={11} color="#FFB800" fill="#FFB800" />
                  <Text style={[styles.profileBadgeText, { color: '#8B6914' }]}>
                    {Number(user.rating || 0).toFixed(1)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={[styles.quickStats, { borderTopColor: theme.colors.border }]}>
            {[
              { value: user.totalTrips || 0, label: 'Trips', color: theme.colors.text },
              { value: Number(user.rating || 0).toFixed(1), label: 'Rating', color: theme.colors.text },
              { value: `₹${user.totalEarnings || 0}`, label: 'Earned', color: theme.colors.text },
              { value: Math.round((user.totalTrips || 0) * 5 * 0.12), label: 'kg CO₂', color: '#2E7D32' },
            ].map((stat, i, arr) => (
              <React.Fragment key={stat.label}>
                <View style={styles.quickStatItem}>
                  <Text style={[styles.quickStatValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={[styles.quickStatLabel, { color: theme.colors.textSecondary }]}>{stat.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={[styles.quickStatDivider, { backgroundColor: theme.colors.border }]} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── My Badges ── */}
        {user?.badges && user.badges.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Trophy size={18} color="#F5A623" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>My Badges</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
              {user.badges.map((badge: any, idx: number) => (
                <View key={idx} style={styles.badgeChip}>
                  <Star size={13} color="#F5A623" fill="#F5A623" />
                  <Text style={styles.badgeChipText}>{badge.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Personal Information ── */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <User size={16} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('profile.personalInformation')}</Text>
          </View>
          {[
            { icon: Phone, label: t('common.phone'), value: user.phone || 'N/A' },
            ...(user.dateOfBirth ? [{ icon: Cake, label: t('common.dateOfBirth'), value: new Date(user.dateOfBirth).toLocaleDateString() }] : []),
            ...(user.gender ? [{ icon: User, label: t('common.gender'), value: user.gender }] : []),
          ].map((item, idx, arr) => (
            <View key={idx} style={[styles.infoRow, idx < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}>
              <View style={[styles.infoIcon, { backgroundColor: theme.colors.primary + '0D' }]}>
                <item.icon size={14} color={theme.colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]} numberOfLines={1}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Documents ── */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <FileText size={16} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('profile.documents')}</Text>
          </View>
          {documentsLoading ? (
            <View style={styles.miniLoadingWrap}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingLabel, { color: theme.colors.textSecondary, fontSize: normalize(12) }]}>Loading documents...</Text>
            </View>
          ) : documents.length > 0 ? (
            <>
              {/* User Photo */}
              {documents
                .filter((doc: any) => doc.url && doc.type === 'user_photo' && !doc.url.toLowerCase().endsWith('.pdf'))
                .map((doc: any) => {
                  const s = getDocStatusStyle(doc.status);
                  return (
                    <View key={doc.documentId || doc._id} style={[styles.docItem, { borderBottomColor: theme.colors.border }]}>
                      <View style={styles.docThumbWrap}>
                        <Image source={{ uri: doc.url }} style={styles.docThumb} />
                      </View>
                      <View style={styles.docInfo}>
                        <Text style={[styles.docName, { color: theme.colors.text }]}>User Photo</Text>
                        <View style={[styles.docStatusPill, { backgroundColor: s.bg }]}>
                          <Text style={[styles.docStatusText, { color: s.color }]}>{s.label}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

              {/* Vehicle Documents Section */}
              {documents.some((doc: any) =>
                ['vehicle_registration', 'vehicle_insurance', 'vehicle_pollution', 'taxi_service_papers'].includes(doc.type)
              ) && (
                <View style={[styles.docSubSection, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.docSubTitle, { color: theme.colors.textSecondary }]}>Vehicle Documents</Text>
                  {documents
                    .filter((doc: any) =>
                      ['vehicle_registration', 'vehicle_insurance', 'vehicle_pollution', 'taxi_service_papers'].includes(doc.type)
                    )
                    .map((doc: any) => {
                      const isPDF = doc.url && doc.url.toLowerCase().endsWith('.pdf');
                      const isImage = doc.url && !isPDF;
                      const s = getDocStatusStyle(doc.status);
                      return (
                        <TouchableOpacity
                          key={doc.documentId || doc._id}
                          style={[styles.docItem, { borderBottomColor: theme.colors.border }]}
                          onPress={() => doc.url && Linking.openURL(doc.url).catch(() => showSnackbar({ message: 'Could not open document', type: 'error' }))}
                        >
                          {isImage ? (
                            <View style={styles.docThumbWrap}>
                              <Image source={{ uri: doc.url }} style={styles.docThumb} />
                            </View>
                          ) : (
                            <View style={[styles.docIconWrap, { backgroundColor: theme.colors.primary + '10' }]}>
                              {doc.status === 'verified' ? (
                                <CheckCircle size={18} color="#4CAF50" />
                              ) : doc.status === 'pending' ? (
                                <ActivityIndicator size={16} color="#FF9800" />
                              ) : (
                                <FileText size={18} color={theme.colors.primary} />
                              )}
                            </View>
                          )}
                          <View style={styles.docInfo}>
                            <Text style={[styles.docName, { color: theme.colors.text }]}>
                              {getDocLabel(doc.type)}{isPDF ? ' (PDF)' : ''}
                            </Text>
                            <View style={[styles.docStatusPill, { backgroundColor: s.bg }]}>
                              <Text style={[styles.docStatusText, { color: s.color }]}>{s.label}</Text>
                            </View>
                          </View>
                          {doc.url && <ChevronRight size={18} color={theme.colors.textSecondary} />}
                        </TouchableOpacity>
                      );
                    })}
                </View>
              )}

              {/* Other documents (Aadhaar, DL, etc.) */}
              {documents
                .filter((doc: any) => {
                  const businessDocTypes = ['business_license', 'gst_certificate', 'company_registration'];
                  if (businessDocTypes.includes(doc.type)) return false;
                  if (doc.type === 'user_photo' && doc.url && !doc.url.toLowerCase().endsWith('.pdf')) return false;
                  const vehicleDocTypes = ['vehicle_registration', 'vehicle_insurance', 'vehicle_pollution', 'taxi_service_papers'];
                  if (vehicleDocTypes.includes(doc.type)) return false;
                  return true;
                })
                .map((doc: any) => {
                  const isPDF = doc.url && doc.url.toLowerCase().endsWith('.pdf');
                  const s = getDocStatusStyle(doc.status);
                  return (
                    <TouchableOpacity
                      key={doc.documentId || doc._id}
                      style={[styles.docItem, { borderBottomColor: theme.colors.border }]}
                      onPress={() => doc.url && Linking.openURL(doc.url).catch(() => showSnackbar({ message: 'Could not open document', type: 'error' }))}
                    >
                      <View style={[styles.docIconWrap, { backgroundColor: theme.colors.primary + '10' }]}>
                        {doc.status === 'verified' ? (
                          <CheckCircle size={18} color="#4CAF50" />
                        ) : doc.status === 'pending' ? (
                          <ActivityIndicator size={16} color="#FF9800" />
                        ) : (
                          <FileText size={18} color={isPDF ? theme.colors.primary : '#F44336'} />
                        )}
                      </View>
                      <View style={styles.docInfo}>
                        <Text style={[styles.docName, { color: theme.colors.text }]}>
                          {getDocLabel(doc.type)}{isPDF ? ' (PDF)' : ''}
                        </Text>
                        <View style={[styles.docStatusPill, { backgroundColor: s.bg }]}>
                          <Text style={[styles.docStatusText, { color: s.color }]}>{s.label}</Text>
                        </View>
                      </View>
                      {doc.url && <ChevronRight size={18} color={theme.colors.textSecondary} />}
                    </TouchableOpacity>
                  );
                })}
            </>
          ) : (
            <View style={styles.emptyState}>
              <FileText size={36} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No documents uploaded yet</Text>
            </View>
          )}
        </View>

        {/* ── Vehicles ── */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Car size={16} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('profile.myVehicles')}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddVehicle' as never)}
              style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {loadingVehicles ? (
            <View style={styles.miniLoadingWrap}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : vehicles.length > 0 ? (
            vehicles.map((vehicle: any, index: number) => (
              <View key={vehicle.vehicleId || vehicle._id || index} style={[styles.vehicleItem, { backgroundColor: theme.colors.background }]}>
                <View style={[styles.vehicleIconWrap, { backgroundColor: theme.colors.primary + '12' }]}>
                  {vehicle.type?.toLowerCase() === 'car' ? (
                    <Car size={22} color={theme.colors.primary} />
                  ) : (
                    <Bike size={22} color={theme.colors.primary} />
                  )}
                </View>
                <View style={styles.vehicleInfo}>
                  <Text style={[styles.vehicleName, { color: theme.colors.text }]}>
                    {vehicle.brand || 'Unknown'} {vehicle.vehicleModel || vehicle.model || ''}
                  </Text>
                  <Text style={[styles.vehicleNumber, { color: theme.colors.textSecondary }]}>{vehicle.number || 'N/A'}</Text>
                  {vehicle.seats && (
                    <Text style={[styles.vehicleDetails, { color: theme.colors.textSecondary }]}>
                      {vehicle.seats} seats  {vehicle.fuelType || 'N/A'}
                    </Text>
                  )}
                </View>
                <View style={styles.vehicleActions}>
                  <TouchableOpacity
                    style={[styles.vehicleActionBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                    onPress={() => navigation.navigate('EditVehicle' as never, { vehicleId: vehicle.vehicleId } as never)}
                  >
                    <Edit size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.vehicleActionBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                    onPress={() => navigation.navigate('VehicleDetails' as never, { vehicleId: vehicle.vehicleId } as never)}
                  >
                    <Eye size={16} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Car size={36} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No vehicles added yet</Text>
              <TouchableOpacity
                style={[styles.addVehicleBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('AddVehicle' as never)}
              >
                <Text style={styles.addVehicleBtnText}>+ Add Vehicle</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Quick Menu ── */}
        <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, paddingHorizontal: 0, paddingBottom: normalize(4) }]}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.menuItem, idx < menuItems.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border + '50' }]}
              onPress={() => navigation.navigate(item.screen as never, (item as any).params as never)}
              activeOpacity={0.6}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: item.color + '10' }]}>
                <item.icon size={18} color={item.color} />
              </View>
              <Text style={[styles.menuLabel, { color: theme.colors.text }]}>{item.label}</Text>
              <ChevronRight size={16} color={theme.colors.textSecondary + '80'} />
            </TouchableOpacity>
          ))}
          {/* Logout */}
          <TouchableOpacity style={[styles.menuItem, styles.logoutMenuItem]} onPress={handleLogout} activeOpacity={0.6}>
            <View style={[styles.menuIconWrap, { backgroundColor: '#F44336' + '0D' }]}>
              <LogOut size={18} color="#F44336" />
            </View>
            <Text style={[styles.menuLabel, { color: '#F44336', fontWeight: '600' }]}>{t('profile.logout')}</Text>
            <ChevronRight size={16} color="#F44336" />
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: SPACING.xl }} />
      </ScrollView>
      {/* ── Logout Modal ── */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!loggingOut) setShowLogoutModal(false);
        }}
      >
        <View style={styles.logoutOverlay}>
          <View style={[styles.logoutModal, { backgroundColor: theme.colors.surface }]}>
            <LottieView
              ref={lottieRef}
              source={require('../../../assets/videos/logout.json')}
              style={styles.logoutLottie}
              autoPlay={true}
              loop={true}
            />

            {loggingOut ? (
              <>
                <Text style={[styles.logoutTitle, { color: theme.colors.text }]}>Logging out...</Text>
                <Text style={[styles.logoutSubtitle, { color: theme.colors.textSecondary }]}>See you soon!</Text>
              </>
            ) : (
              <>
                <Text style={[styles.logoutTitle, { color: theme.colors.text }]}>Logout</Text>
                <Text style={[styles.logoutSubtitle, { color: theme.colors.textSecondary }]}>
                  Are you sure you want to logout?
                </Text>
                <View style={styles.logoutActions}>
                  <TouchableOpacity
                    style={[styles.logoutCancelBtn, { borderColor: theme.colors.border }]}
                    onPress={() => setShowLogoutModal(false)}
                  >
                    <Text style={[styles.logoutCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.logoutConfirmBtn}
                    onPress={confirmLogout}
                  >
                    <LogOut size={16} color="#FFF" />
                    <Text style={styles.logoutConfirmText}>Yes, Logout</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Header ──
  headerImage: {
    width: '100%',
    height: hp(14),
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.75,
  },
  blurContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },
  navButton: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(17),
    fontWeight: '700',
    color: '#FFF',
  },
  navPlaceholder: {
    width: normalize(36),
  },

  // ── Scroll ──
  scrollContent: {
    paddingBottom: SPACING.md,
  },

  // ── Profile Card ──
  profileCard: {
    borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.md,
    marginTop: -normalize(28),
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 0,
    ...SHADOWS.md,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(14),
    paddingBottom: normalize(12),
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: normalize(24),
    height: normalize(24),
    borderRadius: normalize(12),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    ...SHADOWS.sm,
  },
  profileNameSection: {
    flex: 1,
  },
  userName: {
    fontFamily: FONTS.regular,
    fontSize: normalize(18),
    fontWeight: '700',
  },
  userIdText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    marginTop: normalize(1),
    marginBottom: normalize(6),
  },

  // ── Badges Row ──
  badgesRow: {
    flexDirection: 'row',
    gap: normalize(6),
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(3),
    borderRadius: BORDER_RADIUS.round,
  },
  profileBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    fontWeight: '600',
  },

  // ── Quick Stats ──
  quickStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: normalize(12),
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontFamily: FONTS.regular,
    fontSize: normalize(16),
    fontWeight: '700',
  },
  quickStatLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: '70%',
    alignSelf: 'center',
  },

  // ── Section Card ──
  sectionCard: {
    borderRadius: normalize(14),
    marginHorizontal: SPACING.md,
    marginTop: normalize(10),
    padding: normalize(14),
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
    marginBottom: normalize(10),
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(15),
    fontWeight: '700',
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: normalize(8),
  },

  // ── Badges Scroll ──
  badgesScroll: {
    marginTop: normalize(4),
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF8E7',
    borderRadius: BORDER_RADIUS.round,
    paddingVertical: normalize(5),
    paddingHorizontal: normalize(12),
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: '#F5A623' + '30',
  },
  badgeChipText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: '#8B5E00',
    fontWeight: '600',
  },

  // ── Personal Info ──
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: normalize(10),
    gap: normalize(10),
  },
  infoIcon: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    marginBottom: normalize(1),
  },
  infoValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },

  // ── Documents ──
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: normalize(10),
    gap: SPACING.sm,
    borderBottomWidth: 1,
  },
  docThumbWrap: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  docThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  docIconWrap: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    marginBottom: normalize(3),
  },
  docStatusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(2),
    borderRadius: BORDER_RADIUS.round,
  },
  docStatusText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    fontWeight: '600',
  },
  docSubSection: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  docSubTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: normalize(0.5),
    marginBottom: SPACING.xs,
  },

  // ── Vehicles ──
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  vehicleIconWrap: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  vehicleNumber: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    marginTop: 1,
  },
  vehicleDetails: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    marginTop: 1,
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: normalize(6),
  },
  vehicleActionBtn: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  addBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: normalize(5),
    borderRadius: BORDER_RADIUS.round,
  },
  addBtnText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: '#FFF',
    fontWeight: '700',
  },
  addVehicleBtn: {
    marginTop: SPACING.sm,
    paddingVertical: normalize(10),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  addVehicleBtnText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#FFF',
    fontWeight: '700',
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.xs,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
  },

  // ── Menu ──
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: normalize(11),
    paddingHorizontal: normalize(14),
    gap: normalize(10),
  },
  menuIconWrap: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    flex: 1,
  },
  logoutMenuItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F44336' + '20',
    marginTop: normalize(2),
  },

  // ── Logout Modal ──
  logoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  logoutModal: {
    width: '100%',
    maxWidth: wp(90),
    borderRadius: normalize(24),
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  logoutLottie: {
    width: normalize(150),
    height: normalize(150),
    marginBottom: SPACING.sm,
  },
  logoutTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(20),
    fontWeight: '700',
    marginBottom: normalize(6),
    textAlign: 'center',
  },
  logoutSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    textAlign: 'center',
    lineHeight: normalize(20),
    marginBottom: SPACING.lg,
  },
  logoutActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    paddingVertical: normalize(14),
    borderRadius: normalize(14),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutCancelText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(15),
    fontWeight: '600',
  },
  logoutConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: normalize(14),
    borderRadius: normalize(14),
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(6),
  },
  logoutConfirmText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(15),
    fontWeight: '700',
    color: '#FFF',
  },

  // ── Loading ──
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
  },
  miniLoadingWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
});

export default ProfileScreen;
