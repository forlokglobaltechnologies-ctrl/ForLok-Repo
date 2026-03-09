import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ChevronDown, ChevronUp, Shield } from 'lucide-react-native';
import { normalize, wp } from '@utils/responsive';
import { FONTS } from '@constants/theme';
import { useTheme } from '@context/ThemeContext';
import { useContentPage } from '../../hooks/useContentPage';
import { CONTENT_DEFAULTS } from '@constants/contentDefaults';

export const PRIVACY_DEFAULT_SECTIONS = [
  {
    title: 'Information We Collect',
    content: `We collect the following categories of information to provide and improve our services:\n\nPersonal Information:\n\u2022 Full name, email address, phone number\n\u2022 Profile photo and date of birth\n\u2022 Government-issued ID (Aadhaar, PAN, Driving License) for verification\n\u2022 Bank account or UPI details for payment processing\n\nVehicle Information (Drivers):\n\u2022 Driving license details and expiry\n\u2022 Vehicle registration number, make, model, and year\n\u2022 Vehicle insurance and fitness certificate details\n\nUsage Information:\n\u2022 Ride history, booking details, and transaction records\n\u2022 In-app communications and support tickets\n\u2022 App usage patterns and feature interactions`,
  },
  {
    title: 'Location Data',
    content: `Location data is essential for our ride-sharing and rental services:\n\n\u2022 We collect precise GPS location when the app is in use\n\u2022 Background location is collected during active trips for safety and navigation\n\u2022 Pickup and drop-off locations are stored for ride matching\n\u2022 Location history is used to suggest frequently visited places\n\u2022 You can disable location services in your device settings, but this may limit core app functionality\n\nWe do not sell your location data to third parties. Location data is retained only as long as necessary for service delivery and regulatory compliance.`,
  },
  {
    title: 'How We Use Your Information',
    content: `Your information is used for the following purposes:\n\n\u2022 Matching drivers and passengers for pooling rides\n\u2022 Processing payments and facilitating transactions\n\u2022 Verifying user identity and driver credentials\n\u2022 Providing customer support and resolving disputes\n\u2022 Sending booking confirmations, ride alerts, and receipts\n\u2022 Improving our matching algorithms and route optimization\n\u2022 Detecting and preventing fraud, spam, and abuse\n\u2022 Complying with legal obligations and regulatory requirements\n\u2022 Personalizing the app experience based on preferences`,
  },
  {
    title: 'Information Sharing',
    content: `We share your information only when necessary:\n\nWith Other Users:\n\u2022 Your first name and profile photo are visible to ride partners\n\u2022 Drivers see pickup/drop-off locations for booked passengers\n\u2022 Your phone number may be shared temporarily during an active ride\n\nWith Service Providers:\n\u2022 Payment processors (Razorpay, PhonePe) for transaction handling\n\u2022 Cloud service providers (AWS) for data storage\n\u2022 SMS and notification providers for communications\n\u2022 Map services (Google Maps) for navigation\n\nWith Authorities:\n\u2022 When required by law, court order, or government request\n\u2022 To protect the safety of users and the public`,
  },
  {
    title: 'Data Security',
    content: `We implement robust security measures to protect your data:\n\n\u2022 All data transmitted between the app and servers is encrypted using TLS 1.3\n\u2022 Sensitive data (passwords, payment info) is encrypted at rest using AES-256\n\u2022 We conduct regular security audits and vulnerability assessments\n\u2022 Access to user data is restricted to authorized personnel only\n\u2022 Multi-factor authentication is available for account security\n\u2022 We maintain compliance with PCI-DSS for payment card data\n\u2022 Automated threat detection systems monitor for suspicious activities\n\nWhile we strive to protect your data, no method of transmission over the internet is 100% secure.`,
  },
  {
    title: 'Device Permissions',
    content: `The Forlok app requests the following device permissions:\n\n\u2022 Location: Required for ride matching, navigation, and live tracking\n\u2022 Camera: For profile photo upload and document scanning\n\u2022 Storage: For caching map data and saving receipts\n\u2022 Notifications: For ride updates, payment alerts, and messages\n\u2022 Phone: For direct calling between driver and passenger during rides\n\u2022 Contacts: Optional, for inviting friends and earning referral rewards\n\nYou can manage permissions through your device settings at any time.`,
  },
  {
    title: 'Cookies & Analytics',
    content: `We use cookies and analytics tools to improve our services:\n\n\u2022 Session cookies to maintain your login state\n\u2022 Preference cookies to remember your language and theme settings\n\u2022 Analytics cookies (Google Analytics, Firebase) for usage insights\n\u2022 Crash reporting tools (Sentry) for bug detection and fixes\n\nWe do not use cookies for cross-site advertising or tracking. You can disable non-essential cookies in the app settings.`,
  },
  {
    title: 'Data Retention & Deletion',
    content: `We retain your data for the following periods:\n\n\u2022 Account data: Retained while your account is active, plus 90 days after deletion\n\u2022 Transaction records: Retained for 7 years as required by Indian tax laws\n\u2022 Ride history: Retained for 3 years for dispute resolution\n\u2022 KYC documents: Retained as per RBI and government regulations\n\u2022 Communication logs: Retained for 1 year\n\nYou can request data deletion by:\n\u2022 Using the "Delete Account" option in Settings\n\u2022 Emailing privacy@forlok.com with your registered details\n\nWe will process deletion requests within 30 days, subject to legal retention requirements.`,
  },
  {
    title: "Children's Privacy",
    content: `Forlok is not intended for users under the age of 18:\n\n\u2022 We do not knowingly collect information from children under 18\n\u2022 If we discover that a child under 18 has provided personal information, we will delete it immediately\n\u2022 Parents or guardians who believe their child has provided information should contact us at privacy@forlok.com`,
  },
  {
    title: 'Updates to This Policy',
    content: `We may update this Privacy Policy from time to time:\n\n\u2022 Material changes will be communicated via email or in-app notification\n\u2022 Continued use of the app after changes constitutes acceptance\n\u2022 Previous versions of this policy are available upon request\n\u2022 The "Last Updated" date at the top reflects the most recent revision\n\nWe encourage you to review this policy periodically for any changes.`,
  },
];

