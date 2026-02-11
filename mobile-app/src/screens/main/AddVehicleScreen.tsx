import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Camera, Car, Bike, CheckCircle, X, FileText } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';
import { vehicleApi, rentalApi, uploadFile } from '@utils/apiClient';
import { API_CONFIG } from '../../config/api';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AddVehicleScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  
  // Basic Info
  const [vehicleType, setVehicleType] = useState<'car' | 'bike' | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number | null>(null);
  const [color, setColor] = useState('');
  
  // Vehicle Specs
  const [seats, setSeats] = useState<number>(5);
  const [fuelType, setFuelType] = useState<'Petrol' | 'Diesel' | 'Electric' | 'CNG' | ''>('');
  const [transmission, setTransmission] = useState<'Manual' | 'Automatic' | ''>('');
  const [insuranceExpiry, setInsuranceExpiry] = useState<Date | null>(null);
  const [showInsuranceDatePicker, setShowInsuranceDatePicker] = useState(false);
  
  // Vehicle Photos
  const [photoFront, setPhotoFront] = useState<string | null>(null);
  const [photoBack, setPhotoBack] = useState<string | null>(null);
  const [photoSide, setPhotoSide] = useState<string | null>(null);
  const [photoInterior, setPhotoInterior] = useState<string | null>(null);
  
  // Documents
  const [registrationCertificate, setRegistrationCertificate] = useState<string | null>(null);
  const [insurance, setInsurance] = useState<string | null>(null);
  const [pollutionCertificate, setPollutionCertificate] = useState<string | null>(null);
  const [taxiServicePapers, setTaxiServicePapers] = useState<string | null>(null);
  
  // Upload states
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userType, setUserType] = useState<'individual' | 'company'>('individual');
  
  // Suggested price
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);

  useEffect(() => {
    loadUserType();
  }, []);

  // Auto-set seats for bikes (bikes always have 2 seats)
  useEffect(() => {
    if (vehicleType === 'bike') {
      setSeats(2);
    }
  }, [vehicleType]);

  // Calculate suggested price when vehicle details change
  useEffect(() => {
    if (vehicleType && brand && seats && fuelType && transmission && year) {
      calculateSuggestedPrice();
    } else {
      setSuggestedPrice(null);
      setPriceBreakdown(null);
    }
  }, [vehicleType, brand, model, year, seats, fuelType, transmission]);

  const loadUserType = async () => {
    try {
      const userData = await AsyncStorage.getItem('@user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUserType(parsed.userType || 'individual');
        if (parsed.userType === 'company' && parsed.companyName) {
          setCompanyName(parsed.companyName);
        }
      }
    } catch (error) {
      console.error('Error loading user type:', error);
    }
  };

  const calculateSuggestedPrice = async () => {
    if (!vehicleType || !brand || !seats || !fuelType || !transmission) return;
    
    try {
      setCalculatingPrice(true);
      const response = await rentalApi.calculatePrice({
        vehicleType: vehicleType as 'car' | 'bike',
        brand,
        model: model || undefined,
        year: year || undefined,
        seats,
        fuelType: fuelType as 'Petrol' | 'Diesel' | 'Electric' | 'CNG',
        transmission: transmission as 'Manual' | 'Automatic',
      });

      if (response.success && response.data) {
        setSuggestedPrice(response.data.suggestedPrice);
        setPriceBreakdown(response.data.breakdown);
      }
    } catch (error: any) {
      console.error('Error calculating price:', error);
    } finally {
      setCalculatingPrice(false);
    }
  };

  const handleDocumentPicker = async (type: 'rc' | 'insurance' | 'puc' | 'taxi') => {
    try {
      Alert.alert(
        'Select Document',
        'Choose an option',
        [
          {
            text: 'Camera (Image)',
            onPress: async () => {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant camera permissions');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                await handleDocumentSelected(type, result.assets[0].uri, result.assets[0].mimeType || 'image/jpeg');
              }
            },
          },
          {
            text: 'Gallery (Image)',
            onPress: async () => {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant gallery permissions');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                await handleDocumentSelected(type, result.assets[0].uri, result.assets[0].mimeType || 'image/jpeg');
              }
            },
          },
          {
            text: 'Select PDF/Document',
            onPress: async () => {
              try {
                const result = await DocumentPicker.getDocumentAsync({
                  type: ['application/pdf', 'image/*'],
                  copyToCacheDirectory: true,
                });

                if (!result.canceled && result.assets && result.assets[0]) {
                  const uri = result.assets[0].uri;
                  const mimeType = result.assets[0].mimeType || 'application/pdf';
                  await handleDocumentSelected(type, uri, mimeType);
                }
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to pick document');
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open document picker');
    }
  };

  const handleDocumentSelected = async (type: string, uri: string, mimeType: string) => {
    try {
      setUploading(type);
      
      // Determine document type for upload
      let documentType: string;
      switch (type) {
        case 'rc':
          documentType = 'vehicle_registration';
          break;
        case 'insurance':
          documentType = 'vehicle_insurance';
          break;
        case 'puc':
          documentType = 'vehicle_pollution';
          break;
        case 'taxi':
          documentType = 'taxi_service_papers';
          break;
        default:
          documentType = 'vehicle_document';
      }
      
      // Determine file extension and name
      const isPDF = mimeType === 'application/pdf' || uri.toLowerCase().endsWith('.pdf');
      const extension = isPDF ? 'pdf' : (mimeType.includes('image') ? 'jpg' : 'pdf');
      const fileName = uri.split('/').pop() || `vehicle_${type}_${Date.now()}.${extension}`;
      
      const file = {
        uri,
        type: mimeType,
        name: fileName,
      };
      
      // Pass type as query parameter (backend expects it in query, not form data)
      const uploadEndpoint = `${API_CONFIG.ENDPOINTS.DOCUMENT.UPLOAD}?type=${encodeURIComponent(documentType)}`;
      const response = await uploadFile(uploadEndpoint, file);
      
      if (response.success && response.data?.url) {
        const documentUrl = response.data.url;
        
        switch (type) {
          case 'rc':
            setRegistrationCertificate(documentUrl);
            break;
          case 'insurance':
            setInsurance(documentUrl);
            break;
          case 'puc':
            setPollutionCertificate(documentUrl);
            break;
          case 'taxi':
            setTaxiServicePapers(documentUrl);
            break;
        }
      } else {
        Alert.alert('Upload Failed', response.error || 'Failed to upload document');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveDocument = (type: string) => {
    switch (type) {
      case 'rc':
        setRegistrationCertificate(null);
        break;
      case 'insurance':
        setInsurance(null);
        break;
      case 'puc':
        setPollutionCertificate(null);
        break;
      case 'taxi':
        setTaxiServicePapers(null);
        break;
    }
  };

  const handlePhotoPicker = async (type: 'front' | 'back' | 'side' | 'interior') => {
    try {
      Alert.alert(
        'Select Photo',
        'Choose an option',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant camera permissions');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                aspect: [4, 3],
              });
              if (!result.canceled && result.assets[0]) {
                await handlePhotoUpload(type, result.assets[0].uri);
              }
            },
          },
          {
            text: 'Gallery',
            onPress: async () => {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant gallery permissions');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
                aspect: [4, 3],
              });
              if (!result.canceled && result.assets[0]) {
                await handlePhotoUpload(type, result.assets[0].uri);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open photo picker');
    }
  };

  const handlePhotoUpload = async (type: 'front' | 'back' | 'side' | 'interior', uri: string) => {
    try {
      setUploadingPhoto(type);
      
      // Determine document type for vehicle photos
      let documentType: string;
      switch (type) {
        case 'front':
          documentType = 'vehicle_front';
          break;
        case 'back':
          documentType = 'vehicle_back';
          break;
        case 'side':
          documentType = 'vehicle_side';
          break;
        case 'interior':
          documentType = 'vehicle_interior';
          break;
        default:
          documentType = 'vehicle_photo';
      }
      
      const file = {
        uri,
        type: 'image/jpeg',
        name: `vehicle_${type}_${Date.now()}.jpg`,
      };
      
      // Upload to Cloudinary via document upload endpoint
      const uploadEndpoint = `${API_CONFIG.ENDPOINTS.DOCUMENT.UPLOAD}?type=${encodeURIComponent(documentType)}`;
      const response = await uploadFile(uploadEndpoint, file);
      
      if (response.success && response.data?.url) {
        const photoUrl = response.data.url;
        
        switch (type) {
          case 'front':
            setPhotoFront(photoUrl);
            break;
          case 'back':
            setPhotoBack(photoUrl);
            break;
          case 'side':
            setPhotoSide(photoUrl);
            break;
          case 'interior':
            setPhotoInterior(photoUrl);
            break;
        }
      } else {
        Alert.alert('Upload Failed', response.error || 'Failed to upload photo');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleRemovePhoto = (type: 'front' | 'back' | 'side' | 'interior') => {
    switch (type) {
      case 'front':
        setPhotoFront(null);
        break;
      case 'back':
        setPhotoBack(null);
        break;
      case 'side':
        setPhotoSide(null);
        break;
      case 'interior':
        setPhotoInterior(null);
        break;
    }
  };

  const handleSave = async () => {
    // Validation
    if (!vehicleType) {
      Alert.alert('Validation Error', 'Please select vehicle type');
      return;
    }
    if (!vehicleNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter vehicle number');
      return;
    }
    if (userType === 'company' && !companyName.trim()) {
      Alert.alert('Validation Error', 'Please enter company name');
      return;
    }
    if (!brand.trim()) {
      Alert.alert('Validation Error', 'Please enter vehicle brand');
      return;
    }
    if (!model.trim()) {
      Alert.alert('Validation Error', 'Please enter vehicle model');
      return;
    }
    if (!year || year < 1900 || year > new Date().getFullYear() + 1) {
      Alert.alert('Validation Error', 'Please enter a valid year');
      return;
    }
    if (!seats || seats < 1) {
      Alert.alert('Validation Error', 'Please enter number of seats');
      return;
    }
    // Validate bike seats
    if (vehicleType === 'bike' && seats !== 2) {
      Alert.alert('Validation Error', 'Bikes must have exactly 2 seats');
      return;
    }
    if (!fuelType) {
      Alert.alert('Validation Error', 'Please select fuel type');
      return;
    }
    if (!transmission) {
      Alert.alert('Validation Error', 'Please select transmission type');
      return;
    }
    if (!registrationCertificate) {
      Alert.alert('Validation Error', 'Please upload Registration Certificate (RC)');
      return;
    }
    if (!insurance) {
      Alert.alert('Validation Error', 'Please upload Insurance Certificate');
      return;
    }
    if (!pollutionCertificate) {
      Alert.alert('Validation Error', 'Please upload Pollution Certificate (PUC)');
      return;
    }
    if (!insuranceExpiry) {
      Alert.alert('Validation Error', 'Please select insurance expiry date');
      return;
    }

    try {
      setSaving(true);

      // Get companyId if company user
      let companyId: string | undefined;
      if (userType === 'company') {
        try {
          const companyResponse = await companyApi.getProfile();
          if (companyResponse.success && companyResponse.data?.companyId) {
            companyId = companyResponse.data.companyId;
          } else {
            // Fallback to AsyncStorage
            const userData = await AsyncStorage.getItem('@user_data');
            if (userData) {
              const parsed = JSON.parse(userData);
              companyId = parsed.companyId;
            }
          }
        } catch (error) {
          console.error('Error fetching company profile:', error);
          // Fallback to AsyncStorage
          const userData = await AsyncStorage.getItem('@user_data');
          if (userData) {
            const parsed = JSON.parse(userData);
            companyId = parsed.companyId;
          }
        }
      }

      const vehicleData: any = {
        type: vehicleType,
        brand: brand.trim(),
        model: model.trim(),
        year,
        color: color.trim() || undefined,
        number: vehicleNumber.trim().toUpperCase(),
        seats,
        fuelType,
        transmission,
        insuranceExpiry: insuranceExpiry.toISOString(),
        photos: {
          front: photoFront || undefined,
          back: photoBack || undefined,
          side: photoSide || undefined,
          interior: photoInterior || undefined,
        },
        documents: {
          registrationCertificate,
          insurance,
          pollutionCertificate,
          taxiServicePapers: taxiServicePapers || undefined,
        },
      };

      if (userType === 'company' && companyId) {
        vehicleData.companyId = companyId;
      }

      const response = await vehicleApi.createVehicle(vehicleData);

      if (response.success) {
        Alert.alert(
          'Success',
          'Vehicle added successfully!',
          [
            {
              text: 'Add Another',
              onPress: () => {
                // Reset form
                setVehicleType(null);
                setVehicleNumber('');
                setBrand('');
                setModel('');
                setYear(null);
                setColor('');
        setSeats(5);
        setFuelType('');
        setTransmission('');
        setInsuranceExpiry(null);
        setPhotoFront(null);
        setPhotoBack(null);
        setPhotoSide(null);
        setPhotoInterior(null);
        setRegistrationCertificate(null);
                setInsurance(null);
        setPollutionCertificate(null);
        setTaxiServicePapers(null);
                setSuggestedPrice(null);
                setPriceBreakdown(null);
              },
            },
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to add vehicle');
      }
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      Alert.alert('Error', error.message || 'Failed to add vehicle');
    } finally {
      setSaving(false);
    }
  };

  // Generate year options (last 20 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 20 }, (_, i) => currentYear - i);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('addVehicle.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Vehicle Type */}
          <View style={styles.vehicleTypeContainer}>
            <Text style={styles.label}>{t('addVehicle.vehicleType')} *</Text>
            <View style={styles.vehicleTypeOptions}>
              <TouchableOpacity
                style={[
                  styles.vehicleTypeButton,
                  vehicleType === 'car' && styles.vehicleTypeSelected,
                ]}
                onPress={() => {
                  setVehicleType('car');
                  setSeats(5); // Reset to default
                }}
              >
                <Car size={24} color={vehicleType === 'car' ? COLORS.primary : COLORS.textSecondary} />
                <Text
                  style={[
                    styles.vehicleTypeText,
                    vehicleType === 'car' && styles.vehicleTypeTextSelected,
                  ]}
                >
                  {t('dashboard.car')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.vehicleTypeButton,
                  vehicleType === 'bike' && styles.vehicleTypeSelected,
                ]}
                onPress={() => {
                  setVehicleType('bike');
                  setSeats(2); // Bikes always have 2 seats
                }}
              >
                <Bike size={24} color={vehicleType === 'bike' ? COLORS.primary : COLORS.textSecondary} />
                <Text
                  style={[
                    styles.vehicleTypeText,
                    vehicleType === 'bike' && styles.vehicleTypeTextSelected,
                  ]}
                >
                  {t('dashboard.bike')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Basic Information */}
          <Input
            label={t('addVehicle.vehicleNumber')}
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            placeholder="e.g., AP 12 AB 1234"
            containerStyle={styles.input}
            autoCapitalize="characters"
          />

          {userType === 'company' && (
          <Input
            label={t('addVehicle.companyName')}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder={t('addVehicle.selectFromDropdown')}
              containerStyle={styles.input}
            />
          )}

          <Input
            label="Brand *"
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g., Honda, Maruti, Hyundai"
            containerStyle={styles.input}
          />

          <Input
            label="Model *"
            value={model}
            onChangeText={setModel}
            placeholder="e.g., City, Swift, Creta"
            containerStyle={styles.input}
          />

          {/* Year Picker */}
          <View style={styles.input}>
            <Text style={styles.label}>Year of Manufacture *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
              {yearOptions.map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.yearButton, year === y && styles.yearButtonSelected]}
                  onPress={() => setYear(y)}
                >
                  <Text style={[styles.yearText, year === y && styles.yearTextSelected]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Input
            label="Color"
            value={color}
            onChangeText={setColor}
            placeholder="e.g., White, Black, Red"
            containerStyle={styles.input}
          />

          {/* Vehicle Specs */}
          <View style={styles.input}>
            <Text style={styles.label}>Number of Seats *</Text>
            {vehicleType === 'bike' ? (
              <View style={styles.seatsContainer}>
                <View style={[styles.seatButton, styles.seatButtonSelected, styles.seatButtonDisabled]}>
                  <Text style={[styles.seatText, styles.seatTextSelected]}>2</Text>
                </View>
                <Text style={styles.bikeSeatsNote}>Bikes have 2 seats (rider + pillion)</Text>
              </View>
            ) : (
              <View style={styles.seatsContainer}>
                {[2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.seatButton, seats === s && styles.seatButtonSelected]}
                    onPress={() => setSeats(s)}
                  >
                    <Text style={[styles.seatText, seats === s && styles.seatTextSelected]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Fuel Type */}
          <View style={styles.input}>
            <Text style={styles.label}>Fuel Type *</Text>
            <View style={styles.optionsRow}>
              {['Petrol', 'Diesel', 'Electric', 'CNG'].map((fuel) => (
                <TouchableOpacity
                  key={fuel}
                  style={[styles.optionButton, fuelType === fuel && styles.optionButtonSelected]}
                  onPress={() => setFuelType(fuel as any)}
                >
                  <Text style={[styles.optionText, fuelType === fuel && styles.optionTextSelected]}>
                    {fuel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Transmission */}
          <View style={styles.input}>
            <Text style={styles.label}>Transmission *</Text>
            {vehicleType === 'bike' ? (
              <View>
                <View style={styles.optionsRow}>
                  {['Manual', 'Automatic'].map((trans) => (
                    <TouchableOpacity
                      key={trans}
                      style={[styles.optionButton, transmission === trans && styles.optionButtonSelected]}
                      onPress={() => setTransmission(trans as any)}
                    >
                      <Text style={[styles.optionText, transmission === trans && styles.optionTextSelected]}>
                        {trans === 'Manual' ? 'Gear Bike' : 'Scooter/CVT'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.bikeTransmissionNote}>
                  Manual = Gear bikes | Automatic = Scooters/CVT
                </Text>
              </View>
            ) : (
              <View style={styles.optionsRow}>
                {['Manual', 'Automatic'].map((trans) => (
                  <TouchableOpacity
                    key={trans}
                    style={[styles.optionButton, transmission === trans && styles.optionButtonSelected]}
                    onPress={() => setTransmission(trans as any)}
                  >
                    <Text style={[styles.optionText, transmission === trans && styles.optionTextSelected]}>
                      {trans}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Insurance Expiry */}
          <TouchableOpacity onPress={() => setShowInsuranceDatePicker(true)} style={styles.input}>
            <Text style={styles.label}>Insurance Expiry Date *</Text>
            <View style={styles.dateInput}>
              <Text style={[styles.dateText, !insuranceExpiry && styles.datePlaceholder]}>
                {insuranceExpiry
                  ? insuranceExpiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Select date'}
              </Text>
            </View>
          </TouchableOpacity>
          {showInsuranceDatePicker && (
            <DateTimePicker
              value={insuranceExpiry || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowInsuranceDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setInsuranceExpiry(selectedDate);
                }
              }}
              minimumDate={new Date()}
            />
          )}

          {/* Suggested Price Card */}
          {suggestedPrice && priceBreakdown && (
            <Card style={styles.priceCard}>
              <Text style={styles.priceTitle}>💰 Suggested Rental Price</Text>
              <Text style={styles.priceAmount}>₹{suggestedPrice}/hour</Text>
              <View style={styles.priceBreakdown}>
                <Text style={styles.breakdownTitle}>Price Breakdown:</Text>
                {priceBreakdown && (
                  <>
                    <Text style={styles.breakdownText}>
                      Base: ₹{priceBreakdown.basePrice} × {priceBreakdown.ageMultiplier.toFixed(2)} (age) ×{' '}
                      {priceBreakdown.transmissionMultiplier.toFixed(2)} (transmission) ×{' '}
                      {priceBreakdown.fuelMultiplier.toFixed(2)} (fuel) ×{' '}
                      {priceBreakdown.seatsMultiplier.toFixed(2)} (seats)
                    </Text>
                    <Text style={styles.breakdownText}>
                      = ₹{suggestedPrice}/hour
                    </Text>
                  </>
                )}
              </View>
            </Card>
          )}

          {/* Vehicle Photos */}
          <Card style={styles.documentsCard}>
            <Text style={styles.documentsTitle}>Vehicle Photos</Text>
            <View style={styles.photosGrid}>
              {[
                { key: 'front', label: 'Front View', photo: photoFront },
                { key: 'back', label: 'Back View', photo: photoBack },
                { key: 'side', label: 'Side View', photo: photoSide },
                { key: 'interior', label: 'Interior', photo: photoInterior },
              ].map(({ key, label, photo }) => (
                <View key={key} style={styles.photoItem}>
                  <Text style={styles.photoLabel}>{label}</Text>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={() => (photo ? handleRemovePhoto(key as any) : handlePhotoPicker(key as any))}
                    disabled={uploadingPhoto === key}
                  >
                    {uploadingPhoto === key ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : photo ? (
                      <View style={styles.photoPreview}>
                        <Image source={{ uri: photo }} style={styles.photoImage} />
                        <View style={styles.photoOverlay}>
                          <X size={20} color={COLORS.white} />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Camera size={24} color={COLORS.primary} />
                        <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </Card>

          {/* Documents */}
          <Card style={styles.documentsCard}>
            <Text style={styles.documentsTitle}>{t('addVehicle.documents')} *</Text>
            {[
              { key: 'rc', label: 'Registration Certificate (RC)', photo: registrationCertificate },
              { key: 'insurance', label: 'Insurance Certificate', photo: insurance },
              { key: 'puc', label: 'Pollution Certificate (PUC)', photo: pollutionCertificate },
              { key: 'taxi', label: 'Taxi Service Papers', photo: taxiServicePapers, optional: true },
            ].map(({ key, label, photo, optional }) => (
              <View key={key} style={styles.documentRow}>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentLabel}>
                    {label} {optional && '(Optional)'}
                  </Text>
                  {photo && <CheckCircle size={16} color={COLORS.success} />}
            </View>
                <TouchableOpacity
                  style={styles.documentButton}
                  onPress={() => (photo ? handleRemoveDocument(key) : handleDocumentPicker(key as any))}
                  disabled={uploading === key}
                >
                  {uploading === key ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : photo ? (
                    <X size={20} color={COLORS.error} />
                  ) : (
                    <FileText size={20} color={COLORS.primary} />
                  )}
              </TouchableOpacity>
            </View>
            ))}
          </Card>

          <Button
            title={saving ? 'Saving...' : t('common.save')}
            onPress={handleSave}
            variant="primary"
            size="large"
            style={styles.saveButton}
            disabled={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  keyboardView: { flex: 1 },
  scrollContent: { padding: SPACING.md },
  vehicleTypeContainer: { marginBottom: SPACING.md },
  label: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  vehicleTypeOptions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  vehicleTypeButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  vehicleTypeSelected: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  vehicleTypeText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  vehicleTypeTextSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  input: { marginBottom: SPACING.md },
  yearScroll: {
    marginTop: SPACING.xs,
  },
  yearButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  yearButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  yearText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  yearTextSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  seatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  seatButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    minWidth: 50,
    alignItems: 'center',
  },
  seatButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  seatText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  seatTextSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  optionButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  optionTextSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  dateInput: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginTop: SPACING.xs,
  },
  dateText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  datePlaceholder: {
    color: COLORS.textSecondary,
  },
  priceCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  priceTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  priceAmount: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  priceBreakdown: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  breakdownTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  breakdownText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  documentsCard: { padding: SPACING.md, marginBottom: SPACING.md },
  documentsTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  documentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  documentLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    flex: 1,
  },
  documentButton: {
    padding: SPACING.sm,
  },
  saveButton: { marginTop: SPACING.md, marginBottom: SPACING.xl },
  seatButtonDisabled: {
    opacity: 0.7,
  },
  bikeSeatsNote: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  bikeTransmissionNote: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  photoItem: {
    width: '47%',
  },
  photoLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  photoButton: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: SPACING.xs,
  },
  photoPlaceholderText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AddVehicleScreen;
