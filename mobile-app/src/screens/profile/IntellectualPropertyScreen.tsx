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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Shield,
  FileText,
  Award,
  Lock,
  AlertTriangle,
  Fingerprint,
  Globe,
  Copyright,
  Mail,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { normalize, wp, hp } from '@utils/responsive';
import { COLORS, FONTS, SPACING, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';


const IntellectualPropertyScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const sections = [
    {
      icon: Award,
      title: 'Trademarks',
      color: '#FF9800',
      content: `The following are registered trademarks of Forlok Technologies Pvt. Ltd.:

\u2022 Forlok\u2122 \u2014 Word Mark
\u2022 Forlok Logo\u2122 \u2014 Design Mark
\u2022 "Your Journey, Our Commitment"\u2122 \u2014 Tagline

These trademarks are protected under the Trade Marks Act, 1999 of India and international trademark laws. Any unauthorized use, imitation, or reproduction of these marks without prior written consent is strictly prohibited and will be subject to legal action.`,
    },
    {
      icon: Copyright,
      title: 'Copyrights',
      color: '#2196F3',
      content: `All content on the Forlok platform is protected by copyright under the Copyright Act, 1957 of India:

\u2022 Software source code and proprietary algorithms
\u2022 User interface designs, wireframes, and layouts
\u2022 Graphics, icons, illustrations, and visual elements
\u2022 Written content, documentation, and marketing materials
\u2022 Audio, video, and multimedia content
\u2022 Database structures and compiled data

\u00A9 2024 Forlok Technologies Pvt. Ltd. All rights reserved. No part of this content may be reproduced, distributed, or transmitted without prior written permission.`,
    },
    {
      icon: Shield,
      title: 'Patents',
      color: '#4CAF50',
      content: `Forlok has developed proprietary technologies that are subject to patent protection under the Patents Act, 1970 of India:

\u2022 Intelligent Ride Matching Algorithm \u2014 Patent Pending
  Dynamically matches drivers and passengers based on route overlap, schedule compatibility, and user preferences.

\u2022 Dynamic Pricing System \u2014 Patent Pending
  Adaptive fare calculation based on real-time demand, distance, and route complexity.

\u2022 Real-time Route Optimization \u2014 Patent Pending
  AI-powered system that optimizes multi-stop routes for pooling efficiency.

\u2022 Safety Verification System \u2014 Patent Pending
  Multi-layered identity verification and real-time trip safety monitoring.`,
    },
    {
      icon: Lock,
      title: 'Trade Secrets',
      color: '#9C27B0',
      content: `Certain aspects of our technology and business operations constitute confidential trade secrets:

\u2022 Proprietary ride-matching algorithms and scoring models
\u2022 User behavior prediction and recommendation engines
\u2022 Advanced fraud detection and prevention systems
\u2022 Internal operational workflows and decision frameworks
\u2022 Machine learning models for demand forecasting
\u2022 Quality scoring and driver rating methodologies

These trade secrets are protected under the applicable laws of India and through confidentiality agreements with employees, contractors, and business partners.`,
    },
    {
      icon: Fingerprint,
      title: 'Design Rights',
      color: '#00BCD4',
      content: `The visual identity of Forlok is protected under the Designs Act, 2000 of India:

\u2022 Forlok app icon and logo design
\u2022 Unique color palette and typography system
\u2022 Screen layouts and interaction patterns
\u2022 Custom map styles and visual markers
\u2022 Marketing and promotional design templates
\u2022 Branded vehicle stickers and physical materials

Any reproduction or imitation of these designs without authorization is prohibited.`,
    },
    {
      icon: Globe,
      title: 'Open Source Acknowledgments',
      color: '#607D8B',
      content: `Forlok utilizes certain open-source software components. We acknowledge and respect the licenses of these projects:

\u2022 React Native \u2014 MIT License
\u2022 Node.js \u2014 MIT License
\u2022 MongoDB \u2014 Server Side Public License
\u2022 Various npm packages \u2014 as per their respective licenses

A complete list of open-source components and their licenses is available upon request. Our use of open-source software does not affect the proprietary nature of Forlok's original code and intellectual property.`,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Hero Header ── */}
      <ImageBackground
        source={require('../../../assets/patents.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={40} style={styles.blurContainer}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Patents & Copyrights</Text>
            <View style={{ width: normalize(38) }} />
          </View>
        </BlurView>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Title Card ── */}
        <View style={[styles.titleCard, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.titleIconCircle, { backgroundColor: theme.colors.primary + '12' }]}>
            <Shield size={26} color={theme.colors.primary} />
          </View>
          <Text style={[styles.titleText, { color: theme.colors.text }]}>Intellectual Property</Text>
          <Text style={[styles.subtitleText, { color: theme.colors.textSecondary }]}>
            Protecting our innovation and your trust
          </Text>
          <View style={[styles.datePill, { backgroundColor: theme.colors.primary + '12' }]}>
            <Text style={[styles.dateText, { color: theme.colors.primary }]}>Last Updated: January 2024</Text>
          </View>
        </View>

        {/* ── Introduction ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.primary + '08', borderColor: theme.colors.primary + '20', borderWidth: 1 }]}>
          <Text style={[styles.introText, { color: theme.colors.text }]}>
            Forlok Technologies Pvt. Ltd. is committed to protecting its intellectual property rights
            and respecting the intellectual property rights of others. This page outlines our IP assets,
            protections, and policies. Our innovations drive the Forlok platform and we take every measure
            to safeguard them under applicable Indian and international laws.
          </Text>
        </View>

        {/* ── Sections ── */}
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <View key={index} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionNum, { backgroundColor: section.color + '15' }]}>
                  <Text style={[styles.sectionNumText, { color: section.color }]}>{index + 1}</Text>
                </View>
                <View style={styles.sectionTitleArea}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{section.title}</Text>
                </View>
                <View style={[styles.sectionIconWrap, { backgroundColor: section.color + '12' }]}>
                  <Icon size={18} color={section.color} />
                </View>
              </View>
              <Text style={[styles.sectionContent, { color: theme.colors.textSecondary }]}>{section.content}</Text>
            </View>
          );
        })}

        {/* ── Warning Notice ── */}
        <View style={[styles.card, { backgroundColor: '#FFF3E0', borderColor: '#FFB74D', borderWidth: 1 }]}>
          <View style={styles.noticeHeader}>
            <AlertTriangle size={20} color="#F57C00" />
            <Text style={[styles.noticeTitle, { color: '#E65100' }]}>Important Notice</Text>
          </View>
          <Text style={[styles.sectionContent, { color: '#5D4037' }]}>
            Any unauthorized use, reproduction, or distribution of Forlok's intellectual property may
            result in severe civil and criminal penalties under Indian law. If you believe that your
            intellectual property rights have been infringed upon by Forlok, or if you discover
            unauthorized use of our IP, please contact our legal team immediately.
          </Text>
        </View>

        {/* ── Licensing Card ── */}
        <View style={[styles.footerCard, { backgroundColor: theme.colors.surface }]}>
          <Mail size={22} color={theme.colors.primary} />
          <Text style={[styles.footerTitle, { color: theme.colors.text }]}>Licensing & Partnerships</Text>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            For licensing opportunities, IP inquiries, or partnership proposals:
          </Text>
          <View style={styles.contactRow}>
            <View style={[styles.contactPill, { backgroundColor: theme.colors.primary + '10' }]}>
              <Text style={[styles.contactEmail, { color: theme.colors.primary }]}>legal@forlok.com</Text>
            </View>
            <View style={[styles.contactPill, { backgroundColor: '#4CAF50' + '10' }]}>
              <Text style={[styles.contactEmail, { color: '#4CAF50' }]}>partnerships@forlok.com</Text>
            </View>
          </View>
        </View>

        {/* ── Disclaimer ── */}
        <Text style={[styles.disclaimer, { color: theme.colors.textSecondary }]}>
          {'\u00A9'} 2024 Forlok Technologies Pvt. Ltd. All rights reserved.
          {'\n'}This information is provided for general informational purposes and does not constitute legal advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* ── Hero Header ── */
  headerImage: { width: '100%', height: hp(20) },
  headerOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.78 },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  headerNav: { flexDirection: 'row', alignItems: 'center' },
  navButton: {
    width: normalize(38),
    height: normalize(38),
    borderRadius: normalize(19),
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: normalize(22),
    color: '#FFF',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: normalize(0.4),
  },

  /* ── Scroll ── */
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },

  /* ── Title Card ── */
  titleCard: {
    borderRadius: normalize(20),
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  titleIconCircle: {
    width: normalize(56),
    height: normalize(56),
    borderRadius: normalize(28),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  titleText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(22),
    fontWeight: '800',
    marginBottom: normalize(4),
  },
  subtitleText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  datePill: {
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(4),
    borderRadius: normalize(20),
  },
  dateText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    fontWeight: '700',
  },

  /* ── Generic Card ── */
  card: {
    borderRadius: normalize(16),
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  introText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    lineHeight: normalize(22),
  },

  /* ── Section ── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: normalize(10),
  },
  sectionNum: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    fontWeight: '800',
  },
  sectionTitleArea: { flex: 1 },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(16),
    fontWeight: '700',
  },
  sectionIconWrap: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContent: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    lineHeight: normalize(21),
  },

  /* ── Notice ── */
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  noticeTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(15),
    fontWeight: '700',
  },

  /* ── Footer ── */
  footerCard: {
    borderRadius: normalize(16),
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
    gap: normalize(6),
  },
  footerTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(17),
    fontWeight: '700',
  },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    textAlign: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  contactPill: {
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
  },
  contactEmail: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    fontWeight: '700',
  },
  disclaimer: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    textAlign: 'center',
    lineHeight: normalize(18),
    marginBottom: SPACING.xl,
  },
});

export default IntellectualPropertyScreen;
