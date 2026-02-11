import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, User, Building, Check } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';

const UserTypeSelectionScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [selectedType, setSelectedType] = React.useState<'individual' | 'company' | null>(null);

  const handleSelect = (type: 'individual' | 'company') => {
    setSelectedType(type);
    // Navigate after a brief delay to show selection
    setTimeout(() => {
      if (type === 'individual') {
        navigation.navigate('IndividualRegistration' as never);
      } else {
        navigation.navigate('CompanyRegistration' as never);
      }
    }, 200);
  };

  return (
    <View style={styles.container}>
      {/* Header Section with Image Background */}
      <View style={styles.imageSection}>
        <ImageBackground
          source={require('../../../assets/jeep.jpg')}
          style={styles.imageBackground}
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={COLORS.primary} />
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <Text style={styles.title}>Create Your Account</Text>
              <Text style={styles.subtitle}>
                Choose how you want to use YAARYATHRA
              </Text>
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* Options Section */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Individual User Card */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            selectedType === 'individual' && styles.selectedCard,
          ]}
          onPress={() => handleSelect('individual')}
          activeOpacity={0.8}
        >
          {selectedType === 'individual' && (
            <View style={styles.checkBadge}>
              <Check size={18} color={COLORS.white} strokeWidth={3} />
            </View>
          )}

          <View style={styles.iconContainer}>
            <User size={40} color={COLORS.primary} strokeWidth={2} />
          </View>

          <Text style={styles.cardTitle}>{t('userTypeSelection.personalUse')}</Text>

          <View style={styles.divider} />

          <View style={styles.featuresList}>
            <FeatureItem text={t('userTypeSelection.personalFeature1')} />
            <FeatureItem text={t('userTypeSelection.personalFeature2')} />
            <FeatureItem text={t('userTypeSelection.personalFeature3')} />
            <FeatureItem text={t('userTypeSelection.personalFeature4')} />
          </View>
        </TouchableOpacity>

        {/* Company User Card */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            selectedType === 'company' && styles.selectedCard,
          ]}
          onPress={() => handleSelect('company')}
          activeOpacity={0.8}
        >
          {selectedType === 'company' && (
            <View style={styles.checkBadge}>
              <Check size={18} color={COLORS.white} strokeWidth={3} />
            </View>
          )}

          <View style={styles.iconContainer}>
            <Building size={40} color={COLORS.primary} strokeWidth={2} />
          </View>

          <Text style={styles.cardTitle}>{t('userTypeSelection.businessOwners')}</Text>

          <View style={styles.divider} />

          <View style={styles.featuresList}>
            <FeatureItem text={t('userTypeSelection.businessFeature1')} />
            <FeatureItem text={t('userTypeSelection.businessFeature2')} />
            <FeatureItem text={t('userTypeSelection.businessFeature3')} />
            <FeatureItem text={t('userTypeSelection.businessFeature4')} />
          </View>
        </TouchableOpacity>

        {/* Sign In Link */}
        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>{t('userTypeSelection.alreadyHaveAccount')} </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('SignIn' as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.signInLink}>{t('common.signIn')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// Helper Component for Feature Items
const FeatureItem = ({ text }: { text: string }) => (
  <View style={styles.featureItem}>
    <View style={styles.bullet} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  imageSection: {
    width: '100%',
    height: 220,
  },
  imageBackground: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingTop: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
    marginTop: SPACING.sm,
    ...SHADOWS.sm,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxxl,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  optionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    ...SHADOWS.md,
    position: 'relative',
  },
  selectedCard: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
    transform: [{ scale: 1.02 }],
  },
  checkBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: SPACING.md,
    opacity: 0.5,
  },
  featuresList: {
    gap: SPACING.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.md,
  },
  featureText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    flex: 1,
    lineHeight: 20,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    paddingTop: SPACING.md,
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
    textDecorationLine: 'underline',
  },
});

export default UserTypeSelectionScreen;
