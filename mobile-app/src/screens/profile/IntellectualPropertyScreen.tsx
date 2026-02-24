import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, AlertTriangle } from 'lucide-react-native';
import { normalize } from '@utils/responsive';
import { FONTS } from '@constants/theme';
import { useTheme } from '@context/ThemeContext';

const sections = [
  {
    title: 'Trademarks',
    content: `The following are registered trademarks of Forlok Technologies Pvt. Ltd.:\n\n\u2022 Forlok\u2122 \u2014 Word Mark\n\u2022 Forlok Logo\u2122 \u2014 Design Mark\n\u2022 "Your Journey, Our Commitment"\u2122 \u2014 Tagline\n\nThese trademarks are protected under the Trade Marks Act, 1999 of India and international trademark laws. Any unauthorized use, imitation, or reproduction of these marks without prior written consent is strictly prohibited and will be subject to legal action.`,
  },
  {
    title: 'Copyrights',
    content: `All content on the Forlok platform is protected by copyright under the Copyright Act, 1957 of India:\n\n\u2022 Software source code and proprietary algorithms\n\u2022 User interface designs, wireframes, and layouts\n\u2022 Graphics, icons, illustrations, and visual elements\n\u2022 Written content, documentation, and marketing materials\n\u2022 Audio, video, and multimedia content\n\u2022 Database structures and compiled data\n\n\u00A9 2024 Forlok Technologies Pvt. Ltd. All rights reserved. No part of this content may be reproduced, distributed, or transmitted without prior written permission.`,
  },
  {
    title: 'Patents',
    content: `Forlok has developed proprietary technologies that are subject to patent protection under the Patents Act, 1970 of India:\n\n\u2022 Intelligent Ride Matching Algorithm \u2014 Patent Pending\n  Dynamically matches drivers and passengers based on route overlap, schedule compatibility, and user preferences.\n\n\u2022 Dynamic Pricing System \u2014 Patent Pending\n  Adaptive fare calculation based on real-time demand, distance, and route complexity.\n\n\u2022 Real-time Route Optimization \u2014 Patent Pending\n  AI-powered system that optimizes multi-stop routes for pooling efficiency.\n\n\u2022 Safety Verification System \u2014 Patent Pending\n  Multi-layered identity verification and real-time trip safety monitoring.`,
  },
  {
    title: 'Trade Secrets',
    content: `Certain aspects of our technology and business operations constitute confidential trade secrets:\n\n\u2022 Proprietary ride-matching algorithms and scoring models\n\u2022 User behavior prediction and recommendation engines\n\u2022 Advanced fraud detection and prevention systems\n\u2022 Internal operational workflows and decision frameworks\n\u2022 Machine learning models for demand forecasting\n\u2022 Quality scoring and driver rating methodologies\n\nThese trade secrets are protected under the applicable laws of India and through confidentiality agreements with employees, contractors, and business partners.`,
  },
  {
    title: 'Design Rights',
    content: `The visual identity of Forlok is protected under the Designs Act, 2000 of India:\n\n\u2022 Forlok app icon and logo design\n\u2022 Unique color palette and typography system\n\u2022 Screen layouts and interaction patterns\n\u2022 Custom map styles and visual markers\n\u2022 Marketing and promotional design templates\n\u2022 Branded vehicle stickers and physical materials\n\nAny reproduction or imitation of these designs without authorization is prohibited.`,
  },
  {
    title: 'Open Source Acknowledgments',
    content: `Forlok utilizes certain open-source software components. We acknowledge and respect the licenses of these projects:\n\n\u2022 React Native \u2014 MIT License\n\u2022 Node.js \u2014 MIT License\n\u2022 MongoDB \u2014 Server Side Public License\n\u2022 Various npm packages \u2014 as per their respective licenses\n\nA complete list of open-source components and their licenses is available upon request. Our use of open-source software does not affect the proprietary nature of Forlok's original code and intellectual property.`,
  },
];

const IntellectualPropertyScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <View style={[s.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={normalize(22)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>Intellectual Property</Text>
        <View style={{ width: normalize(22) }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.introCard, { backgroundColor: theme.colors.primary + '0A' }]}>
          <Text style={[s.introTitle, { color: theme.colors.text }]}>Intellectual Property</Text>
          <Text style={[s.introSub, { color: theme.colors.textSecondary }]}>
            Protecting our innovation and your trust
          </Text>
          <View style={[s.datePill, { backgroundColor: theme.colors.primary + '14' }]}>
            <Text style={[s.dateText, { color: theme.colors.primary }]}>Last Updated: January 2024</Text>
          </View>
        </View>

        <View style={[s.card, { backgroundColor: theme.colors.primary + '08', borderColor: theme.colors.primary + '20' }]}>
          <Text style={[s.bodyText, { color: theme.colors.text }]}>
            Forlok Technologies Pvt. Ltd. is committed to protecting its intellectual property rights
            and respecting the intellectual property rights of others. This page outlines our IP assets,
            protections, and policies. Our innovations drive the Forlok platform and we take every measure
            to safeguard them under applicable Indian and international laws.
          </Text>
        </View>

        {sections.map((section, i) => (
          <View key={i} style={[s.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <View style={s.sectionHead}>
              <View style={[s.badge, { backgroundColor: theme.colors.primary + '14' }]}>
                <Text style={[s.badgeText, { color: theme.colors.primary }]}>{i + 1}</Text>
              </View>
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>{section.title}</Text>
            </View>
            <Text style={[s.bodyText, { color: theme.colors.textSecondary }]}>{section.content}</Text>
          </View>
        ))}

        <View style={[s.warningCard, { borderColor: '#FFB74D' }]}>
          <View style={s.warningHead}>
            <AlertTriangle size={normalize(18)} color="#F57C00" />
            <Text style={[s.warningTitle, { color: '#E65100' }]}>Important Notice</Text>
          </View>
          <Text style={[s.bodyText, { color: '#5D4037' }]}>
            Any unauthorized use, reproduction, or distribution of Forlok's intellectual property may
            result in severe civil and criminal penalties under Indian law. If you believe that your
            intellectual property rights have been infringed upon by Forlok, or if you discover
            unauthorized use of our IP, please contact our legal team immediately.
          </Text>
        </View>

        <View style={[s.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center' }]}>
          <Text style={[s.footerTitle, { color: theme.colors.text }]}>Licensing & Partnerships</Text>
          <Text style={[s.footerSub, { color: theme.colors.textSecondary }]}>
            For licensing opportunities, IP inquiries, or partnership proposals:
          </Text>
          <View style={s.emailRow}>
            <View style={[s.emailPill, { backgroundColor: theme.colors.primary + '10' }]}>
              <Text style={[s.emailText, { color: theme.colors.primary }]}>legal@forlok.com</Text>
            </View>
            <View style={[s.emailPill, { backgroundColor: '#4CAF5018' }]}>
              <Text style={[s.emailText, { color: '#4CAF50' }]}>partnerships@forlok.com</Text>
            </View>
          </View>
        </View>

        <Text style={[s.copyright, { color: theme.colors.textSecondary }]}>
          {'\u00A9'} 2024 Forlok Technologies Pvt. Ltd. All rights reserved.
          {'\n'}This information is provided for general informational purposes and does not constitute legal advice.
        </Text>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: normalize(48),
    paddingBottom: normalize(14),
    paddingHorizontal: normalize(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.bold,
    fontSize: normalize(17),
    fontWeight: '700',
  },

  scroll: {
    padding: normalize(16),
    paddingBottom: normalize(40),
  },

  introCard: {
    borderRadius: normalize(12),
    padding: normalize(20),
    alignItems: 'center',
    marginBottom: normalize(12),
  },
  introTitle: {
    fontFamily: FONTS.bold,
    fontSize: normalize(20),
    fontWeight: '700',
    marginBottom: normalize(4),
  },
  introSub: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    textAlign: 'center',
    marginBottom: normalize(10),
  },
  datePill: {
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(5),
    borderRadius: normalize(20),
  },
  dateText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    fontWeight: '600',
  },

  card: {
    borderRadius: normalize(12),
    borderWidth: StyleSheet.hairlineWidth,
    padding: normalize(16),
    marginBottom: normalize(12),
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(10),
    gap: normalize(10),
  },
  badge: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: FONTS.bold,
    fontSize: normalize(13),
    fontWeight: '700',
  },
  sectionTitle: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: normalize(15),
    fontWeight: '600',
  },

  bodyText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    lineHeight: normalize(21),
  },

  warningCard: {
    borderRadius: normalize(12),
    borderWidth: StyleSheet.hairlineWidth,
    padding: normalize(16),
    marginBottom: normalize(12),
    backgroundColor: '#FFF8E1',
  },
  warningHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
    marginBottom: normalize(8),
  },
  warningTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: normalize(14),
    fontWeight: '600',
  },

  footerTitle: {
    fontFamily: FONTS.bold,
    fontSize: normalize(16),
    fontWeight: '700',
    marginBottom: normalize(6),
  },
  footerSub: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    textAlign: 'center',
    marginBottom: normalize(12),
  },
  emailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: normalize(8),
  },
  emailPill: {
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
  },
  emailText: {
    fontFamily: FONTS.semiBold,
    fontSize: normalize(13),
    fontWeight: '600',
  },

  copyright: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    textAlign: 'center',
    lineHeight: normalize(17),
    marginTop: normalize(4),
  },
});

export default IntellectualPropertyScreen;
