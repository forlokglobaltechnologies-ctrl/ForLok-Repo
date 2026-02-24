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
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '@constants/theme';
import { Input } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { authApi } from '@utils/apiClient';
import { normalize, hp } from '@utils/responsive';
import { useSnackbar } from '@context/SnackbarContext';
import { getUserErrorMessage, mapFieldErrors } from '@utils/errorUtils';

type ChangePasswordRouteParams = {
  phone?: string;
};

const ChangePasswordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { showSnackbar } = useSnackbar();
  const phone = ((route.params as ChangePasswordRouteParams) || {}).phone || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleUpdatePassword = async () => {
    if (!phone) {
      showSnackbar({ message: 'Phone number missing. Please restart forgot password flow.', type: 'error' });
      navigation.navigate('ForgotPassword' as never);
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setErrors((prev) => ({ ...prev, newPassword: 'Password must be at least 8 characters long' }));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const response = await authApi.resetPassword(phone, newPassword);
      if (response.success) {
        showSnackbar({
          message: 'Password updated successfully. Please sign in with your new password.',
          type: 'success',
        });
        navigation.navigate('SignIn' as never);
        return;
      }

      const fieldErrors = mapFieldErrors(response as any, {
        newPassword: 'newPassword',
        confirmPassword: 'confirmPassword',
      });
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
      showSnackbar({
        message: getUserErrorMessage(response as any, 'Could not update password. Please try again.'),
        type: 'error',
      });
    } catch (error: any) {
      showSnackbar({
        message: error?.message || 'Could not update password. Please try again.',
        type: 'error',
      });
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
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <Image
              source={require('../../../assets/forlok_change_password_blue_bg_v1.png')}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>

          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>Create a new secure password for {phone}</Text>

          <View style={styles.formCard}>
            <Input
              label="New Password"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
              }}
              placeholder="Enter new password"
              secureTextEntry
              showPasswordToggle
              error={errors.newPassword}
              containerStyle={styles.input}
            />
            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              placeholder="Re-enter password"
              secureTextEntry
              showPasswordToggle
              error={errors.confirmPassword}
              containerStyle={styles.input}
            />
            <Button
              title={loading ? 'Updating Password...' : 'Update Password'}
              onPress={handleUpdatePassword}
              variant="primary"
              size="large"
              style={styles.button}
              disabled={loading}
            />
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
    paddingTop: SPACING.sm,
    paddingBottom: normalize(64),
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
  button: { marginTop: normalize(4) },
});

export default ChangePasswordScreen;
