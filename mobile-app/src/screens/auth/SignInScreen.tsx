import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { useLanguage } from '@context/LanguageContext';
import { authApi } from '@utils/apiClient';
import { normalize, wp, hp } from '@utils/responsive';
import { useAuth } from '@context/AuthContext';

const SignInScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!username.trim()) {
      Alert.alert(t('signIn.errorTitle'), t('signIn.enterUsernameError'));
      return;
    }

    if (!password) {
      Alert.alert(t('signIn.errorTitle'), t('signIn.enterPasswordError'));
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.signin(username.trim(), password);
      
      if (response.success) {
        // Save auth state via AuthContext
        const userData = response.data?.user || {};
        const tokens = response.data?.tokens;
        if (tokens) {
          await login(userData, tokens);
        }

        // Check userType and navigate to appropriate dashboard
        const userType = userData.userType || 'individual';
        
        if (userType === 'company') {
          navigation.reset({ index: 0, routes: [{ name: 'CompanyDashboard' as never }] });
        } else if (userType === 'admin') {
          navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard' as never }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'MainDashboard' as never }] });
        }
      } else {
        Alert.alert(t('signIn.errorTitle'), response.error || t('signIn.loginFailed'));
      }
    } catch (error: any) {
      Alert.alert(t('signIn.errorTitle'), error.message || t('signIn.signInFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ImageBackground
        source={require('../../../assets/signin.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <BlurView intensity={50} style={styles.blurContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <ArrowLeft size={24} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => navigation.navigate('AdminLogin' as never)}
              >
                <Text style={styles.adminButtonText}>{t('signIn.adminLogin')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/signin_logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.title}>{t('signIn.title')}</Text>

            <View style={styles.formContainer}>
              <Input
                label={t('signIn.username') || 'Username/Email/Phone'}
                value={username}
                onChangeText={setUsername}
                placeholder={t('signIn.enterUsernamePlaceholder')}
                autoCapitalize="none"
                containerStyle={styles.input}
                labelColor={COLORS.white}
              />

              <Input
                label={t('signIn.password')}
                value={password}
                onChangeText={setPassword}
                placeholder={t('signIn.enterPassword')}
                secureTextEntry={!showPassword}
                showPasswordToggle
                containerStyle={styles.input}
                labelColor={COLORS.white}
              />

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword' as never)}
              >
                <Text style={styles.forgotPasswordText}>{t('signIn.forgotPassword')}</Text>
              </TouchableOpacity>

              <Button
                title={loading ? t('signIn.signingIn') : t('signIn.signInButton')}
                onPress={handleSignIn}
                variant="outline"
                size="large"
                style={styles.signInButton}
                textStyle={styles.whiteButtonText}
                disabled={loading || !username.trim() || !password}
              />
              
              {loading && (
                <ActivityIndicator
                  size="small"
                  color={COLORS.white}
                  style={styles.loader}
                />
              )}

              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>{t('signIn.dontHaveAccount')} </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignUp' as never)}>
                  <Text style={styles.signUpLink}>{t('signIn.signUpLink')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </BlurView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary,
    opacity: 0.6,
  },
  blurContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: hp(10),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backButton: {
    // No margin needed as headerRow handles spacing
  },
  adminButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white + '20',
    borderWidth: 1,
    borderColor: COLORS.white + '40',
  },
  adminButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoImage: {
    width: normalize(120),
    height: normalize(120),
    borderRadius: normalize(60),
  },
  title: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  formContainer: {
    marginTop: SPACING.sm,
  },
  input: {
    marginBottom: SPACING.md,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.lg,
  },
  forgotPasswordText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
  },
  signInButton: {
    marginBottom: SPACING.md,
    borderColor: COLORS.white,
  },
  whiteButtonText: {
    color: COLORS.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.white,
    opacity: 0.3,
  },
  dividerText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    marginHorizontal: SPACING.md,
  },
  socialButton: {
    marginBottom: SPACING.md,
    borderColor: COLORS.white,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  signUpText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    lineHeight: FONTS.sizes.md * 1.4,
  },
  signUpLink: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: 'bold',
    lineHeight: FONTS.sizes.md * 1.4,
  },
  loader: {
    marginTop: SPACING.md,
  },
});

export default SignInScreen;

