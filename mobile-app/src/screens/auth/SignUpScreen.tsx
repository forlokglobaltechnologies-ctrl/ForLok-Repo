import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, User, Globe, ChevronDown, Check } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { useLanguage, Language } from '@context/LanguageContext';
import { normalize, wp, hp } from '@utils/responsive';
import { masterDataApi } from '@utils/apiClient';

const ACCENT = '#F9A825';
const SUPPORTED_LANGUAGES: Language[] = ['en', 'te', 'hi'];

const SignUpScreen = () => {
  const navigation = useNavigation();
  const { language, changeLanguage, t } = useLanguage();
  const [showLang, setShowLang] = useState(false);

  const [languages, setLanguages] = useState<Array<{ code: string; label: string }>>([
    { code: 'en', label: 'English' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'hi', label: 'हिन्दी' },
  ]);

  React.useEffect(() => {
    const loadLanguageOptions = async () => {
      const res = await masterDataApi.getByType('language');
      if (res.success && (res.data as any)?.items?.length) {
        const options = ((res.data as any).items as any[])
          .filter((item) => item?.isActive !== false)
          .map((item) => ({
            code: String(item.value || item.key || '').trim().toLowerCase(),
            label: String(item.label || item.value || item.key || '').trim(),
          }))
          .filter((item) => item.code && item.label);
        if (options.length > 0) {
          setLanguages(options);
        }
      }
    };
    void loadLanguageOptions();
  }, []);

  const currentLang = languages.find((l) => l.code === language);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('Onboarding' as never);
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#1A1A1A" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.langPill}
          onPress={() => setShowLang(!showLang)}
          activeOpacity={0.7}
        >
          <Globe size={16} color={ACCENT} />
          <Text style={styles.langPillText}>{currentLang?.label}</Text>
          <ChevronDown size={14} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Language dropdown */}
      {showLang && (
        <View style={styles.langDropdown}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.langOption,
                language === lang.code && styles.langOptionActive,
              ]}
              onPress={async () => {
                if (!SUPPORTED_LANGUAGES.includes(lang.code as Language)) {
                  Alert.alert(
                    'Language Not Configured',
                    `${lang.label} is visible from master data, but translations are not configured yet.`
                  );
                  return;
                }
                await changeLanguage(lang.code as Language);
                setShowLang(false);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.langOptionText,
                  language === lang.code && styles.langOptionTextActive,
                ]}
              >
                {lang.label}
              </Text>
              {language === lang.code && (
                <Check size={16} color={ACCENT} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <View style={styles.illustrationWrap}>
          <Image
            source={require('../../../assets/signup_illustration.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('signUp.title')}</Text>
        <Text style={styles.subtitle}>{t('signUp.subtitle')}</Text>

        {/* Option cards */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('IndividualRegistration' as never)}
          activeOpacity={0.8}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#FFF4E6' }]}>
            <User size={24} color="#B85E00" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>{t('signUp.individualTitle')}</Text>
            <Text style={styles.optionDesc}>{t('signUp.individualFeature1')}</Text>
          </View>
          <ChevronDown
            size={20}
            color="#BBBBBB"
            style={{ transform: [{ rotate: '-90deg' }] }}
          />
        </TouchableOpacity>

        {/* Sign in link */}
        <View style={styles.signInRow}>
          <Text style={styles.signInText}>{t('signUp.alreadyHaveAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn' as never)}>
            <Text style={styles.signInLink}>{t('signUp.signInLink')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    paddingTop: hp(6),
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E9E9E9',
  },
  backBtn: {
    paddingVertical: normalize(6),
    paddingRight: normalize(8),
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
    gap: normalize(5),
  },
  langPillText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.xs,
    color: '#333333',
  },
  langDropdown: {
    position: 'absolute',
    top: hp(6) + normalize(48),
    right: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E0',
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    minWidth: normalize(140),
    overflow: 'hidden',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: normalize(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  langOptionActive: {
    backgroundColor: '#FFFDE7',
  },
  langOptionText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#555555',
  },
  langOptionTextActive: {
    fontFamily: FONTS.semiBold,
    color: ACCENT,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: hp(4),
  },
  illustrationWrap: {
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  illustration: {
    width: wp(80),
    height: hp(26),
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: normalize(26),
    color: '#1A1A1A',
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#888888',
    marginBottom: SPACING.xl,
    marginTop: SPACING.xs,
    lineHeight: normalize(20),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E0',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: normalize(50),
    height: normalize(50),
    borderRadius: normalize(25),
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  optionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.md,
    color: '#1A1A1A',
    marginBottom: normalize(2),
  },
  optionDesc: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: '#999999',
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  signInText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#999999',
  },
  signInLink: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.sm,
    color: ACCENT,
  },
});

export default SignUpScreen;
