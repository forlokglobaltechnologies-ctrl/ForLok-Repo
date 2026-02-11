import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  Linking,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Heart,
  Globe,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  ExternalLink,
  Users,
  Car,
  Shield,
  Leaf,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AboutScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const features = [
    {
      icon: Users,
      title: 'Community First',
      description: 'Connect with trusted travelers and share rides safely',
      color: '#4CAF50',
    },
    {
      icon: Shield,
      title: 'Safe & Secure',
      description: 'Verified users, secure payments, and 24/7 support',
      color: '#2196F3',
    },
    {
      icon: Leaf,
      title: 'Eco-Friendly',
      description: 'Reduce carbon footprint by sharing your journey',
      color: '#66BB6A',
    },
    {
      icon: Car,
      title: 'Flexible Options',
      description: 'Pooling for daily commutes, rentals for special occasions',
      color: '#FF9800',
    },
  ];

  const stats = [
    { value: '50K+', label: 'Users', icon: Users },
    { value: '120K+', label: 'Rides', icon: Car },
    { value: '4.8', label: 'Rating', icon: Sparkles },
  ];

  const contactItems = [
    { icon: Mail, label: 'Email', value: 'support@forlok.com', action: 'mailto:support@forlok.com' },
    { icon: Phone, label: 'Phone', value: '+91 98765 43210', action: 'tel:+919876543210' },
    { icon: Globe, label: 'Website', value: 'www.forlok.com', action: 'https://forlok.com' },
    { icon: MapPin, label: 'Address', value: 'Hyderabad, Telangana, India', action: null },
  ];

  const legalItems = [
    { label: 'Terms & Conditions', route: 'TermsConditions' },
    { label: 'Privacy Policy', route: 'PrivacyPolicy' },
    { label: 'Patents & Copyrights', route: 'IntellectualProperty' },
  ];

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Error opening link:', err));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Hero Header ── */}
      <ImageBackground
        source={require('../../../assets/about.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={40} style={styles.blurContainer}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>About Us</Text>
            <View style={{ width: 38 }} />
          </View>
        </BlurView>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Brand Card ── */}
        <View style={[styles.brandCard, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.logoCircle, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.logoLetter}>F</Text>
          </View>
          <Text style={[styles.brandName, { color: theme.colors.text }]}>Forlok</Text>
          <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>Your Journey, Our Commitment</Text>
          <View style={[styles.versionPill, { backgroundColor: theme.colors.primary + '12' }]}>
            <Text style={[styles.versionText, { color: theme.colors.primary }]}>v1.0.0</Text>
          </View>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          {stats.map((stat, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <stat.icon size={18} color={theme.colors.primary} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Mission Card ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardTitleIcon, { backgroundColor: theme.colors.primary + '12' }]}>
              <Target size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Who We Are</Text>
          </View>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            Forlok is a revolutionary ride-sharing platform designed specifically for Indian travelers.
            We connect people who are heading in the same direction, making travel more affordable,
            social, and environmentally friendly.
          </Text>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
            Whether you're commuting daily or planning a long trip, Forlok helps you find the
            perfect travel companion while sharing costs and reducing your carbon footprint.
          </Text>
        </View>

        {/* ── Features Grid ── */}
        <View style={styles.sectionTitleRow}>
          <Zap size={18} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Why Choose Forlok</Text>
        </View>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <View key={index} style={[styles.featureCard, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.featureIconCircle, { backgroundColor: feature.color + '15' }]}>
                  <Icon size={22} color={feature.color} />
                </View>
                <Text style={[styles.featureTitle, { color: theme.colors.text }]}>{feature.title}</Text>
                <Text style={[styles.featureDesc, { color: theme.colors.textSecondary }]}>{feature.description}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Contact Card ── */}
        <View style={styles.sectionTitleRow}>
          <Mail size={18} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Contact Us</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, padding: 0 }]}>
          {contactItems.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />}
              <TouchableOpacity
                style={styles.contactRow}
                onPress={item.action ? () => handleOpenLink(item.action!) : undefined}
                activeOpacity={item.action ? 0.7 : 1}
              >
                <View style={[styles.contactIconWrap, { backgroundColor: theme.colors.primary + '12' }]}>
                  <item.icon size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
                  <Text style={[styles.contactValue, { color: theme.colors.text }]}>{item.value}</Text>
                </View>
                {item.action && <ExternalLink size={15} color={theme.colors.textSecondary} />}
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* ── Legal Card ── */}
        <View style={styles.sectionTitleRow}>
          <Shield size={18} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Legal</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, padding: 0 }]}>
          {legalItems.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />}
              <TouchableOpacity style={styles.legalRow} onPress={() => navigation.navigate(item.route)}>
                <Text style={[styles.legalText, { color: theme.colors.text }]}>{item.label}</Text>
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>Made with</Text>
            <Heart size={14} color="#F44336" fill="#F44336" />
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>in India</Text>
          </View>
          <Text style={[styles.copyright, { color: theme.colors.textSecondary }]}>
            {'\u00A9'} 2026 Forlok. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  /* ── Container ── */
  container: {
    flex: 1,
  },

  /* ── Hero Header ── */
  headerImage: {
    width: '100%',
    height: 160,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.78,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 22,
    color: '#FFF',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.4,
  },

  /* ── Scroll ── */
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },

  /* ── Brand Card ── */
  brandCard: {
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  logoLetter: {
    fontFamily: FONTS.regular,
    fontSize: 30,
    fontWeight: '900',
    color: '#FFF',
  },
  brandName: {
    fontFamily: FONTS.regular,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.sm,
  },
  versionPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  versionText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: '700',
  },

  /* ── Stats Row ── */
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    ...SHADOWS.sm,
  },
  statValue: {
    fontFamily: FONTS.regular,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '500',
  },

  /* ── Generic Card ── */
  card: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.md,
  },
  cardTitleIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: FONTS.regular,
    fontSize: 17,
    fontWeight: '700',
  },
  bodyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },

  /* ── Section Title ── */
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: 17,
    fontWeight: '700',
  },

  /* ── Features Grid ── */
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  featureCard: {
    width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.sm) / 2,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  featureIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  featureTitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },

  /* ── Contact ── */
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },
  contactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  contactValue: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginHorizontal: SPACING.lg,
  },

  /* ── Legal ── */
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 15,
  },
  legalText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '500',
  },

  /* ── Footer ── */
  footer: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    gap: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
  },
  copyright: {
    fontFamily: FONTS.regular,
    fontSize: 11,
  },
});

export default AboutScreen;
