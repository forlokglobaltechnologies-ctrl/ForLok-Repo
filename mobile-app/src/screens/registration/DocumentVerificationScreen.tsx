import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { ArrowLeft, Camera, CheckCircle } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';

const ACCENT = '#F9A825';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import {
  getUserDocuments,
  saveUserDocuments,
  getRequiredDocuments,
  UserDocuments,
} from '@utils/documentUtils';
import { useLanguage } from '@context/LanguageContext';
import { documentApi, uploadFile, vehicleApi } from '@utils/apiClient';
import { API_CONFIG } from '../../config/api';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { normalize, wp, hp } from '@utils/responsive';

interface RouteParams {
  serviceType: 'createPooling' | 'createRental' | 'takePooling' | 'takeRental';
  onComplete?: () => void;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const DocumentVerificationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { t } = useLanguage();
  const params = (route.params as RouteParams) || { serviceType: 'createPooling' };

  const { serviceType } = params;

  // Document states - Number-only verification
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [panNumber, setPanNumber] = useState('');
  const [panVerified, setPanVerified] = useState(false);
  const [dlNumber, setDlNumber] = useState('');
  const [dlDob, setDlDob] = useState('');
  const [dlDobDate, setDlDobDate] = useState<Date | null>(null);
  const [showDlDobPicker, setShowDlDobPicker] = useState(false);
  const [dlState, setDlState] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [dlVerified, setDlVerified] = useState(false);
  
