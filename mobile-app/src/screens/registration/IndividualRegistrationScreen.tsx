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
  Image,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Phone, User, Lock, Gift } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { normalize, wp, hp } from '@utils/responsive';
import { Input } from '@components/common/Input';
import { PhoneInput } from '@components/common/PhoneInput';
import { useLanguage } from '@context/LanguageContext';
import { useAuth } from '@context/AuthContext';
import { authApi } from '@utils/apiClient';
import LottieView from 'lottie-react-native';
import { useSnackbar } from '@context/SnackbarContext';
import { getUserErrorMessage, mapFieldErrors } from '@utils/errorUtils';

const ACCENT = '#F9A825';

const IndividualRegistrationScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { login } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(45);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | null>(null);
  const [referralCode, setReferralCode] = useState('');

  const [showCoinCelebration, setShowCoinCelebration] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleNext = async () => {
    if (currentStep === 1) {
      if (errors.otp) setErrors((prev) => ({ ...prev, otp: '' }));
      if (!otp || otp.length !== 6) {
        setErrors((prev) => ({ ...prev, otp: 'Please enter a valid 6-digit OTP' }));
        showSnackbar({ message: 'Please enter a valid 6-digit OTP', type: 'error' });
        return;
      }
      setVerifying(true);
      try {
        const formattedPhone = `+91${phone}`;
        const response = await authApi.verifyOTP(formattedPhone, otp, 'signup');
        if (response.success) {
          setErrors({});
          setCurrentStep(2);
        } else {
          const fieldErrors = mapFieldErrors(response as any, { otp: 'otp' });
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
          showSnackbar({ message: getUserErrorMessage(response as any, 'Invalid OTP. Please try again.'), type: 'error' });
        }
      } catch (error: any) {
        showSnackbar({ message: error.message || 'Failed to verify OTP. Please try again.', type: 'error' });
      } finally {
        setVerifying(false);
      }
    } else if (currentStep === 2) {
      const localErrors: Record<string, string> = {};
      if (!name.trim()) localErrors.name = 'Please enter your name';
      if (!password || password.length < 8) localErrors.password = 'Password must be at least 8 characters long';
      else if (!/[A-Z]/.test(password)) localErrors.password = 'Password must contain at least one uppercase letter';
      else if (!/[a-z]/.test(password)) localErrors.password = 'Password must contain at least one lowercase letter';
      else if (!/[0-9]/.test(password)) localErrors.password = 'Password must contain at least one number';
      if (password !== confirmPassword) localErrors.confirmPassword = 'Passwords do not match';
      if (!gender) localErrors.gender = 'Please select your gender';

      if (Object.keys(localErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...localErrors }));
        showSnackbar({ message: 'Please fix highlighted fields', type: 'error' });
        return;
      }

      setLoading(true);
      try {
        const formattedPhone = `+91${phone}`;
        const response = await authApi.signup({
          phone: formattedPhone,
          name: name.trim(),
          userType: 'individual',
          password,
          confirmPassword,
          gender,
          ...(referralCode.trim() ? { referralCode: referralCode.trim().toUpperCase() } : {}),
        });

        if (response.success) {
          const userData = response.data?.user || response.data || {};
          const tokens = response.data?.tokens || {
            accessToken: response.data?.accessToken,
            refreshToken: response.data?.refreshToken,
          };
          if (tokens.accessToken && tokens.refreshToken) {
            await login(userData, tokens);
          }
          setShowCoinCelebration(true);
          setTimeout(() => {
            setShowCoinCelebration(false);
            navigation.reset({ index: 0, routes: [{ name: 'MainDashboard' as never }] });
          }, 4000);
        } else {
          const fieldErrors = mapFieldErrors(response as any, {
            phone: 'phone',
            name: 'name',
            password: 'password',
            confirmPassword: 'confirmPassword',
            gender: 'gender',
          });
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
          showSnackbar({
            message: getUserErrorMessage(response as any, 'Failed to register. Please try again.'),
            type: 'error',
          });
        }
      } catch (error: any) {
        showSnackbar({ message: error.message || 'Failed to register. Please try again.', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('SignUp' as never);
  };

  const startOtpTimer = () => {
    setOtpTimer(45);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      setErrors((prev) => ({ ...prev, phone: 'Please enter a valid phone number' }));
      showSnackbar({ message: 'Please enter a valid phone number', type: 'error' });
      return;
    }
    setErrors((prev) => ({ ...prev, phone: '', otp: '' }));
    setLoading(true);
    try {
      const formattedPhone = `+91${phone}`;
      const response = await authApi.sendOTP(formattedPhone, 'signup');
      if (response.success) {
        setOtpSent(true);
        setOtp('');
        startOtpTimer();
        if (response.data?.otp) {
          Alert.alert('OTP Sent Successfully', `Your OTP is: ${response.data.otp}\n\n(Displayed for development. Configure SMS provider for production.)`, [{ text: 'OK' }]);
        } else {
          Alert.alert('Success', 'OTP sent successfully to your phone');
        }
      } else {
        const fieldErrors = mapFieldErrors(response as any, { phone: 'phone' });
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        showSnackbar({
          message: getUserErrorMessage(response as any, 'Failed to send OTP. Please try again.'),
          type: 'error',
        });
      }
    } catch (error: any) {
      showSnackbar({ message: error.message || 'Failed to send OTP. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) {
      showSnackbar({ message: `Please wait ${otpTimer} seconds before resending OTP`, type: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const formattedPhone = `+91${phone}`;
      const response = await authApi.sendOTP(formattedPhone, 'signup');
      if (response.success) {
        setOtp('');
        startOtpTimer();
        if (response.data?.otp) {
          Alert.alert('OTP Resent', `Your OTP is: ${response.data.otp}\n\n(Displayed for development.)`, [{ text: 'OK' }]);
        } else {
          Alert.alert('Success', 'OTP resent successfully');
        }
      } else {
        showSnackbar({
          message: getUserErrorMessage(response as any, 'Failed to resend OTP.'),
          type: 'error',
        });
      }
    } catch (error: any) {
      showSnackbar({ message: error.message || 'Failed to resend OTP.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const stepImages = [
    require('../../../assets/reg_phone_verify.png'),
    require('../../../assets/reg_profile_setup.png'),
  ];

  const canContinue =
    currentStep === 1
      ? otpSent ? otp.length === 6 : phone.length >= 10
      : name.trim().length > 0 && password.length >= 8 && password === confirmPassword && !!gender;

  const buttonLabel =
    loading || verifying
      ? 'Please wait...'
      : currentStep === 1
      ? otpSent ? t('individualRegistration.verifyContinue') : t('individualRegistration.sendOtp')
      : t('individualRegistration.continue');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Progress dashes */}
      <View style={styles.progressRow}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View
            key={i}
            style={[
              styles.progressDash,
              currentStep >= i + 1 && styles.progressDashActive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Illustration */}
        <View style={styles.illustrationWrap}>
          <Image
            source={stepImages[currentStep - 1]}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Step 1 */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.stepTitle}>{t('individualRegistration.step1Title')}</Text>
            <Text style={styles.stepDesc}>{t('individualRegistration.step1Description')}</Text>

            <PhoneInput
              label={t('individualRegistration.phoneNumber')}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setOtpSent(false);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              placeholder="Enter your phone number"
              containerStyle={styles.inputWrap}
              editable={!otpSent}
              error={errors.phone}
            />

            {otpSent && (
              <>
                <Input
                  label={t('individualRegistration.enterOtp')}
                  value={otp}
                  onChangeText={(text) => {
                    setOtp(text);
                    if (errors.otp) setErrors((prev) => ({ ...prev, otp: '' }));
                  }}
                  placeholder="______"
                  keyboardType="number-pad"
                  maxLength={6}
                  containerStyle={styles.inputWrap}
                  error={errors.otp}
                />
                <View style={styles.resendRow}>
                  <TouchableOpacity onPress={handleResendOtp} disabled={otpTimer > 0}>
                    <Text style={[styles.resendText, otpTimer > 0 && { opacity: 0.4 }]}>
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
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <View>
            <Text style={styles.stepTitle}>{t('individualRegistration.step2Title')}</Text>
            <Text style={styles.stepDesc}>{t('individualRegistration.step2Description')}</Text>

            <Input
              label={t('individualRegistration.yourName')}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder={t('individualRegistration.enterYourName')}
              containerStyle={styles.inputWrap}
              autoCapitalize="words"
              leftIcon={<User size={18} color="#BBBBBB" />}
              error={errors.name}
            />
            <Input
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              placeholder="Enter your password"
              containerStyle={styles.inputWrap}
              secureTextEntry={!showPassword}
              showPasswordToggle
              onPasswordToggle={() => setShowPassword(!showPassword)}
              leftIcon={<Lock size={18} color="#BBBBBB" />}
              error={errors.password}
            />
            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              placeholder="Confirm your password"
              containerStyle={styles.inputWrap}
              secureTextEntry={!showConfirmPassword}
              showPasswordToggle
              onPasswordToggle={() => setShowConfirmPassword(!showConfirmPassword)}
              leftIcon={<Lock size={18} color="#BBBBBB" />}
              error={errors.confirmPassword}
            />

            <View style={styles.hintBox}>
              <Text style={styles.hintText}>
                8+ characters, uppercase, lowercase, and a number.
              </Text>
            </View>

            {/* Gender */}
            <Text style={styles.fieldLabel}>Gender *</Text>
            <View style={styles.genderRow}>
              {(['Male', 'Female', 'Other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderChip, gender === g && styles.genderChipActive]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.genderChipText, gender === g && styles.genderChipTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {!!errors.gender && <Text style={styles.inlineErrorText}>{errors.gender}</Text>}

            {/* Referral */}
            <Text style={styles.fieldLabel}>Referral Code (Optional)</Text>
            <Input
              placeholder="e.g. FORLOK-ABC123"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
              containerStyle={styles.inputWrap}
              leftIcon={<Gift size={18} color="#BBBBBB" />}
            />
            <Text style={styles.hintText}>
              Have a friend's referral code? Enter it to earn bonus coins!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
          onPress={currentStep === 1 && !otpSent ? handleSendOtp : handleNext}
          activeOpacity={0.85}
          disabled={!canContinue || loading || verifying}
        >
          {loading || verifying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.continueBtnText}>{buttonLabel}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Coin celebration modal */}
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: hp(6),
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  progressDash: {
    flex: 1,
    height: normalize(4),
    borderRadius: normalize(2),
    backgroundColor: '#E0E0E0',
  },
  progressDashActive: {
    backgroundColor: ACCENT,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: normalize(100),
  },
  illustrationWrap: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  illustration: {
    width: wp(65),
    height: hp(20),
  },
  stepTitle: {
    fontFamily: FONTS.bold,
    fontSize: normalize(24),
    color: '#1A1A1A',
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  stepDesc: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#888888',
    marginBottom: SPACING.lg,
    lineHeight: normalize(20),
    marginTop: SPACING.xs,
  },
  inputWrap: {
    marginBottom: SPACING.md,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resendText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.sm,
    color: ACCENT,
  },
  timerText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#999999',
  },
  hintBox: {
    backgroundColor: '#FFFDE7',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  hintText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: '#888888',
    lineHeight: normalize(18),
  },
  fieldLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.sm,
    color: '#1A1A1A',
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  genderRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  genderChip: {
    flex: 1,
    paddingVertical: normalize(12),
    borderRadius: normalize(24),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  genderChipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  genderChipText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.sm,
    color: '#666666',
  },
  genderChipTextActive: {
    color: '#FFFFFF',
  },
  inlineErrorText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.md,
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
  },
  continueBtn: {
    backgroundColor: ACCENT,
    height: normalize(52),
    borderRadius: normalize(26),
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.45,
  },
  continueBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.lg,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationContent: {
    backgroundColor: '#FFFFFF',
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
    fontFamily: FONTS.bold,
    fontSize: normalize(24),
    color: ACCENT,
    marginTop: SPACING.sm,
  },
  celebrationText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#333333',
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  celebrationHint: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#999999',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

export default IndividualRegistrationScreen;