export const PRIVACY_DEFAULT_RIGHTS = [
  { title: 'Right to Access', desc: 'Request a copy of your personal data' },
  { title: 'Right to Rectify', desc: 'Correct inaccurate or incomplete data' },
  { title: 'Right to Delete', desc: 'Request deletion of your personal data' },
  { title: 'Right to Restrict', desc: 'Limit how your data is processed' },
  { title: 'Right to Portability', desc: 'Receive your data in a portable format' },
  { title: 'Right to Object', desc: 'Object to certain processing activities' },
];

const PrivacyPolicyScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const { data: contentData } = useContentPage<any>('privacy_policy', {
    ...CONTENT_DEFAULTS.privacy_policy,
    sections: PRIVACY_DEFAULT_SECTIONS,
    rights: PRIVACY_DEFAULT_RIGHTS,
  } as any);
  const dynamicSections = contentData.sections;
  const dynamicRights = contentData.rights;

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <View style={[s.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={normalize(22)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>Privacy Policy</Text>
        <View style={{ width: normalize(22) }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={[s.heroCard, { backgroundColor: theme.colors.primary + '12' }]}>
          <View style={[s.heroIconWrap, { backgroundColor: theme.colors.primary + '26' }]}>
            <Shield size={18} color={theme.colors.primary} />
          </View>
          <Text style={[s.introTitle, { color: theme.colors.text }]}>{contentData.introTitle}</Text>
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

        <Text style={[s.sectionLabel, { color: theme.colors.textSecondary }]}>Privacy topics</Text>
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

        <View style={[s.rightsCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <View style={s.sectionHead}>
            <View style={[s.badge, { backgroundColor: theme.colors.primary + '14' }]}>
              <Text style={[s.badgeText, { color: theme.colors.primary }]}>{'\u2713'}</Text>
            </View>
            <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Your Rights</Text>
          </View>
          <Text style={[s.bodyText, { color: theme.colors.textSecondary, marginBottom: normalize(12) }]}>
            Under applicable Indian data protection laws, you have the following rights:
          </Text>
          <View style={s.rightsGrid}>
            {dynamicRights.map((r: any, i: number) => (
              <View key={i} style={[s.rightChip, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <Text style={[s.rightTitle, { color: theme.colors.text }]}>{r.title}</Text>
                <Text style={[s.rightDesc, { color: theme.colors.textSecondary }]}>{r.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[s.footerCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center' }]}>
          <Text style={[s.footerTitle, { color: theme.colors.text }]}>Data Protection Officer</Text>
          <Text style={[s.footerSub, { color: theme.colors.textSecondary }]}>
            For privacy-related inquiries, data requests, or complaints, contact our DPO:
          </Text>
          <View style={[s.emailPill, { backgroundColor: theme.colors.primary + '10' }]}>
            <Text style={[s.emailText, { color: theme.colors.primary }]}>
              {contentData.dpoEmail}
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
    lineHeight: normalize(18),
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
  rightsCard: {
    borderRadius: normalize(14),
    borderWidth: 1,
    padding: normalize(14),
    marginBottom: normalize(12),
  },

  rightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(8),
  },
  rightChip: {
    width: (wp(100) - normalize(16) * 2 - normalize(16) * 2 - normalize(8)) / 2,
    borderRadius: normalize(10),
    padding: normalize(10),
    borderWidth: StyleSheet.hairlineWidth,
  },
  rightTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: normalize(12),
    fontWeight: '600',
    marginBottom: normalize(2),
  },
  rightDesc: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    lineHeight: normalize(15),
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

export default PrivacyPolicyScreen;
