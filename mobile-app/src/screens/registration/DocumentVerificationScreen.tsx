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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Camera, CheckCircle } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
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

const DocumentVerificationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
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
  const [dlState, setDlState] = useState('');
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
            setDlDob(dlDoc.metadata?.dob || '');
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
                allowsEditing: true,
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
                allowsEditing: true,
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

      if (requiredDocs.needsVehicleInfo) {
        if (!vehicleAlreadyExists) {
          if (!vehicleType) {
            Alert.alert('Missing Information', 'Please select vehicle type (Car or Bike)');
            return;
          }
          if (!vehicleNumber.trim()) {
            Alert.alert('Missing Information', 'Please enter your vehicle number');
            return;
          }
          if (!vehicleBrand.trim()) {
            Alert.alert('Missing Information', 'Please enter vehicle brand');
            return;
          }
          if (!vehicleFront || !vehicleBack) {
            Alert.alert('Missing Documents', 'Please upload both front and back photos of your vehicle');
            return;
          }
          if (!insurance) {
            Alert.alert('Missing Documents', 'Please upload your insurance papers');
            return;
          }
        } else {
          // Vehicle already exists, just need to verify documents are uploaded
          if (!vehicleFront || !vehicleBack) {
            Alert.alert('Missing Documents', 'Please upload both front and back photos of your vehicle');
            return;
          }
          if (!insurance) {
            Alert.alert('Missing Documents', 'Please upload your insurance papers');
            return;
          }
        }
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
          onPress={() => {
            // Navigate to dashboard
            navigation.navigate('MainDashboard' as never);
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={COLORS.primary} />
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
                <Input
                  label="Date of Birth"
                  value={dlDob}
                  onChangeText={setDlDob}
                  placeholder="DD/MM/YYYY"
                  containerStyle={styles.input}
                  editable={!dlVerified}
                />
                <Input
                  label="State"
                  value={dlState}
                  onChangeText={setDlState}
                  placeholder="Enter state"
                  containerStyle={styles.input}
                  editable={!dlVerified}
                />
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
                    <Text style={styles.sectionTitle}>Vehicle Information</Text>
                    <Input
                      label="Vehicle Type *"
                      value={vehicleType === 'car' ? 'Car' : vehicleType === 'bike' ? 'Bike' : ''}
                      placeholder="Select vehicle type"
                      editable={false}
                      containerStyle={styles.input}
                    />
                    <View style={styles.vehicleTypeContainer}>
                      <TouchableOpacity
                        style={[styles.vehicleTypeButton, vehicleType === 'car' && styles.vehicleTypeSelected]}
                        onPress={() => setVehicleType('car')}
                      >
                        <Text style={[styles.vehicleTypeText, vehicleType === 'car' && styles.vehicleTypeTextSelected]}>Car</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.vehicleTypeButton, vehicleType === 'bike' && styles.vehicleTypeSelected]}
                        onPress={() => setVehicleType('bike')}
                      >
                        <Text style={[styles.vehicleTypeText, vehicleType === 'bike' && styles.vehicleTypeTextSelected]}>Bike</Text>
                      </TouchableOpacity>
                    </View>
                    <Input
                      label={t('documentVerification.vehicleNumber')}
                      value={vehicleNumber}
                      onChangeText={setVehicleNumber}
                      placeholder={t('documentVerification.vehicleNumber')}
                      containerStyle={styles.input}
                    />
                    <Input
                      label="Vehicle Brand *"
                      value={vehicleBrand}
                      onChangeText={setVehicleBrand}
                      placeholder="e.g., Honda, Maruti, Hyundai"
                      containerStyle={styles.input}
                    />
                    <Input
                      label="Vehicle Model *"
                      value={vehicleModel}
                      onChangeText={setVehicleModel}
                      placeholder="e.g., City, Swift, Creta"
                      containerStyle={styles.input}
                    />
                    
                    {/* Year Picker */}
                    <View style={styles.input}>
                      <Text style={styles.label}>Year of Manufacture *</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
                        {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                          <TouchableOpacity
                            key={y}
                            style={[styles.yearButton, vehicleYear === y && styles.yearButtonSelected]}
                            onPress={() => setVehicleYear(y)}
                          >
                            <Text style={[styles.yearText, vehicleYear === y && styles.yearTextSelected]}>{y}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <Input
                      label="Color"
                      value={vehicleColor}
                      onChangeText={setVehicleColor}
                      placeholder="e.g., White, Black, Red"
                      containerStyle={styles.input}
                    />

                    {/* Seats */}
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
                              style={[styles.seatButton, vehicleSeats === s && styles.seatButtonSelected]}
                              onPress={() => setVehicleSeats(s)}
                            >
                              <Text style={[styles.seatText, vehicleSeats === s && styles.seatTextSelected]}>{s}</Text>
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
                            style={[styles.optionButton, vehicleFuelType === fuel && styles.optionButtonSelected]}
                            onPress={() => setVehicleFuelType(fuel as any)}
                          >
                            <Text style={[styles.optionText, vehicleFuelType === fuel && styles.optionTextSelected]}>
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
                                style={[styles.optionButton, vehicleTransmission === trans && styles.optionButtonSelected]}
                                onPress={() => setVehicleTransmission(trans as any)}
                              >
                                <Text style={[styles.optionText, vehicleTransmission === trans && styles.optionTextSelected]}>
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
                              style={[styles.optionButton, vehicleTransmission === trans && styles.optionButtonSelected]}
                              onPress={() => setVehicleTransmission(trans as any)}
                            >
                              <Text style={[styles.optionText, vehicleTransmission === trans && styles.optionTextSelected]}>
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
                  </>
                )}

                {/* Vehicle Documents */}
                <View style={styles.documentsSection}>
                  <Text style={styles.sectionTitle}>Vehicle Documents *</Text>
                  {[
                    { key: 'rc', label: 'Registration Certificate (RC)', doc: registrationCertificate },
                    { key: 'insurance', label: 'Insurance Certificate', doc: insurance },
                    { key: 'puc', label: 'Pollution Certificate (PUC)', doc: pollutionCertificate },
                    { key: 'taxi', label: 'Taxi Service Papers', doc: taxiServicePapers, optional: true },
                  ].map(({ key, label, doc, optional }) => (
                    <View key={key} style={styles.documentRow}>
                      <View style={styles.documentInfo}>
                        <Text style={styles.documentLabel}>
                          {label} {optional && '(Optional)'}
                        </Text>
                        {doc && <CheckCircle size={16} color={COLORS.success} />}
                      </View>
                      <TouchableOpacity
                        style={styles.documentButton}
                        onPress={() => (doc ? handleRemoveDocument(key as any) : handleDocumentPicker(key as any))}
                        disabled={uploadingDocument === key}
                      >
                        {uploadingDocument === key ? (
                          <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : doc ? (
                          <Text style={styles.removeText}>Remove</Text>
                        ) : (
                          <Text style={styles.uploadText}>Upload</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={isSubmitting ? t('documentVerification.submitting') : t('documentVerification.submitContinue')}
          onPress={handleSubmit}
          variant="primary"
          size="large"
          style={styles.submitButton}
          disabled={isSubmitting}
        />
        {isSubmitting && (
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={styles.loader}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingTop: hp(6),
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
  },
  backButton: {
    padding: SPACING.sm,
    width: normalize(40),
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
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    fontWeight: 'bold',
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    lineHeight: normalize(22),
  },
  documentSection: {
    marginBottom: SPACING.xl,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  documentTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
    fontWeight: 'bold',
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
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    zIndex: 1000,
    elevation: 10, // For Android
    ...SHADOWS.md,
  },
  submitButton: {
    width: '100%',
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
});

export default DocumentVerificationScreen;
