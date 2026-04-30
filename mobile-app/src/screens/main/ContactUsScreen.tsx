import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Phone,
  Globe,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Clock,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { normalize } from '@utils/responsive';
import { FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { useTheme } from '@context/ThemeContext';
import { useContentPage } from '../../hooks/useContentPage';
import { resolveContentIcon } from '@utils/contentIcons';
import { CONTENT_DEFAULTS } from '@constants/contentDefaults';

function norm(s: string) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** True if two strings are the same office/address text (avoid showing twice). */
function isDuplicateAddress(a: string, b: string) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length > 40 && nb.length > 40 && (na.includes(nb.slice(0, 48)) || nb.includes(na.slice(0, 48)))) return true;
  return false;
}

/**
 * Company contact — action-first layout, minimal legal wall-of-text.
 */
const ContactUsScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [legalOpen, setLegalOpen] = useState(false);
  const { data: aboutData } = useContentPage<any>('about', CONTENT_DEFAULTS.about as any);
  const { data: helpData } = useContentPage<any>('help_support', CONTENT_DEFAULTS.help_support as any);

  const handleOpenLink = (url: string) => {
    void Linking.openURL(url).catch(() => {});
  };

  const contactItems = useMemo(() => {
    return (aboutData?.contactItems || []).map((item: any) => ({
      ...item,
      icon: typeof item.icon === 'string' ? resolveContentIcon(item.icon, Mail) : item.icon,
    }));
  }, [aboutData?.contactItems]);

  const { linkChannels, addressValue } = useMemo(() => {
    const links: { key: string; label: string; value: string; action: string; Icon: LucideIcon }[] = [];
    let address = '';

    for (const item of contactItems) {
      const label = String(item.label || '').toLowerCase();
      const val = String(item.value || '').trim();
      const act = item.action ? String(item.action) : '';

      if (!act) {
        if (label.includes('address') || label.includes('office') || label.includes('location')) {
          if (val) address = val;
        }
        continue;
      }

      if (label.includes('email') || act.startsWith('mailto:')) {
        links.push({ key: 'email', label: 'Email', value: val, action: act, Icon: Mail });
      } else if (label.includes('phone') || label.includes('call') || act.startsWith('tel:')) {
        links.push({ key: 'phone', label: 'Call', value: val, action: act, Icon: Phone });
      } else if (label.includes('website') || label.includes('web') || act.startsWith('http')) {
        links.push({ key: 'web', label: 'Website', value: val, action: act, Icon: Globe });
      } else {
        const Fallback: LucideIcon = Mail;
        links.push({
          key: act.slice(0, 24),
          label: String(item.label || 'Link'),
          value: val,
          action: act,
          Icon: (typeof item.icon === 'function' ? item.icon : Fallback) as LucideIcon,
        });
      }
    }

    const seen = new Set<string>();
    const deduped = links.filter((l) => {
      if (seen.has(l.key)) return false;
      seen.add(l.key);
      return true;
    });

    return { linkChannels: deduped, addressValue: address };
  }, [contactItems]);

  const footer1 = String(aboutData?.footerLine1 || '').trim();
  const footer2 = String(aboutData?.footerLine2 || '').trim();
  const showFooter2InLegal = footer2 && !isDuplicateAddress(footer2, addressValue);

  const supportLines = useMemo(() => {
    const raw = String(helpData?.supportHoursText || '').trim();
    if (!raw) return [];
    return raw
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
  }, [helpData?.supportHoursText]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={normalize(22)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Contact Us</Text>
        <View style={{ width: normalize(38) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Compact brand strip — no legal paragraphs here */}
        <View style={[styles.hero, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.primary + '18' }]}>
            <Building2 size={normalize(22)} color={theme.colors.primary} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.brandName, { color: theme.colors.text }]} numberOfLines={1}>
              {aboutData?.brandName || 'eZway'}
            </Text>
            {aboutData?.tagline ? (
              <Text style={[styles.tagline, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                {aboutData.tagline}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Primary actions — looks like an app, not a document */}
        {linkChannels.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>GET IN TOUCH</Text>
            <View style={styles.actionRow}>
              {linkChannels.map((ch) => {
                const Icon = ch.Icon;
                return (
                  <TouchableOpacity
                    key={ch.key}
                    style={[styles.actionTile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => handleOpenLink(ch.action)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.actionIconBg, { backgroundColor: theme.colors.primary + '16' }]}>
                      <Icon size={normalize(22)} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.actionTileLabel, { color: theme.colors.text }]}>{ch.label}</Text>
                    <Text style={[styles.actionTileHint, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {ch.key === 'email' ? 'Tap to mail' : ch.key === 'phone' ? 'Tap to call' : 'Open link'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        {/* Single address block — left aligned, readable */}
        {addressValue ? (
          <>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>REGISTERED OFFICE</Text>
            <View style={[styles.addressCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <MapPin size={normalize(18)} color={theme.colors.primary} style={styles.addressPin} />
              <Text style={[styles.addressText, { color: theme.colors.text }]}>{addressValue}</Text>
            </View>
          </>
        ) : null}

        {supportLines.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>SUPPORT HOURS</Text>
            <View style={[styles.hoursWrap, { backgroundColor: theme.colors.primary + '08', borderColor: theme.colors.primary + '22' }]}>
              {supportLines.map((line, i) => (
                <View key={i} style={styles.hoursLine}>
                  <Clock size={normalize(14)} color={theme.colors.primary} />
                  <Text style={[styles.hoursLineText, { color: theme.colors.text }]}>{line}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.helpLink, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => navigation.navigate('HelpSupport')}
          activeOpacity={0.7}
        >
          <View style={[styles.helpIcon, { backgroundColor: theme.colors.primary + '14' }]}>
            <HelpCircle size={normalize(20)} color={theme.colors.primary} />
          </View>
          <View style={styles.helpLinkText}>
            <Text style={[styles.helpLinkTitle, { color: theme.colors.text }]}>Help & Support</Text>
            <Text style={[styles.helpLinkSub, { color: theme.colors.textSecondary }]}>FAQs & app help</Text>
          </View>
          <ChevronRight size={normalize(20)} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Legal: one quiet line + optional expand — not a centered essay */}
        {footer1 ? (
          <View style={styles.legalBlock}>
            <Text style={[styles.copyrightLine, { color: theme.colors.textSecondary }]}>{footer1}</Text>
            {showFooter2InLegal ? (
              <TouchableOpacity style={styles.legalToggle} onPress={() => setLegalOpen(!legalOpen)} activeOpacity={0.7}>
                <Text style={[styles.legalToggleText, { color: theme.colors.primary }]}>
                  {legalOpen ? 'Hide registration details' : 'Registration details'}
                </Text>
                <ChevronDown
                  size={normalize(16)}
                  color={theme.colors.primary}
                  style={{ transform: [{ rotate: legalOpen ? '180deg' : '0deg' }] }}
                />
              </TouchableOpacity>
            ) : null}
            {legalOpen && showFooter2InLegal ? (
              <Text style={[styles.legalBody, { color: theme.colors.textSecondary }]}>{footer2}</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    fontFamily: FONTS.bold,
    fontSize: normalize(17),
    fontWeight: '800',
    textAlign: 'center',
  },
  scroll: {
    padding: normalize(16),
    paddingBottom: normalize(36),
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: normalize(14),
    marginBottom: normalize(20),
    gap: normalize(12),
  },
  heroIcon: {
    width: normalize(48),
    height: normalize(48),
    borderRadius: normalize(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, minWidth: 0 },
  brandName: {
    fontFamily: FONTS.bold,
    fontSize: normalize(18),
    fontWeight: '800',
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    marginTop: normalize(3),
    lineHeight: normalize(17),
  },
  sectionLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: normalize(11),
    letterSpacing: 0.8,
    marginBottom: normalize(8),
    marginTop: normalize(4),
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(10),
    marginBottom: normalize(20),
  },
  actionTile: {
    flex: 1,
    minWidth: normalize(96),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: normalize(14),
    paddingHorizontal: normalize(8),
    alignItems: 'center',
  },
  actionIconBg: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: normalize(8),
  },
  actionTileLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: normalize(13),
    fontWeight: '700',
  },
  actionTileHint: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    marginTop: normalize(2),
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: normalize(14),
    marginBottom: normalize(20),
    gap: normalize(10),
  },
  addressPin: { marginTop: normalize(2) },
  addressText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    lineHeight: normalize(20),
  },
  hoursWrap: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: normalize(12),
    marginBottom: normalize(20),
    gap: normalize(8),
  },
  hoursLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
  },
  hoursLineText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    lineHeight: normalize(20),
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: normalize(14),
    gap: normalize(12),
    marginBottom: normalize(16),
  },
  helpIcon: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpLinkText: { flex: 1 },
  helpLinkTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: normalize(15),
    fontWeight: '700',
  },
  helpLinkSub: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    marginTop: normalize(2),
  },
  legalBlock: {
    marginTop: normalize(8),
    paddingHorizontal: normalize(4),
  },
  copyrightLine: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    lineHeight: normalize(16),
    textAlign: 'left',
  },
  legalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(4),
    marginTop: normalize(10),
    alignSelf: 'flex-start',
  },
  legalToggleText: {
    fontFamily: FONTS.semiBold,
    fontSize: normalize(12),
    fontWeight: '600',
  },
  legalBody: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    lineHeight: normalize(18),
    marginTop: normalize(10),
    textAlign: 'left',
  },
});

export default ContactUsScreen;
