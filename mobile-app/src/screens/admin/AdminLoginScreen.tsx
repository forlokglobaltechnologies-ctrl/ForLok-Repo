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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Eye, EyeOff, Shield } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { useLanguage } from '@context/LanguageContext';
import { adminApi } from '@utils/apiClient';
import { normalize } from '@utils/responsive';
import { useAuth } from '@context/AuthContext';

const AdminLoginScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { login } = useAuth();
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!adminId || !password) {
      Alert.alert(
        t('common.error'),
        !adminId ? t('admin.login.enterAdminIdError') : t('admin.login.enterPasswordError')
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await adminApi.login(adminId.trim(), password);
      
      if (response.success) {
        const adminData = response.data?.admin || {};
        const tokens = response.data?.tokens;

        if (!tokens?.accessToken || !tokens?.refreshToken) {
          Alert.alert(t('common.error'), t('admin.login.loginError'));
          return;
        }

        // Reuse app auth flow so admin routes become available by userType.
        await login(
          {
            ...adminData,
            userId: adminData.adminId || adminData.userId,
            userType: 'admin',
            name: adminData.name || adminData.username || 'Admin',
          },
          tokens
        );
      } else {
        Alert.alert(t('common.error'), response.error || t('admin.login.invalidCredentials'));
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      Alert.alert(t('common.error'), error.message || t('admin.login.loginError'));
    } finally {
      setIsLoading(false);
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={24} color={COLORS.white} />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Shield size={40} color={COLORS.primary} />
              </View>
            </View>

            <Text style={styles.title}>{t('admin.login.title')}</Text>
            <Text style={styles.subtitle}>{t('admin.login.restrictedArea')}</Text>

            <View style={styles.formContainer}>
              <Input
                label={t('admin.login.adminId')}
                value={adminId}
                onChangeText={setAdminId}
                placeholder={t('admin.login.enterAdminId')}
                autoCapitalize="none"
                containerStyle={styles.input}
                labelColor={COLORS.white}
              />

              <Input
                label={t('admin.login.password')}
                value={password}
                onChangeText={setPassword}
                placeholder={t('admin.login.enterPassword')}
                secureTextEntry={!showPassword}
                showPasswordToggle
                containerStyle={styles.input}
                labelColor={COLORS.white}
              />

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxText}>{t('admin.login.rememberMe')}</Text>
              </TouchableOpacity>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.white} />
                  <Text style={styles.loadingText}>{t('admin.login.verifyingCredentials')}</Text>
                </View>
              ) : (
                <Button
                  title={t('admin.login.login')}
                  onPress={handleLogin}
                  variant="outline"
                  size="large"
                  style={styles.loginButton}
                  textStyle={styles.whiteButtonText}
                  disabled={!adminId || !password}
                />
              )}

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => {}}
              >
                <Text style={styles.forgotPasswordText}>{t('admin.login.forgotPassword')}</Text>
              </TouchableOpacity>

              <View style={styles.securityNotice}>
                <Text style={styles.securityNoticeText}>
                  {t('admin.login.securityNotice')}
                </Text>
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
    opacity: 0.7,
  },
  blurContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
  },
  backButton: {
    marginBottom: SPACING.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoCircle: {
    width: normalize(100),
    height: normalize(100),
    borderRadius: normalize(50),
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  title: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    fontWeight: 'bold',
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    opacity: 0.9,
  },
  formContainer: {
    marginTop: SPACING.sm,
  },
  input: {
    marginBottom: SPACING.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  checkbox: {
    width: normalize(24),
    height: normalize(24),
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.white,
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
  },
  checkboxText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    marginTop: SPACING.sm,
  },
  loginButton: {
    marginBottom: SPACING.md,
    borderColor: COLORS.white,
  },
  whiteButtonText: {
    color: COLORS.white,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  forgotPasswordText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    textDecorationLine: 'underline',
  },
  securityNotice: {
    backgroundColor: COLORS.error + '30',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error + '50',
    marginTop: SPACING.md,
  },
  securityNoticeText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: normalize(20),
  },
});

export default AdminLoginScreen;
