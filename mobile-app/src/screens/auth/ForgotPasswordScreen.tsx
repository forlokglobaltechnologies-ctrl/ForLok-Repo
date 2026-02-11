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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';
import { authApi } from '@utils/apiClient';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [step, setStep] = useState(1); // 1: email/phone, 2: OTP, 3: new password
  const [phoneEmail, setPhoneEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpTimer, setOtpTimer] = useState(45);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  React.useEffect(() => {
    if (step === 2 && otpTimer > 0) {
      const timer = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, otpTimer]);

  const handleSendResetLink = async () => {
    if (!phoneEmail || phoneEmail.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    
    setLoading(true);
    try {
      const response = await authApi.sendOTP(phoneEmail, 'reset_password');
      
      if (response.success) {
        setStep(2);
        setOtpTimer(45);
        setOtp('');
        
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

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    
    setVerifying(true);
    try {
      const response = await authApi.verifyOTP(phoneEmail, otp, 'reset_password');
      
      if (response.success) {
        setStep(3);
      } else {
        Alert.alert('Error', response.error || 'Invalid OTP. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const response = await authApi.resetPassword(phoneEmail, newPassword);
      
      if (response.success) {
        Alert.alert('Success', 'Password reset successfully. Please login with your new password.', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('SignIn' as never),
          },
        ]);
      } else {
        Alert.alert('Error', response.error || 'Failed to reset password. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
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
      // Format phone number for backend
      const formattedPhone = phoneEmail.startsWith('+') ? phoneEmail : `+91${phoneEmail.replace(/\D/g, '')}`;
      
      const response = await authApi.sendOTP(formattedPhone, 'reset_password');
      
      if (response.success) {
        setOtpTimer(45);
        setOtp('');
        
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{t('forgotPassword.title')}</Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? t('forgotPassword.step1Description')
              : step === 2
              ? t('forgotPassword.step2Description')
              : t('forgotPassword.step3Description')}
          </Text>

          <Card style={styles.formCard}>
            {step === 1 && (
              <>
                <Input
                  label={t('forgotPassword.phoneEmail')}
                  value={phoneEmail}
                  onChangeText={setPhoneEmail}
                  placeholder={t('forgotPassword.enterPhoneEmail')}
                  keyboardType="email-address"
                  containerStyle={styles.input}
                />
                <Button
                  title={t('forgotPassword.sendResetLink')}
                  onPress={handleSendResetLink}
                  variant="primary"
                  size="large"
                  style={styles.button}
                />
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t('common.or')}</Text>
                  <View style={styles.dividerLine} />
                </View>
              </>
            )}

            {step === 2 && (
              <>
                <Input
                  label={t('forgotPassword.enterOtp')}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="______"
                  keyboardType="number-pad"
                  maxLength={6}
                  containerStyle={styles.input}
                />
                <View style={styles.resendContainer}>
                  <TouchableOpacity onPress={handleResendOtp} disabled={loading || otpTimer > 0}>
                    <Text style={[styles.resendText, (loading || otpTimer > 0) && { opacity: 0.5 }]}>
                      {t('forgotPassword.resendOtp')}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.timerText}>(00:{String(otpTimer).padStart(2, '0')})</Text>
                </View>
                <Button
                  title={verifying ? 'Verifying...' : t('forgotPassword.verifyOtp')}
                  onPress={handleVerifyOtp}
                  variant="primary"
                  size="large"
                  style={styles.button}
                  disabled={verifying || otp.length !== 6}
                />
              </>
            )}

            {step === 3 && (
              <>
                <Input
                  label={t('forgotPassword.newPassword')}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('forgotPassword.enterNewPassword')}
                  secureTextEntry
                  showPasswordToggle
                  containerStyle={styles.input}
                />
                <Input
                  label={t('forgotPassword.confirmPassword')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('forgotPassword.confirmNewPassword')}
                  secureTextEntry
                  showPasswordToggle
                  containerStyle={styles.input}
                />
                <Button
                  title={t('forgotPassword.resetPassword')}
                  onPress={handleResetPassword}
                  variant="primary"
                  size="large"
                  style={styles.button}
                  disabled={!newPassword || newPassword !== confirmPassword}
                />
              </>
            )}
          </Card>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingHorizontal: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  title: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: SPACING.xl,
  },
  formCard: {
    padding: SPACING.lg,
  },
  input: {
    marginBottom: SPACING.md,
  },
  button: {
    marginTop: SPACING.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.md,
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
  },
  timerText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
});

export default ForgotPasswordScreen;











