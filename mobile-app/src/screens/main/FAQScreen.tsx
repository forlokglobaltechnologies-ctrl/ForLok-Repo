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
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Bike,
  MapPin,
  CreditCard,
  Shield,
  Star,
  FileText,
  UserCheck,
  HelpCircle,
  Wallet,
  Clock,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, SHADOWS } from '@constants/theme';
import { normalize, wp, hp } from '@utils/responsive';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { useContentPage } from '../../hooks/useContentPage';
import { resolveContentIcon } from '@utils/contentIcons';
import { CONTENT_DEFAULTS } from '@constants/contentDefaults';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  icon: any;
  title: string;
  color: string;
  items: FAQItem[];
}

const FAQScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const { data: contentData } = useContentPage<any>('faq', CONTENT_DEFAULTS.faq as any);

  const defaultCategories: FAQCategory[] = [
    {
      icon: UserCheck,
      title: 'Account & Registration',
      color: '#4CAF50',
      items: [
        {
          question: 'How do I create an account on eZway?',
          answer: 'Download the eZway app from Google Play Store or Apple App Store. Tap "Sign Up", enter your mobile number, verify with OTP, and complete your profile with name, email, and a profile photo. You can register as an Individual or a Company.',
        },
        {
          question: 'What documents do I need for verification?',
          answer: 'For passengers: A valid government ID (Aadhaar, PAN, or Voter ID).\n\nFor drivers: Driving License, Vehicle Registration Certificate (RC), Vehicle Insurance, and a government ID. All documents are verified within 24-48 hours.',
        },
        {
          question: 'How long does document verification take?',
          answer: 'Document verification typically takes 24-48 hours. You will receive a notification once your documents are approved. If rejected, you\'ll be informed of the reason and can re-upload corrected documents.',
        },
        {
          question: 'Can I change my registered phone number?',
          answer: 'Yes, go to Settings > Account > Change Phone Number. You will need to verify the new number with an OTP. Note that your booking history and wallet balance will remain linked to your account.',
        },
        {
          question: 'How do I delete my account?',
          answer: 'Go to Settings > Account > Delete Account. Please note that this action is irreversible. Your data will be retained for 90 days as per our privacy policy before permanent deletion.',
        },
      ],
    },
    {
      icon: Bike,
      title: 'Ride-Sharing Services',
      color: '#F99E3C',
      items: [
        {
          question: 'What is eZway Ride-Sharing?',
          answer: 'eZway Ride-Sharing connects drivers with passengers heading in the same direction. Drivers offer available seats on their regular routes, and passengers can book seats at affordable prices. It\'s cost-effective, eco-friendly, and a great way to commute.',
        },
        {
          question: 'How do I create a ride-sharing offer as a driver?',
          answer: 'Go to "Offer Services" > "Create Ride-Sharing Offer". Enter your from/to locations, date, time, available seats, and price per seat. Review the details and publish your offer. Passengers can then search and book seats on your route.',
        },
        {
          question: 'How do I book a ride-sharing trip as a passenger?',
          answer: 'Go to "Take Services" > "Take Ride". Enter your pickup and drop locations, select your travel date, and browse available offers. Choose a ride that matches your route, review driver details and ratings, then confirm your booking.',
        },
        {
          question: 'Can I set stopping points along my route?',
          answer: 'Yes, when creating a ride-sharing offer, you can add multiple stopping locations along your route. This helps passengers find rides that match their specific pickup/drop points and makes route planning more flexible.',
        },
        {
          question: 'What happens if the driver cancels my ride?',
          answer: 'If a driver cancels your confirmed booking, the trip is cancelled in-app and you are notified immediately so you can find an alternative ride.',
        },
        {
          question: 'How is the ride-sharing fare calculated?',
          answer: 'The fare is calculated using route distance, timing, and ride parameters. You see the final fare in the trip summary before confirming your booking.',
        },
      ],
    },
    {
      icon: MapPin,
      title: 'Rental Services',
      color: '#9C27B0',
      items: [
        {
          question: 'How does vehicle rental work on eZway?',
          answer: 'Vehicle owners list their vehicles for rent with pricing, availability, and pickup location. Renters browse available vehicles, select dates, and book. After verification and confirmation, the vehicle is handed over at the agreed location.',
        },
        {
          question: 'What types of vehicles are available for rent?',
          answer: 'eZway focuses on two-wheelers: bikes and scooters (scooties). Availability varies by location. Each listing includes vehicle details, photos, ratings, and pricing.',
        },
        {
          question: 'Is insurance included with rental vehicles?',
          answer: 'Basic insurance coverage is included through the vehicle owner\'s existing policy. However, you are responsible for any damages beyond normal wear and tear. We recommend purchasing additional rental protection when booking for extended coverage.',
        },
        {
          question: 'What is the cancellation policy for rentals?',
          answer: 'Free cancellation up to 24 hours before the rental period starts. Cancellation within 24 hours incurs a fee of up to 25% of the total rental amount. No-shows are charged the full amount. Refunds are processed within 5-7 business days.',
        },
      ],
    },
    {
      icon: CreditCard,
      title: 'Wallet & Coins',
      color: '#FF9800',
      items: [
        {
          question: 'How does manual settlement work in eZway?',
          answer: 'For ride-sharing trips, settlement is done manually between passenger and driver after trip completion. The app handles booking, fare visibility, trip tracking, and completion confirmation.',
        },
        {
          question: 'How does eZway Wallet work?',
          answer: 'eZway Wallet is used to track app-side credits and coin-related adjustments. It remains available alongside the Coins system.',
        },
        {
          question: 'How do I get a refund?',
          answer: 'If a cancellation policy applies to your booking, the app shows the cancellation impact directly in the booking flow and history.',
        },
        {
          question: 'How do drivers receive their earnings?',
          answer: 'For manual settlement rides, drivers collect fare directly from passengers. If coins reduced passenger payable fare, eligible compensation is handled through the app wallet logic.',
        },
        {
          question: 'What are eZway Coins?',
          answer: 'eZway Coins are reward points you earn by completing rides, referring friends, and maintaining good ratings. You can redeem coins for ride discounts, wallet credits, and exclusive offers. Check the eZway Coins section for current promotions.',
        },
      ],
    },
    {
      icon: Shield,
      title: 'Safety & Security',
      color: '#F44336',
      items: [
        {
          question: 'How does eZway ensure ride safety?',
          answer: 'eZway implements multiple safety features: all users are verified with government IDs, real-time GPS tracking during rides, in-app SOS emergency button, ride sharing with trusted contacts, driver rating system, and 24/7 safety support line.',
        },
        {
          question: 'What is the SOS feature?',
          answer: 'The SOS button is available on every active ride screen. When pressed, it immediately alerts our safety team, shares your live location with your emergency contacts, and optionally connects you to local emergency services (112). It\'s available 24/7.',
        },
        {
          question: 'How are drivers verified?',
          answer: 'All drivers go through a multi-step verification: identity verification via Aadhaar/PAN, driving license validation, vehicle registration check, insurance verification, and a background check. Only verified drivers can offer rides on the platform.',
        },
        {
          question: 'Is my personal information safe?',
          answer: 'Yes. eZway uses industry-standard encryption (AES-256, TLS 1.3) to protect your data. We never share your personal information with other users beyond what\'s necessary for ride coordination. Read our Privacy Policy for complete details.',
        },
      ],
    },
    {
      icon: Star,
      title: 'Ratings & Reviews',
      color: '#FF9800',
      items: [
        {
          question: 'How does the rating system work?',
          answer: 'After each ride, both drivers and passengers can rate each other on a 1-5 star scale. You can also leave a written review. Ratings are visible on user profiles and help maintain community trust. Consistently low-rated users may face restrictions.',
        },
        {
          question: 'Can I dispute an unfair rating?',
          answer: 'Yes, if you believe you received an unfair rating, contact our support team within 7 days. Provide details about the ride and your concern. Our team will review the case and may adjust the rating if it violates our community guidelines.',
        },
      ],
    },
    {
      icon: Clock,
      title: 'Trip Management',
      color: '#607D8B',
      items: [
        {
          question: 'How do I track my ride in real-time?',
          answer: 'Once a ride starts, the Trip Tracking screen shows a live map with the driver\'s current location, estimated time of arrival (ETA), distance remaining, and route details. Passengers can share this tracking link with family members for safety.',
        },
        {
          question: 'What happens if the driver takes a different route?',
          answer: 'eZway\'s system monitors route deviations. If a significant deviation is detected, both the driver and passenger are notified. Drivers are encouraged to follow the optimal route. You can contact support if you feel the deviation was unjustified.',
        },
        {
          question: 'How do I view my ride history?',
          answer: 'Go to the History tab in the app. You can view all past ride-sharing trips and rental bookings, filter by date and status, and see ride details including route and completion info.',
        },
      ],
    },
  ];
  void defaultCategories;

  const toggleCategory = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory(expandedCategory === index ? null : index);
    setExpandedQuestion(null);
  };

  const toggleQuestion = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedQuestion(expandedQuestion === key ? null : key);
  };

  // Filter categories and questions based on search
  const categories = (contentData.categories as FAQCategory[]).map((cat: any) => ({
    ...cat,
    icon: typeof cat.icon === 'string' ? resolveContentIcon(cat.icon, HelpCircle) : cat.icon,
  }));

  const filteredCategories = searchQuery.trim()
    ? categories
        .map(cat => ({
          ...cat,
          items: cat.items.filter(
            item =>
              item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.answer.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter(cat => cat.items.length > 0)
    : categories;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Hero Header ── */}
      <ImageBackground
        source={require('../../../assets/faq.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={40} style={styles.blurContainer}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>FAQs</Text>
            <View style={{ width: normalize(38) }} />
          </View>
        </BlurView>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Search ── */}
        <View style={[styles.searchCard, { backgroundColor: theme.colors.surface }]}>
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search FAQs..."
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: theme.colors.primary + '10' }]}>
            <Text style={[styles.statText, { color: theme.colors.primary }]}>
              {categories.length} Categories
            </Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: '#4CAF50' + '10' }]}>
            <Text style={[styles.statText, { color: '#4CAF50' }]}>
              {categories.reduce((sum, c) => sum + c.items.length, 0)} Questions
            </Text>
          </View>
        </View>

        {/* ── FAQ Categories ── */}
        {filteredCategories.map((category, catIndex) => {
          const isExpanded = expandedCategory === catIndex || searchQuery.trim().length > 0;
          const Icon = resolveContentIcon((category as any).icon, HelpCircle);
          return (
            <View key={catIndex} style={[styles.categoryCard, { backgroundColor: theme.colors.surface }]}>
              {/* Category Header */}
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(catIndex)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIconWrap, { backgroundColor: category.color + '12' }]}>
                  <Icon size={20} color={category.color} />
                </View>
                <View style={styles.categoryTitleArea}>
                  <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>{category.title}</Text>
                  <Text style={[styles.categoryCount, { color: theme.colors.textSecondary }]}>
                    {category.items.length} questions
                  </Text>
                </View>
                {isExpanded ? (
                  <ChevronUp size={20} color={theme.colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={theme.colors.textSecondary} />
                )}
              </TouchableOpacity>

              {/* Questions */}
              {isExpanded && (
                <View style={styles.questionsContainer}>
                  {category.items.map((item, qIndex) => {
                    const questionKey = `${catIndex}-${qIndex}`;
                    const isOpen = expandedQuestion === questionKey;
                    return (
                      <View key={qIndex}>
                        <View style={[styles.questionDivider, { backgroundColor: theme.colors.border }]} />
                        <TouchableOpacity
                          style={styles.questionRow}
                          onPress={() => toggleQuestion(questionKey)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.questionDot, { backgroundColor: category.color }]} />
                          <Text style={[styles.questionText, { color: theme.colors.text }]}>
                            {item.question}
                          </Text>
                          {isOpen ? (
                            <ChevronUp size={16} color={theme.colors.textSecondary} />
                          ) : (
                            <ChevronDown size={16} color={theme.colors.textSecondary} />
                          )}
                        </TouchableOpacity>
                        {isOpen && (
                          <View style={[styles.answerContainer, { backgroundColor: theme.colors.background }]}>
                            <Text style={[styles.answerText, { color: theme.colors.textSecondary }]}>
                              {item.answer}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {filteredCategories.length === 0 && (
          <View style={styles.emptyState}>
            <HelpCircle size={40} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No results found</Text>
            <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
              Try different keywords or browse all categories
            </Text>
          </View>
        )}

        {/* ── Still Need Help ── */}
        <View style={[styles.helpCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.helpTitle, { color: theme.colors.text }]}>Still need help?</Text>
          <Text style={[styles.helpDesc, { color: theme.colors.textSecondary }]}>
            Can't find what you're looking for? Our support team is happy to help.
          </Text>
          <TouchableOpacity
            style={[styles.helpButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <Text style={styles.helpButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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

  /* ── Stats ── */
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: '700',
  },

  /* ── Category Card ── */
  categoryCard: {
    borderRadius: 16,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: 12,
  },
  categoryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitleArea: { flex: 1 },
  categoryTitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    fontWeight: '700',
  },
  categoryCount: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 1,
  },

  /* ── Questions ── */
  questionsContainer: {},
  questionDivider: { height: 1, marginHorizontal: SPACING.md },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    gap: 10,
  },
  questionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  questionText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  answerContainer: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 12,
  },
  answerText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 21,
  },

  /* ── Empty ── */
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontFamily: FONTS.regular,
    fontSize: 17,
    fontWeight: '700',
  },
  emptyDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    textAlign: 'center',
  },

  /* ── Help Card ── */
  helpCard: {
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  helpTitle: {
    fontFamily: FONTS.regular,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  helpDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  helpButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 25,
  },
  helpButtonText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default FAQScreen;
