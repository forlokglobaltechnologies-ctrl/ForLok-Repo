import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Settings, Lock, Bell, Shield } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Input } from '@components/common/Input';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { normalize } from '@utils/responsive';
import { adminApi } from '@utils/apiClient';

const AdminSettingsScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [platformFee, setPlatformFee] = useState('0');
  const [minBookingAmount, setMinBookingAmount] = useState('100');
  const [maxBookingAmount, setMaxBookingAmount] = useState('50000');
  const [autoApproveHours, setAutoApproveHours] = useState('24');
  const [requireManualApproval, setRequireManualApproval] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const res = await adminApi.getSettings();
      if (res.success && res.data) {
        const data = res.data as any;
        setPlatformFee(String(data.platformFee ?? '0'));
        setMinBookingAmount(String(data.minBookingAmount ?? '100'));
        setMaxBookingAmount(String(data.maxBookingAmount ?? '50000'));
        setAutoApproveHours(String(data.autoApproveHours ?? '24'));
        setRequireManualApproval(Boolean(data.requireManualApproval ?? true));
        setEmailNotifications(Boolean(data.emailNotifications ?? true));
        setSmsNotifications(Boolean(data.smsNotifications ?? false));
      }
    };
    void loadSettings();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.settings.title')}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>{t('admin.settings.systemSettings')}</Text>

        {/* Platform Configuration */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('admin.settings.platformConfiguration')}:</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('admin.settings.platformFee')}</Text>
            <Input
              value={platformFee}
              onChangeText={setPlatformFee}
              placeholder="0"
              keyboardType="numeric"
              containerStyle={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('admin.settings.minBookingAmount')}</Text>
            <Input
              value={minBookingAmount}
              onChangeText={setMinBookingAmount}
              placeholder="₹100"
              keyboardType="numeric"
              containerStyle={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('admin.settings.maxBookingAmount')}</Text>
            <Input
              value={maxBookingAmount}
              onChangeText={setMaxBookingAmount}
              placeholder="₹50,000"
              keyboardType="numeric"
              containerStyle={styles.input}
            />
          </View>
        </Card>

        {/* Verification Settings */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('admin.settings.verificationSettings')}:</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('admin.settings.autoApproveAfter')}</Text>
            <Input
              value={autoApproveHours}
              onChangeText={setAutoApproveHours}
              placeholder="24"
              keyboardType="numeric"
              containerStyle={styles.input}
            />
          </View>
          <View style={styles.switchGroup}>
            <Text style={styles.switchLabel}>{t('admin.settings.requireManualApproval')}</Text>
            <Switch
              value={requireManualApproval}
              onValueChange={setRequireManualApproval}
              trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
        </Card>

        {/* Notification Settings */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('admin.settings.notificationSettings')}:</Text>
          <View style={styles.switchGroup}>
            <Text style={styles.switchLabel}>{t('admin.settings.emailNotifications')}</Text>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
          <View style={styles.switchGroup}>
            <Text style={styles.switchLabel}>{t('admin.settings.smsNotifications')}</Text>
            <Switch
              value={smsNotifications}
              onValueChange={setSmsNotifications}
              trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
        </Card>

        {/* Admin Account */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t('admin.settings.adminAccount')}:</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Lock size={20} color={COLORS.primary} />
            <Text style={styles.menuItemText}>{t('admin.settings.changePassword')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Shield size={20} color={COLORS.primary} />
            <Text style={styles.menuItemText}>{t('admin.settings.twoFactorAuth')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Bell size={20} color={COLORS.primary} />
            <Text style={styles.menuItemText}>{t('admin.settings.activityLog')}</Text>
          </TouchableOpacity>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title={t('admin.settings.saveChanges')}
            onPress={async () => {
              setLoading(true);
              const payload = {
                platformFee: Number(platformFee || 0),
                minBookingAmount: Number(minBookingAmount || 0),
                maxBookingAmount: Number(maxBookingAmount || 0),
                autoApproveHours: Number(autoApproveHours || 0),
                requireManualApproval,
                emailNotifications,
                smsNotifications,
              };
              const res = await adminApi.updateSettings(payload);
              setLoading(false);
              if (res.success) {
                Alert.alert('Success', 'Settings saved successfully.');
              } else {
                Alert.alert('Error', res.error || 'Failed to save settings.');
              }
            }}
            variant="primary"
            size="large"
            style={styles.saveButton}
            loading={loading}
          />
          <Button
            title={t('admin.settings.resetToDefault')}
            onPress={() => {
              setPlatformFee('0');
              setMinBookingAmount('100');
              setMaxBookingAmount('50000');
              setAutoApproveHours('24');
              setRequireManualApproval(true);
              setEmailNotifications(true);
              setSmsNotifications(false);
            }}
            variant="outline"
            size="large"
            style={styles.resetButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.primary,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: SPACING.sm,
  },
  headerRight: {
    width: normalize(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  card: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  cardTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    marginBottom: 0,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  switchLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  menuItemText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  actionButtons: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  saveButton: {
    marginBottom: SPACING.sm,
  },
  resetButton: {
    marginBottom: SPACING.xl,
  },
});

export default AdminSettingsScreen;
