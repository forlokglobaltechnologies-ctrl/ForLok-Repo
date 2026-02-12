import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Lock,
  Eye,
  Database,
  Share2,
  Trash2,
  ShieldCheck,
  Bell,
  MapPin,
  Smartphone,
  Cookie,
  Baby,
  RefreshCw,
  Mail,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { normalize, wp, hp } from '@utils/responsive';
import { COLORS, FONTS, SPACING, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';


const PrivacyPolicyScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const sections = [
    {
      icon: Database,
      title: 'Information We Collect',
      color: '#2196F3',
      content: `We collect the following categories of information to provide and improve our services:

Personal Information:
\u2022 Full name, email address, phone number
\u2022 Profile photo and date of birth
\u2022 Government-issued ID (Aadhaar, PAN, Driving License) for verification
\u2022 Bank account or UPI details for payment processing

Vehicle Information (Drivers):
\u2022 Driving license details and expiry
\u2022 Vehicle registration number, make, model, and year
\u2022 Vehicle insurance and fitness certificate details

Usage Information:
\u2022 Ride history, booking details, and transaction records
\u2022 In-app communications and support tickets
\u2022 App usage patterns and feature interactions`,
    },
    {
      icon: MapPin,
      title: 'Location Data',
      color: '#4CAF50',
      content: `Location data is essential for our ride-sharing and rental services:

\u2022 We collect precise GPS location when the app is in use
\u2022 Background location is collected during active trips for safety and navigation
\u2022 Pickup and drop-off locations are stored for ride matching
\u2022 Location history is used to suggest frequently visited places
\u2022 You can disable location services in your device settings, but this may limit core app functionality

We do not sell your location data to third parties. Location data is retained only as long as necessary for service delivery and regulatory compliance.`,
    },
    {
      icon: Eye,
      title: 'How We Use Your Information',
      color: '#FF9800',
      content: `Your information is used for the following purposes:

\u2022 Matching drivers and passengers for pooling rides
\u2022 Processing payments and facilitating transactions
\u2022 Verifying user identity and driver credentials
\u2022 Providing customer support and resolving disputes
\u2022 Sending booking confirmations, ride alerts, and receipts
\u2022 Improving our matching algorithms and route optimization
\u2022 Detecting and preventing fraud, spam, and abuse
\u2022 Complying with legal obligations and regulatory requirements
\u2022 Personalizing the app experience based on preferences`,
    },
    {
      icon: Share2,
      title: 'Information Sharing',
      color: '#9C27B0',
      content: `We share your information only when necessary:

With Other Users:
\u2022 Your first name and profile photo are visible to ride partners
\u2022 Drivers see pickup/drop-off locations for booked passengers
\u2022 Your phone number may be shared temporarily during an active ride

With Service Providers:
\u2022 Payment processors (Razorpay, PhonePe) for transaction handling
\u2022 Cloud service providers (AWS) for data storage
\u2022 SMS and notification providers for communications
\u2022 Map services (Google Maps) for navigation

With Authorities:
\u2022 When required by law, court order, or government request
\u2022 To protect the safety of users and the public`,
    },
    {
      icon: ShieldCheck,
      title: 'Data Security',
      color: '#00BCD4',
      content: `We implement robust security measures to protect your data:

\u2022 All data transmitted between the app and servers is encrypted using TLS 1.3
\u2022 Sensitive data (passwords, payment info) is encrypted at rest using AES-256
\u2022 We conduct regular security audits and vulnerability assessments
\u2022 Access to user data is restricted to authorized personnel only
\u2022 Multi-factor authentication is available for account security
\u2022 We maintain compliance with PCI-DSS for payment card data
\u2022 Automated threat detection systems monitor for suspicious activities

While we strive to protect your data, no method of transmission over the internet is 100% secure.`,
    },
    {
      icon: Smartphone,
      title: 'Device Permissions',
      color: '#795548',
      content: `The Forlok app requests the following device permissions:

\u2022 Location: Required for ride matching, navigation, and live tracking
\u2022 Camera: For profile photo upload and document scanning
\u2022 Storage: For caching map data and saving receipts
\u2022 Notifications: For ride updates, payment alerts, and messages
\u2022 Phone: For direct calling between driver and passenger during rides
\u2022 Contacts: Optional, for inviting friends and earning referral rewards

You can manage permissions through your device settings at any time.`,
    },
    {
      icon: Cookie,
      title: 'Cookies & Analytics',
      color: '#FF5722',
      content: `We use cookies and analytics tools to improve our services:

\u2022 Session cookies to maintain your login state
\u2022 Preference cookies to remember your language and theme settings
\u2022 Analytics cookies (Google Analytics, Firebase) for usage insights
\u2022 Crash reporting tools (Sentry) for bug detection and fixes

We do not use cookies for cross-site advertising or tracking. You can disable non-essential cookies in the app settings.`,
    },
    {
      icon: Trash2,
      title: 'Data Retention & Deletion',
      color: '#F44336',
      content: `We retain your data for the following periods:

\u2022 Account data: Retained while your account is active, plus 90 days after deletion
\u2022 Transaction records: Retained for 7 years as required by Indian tax laws
\u2022 Ride history: Retained for 3 years for dispute resolution
\u2022 KYC documents: Retained as per RBI and government regulations
\u2022 Communication logs: Retained for 1 year

You can request data deletion by:
\u2022 Using the "Delete Account" option in Settings
\u2022 Emailing privacy@forlok.com with your registered details

We will process deletion requests within 30 days, subject to legal retention requirements.`,
    },
    {
      icon: Baby,
      title: 'Children\'s Privacy',
      color: '#E91E63',
      content: `Forlok is not intended for users under the age of 18:

\u2022 We do not knowingly collect information from children under 18
\u2022 If we discover that a child under 18 has provided personal information, we will delete it immediately
\u2022 Parents or guardians who believe their child has provided information should contact us at privacy@forlok.com`,
    },
    {
      icon: RefreshCw,
      title: 'Updates to This Policy',
      color: '#607D8B',
      content: `We may update this Privacy Policy from time to time:

\u2022 Material changes will be communicated via email or in-app notification
\u2022 Continued use of the app after changes constitutes acceptance
\u2022 Previous versions of this policy are available upon request
\u2022 The "Last Updated" date at the top reflects the most recent revision

We encourage you to review this policy periodically for any changes.`,
    },
  ];

  const rights = [
    { title: 'Right to Access', desc: 'Request a copy of your personal data' },
    { title: 'Right to Rectify', desc: 'Correct inaccurate or incomplete data' },
    { title: 'Right to Delete', desc: 'Request deletion of your personal data' },
    { title: 'Right to Restrict', desc: 'Limit how your data is processed' },
    { title: 'Right to Portability', desc: 'Receive your data in a portable format' },
    { title: 'Right to Object', desc: 'Object to certain processing activities' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Hero Header ── */}
      <ImageBackground
        source={require('../../../assets/privacy.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={40} style={styles.blurContainer}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Privacy Policy</Text>
            <View style={{ width: normalize(38) }} />
          </View>
        </BlurView>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Title Card ── */}
        <View style={[styles.titleCard, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.titleIconCircle, { backgroundColor: theme.colors.primary + '12' }]}>
            <Lock size={26} color={theme.colors.primary} />
          </View>
          <Text style={[styles.titleText, { color: theme.colors.text }]}>Privacy Policy</Text>
          <Text style={[styles.subtitleText, { color: theme.colors.textSecondary }]}>
            Your privacy matters to us. Learn how we collect, use, and protect your data.
          </Text>
          <View style={[styles.datePill, { backgroundColor: theme.colors.primary + '12' }]}>
            <Text style={[styles.dateText, { color: theme.colors.primary }]}>Last Updated: January 2024</Text>
          </View>
        </View>

        {/* ── Introduction ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.primary + '08', borderColor: theme.colors.primary + '20', borderWidth: 1 }]}>
          <Text style={[styles.introText, { color: theme.colors.text }]}>
            Forlok Technologies Pvt. Ltd. ("Forlok", "we", "us") respects your privacy and is committed
            to protecting the personal information you share with us. This Privacy Policy explains what
            data we collect, how we use it, and the choices you have regarding your information. This policy
            applies to all users of the Forlok mobile application and related services, and complies with
            the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 of India.
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

        {/* ── Your Rights ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#4CAF50' + '12' }]}>
              <ShieldCheck size={18} color="#4CAF50" />
            </View>
            <View style={styles.sectionTitleArea}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Rights</Text>
            </View>
          </View>
          <Text style={[styles.sectionContent, { color: theme.colors.textSecondary, marginBottom: SPACING.md }]}>
            Under applicable Indian data protection laws, you have the following rights:
          </Text>
          <View style={styles.rightsGrid}>
            {rights.map((right, index) => (
              <View key={index} style={[styles.rightChip, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <Text style={[styles.rightTitle, { color: theme.colors.text }]}>{right.title}</Text>
                <Text style={[styles.rightDesc, { color: theme.colors.textSecondary }]}>{right.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Contact Footer ── */}
        <View style={[styles.footerCard, { backgroundColor: theme.colors.surface }]}>
          <Mail size={22} color={theme.colors.primary} />
          <Text style={[styles.footerTitle, { color: theme.colors.text }]}>Data Protection Officer</Text>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            For privacy-related inquiries, data requests, or complaints, contact our DPO:
          </Text>
          <View style={[styles.contactPill, { backgroundColor: theme.colors.primary + '10' }]}>
            <Text style={[styles.contactEmail, { color: theme.colors.primary }]}>privacy@forlok.com</Text>
          </View>
          <Text style={[styles.footerSmall, { color: theme.colors.textSecondary }]}>
            Forlok Technologies Pvt. Ltd.{'\n'}Hyderabad, Telangana 500081, India
          </Text>
        </View>

        {/* ── Disclaimer ── */}
        <Text style={[styles.disclaimer, { color: theme.colors.textSecondary }]}>
          {'\u00A9'} 2024 Forlok Technologies Pvt. Ltd. All rights reserved.
          {'\n'}This policy is governed by the laws of India.
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
    lineHeight: normalize(19),
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

  /* ── Rights Grid ── */
  rightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  rightChip: {
    width: (wp(100) - SPACING.md * 2 - SPACING.lg * 2 - SPACING.sm) / 2,
    borderRadius: normalize(12),
    padding: SPACING.sm + 2,
    borderWidth: 1,
  },
  rightTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    fontWeight: '700',
    marginBottom: normalize(2),
  },
  rightDesc: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    lineHeight: normalize(15),
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
  contactPill: {
    paddingHorizontal: normalize(18),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
  },
  contactEmail: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    fontWeight: '700',
  },
  footerSmall: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    textAlign: 'center',
    lineHeight: normalize(16),
  },
  disclaimer: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    textAlign: 'center',
    lineHeight: normalize(18),
    marginBottom: SPACING.xl,
  },
});

export default PrivacyPolicyScreen;
