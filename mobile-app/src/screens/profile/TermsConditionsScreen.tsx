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
  FileText,
  Users,
  Shield,
  CreditCard,
  Ban,
  AlertTriangle,
  Scale,
  HandshakeIcon,
  Car,
  MapPin,
  Clock,
  UserCheck,
  Gavel,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { normalize, wp, hp } from '@utils/responsive';
import { COLORS, FONTS, SPACING, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';


const TermsConditionsScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const sections = [
    {
      icon: UserCheck,
      title: 'Acceptance of Terms',
      color: '#4CAF50',
      content: `By downloading, installing, or using the Forlok mobile application ("App"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, please do not use the App.

These Terms constitute a legally binding agreement between you ("User") and Forlok Technologies Pvt. Ltd. ("Company", "we", "us", or "our"), a company registered under the laws of India with its registered office in Hyderabad, Telangana.`,
    },
    {
      icon: Users,
      title: 'User Eligibility & Registration',
      color: '#2196F3',
      content: `To use Forlok, you must:

\u2022 Be at least 18 years of age
\u2022 Possess a valid government-issued ID (Aadhaar, PAN, Driving License, etc.)
\u2022 Provide accurate and complete registration information
\u2022 Maintain the security of your account credentials

Drivers must additionally hold a valid Indian driving license appropriate for the vehicle type and have valid vehicle registration and insurance documents. All driver documents are subject to verification before service activation.`,
    },
    {
      icon: Car,
      title: 'Pooling Services',
      color: '#FF9800',
      content: `Forlok's pooling service connects drivers with passengers traveling in similar directions. By using pooling services:

\u2022 Drivers agree to offer available seats on their pre-planned routes
\u2022 Passengers agree to share the ride with other verified users
\u2022 The fare is calculated based on distance, route, and number of seats
\u2022 Drivers must adhere to the declared route and pickup/drop-off points
\u2022 Cancellation policies apply as defined in the App for each booking
\u2022 Forlok acts as an intermediary platform and is not a transportation provider`,
    },
    {
      icon: MapPin,
      title: 'Rental Services',
      color: '#9C27B0',
      content: `Forlok's rental service allows users to rent vehicles for personal or commercial use. By using rental services:

\u2022 The renter must provide a valid driving license and identity proof
\u2022 Vehicles must be returned in the same condition as received
\u2022 Fuel charges, toll fees, and any fines incurred are the renter's responsibility
\u2022 Insurance coverage is provided as per the vehicle's existing policy
\u2022 The security deposit is refundable upon satisfactory vehicle return
\u2022 Any damage beyond normal wear and tear will be charged to the renter`,
    },
    {
      icon: CreditCard,
      title: 'Payments & Pricing',
      color: '#00BCD4',
      content: `All payments on the Forlok platform are processed securely:

\u2022 Fares and rental charges are displayed before booking confirmation
\u2022 Payment methods include UPI, debit/credit cards, net banking, and Forlok Wallet
\u2022 Forlok charges a service fee (commission) on each transaction
\u2022 Drivers receive payouts after deduction of the platform commission
\u2022 All prices are in Indian Rupees (INR) and inclusive of applicable GST
\u2022 Refunds are processed within 5-7 business days to the original payment method
\u2022 Surge pricing may apply during peak demand periods`,
    },
    {
      icon: Shield,
      title: 'Safety & Conduct',
      color: '#4CAF50',
      content: `All users must adhere to safety standards and respectful conduct:

\u2022 Follow all applicable traffic rules and regulations
\u2022 Maintain a respectful and courteous attitude towards co-passengers
\u2022 Do not transport illegal substances, weapons, or hazardous materials
\u2022 Wear seatbelts at all times during the ride
\u2022 Report any safety concerns immediately through the in-app SOS feature
\u2022 Do not discriminate against users based on caste, religion, gender, or region
\u2022 Drivers must not operate vehicles under the influence of alcohol or drugs`,
    },
    {
      icon: Ban,
      title: 'Prohibited Activities',
      color: '#F44336',
      content: `The following activities are strictly prohibited on the Forlok platform:

\u2022 Creating fake or duplicate accounts
\u2022 Manipulating reviews, ratings, or booking data
\u2022 Circumventing the platform to arrange off-app transactions
\u2022 Harassing, threatening, or abusing other users
\u2022 Using the platform for any unlawful purpose
\u2022 Sharing account credentials with third parties
\u2022 Tampering with fare calculations or GPS data

Violation of these rules may result in immediate account suspension or termination.`,
    },
    {
      icon: Clock,
      title: 'Cancellation & Refund Policy',
      color: '#FF5722',
      content: `Cancellation terms for Forlok services:

Pooling:
\u2022 Free cancellation up to 30 minutes before departure time
\u2022 Cancellation within 30 minutes incurs a fee of up to 20% of the fare
\u2022 No-shows are charged the full fare amount

Rentals:
\u2022 Free cancellation up to 24 hours before the rental period
\u2022 Cancellation within 24 hours incurs a fee of up to 25% of the rental amount
\u2022 Refund for unused days is subject to a processing fee

Forlok reserves the right to modify cancellation policies with prior notice.`,
    },
    {
      icon: AlertTriangle,
      title: 'Limitation of Liability',
      color: '#FFC107',
      content: `To the maximum extent permitted by applicable Indian law:

\u2022 Forlok is a technology platform and not a transportation company
\u2022 We do not guarantee availability, punctuality, or quality of rides
\u2022 We are not liable for any personal injury, property damage, or loss during rides
\u2022 Our total liability shall not exceed the amount paid for the specific service
\u2022 We are not responsible for actions of third-party drivers or passengers
\u2022 Force majeure events (natural disasters, strikes, etc.) absolve liability`,
    },
    {
      icon: Scale,
      title: 'Governing Law & Disputes',
      color: '#607D8B',
      content: `These Terms are governed by and construed in accordance with the laws of India:

\u2022 Any disputes shall be subject to the exclusive jurisdiction of courts in Hyderabad, Telangana
\u2022 Disputes shall first be attempted to be resolved through mediation
\u2022 If mediation fails, arbitration under the Arbitration and Conciliation Act, 1996 shall apply
\u2022 The language of arbitration shall be English
\u2022 Consumer complaints can be filed with the National Consumer Disputes Redressal Commission as applicable`,
    },
    {
      icon: Gavel,
      title: 'Modifications to Terms',
      color: '#795548',
      content: `Forlok reserves the right to modify these Terms at any time:

\u2022 Users will be notified of material changes via email or in-app notifications
\u2022 Continued use of the App after changes constitutes acceptance
\u2022 Users who disagree with updated Terms should discontinue use
\u2022 Previous versions of Terms are available upon request

For any questions regarding these Terms, contact us at legal@forlok.com.`,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Hero Header ── */}
      <ImageBackground
        source={require('../../../assets/terms.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={40} style={styles.blurContainer}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Terms & Conditions</Text>
            <View style={{ width: normalize(38) }} />
          </View>
        </BlurView>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Title Card ── */}
        <View style={[styles.titleCard, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.titleIconCircle, { backgroundColor: theme.colors.primary + '12' }]}>
            <FileText size={26} color={theme.colors.primary} />
          </View>
          <Text style={[styles.titleText, { color: theme.colors.text }]}>Terms of Service</Text>
          <Text style={[styles.subtitleText, { color: theme.colors.textSecondary }]}>
            Please read these terms carefully before using Forlok
          </Text>
          <View style={[styles.datePill, { backgroundColor: theme.colors.primary + '12' }]}>
            <Text style={[styles.dateText, { color: theme.colors.primary }]}>Effective: January 2024</Text>
          </View>
        </View>

        {/* ── Introduction Card ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.primary + '08', borderColor: theme.colors.primary + '20', borderWidth: 1 }]}>
          <Text style={[styles.introText, { color: theme.colors.text }]}>
            Welcome to Forlok. These Terms and Conditions govern your use of the Forlok mobile application
            and all related services offered by Forlok Technologies Pvt. Ltd. By accessing or using our platform,
            you acknowledge that you have read, understood, and agree to be bound by these Terms.
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

        {/* ── Contact Footer ── */}
        <View style={[styles.footerCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.footerTitle, { color: theme.colors.text }]}>Questions?</Text>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            If you have any questions about these Terms and Conditions, please contact us at:
          </Text>
          <View style={[styles.contactPill, { backgroundColor: theme.colors.primary + '10' }]}>
            <Text style={[styles.contactEmail, { color: theme.colors.primary }]}>legal@forlok.com</Text>
          </View>
        </View>

        {/* ── Disclaimer ── */}
        <Text style={[styles.disclaimer, { color: theme.colors.textSecondary }]}>
          {'\u00A9'} 2024 Forlok Technologies Pvt. Ltd. All rights reserved.
          {'\n'}Registered in Hyderabad, Telangana, India.
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

  /* ── Footer ── */
  footerCard: {
    borderRadius: normalize(16),
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  footerTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(17),
    fontWeight: '700',
    marginBottom: normalize(6),
  },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    textAlign: 'center',
    marginBottom: SPACING.sm,
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
  disclaimer: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    textAlign: 'center',
    lineHeight: normalize(18),
    marginBottom: SPACING.xl,
  },
});

export default TermsConditionsScreen;
