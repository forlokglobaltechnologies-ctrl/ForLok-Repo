import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { normalize } from '@utils/responsive';
import { FONTS } from '@constants/theme';
import { useTheme } from '@context/ThemeContext';
import { useContentPage } from '../../hooks/useContentPage';
import { CONTENT_DEFAULTS } from '@constants/contentDefaults';

const TermsConditionsScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { data: contentData } = useContentPage<any>('terms_conditions', CONTENT_DEFAULTS.terms_conditions as any);
  const dynamicSections = Array.isArray(contentData?.sections) ? contentData.sections : [];

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <View style={[s.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={normalize(22)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>Terms & Conditions</Text>
        <View style={{ width: normalize(22) }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.heroCard, { backgroundColor: theme.colors.primary + '12' }]}>
          <View style={[s.heroIconWrap, { backgroundColor: theme.colors.primary + '26' }]}>
            <FileText size={18} color={theme.colors.primary} />
          </View>
          <Text style={[s.introTitle, { color: theme.colors.text }]}>{contentData.introTitle}</Text>
          <Text style={[s.introSub, { color: theme.colors.textSecondary }]}>{contentData.introSub}</Text>
          <View style={[s.datePill, { backgroundColor: theme.colors.primary + '14' }]}>
            <Text style={[s.dateText, { color: theme.colors.primary }]}>{contentData.effectiveText}</Text>
          </View>
        </View>

        <View style={[s.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[s.bodyText, { color: theme.colors.text }]}>{contentData.introBody}</Text>
        </View>

        <Text style={[s.sectionLabel, { color: theme.colors.textSecondary }]}>All policy sections</Text>
        {dynamicSections.map((section: any, i: number) => (
          <View key={i} style={[s.sectionCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <View style={s.sectionHead}>
              <View style={[s.badge, { backgroundColor: theme.colors.primary + '14' }]}>
                <Text style={[s.badgeText, { color: theme.colors.primary }]}>{i + 1}</Text>
              </View>
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>{section.title}</Text>
            </View>
            <Text style={[s.bodyText, { color: theme.colors.textSecondary }]}>{section.content}</Text>
          </View>
        ))}

        <View style={[s.footerCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center' }]}>
          <Text style={[s.footerTitle, { color: theme.colors.text }]}>Questions?</Text>
          <Text style={[s.footerSub, { color: theme.colors.textSecondary }]}>
            If you have any questions about these Terms and Conditions, please contact us at:
          </Text>
          <View style={[s.emailPill, { backgroundColor: theme.colors.primary + '10' }]}>
            <Text style={[s.emailText, { color: theme.colors.primary }]}>
              {contentData.contactEmail}
            </Text>
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
    marginBottom: normalize(9),
  },
  datePill: {
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(4),
    borderRadius: normalize(20),
  },
  dateText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(11.5),
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
  emailPill: {
    paddingHorizontal: normalize(18),
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

export default TermsConditionsScreen;
