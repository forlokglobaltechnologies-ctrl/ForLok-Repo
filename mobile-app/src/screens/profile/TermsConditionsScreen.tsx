import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { normalize } from '@utils/responsive';
import { FONTS } from '@constants/theme';
import { useTheme } from '@context/ThemeContext';

const sections = [
  {
    title: 'Acceptance of Terms',
    content: `By downloading, installing, or using the Forlok mobile application ("App"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, please do not use the App.\n\nThese Terms constitute a legally binding agreement between you ("User") and Forlok Technologies Pvt. Ltd. ("Company", "we", "us", or "our"), a company registered under the laws of India with its registered office in Hyderabad, Telangana.`,
  },
  {
    title: 'User Eligibility & Registration',
    content: `To use Forlok, you must:\n\n\u2022 Be at least 18 years of age\n\u2022 Possess a valid government-issued ID (Aadhaar, PAN, Driving License, etc.)\n\u2022 Provide accurate and complete registration information\n\u2022 Maintain the security of your account credentials\n\nDrivers must additionally hold a valid Indian driving license appropriate for the vehicle type and have valid vehicle registration and insurance documents. All driver documents are subject to verification before service activation.`,
  },
  {
    title: 'Pooling Services',
    content: `Forlok's pooling service connects drivers with passengers traveling in similar directions. By using pooling services:\n\n\u2022 Drivers agree to offer available seats on their pre-planned routes\n\u2022 Passengers agree to share the ride with other verified users\n\u2022 The fare is calculated based on distance, route, and number of seats\n\u2022 Drivers must adhere to the declared route and pickup/drop-off points\n\u2022 Cancellation policies apply as defined in the App for each booking\n\u2022 Forlok acts as an intermediary platform and is not a transportation provider`,
  },
  {
    title: 'Rental Services',
    content: `Forlok's rental service allows users to rent vehicles for personal or commercial use. By using rental services:\n\n\u2022 The renter must provide a valid driving license and identity proof\n\u2022 Vehicles must be returned in the same condition as received\n\u2022 Fuel charges, toll fees, and any fines incurred are the renter's responsibility\n\u2022 Insurance coverage is provided as per the vehicle's existing policy\n\u2022 The security deposit is refundable upon satisfactory vehicle return\n\u2022 Any damage beyond normal wear and tear will be charged to the renter`,
  },
  {
    title: 'Pricing, Wallet & Coins',
    content: `Forlok provides transparent fare and trip-cost visibility:\n\n\u2022 Fares and rental charges are displayed before booking confirmation\n\u2022 Pooling settlement is done manually between passenger and driver\n\u2022 Wallet features may be used for eligible app-side credits and adjustments\n\u2022 Coins can be redeemed for fare discounts as per in-app limits\n\u2022 All prices are in Indian Rupees (INR)\n\u2022 Cancellation/refund outcomes are shown per booking policy in-app`,
  },
  {
    title: 'Safety & Conduct',
    content: `All users must adhere to safety standards and respectful conduct:\n\n\u2022 Follow all applicable traffic rules and regulations\n\u2022 Maintain a respectful and courteous attitude towards co-passengers\n\u2022 Do not transport illegal substances, weapons, or hazardous materials\n\u2022 Wear seatbelts at all times during the ride\n\u2022 Report any safety concerns immediately through the in-app SOS feature\n\u2022 Do not discriminate against users based on caste, religion, gender, or region\n\u2022 Drivers must not operate vehicles under the influence of alcohol or drugs`,
  },
  {
    title: 'Prohibited Activities',
    content: `The following activities are strictly prohibited on the Forlok platform:\n\n\u2022 Creating fake or duplicate accounts\n\u2022 Manipulating reviews, ratings, or booking data\n\u2022 Circumventing the platform to arrange off-app transactions\n\u2022 Harassing, threatening, or abusing other users\n\u2022 Using the platform for any unlawful purpose\n\u2022 Sharing account credentials with third parties\n\u2022 Tampering with fare calculations or GPS data\n\nViolation of these rules may result in immediate account suspension or termination.`,
  },
  {
    title: 'Cancellation & Refund Policy',
    content: `Cancellation terms for Forlok services:\n\nPooling:\n\u2022 Free cancellation up to 30 minutes before departure time\n\u2022 Cancellation within 30 minutes incurs a fee of up to 20% of the fare\n\u2022 No-shows are charged the full fare amount\n\nRentals:\n\u2022 Free cancellation up to 24 hours before the rental period\n\u2022 Cancellation within 24 hours incurs a fee of up to 25% of the rental amount\n\u2022 Refund for unused days is subject to a processing fee\n\nForlok reserves the right to modify cancellation policies with prior notice.`,
  },
  {
    title: 'Limitation of Liability',
    content: `To the maximum extent permitted by applicable Indian law:\n\n\u2022 Forlok is a technology platform and not a transportation company\n\u2022 We do not guarantee availability, punctuality, or quality of rides\n\u2022 We are not liable for any personal injury, property damage, or loss during rides\n\u2022 Our total liability shall not exceed the amount paid for the specific service\n\u2022 We are not responsible for actions of third-party drivers or passengers\n\u2022 Force majeure events (natural disasters, strikes, etc.) absolve liability`,
  },
  {
    title: 'Governing Law & Disputes',
    content: `These Terms are governed by and construed in accordance with the laws of India:\n\n\u2022 Any disputes shall be subject to the exclusive jurisdiction of courts in Hyderabad, Telangana\n\u2022 Disputes shall first be attempted to be resolved through mediation\n\u2022 If mediation fails, arbitration under the Arbitration and Conciliation Act, 1996 shall apply\n\u2022 The language of arbitration shall be English\n\u2022 Consumer complaints can be filed with the National Consumer Disputes Redressal Commission as applicable`,
  },
  {
    title: 'Modifications to Terms',
    content: `Forlok reserves the right to modify these Terms at any time:\n\n\u2022 Users will be notified of material changes via email or in-app notifications\n\u2022 Continued use of the App after changes constitutes acceptance\n\u2022 Users who disagree with updated Terms should discontinue use\n\u2022 Previous versions of Terms are available upon request\n\nFor any questions regarding these Terms, contact us at legal@forlok.com.`,
  },
];

const TermsConditionsScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();

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
        <View style={[s.introCard, { backgroundColor: theme.colors.primary + '0A' }]}>
          <Text style={[s.introTitle, { color: theme.colors.text }]}>Terms of Service</Text>
          <Text style={[s.introSub, { color: theme.colors.textSecondary }]}>
            Please read these terms carefully before using Forlok
          </Text>
          <View style={[s.datePill, { backgroundColor: theme.colors.primary + '14' }]}>
            <Text style={[s.dateText, { color: theme.colors.primary }]}>Effective: January 2024</Text>
          </View>
        </View>

        <View style={[s.card, { backgroundColor: theme.colors.primary + '08', borderColor: theme.colors.primary + '20' }]}>
          <Text style={[s.bodyText, { color: theme.colors.text }]}>
            Welcome to Forlok. These Terms and Conditions govern your use of the Forlok mobile application
            and all related services offered by Forlok Technologies Pvt. Ltd. By accessing or using our platform,
            you acknowledge that you have read, understood, and agree to be bound by these Terms.
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

        <View style={[s.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center' }]}>
          <Text style={[s.footerTitle, { color: theme.colors.text }]}>Questions?</Text>
          <Text style={[s.footerSub, { color: theme.colors.textSecondary }]}>
            If you have any questions about these Terms and Conditions, please contact us at:
          </Text>
          <View style={[s.emailPill, { backgroundColor: theme.colors.primary + '10' }]}>
            <Text style={[s.emailText, { color: theme.colors.primary }]}>legal@forlok.com</Text>
          </View>
        </View>

        <Text style={[s.copyright, { color: theme.colors.textSecondary }]}>
          {'\u00A9'} 2024 Forlok Technologies Pvt. Ltd. All rights reserved.
          {'\n'}Registered in Hyderabad, Telangana, India.
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
