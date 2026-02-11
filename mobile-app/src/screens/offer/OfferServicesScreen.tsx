import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Users, KeyRound } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';

const OfferServicesScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark || theme.colors.primary]}
        style={styles.gradientBackground}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
            <ArrowLeft size={24} color={theme.colors.white} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: theme.colors.white }]}>{t('offerServices.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.white }]}>{t('offerServices.subtitle')}</Text>
        </View>
      </LinearGradient>

      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('CreatePoolingOffer' as never)}
          activeOpacity={0.8}
        >
          <ImageBackground
            source={require('../../../assets/pooling.jpg')}
            style={styles.cardBackground}
            imageStyle={styles.cardBackgroundImage}
            resizeMode="cover"
          >
            <BlurView intensity={20} style={styles.blurContainer}>
              <View style={styles.cardContent}>
                <View style={styles.iconWrapper}>
                  <Users size={36} color={theme.colors.primary} />
                </View>
                <Text style={[styles.optionTitle, { color: theme.colors.primary }]}>{t('offerServices.pooling')}</Text>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <View style={[styles.bullet, { backgroundColor: theme.colors.primary }]} />
                    <Text style={[styles.featureText, { color: theme.colors.text }]}>{t('offerServices.poolingFeature1')}</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={[styles.bullet, { backgroundColor: theme.colors.primary }]} />
                    <Text style={[styles.featureText, { color: theme.colors.text }]}>{t('offerServices.poolingFeature2')}</Text>
                  </View>
                </View>
            </View>
            </BlurView>
          </ImageBackground>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('CreateRentalOffer' as never)}
          activeOpacity={0.8}
        >
          <ImageBackground
            source={require('../../../assets/rental.jpg')}
            style={styles.cardBackground}
            imageStyle={styles.cardBackgroundImage}
            resizeMode="cover"
          >
            <BlurView intensity={20} style={styles.blurContainer}>
              <View style={styles.cardContent}>
                <View style={styles.iconWrapper}>
                  <KeyRound size={36} color={theme.colors.primary} />
                </View>
                <Text style={[styles.optionTitle, { color: theme.colors.primary }]}>{t('offerServices.rental')}</Text>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <View style={[styles.bullet, { backgroundColor: theme.colors.primary }]} />
                    <Text style={[styles.featureText, { color: theme.colors.text }]}>{t('offerServices.rentalFeature1')}</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={[styles.bullet, { backgroundColor: theme.colors.primary }]} />
                    <Text style={[styles.featureText, { color: theme.colors.text }]}>{t('offerServices.rentalFeature2')}</Text>
                  </View>
                </View>
              </View>
            </BlurView>
          </ImageBackground>
        </TouchableOpacity>

        <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
          {t('offerServices.note')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    paddingTop: 50,
    paddingBottom: SPACING.xl,
    minHeight: 200,
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
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    opacity: 0.9,
  },
  cardContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
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
    width: 72,
    height: 72,
    borderRadius: 36,
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
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: SPACING.md,
  },
  featureText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    flex: 1,
  },
  note: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginTop: SPACING.lg,
    fontStyle: 'italic',
  },
});

export default OfferServicesScreen;

