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
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Camera, X, FileText, Calendar, Shield, Fuel, Settings2, ChevronDown } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { normalize, wp, hp } from '@utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@components/common/Input';

import { useLanguage } from '@context/LanguageContext';
import { useSnackbar } from '@context/SnackbarContext';
import { vehicleApi, rentalApi, uploadFile, companyApi, masterDataApi, vehicleCatalogApi } from '@utils/apiClient';
import { API_CONFIG } from '../../config/api';
import { getUserErrorMessage } from '@utils/errorUtils';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VEHICLE_ACCENT = '#F99E3C';
const VEHICLE_ACCENT_DARK = '#D47B1B';

const VEHICLE_BRAND_MODELS: Record<'car' | 'bike' | 'scooty', Record<string, string[]>> = {
  car: {
    'Maruti Suzuki': ['Alto K10', 'Swift', 'Baleno', 'WagonR', 'WagonR CNG', 'Dzire', 'Brezza'],
    Hyundai: ['i10', 'i20', 'Venue', 'Creta', 'Verna', 'Verna Facelift'],
    Tata: ['Tiago', 'Altroz', 'Tigor', 'Nexon', 'Punch', 'Harrier'],
    'Tata Motors': ['Tiago', 'Altroz', 'Tigor', 'Nexon', 'Punch', 'Harrier'],
    Mahindra: ['XUV300', 'XUV700', 'Scorpio', 'Scorpio-N', 'Bolero', 'Thar'],
    Kia: ['Sonet', 'Seltos', 'Carens'],
    Toyota: ['Glanza', 'Innova', 'Innova Hycross', 'Fortuner'],
    Renault: ['Kwid', 'Kiger'],
    Nissan: ['Magnite'],
  },
  bike: {
    Honda: ['Shine', 'Shine 125', 'Unicorn', 'Hornet', 'CB350'],
    Hero: ['Splendor', 'Splendor Plus', 'HF Deluxe', 'Glamour', 'Xtreme'],
    'Hero MotoCorp': ['Splendor Plus', 'HF Deluxe', 'Glamour', 'Xtreme'],
    Bajaj: ['Pulsar', 'Pulsar 150', 'Platina', 'Dominar', 'Avenger', 'Freedom 125'],
    Yamaha: ['FZ', 'R15', 'MT-15', 'RayZR'],
    TVS: ['Apache', 'Apache RTR 200 4V', 'Raider', 'Sport', 'Ronin'],
    RoyalEnfield: ['Classic 350', 'Hunter 350', 'Bullet', 'Meteor', 'Himalayan 411'],
    'Royal Enfield': ['Classic 350', 'Hunter 350', 'Bullet', 'Meteor', 'Himalayan 411'],
    KTM: ['Duke 200'],
  },
  scooty: {
    Honda: ['Activa', 'Activa 6G', 'Dio', 'Aviator'],
    TVS: ['Jupiter', 'Jupiter 125', 'Ntorq', 'Ntorq 125', 'Scooty Zest', 'iQube ST (5.3kWh)'],
    Suzuki: ['Access 125', 'Burgman Street'],
    Yamaha: ['Fascino', 'RayZR'],
    Hero: ['Pleasure+', 'Destini 125'],
    Ola: ['S1 Air', 'S1 X', 'S1 Pro'],
    'Ola Electric': ['S1 Air', 'S1 X', 'S1 Pro'],
    Bajaj: ['Chetak Facelift'],
  },
};

const normalizeKey = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');

const AddVehicleScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { t } = useLanguage();
  const { showSnackbar } = useSnackbar();
  const editingVehicle = route.params?.vehicle;
  const isEditMode = !!editingVehicle;
  const editingVehicleId = editingVehicle?.vehicleId || editingVehicle?._id;
  
  // Basic Info
  const [vehicleType, setVehicleType] = useState<'car' | 'bike' | 'scooty' | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectionType, setSelectionType] = useState<'vehicleType' | 'brand' | 'model' | 'fuelType' | 'transmission' | 'year' | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [color, setColor] = useState('');
  
  // Vehicle Specs
  const [seats, setSeats] = useState<number>(5);
  const [fuelType, setFuelType] = useState<string>('');
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
  const [masterBrands, setMasterBrands] = useState<any[]>([]);
  const [masterModels, setMasterModels] = useState<any[]>([]);
  const [masterFuelTypes, setMasterFuelTypes] = useState<any[]>([]);
  const [masterTransmissions, setMasterTransmissions] = useState<any[]>([]);

  useEffect(() => {
    loadUserType();
    void loadMasterDropdowns();
  }, []);

  const loadMasterDropdowns = async () => {
    try {
      const [brandsRes, modelsRes, fuelRes, fuelCatalogRes, transmissionRes] = await Promise.all([
        masterDataApi.getByType('vehicle_brand'),
        masterDataApi.getByType('vehicle_model'),
        masterDataApi.getByType('fuel_type'),
        vehicleCatalogApi.getFuelTypes(),
        masterDataApi.getByType('transmission_type'),
      ]);
      setMasterBrands((brandsRes.data as any)?.items || []);
      setMasterModels((modelsRes.data as any)?.items || []);
      const fuelMasterItems = (fuelRes.data as any)?.items || [];
      const fuelCatalogItems = ((fuelCatalogRes.data as any)?.items || []).map((label: string) => ({
        label,
        value: String(label || '').toLowerCase(),
      }));
      setMasterFuelTypes([...fuelMasterItems, ...fuelCatalogItems]);
      setMasterTransmissions((transmissionRes.data as any)?.items || []);
    } catch (error) {
      console.error('Failed to load master dropdowns:', error);
    }
  };

  useEffect(() => {
    if (!editingVehicle) return;

    const normalizedType = (editingVehicle.type || '').toLowerCase();
    const parsedType: 'car' | 'bike' | 'scooty' | null =
      normalizedType === 'car'
        ? 'car'
        : normalizedType === 'bike'
          ? 'bike'
          : normalizedType === 'scooty'
            ? 'scooty'
            : null;

    setVehicleType(parsedType);
    setVehicleNumber(editingVehicle.number || '');
    setCompanyName(editingVehicle.companyName || '');
    const incomingBrand = editingVehicle.brand || '';
    const incomingModel = editingVehicle.vehicleModel || editingVehicle.model || '';
    const knownBrands = parsedType ? Object.keys(VEHICLE_BRAND_MODELS[parsedType] || {}) : [];
    const knownModels = parsedType && knownBrands.includes(incomingBrand)
      ? VEHICLE_BRAND_MODELS[parsedType]?.[incomingBrand] || []
      : [];

    setBrand(incomingBrand);
    setModel(incomingModel);
    setYear(editingVehicle.year || null);
    setColor(editingVehicle.color || '');
    setSeats(editingVehicle.seats || (parsedType === 'car' ? 5 : 2));
    setFuelType(editingVehicle.fuelType || '');
    setTransmission(editingVehicle.transmission || '');
    setInsuranceExpiry(editingVehicle.insuranceExpiry ? new Date(editingVehicle.insuranceExpiry) : null);

    setPhotoFront(editingVehicle.photos?.front || null);
    setPhotoBack(editingVehicle.photos?.back || null);
    setPhotoSide(editingVehicle.photos?.side || null);
    setPhotoInterior(editingVehicle.photos?.interior || null);

    setRegistrationCertificate(editingVehicle.documents?.registrationCertificate || null);
    setInsurance(editingVehicle.documents?.insurance || null);
    setPollutionCertificate(editingVehicle.documents?.pollutionCertificate || null);
    setTaxiServicePapers(editingVehicle.documents?.taxiServicePapers || null);
  }, [editingVehicle]);

  useEffect(() => {
    if (vehicleType === 'bike' || vehicleType === 'scooty') {
      setSeats(2);
    }
    if (vehicleType === 'scooty') {
      setTransmission('Automatic');
    }
  }, [vehicleType]);

  useEffect(() => {
    if (!vehicleType) return;
    const availableBrands = new Set([
      ...Object.keys(VEHICLE_BRAND_MODELS[vehicleType] || {}),
      ...masterBrands
        .filter((item: any) => {
          const vt = String(item?.metadata?.vehicleType || '').toLowerCase();
          return !vt || vt === vehicleType;
        })
        .map((item: any) => String(item?.label || '').trim())
        .filter(Boolean),
    ]);
    if (brand && !availableBrands.has(brand)) {
      setBrand('');
      setModel('');
    }
  }, [vehicleType, brand, masterBrands]);

  useEffect(() => {
    if (!vehicleType || !brand) return;
    const allowedModels = new Set([
      ...(VEHICLE_BRAND_MODELS[vehicleType]?.[brand] || []),
      ...masterModels
        .filter((item: any) => {
          const vt = String(item?.metadata?.vehicleType || '').toLowerCase();
          const brandKey = String(item?.metadata?.brandKey || '').toLowerCase();
          const brandName = String(item?.metadata?.brand || '').toLowerCase();
          const selectedBrandKey = normalizeKey(brand);
          const matchesVehicleType = !vt || vt === vehicleType;
          const matchesBrand =
            !selectedBrandKey ||
            !brandKey && !brandName ||
            brandKey === selectedBrandKey ||
            brandName === brand.toLowerCase();
          return matchesVehicleType && matchesBrand;
        })
        .map((item: any) => String(item?.label || '').trim())
        .filter(Boolean),
    ]);
    if (model && !allowedModels.has(model)) {
      setModel('');
    }
  }, [vehicleType, brand, model, masterModels]);

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
        vehicleType: (vehicleType === 'scooty' ? 'bike' : vehicleType) as 'car' | 'bike',
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
                allowsEditing: false,
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
                allowsEditing: false,
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
                showSnackbar({ message: error.message || 'Failed to pick document', type: 'error' });
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      showSnackbar({ message: error.message || 'Failed to open document picker', type: 'error' });
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
      showSnackbar({ message: error.message || 'Failed to upload document', type: 'error' });
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
                allowsEditing: false,
                quality: 0.8,
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
                allowsEditing: false,
                quality: 0.8,
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
      showSnackbar({ message: error.message || 'Failed to open photo picker', type: 'error' });
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
      showSnackbar({ message: error.message || 'Failed to upload photo', type: 'error' });
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
    if ((vehicleType === 'bike' || vehicleType === 'scooty') && seats !== 2) {
      Alert.alert('Validation Error', 'Bikes and scooties must have exactly 2 seats');
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

      const response = isEditMode && editingVehicleId
        ? await vehicleApi.updateVehicle(String(editingVehicleId), vehicleData)
        : await vehicleApi.createVehicle(vehicleData);

      if (response.success) {
        if (isEditMode) {
          Alert.alert('Success', 'Vehicle updated successfully!', [
            { text: 'Done', onPress: () => navigation.goBack() },
          ]);
        } else {
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
        }
      } else {
        showSnackbar({
          message: getUserErrorMessage(response as any, isEditMode ? 'Failed to update vehicle' : 'Failed to add vehicle'),
          type: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      showSnackbar({
        message: error.message || (isEditMode ? 'Failed to update vehicle' : 'Failed to add vehicle'),
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Generate year options (last 20 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 20 }, (_, i) => currentYear - i);
  const fallbackBrands = vehicleType ? Object.keys(VEHICLE_BRAND_MODELS[vehicleType] || {}) : [];
  const fallbackModels = vehicleType && brand
    ? (VEHICLE_BRAND_MODELS[vehicleType]?.[brand] || [])
    : [];
  const masterBrandOptions = masterBrands
    .filter((item: any) => {
      const vt = String(item?.metadata?.vehicleType || '').toLowerCase();
      return !!vehicleType && (!vt || vt === vehicleType);
    })
    .map((item: any) => item.label)
    .filter(Boolean);
  const selectedBrandKey = normalizeKey(brand);
  const masterModelOptions = masterModels
    .filter((item: any) => {
      const vt = String(item?.metadata?.vehicleType || '').toLowerCase();
      const brandKey = String(item?.metadata?.brandKey || '').toLowerCase();
      const brandName = String(item?.metadata?.brand || '').toLowerCase();
      const matchesVehicleType = !!vehicleType && (!vt || vt === vehicleType);
      const matchesBrand =
        !brand || !selectedBrandKey || !brandKey && !brandName
          ? true
          : brandKey === selectedBrandKey || brandName === brand.toLowerCase();
      return matchesVehicleType && matchesBrand;
    })
    .map((item: any) => item.label)
    .filter(Boolean);
  const brandOptions = vehicleType
    ? Array.from(new Set([...masterBrandOptions, ...fallbackBrands, brand].filter(Boolean)))
    : [];
  const modelOptions = vehicleType && brand
    ? Array.from(new Set([...masterModelOptions, ...fallbackModels, model].filter(Boolean)))
    : [];
  const fallbackFuelOptions = vehicleType === 'scooty' || vehicleType === 'bike'
    ? ['Petrol', 'Electric']
    : ['Petrol', 'Diesel', 'Electric', 'CNG'];
  const fuelOptions = Array.from(
    new Set([
      ...masterFuelTypes
        .filter((item: any) => {
          const vt = String(item?.metadata?.vehicleType || '').toLowerCase();
          return !vehicleType || !vt || vt === vehicleType;
        })
        .map((item: any) => item.label)
        .filter(Boolean),
      ...fallbackFuelOptions,
    ])
  );
  const transmissionOptions = Array.from(
    new Set([
      ...masterTransmissions
        .filter((item: any) => {
          const vt = String(item?.metadata?.vehicleType || '').toLowerCase();
          return !vehicleType || !vt || vt === vehicleType;
        })
        .map((item: any) => item.label)
        .filter(Boolean),
      ...['Manual', 'Automatic'],
    ])
  );

  const openSelectionModal = (type: 'vehicleType' | 'brand' | 'model' | 'fuelType' | 'transmission' | 'year') => {
    setSelectionType(type);
    setShowSelectionModal(true);
  };

  const handleSelectDropdownValue = (value: string) => {
    if (selectionType === 'vehicleType') {
      const nextType = value as 'car' | 'bike' | 'scooty';
      setVehicleType(nextType);
      setSeats(nextType === 'car' ? 5 : 2);
      setBrand('');
      setModel('');
      setFuelType('');
      setTransmission(nextType === 'scooty' ? 'Automatic' : '');
    } else if (selectionType === 'brand') {
      setBrand(value);
      setModel('');
    } else if (selectionType === 'model') {
      setModel(value);
    } else if (selectionType === 'fuelType') {
      setFuelType(value);
    } else if (selectionType === 'transmission') {
      setTransmission(value as any);
    } else if (selectionType === 'year') {
      setYear(Number(value));
    }
    setShowSelectionModal(false);
    setSelectionType(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Vehicle' : t('addVehicle.title')}</Text>
        <View style={{ width: normalize(36) }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Vehicle Type */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Choose Vehicle Type</Text>
            <Text style={styles.label}>Vehicle Type *</Text>
            <TouchableOpacity
              style={[styles.dropdownField, styles.input]}
              onPress={() => openSelectionModal('vehicleType')}
              activeOpacity={0.8}
            >
              <Text style={[styles.dropdownValue, !vehicleType && styles.dropdownPlaceholder]}>
                {vehicleType ? vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1) : 'Select vehicle type'}
              </Text>
              <ChevronDown size={16} color="#7A7A7A" />
            </TouchableOpacity>
          </View>

          {/* Basic Information */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1.2 }}>
                <Input
                  label={t('addVehicle.vehicleNumber')}
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                  placeholder="e.g., AP 12 AB 1234"
                  containerStyle={styles.input}
                  inputStyle={styles.compactInputText}
                  autoCapitalize="characters"
                />
              </View>
              <View style={{ flex: 0.8 }}>
                <Input
                  label="Color"
                  value={color}
                  onChangeText={setColor}
                  placeholder="e.g., White"
                  containerStyle={styles.input}
                  inputStyle={styles.compactInputText}
                />
              </View>
            </View>

            {userType === 'company' && (
              <Input
                label={t('addVehicle.companyName')}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder={t('addVehicle.selectFromDropdown')}
                containerStyle={styles.input}
                inputStyle={styles.compactInputText}
              />
            )}

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Brand *</Text>
                <TouchableOpacity
                  style={[styles.dropdownField, styles.input]}
                  onPress={() => openSelectionModal('brand')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dropdownValue, !brand && styles.dropdownPlaceholder]}>
                    {brand || 'Select brand'}
                  </Text>
                  <ChevronDown size={16} color="#7A7A7A" />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Model *</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownField,
                    styles.input,
                    (!vehicleType || !brand) && styles.dropdownDisabled,
                  ]}
                  onPress={() => openSelectionModal('model')}
                  activeOpacity={0.8}
                  disabled={!vehicleType || !brand}
                >
                  <Text style={[styles.dropdownValue, !model && styles.dropdownPlaceholder]}>
                    {model || (!vehicleType ? 'Select type first' : !brand ? 'Select brand first' : 'Select model')}
                  </Text>
                  <ChevronDown size={16} color="#7A7A7A" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.reportHintRow}>
              <Text style={styles.reportHintText}>Can't find your vehicle in list?</Text>
              <TouchableOpacity
                style={styles.reportHintButton}
                onPress={() =>
                  navigation.navigate('ReportVehicleCatalog' as never, {
                    vehicleType,
                    brand,
                    model,
                    fuelType,
                    transmission,
                  } as never)
                }
              >
                <Text style={styles.reportHintLink}>Report to Admin</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.input}>
              <Text style={styles.label}>Year of Manufacture *</Text>
              <TouchableOpacity
                style={styles.dropdownField}
                onPress={() => openSelectionModal('year')}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownValue, !year && styles.dropdownPlaceholder]}>
                  {year ? String(year) : 'Select year'}
                </Text>
                <ChevronDown size={16} color="#7A7A7A" />
              </TouchableOpacity>
            </View>

          </View>

          {/* Vehicle Specs */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Specifications</Text>

            <View style={styles.input}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Number of Seats *</Text>
              </View>
              {(vehicleType === 'bike' || vehicleType === 'scooty') ? (
                <View style={styles.lockedSpecRow}>
                  <View style={styles.lockedSpecBadge}>
                    <Text style={styles.lockedSpecValue}>2</Text>
                  </View>
                  <Text style={styles.lockedSpecNote}>
                    {vehicleType === 'scooty' ? 'Scooties always have 2 seats' : 'Bikes always have 2 seats'}
                  </Text>
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

            <View style={styles.input}>
              <View style={styles.labelRow}>
                <Fuel size={14} color={COLORS.textSecondary} />
                <Text style={styles.label}>Fuel Type *</Text>
              </View>
              <TouchableOpacity
                style={styles.dropdownField}
                onPress={() => openSelectionModal('fuelType')}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownValue, !fuelType && styles.dropdownPlaceholder]}>
                  {fuelType || 'Select fuel type'}
                </Text>
                <ChevronDown size={16} color="#7A7A7A" />
              </TouchableOpacity>
            </View>

            <View style={styles.input}>
              <View style={styles.labelRow}>
                <Settings2 size={14} color={COLORS.textSecondary} />
                <Text style={styles.label}>Transmission *</Text>
              </View>
              <TouchableOpacity
                style={styles.dropdownField}
                onPress={() => openSelectionModal('transmission')}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownValue, !transmission && styles.dropdownPlaceholder]}>
                  {transmission || 'Select transmission'}
                </Text>
                <ChevronDown size={16} color="#7A7A7A" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setShowInsuranceDatePicker(true)} style={styles.input}>
              <View style={styles.labelRow}>
                <Shield size={14} color={COLORS.textSecondary} />
                <Text style={styles.label}>Insurance Expiry Date *</Text>
              </View>
              <View style={styles.dateInput}>
                <Calendar size={16} color={insuranceExpiry ? VEHICLE_ACCENT : COLORS.textSecondary} />
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
          </View>

          {/* Suggested Price Card */}
          {suggestedPrice && priceBreakdown && (
            <View style={styles.priceCard}>
              <Text style={styles.priceTitle}>Suggested Rental Price</Text>
              <Text style={styles.priceAmount}>₹{suggestedPrice}<Text style={styles.priceUnit}>/hour</Text></Text>
              <View style={styles.priceBreakdown}>
                <Text style={styles.breakdownTitle}>Price Breakdown</Text>
                {priceBreakdown && (
                  <Text style={styles.breakdownText}>
                    Base ₹{priceBreakdown.basePrice} × {priceBreakdown.ageMultiplier.toFixed(2)} (age) × {priceBreakdown.transmissionMultiplier.toFixed(2)} (trans) × {priceBreakdown.fuelMultiplier.toFixed(2)} (fuel) × {priceBreakdown.seatsMultiplier.toFixed(2)} (seats) = ₹{suggestedPrice}/hr
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Vehicle Photos */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Vehicle Photos</Text>
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
                      <ActivityIndicator size="small" color={VEHICLE_ACCENT} />
                    ) : photo ? (
                      <View style={styles.photoPreview}>
                        <Image source={{ uri: photo }} style={styles.photoImage} />
                        <View style={styles.photoOverlay}>
                          <X size={20} color="#FFF" />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Camera size={22} color={VEHICLE_ACCENT} />
                        <Text style={styles.photoPlaceholderText}>Upload</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Documents */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('addVehicle.documents')} *</Text>
            {[
              { key: 'rc', label: 'Registration Certificate (RC)', photo: registrationCertificate },
              { key: 'insurance', label: 'Insurance Certificate', photo: insurance },
              { key: 'puc', label: 'Pollution Certificate (PUC)', photo: pollutionCertificate },
              { key: 'taxi', label: 'Taxi Service Papers', photo: taxiServicePapers, optional: true },
            ].map(({ key, label, photo, optional }) => (
              <View key={key} style={styles.documentRow}>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentLabel}>
                    {label} {optional && <Text style={{ color: '#999', fontWeight: '400' }}>(Optional)</Text>}
                  </Text>
                  {photo && <CheckCircle size={16} color="#38A169" />}
                </View>
                <TouchableOpacity
                  style={styles.documentButton}
                  onPress={() => (photo ? handleRemoveDocument(key) : handleDocumentPicker(key as any))}
                  disabled={uploading === key}
                >
                  {uploading === key ? (
                    <ActivityIndicator size="small" color={VEHICLE_ACCENT} />
                  ) : photo ? (
                    <X size={18} color="#E53E3E" />
                  ) : (
                    <FileText size={18} color={VEHICLE_ACCENT} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            <LinearGradient
              colors={[VEHICLE_ACCENT, VEHICLE_ACCENT_DARK]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.saveButtonGradient}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditMode ? 'Update Vehicle' : t('common.save')}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showSelectionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSelectionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSelectionModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {selectionType === 'vehicleType'
                ? 'Select Vehicle Type'
                : selectionType === 'brand'
                  ? 'Select Brand'
                  : selectionType === 'fuelType'
                    ? 'Select Fuel Type'
                    : selectionType === 'transmission'
                      ? 'Select Transmission'
                      : selectionType === 'year'
                        ? 'Select Year'
                      : 'Select Model'}
            </Text>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {(
                selectionType === 'vehicleType'
                  ? ['car', 'bike', 'scooty']
                  : selectionType === 'brand'
                    ? brandOptions
                    : selectionType === 'fuelType'
                      ? fuelOptions
                      : selectionType === 'transmission'
                        ? transmissionOptions
                        : selectionType === 'year'
                          ? yearOptions.map((y) => String(y))
                        : modelOptions
              ).length === 0 ? (
                <Text style={styles.modalEmptyText}>No options available yet. Please report to admin.</Text>
              ) : (
                (
                  selectionType === 'vehicleType'
                    ? ['car', 'bike', 'scooty']
                    : selectionType === 'brand'
                      ? brandOptions
                      : selectionType === 'fuelType'
                        ? fuelOptions
                        : selectionType === 'transmission'
                          ? transmissionOptions
                          : selectionType === 'year'
                            ? yearOptions.map((y) => String(y))
                          : modelOptions
                ).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.modalOption}
                    onPress={() => handleSelectDropdownValue(option)}
                  >
                    <Text style={styles.modalOptionText}>
                      {selectionType === 'vehicleType'
                        ? option.charAt(0).toUpperCase() + option.slice(1)
                        : option}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(12),
    paddingTop: normalize(46),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  backBtn: {
    paddingVertical: normalize(6),
    paddingRight: normalize(8),
  },
  headerTitle: {
    fontFamily: FONTS.medium || FONTS.regular,
    fontSize: normalize(17),
    color: COLORS.text,
    fontWeight: '700',
  },
  keyboardView: { flex: 1 },
  scrollContent: { padding: normalize(12), paddingBottom: normalize(140) },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: normalize(16),
    padding: normalize(12),
    marginBottom: normalize(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: {
    fontFamily: FONTS.medium || FONTS.regular,
    fontSize: normalize(15),
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: normalize(10),
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: '#666',
    marginBottom: normalize(4),
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(6),
    marginBottom: normalize(6),
  },
  rowInputs: {
    flexDirection: 'row',
    gap: normalize(8),
  },
  reportHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: normalize(4),
    marginBottom: normalize(12),
    backgroundColor: '#FFF8EE',
    borderWidth: 1,
    borderColor: '#F3D6AB',
    borderRadius: normalize(12),
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(9),
  },
  reportHintText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: '#7A6548',
    flex: 1,
    marginRight: normalize(8),
  },
  reportHintButton: {
    backgroundColor: '#FFE5BF',
    borderRadius: normalize(18),
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(6),
  },
  reportHintLink: {
    fontFamily: FONTS.medium || FONTS.regular,
    fontSize: normalize(12),
    color: VEHICLE_ACCENT_DARK,
    fontWeight: '700',
  },
  input: { marginBottom: normalize(10) },
  compactInputText: {
    fontSize: normalize(13),
    paddingVertical: normalize(10),
  },
  dropdownField: {
    minHeight: normalize(44),
    borderRadius: normalize(12),
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: normalize(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
    marginRight: normalize(8),
  },
  dropdownPlaceholder: {
    color: '#999',
    fontWeight: '400',
  },
  dropdownDisabled: {
    backgroundColor: '#F4F4F4',
  },
  seatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(8),
    marginTop: normalize(4),
  },
  seatButton: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(22),
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatButtonSelected: {
    backgroundColor: VEHICLE_ACCENT,
    borderColor: VEHICLE_ACCENT,
  },
  seatText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    color: COLORS.text,
    fontWeight: '600',
  },
  seatTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  seatButtonDisabled: { opacity: 0.8 },
  lockedSpecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(10),
    marginTop: normalize(4),
    backgroundColor: '#F8F9FA',
    padding: normalize(10),
    borderRadius: normalize(12),
  },
  lockedSpecBadge: {
    backgroundColor: VEHICLE_ACCENT,
    borderRadius: normalize(10),
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(6),
  },
  lockedSpecValue: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    color: '#FFF',
    fontWeight: '700',
  },
  lockedSpecNote: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: '#666',
    flex: 1,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(8),
    marginTop: normalize(4),
  },
  optionButton: {
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(8),
    borderRadius: normalize(22),
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: VEHICLE_ACCENT,
    borderColor: VEHICLE_ACCENT,
  },
  optionText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: COLORS.text,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(10),
    padding: normalize(11),
    borderRadius: normalize(12),
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    marginTop: normalize(4),
  },
  dateText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: COLORS.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: normalize(20),
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: normalize(16),
    maxHeight: hp(58),
    paddingVertical: normalize(12),
  },
  modalTitle: {
    fontFamily: FONTS.medium || FONTS.regular,
    fontSize: normalize(15),
    color: COLORS.text,
    fontWeight: '700',
    paddingHorizontal: normalize(14),
    marginBottom: normalize(8),
  },
  modalList: {
    paddingHorizontal: normalize(8),
  },
  modalOption: {
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(10),
    borderRadius: normalize(10),
  },
  modalOptionText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: COLORS.text,
    fontWeight: '500',
  },
  modalEmptyText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: '#8A8A8A',
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(10),
  },
  datePlaceholder: {
    color: '#999',
  },
  priceCard: {
    padding: normalize(16),
    marginBottom: normalize(12),
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#C6F6D5',
    borderRadius: normalize(16),
  },
  priceTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: '#38A169',
    marginBottom: normalize(4),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceAmount: {
    fontFamily: FONTS.regular,
    fontSize: normalize(28),
    color: '#22543D',
    fontWeight: 'bold',
    marginBottom: normalize(8),
  },
  priceUnit: {
    fontSize: normalize(14),
    fontWeight: '500',
    color: '#666',
  },
  priceBreakdown: {
    marginTop: normalize(6),
    paddingTop: normalize(8),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6F6D5',
  },
  breakdownTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: '#666',
    marginBottom: normalize(4),
    fontWeight: '600',
  },
  breakdownText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: '#888',
    lineHeight: normalize(16),
  },
  documentsCard: {
    padding: normalize(16),
    marginBottom: normalize(12),
    borderRadius: normalize(16),
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  documentsTitle: {
    fontFamily: FONTS.medium || FONTS.regular,
    fontSize: normalize(15),
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: normalize(14),
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: normalize(8),
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(14),
    backgroundColor: '#F8F9FA',
    borderRadius: normalize(12),
  },
  documentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
  },
  documentLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: COLORS.text,
    flex: 1,
    fontWeight: '500',
  },
  documentButton: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  saveButton: {
    marginTop: normalize(8),
    borderRadius: normalize(14),
    overflow: 'hidden',
    marginBottom: normalize(8),
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonGradient: {
    minHeight: normalize(52),
    borderRadius: normalize(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: FONTS.medium || FONTS.regular,
    fontSize: normalize(15),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(10),
  },
  photoItem: {
    width: '47%',
  },
  photoLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: '#888',
    marginBottom: normalize(6),
    fontWeight: '500',
  },
  photoButton: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: normalize(14),
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    backgroundColor: '#FAFAFA',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    gap: normalize(6),
  },
  photoPlaceholderText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: VEHICLE_ACCENT,
    fontWeight: '600',
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
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AddVehicleScreen;
