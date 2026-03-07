import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronRight,
  User,
  Lock,
  Bell,
  Globe,
  CreditCard,
  HelpCircle,
  FileText,
  Info,
  Check,
  Wallet,
  UserX,
  Shield,
  Palette,
  LogOut,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { normalize } from '@utils/responsive';
import { useLanguage, Language } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { useAuth } from '@context/AuthContext';

const BRAND_YELLOW = '#F4AB04';
const BRAND_YELLOW_BG = '#FFF3CD';
const BRAND_DARK = '#1B1B1B';

const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  te: 'తెలుగు',
  hi: 'हिन्दी',
};

const NOTIFICATION_PREFS_KEY = '@forlok_notification_prefs';

type NotificationPrefs = {
  bookingUpdates: boolean;
  messages: boolean;
  promotions: boolean;
};

type SettingItem =
  | {
      id: string;
      icon: any;
      label: string;
      type: 'link';
      value?: string;
      onPress: () => void;
    }
  | {
      id: string;
      icon: any;
      label: string;
      type: 'toggle';
      value: boolean;
      onToggle: (value: boolean) => void;
    };

const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { language, changeLanguage, t } = useLanguage();
  const { isPinkMode, setPinkMode } = useTheme();
  const { logout, user } = useAuth();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    bookingUpdates: true,
    messages: true,
    promotions: false,
  });

  const loadPrefs = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as NotificationPrefs;
      setPrefs({
        bookingUpdates: !!parsed.bookingUpdates,
        messages: !!parsed.messages,
        promotions: !!parsed.promotions,
      });
    } catch (error) {
      console.error('Failed to load notification preferences', error);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const isFemaleUser = String(user?.gender || '').toLowerCase() === 'female';

  useEffect(() => {
    if (!isFemaleUser && isPinkMode) {
      void setPinkMode(false);
    }
  }, [isFemaleUser, isPinkMode, setPinkMode]);

  const updatePrefs = async (next: NotificationPrefs) => {
    setPrefs(next);
    try {
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Failed to save notification preferences', error);
      Alert.alert('Error', 'Could not save notification preferences.');
    }
  };

  const togglePref = (key: keyof NotificationPrefs, value: boolean) => {
    void updatePrefs({ ...prefs, [key]: value });
  };

  const handleLanguageChange = async (lang: Language) => {
    await changeLanguage(lang);
    setShowLanguageModal(false);
    Alert.alert(t('language.languageChanged'), '', [{ text: t('common.close') }]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const settingsSections = useMemo<{ title: string; items: SettingItem[] }[]>(
    () => [
      {
        title: t('settings.account'),
        items: [
          { id: 'edit-profile', icon: User, label: t('settings.editProfile'), type: 'link', onPress: () => navigation.navigate('EditProfile') },
          { id: 'change-password', icon: Lock, label: t('settings.changePassword'), type: 'link', onPress: () => navigation.navigate('ForgotPassword') },
          { id: 'blocked-users', icon: UserX, label: 'Blocked Users', type: 'link', onPress: () => navigation.navigate('BlockedUsers') },
          { id: 'privacy-settings', icon: Shield, label: t('settings.privacySettings'), type: 'link', onPress: () => navigation.navigate('PrivacyPolicy') },
        ],
      },
      {
        title: t('settings.notifications'),
        items: [
          { id: 'booking-updates', icon: Bell, label: t('settings.bookingUpdates'), type: 'toggle', value: prefs.bookingUpdates, onToggle: (v) => togglePref('bookingUpdates', v) },
          { id: 'messages', icon: Bell, label: t('settings.messages'), type: 'toggle', value: prefs.messages, onToggle: (v) => togglePref('messages', v) },
          { id: 'promotions', icon: Bell, label: t('settings.promotions'), type: 'toggle', value: prefs.promotions, onToggle: (v) => togglePref('promotions', v) },
          { id: 'notification-center', icon: Bell, label: 'Notification Center', type: 'link', onPress: () => navigation.navigate('Notifications') },
        ],
      },
      {
        title: t('settings.appPreferences'),
        items: [
          { id: 'language', icon: Globe, label: t('settings.language'), type: 'link', value: LANGUAGE_LABELS[language], onPress: () => setShowLanguageModal(true) },
          ...(isFemaleUser
            ? [{ id: 'theme', icon: Palette, label: 'HerPooling Theme', type: 'toggle' as const, value: isPinkMode, onToggle: (v: boolean) => setPinkMode(v) }]
            : []),
        ],
      },
      {
        title: 'Wallet & Coins',
        items: [
          { id: 'wallet', icon: Wallet, label: 'Wallet & Coins', type: 'link', onPress: () => navigation.navigate('Wallet') },
          { id: 'transaction-history', icon: CreditCard, label: 'Trip History', type: 'link', onPress: () => navigation.navigate('History') },
        ],
      },
      {
        title: t('settings.support'),
        items: [
          { id: 'help-center', icon: HelpCircle, label: t('settings.helpCenter'), type: 'link', onPress: () => navigation.navigate('HelpSupport') },
          { id: 'contact-us', icon: HelpCircle, label: t('settings.contactUs'), type: 'link', onPress: () => navigation.navigate('HelpSupport') },
          { id: 'report-issue', icon: HelpCircle, label: t('settings.reportIssue'), type: 'link', onPress: () => navigation.navigate('ReportBug') },
        ],
      },
      {
        title: t('settings.about'),
        items: [
          { id: 'about-us', icon: Info, label: 'About Us', type: 'link', onPress: () => navigation.navigate('About') },
          { id: 'terms', icon: FileText, label: t('settings.termsConditions'), type: 'link', onPress: () => navigation.navigate('TermsConditions') },
          { id: 'privacy', icon: FileText, label: t('settings.privacyPolicy'), type: 'link', onPress: () => navigation.navigate('PrivacyPolicy') },
          { id: 'ip', icon: Shield, label: 'Patents & Copyrights', type: 'link', onPress: () => navigation.navigate('IntellectualProperty') },
          { id: 'app-version', icon: Info, label: t('settings.appVersion'), type: 'link', value: '1.0.0', onPress: () => Alert.alert('App Version', 'ForLok v1.0.0') },
        ],
      },
    ],
    [t, navigation, language, prefs, isPinkMode, isFemaleUser, setPinkMode]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={BRAND_DARK} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage account and preferences</Text>
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + normalize(96), SPACING.xl * 2) }]}
        showsVerticalScrollIndicator={false}
      >
        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.settingItem,
                      itemIndex < section.items.length - 1 && styles.settingItemBorder,
                    ]}
                    onPress={item.type === 'link' ? item.onPress : undefined}
                    activeOpacity={item.type === 'link' ? 0.7 : 1}
                    disabled={item.type === 'toggle'}
                  >
                    <View style={styles.settingLeft}>
                      <View style={styles.iconCircle}>
                        <Icon size={16} color={BRAND_DARK} />
                      </View>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                    </View>
                    <View style={styles.settingRight}>
                      {item.type === 'toggle' ? (
                        <Switch
                          value={item.value}
                          onValueChange={item.onToggle}
                          trackColor={{ false: COLORS.lightGray, true: BRAND_YELLOW + '80' }}
                          thumbColor={item.value ? BRAND_YELLOW : COLORS.white}
                        />
                      ) : (
                        <>
                          {item.value ? <Text style={styles.settingValue}>{item.value}</Text> : null}
                          <ChevronRight size={18} color={COLORS.textSecondary} />
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <LogOut size={16} color={COLORS.white} />
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('language.selectLanguage')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.languageList}>
              {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.languageItem,
                    language === lang && styles.languageItemSelected,
                  ]}
                  onPress={() => handleLanguageChange(lang)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.languageItemText,
                      language === lang && styles.languageItemTextSelected,
                    ]}
                  >
                    {LANGUAGE_LABELS[lang]}
                  </Text>
                  {language === lang ? <Check size={20} color={BRAND_YELLOW} /> : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9EA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EFE5C7',
  },
  backBtn: {
    paddingVertical: normalize(6),
    paddingRight: normalize(8),
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(20),
    fontWeight: '700',
    color: BRAND_DARK,
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: '#7C6A2F',
    marginTop: 2,
  },
  headerRightPlaceholder: { width: normalize(38) },
  scrollContent: { padding: SPACING.md },
  section: { marginBottom: SPACING.md },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: COLORS.textSecondary,
    marginBottom: normalize(8),
    marginLeft: 2,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: '#F3DFA8',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: normalize(12),
  },
  settingItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: normalize(10),
  },
  iconCircle: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(14),
    backgroundColor: BRAND_YELLOW_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    color: COLORS.text,
    fontWeight: '500',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
  },
  settingValue: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: COLORS.textSecondary,
  },
  logoutButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: normalize(8),
    paddingVertical: normalize(13),
  },
  logoutText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    color: COLORS.white,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(18),
    color: COLORS.text,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: normalize(30),
    height: normalize(30),
    borderRadius: normalize(15),
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: normalize(16),
    color: COLORS.text,
    fontWeight: '700',
  },
  languageList: { gap: SPACING.sm },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  languageItemSelected: {
    borderColor: BRAND_YELLOW,
    backgroundColor: BRAND_YELLOW_BG,
  },
  languageItemText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(15),
    color: COLORS.text,
  },
  languageItemTextSelected: {
    color: BRAND_DARK,
    fontWeight: '700',
  },
});

export default SettingsScreen;
