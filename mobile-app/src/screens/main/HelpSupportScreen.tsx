import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  TextInput,
  Linking,
  Modal,
  Dimensions,
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
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, SHADOWS } from '@constants/theme';
import { normalize } from '@utils/responsive';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HelpSupportScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const quickActions = [
    {
      icon: BookOpen,
      label: t('helpSupport.faqs'),
      desc: t('helpSupport.findQuickAnswers'),
      color: '#2196F3',
      onPress: () => navigation.navigate('FAQ'),
    },
    {
      icon: Bug,
      label: t('helpSupport.reportBug'),
      desc: t('helpSupport.foundIssue'),
      color: '#F44336',
      onPress: () => navigation.navigate('ReportBug'),
    },
    {
      icon: MessageSquare,
      label: t('helpSupport.feedback'),
      desc: t('helpSupport.shareThoughts'),
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
      label: t('helpSupport.liveChat'),
      desc: t('helpSupport.chatWithSupport'),
      color: '#4CAF50',
      action: () => {},
    },
    {
      icon: Phone,
      label: t('helpSupport.callUs'),
      desc: t('helpSupport.tollFree'),
      color: '#2196F3',
      action: () => Linking.openURL('tel:+911800XXXXXXX'),
    },
    {
      icon: Mail,
      label: t('helpSupport.emailSupport'),
      desc: t('helpSupport.supportEmail'),
      color: '#FF9800',
      action: () => Linking.openURL('mailto:support@forlok.com'),
    },
  ];

  const filteredTopics = searchQuery.trim()
    ? popularTopics.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : popularTopics;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Hero Header ── */}
      <ImageBackground
        source={require('../../../assets/help.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={40} style={styles.blurContainer}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>{t('helpSupport.title')}</Text>
            <View style={{ width: 38 }} />
          </View>
        </BlurView>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Search Bar ── */}
        <View style={[styles.searchCard, { backgroundColor: theme.colors.surface }]}>
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('helpSupport.searchHelpTopics')}
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActionsRow}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickActionCard, { backgroundColor: theme.colors.surface }]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '12' }]}>
                <action.icon size={22} color={action.color} />
              </View>
              <Text style={[styles.quickActionLabel, { color: theme.colors.text }]}>{action.label}</Text>
              <Text style={[styles.quickActionDesc, { color: theme.colors.textSecondary }]}>{action.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Popular Topics ── */}
        <View style={styles.sectionTitleRow}>
          <HelpCircle size={18} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('helpSupport.popularTopics')}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, padding: 0 }]}>
          {filteredTopics.map((topic, index) => (
            <React.Fragment key={index}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />}
              <TouchableOpacity
                style={styles.topicRow}
                onPress={() => setSelectedTopic(topic)}
                activeOpacity={0.7}
              >
                <View style={[styles.topicIconWrap, { backgroundColor: topic.color + '12' }]}>
                  <topic.icon size={18} color={topic.color} />
                </View>
                <View style={styles.topicInfo}>
                  <Text style={[styles.topicTitle, { color: theme.colors.text }]}>{topic.title}</Text>
                  <Text style={[styles.topicCategory, { color: theme.colors.textSecondary }]}>{topic.category}</Text>
                </View>
                <ChevronRight size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </React.Fragment>
          ))}
          {filteredTopics.length === 0 && (
            <View style={styles.emptyState}>
              <Search size={24} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{t('helpSupport.noTopicsFound')}</Text>
            </View>
          )}
        </View>

        {/* ── Contact Support ── */}
        <View style={styles.sectionTitleRow}>
          <Headphones size={18} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('helpSupport.contactSupport')}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, padding: 0 }]}>
          {contactOptions.map((contact, index) => (
            <React.Fragment key={index}>
              {index > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />}
              <TouchableOpacity style={styles.contactRow} onPress={contact.action} activeOpacity={0.7}>
                <View style={[styles.contactIconWrap, { backgroundColor: contact.color + '12' }]}>
                  <contact.icon size={20} color={contact.color} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactLabel, { color: theme.colors.text }]}>{contact.label}</Text>
                  <Text style={[styles.contactDesc, { color: theme.colors.textSecondary }]}>{contact.desc}</Text>
                </View>
                <ExternalLink size={15} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* ── Support Hours ── */}
        <View style={[styles.supportHoursCard, { backgroundColor: theme.colors.primary + '08', borderColor: theme.colors.primary + '20' }]}>
          <Text style={[styles.supportHoursTitle, { color: theme.colors.text }]}>{t('helpSupport.supportHours')}</Text>
          <Text style={[styles.supportHoursText, { color: theme.colors.textSecondary }]}>
            Monday - Saturday: 9:00 AM - 9:00 PM IST{'\n'}
            Sunday: 10:00 AM - 6:00 PM IST{'\n'}
            Emergency SOS: Available 24/7
          </Text>
        </View>

      </ScrollView>

      {/* ── Topic Detail Modal ── */}
      <Modal
        visible={!!selectedTopic}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTopic(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
            {/* Handle bar */}
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />

            {/* Header */}
            {selectedTopic && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconWrap, { backgroundColor: selectedTopic.color + '12' }]}>
                    <selectedTopic.icon size={22} color={selectedTopic.color} />
                  </View>
                  <View style={styles.modalTitleArea}>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedTopic.title}</Text>
                    <View style={[styles.modalCategoryPill, { backgroundColor: selectedTopic.color + '15' }]}>
                      <Text style={[styles.modalCategoryText, { color: selectedTopic.color }]}>{selectedTopic.category}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.modalCloseBtn, { backgroundColor: theme.colors.background }]}
                    onPress={() => setSelectedTopic(null)}
                  >
                    <X size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={[styles.modalBody, { color: theme.colors.textSecondary }]}>
                    {selectedTopic.explanation}
                  </Text>
                </ScrollView>

                {/* Footer */}
                <View style={[styles.modalFooter, { borderTopColor: theme.colors.border }]}>
                  <TouchableOpacity
                    style={[styles.modalFooterBtn, { backgroundColor: theme.colors.background }]}
                    onPress={() => {
                      setSelectedTopic(null);
                      navigation.navigate('FAQ');
                    }}
                  >
                    <BookOpen size={16} color={theme.colors.primary} />
                    <Text style={[styles.modalFooterBtnText, { color: theme.colors.primary }]}>{t('helpSupport.viewAllFaqs')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalFooterBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => setSelectedTopic(null)}
                  >
                    <Text style={[styles.modalFooterBtnText, { color: '#FFF' }]}>{t('helpSupport.gotIt')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* ── Hero Header ── */
  headerImage: { width: '100%', height: 160 },
  headerOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.78 },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  headerNav: { flexDirection: 'row', alignItems: 'center' },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 22,
    color: '#FFF',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.4,
  },

  /* ── Scroll ── */
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },

  /* ── Search ── */
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    gap: 10,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    paddingVertical: 14,
  },

  /* ── Quick Actions ── */
  quickActionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  quickActionIcon: {
    width: normalize(46),
    height: normalize(46),
    borderRadius: normalize(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    fontWeight: '700',
    marginBottom: normalize(2),
  },
  quickActionDesc: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    textAlign: 'center',
  },

  /* ── Section Title ── */
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(17),
    fontWeight: '700',
  },

  /* ── Generic Card ── */
  card: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },

  /* ── Topics ── */
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    gap: 12,
  },
  topicIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicInfo: { flex: 1 },
  topicTitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '600',
  },
  topicCategory: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 1,
  },
  divider: { height: 1, marginHorizontal: SPACING.lg },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
  },

  /* ── Contact ── */
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    gap: 12,
  },
  contactIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: { flex: 1 },
  contactLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '600',
  },
  contactDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    marginTop: 1,
  },

  /* ── Support Hours ── */
  supportHoursCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  supportHoursTitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  supportHoursText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 22,
  },

  /* ── Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    ...SHADOWS.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: 12,
  },
  modalIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleArea: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  modalCategoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modalCategoryText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  modalBody: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    lineHeight: normalize(23),
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
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
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    fontWeight: '700',
  },
});

export default HelpSupportScreen;
