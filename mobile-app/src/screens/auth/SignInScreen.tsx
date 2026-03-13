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
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Lock, Mail } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { Input } from '@components/common/Input';
import { useLanguage } from '@context/LanguageContext';
import { authApi } from '@utils/apiClient';
import { normalize, wp, hp } from '@utils/responsive';
import { useAuth } from '@context/AuthContext';
import { useSnackbar } from '@context/SnackbarContext';
import { getUserErrorMessage, mapFieldErrors } from '@utils/errorUtils';
import { AppLoader } from '@components/common/AppLoader';
import { LinearGradient } from 'expo-linear-gradient';

const ACCENT = '#F9A825';
const ORANGE_GRADIENT = ['#F99E3C', '#D47B1B'] as const;
const DEBUG_ENDPOINT = 'http://127.0.0.1:7775/ingest/9bdd2fd3-ac77-45be-b342-a40ab02f34f7';
const SIGNIN_LOGO = require('../../../assets/signin_arrow_orange_transparent.png');
type SignInErrors = { username?: string; password?: string };

const SignInScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { login } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<SignInErrors>({});

  React.useEffect(() => {
    // #region agent log
    fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H11',location:'SignInScreen.tsx:mount',message:'SignIn screen mounted',data:{},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, []);

  const handleSignIn = async () => {
    const nextErrors: SignInErrors = {};
    if (!username.trim()) {
      nextErrors.username = t('signIn.enterUsernameError');
    }
    if (!password) {
      nextErrors.password = t('signIn.enterPasswordError');
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      showSnackbar({ message: t('signIn.errorTitle'), type: 'error' });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const response = await authApi.signin(username.trim(), password);
      if (response.success) {
        const userData = response.data?.user || {};
        const tokens = response.data?.tokens;
        if (tokens) {
          await login(userData, tokens);
        }
      } else {
        const mapped = mapFieldErrors(response as any, { username: 'username', password: 'password' });
        setErrors((prev: SignInErrors) => ({ ...prev, ...mapped }));
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

  const canSubmit = username.trim().length > 0 && password.length > 0 && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />

        <TouchableOpacity
          style={styles.adminPill}
          onPress={() => navigation.navigate('AdminLogin' as never)}
          activeOpacity={0.7}
        >
          <Text style={styles.adminPillText}>{t('signIn.adminLogin')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={SIGNIN_LOGO}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('signIn.title')}</Text>
        <Text style={styles.subtitle}>Sign in to continue your journey</Text>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label={t('signIn.username') || 'Username/Email/Phone'}
            value={username}
            onChangeText={(text: string) => {
              setUsername(text);
              if (errors.username) setErrors((prev: SignInErrors) => ({ ...prev, username: undefined }));
            }}
            placeholder={t('signIn.enterUsernamePlaceholder')}
            autoCapitalize="none"
            containerStyle={styles.inputWrap}
            leftIcon={<Mail size={18} color="#BBBBBB" />}
            error={errors.username}
          />

          <Input
            label={t('signIn.password')}
            value={password}
            onChangeText={(text: string) => {
              setPassword(text);
              if (errors.password) setErrors((prev: SignInErrors) => ({ ...prev, password: undefined }));
            }}
            placeholder={t('signIn.enterPassword')}
            secureTextEntry={!showPassword}
            showPasswordToggle
            containerStyle={styles.inputWrap}
            leftIcon={<Lock size={18} color="#BBBBBB" />}
            error={errors.password}
          />

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword' as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>{t('signIn.forgotPassword')}</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[
              styles.signInBtn,
              !canSubmit && styles.signInBtnDisabled,
            ]}
            onPress={handleSignIn}
            activeOpacity={0.85}
            disabled={!canSubmit}
          >
            <LinearGradient
              colors={[ORANGE_GRADIENT[0], ORANGE_GRADIENT[1]]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.signInBtnGradient}
            >
              {loading ? (
                <AppLoader size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.signInBtnText}>
                  {t('signIn.signInButton')}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign Up link */}
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: hp(3.5),
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  headerSpacer: {
    width: normalize(40),
    height: normalize(40),
  },
  adminPill: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
  },
  adminPillText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.xs,
    color: '#555555',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
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
    color: '#1A1A1A',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#888888',
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputWrap: {
    marginBottom: SPACING.md,
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
    color: '#999999',
  },
  signUpLink: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.sm,
    color: ACCENT,
  },
});

export default SignInScreen;
