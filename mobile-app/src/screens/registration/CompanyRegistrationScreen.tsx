import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ArrowLeft, Circle, Camera, Check, X, FileText } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { PhoneInput } from '@components/common/PhoneInput';
import { useLanguage } from '@context/LanguageContext';
import { authApi, companyApi, uploadFile } from '@utils/apiClient';

const CompanyRegistrationScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Company Details
  const [companyName, setCompanyName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  
  // Phone verification
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  
  // Email verification
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  // Document uploads (Step 2)
  const [registrationCertificate, setRegistrationCertificate] = useState<string | null>(null);
  const [gstCertificate, setGstCertificate] = useState<string | null>(null);
  const [businessLicense, setBusinessLicense] = useState<string | null>(null);
  
  // Upload status tracking
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'success' | 'error' | null>>({});
  const [documentMimeTypes, setDocumentMimeTypes] = useState<Record<string, string>>({});

  // Step 3: Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendPhoneOtp = async () => {
    if (!contactNumber || contactNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    
    setPhoneLoading(true);
    try {
      const formattedPhone = `+91${contactNumber}`;
      const response = await authApi.sendOTP(formattedPhone, 'verify_phone');
      
      if (response.success) {
        setPhoneOtpSent(true);
        setPhoneOtp('');
        if (response.data?.otp) {
          Alert.alert(
            'OTP Sent',
            `Your OTP is: ${response.data.otp}\n\n(Displayed for development)`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Error', response.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    
    setPhoneVerifying(true);
    try {
      const formattedPhone = `+91${contactNumber}`;
      const response = await authApi.verifyOTP(formattedPhone, phoneOtp, 'verify_phone');
      
      if (response.success) {
        setPhoneVerified(true);
        Alert.alert('Success', 'Phone number verified successfully');
      } else {
        Alert.alert('Error', response.error || 'Invalid OTP');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify OTP');
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
    setEmailLoading(true);
    try {
      const response = await authApi.sendEmailOTP(email, 'verify_email');
      
      if (response.success) {
        setEmailOtpSent(true);
        setEmailOtp('');
        if (response.data?.otp) {
          Alert.alert(
            'OTP Sent',
            `Your OTP is: ${response.data.otp}\n\n(Displayed for development)`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Success', 'OTP sent to your email');
        }
      } else {
        Alert.alert('Error', response.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    
    setEmailVerifying(true);
    try {
      const response = await authApi.verifyOTP(email, emailOtp, 'verify_email');
      
      if (response.success) {
        setEmailVerified(true);
        Alert.alert('Success', 'Email verified successfully');
      } else {
        Alert.alert('Error', response.error || 'Invalid OTP');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify OTP');
    } finally {
      setEmailVerifying(false);
    }
  };

  // Request camera and media library permissions
  React.useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and media library permissions are required to upload documents.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []);

  const handleDocumentPicker = async (type: 'registration' | 'gst' | 'license') => {
    try {
      Alert.alert(
        'Select Document',
        'Choose an option',
        [
          {
            text: 'Camera (Image)',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                const mimeType = result.assets[0].mimeType || 'image/jpeg';
                if (type === 'registration') {
                  setRegistrationCertificate(uri);
                  setDocumentMimeTypes(prev => ({ ...prev, registration: mimeType }));
                } else if (type === 'gst') {
                  setGstCertificate(uri);
                  setDocumentMimeTypes(prev => ({ ...prev, gst: mimeType }));
                } else if (type === 'license') {
                  setBusinessLicense(uri);
                  setDocumentMimeTypes(prev => ({ ...prev, license: mimeType }));
                }
                // Upload immediately
                await uploadDocumentToCloudinary(type, uri, mimeType);
              }
            },
          },
          {
            text: 'Gallery (Image)',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                const mimeType = result.assets[0].mimeType || 'image/jpeg';
                if (type === 'registration') {
                  setRegistrationCertificate(uri);
                  setDocumentMimeTypes(prev => ({ ...prev, registration: mimeType }));
                } else if (type === 'gst') {
                  setGstCertificate(uri);
                  setDocumentMimeTypes(prev => ({ ...prev, gst: mimeType }));
                } else if (type === 'license') {
                  setBusinessLicense(uri);
                  setDocumentMimeTypes(prev => ({ ...prev, license: mimeType }));
                }
                // Upload immediately
                await uploadDocumentToCloudinary(type, uri, mimeType);
              }
            },
          },
          {
            text: 'Select PDF',
            onPress: async () => {
              try {
                const result = await DocumentPicker.getDocumentAsync({
                  type: ['application/pdf'],
                  copyToCacheDirectory: true,
                });

                if (!result.canceled && result.assets && result.assets[0]) {
                  const uri = result.assets[0].uri;
                  const mimeType = result.assets[0].mimeType || 'application/pdf';
                  
                  if (type === 'registration') {
                    setRegistrationCertificate(uri);
                    setDocumentMimeTypes(prev => ({ ...prev, registration: mimeType }));
                  } else if (type === 'gst') {
                    setGstCertificate(uri);
                    setDocumentMimeTypes(prev => ({ ...prev, gst: mimeType }));
                  } else if (type === 'license') {
                    setBusinessLicense(uri);
                    setDocumentMimeTypes(prev => ({ ...prev, license: mimeType }));
                  }
                  // Upload immediately
                  await uploadDocumentToCloudinary(type, uri, mimeType);
                }
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to pick PDF document');
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open document picker');
    }
  };

  const uploadDocumentToCloudinary = async (type: 'registration' | 'gst' | 'license', uri: string, mimeType: string) => {
    try {
      setUploadingDoc(type);
      setUploadStatus(prev => ({ ...prev, [type]: null }));

      // Determine document type for backend
      let documentType = 'company_registration';
      if (type === 'gst') documentType = 'gst_certificate';
      if (type === 'license') documentType = 'business_license';

      // Determine file extension and name
      const isPDF = mimeType === 'application/pdf' || uri.toLowerCase().endsWith('.pdf');
      const fileExtension = isPDF ? 'pdf' : 'jpg';
      const fileName = `${documentType}_${Date.now()}.${fileExtension}`;

      console.log(`📤 Uploading ${type} document:`, { documentType, mimeType, fileName, uri: uri.substring(0, 50) + '...' });

      // Upload file to backend
      const response = await uploadFile(
        `/api/documents/upload?type=${documentType}`,
        {
          uri,
          type: mimeType,
          name: fileName,
        }
      );

      console.log(`📥 Upload response for ${type}:`, {
        success: response.success,
        hasData: !!response.data,
        url: response.data?.url || response.data?.secure_url,
        error: response.error,
        fullResponse: response.data,
      });

      if (response.success && response.data) {
        // Update state with Cloudinary URL
        const cloudinaryUrl = response.data.url || response.data.secure_url || response.data.data?.url;
        if (cloudinaryUrl) {
          if (type === 'registration') {
            setRegistrationCertificate(cloudinaryUrl);
          } else if (type === 'gst') {
            setGstCertificate(cloudinaryUrl);
          } else if (type === 'license') {
            setBusinessLicense(cloudinaryUrl);
          }
          
          setUploadStatus(prev => ({ ...prev, [type]: 'success' }));
          console.log(`✅ ${type} uploaded successfully: ${cloudinaryUrl}`);
          Alert.alert('✅ Success', `${type === 'registration' ? 'Registration Certificate' : type === 'gst' ? 'GST Certificate' : 'Business License'} uploaded to Cloudinary successfully!`);
        } else {
          console.error(`❌ No URL in response for ${type}:`, response.data);
          setUploadStatus(prev => ({ ...prev, [type]: 'error' }));
          Alert.alert('❌ Upload Failed', 'Document uploaded but no URL returned. Please try again.');
        }
      } else {
        console.error(`❌ Upload failed for ${type}:`, response.error);
        setUploadStatus(prev => ({ ...prev, [type]: 'error' }));
        Alert.alert('❌ Upload Failed', response.error || `Failed to upload ${type === 'registration' ? 'Registration Certificate' : type === 'gst' ? 'GST Certificate' : 'Business License'} to Cloudinary`);
      }
    } catch (error: any) {
      console.error(`❌ Upload error for ${type}:`, error);
      setUploadStatus(prev => ({ ...prev, [type]: 'error' }));
      Alert.alert('❌ Upload Failed', error.message || `Failed to upload ${type === 'registration' ? 'Registration Certificate' : type === 'gst' ? 'GST Certificate' : 'Business License'}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleRemoveImage = (type: 'registration' | 'gst' | 'license') => {
    if (type === 'registration') {
      setRegistrationCertificate(null);
      setDocumentMimeTypes(prev => {
        const newTypes = { ...prev };
        delete newTypes.registration;
        return newTypes;
      });
      setUploadStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus.registration;
        return newStatus;
      });
    } else if (type === 'gst') {
      setGstCertificate(null);
      setDocumentMimeTypes(prev => {
        const newTypes = { ...prev };
        delete newTypes.gst;
        return newTypes;
      });
      setUploadStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus.gst;
        return newStatus;
      });
    } else if (type === 'license') {
      setBusinessLicense(null);
      setDocumentMimeTypes(prev => {
        const newTypes = { ...prev };
        delete newTypes.license;
        return newTypes;
      });
      setUploadStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus.license;
        return newStatus;
      });
    }
  };

  const [registering, setRegistering] = useState(false);

  const handleNext = async () => {
    if (currentStep === 1) {
      // Check if phone and email are verified
      if (!phoneVerified || !emailVerified) {
        Alert.alert('Verification Required', 'Please verify both phone number and email before continuing');
        return;
      }
      // Validate required fields
      if (!companyName.trim() || !registrationNumber.trim() || !businessType.trim() || 
          !address.trim() || !city.trim() || !state.trim() || !pincode.trim() || pincode.length !== 6) {
        Alert.alert('Validation Error', 'Please fill in all required fields including city, state, and a valid 6-digit pincode');
        return;
      }
      setCurrentStep(2);
      return;
    }
    
    if (currentStep === 2) {
      // Check if all documents are uploaded
      if (!registrationCertificate || !gstCertificate || !businessLicense) {
        Alert.alert('Documents Required', 'Please upload all required documents before continuing');
        return;
      }
      setCurrentStep(3);
      return;
    }
    
    if (currentStep === 3) {
      // Final step - Register company
      await handleRegisterCompany();
    }
  };

  const handleRegisterCompany = async () => {
    // Validate all fields
    if (!companyName.trim() || !registrationNumber.trim() || !businessType.trim() || 
        !address.trim() || !contactNumber || !email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!password || password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    // Check password requirements
    if (!/[A-Z]/.test(password)) {
      Alert.alert('Error', 'Password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(password)) {
      Alert.alert('Error', 'Password must contain at least one lowercase letter');
      return;
    }
    if (!/[0-9]/.test(password)) {
      Alert.alert('Error', 'Password must contain at least one number');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setRegistering(true);
    try {
      // Step 1: Register user with company type
      const formattedPhone = `+91${contactNumber}`;
      const signupData = {
        phone: formattedPhone,
        name: companyName.trim(),
        userType: 'company' as const, // Register as company
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      };
      
      console.log('📱 [COMPANY REG] Sending signup request with userType:', signupData.userType);
      console.log('📱 [COMPANY REG] Full signup data:', JSON.stringify({ ...signupData, password: '***', confirmPassword: '***' }, null, 2));
      
      const userResponse = await authApi.signup(signupData);
      
      console.log('📱 [COMPANY REG] Signup response:', userResponse);
      console.log('📱 [COMPANY REG] User userType in response:', userResponse.data?.user?.userType);

      if (!userResponse.success || !userResponse.data?.user?.userId) {
        Alert.alert('Error', userResponse.error || 'Failed to register user');
        return;
      }

      const userId = userResponse.data.user.userId;
      
      // Save tokens for authenticated requests
      if (userResponse.data?.tokens?.accessToken) {
        // Tokens are automatically saved by apiService
      }

      // Step 2: Documents are already uploaded to Cloudinary during selection
      // Just extract the URLs (they should already be Cloudinary URLs if upload was successful)
      const documentUrls: { registrationCertificate?: string; gstCertificate?: string; businessLicense?: string } = {};
      
      if (registrationCertificate && registrationCertificate.startsWith('http')) {
        documentUrls.registrationCertificate = registrationCertificate;
      }
      if (gstCertificate && gstCertificate.startsWith('http')) {
        documentUrls.gstCertificate = gstCertificate;
      }
      if (businessLicense && businessLicense.startsWith('http')) {
        documentUrls.businessLicense = businessLicense;
      }
      
      // If any document failed to upload, warn user but allow registration to continue
      const failedUploads = Object.entries(uploadStatus).filter(([_, status]) => status === 'error');
      if (failedUploads.length > 0) {
        Alert.alert(
          'Upload Warning',
          'Some documents failed to upload. You can upload them later from your profile.',
          [{ text: 'Continue Registration', onPress: () => {} }]
        );
      }

      // Step 3: Register company
      if (!city.trim() || !state.trim() || !pincode.trim() || pincode.length !== 6) {
        Alert.alert('Error', 'Please fill in city, state, and a valid 6-digit pincode');
        return;
      }

      const companyResponse = await companyApi.register({
        userId,
        companyName: companyName.trim(),
        registrationNumber: registrationNumber.trim(),
        businessType: businessType.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        contactNumber: formattedPhone,
        email: email,
        username: companyName.toLowerCase().replace(/\s+/g, '_'),
        password: password,
        documents: documentUrls,
      });

      if (companyResponse.success) {
        // Check userType and redirect accordingly
        const userType = userResponse.data?.user?.userType || 'individual';
        
        Alert.alert(
          'Success',
          `Company registered successfully!\n\nYour Company ID: ${companyResponse.data?.companyId || 'N/A'}\nYour User ID: ${userId}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Redirect to company dashboard if userType is company
                if (userType === 'company') {
                  navigation.navigate('CompanyDashboard' as never);
                } else {
                  navigation.navigate('VerificationPending' as never);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', companyResponse.error || 'Failed to register company');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message || 'Failed to complete registration');
    } finally {
      setRegistering(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const renderProgressBar = () => {
    const progress = (currentStep / totalSteps) * 100;
    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>{t('companyRegistration.step').replace('{current}', String(currentStep)).replace('{total}', String(totalSteps))}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
    );
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>{t('companyRegistration.step1Title')}</Text>
      <Input
        label={t('companyRegistration.companyName')}
        value={companyName}
        onChangeText={setCompanyName}
        placeholder={t('companyRegistration.enterCompanyName')}
        containerStyle={styles.input}
      />
      <Input
        label={t('companyRegistration.registrationNumber')}
        value={registrationNumber}
        onChangeText={setRegistrationNumber}
        placeholder={t('companyRegistration.enterRegistrationNumber')}
        containerStyle={styles.input}
      />
      <Input
        label={t('companyRegistration.businessType')}
        value={businessType}
        onChangeText={setBusinessType}
        placeholder={t('companyRegistration.selectBusinessType')}
        containerStyle={styles.input}
      />
      <Input
        label={t('companyRegistration.address')}
        value={address}
        onChangeText={setAddress}
        placeholder={t('companyRegistration.enterCompanyAddress')}
        multiline
        numberOfLines={3}
        containerStyle={styles.input}
      />
      <Input
        label="City *"
        value={city}
        onChangeText={setCity}
        placeholder="Enter city"
        containerStyle={styles.input}
      />
      <Input
        label="State *"
        value={state}
        onChangeText={setState}
        placeholder="Enter state"
        containerStyle={styles.input}
      />
      <Input
        label="Pincode *"
        value={pincode}
        onChangeText={(text) => {
          // Only allow numbers and limit to 6 digits
          const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
          setPincode(numericText);
        }}
        placeholder="Enter 6-digit pincode"
        keyboardType="number-pad"
        maxLength={6}
        containerStyle={styles.input}
      />
      <View>
        <PhoneInput
          label={t('companyRegistration.contactNumber')}
          value={contactNumber}
          onChangeText={(text) => {
            setContactNumber(text);
            setPhoneOtpSent(false);
            setPhoneVerified(false);
          }}
          placeholder="Enter your phone number"
          containerStyle={styles.input}
          editable={!phoneVerified}
        />
        {phoneVerified && (
          <View style={styles.verifiedBadge}>
            <Check size={16} color={COLORS.success} />
            <Text style={styles.verifiedText}>Phone Verified</Text>
          </View>
        )}
        {!phoneVerified && contactNumber.length >= 10 && (
          <>
            {!phoneOtpSent ? (
              <Button
                title={phoneLoading ? 'Sending...' : 'Send OTP'}
                onPress={handleSendPhoneOtp}
                variant="outline"
                size="small"
                style={styles.otpButton}
                disabled={phoneLoading}
              />
            ) : (
              <>
                <Input
                  label="Enter OTP"
                  value={phoneOtp}
                  onChangeText={setPhoneOtp}
                  placeholder="______"
                  keyboardType="number-pad"
                  maxLength={6}
                  containerStyle={styles.input}
                />
                <Button
                  title={phoneVerifying ? 'Verifying...' : 'Verify OTP'}
                  onPress={handleVerifyPhoneOtp}
                  variant="outline"
                  size="small"
                  style={styles.otpButton}
                  disabled={phoneVerifying || phoneOtp.length !== 6}
                />
              </>
            )}
          </>
        )}
      </View>
      
      <View>
        <Input
          label={t('common.email') + ' *'}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setEmailOtpSent(false);
            setEmailVerified(false);
          }}
          placeholder={t('common.enter') + ' ' + t('common.email').toLowerCase()}
          keyboardType="email-address"
          containerStyle={styles.input}
          editable={!emailVerified}
        />
        {emailVerified && (
          <View style={styles.verifiedBadge}>
            <Check size={16} color={COLORS.success} />
            <Text style={styles.verifiedText}>Email Verified</Text>
          </View>
        )}
        {!emailVerified && email.includes('@') && (
          <>
            {!emailOtpSent ? (
              <Button
                title={emailLoading ? 'Sending...' : 'Send Email OTP'}
                onPress={handleSendEmailOtp}
                variant="outline"
                size="small"
                style={styles.otpButton}
                disabled={emailLoading}
              />
            ) : (
              <>
                <Input
                  label="Enter Email OTP"
                  value={emailOtp}
                  onChangeText={setEmailOtp}
                  placeholder="______"
                  keyboardType="number-pad"
                  maxLength={6}
                  containerStyle={styles.input}
                />
                <Button
                  title={emailVerifying ? 'Verifying...' : 'Verify Email OTP'}
                  onPress={handleVerifyEmailOtp}
                  variant="outline"
                  size="small"
                  style={styles.otpButton}
                  disabled={emailVerifying || emailOtp.length !== 6}
                />
              </>
            )}
          </>
        )}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>{t('companyRegistration.step2Title')}</Text>
      
      <View style={styles.documentSection}>
        <Text style={styles.documentTitle}>{t('companyRegistration.registrationCertificate')}</Text>
        {registrationCertificate ? (
          <View style={styles.imagePreviewContainer}>
            {documentMimeTypes.registration === 'application/pdf' ? (
              <View style={[styles.imagePreview, { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray }]}>
                <FileText size={48} color={COLORS.primary} />
                <Text style={styles.pdfText}>PDF Document</Text>
              </View>
            ) : (
              <Image source={{ uri: registrationCertificate }} style={styles.imagePreview} />
            )}
            {uploadingDoc === 'registration' && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color={COLORS.white} />
              </View>
            )}
            {uploadStatus.registration === 'success' && !uploadingDoc && (
              <View style={styles.successOverlay}>
                <Check size={20} color={COLORS.success} />
              </View>
            )}
            {uploadStatus.registration === 'error' && !uploadingDoc && (
              <View style={styles.errorOverlay}>
                <X size={20} color={COLORS.error} />
              </View>
            )}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveImage('registration')}
            >
              <X size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => handleDocumentPicker('registration')}
            disabled={uploadingDoc === 'registration'}
          >
            <Camera size={20} color={COLORS.primary} />
            <Text style={styles.uploadText}>{t('common.upload')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.documentSection}>
        <Text style={styles.documentTitle}>{t('companyRegistration.gstCertificate')}</Text>
        {gstCertificate ? (
          <View style={styles.imagePreviewContainer}>
            {documentMimeTypes.gst === 'application/pdf' ? (
              <View style={[styles.imagePreview, { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray }]}>
                <FileText size={48} color={COLORS.primary} />
                <Text style={styles.pdfText}>PDF Document</Text>
              </View>
            ) : (
              <Image source={{ uri: gstCertificate }} style={styles.imagePreview} />
            )}
            {uploadingDoc === 'gst' && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color={COLORS.white} />
              </View>
            )}
            {uploadStatus.gst === 'success' && !uploadingDoc && (
              <View style={styles.successOverlay}>
                <Check size={20} color={COLORS.success} />
              </View>
            )}
            {uploadStatus.gst === 'error' && !uploadingDoc && (
              <View style={styles.errorOverlay}>
                <X size={20} color={COLORS.error} />
              </View>
            )}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveImage('gst')}
            >
              <X size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => handleDocumentPicker('gst')}
            disabled={uploadingDoc === 'gst'}
          >
            <Camera size={20} color={COLORS.primary} />
            <Text style={styles.uploadText}>{t('common.upload')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.documentSection}>
        <Text style={styles.documentTitle}>{t('companyRegistration.businessLicense')}</Text>
        {businessLicense ? (
          <View style={styles.imagePreviewContainer}>
            {documentMimeTypes.license === 'application/pdf' ? (
              <View style={[styles.imagePreview, { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightGray }]}>
                <FileText size={48} color={COLORS.primary} />
                <Text style={styles.pdfText}>PDF Document</Text>
              </View>
            ) : (
              <Image source={{ uri: businessLicense }} style={styles.imagePreview} />
            )}
            {uploadingDoc === 'license' && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color={COLORS.white} />
              </View>
            )}
            {uploadStatus.license === 'success' && !uploadingDoc && (
              <View style={styles.successOverlay}>
                <Check size={20} color={COLORS.success} />
              </View>
            )}
            {uploadStatus.license === 'error' && !uploadingDoc && (
              <View style={styles.errorOverlay}>
                <X size={20} color={COLORS.error} />
              </View>
            )}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveImage('license')}
            >
              <X size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => handleDocumentPicker('license')}
            disabled={uploadingDoc === 'license'}
          >
            <Camera size={20} color={COLORS.primary} />
            <Text style={styles.uploadText}>{t('common.upload')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>{t('companyRegistration.step3Title')}</Text>
      <Input
        label={t('companyRegistration.username')}
        value={companyName.toLowerCase().replace(/\s+/g, '_')}
        placeholder={t('companyRegistration.autoGenerated')}
        editable={false}
        containerStyle={styles.input}
      />
      <Input
        label={t('companyRegistration.password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('companyRegistration.createPassword')}
        secureTextEntry={!showPassword}
        showPasswordToggle
        onPasswordToggle={() => setShowPassword(!showPassword)}
        containerStyle={styles.input}
      />
      <View style={styles.passwordHint}>
        <View style={styles.hintItem}>
          <Circle size={4} color={COLORS.textSecondary} fill={COLORS.textSecondary} />
          <Text style={styles.hintText}>At least 8 characters</Text>
        </View>
        <View style={styles.hintItem}>
          <Circle size={4} color={COLORS.textSecondary} fill={COLORS.textSecondary} />
          <Text style={styles.hintText}>One uppercase letter</Text>
        </View>
        <View style={styles.hintItem}>
          <Circle size={4} color={COLORS.textSecondary} fill={COLORS.textSecondary} />
          <Text style={styles.hintText}>One lowercase letter and one number</Text>
        </View>
      </View>
      <Input
        label={t('companyRegistration.confirmPassword')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={t('companyRegistration.confirmPasswordPlaceholder')}
        secureTextEntry={!showConfirmPassword}
        showPasswordToggle
        onPasswordToggle={() => setShowConfirmPassword(!showConfirmPassword)}
        containerStyle={styles.input}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {renderProgressBar()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <Button
          title={
            registering
              ? 'Registering...'
              : currentStep === totalSteps
              ? t('common.submit')
              : t('common.continue')
          }
          onPress={handleNext}
          variant="primary"
          size="large"
          style={styles.continueButton}
          disabled={
            registering ||
            (currentStep === 1 && (!phoneVerified || !emailVerified || !companyName.trim() || !registrationNumber.trim() || !businessType.trim() || !address.trim() || !city.trim() || !state.trim() || !pincode.trim() || pincode.length !== 6)) ||
            (currentStep === 2 && (!registrationCertificate || !gstCertificate || !businessLicense)) ||
            (currentStep === 3 && (!password || password.length < 8 || password !== confirmPassword))
          }
        />
        {registering && (
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
    paddingTop: 50,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
  },
  backButton: {
    padding: SPACING.sm,
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  progressText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl + 80,
  },
  stepTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.primary,
    marginBottom: SPACING.lg,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: SPACING.md,
  },
  passwordHint: {
    marginBottom: SPACING.md,
    marginLeft: SPACING.sm,
    gap: SPACING.xs,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  hintText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
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
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    borderStyle: 'dashed',
  },
  uploadText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: '600',
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
    ...SHADOWS.md,
  },
  continueButton: {
    width: '100%',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  verifiedText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.success,
    fontWeight: '600',
  },
  otpButton: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: SPACING.sm,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.md,
    resizeMode: 'cover',
  },
  pdfText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    marginTop: SPACING.xs,
    fontWeight: '600',
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
    borderRadius: BORDER_RADIUS.md,
  },
  successOverlay: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: COLORS.success,
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  errorOverlay: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: COLORS.error,
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  removeButton: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: COLORS.error,
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  loader: {
    marginTop: SPACING.md,
  },
});

export default CompanyRegistrationScreen;
