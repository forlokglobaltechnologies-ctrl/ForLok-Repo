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
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { normalize, wp } from '@utils/responsive';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { PhoneInput } from '@components/common/PhoneInput';
import { useLanguage } from '@context/LanguageContext';
import { useAuth } from '@context/AuthContext';
import { authApi } from '@utils/apiClient';
import LottieView from 'lottie-react-native';

const IndividualRegistrationScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  // Step 1: Phone Verification
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(45);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Step 2: Name and Password Entry
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | null>(null);
  const [referralCode, setReferralCode] = useState('');

  // Coin celebration
  const [showCoinCelebration, setShowCoinCelebration] = useState(false);

  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate OTP before proceeding
      if (!otp || otp.length !== 6) {
        Alert.alert('Error', 'Please enter a valid 6-digit OTP');
        return;
      }
      
      // Verify OTP with backend (format phone with +91)
      setVerifying(true);
      try {
        const formattedPhone = `+91${phone}`;
        const response = await authApi.verifyOTP(formattedPhone, otp, 'signup');
        
        if (response.success) {
          setCurrentStep(2);
        } else {
          Alert.alert('Error', response.error || 'Invalid OTP. Please try again.');
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to verify OTP. Please try again.');
      } finally {
        setVerifying(false);
      }
    } else if (currentStep === 2) {
      // Validate name before proceeding
      if (!name.trim()) {
        Alert.alert('Error', 'Please enter your name');
        return;
      }
      
      // Validate password
      if (!password || password.length < 8) {
        Alert.alert('Error', 'Password must be at least 8 characters long');
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
      
      // Validate confirm password
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      
      // Validate gender
      if (!gender) {
        Alert.alert('Error', 'Please select your gender');
        return;
      }
      
      // Register user with backend
      setLoading(true);
      try {
        // Format phone with +91 for backend
        const formattedPhone = `+91${phone}`;
        const response = await authApi.signup({
          phone: formattedPhone,
          name: name.trim(),
          userType: 'individual',
          password: password,
          confirmPassword: confirmPassword,
          gender: gender,
          ...(referralCode.trim() ? { referralCode: referralCode.trim().toUpperCase() } : {}),
        });
        
        if (response.success) {
          // Save auth state via AuthContext
          const userData = response.data?.user || response.data || {};
          const tokens = response.data?.tokens || {
            accessToken: response.data?.accessToken,
            refreshToken: response.data?.refreshToken,
          };
          if (tokens.accessToken && tokens.refreshToken) {
            await login(userData, tokens);
          }
          // Show coin celebration, then navigate to dashboard
          setShowCoinCelebration(true);
          setTimeout(() => {
            setShowCoinCelebration(false);
            navigation.reset({ index: 0, routes: [{ name: 'MainDashboard' as never }] });
          }, 4000);
        } else {
          Alert.alert('Error', response.error || 'Failed to register. Please try again.');
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to register. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    
    setLoading(true);
    try {
      // Format phone number for backend (phone already contains only digits, add +91)
      const formattedPhone = `+91${phone}`;
      
      // Call backend to generate and store OTP
      // Backend will generate 4-digit OTP and store it
      // For Firebase SMS, you would use Firebase SDK here, but since we're using backend flow,
      // we'll use the backend API which generates OTP
      const response = await authApi.sendOTP(formattedPhone, 'signup');
      
      if (response.success) {
        setOtpSent(true);
        setOtpTimer(45);
        setOtp('');
        
        // Start timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        timerRef.current = setInterval(() => {
          setOtpTimer((prev) => {
            if (prev <= 1) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Show OTP in alert for development/testing
        if (response.data?.otp) {
          Alert.alert(
            'OTP Sent Successfully',
            `Your OTP is: ${response.data.otp}\n\n(Displayed for development. Configure SMS provider for production.)`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Success', 'OTP sent successfully to your phone');
        }
      } else {
        Alert.alert('Error', response.error || 'Failed to send OTP. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) {
      Alert.alert('Wait', `Please wait ${otpTimer} seconds before resending OTP`);
      return;
    }
    
    setLoading(true);
    try {
      // Format phone number for backend (phone already contains only digits, add +91)
      const formattedPhone = `+91${phone}`;
      
      const response = await authApi.sendOTP(formattedPhone, 'signup');
      
      if (response.success) {
        setOtpTimer(45);
        setOtp('');
        
        // Restart timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        timerRef.current = setInterval(() => {
          setOtpTimer((prev) => {
            if (prev <= 1) {
              if (timerRef.current) {
                clearInterval(timerRef.current);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Show OTP in alert for development/testing
        if (response.data?.otp) {
          Alert.alert(
            'OTP Resent Successfully',
            `Your OTP is: ${response.data.otp}\n\n(Displayed for development. Configure SMS provider for production.)`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Success', 'OTP resent successfully');
        }
      } else {
        Alert.alert('Error', response.error || 'Failed to resend OTP. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const renderProgressBar = () => {
    const progress = (currentStep / totalSteps) * 100;
    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>{t('individualRegistration.step')} {currentStep} {t('individualRegistration.of')} {totalSteps}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
    );
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>{t('individualRegistration.step1Title')}</Text>
      <Text style={styles.stepDescription}>
        {t('individualRegistration.step1Description')}
      </Text>
      <PhoneInput
        label={t('individualRegistration.phoneNumber')}
        value={phone}
        onChangeText={(text) => {
          setPhone(text);
          setOtpSent(false);
        }}
        placeholder="Enter your phone number"
        containerStyle={styles.input}
        editable={!otpSent}
      />
      {otpSent && (
        <>
          <Input
            label={t('individualRegistration.enterOtp')}
            value={otp}
            onChangeText={setOtp}
            placeholder="______"
            keyboardType="number-pad"
            maxLength={6}
            containerStyle={styles.input}
          />
          <View style={styles.resendContainer}>
            <TouchableOpacity onPress={handleResendOtp} disabled={otpTimer > 0}>
              <Text style={[styles.resendText, otpTimer > 0 && styles.resendTextDisabled]}>
                {t('individualRegistration.resendOtp')}
              </Text>
            </TouchableOpacity>
            {otpTimer > 0 && (
              <Text style={styles.timerText}>(00:{String(otpTimer).padStart(2, '0')})</Text>
            )}
          </View>
        </>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>{t('individualRegistration.step2Title')}</Text>
      <Text style={styles.stepDescription}>
        {t('individualRegistration.step2Description')}
      </Text>
      <Input
        label={t('individualRegistration.yourName')}
        value={name}
        onChangeText={setName}
        placeholder={t('individualRegistration.enterYourName')}
        containerStyle={styles.input}
        autoCapitalize="words"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter your password"
        containerStyle={styles.input}
        secureTextEntry={!showPassword}
        showPasswordToggle={true}
        onPasswordToggle={() => setShowPassword(!showPassword)}
      />
      <Input
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirm your password"
        containerStyle={styles.input}
        secureTextEntry={!showConfirmPassword}
        showPasswordToggle={true}
        onPasswordToggle={() => setShowConfirmPassword(!showConfirmPassword)}
      />
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Password must be at least 8 characters with uppercase, lowercase, and a number.
        </Text>
      </View>
      
      {/* Gender Selection */}
      <View style={styles.genderContainer}>
        <Text style={styles.genderLabel}>Gender *</Text>
        <View style={styles.genderOptions}>
          <TouchableOpacity
            style={[
              styles.genderOption,
              gender === 'Male' && styles.genderOptionSelected,
            ]}
            onPress={() => setGender('Male')}
          >
            <View style={[
              styles.radioButton,
              gender === 'Male' && styles.radioButtonSelected,
            ]}>
              {gender === 'Male' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={[
              styles.genderOptionText,
              gender === 'Male' && styles.genderOptionTextSelected,
            ]}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.genderOption,
              gender === 'Female' && styles.genderOptionSelected,
            ]}
            onPress={() => setGender('Female')}
          >
            <View style={[
              styles.radioButton,
              gender === 'Female' && styles.radioButtonSelected,
            ]}>
              {gender === 'Female' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={[
              styles.genderOptionText,
              gender === 'Female' && styles.genderOptionTextSelected,
            ]}>Female</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.genderOption,
              gender === 'Other' && styles.genderOptionSelected,
            ]}
            onPress={() => setGender('Other')}
          >
            <View style={[
              styles.radioButton,
              gender === 'Other' && styles.radioButtonSelected,
            ]}>
              {gender === 'Other' && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={[
              styles.genderOptionText,
              gender === 'Other' && styles.genderOptionTextSelected,
            ]}>Other</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Referral Code (Optional) */}
      <View style={styles.referralContainer}>
        <Text style={styles.genderLabel}>Referral Code (Optional)</Text>
        <Input
          placeholder="e.g. FORLOK-ABC123"
          value={referralCode}
          onChangeText={setReferralCode}
          autoCapitalize="characters"
        />
        <Text style={[styles.infoText, { marginTop: normalize(4) }]}>
          Have a friend's referral code? Enter it to earn bonus coins!
        </Text>
      </View>
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
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={
            loading || verifying
              ? 'Please wait...'
              : currentStep === 1
              ? otpSent
                ? t('individualRegistration.verifyContinue')
                : t('individualRegistration.sendOtp')
              : t('individualRegistration.continue')
          }
          onPress={currentStep === 1 && !otpSent ? handleSendOtp : handleNext}
          variant="primary"
          size="large"
          style={styles.continueButton}
          disabled={
            loading ||
            verifying ||
            (currentStep === 1
              ? otpSent
                ? !otp || otp.length !== 6
                : !phone || phone.length < 10
              : !name.trim() || !password || password.length < 8 || password !== confirmPassword || !gender)
          }
        />
        {(loading || verifying) && (
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={styles.loader}
          />
        )}
      </View>
      {/* ========== COIN SIGNUP CELEBRATION MODAL ========== */}
      <Modal
        visible={showCoinCelebration}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCoinCelebration(false);
          navigation.reset({ index: 0, routes: [{ name: 'MainDashboard' as never }] });
        }}
      >
        <TouchableOpacity
          style={styles.celebrationOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowCoinCelebration(false);
            navigation.reset({ index: 0, routes: [{ name: 'MainDashboard' as never }] });
          }}
        >
          <View style={styles.celebrationContent}>
            <LottieView
              source={require('../../../assets/videos/reward.json')}
              autoPlay
              loop={false}
              style={styles.celebrationLottie}
            />
            <Text style={styles.celebrationTitle}>Welcome Bonus!</Text>
            <Text style={styles.celebrationText}>
              You earned signup coins! Start your FORLOK journey with free coins.
            </Text>
            <Text style={styles.celebrationHint}>Tap anywhere to continue</Text>
          </View>
        </TouchableOpacity>
      </Modal>
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
    marginBottom: SPACING.sm,
    fontWeight: 'bold',
  },
  stepDescription: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: normalize(22),
  },
  input: {
    marginBottom: SPACING.md,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resendText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: COLORS.textSecondary,
    opacity: 0.5,
  },
  timerText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  infoBox: {
    backgroundColor: COLORS.lightGray + '40',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  infoText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: normalize(20),
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
  loader: {
    marginTop: SPACING.sm,
  },
  genderContainer: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  referralContainer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  genderLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  genderOptions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  genderOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  radioButton: {
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: normalize(10),
    height: normalize(10),
    borderRadius: normalize(5),
    backgroundColor: COLORS.primary,
  },
  genderOptionText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  genderOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Coin celebration modal styles
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationContent: {
    backgroundColor: COLORS.white,
    borderRadius: normalize(24),
    padding: SPACING.xl,
    alignItems: 'center',
    width: '85%',
    maxWidth: wp(90),
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  celebrationLottie: {
    width: wp(75),
    height: wp(75),
  },
  celebrationTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(24),
    fontWeight: 'bold' as const,
    color: '#F5A623',
    marginTop: SPACING.sm,
  },
  celebrationText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    textAlign: 'center' as const,
    marginTop: SPACING.sm,
  },
  celebrationHint: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center' as const,
  },
});

export default IndividualRegistrationScreen;
