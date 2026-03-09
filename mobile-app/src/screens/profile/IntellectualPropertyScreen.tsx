import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, AlertTriangle, ChevronDown, ChevronUp, Shield } from 'lucide-react-native';
import { normalize } from '@utils/responsive';
import { FONTS } from '@constants/theme';
import { useTheme } from '@context/ThemeContext';
import { useContentPage } from '../../hooks/useContentPage';
import { CONTENT_DEFAULTS } from '@constants/contentDefaults';

export const IP_DEFAULT_SECTIONS = [
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
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const { data: contentData } = useContentPage<any>('intellectual_property', {
    ...CONTENT_DEFAULTS.intellectual_property,
    sections: IP_DEFAULT_SECTIONS,
  } as any);
  const dynamicSections = contentData.sections;

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
        <View style={[s.heroCard, { backgroundColor: theme.colors.primary + '12' }]}>
          <View style={[s.heroIconWrap, { backgroundColor: theme.colors.primary + '26' }]}>
            <Shield size={18} color={theme.colors.primary} />
          </View>
          <Text style={[s.introTitle, { color: theme.colors.text }]}>
            {contentData.introTitle}
          </Text>
          <Text style={[s.introSub, { color: theme.colors.textSecondary }]}>
            {contentData.introSub}
          </Text>
          <View style={[s.datePill, { backgroundColor: theme.colors.primary + '14' }]}>
            <Text style={[s.dateText, { color: theme.colors.primary }]}>
              {contentData.lastUpdatedText}
            </Text>
          </View>
        </View>

        <View style={[s.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[s.bodyText, { color: theme.colors.text }]}>
            {contentData.introBody}
          </Text>
        </View>

        <Text style={[s.sectionLabel, { color: theme.colors.textSecondary }]}>IP topics</Text>
        {dynamicSections.map((section: any, i: number) => {
          const expanded = expandedSection === i;
          return (
            <View key={i} style={[s.sectionCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <TouchableOpacity
                style={s.sectionHead}
                activeOpacity={0.75}
                onPress={() => setExpandedSection(expanded ? null : i)}
              >
                <View style={[s.badge, { backgroundColor: theme.colors.primary + '14' }]}>
                  <Text style={[s.badgeText, { color: theme.colors.primary }]}>{i + 1}</Text>
                </View>
                <Text style={[s.sectionTitle, { color: theme.colors.text }]}>{section.title}</Text>
                {expanded ? (
                  <ChevronUp size={16} color={theme.colors.textSecondary} />
                ) : (
                  <ChevronDown size={16} color={theme.colors.textSecondary} />
                )}
              </TouchableOpacity>
              {expanded && <Text style={[s.bodyText, { color: theme.colors.textSecondary }]}>{section.content}</Text>}
            </View>
          );
        })}

        <View style={[s.warningCard, { borderColor: '#FFB74D' }]}>
          <View style={s.warningHead}>
            <AlertTriangle size={normalize(18)} color="#F57C00" />
            <Text style={[s.warningTitle, { color: '#E65100' }]}>
              {contentData.warningTitle}
            </Text>
          </View>
          <Text style={[s.bodyText, { color: '#5D4037' }]}>
            {contentData.warningText}
          </Text>
        </View>

        <View style={[s.footerCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center' }]}>
          <Text style={[s.footerTitle, { color: theme.colors.text }]}>
            {contentData.licensingTitle}
          </Text>
          <Text style={[s.footerSub, { color: theme.colors.textSecondary }]}>
            {contentData.licensingSub}
          </Text>
          <View style={s.emailRow}>
            <View style={[s.emailPill, { backgroundColor: theme.colors.primary + '10' }]}>
              <Text style={[s.emailText, { color: theme.colors.primary }]}>
                {contentData.contactEmail1}
              </Text>
            </View>
            <View style={[s.emailPill, { backgroundColor: '#4CAF5018' }]}>
              <Text style={[s.emailText, { color: '#4CAF50' }]}>
                {contentData.contactEmail2}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[s.copyright, { color: theme.colors.textSecondary }]}>
          {contentData.footerLine1}
          {'\n'}
          {contentData.footerLine2}
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
    paddingTop: normalize(44),
    paddingBottom: normalize(12),
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
    paddingBottom: normalize(56),
  },

  heroCard: {
    borderRadius: normalize(16),
    padding: normalize(16),
    alignItems: 'center',
    marginBottom: normalize(12),
  },
  heroIconWrap: {
    width: normalize(38),
    height: normalize(38),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: normalize(8),
  },
  introTitle: {
    fontFamily: FONTS.bold,
    fontSize: normalize(19),
    fontWeight: '700',
    marginBottom: normalize(4),
  },
  introSub: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
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

  summaryCard: {
    borderRadius: normalize(14),
    borderWidth: 1,
    padding: normalize(14),
    marginBottom: normalize(12),
  },
  sectionLabel: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    marginBottom: normalize(8),
  },
  sectionCard: {
    borderRadius: normalize(14),
    borderWidth: 1,
    padding: normalize(14),
    marginBottom: normalize(10),
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(2),
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
    fontSize: normalize(14),
    fontWeight: '600',
  },

  bodyText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12.5),
    lineHeight: normalize(20),
    marginTop: normalize(8),
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

  footerCard: {
    borderRadius: normalize(14),
    borderWidth: 1,
    padding: normalize(16),
    marginBottom: normalize(12),
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
