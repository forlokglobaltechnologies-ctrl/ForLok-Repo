import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, User, Building, Globe, Check } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { BlurView } from 'expo-blur';
import { useLanguage } from '@context/LanguageContext';
import { normalize, wp, hp } from '@utils/responsive';

const SignUpScreen = () => {
  const navigation = useNavigation();
  const { language, changeLanguage, t } = useLanguage();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.gradientBackground}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.title}>{t('signUp.title')}</Text>
          <Text style={styles.subtitle}>{t('signUp.subtitle')}</Text>
        </View>
      </LinearGradient>

      <View style={styles.cardContainer}>
        {/* Language Selector */}
        <View style={styles.languageContainer}>
          <TouchableOpacity
            style={styles.languageSelector}
            onPress={() => setShowLanguageSelector(!showLanguageSelector)}
            activeOpacity={0.8}
          >
            <Globe size={20} color={COLORS.primary} />
            <Text style={styles.languageLabel}>{t('signUp.selectLanguage')}</Text>
            <Text style={styles.languageValue}>
              {language === 'en' ? t('signUp.english') : language === 'te' ? t('signUp.telugu') : t('signUp.hindi')}
            </Text>
            <Text style={styles.languageArrow}>{showLanguageSelector ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showLanguageSelector && (
            <View style={styles.languageOptions}>
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  language === 'en' && styles.languageOptionSelected,
                ]}
                onPress={async () => {
                  await changeLanguage('en');
                  setShowLanguageSelector(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.languageOptionText,
                    language === 'en' && styles.languageOptionTextSelected,
                  ]}
                >
                  {t('signUp.english')}
                </Text>
                {language === 'en' && <Check size={18} color={COLORS.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.languageOption,
                  language === 'te' && styles.languageOptionSelected,
                ]}
                onPress={async () => {
                  await changeLanguage('te');
                  setShowLanguageSelector(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.languageOptionText,
                    language === 'te' && styles.languageOptionTextSelected,
                  ]}
                >
                  {t('signUp.telugu')}
                </Text>
                {language === 'te' && <Check size={18} color={COLORS.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.languageOption,
                  language === 'hi' && styles.languageOptionSelected,
                ]}
                onPress={async () => {
                  await changeLanguage('hi');
                  setShowLanguageSelector(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.languageOptionText,
                    language === 'hi' && styles.languageOptionTextSelected,
                  ]}
                >
                  {t('signUp.hindi')}
                </Text>
                {language === 'hi' && <Check size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('IndividualRegistration' as never)}
          activeOpacity={0.8}
        >
          <ImageBackground
            source={require('../../../assets/user.jpg')}
            style={styles.cardBackground}
            imageStyle={styles.cardBackgroundImage}
            resizeMode="cover"
          >
            <BlurView intensity={20} style={styles.blurContainer}>
              <View style={styles.cardContent}>
                <View style={styles.iconWrapper}>
                  <User size={36} color={COLORS.primary} />
                </View>
                <Text style={styles.optionTitle}>{t('signUp.individualTitle')}</Text>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.featureText}>{t('signUp.individualFeature1')}</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.featureText}>{t('signUp.individualFeature2')}</Text>
                  </View>
                </View>
              </View>
            </BlurView>
          </ImageBackground>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('CompanyRegistration' as never)}
          activeOpacity={0.8}
        >
          <ImageBackground
            source={require('../../../assets/company.jpg')}
            style={styles.cardBackground}
            imageStyle={styles.cardBackgroundImage}
            resizeMode="cover"
          >
            <BlurView intensity={20} style={styles.blurContainer}>
              <View style={styles.cardContent}>
                <View style={styles.iconWrapper}>
                  <Building size={36} color={COLORS.primary} />
                </View>
                <Text style={styles.optionTitle}>{t('signUp.companyTitle')}</Text>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.featureText}>{t('signUp.companyFeature1')}</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.featureText}>{t('signUp.companyFeature2')}</Text>
                  </View>
                </View>
              </View>
            </BlurView>
          </ImageBackground>
        </TouchableOpacity>

        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>{t('signUp.alreadyHaveAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn' as never)}>
            <Text style={styles.signInLink}>{t('signUp.signInLink')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  gradientBackground: {
    paddingTop: hp(6),
    paddingBottom: SPACING.xl,
    minHeight: hp(25),
  },
  backButton: {
    marginLeft: SPACING.md,
    padding: SPACING.sm,
    alignSelf: 'flex-start',
  },
  headerContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  title: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxxl,
    color: COLORS.white,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    opacity: 0.9,
  },
  cardContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: normalize(32),
    borderTopRightRadius: normalize(32),
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  languageContainer: {
    marginBottom: SPACING.lg,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  languageLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  languageValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: SPACING.xs,
  },
  languageArrow: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: COLORS.primary,
  },
  languageOptions: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  languageOptionSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  languageOptionText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  languageOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  optionCard: {
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    ...SHADOWS.md,
    overflow: 'hidden',
  },
  cardBackground: {
    width: '100%',
  },
  cardBackgroundImage: {
    borderRadius: BORDER_RADIUS.xl,
  },
  blurContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  cardContent: {
    padding: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  iconWrapper: {
    width: normalize(72),
    height: normalize(72),
    borderRadius: normalize(36),
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    alignSelf: 'center',
    ...SHADOWS.sm,
  },
  optionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  featuresList: {
    marginTop: SPACING.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  bullet: {
    width: normalize(6),
    height: normalize(6),
    borderRadius: normalize(3),
    backgroundColor: COLORS.primary,
    marginRight: SPACING.md,
  },
  featureText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    flex: 1,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  signInText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  signInLink: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

export default SignUpScreen;

