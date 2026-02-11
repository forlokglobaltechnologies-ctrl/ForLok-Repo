import { documentApi, vehicleApi } from './apiClient';

export interface UserDocuments {
  aadharFront?: string | null;
  aadharBack?: string | null;
  userPhoto?: string | null;
  licenseFront?: string | null;
  licenseBack?: string | null;
  vehicleNumber?: string | null;
  vehicleFront?: string | null;
  vehicleBack?: string | null;
  insurance?: string | null;
}

/**
 * Get user documents from backend API
 */
export const getUserDocuments = async (): Promise<UserDocuments | null> => {
  try {
    console.log('📥 Fetching documents from backend API...');
    
    // Fetch documents from backend API
    const response = await documentApi.getUserDocuments();
    
    console.log('📥 Documents API response:', {
      success: response.success,
      dataLength: response.data?.length || 0,
      data: response.data,
      error: response.error,
    });
    
    if (!response.success || !response.data || response.data.length === 0) {
      console.log('⚠️ No documents found in backend');
      return null;
    }
    
    const backendDocs = response.data;
    const documents: UserDocuments = {};
    
    // Map backend documents to local format
    // Find Aadhaar documents
    const aadhaarFrontDoc = backendDocs.find((d: any) => d.type === 'aadhar_front' && d.status === 'verified');
    const aadhaarBackDoc = backendDocs.find((d: any) => d.type === 'aadhar_back' && d.status === 'verified');
    if (aadhaarFrontDoc && aadhaarBackDoc) {
      documents.aadharFront = aadhaarFrontDoc.status === 'verified' ? 'verified' : null;
      documents.aadharBack = aadhaarBackDoc.status === 'verified' ? 'verified' : null;
    }
    
    // Find Driving License documents
    const licenseFrontDoc = backendDocs.find((d: any) => d.type === 'driving_license_front' && d.status === 'verified');
    const licenseBackDoc = backendDocs.find((d: any) => d.type === 'driving_license_back' && d.status === 'verified');
    if (licenseFrontDoc && licenseBackDoc) {
      documents.licenseFront = licenseFrontDoc.status === 'verified' ? 'verified' : null;
      documents.licenseBack = licenseBackDoc.status === 'verified' ? 'verified' : null;
    }
    
    // Find user photo
    const userPhotoDoc = backendDocs.find((d: any) => d.type === 'user_photo' && d.url);
    if (userPhotoDoc && userPhotoDoc.url) {
      documents.userPhoto = userPhotoDoc.url;
    }
    
    // Find vehicle documents
    const vehicleFrontDoc = backendDocs.find((d: any) => d.type === 'vehicle_front' && d.url);
    const vehicleBackDoc = backendDocs.find((d: any) => d.type === 'vehicle_back' && d.url);
    const insuranceDoc = backendDocs.find((d: any) => d.type === 'vehicle_insurance' && d.url);
    
    if (vehicleFrontDoc && vehicleFrontDoc.url) documents.vehicleFront = vehicleFrontDoc.url;
    if (vehicleBackDoc && vehicleBackDoc.url) documents.vehicleBack = vehicleBackDoc.url;
    if (insuranceDoc && insuranceDoc.url) documents.insurance = insuranceDoc.url;
    
    // Check for vehicles in backend - if vehicle exists, set vehicleNumber
    try {
      const vehiclesResponse = await vehicleApi.getVehicles();
      if (vehiclesResponse.success && vehiclesResponse.data && vehiclesResponse.data.length > 0) {
        const firstVehicle = vehiclesResponse.data[0];
        if (firstVehicle && firstVehicle.number) {
          documents.vehicleNumber = firstVehicle.number;
          console.log('✅ Found vehicle in backend:', firstVehicle.number);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch vehicles:', error);
    }
    
    console.log('✅ Mapped documents:', documents);
    return documents;
  } catch (error) {
    console.error('❌ Error getting user documents:', error);
    return null;
  }
};

/**
 * Save user documents to storage
 * In production, replace with actual API call or AsyncStorage
 */
export const saveUserDocuments = async (documents: Partial<UserDocuments>): Promise<void> => {
  try {
    // TODO: Replace with actual storage/API call
    // Example with AsyncStorage:
    // const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    // const existing = await getUserDocuments();
    // const updated = { ...existing, ...documents };
    // await AsyncStorage.setItem('@user_documents', JSON.stringify(updated));
    
    // For now, using in-memory storage
    userDocumentsStorage = { ...userDocumentsStorage, ...documents };
  } catch (error) {
    console.error('Error saving user documents:', error);
  }
};

/**
 * Check what documents are required and missing for a service type
 */
export interface RequiredDocuments {
  needsAadhar: boolean;
  needsLicense: boolean;
  needsUserPhoto: boolean;
  needsVehicleInfo: boolean;
}

export const getRequiredDocuments = (
  serviceType: 'createPooling' | 'createRental' | 'takePooling' | 'takeRental',
  existingDocuments: UserDocuments | null
): RequiredDocuments => {
  const hasAadhar = existingDocuments?.aadharFront && existingDocuments?.aadharBack;
  const hasLicense = existingDocuments?.licenseFront && existingDocuments?.licenseBack;
  const hasUserPhoto = !!existingDocuments?.userPhoto;
  const hasVehicleInfo =
    existingDocuments?.vehicleNumber &&
    existingDocuments?.vehicleFront &&
    existingDocuments?.vehicleBack &&
    existingDocuments?.insurance;

  switch (serviceType) {
    case 'createPooling':
      // Offering Pooling: Needs Aadhar + License
      return {
        needsAadhar: !hasAadhar,
        needsLicense: !hasLicense,
        needsUserPhoto: !hasUserPhoto,
        needsVehicleInfo: !hasVehicleInfo,
      };

    case 'createRental':
      // Offering Rental: Needs only Aadhar
      return {
        needsAadhar: !hasAadhar,
        needsLicense: false,
        needsUserPhoto: !hasUserPhoto,
        needsVehicleInfo: !hasVehicleInfo,
      };

    case 'takePooling':
      // Taking Pooling: Needs only Aadhar
      return {
        needsAadhar: !hasAadhar,
        needsLicense: false,
        needsUserPhoto: !hasUserPhoto,
        needsVehicleInfo: false,
      };

    case 'takeRental':
      // Taking Rental: Needs Aadhar + License
      return {
        needsAadhar: !hasAadhar,
        needsLicense: !hasLicense,
        needsUserPhoto: !hasUserPhoto,
        needsVehicleInfo: false,
      };

    default:
      return {
        needsAadhar: true,
        needsLicense: true,
        needsUserPhoto: true,
        needsVehicleInfo: true,
      };
  }
};

/**
 * Check if user has all required documents for a service type
 */
export const hasAllRequiredDocuments = (
  serviceType: 'createPooling' | 'createRental' | 'takePooling' | 'takeRental',
  existingDocuments: UserDocuments | null
): boolean => {
  const required = getRequiredDocuments(serviceType, existingDocuments);
  return (
    !required.needsAadhar &&
    !required.needsLicense &&
    !required.needsUserPhoto &&
    !required.needsVehicleInfo
  );
};
