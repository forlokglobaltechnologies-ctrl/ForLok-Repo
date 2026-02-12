import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ChevronRight, User, Lock, Bell, Globe, CreditCard, HelpCircle, FileText, Info, Check, Wallet, UserX, Shield } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { normalize } from '@utils/responsive';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { language, changeLanguage, t } = useLanguage();
  const [bookingUpdates, setBookingUpdates] = useState(true);
  const [messages, setMessages] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleLanguageChange = async (lang: 'en' | 'te' | 'hi') => {
    await changeLanguage(lang);
    setShowLanguageModal(false);
    Alert.alert(t('language.languageChanged'), '', [{ text: t('common.close') }]);
  };

  const settingsSections = [
    {
      title: t('settings.account'),
      items: [
        { icon: User, label: t('settings.editProfile'), onPress: () => navigation.navigate('Profile' as never) },
        { icon: Lock, label: t('settings.changePassword'), onPress: () => {} },
        { icon: UserX, label: 'Blocked Users', onPress: () => navigation.navigate('BlockedUsers' as never) },
        { icon: Bell, label: t('settings.privacySettings'), onPress: () => {} },
      ],
    },
    {
      title: t('settings.notifications'),
      items: [
        {
          icon: Bell,
          label: t('settings.bookingUpdates'),
          toggle: true,
          value: bookingUpdates,
          onToggle: setBookingUpdates,
        },
        {
          icon: Bell,
          label: t('settings.messages'),
          toggle: true,
          value: messages,
          onToggle: setMessages,
        },
        {
          icon: Bell,
          label: t('settings.promotions'),
          toggle: true,
          value: promotions,
          onToggle: setPromotions,
        },
      ],
    },
    {
      title: t('settings.appPreferences'),
      items: [
        {
          icon: Globe,
          label: t('settings.language'),
          value: language === 'en' ? t('language.english') : language === 'te' ? t('language.telugu') : t('language.hindi'),
          onPress: () => setShowLanguageModal(true),
        },
        { icon: Globe, label: t('settings.theme'), value: t('settings.light'), onPress: () => {} },
      ],
    },
    {
      title: t('settings.payment'),
      items: [
        { icon: Wallet, label: 'Wallet', onPress: () => navigation.navigate('Wallet' as never) },
        { icon: CreditCard, label: t('settings.paymentMethods'), onPress: () => {} },
        { icon: CreditCard, label: t('settings.transactionHistory'), onPress: () => {} },
      ],
    },
    {
      title: t('settings.support'),
      items: [
        { icon: HelpCircle, label: t('settings.helpCenter'), onPress: () => navigation.navigate('HelpSupport' as never) },
        { icon: HelpCircle, label: t('settings.contactUs'), onPress: () => navigation.navigate('HelpSupport' as never) },
        { icon: HelpCircle, label: t('settings.reportIssue'), onPress: () => navigation.navigate('ReportBug' as never) },
      ],
    },
    {
      title: t('settings.about'),
      items: [
        { icon: Info, label: 'About Us', onPress: () => navigation.navigate('About' as never) },
        { icon: FileText, label: t('settings.termsConditions'), onPress: () => {} },
        { icon: FileText, label: t('settings.privacyPolicy'), onPress: () => {} },
        { icon: Shield, label: 'Patents & Copyrights', onPress: () => navigation.navigate('IntellectualProperty' as never) },
        { icon: Info, label: t('settings.appVersion'), value: '1.0.0', onPress: () => {} },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Card style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={itemIndex}
                    style={[
                      styles.settingItem,
                      itemIndex < section.items.length - 1 && styles.settingItemBorder,
                    ]}
                    onPress={item.onPress}
                    disabled={item.toggle}
                  >
                    <View style={styles.settingLeft}>
                      <Icon size={20} color={COLORS.primary} />
                      <Text style={styles.settingLabel}>{item.label}</Text>
                    </View>
                    <View style={styles.settingRight}>
                      {item.toggle ? (
                        <Switch
                          value={item.value}
                          onValueChange={item.onToggle}
                          trackColor={{ false: COLORS.lightGray, true: COLORS.primary + '80' }}
                          thumbColor={item.value ? COLORS.primary : COLORS.white}
                        />
                      ) : (
                        <>
                          {item.value && (
                            <Text style={styles.settingValue}>{item.value}</Text>
                          )}
                          <ChevronRight size={20} color={COLORS.textSecondary} />
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Card>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutButton}>
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('language.selectLanguage')}</Text>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.languageList}>
              <TouchableOpacity
                style={[
                  styles.languageItem,
                  language === 'en' && styles.languageItemSelected,
                ]}
                onPress={() => handleLanguageChange('en')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.languageItemText,
                    language === 'en' && styles.languageItemTextSelected,
                  ]}
                >
                  {t('language.english')}
                </Text>
                {language === 'en' && <Check size={20} color={COLORS.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.languageItem,
                  language === 'te' && styles.languageItemSelected,
                ]}
                onPress={() => handleLanguageChange('te')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.languageItemText,
                    language === 'te' && styles.languageItemTextSelected,
                  ]}
                >
                  {t('language.telugu')}
                </Text>
                {language === 'te' && <Check size={20} color={COLORS.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.languageItem,
                  language === 'hi' && styles.languageItemSelected,
                ]}
                onPress={() => handleLanguageChange('hi')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.languageItemText,
                    language === 'hi' && styles.languageItemTextSelected,
                  ]}
                >
                  {t('language.hindi')}
                </Text>
                {language === 'hi' && <Check size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.xl,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  placeholder: { width: normalize(40) },
  scrollContent: { padding: SPACING.md },
  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  sectionCard: { padding: 0 },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  settingLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  settingValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    padding: SPACING.md,
    borderRadius: normalize(8),
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  logoutText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: normalize(18),
    color: COLORS.text,
    fontWeight: 'bold',
  },
  languageList: {
    gap: SPACING.sm,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.lightGray,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageItemSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  languageItemText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  languageItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default SettingsScreen;
