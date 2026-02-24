import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { PhoneInput } from '@components/common/PhoneInput';
import { authApi } from '@utils/apiClient';
import { normalize, hp } from '@utils/responsive';
import { useSnackbar } from '@context/SnackbarContext';
import { getUserErrorMessage, mapFieldErrors } from '@utils/errorUtils';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const { showSnackbar } = useSnackbar();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const totalSteps = 2;
  const currentStep = step === 'phone' ? 1 : 2;
  const [phone, setPhone] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(45);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (step === 'otp' && otpTimer > 0) {
      const timer = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, otpTimer]);

  const normalizeIndianPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 10 ? `+91${digits}` : '';
  };

  const handleSendOtp = async () => {
    const normalizedPhone = normalizeIndianPhone(phone);
    if (!normalizedPhone) {
      setErrors((prev) => ({ ...prev, phone: 'Please enter a valid 10-digit phone number' }));
      showSnackbar({ message: 'Please enter a valid 10-digit phone number', type: 'error' });
      return;
    }
    setErrors((prev) => ({ ...prev, phone: '' }));

    setLoading(true);
    try {
      const response = await authApi.sendOTP(normalizedPhone, 'reset_password');

      if (response.success) {
        setFormattedPhone(normalizedPhone);
        setStep('otp');
        setOtpTimer(45);
        setOtp('');
        if (response.data?.otp) {
          showSnackbar({
            message: `OTP sent. Dev OTP: ${response.data.otp}`,
            type: 'success',
          });
          return;
        }
        showSnackbar({ message: 'OTP sent to your phone number', type: 'success' });
      } else {
        const fieldErrors = mapFieldErrors(response as any, { phone: 'phone' });
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        showSnackbar({ message: getUserErrorMessage(response as any, 'Failed to send OTP. Please try again.'), type: 'error' });
      }
    } catch (error: any) {
      showSnackbar({ message: error.message || 'Failed to send OTP. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndContinue = async () => {
    if (!otp || otp.length !== 6) {
      setErrors((prev) => ({ ...prev, otp: 'Please enter a valid 6-digit OTP' }));
      showSnackbar({ message: 'Please enter a valid 6-digit OTP', type: 'error' });
      return;
    }
    setErrors((prev) => ({ ...prev, otp: '' }));

    try {
      setLoading(true);
      const response = await authApi.verifyOTP(formattedPhone, otp, 'reset_password');

      if (response.success) {
        showSnackbar({ message: 'OTP verified successfully', type: 'success' });
        navigation.navigate('ChangePassword' as never, { phone: formattedPhone } as never);
      } else {
        const fieldErrors = mapFieldErrors(response as any, { otp: 'otp' });
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        showSnackbar({ message: getUserErrorMessage(response as any, 'Invalid OTP. Please try again.'), type: 'error' });
      }
    } catch (error: any) {
      showSnackbar({ message: error.message || 'Failed to verify OTP. Please try again.', type: 'error' });
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
      const response = await authApi.sendOTP(formattedPhone, 'reset_password');
      
      if (response.success) {
        setOtpTimer(45);
        setOtp('');
        if (response.data?.otp) {
          showSnackbar({
            message: `OTP resent. Dev OTP: ${response.data.otp}`,
            type: 'success',
          });
          return;
        }
        showSnackbar({ message: 'OTP resent successfully', type: 'success' });
      } else {
        showSnackbar({ message: getUserErrorMessage(response as any, 'Failed to resend OTP. Please try again.'), type: 'error' });
      }
    } catch (error: any) {
      showSnackbar({ message: error.message || 'Failed to resend OTP. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.background}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

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
        >
          <View style={styles.heroSection}>
            <Image
              source={require('../../../assets/forlok_forgot_password_blue_bg_v1.png')}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            {step === 'phone'
              ? 'Enter your phone number to receive OTP'
              : `Enter the OTP sent to ${formattedPhone}`}
          </Text>

          <View style={styles.formCard}>
            {step === 'phone' && (
              <>
                <PhoneInput
                  label="Phone Number"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  placeholder="Enter 10-digit phone number"
                  containerStyle={styles.input}
                  error={errors.phone}
                />
                <Button
                  title={loading ? 'Sending OTP...' : 'Send OTP'}
                  onPress={handleSendOtp}
                  variant="primary"
                  size="large"
                  style={styles.button}
                  disabled={loading}
                />
              </>
            )}

            {step === 'otp' && (
              <>
                <Input
                  label="Enter OTP"
                  value={otp}
                  onChangeText={(text) => {
                    setOtp(text);
                    if (errors.otp) setErrors((prev) => ({ ...prev, otp: '' }));
                  }}
                  placeholder="______"
                  keyboardType="number-pad"
                  maxLength={6}
                  containerStyle={styles.input}
                  error={errors.otp}
                />
                <View style={styles.resendContainer}>
                  <TouchableOpacity onPress={handleResendOtp} disabled={loading || otpTimer > 0}>
                    <Text style={[styles.resendText, (loading || otpTimer > 0) && { opacity: 0.5 }]}>
                      Resend OTP
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.timerText}>(00:{String(otpTimer).padStart(2, '0')})</Text>
                </View>
                <Button
                  title={loading ? 'Verifying...' : 'Verify OTP'}
                  onPress={handleVerifyOtpAndContinue}
                  variant="primary"
                  size="large"
                  style={styles.button}
                  disabled={loading || otp.length !== 6}
                />
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB' },
  background: { flex: 1, backgroundColor: '#F5F7FB' },
  header: {
    paddingTop: hp(6),
    paddingHorizontal: SPACING.md,
  },
  backButton: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#DDE6F5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: 0,
    paddingBottom: normalize(64),
  },
  progressRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  progressDash: {
    flex: 1,
    height: normalize(4),
    borderRadius: normalize(2),
    backgroundColor: '#D9E2F2',
  },
  progressDashActive: {
    backgroundColor: COLORS.primary,
  },
  heroSection: {
    borderRadius: normalize(18),
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    backgroundColor: '#EAF1FF',
    borderWidth: 1,
    borderColor: '#DDE6F5',
  },
  heroImage: {
    width: '100%',
    height: normalize(170),
  },
  title: {
    fontFamily: FONTS.medium,
    fontSize: normalize(24),
    color: COLORS.text,
    marginBottom: normalize(6),
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  formCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: '#DDE6F5',
  },
  input: { marginBottom: SPACING.md },
  button: {
    marginTop: normalize(4),
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resendText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: COLORS.primary,
  },
  timerText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: COLORS.textSecondary,
  },
});

export default ForgotPasswordScreen;











