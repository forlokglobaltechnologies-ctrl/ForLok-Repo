import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Phone } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { Input } from '@components/common/Input';
import { PhoneInput } from '@components/common/PhoneInput';
import { useLanguage } from '@context/LanguageContext';
import { authApi } from '@utils/apiClient';
import { normalize, wp, hp } from '@utils/responsive';
import { useAuth } from '@context/AuthContext';
import { useSnackbar } from '@context/SnackbarContext';
import { getUserErrorMessage, mapFieldErrors } from '@utils/errorUtils';
import { AppLoader } from '@components/common/AppLoader';
import { LinearGradient } from 'expo-linear-gradient';
import i18n from '@utils/i18n';

const ACCENT = '#FE8800';
const BUTTON_GRADIENT = ['#232323', '#191919'] as const;
const SIGNIN_LOGO = require('../../../assets/signin_arrow_orange_transparent.png');

type SignInErrors = { phone?: string; otp?: string };

const SignInScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { login } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errors, setErrors] = useState<SignInErrors>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formattedPhone = phone.length >= 10 ? `+91${phone}` : '';

  const startOtpTimer = () => {
    setOtpTimer(45);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      setErrors((prev) => ({ ...prev, phone: t('signIn.enterPhoneError') }));
      showSnackbar({ message: t('signIn.enterPhoneError'), type: 'error' });
      return;
    }
    setErrors((prev) => ({ ...prev, phone: '', otp: '' }));
    setLoading(true);
    try {
      const response = await authApi.sendOTP(formattedPhone, 'login');
      if (response.success) {
        setOtpSent(true);
        setOtp('');
        startOtpTimer();
        if (response.data?.otp) {
          Alert.alert(
            t('individualRegistration.sendOtp'),
            `${response.data.otp}\n\n(${t('signIn.devOtpHint')})`,
            [{ text: t('common.ok') }],
          );
        } else {
          showSnackbar({ message: t('signIn.otpSent'), type: 'success' });
        }
      } else {
        const fieldErrors = mapFieldErrors(response as any, { phone: 'phone' });
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        showSnackbar({
          message: getUserErrorMessage(response as any, t('signIn.loginFailed')),
          type: 'error',
        });
      }
    } catch (error: any) {
      showSnackbar({ message: error.message || t('signIn.signInFailed'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) {
      showSnackbar({
        message: i18n.t('signIn.waitBeforeResend', { seconds: otpTimer }),
        type: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.sendOTP(formattedPhone, 'login');
      if (response.success) {
        setOtp('');
        startOtpTimer();
        if (response.data?.otp) {
          Alert.alert(
            t('individualRegistration.resendOtp'),
            `${response.data.otp}\n\n(${t('signIn.devOtpHint')})`,
            [{ text: t('common.ok') }],
          );
        } else {
          showSnackbar({ message: t('signIn.otpSent'), type: 'success' });
        }
      } else {
        showSnackbar({
          message: getUserErrorMessage(response as any, t('signIn.loginFailed')),
          type: 'error',
        });
      }
    } catch (error: any) {
      showSnackbar({ message: error.message || t('signIn.signInFailed'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSignIn = async () => {
    if (!otp || otp.length !== 6) {
      setErrors((prev) => ({ ...prev, otp: t('signIn.invalidOtpError') }));
      showSnackbar({ message: t('signIn.invalidOtpError'), type: 'error' });
      return;
    }
    setErrors((prev) => ({ ...prev, otp: '' }));
    setVerifying(true);
    try {
      const response = await authApi.verifyOTP(formattedPhone, otp, 'login');
      if (response.success && response.data?.tokens?.accessToken && response.data?.tokens?.refreshToken) {
        const userData = response.data?.user || {};
        await login(userData, response.data.tokens);
      } else if (response.success) {
        showSnackbar({ message: t('signIn.loginFailed'), type: 'error' });
      } else {
        const fieldErrors = mapFieldErrors(response as any, { otp: 'otp' });
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        showSnackbar({
          message: getUserErrorMessage(response as any, t('signIn.loginFailed')),
          type: 'error',
        });
      }
    } catch (error: any) {
      showSnackbar({ message: error.message || t('signIn.signInFailed'), type: 'error' });
    } finally {
      setVerifying(false);
    }
  };

  const onPrimaryPress = () => {
    if (!otpSent) handleSendOtp();
    else handleVerifyAndSignIn();
  };

  const canSubmit = otpSent
    ? otp.length === 6 && !loading && !verifying
    : phone.length >= 10 && !loading;

  const primaryLabel = loading || verifying
    ? t('signIn.signingIn')
    : otpSent
      ? t('individualRegistration.verifyContinue')
      : t('individualRegistration.sendOtp');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#191919" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <Image source={SIGNIN_LOGO} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.title}>{t('signIn.title')}</Text>
        <Text style={styles.subtitle}>{t('signIn.subtitleOtp')}</Text>

        <View style={styles.form}>
          <PhoneInput
            label={t('individualRegistration.phoneNumber')}
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            editable={!otpSent}
            error={errors.phone}
            containerStyle={styles.inputWrap}
          />

          {otpSent && (
            <>
              <Input
                label={t('individualRegistration.enterOtp')}
                value={otp}
                onChangeText={(text) => {
                  const d = text.replace(/\D/g, '').slice(0, 6);
                  setOtp(d);
                  if (errors.otp) setErrors((prev) => ({ ...prev, otp: undefined }));
                }}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                containerStyle={styles.inputWrap}
                leftIcon={<Phone size={18} color={COLORS.primary} />}
                error={errors.otp}
              />
              <View style={styles.resendRow}>
                <TouchableOpacity onPress={handleResendOtp} disabled={loading || otpTimer > 0}>
                  <Text style={[styles.resendText, (loading || otpTimer > 0) && { opacity: 0.4 }]}>
                    {t('individualRegistration.resendOtp')}
                  </Text>
                </TouchableOpacity>
                {otpTimer > 0 && (
                  <Text style={styles.timerText}>(00:{String(otpTimer).padStart(2, '0')})</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.changeNumberBtn}
                onPress={() => {
                  setOtpSent(false);
                  setOtp('');
                  setOtpTimer(0);
                  if (timerRef.current) clearInterval(timerRef.current);
                }}
              >
                <Text style={styles.changeNumberText}>{t('signIn.changeNumber')}</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword' as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>{t('signIn.forgotPassword')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.signInBtn, !canSubmit && styles.signInBtnDisabled]}
            onPress={onPrimaryPress}
            activeOpacity={0.85}
            disabled={!canSubmit}
          >
            <LinearGradient
              colors={[BUTTON_GRADIENT[0], BUTTON_GRADIENT[1]]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.signInBtnGradient}
            >
              {loading || verifying ? (
                <AppLoader size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.signInBtnText}>{primaryLabel}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.signUpRow}>
            <Text style={styles.signUpText}>{t('signIn.dontHaveAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp' as never)}>
              <Text style={styles.signUpLink}>{t('signIn.signUpLink')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: hp(8),
    paddingBottom: hp(4),
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  logo: {
    width: wp(40),
    maxWidth: 175,
    aspectRatio: 309 / 275,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: normalize(26),
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
  },
  form: {
    flex: 1,
  },
  inputWrap: {
    marginBottom: SPACING.md,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  resendText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.sm,
    color: ACCENT,
  },
  timerText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  changeNumberBtn: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  changeNumberText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.lg,
  },
  forgotText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.xs,
    color: ACCENT,
  },
  signInBtn: {
    height: normalize(52),
    borderRadius: normalize(26),
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  signInBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInBtnDisabled: {
    opacity: 0.5,
  },
  signInBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.lg,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  signUpLink: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.sm,
    color: ACCENT,
  },
});

export default SignInScreen;
