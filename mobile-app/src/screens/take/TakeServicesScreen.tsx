import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Users, KeyRound } from 'lucide-react-native';
import { normalize, wp, hp } from '@utils/responsive';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';

const TakeServicesScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const checkDocumentsAndNavigate = async (serviceType: 'takePooling' | 'takeRental') => {
    try {
      console.log(`🔍 Checking documents status for ${serviceType}...`);
      
      // Import document utilities
      const { getUserDocuments, hasAllRequiredDocuments } = require('@utils/documentUtils');
      
      // Get existing documents from backend
      const existingDocuments = await getUserDocuments();
      
      console.log('📋 Existing documents:', existingDocuments);
      
      // Check if all required documents exist
      // Taking pooling: needs only Aadhar
      // Taking rental: needs Aadhar + License
      const hasAllDocuments = hasAllRequiredDocuments(serviceType, existingDocuments);
      
      console.log('✅ Has all required documents:', hasAllDocuments);
      
      if (!hasAllDocuments || !existingDocuments) {
        console.log('❌ Missing documents, navigating to DocumentVerification...');
        // Navigate to document verification screen
        navigation.navigate('DocumentVerification' as never, {
          serviceType,
          onComplete: () => {
            console.log('✅ Documents completed, navigating to search screen');
            // After documents uploaded, navigate to search screen
            if (serviceType === 'takePooling') {
              navigation.navigate('SearchPooling' as never);
            } else {
              navigation.navigate('SearchRental' as never);
            }
          },
        } as never);
      } else {
        console.log('✅ All documents present, navigating to search screen');
        // Documents exist, navigate directly
        if (serviceType === 'takePooling') {
          navigation.navigate('SearchPooling' as never);
        } else {
          navigation.navigate('SearchRental' as never);
        }
      }
    } catch (error) {
      console.error('❌ Error checking documents:', error);
      // If error, navigate to document verification
      navigation.navigate('DocumentVerification' as never, {
        serviceType,
        onComplete: () => {
          if (serviceType === 'takePooling') {
            navigation.navigate('SearchPooling' as never);
          } else {
            navigation.navigate('SearchRental' as never);
          }
        },
      } as never);
    }
  };

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
          <Text style={[styles.title, { color: theme.colors.white }]}>{t('takeServices.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.white }]}>{t('takeServices.subtitle')}</Text>
        </View>
      </LinearGradient>

      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => checkDocumentsAndNavigate('takePooling')}
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
                <Text style={[styles.optionTitle, { color: theme.colors.primary }]}>{t('takeServices.findPooling')}</Text>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <View style={[styles.bullet, { backgroundColor: theme.colors.primary }]} />
                    <Text style={[styles.featureText, { color: theme.colors.text }]}>{t('takeServices.poolingFeature1')}</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={[styles.bullet, { backgroundColor: theme.colors.primary }]} />
                    <Text style={[styles.featureText, { color: theme.colors.text }]}>{t('takeServices.poolingFeature2')}</Text>
                  </View>
                </View>
              </View>
            </BlurView>
          </ImageBackground>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => checkDocumentsAndNavigate('takeRental')}
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
                <Text style={[styles.optionTitle, { color: theme.colors.primary }]}>{t('takeServices.findRental')}</Text>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <View style={[styles.bullet, { backgroundColor: theme.colors.primary }]} />
                    <Text style={[styles.featureText, { color: theme.colors.text }]}>{t('takeServices.rentalFeature1')}</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <View style={[styles.bullet, { backgroundColor: theme.colors.primary }]} />
                    <Text style={[styles.featureText, { color: theme.colors.text }]}>{t('takeServices.rentalFeature2')}</Text>
                  </View>
                </View>
              </View>
            </BlurView>
          </ImageBackground>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    paddingTop: normalize(50),
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
    borderTopLeftRadius: normalize(32),
    borderTopRightRadius: normalize(32),
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
    marginRight: SPACING.md,
  },
  featureText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    flex: 1,
  },
});

export default TakeServicesScreen;