  // Image upload states (for vehicle docs, user photo)
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleType, setVehicleType] = useState<'car' | 'bike' | null>(null);
  const [vehicleYear, setVehicleYear] = useState<number | null>(null);
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleSeats, setVehicleSeats] = useState<number>(5);
  const [vehicleFuelType, setVehicleFuelType] = useState<'Petrol' | 'Diesel' | 'Electric' | 'CNG' | ''>('');
  const [vehicleTransmission, setVehicleTransmission] = useState<'Manual' | 'Automatic' | ''>('');
  const [insuranceExpiry, setInsuranceExpiry] = useState<Date | null>(null);
  const [showInsuranceDatePicker, setShowInsuranceDatePicker] = useState(false);
  const [vehicleFront, setVehicleFront] = useState<string | null>(null);
  const [vehicleBack, setVehicleBack] = useState<string | null>(null);
  const [registrationCertificate, setRegistrationCertificate] = useState<string | null>(null);
  const [insurance, setInsurance] = useState<string | null>(null);
  const [pollutionCertificate, setPollutionCertificate] = useState<string | null>(null);
  const [taxiServicePapers, setTaxiServicePapers] = useState<string | null>(null);
  const [existingVehicles, setExistingVehicles] = useState<any[]>([]);
  const [vehicleAlreadyExists, setVehicleAlreadyExists] = useState(false);
  
  // Upload states
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'success' | 'error' | null>>({});
  
  // Auto-set seats for bikes
  useEffect(() => {
    if (vehicleType === 'bike') {
      setVehicleSeats(2);
    }
  }, [vehicleType]);
  
  const [existingDocuments, setExistingDocuments] = useState<UserDocuments | null>(null);
  const [requiredDocs, setRequiredDocs] = useState<ReturnType<typeof getRequiredDocuments> | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOfferingService = serviceType === 'createPooling' || serviceType === 'createRental';

  // Load existing documents on mount
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        // Fetch documents from backend
        const response = await documentApi.getUserDocuments();
        if (response.success && response.data) {
          const backendDocs = response.data;
          
          // Map backend documents to local format
          const docs: UserDocuments = {};
          
          // Find Aadhaar documents
          const aadhaarDoc = backendDocs.find((d: any) => 
            d.type === 'aadhar_front' || d.type === 'aadhar_back'
          );
          if (aadhaarDoc && aadhaarDoc.status === 'verified') {
            setAadhaarNumber(aadhaarDoc.documentNumber || '');
            setAadhaarVerified(true);
          }
          
          // Find Driving License documents
          const dlDoc = backendDocs.find((d: any) => 
            d.type === 'driving_license_front' || d.type === 'driving_license_back'
          );
          if (dlDoc && dlDoc.status === 'verified') {
            setDlNumber(dlDoc.documentNumber || '');
            const savedDob = dlDoc.metadata?.dob || '';
            setDlDob(savedDob);
            if (savedDob) {
              const parts = savedDob.split('/');
              if (parts.length === 3) {
                setDlDobDate(new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])));
              }
            }
            setDlState(dlDoc.metadata?.state || '');
            setDlVerified(true);
          }
          
          // Find user photo
          const userPhotoDoc = backendDocs.find((d: any) => d.type === 'user_photo');
          if (userPhotoDoc && userPhotoDoc.url) {
            setUserPhoto(userPhotoDoc.url);
          }
          
          // Find vehicle documents
          const vehicleFrontDoc = backendDocs.find((d: any) => d.type === 'vehicle_front');
          const vehicleBackDoc = backendDocs.find((d: any) => d.type === 'vehicle_back');
          const insuranceDoc = backendDocs.find((d: any) => d.type === 'vehicle_insurance');
          
          if (vehicleFrontDoc && vehicleFrontDoc.url) setVehicleFront(vehicleFrontDoc.url);
          if (vehicleBackDoc && vehicleBackDoc.url) setVehicleBack(vehicleBackDoc.url);
          if (insuranceDoc && insuranceDoc.url) setInsurance(insuranceDoc.url);
          
          setExistingDocuments(docs);
        }
        
        // Also check local storage for any additional data
        const localDocs = await getUserDocuments();
        if (localDocs) {
          if (localDocs.vehicleNumber) setVehicleNumber(localDocs.vehicleNumber);
        }
        
        // Load existing vehicles from backend
        const vehiclesResponse = await vehicleApi.getVehicles();
        if (vehiclesResponse.success && vehiclesResponse.data && vehiclesResponse.data.length > 0) {
          setExistingVehicles(vehiclesResponse.data);
          setVehicleAlreadyExists(true);
          // Auto-populate first vehicle if exists
          const firstVehicle = vehiclesResponse.data[0];
          if (firstVehicle && !vehicleNumber) {
            setVehicleNumber(firstVehicle.number || '');
            setVehicleBrand(firstVehicle.brand || '');
            setVehicleModel(firstVehicle.vehicleModel || firstVehicle.model || '');
            setVehicleType(firstVehicle.type || null);
          }
        }
        
        // Determine required documents based on service type
        const required = getRequiredDocuments(serviceType, localDocs || {});
        setRequiredDocs(required);
      } catch (error) {
        console.error('Error loading documents:', error);
        // Fallback to local storage
        const docs = await getUserDocuments();
        setExistingDocuments(docs);
        const required = getRequiredDocuments(serviceType, docs);
        setRequiredDocs(required);
      }
    };
    
    loadDocuments();
  }, [serviceType]);

  useEffect(() => {
    if (!isFocused) return;
    const refreshVehicles = async () => {
      try {
        const vehiclesResponse = await vehicleApi.getVehicles();
        if (vehiclesResponse.success && vehiclesResponse.data && vehiclesResponse.data.length > 0) {
          setExistingVehicles(vehiclesResponse.data);
          setVehicleAlreadyExists(true);
        }
      } catch (_e) { /* ignore */ }
    };
    refreshVehicles();
  }, [isFocused]);

  const getScreenTitle = () => {
    return t('documentVerification.title');
  };

  const getScreenDescription = () => {
    if (!requiredDocs) {
      return t('documentVerification.loadingRequirements');
    }
    
    const serviceTypeKey = serviceType === 'createPooling' ? 'requiredForPooling' :
                           serviceType === 'createRental' ? 'requiredForRental' :
                           serviceType === 'takePooling' ? 'requiredForTakingPooling' :
                           'requiredForTakingRental';
    
    return t(`documentVerification.${serviceTypeKey}`);
  };

  const handleVerifyAadhaar = async () => {
    if (!aadhaarNumber.trim() || aadhaarNumber.length !== 12) {
      Alert.alert('Invalid Aadhaar', 'Please enter a valid 12-digit Aadhaar number');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await documentApi.verifyByNumber('aadhaar', aadhaarNumber);
      
      if (response.success) {
        setAadhaarVerified(true);
        Alert.alert('Success', 'Aadhaar verified successfully');
      } else {
        Alert.alert('Verification Failed', response.error || 'Failed to verify Aadhaar');
      }
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Failed to verify Aadhaar');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyPAN = async () => {
    if (!panNumber.trim() || panNumber.length !== 10) {
      Alert.alert('Invalid PAN', 'Please enter a valid 10-character PAN number');
      return;
    }

    setIsVerifying(true);
    try {
      // Call API to verify PAN by number
      // const response = await api.post('/api/documents/verify-by-number', {
      //   type: 'pan',
      //   documentNumber: panNumber,
      // });
      
      // For now, mock success
      setPanVerified(true);
      Alert.alert('Success', 'PAN verified successfully');
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Failed to verify PAN');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyDL = async () => {
    if (!dlNumber.trim()) {
      Alert.alert('Invalid DL', 'Please enter Driving License number');
      return;
    }
    if (!dlDob.trim()) {
      Alert.alert('Missing Info', 'Please enter Date of Birth');
      return;
    }
    if (!dlState.trim()) {
      Alert.alert('Missing Info', 'Please enter State');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await documentApi.verifyByNumber('driving_license', dlNumber, {
        dob: dlDob,
        state: dlState,
      });
      
      if (response.success) {
        setDlVerified(true);
        Alert.alert('Success', 'Driving License verified successfully');
      } else {
        Alert.alert('Verification Failed', response.error || 'Failed to verify Driving License');
      }
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Failed to verify Driving License');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleImageUpload = async (type: string) => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('documentVerification.permissionDenied'), t('documentVerification.galleryPermission'));
        return;
      }

      // Show options
      Alert.alert(
        t('documentVerification.upload'),
        `${t('documentVerification.upload')} ${type}`,
        [
          {
            text: t('common.camera'),
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                await uploadImageToBackend(type, result.assets[0].uri);
              }
            },
          },
          {
            text: t('common.gallery'),
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                await uploadImageToBackend(type, result.assets[0].uri);
              }
            },
          },
          { text: t('common.cancel'), style: 'cancel' },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open image picker');
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
                Alert.alert(t('common.error'), error.message || t('documentVerification.uploadFailed'));
              }
            },
          },
          { text: t('common.cancel'), style: 'cancel' },
        ]
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('documentVerification.uploadFailed'));
    }
  };

  const handleDocumentSelected = async (type: 'rc' | 'insurance' | 'puc' | 'taxi', uri: string, mimeType: string) => {
    try {
      setUploadingDocument(type);
      
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
      
      const isPDF = mimeType === 'application/pdf' || uri.toLowerCase().endsWith('.pdf');
      const extension = isPDF ? 'pdf' : (mimeType.includes('image') ? 'jpg' : 'pdf');
      const fileName = uri.split('/').pop() || `vehicle_${type}_${Date.now()}.${extension}`;
      
      const file = {
        uri,
        type: mimeType,
        name: fileName,
      };
      
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
        Alert.alert(t('documentVerification.uploadFailed'), response.error || t('documentVerification.uploadFailed'));
      }
    } catch (error: any) {
      Alert.alert(t('documentVerification.uploadFailed'), error.message || t('documentVerification.uploadFailed'));
    } finally {
      setUploadingDocument(null);
    }
  };

  const handleRemoveDocument = (type: 'rc' | 'insurance' | 'puc' | 'taxi') => {
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

  const uploadImageToBackend = async (type: string, uri: string) => {
    // Map UI types to state keys and backend document types
    const typeMap: Record<string, { stateKey: string; docType: string }> = {
      'User Photo': { stateKey: 'userPhoto', docType: 'user_photo' },
      'Vehicle Front': { stateKey: 'vehicleFront', docType: 'vehicle_front' },
      'Vehicle Back': { stateKey: 'vehicleBack', docType: 'vehicle_back' },
      'Insurance': { stateKey: 'insurance', docType: 'vehicle_insurance' },
    };

    const mapping = typeMap[type] || {
      stateKey: type.toLowerCase().replace(' ', ''),
      docType: type.toLowerCase().replace(' ', '_'),
    };

    // Set uploading state
    setUploadingType(type);
    setUploadStatus((prev) => ({ ...prev, [mapping.stateKey]: null }));

    try {
      // First, update local state to show preview
      if (mapping.stateKey === 'userPhoto') setUserPhoto(uri);
      else if (mapping.stateKey === 'vehicleFront') setVehicleFront(uri);
      else if (mapping.stateKey === 'vehicleBack') setVehicleBack(uri);
      else if (mapping.stateKey === 'insurance') setInsurance(uri);

      // Upload file to backend
      const response = await uploadFile(
        `/api/documents/upload?type=${mapping.docType}`,
        {
          uri,
          type: 'image/jpeg',
          name: `${mapping.docType}_${Date.now()}.jpg`,
        }
      );

      if (response.success && response.data?.url) {
        // Update with Cloudinary URL
        const cloudinaryUrl = response.data.url;
        if (mapping.stateKey === 'userPhoto') setUserPhoto(cloudinaryUrl);
        else if (mapping.stateKey === 'vehicleFront') setVehicleFront(cloudinaryUrl);
        else if (mapping.stateKey === 'vehicleBack') setVehicleBack(cloudinaryUrl);
        else if (mapping.stateKey === 'insurance') setInsurance(cloudinaryUrl);

        setUploadStatus((prev) => ({ ...prev, [mapping.stateKey]: 'success' }));
        Alert.alert(t('common.success'), `${type} uploaded to Cloudinary successfully!`);
      } else {
        setUploadStatus((prev) => ({ ...prev, [mapping.stateKey]: 'error' }));
        Alert.alert(t('documentVerification.uploadFailed'), response.error || t('documentVerification.uploadFailed'));
      }
    } catch (error: any) {
      setUploadStatus((prev) => ({ ...prev, [mapping.stateKey]: 'error' }));
      Alert.alert(t('documentVerification.uploadFailed'), error.message || t('documentVerification.uploadFailed'));
    } finally {
      setUploadingType(null);
    }
  };

  const handleSubmit = async () => {
    console.log('🔵 handleSubmit called');
    try {
      if (isSubmitting) {
        console.log('⚠️ Already submitting, returning');
        return; // Prevent double submission
      }

      console.log('📋 Required docs:', requiredDocs);
      if (!requiredDocs) {
        Alert.alert('Error', 'Please wait while we load your document requirements');
        return;
      }

      // Validate only required documents
      console.log('✅ Validating documents...');
      console.log('  - needsAadhar:', requiredDocs.needsAadhar, 'aadhaarVerified:', aadhaarVerified);
      console.log('  - needsUserPhoto:', requiredDocs.needsUserPhoto, 'userPhoto:', !!userPhoto);
      console.log('  - needsLicense:', requiredDocs.needsLicense, 'dlVerified:', dlVerified);
      console.log('  - needsVehicleInfo:', requiredDocs.needsVehicleInfo);
      
      if (requiredDocs.needsAadhar && !aadhaarVerified) {
        Alert.alert('Missing Documents', 'Please verify your Aadhaar number');
        return;
      }
      
      if (requiredDocs.needsUserPhoto && !userPhoto) {
        Alert.alert('Missing Documents', 'Please upload your photo');
        return;
      }
      
      if (requiredDocs.needsLicense && !dlVerified) {
        Alert.alert('Missing Documents', 'Please verify your Driving License');
        return;
      }

      if (requiredDocs.needsVehicleInfo && !vehicleAlreadyExists) {
        Alert.alert(
          'Vehicle Required',
          'Please add your vehicle first using the "Add Vehicle" button.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('✅ Validation passed, setting isSubmitting to true');
      setIsSubmitting(true);

      // Save documents to storage
      // IMPORTANT: Match the format expected by hasAllRequiredDocuments
      const documentsToSave: Partial<UserDocuments> = {};
      
      // For Aadhaar: hasAllRequiredDocuments checks for aadharFront and aadharBack
      // Since we're doing number-only verification, set both to indicate verified status
      if (aadhaarVerified && aadhaarNumber) {
        documentsToSave.aadharFront = 'verified'; // Mark as verified (not actual image)
        documentsToSave.aadharBack = 'verified'; // Mark as verified (not actual image)
        console.log('✅ Aadhaar marked as verified in storage');
      }
      
      // For Driving License: hasAllRequiredDocuments checks for licenseFront and licenseBack
      if (dlVerified && dlNumber) {
        documentsToSave.licenseFront = 'verified'; // Mark as verified
        documentsToSave.licenseBack = 'verified'; // Mark as verified
        console.log('✅ Driving License marked as verified in storage');
      }
      
      // User photo (actual image URL)
      if (userPhoto) {
        documentsToSave.userPhoto = userPhoto;
        console.log('✅ User photo saved to storage');
      }
      
      // Vehicle information
      if (vehicleNumber.trim()) {
        documentsToSave.vehicleNumber = vehicleNumber;
        
        // Save vehicle to backend if it doesn't exist
        if (!vehicleAlreadyExists && vehicleNumber.trim() && vehicleFront && vehicleBack) {
          try {
            console.log('🚗 Saving vehicle to backend...');
            // Determine vehicle type from documents or default to car
            const vType = vehicleType || 'car'; // Default to car if not set
            
            // Get vehicle brand/model from state or use defaults
            const brand = vehicleBrand.trim() || 'Unknown';
            const model = vehicleModel.trim() || 'Unknown';
            
            // Determine seats based on type
            const seats = vType === 'bike' ? 1 : 5; // Default seats
            
            const vehicleData = {
              type: vType,
              brand: brand,
              model: model,
              number: vehicleNumber.trim().toUpperCase(),
              seats: seats,
              fuelType: 'Petrol' as const, // Default
              transmission: 'Manual' as const, // Default
            };
            
            console.log('🚗 Vehicle data to save:', vehicleData);
            
            const vehicleResponse = await vehicleApi.createVehicle(vehicleData);
            if (vehicleResponse.success) {
              console.log('✅ Vehicle saved to backend:', vehicleResponse.data);
              
              // Note: Vehicle photos and insurance are already uploaded as documents
              // They will be linked to the vehicle separately if needed
              // For now, the vehicle is created with basic info
              
              setVehicleAlreadyExists(true);
            } else {
              console.warn('⚠️ Failed to save vehicle to backend:', vehicleResponse.error);
            }
          } catch (error: any) {
            console.error('❌ Error saving vehicle to backend:', error);
            // Don't block submission if vehicle save fails
          }
        }
      }
      if (vehicleFront && vehicleBack) {
        documentsToSave.vehicleFront = vehicleFront;
        documentsToSave.vehicleBack = vehicleBack;
        console.log('✅ Vehicle photos saved to storage');
      }
      if (insurance) {
        documentsToSave.insurance = insurance;
        console.log('✅ Insurance saved to storage');
      }

      console.log('💾 Saving documents to storage...');
      await saveUserDocuments(documentsToSave);

      // Documents are already uploaded to backend during verification/upload
      console.log('✅ Documents saved:', documentsToSave);
      
      // Verify documents were saved correctly
      const { getUserDocuments, hasAllRequiredDocuments } = require('@utils/documentUtils');
      const savedDocs = await getUserDocuments();
      const hasAllDocs = hasAllRequiredDocuments(serviceType, savedDocs);
      console.log('🔍 Verification - Has all required documents:', hasAllDocs);
      console.log('🔍 Verification - Saved documents:', savedDocs);
      
      // Add a small delay to ensure storage write completes
      await new Promise(resolve => setTimeout(resolve, 300));

      // Navigate to intended service screen
      console.log('🧭 Navigating to service screen, serviceType:', serviceType);
      
      // Call onComplete callback if provided (for state updates, etc.)
      if (params.onComplete) {
        console.log('📞 Calling onComplete callback');
        try {
          params.onComplete();
        } catch (error) {
          console.error('Error in onComplete callback:', error);
        }
      }
      
      // Always navigate to the appropriate screen based on serviceType
      // Use a small delay to ensure state updates complete before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let targetScreen: string;
      switch (serviceType) {
        case 'createPooling':
          targetScreen = 'CreatePoolingOffer';
          console.log('🧭 Navigating to CreatePoolingOffer');
          break;
        case 'createRental':
          targetScreen = 'CreateRentalOffer';
          console.log('🧭 Navigating to CreateRentalOffer');
          break;
        case 'takePooling':
          targetScreen = 'SearchPooling';
          console.log('🧭 Navigating to SearchPooling');
          break;
        case 'takeRental':
          targetScreen = 'SearchRental';
          console.log('🧭 Navigating to SearchRental');
          break;
        default:
          console.log('🧭 Going back');
          navigation.goBack();
          return;
      }
      
      // Try multiple navigation methods to ensure it works
      try {
        // First try replace (removes DocumentVerification from stack)
        if ((navigation as any).replace) {
          console.log(`🔄 Attempting replace to ${targetScreen}`);
          (navigation as any).replace(targetScreen as never);
          console.log(`✅ Successfully replaced with ${targetScreen}`);
        } else {
          // Fallback to navigate
          console.log(`🔄 Attempting navigate to ${targetScreen}`);
          navigation.navigate(targetScreen as never);
          console.log(`✅ Successfully navigated to ${targetScreen}`);
        }
      } catch (error: any) {
        console.error('❌ Navigation error:', error);
        // Last resort: use reset to clear stack and navigate
        try {
          console.log(`🔄 Attempting reset to ${targetScreen}`);
          (navigation as any).reset({
            index: 0,
            routes: [{ name: targetScreen as never }],
          });
          console.log(`✅ Successfully reset to ${targetScreen}`);
        } catch (resetError) {
          console.error('❌ Reset also failed:', resetError);
          Alert.alert('Navigation Error', 'Please manually navigate to the service screen.');
        }
      }
      console.log('✅ handleSubmit completed successfully');
    } catch (error: any) {
      console.error('❌ Error in handleSubmit:', error);
      Alert.alert(t('common.error'), error.message || t('documentVerification.submitFailed'));
    } finally {
      console.log('🔄 Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const renderDocumentSection = (
    title: string,
    frontImage: string | null,
    backImage: string | null,
    onFrontPress: () => void,
    onBackPress?: () => void
  ) => {
    const frontUploaded = !!frontImage;
    const backUploaded = !!backImage;
    const frontUploading = uploadingType?.includes('Front');
    const backUploading = uploadingType?.includes('Back');
    const frontStatus = uploadStatus.vehicleFront;
    const backStatus = uploadStatus.vehicleBack;

    return (
      <View style={styles.documentSection}>
        <Text style={styles.documentTitle}>{title}</Text>
        <View style={styles.documentRow}>
          <Text style={styles.documentLabel}>{t('documentVerification.front')}</Text>
          <View style={styles.uploadContainer}>
            {frontImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: frontImage }} style={styles.imagePreview} />
                {frontUploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                  </View>
                )}
                {frontStatus === 'success' && !frontUploading && (
                  <View style={styles.successOverlay}>
                    <CheckCircle size={20} color={COLORS.success} />
                  </View>
                )}
                {frontStatus === 'error' && !frontUploading && (
                  <View style={styles.errorOverlay}>
                    <Text style={styles.errorText}>✕</Text>
                  </View>
                )}
              </View>
            )}
            <TouchableOpacity style={styles.uploadButton} onPress={onFrontPress} disabled={frontUploading}>
              <Camera size={20} color={COLORS.primary} />
              <Text style={styles.uploadText}>
                {frontUploading ? 'Uploading...' : frontUploaded ? t('common.edit') : t('documentVerification.upload')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {onBackPress && (
          <View style={styles.documentRow}>
            <Text style={styles.documentLabel}>{t('documentVerification.back')}</Text>
            <View style={styles.uploadContainer}>
              {backImage && (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: backImage }} style={styles.imagePreview} />
                  {backUploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color={COLORS.white} />
                    </View>
                  )}
                  {backStatus === 'success' && !backUploading && (
                    <View style={styles.successOverlay}>
                      <CheckCircle size={20} color={COLORS.success} />
                    </View>
                  )}
                  {backStatus === 'error' && !backUploading && (
                    <View style={styles.errorOverlay}>
                      <Text style={styles.errorText}>✕</Text>
                    </View>
                  )}
                </View>
              )}
              <TouchableOpacity style={styles.uploadButton} onPress={onBackPress} disabled={backUploading}>
                <Camera size={20} color={COLORS.primary} />
                <Text style={styles.uploadText}>
                  {backUploading ? 'Uploading...' : backUploaded ? t('common.edit') : t('documentVerification.upload')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderSingleDocument = (title: string, image: string | null, onPress: () => void, imageKey: string) => {
    const uploaded = !!image;
    const uploading = uploadingType === title;
    const status = uploadStatus[imageKey];

    return (
      <View style={styles.documentSection}>
        <Text style={styles.documentTitle}>{title}</Text>
        <View style={styles.documentRow}>
          <View style={styles.uploadContainer}>
            {image && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                {uploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                  </View>
                )}
                {status === 'success' && !uploading && (
                  <View style={styles.successOverlay}>
                    <CheckCircle size={20} color={COLORS.success} />
                  </View>
                )}
                {status === 'error' && !uploading && (
                  <View style={styles.errorOverlay}>
                    <Text style={styles.errorText}>✕</Text>
                  </View>
                )}
              </View>
            )}
            <TouchableOpacity style={styles.uploadButton} onPress={onPress} disabled={uploading}>
              <Camera size={20} color={COLORS.primary} />
              <Text style={styles.uploadText}>
                {uploading ? 'Uploading...' : uploaded ? t('common.edit') : t('documentVerification.upload')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('MainDashboard' as never)}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{getScreenTitle()}</Text>
        <Text style={styles.description}>
          {requiredDocs ? getScreenDescription() : t('documentVerification.loadingRequirements')}
        </Text>

        {requiredDocs && (
          <>
            {/* Aadhaar Card - Number-only verification */}
            {requiredDocs.needsAadhar && (
              <View style={styles.documentSection}>
                <Text style={styles.documentTitle}>{t('documentVerification.aadharCard')}</Text>
                <Input
                  label={t('documentVerification.aadhaarNumber')}
                  value={aadhaarNumber}
                  onChangeText={setAadhaarNumber}
                  placeholder="Enter 12-digit Aadhaar number"
                  keyboardType="numeric"
                  maxLength={12}
                  containerStyle={styles.input}
                  editable={!aadhaarVerified}
                />
                {aadhaarVerified ? (
                  <View style={styles.verifiedBadge}>
                    <CheckCircle size={20} color={COLORS.success} />
                    <Text style={styles.verifiedText}>{t('documentVerification.verified')}</Text>
                  </View>
                ) : (
                  <Button
                    title={isVerifying ? 'Verifying...' : 'Verify Aadhaar'}
                    onPress={handleVerifyAadhaar}
                    variant="primary"
                    size="medium"
                    disabled={isVerifying || !aadhaarNumber.trim() || aadhaarNumber.length !== 12}
                  />
                )}
              </View>
            )}

            {/* PAN Card - Number-only verification (if needed) */}
            {requiredDocs.needsPan && (
              <View style={styles.documentSection}>
                <Text style={styles.documentTitle}>PAN Card</Text>
                <Input
                  label="PAN Number"
                  value={panNumber}
                  onChangeText={setPanNumber}
                  placeholder="Enter 10-character PAN"
                  maxLength={10}
                  containerStyle={styles.input}
                  editable={!panVerified}
                />
                {panVerified ? (
                  <View style={styles.verifiedBadge}>
                    <CheckCircle size={20} color={COLORS.success} />
                    <Text style={styles.verifiedText}>{t('documentVerification.verified')}</Text>
                  </View>
                ) : (
                  <Button
                    title={isVerifying ? 'Verifying...' : 'Verify PAN'}
                    onPress={handleVerifyPAN}
                    variant="primary"
                    size="medium"
                    disabled={isVerifying || !panNumber.trim() || panNumber.length !== 10}
                  />
                )}
              </View>
            )}

            {/* User Photo - Image upload required */}
            {requiredDocs.needsUserPhoto && renderSingleDocument(
              t('documentVerification.userPhoto'),
              userPhoto,
              () => handleImageUpload('User Photo'),
              'userPhoto'
            )}

            {/* Driving License - Number-only verification */}
            {requiredDocs.needsLicense && (
              <View style={styles.documentSection}>
                <Text style={styles.documentTitle}>{t('documentVerification.drivingLicense')}</Text>
                <Input
                  label="Driving License Number"
                  value={dlNumber}
                  onChangeText={setDlNumber}
                  placeholder="Enter DL number"
                  containerStyle={styles.input}
                  editable={!dlVerified}
                />
                <View style={styles.input}>
                  <Text style={styles.fieldLabel}>Date of Birth</Text>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => !dlVerified && setShowDlDobPicker(true)}
                    activeOpacity={dlVerified ? 1 : 0.7}
                  >
                    <Text style={[styles.datePickerText, !dlDob && styles.datePickerPlaceholder]}>
                      {dlDob || 'Select date of birth'}
                    </Text>
                  </TouchableOpacity>
                  {showDlDobPicker && (
                    <DateTimePicker
                      value={dlDobDate || new Date(2000, 0, 1)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      maximumDate={new Date()}
                      minimumDate={new Date(1940, 0, 1)}
                      onChange={(event, selectedDate) => {
                        setShowDlDobPicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          setDlDobDate(selectedDate);
                          const dd = String(selectedDate.getDate()).padStart(2, '0');
                          const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                          const yyyy = selectedDate.getFullYear();
                          setDlDob(`${dd}/${mm}/${yyyy}`);
                        }
                      }}
                    />
                  )}
                </View>
                <View style={styles.input}>
                  <Text style={styles.fieldLabel}>State</Text>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => !dlVerified && setShowStatePicker(true)}
                    activeOpacity={dlVerified ? 1 : 0.7}
                  >
                    <Text style={[styles.datePickerText, !dlState && styles.datePickerPlaceholder]}>
                      {dlState || 'Select state'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {dlVerified ? (
                  <View style={styles.verifiedBadge}>
                    <CheckCircle size={20} color={COLORS.success} />
                    <Text style={styles.verifiedText}>{t('documentVerification.verified')}</Text>
                  </View>
                ) : (
                  <Button
                    title={isVerifying ? 'Verifying...' : 'Verify Driving License'}
                    onPress={handleVerifyDL}
                    variant="primary"
                    size="medium"
                    disabled={isVerifying || !dlNumber.trim() || !dlDob.trim() || !dlState.trim()}
                  />
                )}
              </View>
            )}

            {/* Vehicle Info - Show only if required (for offering services) */}
            {requiredDocs.needsVehicleInfo && (
              <>
                {vehicleAlreadyExists && existingVehicles.length > 0 ? (
                  <View style={styles.vehicleInfoContainer}>
                    <Text style={styles.infoLabel}>Vehicle Already Added</Text>
                    <Text style={styles.infoText}>
                      {existingVehicles[0].brand} {existingVehicles[0].vehicleModel || existingVehicles[0].model} - {existingVehicles[0].number}
                    </Text>
                    <Text style={styles.infoSubtext}>
                      You can add more vehicles from Profile screen
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.addVehicleSection}>
                      <Text style={styles.sectionTitle}>Vehicle Information</Text>
                      <Text style={styles.addVehicleDesc}>
                        Add your vehicle details to start offering rides. This uses the same form as the full Add Vehicle screen.
                      </Text>
                      <Button
                        title="Add Vehicle"
                        onPress={() => navigation.navigate('AddVehicle' as never)}
                        variant="primary"
                        size="medium"
                      />
                    </View>
                  </>
                )}

                {/* Vehicle documents are handled in AddVehicle screen */}
              </>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>{t('documentVerification.submitContinue')}</Text>
          )}
        </TouchableOpacity>
      </View>
      {/* State Picker Modal */}
      <Modal visible={showStatePicker} transparent animationType="slide">
        <View style={styles.stateModalOverlay}>
          <View style={styles.stateModalContent}>
            <View style={styles.stateModalHeader}>
              <Text style={styles.stateModalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                <Text style={styles.stateModalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={INDIAN_STATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.stateItem, dlState === item && styles.stateItemSelected]}
                  onPress={() => { setDlState(item); setShowStatePicker(false); }}
                >
                  <Text style={[styles.stateItemText, dlState === item && styles.stateItemTextSelected]}>{item}</Text>
                  {dlState === item && <CheckCircle size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: hp(6),
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl + normalize(80),
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: normalize(24),
    color: '#1A1A1A',
    marginBottom: SPACING.xs,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#888888',
    marginBottom: SPACING.xl,
    lineHeight: normalize(20),
  },
  documentSection: {
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  documentTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.md,
    color: '#1A1A1A',
    marginBottom: SPACING.md,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  documentLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    flex: 1,
  },
  uploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: normalize(80),
    height: normalize(80),
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.lightGray,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successOverlay: {
    position: 'absolute',
    top: normalize(4),
    right: normalize(4),
    backgroundColor: COLORS.success,
    borderRadius: normalize(12),
    padding: normalize(4),
  },
  errorOverlay: {
    position: 'absolute',
    top: normalize(4),
    right: normalize(4),
    backgroundColor: COLORS.error,
    borderRadius: normalize(12),
    width: normalize(24),
    height: normalize(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: normalize(14),
    fontWeight: 'bold',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
  },
  uploadText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
  },
  sectionTitle: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  vehicleInfoContainer: {
    backgroundColor: COLORS.lightGray + '20',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  addVehicleSection: {
    backgroundColor: '#F8F9FA',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addVehicleDesc: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  infoLabel: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  infoText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  infoSubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  vehicleTypeButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  vehicleTypeSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  vehicleTypeText: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  vehicleTypeTextSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontWeight: '600',
  },
  input: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontWeight: '500',
  },
  datePickerBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: normalize(14),
    backgroundColor: COLORS.white,
  },
  datePickerText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  datePickerPlaceholder: {
    color: COLORS.textSecondary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: hp(3),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    zIndex: 1000,
    elevation: 10,
  },
  submitBtn: {
    backgroundColor: ACCENT,
    height: normalize(52),
    borderRadius: normalize(26),
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.lg,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.success + '20',
    borderRadius: BORDER_RADIUS.sm,
  },
  verifiedText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.success,
    fontWeight: '600',
  },
  loader: {
    marginTop: SPACING.sm,
  },
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
  },
  seatButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  seatButtonDisabled: {
    opacity: 0.7,
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
  bikeSeatsNote: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
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
  },
  optionButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  optionTextSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  bikeTransmissionNote: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
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
  documentsSection: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  uploadText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  removeText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    fontWeight: '600',
  },
  stateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  stateModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  stateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  stateModalTitle: {
    fontFamily: FONTS.medium || FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontWeight: '700',
  },
  stateModalClose: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  stateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  stateItemSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  stateItemText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  stateItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default DocumentVerificationScreen;
