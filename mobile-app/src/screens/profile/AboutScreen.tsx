import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
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
import { normalize } from '@utils/responsive';
import { FONTS } from '@constants/theme';
import { useTheme } from '@context/ThemeContext';
import { useContentPage } from '../../hooks/useContentPage';
import { resolveContentIcon } from '@utils/contentIcons';
import { CONTENT_DEFAULTS } from '@constants/contentDefaults';

const AboutScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { data: contentData } = useContentPage<any>('about', CONTENT_DEFAULTS.about as any);

  const legalItems = [
    { label: 'Terms of Service', route: 'TermsConditions' },
    { label: 'Privacy Policy', route: 'PrivacyPolicy' },
    { label: 'Intellectual Property', route: 'IntellectualProperty' },
  ];

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Error opening link:', err));
  };

  const features = contentData.features.map((item: any) => ({
    ...item,
    icon: typeof item.icon === 'string' ? resolveContentIcon(item.icon, Car) : item.icon,
  }));
  const stats = contentData.stats.map((item: any) => ({
    ...item,
    icon: typeof item.icon === 'string' ? resolveContentIcon(item.icon, Users) : item.icon,
  }));
  const contactItems = contentData.contactItems.map(
    (item: any) => ({
      ...item,
      icon: typeof item.icon === 'string' ? resolveContentIcon(item.icon, Mail) : item.icon,
    })
  );

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={normalize(22)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>About</Text>
        <View style={{ width: normalize(38) }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Card */}
        <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, alignItems: 'center' }]}>
          {contentData.logoUrl ? (
            <Image
              source={{ uri: contentData.logoUrl }}
              style={s.logoImage}
              resizeMode="contain"
            />
          ) : (
            <View style={[s.logoCircle, { backgroundColor: theme.colors.primary }]}>
              <Text style={s.logoLetter}>
                {String(contentData.brandName || 'F').trim().charAt(0).toUpperCase() || 'F'}
              </Text>
            </View>
          )}
          <Text style={[s.brandName, { color: theme.colors.text }]}>
            {contentData.brandName}
          </Text>
          <Text style={[s.tagline, { color: theme.colors.textSecondary }]}>
            {contentData.tagline}
          </Text>
          <View style={[s.versionPill, { backgroundColor: theme.colors.primary + '14' }]}>
            <Text style={[s.versionText, { color: theme.colors.primary }]}>
              {contentData.version}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          {stats.map((stat: any, index: number) => (
            <View key={index} style={[s.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <stat.icon size={normalize(16)} color={theme.colors.primary} />
              <Text style={[s.statValue, { color: theme.colors.text }]}>{stat.value}</Text>
              <Text style={[s.statLabel, { color: theme.colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Mission */}
        <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={s.cardTitleRow}>
            <View style={[s.cardTitleIcon, { backgroundColor: theme.colors.primary + '14' }]}>
              <Target size={normalize(16)} color={theme.colors.primary} />
            </View>
            <Text style={[s.cardTitle, { color: theme.colors.text }]}>Who We Are</Text>
          </View>
          <Text style={[s.bodyText, { color: theme.colors.textSecondary }]}>
            {contentData.whoWeAre}
          </Text>
        </View>

        {/* Features */}
        <View style={s.sectionTitleRow}>
          <Zap size={normalize(16)} color={theme.colors.primary} />
          <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Why Choose Forlok</Text>
        </View>
        <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, padding: 0 }]}>
          {features.map((feature: any, index: number) => {
            const Icon = feature.icon;
            return (
              <React.Fragment key={index}>
                {index > 0 && <View style={[s.divider, { backgroundColor: theme.colors.border }]} />}
                <View style={s.featureRow}>
                  <View style={[s.featureIconCircle, { backgroundColor: feature.color + '14' }]}>
                    <Icon size={normalize(20)} color={feature.color} />
                  </View>
                  <View style={s.featureInfo}>
                    <Text style={[s.featureTitle, { color: theme.colors.text }]}>{feature.title}</Text>
                    <Text style={[s.featureDesc, { color: theme.colors.textSecondary }]}>{feature.description}</Text>
                  </View>
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {/* Contact */}
        <View style={s.sectionTitleRow}>
          <Mail size={normalize(16)} color={theme.colors.primary} />
          <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Contact Us</Text>
        </View>
        <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, padding: 0 }]}>
          {contactItems.map((item: any, index: number) => (
            <React.Fragment key={index}>
              {index > 0 && <View style={[s.divider, { backgroundColor: theme.colors.border }]} />}
              <TouchableOpacity
                style={s.contactRow}
                onPress={item.action ? () => handleOpenLink(item.action!) : undefined}
                activeOpacity={item.action ? 0.6 : 1}
              >
                <View style={[s.contactIconWrap, { backgroundColor: theme.colors.primary + '14' }]}>
                  <item.icon size={normalize(16)} color={theme.colors.primary} />
                </View>
                <View style={s.contactInfo}>
                  <Text style={[s.contactLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
                  <Text style={[s.contactValue, { color: theme.colors.text }]}>{item.value}</Text>
                </View>
                {item.action && <ExternalLink size={normalize(14)} color={theme.colors.textSecondary} />}
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* Legal */}
        <View style={s.sectionTitleRow}>
          <Shield size={normalize(16)} color={theme.colors.primary} />
          <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Legal</Text>
        </View>
        <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, padding: 0 }]}>
          {legalItems.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <View style={[s.divider, { backgroundColor: theme.colors.border }]} />}
              <TouchableOpacity style={s.legalRow} onPress={() => navigation.navigate(item.route)} activeOpacity={0.6}>
                <Text style={[s.legalText, { color: theme.colors.text }]}>{item.label}</Text>
                <ChevronRight size={normalize(18)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.footerRow}>
            <Text style={[s.footerText, { color: theme.colors.textSecondary }]}>Made with </Text>
            <Heart size={normalize(13)} color="#E53935" fill="#E53935" />
            <Text style={[s.footerText, { color: theme.colors.textSecondary }]}> in India</Text>
          </View>
          <Text style={[s.copyright, { color: theme.colors.textSecondary }]}>
            © 2025 Forlok. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: normalize(48),
    paddingBottom: normalize(14),
    paddingHorizontal: normalize(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: normalize(38),
    height: normalize(38),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: normalize(18),
    fontWeight: '700',
    textAlign: 'center',
  },
  scrollContent: {
    padding: normalize(16),
    paddingBottom: normalize(48),
  },
  card: {
    borderRadius: normalize(12),
    borderWidth: StyleSheet.hairlineWidth,
    padding: normalize(16),
    marginBottom: normalize(16),
  },
  logoCircle: {
    width: normalize(60),
    height: normalize(60),
    borderRadius: normalize(30),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: normalize(10),
  },
  logoImage: {
    width: normalize(70),
    height: normalize(70),
    borderRadius: normalize(14),
    marginBottom: normalize(10),
  },
  logoLetter: {
    fontFamily: FONTS.regular,
    fontSize: normalize(28),
    fontWeight: '900',
    color: '#FFF',
  },
  brandName: {
    fontFamily: FONTS.regular,
    fontSize: normalize(24),
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: normalize(4),
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    fontWeight: '500',
    marginBottom: normalize(12),
  },
  versionPill: {
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(4),
    borderRadius: normalize(20),
  },
  versionText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: normalize(10),
    marginBottom: normalize(16),
  },
  statCard: {
    flex: 1,
    borderRadius: normalize(12),
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: normalize(14),
    alignItems: 'center',
    gap: normalize(4),
  },
  statValue: {
    fontFamily: FONTS.regular,
    fontSize: normalize(18),
    fontWeight: '800',
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    fontWeight: '500',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(10),
    marginBottom: normalize(12),
  },
  cardTitleIcon: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(16),
    fontWeight: '700',
  },
  bodyText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    lineHeight: normalize(20),
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
    marginBottom: normalize(12),
    marginTop: normalize(4),
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(16),
    fontWeight: '700',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(14),
  },
  featureIconCircle: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: normalize(12),
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    fontWeight: '600',
    marginBottom: normalize(2),
  },
  featureDesc: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    lineHeight: normalize(17),
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(14),
  },
  contactIconWrap: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: normalize(12),
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    fontWeight: '500',
    marginBottom: normalize(2),
  },
  contactValue: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: normalize(16),
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(15),
  },
  legalText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: normalize(20),
    gap: normalize(6),
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
  },
  copyright: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
  },
});

export default AboutScreen;
