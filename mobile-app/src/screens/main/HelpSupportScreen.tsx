import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Search,
  MessageCircle,
  Phone,
  Mail,
  HelpCircle,
  Bug,
  MessageSquare,
  ChevronRight,
  BookOpen,
  Shield,
  CreditCard,
  Car,
  MapPin,
  Star,
  FileText,
  Headphones,
  ExternalLink,
  X,
} from 'lucide-react-native';
import { FONTS } from '@constants/theme';
import { normalize } from '@utils/responsive';
import { useTheme } from '@context/ThemeContext';

const HelpSupportScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const quickActions = [
    {
      icon: BookOpen,
      label: 'FAQs',
      desc: 'Find quick answers',
      color: '#2196F3',
      onPress: () => navigation.navigate('FAQ'),
    },
    {
      icon: Bug,
      label: 'Report Bug',
      desc: 'Found an issue?',
      color: '#F44336',
      onPress: () => navigation.navigate('ReportBug'),
    },
    {
      icon: MessageSquare,
      label: 'Feedback',
      desc: 'Share your thoughts',
      color: '#4CAF50',
      onPress: () => navigation.navigate('Feedback'),
    },
  ];

  const [selectedTopic, setSelectedTopic] = useState<typeof popularTopics[0] | null>(null);

  const popularTopics = [
    {
      icon: Car,
      title: 'How to create a pooling offer',
      color: '#FF9800',
      category: 'Pooling',
      explanation: 'Creating a pooling offer on Forlok is simple:\n\n1. Tap "Offer Services" from the dashboard\n2. Select "Create Pooling Offer"\n3. Enter your starting location (From) and destination (To)\n4. Set the date, departure time, and number of available seats\n5. Set your price per seat (Forlok shows a suggested range)\n6. Optionally add stopping points along your route\n7. Review and publish your offer\n\nOnce published, passengers searching for rides on your route will see your offer and can book seats. You\'ll receive a notification when someone books.',
    },
    {
      icon: MapPin,
      title: 'How to book a rental vehicle',
      color: '#9C27B0',
      category: 'Rental',
      explanation: 'To book a rental vehicle on Forlok:\n\n1. Go to "Take Services" > "Search Rental"\n2. Select your preferred vehicle type (bike, car, SUV, etc.)\n3. Choose your rental dates and location\n4. Browse available vehicles with photos, ratings, and pricing\n5. Tap on a vehicle to see full details and owner info\n6. Select your rental duration and review the price summary\n7. Complete payment via UPI, card, or Forlok Wallet\n8. Pick up the vehicle at the agreed location with valid ID\n\nA security deposit may be required, which is refundable upon safe return of the vehicle.',
    },
    {
      icon: CreditCard,
      title: 'Payment issues & refunds',
      color: '#2196F3',
      category: 'Payments',
      explanation: 'Common payment issues and how to resolve them:\n\nPayment Failed:\n\u2022 Check your internet connection and retry\n\u2022 Ensure sufficient balance in your account/wallet\n\u2022 Try a different payment method\n\u2022 If money was deducted but booking failed, it will auto-refund in 24-48 hours\n\nRefund Process:\n\u2022 Eligible cancellations are auto-refunded\n\u2022 Refunds to UPI/cards: 5-7 business days\n\u2022 Refunds to Forlok Wallet: Instant\n\u2022 Track refund status in Booking History > Payment Details\n\nFor unresolved payment issues, contact support@forlok.com with your booking ID and transaction details.',
    },
    {
      icon: FileText,
      title: 'Cancellation policy',
      color: '#F44336',
      category: 'Policy',
      explanation: 'Forlok\'s cancellation policies:\n\nPooling Rides:\n\u2022 Free cancellation up to 30 minutes before departure\n\u2022 Cancellation within 30 minutes: up to 20% fee\n\u2022 No-show: full fare charged\n\u2022 Driver cancellation: full refund to passenger\n\nRental Vehicles:\n\u2022 Free cancellation up to 24 hours before rental start\n\u2022 Cancellation within 24 hours: up to 25% fee\n\u2022 No-show: full amount charged\n\u2022 Early return: refund for unused days (minus processing fee)\n\nNote: Forlok reserves the right to waive cancellation fees in cases of emergency. Contact support with valid documentation.',
    },
    {
      icon: Star,
      title: 'How to rate a trip',
      color: '#FF9800',
      category: 'Ratings',
      explanation: 'Rating your trip helps maintain community quality:\n\n1. After a ride is completed, you\'ll see a rating prompt\n2. Tap 1-5 stars based on your experience\n3. Optionally write a review describing your experience\n4. Submit your rating\n\nYou can also rate later from Booking History:\n1. Go to History tab\n2. Find the completed booking\n3. Tap the rating option\n\nRating Guidelines:\n\u2022 5 Stars: Excellent experience\n\u2022 4 Stars: Good, minor issues\n\u2022 3 Stars: Average experience\n\u2022 2 Stars: Below expectations\n\u2022 1 Star: Poor experience\n\nYour honest feedback helps other users make better decisions.',
    },
    {
      icon: Shield,
      title: 'Document verification process',
      color: '#4CAF50',
      category: 'Account',
      explanation: 'Document verification ensures safety for all users:\n\nRequired Documents:\n\u2022 Passengers: Government ID (Aadhaar, PAN, or Voter ID)\n\u2022 Drivers: Driving License + Vehicle RC + Insurance + Government ID\n\nVerification Process:\n1. Go to your Profile > Documents\n2. Upload clear photos of each required document\n3. Ensure all details are readable and not expired\n4. Submit for verification\n\nTimeline:\n\u2022 Standard verification: 24-48 hours\n\u2022 You\'ll receive a notification when approved/rejected\n\u2022 Rejected documents can be re-uploaded with corrections\n\nTips:\n\u2022 Use good lighting when photographing documents\n\u2022 Ensure all corners of the document are visible\n\u2022 Don\'t upload blurry or cropped images',
    },
    {
      icon: CreditCard,
      title: 'Wallet & Forlok coins',
      color: '#00BCD4',
      category: 'Wallet',
      explanation: 'Forlok Wallet & Coins system:\n\nForlok Wallet:\n\u2022 A digital wallet for quick payments\n\u2022 Add money via UPI, debit/credit card, or net banking\n\u2022 Use for pooling bookings and rental payments\n\u2022 Receive refunds instantly to wallet\n\u2022 Withdraw to bank account anytime (1-2 business days)\n\nForlok Coins:\n\u2022 Earn coins through various activities:\n  - Complete a ride: 10-50 coins\n  - Refer a friend: 100 coins\n  - Maintain 4.5+ rating: 25 coins/month\n  - First ride of the month: 20 coins\n\u2022 Redeem coins for:\n  - Ride discounts (100 coins = \u20B910)\n  - Wallet credits\n  - Exclusive promotions\n\nCheck the Earn Coins section in-app for current offers.',
    },
    {
      icon: Car,
      title: 'How driver tracking works',
      color: '#607D8B',
      category: 'Tracking',
      explanation: 'Real-time driver tracking on Forlok:\n\nFor Passengers:\n\u2022 Once a ride starts, open the Trip Tracking screen\n\u2022 See the driver\'s live location on an interactive map\n\u2022 View real-time ETA, distance remaining, and route\n\u2022 Share your live trip with family/friends for safety\n\u2022 Get automatic notifications at key points (driver nearby, arriving, etc.)\n\nFor Drivers:\n\u2022 The Driver Trip screen shows your active route\n\u2022 See all passenger pickup/drop-off points\n\u2022 Distance, duration, and ETA metrics displayed live\n\u2022 Navigate to each stopping point in sequence\n\u2022 Mark passengers as picked up/dropped off\n\nTracking uses GPS and is active only during the trip. Location sharing stops automatically when the trip ends.',
    },
  ];

  const contactOptions = [
    {
      icon: MessageCircle,
      label: 'Live Chat',
      desc: 'Chat with our support team',
      color: '#4CAF50',
      action: () => {},
    },
    {
      icon: Phone,
      label: 'Call Us',
      desc: 'Toll-free: 1800-XXX-XXXX',
      color: '#2196F3',
      action: () => Linking.openURL('tel:+911800XXXXXXX'),
    },
    {
      icon: Mail,
      label: 'Email Support',
      desc: 'support@forlok.com',
      color: '#FF9800',
      action: () => Linking.openURL('mailto:support@forlok.com'),
    },
  ];

  const filteredTopics = searchQuery.trim()
    ? popularTopics.filter(tp => tp.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : popularTopics;

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ArrowLeft size={normalize(22)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>Help & Support</Text>
        <View style={{ width: normalize(38) }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={[s.searchCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Search size={normalize(18)} color={theme.colors.textSecondary} />
          <TextInput
            style={[s.searchInput, { color: theme.colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search help topics..."
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {/* Quick Actions */}
        <View style={s.quickActionsRow}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[s.quickActionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={[s.quickActionIcon, { backgroundColor: action.color + '14' }]}>
                <action.icon size={normalize(20)} color={action.color} />
              </View>
              <Text style={[s.quickActionLabel, { color: theme.colors.text }]}>{action.label}</Text>
              <Text style={[s.quickActionDesc, { color: theme.colors.textSecondary }]}>{action.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Popular Topics */}
        <View style={s.sectionTitleRow}>
          <HelpCircle size={normalize(17)} color={theme.colors.primary} />
          <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Popular Topics</Text>
        </View>
        <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {filteredTopics.map((topic, index) => (
            <React.Fragment key={index}>
              {index > 0 && <View style={[s.divider, { backgroundColor: theme.colors.border }]} />}
              <TouchableOpacity
                style={s.topicRow}
                onPress={() => setSelectedTopic(topic)}
                activeOpacity={0.7}
              >
                <View style={[s.topicIconWrap, { backgroundColor: topic.color + '14' }]}>
                  <topic.icon size={normalize(17)} color={topic.color} />
                </View>
                <View style={s.topicInfo}>
                  <Text style={[s.topicTitle, { color: theme.colors.text }]}>{topic.title}</Text>
                  <Text style={[s.topicCategory, { color: theme.colors.textSecondary }]}>{topic.category}</Text>
                </View>
                <ChevronRight size={normalize(16)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </React.Fragment>
          ))}
          {filteredTopics.length === 0 && (
            <View style={s.emptyState}>
              <Search size={normalize(24)} color={theme.colors.textSecondary} />
              <Text style={[s.emptyText, { color: theme.colors.textSecondary }]}>No topics found</Text>
            </View>
          )}
        </View>

        {/* Contact Support */}
        <View style={s.sectionTitleRow}>
          <Headphones size={normalize(17)} color={theme.colors.primary} />
          <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Contact Support</Text>
        </View>
        <View style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {contactOptions.map((contact, index) => (
            <React.Fragment key={index}>
              {index > 0 && <View style={[s.divider, { backgroundColor: theme.colors.border }]} />}
              <TouchableOpacity style={s.contactRow} onPress={contact.action} activeOpacity={0.7}>
                <View style={[s.contactIconWrap, { backgroundColor: contact.color + '14' }]}>
                  <contact.icon size={normalize(19)} color={contact.color} />
                </View>
                <View style={s.contactInfo}>
                  <Text style={[s.contactLabel, { color: theme.colors.text }]}>{contact.label}</Text>
                  <Text style={[s.contactDesc, { color: theme.colors.textSecondary }]}>{contact.desc}</Text>
                </View>
                <ExternalLink size={normalize(15)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* Support Hours */}
        <View style={[s.supportHoursCard, { backgroundColor: theme.colors.primary + '08', borderColor: theme.colors.primary + '20' }]}>
          <Text style={[s.supportHoursTitle, { color: theme.colors.text }]}>Support Hours</Text>
          <Text style={[s.supportHoursText, { color: theme.colors.textSecondary }]}>
            Monday - Saturday: 9:00 AM - 9:00 PM IST{'\n'}
            Sunday: 10:00 AM - 6:00 PM IST{'\n'}
            Emergency SOS: Available 24/7
          </Text>
        </View>
      </ScrollView>

      {/* Topic Detail Modal */}
      <Modal
        visible={!!selectedTopic}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTopic(null)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: theme.colors.surface }]}>
            <View style={[s.modalHandle, { backgroundColor: theme.colors.border }]} />

            {selectedTopic && (
              <>
                <View style={s.modalHeader}>
                  <View style={[s.modalIconWrap, { backgroundColor: selectedTopic.color + '14' }]}>
                    <selectedTopic.icon size={normalize(22)} color={selectedTopic.color} />
                  </View>
                  <View style={s.modalTitleArea}>
                    <Text style={[s.modalTitle, { color: theme.colors.text }]}>{selectedTopic.title}</Text>
                    <View style={[s.modalCategoryPill, { backgroundColor: selectedTopic.color + '15' }]}>
                      <Text style={[s.modalCategoryText, { color: selectedTopic.color }]}>{selectedTopic.category}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[s.modalCloseBtn, { backgroundColor: theme.colors.background }]}
                    onPress={() => setSelectedTopic(null)}
                  >
                    <X size={normalize(18)} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={s.modalScroll}
                  contentContainerStyle={s.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={[s.modalBody, { color: theme.colors.textSecondary }]}>
                    {selectedTopic.explanation}
                  </Text>
                </ScrollView>

                <View style={[s.modalFooter, { borderTopColor: theme.colors.border }]}>
                  <TouchableOpacity
                    style={[s.modalFooterBtn, { backgroundColor: theme.colors.background }]}
                    onPress={() => {
                      setSelectedTopic(null);
                      navigation.navigate('FAQ');
                    }}
                  >
                    <BookOpen size={normalize(16)} color={theme.colors.primary} />
                    <Text style={[s.modalFooterBtnText, { color: theme.colors.primary }]}>View All FAQs</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.modalFooterBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => setSelectedTopic(null)}
                  >
                    <Text style={[s.modalFooterBtnText, { color: '#FFF' }]}>Got It</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  backBtn: {
    width: normalize(38),
    height: normalize(38),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: normalize(18),
    fontWeight: '800',
    textAlign: 'center',
  },

  scrollContent: {
    padding: normalize(16),
    paddingBottom: normalize(40),
  },

  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: normalize(12),
    paddingHorizontal: normalize(14),
    gap: normalize(10),
    marginBottom: normalize(16),
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    paddingVertical: normalize(13),
  },

  quickActionsRow: {
    flexDirection: 'row',
    gap: normalize(10),
    marginBottom: normalize(20),
  },
  quickActionCard: {
    flex: 1,
    borderRadius: normalize(12),
    padding: normalize(14),
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickActionIcon: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: normalize(8),
  },
  quickActionLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: normalize(13),
    fontWeight: '700',
    marginBottom: normalize(2),
  },
  quickActionDesc: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    textAlign: 'center',
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
    marginBottom: normalize(12),
    marginTop: normalize(4),
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: normalize(16),
    fontWeight: '700',
  },

  card: {
    borderRadius: normalize(12),
    marginBottom: normalize(16),
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },

  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(13),
    gap: normalize(12),
  },
  topicIconWrap: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicInfo: { flex: 1 },
  topicTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    fontWeight: '600',
  },
  topicCategory: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    marginTop: normalize(1),
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: normalize(14) },
  emptyState: {
    alignItems: 'center',
    paddingVertical: normalize(28),
    gap: normalize(8),
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(13),
    gap: normalize(12),
  },
  contactIconWrap: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: { flex: 1 },
  contactLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    fontWeight: '600',
  },
  contactDesc: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    marginTop: normalize(1),
  },

  supportHoursCard: {
    borderRadius: normalize(12),
    padding: normalize(16),
    borderWidth: 1,
    marginTop: normalize(4),
    marginBottom: normalize(16),
  },
  supportHoursTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: normalize(15),
    fontWeight: '700',
    marginBottom: normalize(8),
  },
  supportHoursText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    lineHeight: normalize(22),
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: normalize(20),
    borderTopRightRadius: normalize(20),
    maxHeight: '80%',
  },
  modalHandle: {
    width: normalize(40),
    height: normalize(4),
    borderRadius: normalize(2),
    alignSelf: 'center',
    marginTop: normalize(12),
    marginBottom: normalize(8),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(18),
    paddingVertical: normalize(14),
    gap: normalize(12),
  },
  modalIconWrap: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleArea: {
    flex: 1,
    gap: normalize(4),
  },
  modalTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: normalize(16),
    fontWeight: '700',
    lineHeight: normalize(21),
  },
  modalCategoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(2),
    borderRadius: normalize(10),
  },
  modalCategoryText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingHorizontal: normalize(18),
    paddingBottom: normalize(14),
  },
  modalBody: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    lineHeight: normalize(23),
  },
  modalFooter: {
    flexDirection: 'row',
    gap: normalize(10),
    paddingHorizontal: normalize(18),
    paddingVertical: normalize(14),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(6),
    paddingVertical: normalize(13),
    borderRadius: normalize(12),
  },
  modalFooterBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: normalize(14),
    fontWeight: '700',
  },
});

export default HelpSupportScreen;
