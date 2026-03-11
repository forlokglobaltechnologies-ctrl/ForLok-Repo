import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  SafeAreaView,
  Image,
  StatusBar,
  Platform,
  Modal,
  Dimensions,
  TextInput,
  Keyboard,
  ActivityIndicator,
  Share,
  Animated,
} from 'react-native';
import { normalize, wp, hp, SCREEN_WIDTH } from '@utils/responsive';
import { useNavigation, useIsFocused, useNavigationState } from '@react-navigation/native';
import {
  Bell, User, Clock, TrendingUp, IndianRupee, Heart, Coins, LogOut,
  Search, CarFront, CreditCard, PartyPopper, Wallet, X, MapPin, Home as HomeIcon,
  Briefcase, Leaf, Star, ChevronRight, Users, Gift, Car, UtensilsCrossed,
  Navigation, Share2, Shield, Menu, History, HelpCircle, MessageSquare, FileText,
  Settings, Info, Award,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { dashboardApi, placesApi } from '@utils/apiClient';
import { useNotifications } from '@context/NotificationContext';
import { useAuth } from '@context/AuthContext';
import { useSOS } from '@context/SOSContext';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_W = Dimensions.get('window').width;
const STEP_CARD_W = SCREEN_W;
const QUICK_ACTION_ACCENT = '#8D1F1F';

const bookingSteps = [
  { id: '1', step: 'Step 1', title: 'Search your\nroute', cta: 'Get started →', icon: Search },
  { id: '2', step: 'Step 2', title: 'Pick a pooling\nride', cta: 'Browse rides →', icon: CarFront },
  { id: '3', step: 'Step 3', title: 'Confirm &\npay securely', cta: 'Quick pay →', icon: CreditCard },
  { id: '4', step: 'Step 4', title: 'Enjoy your\njourney', cta: "Let's go →", icon: PartyPopper },
];

const coinsCarouselData = [
  {
    id: 'welcome',
    tag: 'Welcome Bonus',
    title: 'Get 50 coins free\non sign up!',
    cta: 'Claim Now',
    bg: '#1A1A2E',
    accent: '#F5C25B',
    icon: Gift,
    deco1: '#F5C25B',
    deco2: '#6C63FF',
  },
  {
    id: 'refer',
    tag: 'Refer & Earn',
    title: 'Invite friends &\nearn 100 coins each',
    cta: 'Refer Now',
    bg: '#0F2027',
    accent: '#00B894',
    icon: Users,
    deco1: '#00B894',
    deco2: '#38EF7D',
  },
  {
    id: 'social',
    tag: 'Social Reward',
    title: 'Share on social\nmedia & earn coins',
    cta: 'Share Now',
    bg: '#1A0033',
    accent: '#8B5CF6',
    icon: Share2,
    deco1: '#8B5CF6',
    deco2: '#C084FC',
  },
  {
    id: 'pool',
    tag: 'Pool & Earn',
    title: 'Complete pools to\nearn bonus coins',
    cta: 'Start Pooling',
    bg: '#002B36',
    accent: '#F99E3C',
    icon: Car,
    deco1: '#F99E3C',
    deco2: '#63B3ED',
  },
  {
    id: 'redeem',
    tag: 'Redeem Coins',
    title: 'Use coins to get\ndiscounts on rides',
    cta: 'Redeem Now',
    bg: '#1C1917',
    accent: '#F59E0B',
    icon: Coins,
    deco1: '#F59E0B',
    deco2: '#FBBF24',
  },
];

const quickActions = [
  { id: 'pool', label: 'Pool Ride', icon: Search, screen: 'SearchPooling' },
  { id: 'offer-ride', label: 'Offer Ride', icon: Car, screen: 'CreatePoolingOffer' },
  { id: 'my-rides', label: 'My Rides', icon: History, screen: 'History' },
  { id: 'offers', label: 'My Offers', icon: Award, screen: 'MyOffers' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, screen: 'ChatList' },
  { id: 'history', label: 'History', icon: History, screen: 'History' },
  { id: 'reviews', label: 'Reviews', icon: Star, screen: 'Reviews' },
  { id: 'help', label: 'Help', icon: HelpCircle, screen: 'HelpSupport' },
  { id: 'faq', label: 'FAQ', icon: Info, screen: 'FAQ' },
  { id: 'feedback', label: 'Feedback', icon: FileText, screen: 'Feedback' },
  { id: 'report-bug', label: 'Report Bug', icon: Shield, screen: 'ReportBug' },
  { id: 'settings', label: 'Settings', icon: Settings, screen: 'Settings' },
];

const MainDashboardScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const currentRouteName = useNavigationState((state) => state.routes[state.index]?.name);
  const { t } = useLanguage();
  const { theme, isPinkMode, setPinkMode } = useTheme();
  const { user: authUser, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { handleLogoTap } = useSOS();

  const [homeData, setHomeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const quickActionScaleMapRef = useRef<Record<string, Animated.Value>>({});

  // Sidebar animation
  const sidebarAnim = useRef(new Animated.Value(-SCREEN_W * 0.78)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Typewriter greeting
  const [greetingDisplayed, setGreetingDisplayed] = useState('');
  const greetingAnimDone = useRef(false);

  // Coins carousel
  const [coinsIdx, setCoinsIdx] = useState(0);
  const coinsScrollRef = useRef<ScrollView>(null);

  // Search state
  const [whereToQuery, setWhereToQuery] = useState('');
  const [whereToResults, setWhereToResults] = useState<Array<{ address: string; lat: number; lng: number; city?: string; state?: string }>>([]);
  const [whereToSearching, setWhereToSearching] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Carousel
  const [stepsActiveIndex, setStepsActiveIndex] = useState(0);
  const stepsScrollRef = useRef<ScrollView>(null);

  // Location
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();

  const getQuickActionScale = useCallback((id: string) => {
    if (!quickActionScaleMapRef.current[id]) {
      quickActionScaleMapRef.current[id] = new Animated.Value(1);
    }
    return quickActionScaleMapRef.current[id];
  }, []);

  const animateQuickAction = useCallback((id: string, toValue: number) => {
    const scale = getQuickActionScale(id);
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }, [getQuickActionScale]);

  useEffect(() => {
    if (authUser?.gender) setUserGender(authUser.gender);
    getUserLocation();
  }, [authUser]);

  useEffect(() => {
    loadHomeData();
  }, [userLat, userLng]);

  // Refresh when screen comes back into focus (e.g. returning from trip)
  useEffect(() => {
    if (isFocused) loadHomeData();
  }, [isFocused]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLat(loc.coords.latitude);
        setUserLng(loc.coords.longitude);
      }
    } catch (_) {}
  };

  const loadHomeData = async () => {
    try {
      setLoading(true);
      let resp = await dashboardApi.getHomeData(userLat, userLng);

      // Retry once for transient network abort/timeout so home widgets don't appear partially.
      if (!resp.success && (resp.error || '').toLowerCase().includes('timed out')) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        resp = await dashboardApi.getHomeData(userLat, userLng);
      }

      if (resp.success && resp.data) {
        setHomeData(resp.data);
        setUserGender(resp.data.user?.gender || null);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced geocoding search
  useEffect(() => {
    const trimmed = whereToQuery.trim();
    if (trimmed.length < 2) { setWhereToResults([]); return; }
    const timer = setTimeout(() => searchWhereToLocations(trimmed), 400);
    return () => clearTimeout(timer);
  }, [whereToQuery]);

  const searchWhereToLocations = async (query: string) => {
    if (searchAbortRef.current) searchAbortRef.current.abort();
    searchAbortRef.current = new AbortController();
    setWhereToSearching(true);
    try {
      const encoded = encodeURIComponent(query);
      const resp = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encoded}&count=6&language=en&format=json`,
        { signal: searchAbortRef.current.signal },
      );
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      setWhereToResults((data.results || []).map((item: any) => {
        const parts = [item.name, item.admin3, item.admin2, item.admin1, item.country].filter(Boolean);
        return { address: parts.join(', '), lat: item.latitude, lng: item.longitude, city: item.name || item.admin3 || item.admin2, state: item.admin1 };
      }));
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      try {
        const fallback = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in&addressdetails=1`,
          { headers: { 'User-Agent': 'Forlok-App/1.0' } },
        );
        if (fallback.ok) {
          const fData = await fallback.json();
          setWhereToResults(fData.map((item: any) => ({
            address: item.display_name, lat: parseFloat(item.lat), lng: parseFloat(item.lon),
            city: item.address?.city || item.address?.town || item.address?.village, state: item.address?.state,
          })));
          return;
        }
      } catch (_) {}
      setWhereToResults([]);
    } finally { setWhereToSearching(false); }
  };

  const handleWhereToPress = () => {
    setWhereToQuery('');
    setWhereToResults([]);
    Keyboard.dismiss();
    navigation.navigate('SearchPooling' as never);
  };

  const handleWhereToSelect = (location: { address: string; lat: number; lng: number; city?: string; state?: string }) => {
    setWhereToQuery('');
    setWhereToResults([]);
    Keyboard.dismiss();
    (navigation.navigate as any)('LocationPicker', {
      title: 'Select destination',
      initialLocation: { address: location.address, lat: location.lat, lng: location.lng },
      onLocationSelect: (loc: { address: string; lat: number; lng: number }) => {
        (navigation.navigate as any)('SearchPooling', { to: loc });
      },
    });
  };

  const handleSavePlace = (label: 'home' | 'work') => {
    (navigation.navigate as any)('LocationPicker', {
      title: label === 'home' ? 'Set Home Location' : 'Set Work Location',
      onLocationSelect: async (location: { address: string; lat: number; lng: number; city?: string; state?: string }) => {
        try {
          await placesApi.save({
            label,
            address: location.address,
            lat: location.lat,
            lng: location.lng,
            city: (location as any).city,
            state: (location as any).state,
          });
          loadHomeData();
        } catch (err) {
          console.error('Error saving place:', err);
        }
      },
    });
  };

  const handleShareReferral = async () => {
    const code = homeData?.referral?.code;
    if (!code) return;
    try {
      await Share.share({
        message: `Join ForLok and get free coins! Use my referral code: ${code}\nDownload now: https://forlok.com/download`,
      });
    } catch (_) {}
  };

  const handleCoinsCardAction = (cardId: string) => {
    switch (cardId) {
      case 'welcome':
        navigation.navigate('EarnCoins' as never);
        break;
      case 'refer':
        handleShareReferral();
        break;
      case 'social':
        navigation.navigate('EarnCoins' as never);
        break;
      case 'pool':
        navigation.navigate('SearchPooling' as never);
        break;
      case 'redeem':
        (navigation.navigate as any)('Wallet', { tab: 'coins' });
        break;
      default:
        navigation.navigate('EarnCoins' as never);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Typewriter animation for greeting
  const fullGreeting = `${getGreeting()}, ${authUser?.name || homeData?.user?.name || 'there'}`;
  useEffect(() => {
    if (greetingAnimDone.current) { setGreetingDisplayed(fullGreeting); return; }
    if (!authUser?.name && !homeData?.user?.name) return;
    let i = 0;
    setGreetingDisplayed('');
    const timer = setInterval(() => {
      i++;
      setGreetingDisplayed(fullGreeting.slice(0, i));
      if (i >= fullGreeting.length) { clearInterval(timer); greetingAnimDone.current = true; }
    }, 45);
    return () => clearInterval(timer);
  }, [authUser?.name, homeData?.user?.name]);

  // Sidebar open/close
  const openSidebar = () => {
    handleLogoTap();
    setShowSidebar(true);
    Animated.parallel([
      Animated.timing(sidebarAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  };
  const closeSidebar = () => {
    Animated.parallel([
      Animated.timing(sidebarAnim, { toValue: -SCREEN_W * 0.78, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setShowSidebar(false));
  };

  const sidebarMenuItems = [
    { icon: HomeIcon, label: 'Home', screen: 'MainDashboard' },
    { icon: Search, label: 'Find a Ride', screen: 'SearchPooling' },
    { icon: Car, label: 'Offer a Ride', screen: 'CreatePoolingOffer' },
    { icon: CarFront, label: 'Rentals', screen: 'SearchRental' },
    { icon: History, label: 'My Rides', screen: 'History' },
    { icon: Wallet, label: 'Wallet', screen: 'Wallet' },
    { icon: Coins, label: 'Earn Coins', screen: 'EarnCoins' },
    { icon: Award, label: 'My Offers', screen: 'MyOffers' },
    { icon: MessageSquare, label: 'Messages', screen: 'ChatList' },
    { icon: Star, label: 'Reviews', screen: 'Reviews' },
    { icon: HelpCircle, label: 'Help & Support', screen: 'HelpSupport' },
    { icon: Info, label: 'About', screen: 'About' },
    { icon: Settings, label: 'Settings', screen: 'Settings' },
  ];

  const savedPlaces = homeData?.savedPlaces || [];
  const homeSaved = savedPlaces.find((p: any) => p.label === 'home');
  const workSaved = savedPlaces.find((p: any) => p.label === 'work');
  const nearbyRides = homeData?.nearbyRides || [];
  const activeRide = homeData?.activeRide;
  const greenImpact = homeData?.greenImpact;
  const referral = homeData?.referral;
  const coins = homeData?.coins;
  const showSteps = (homeData?.greenImpact?.totalRidesShared || 0) < 5;

  return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar hidden={showSidebar} />
        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.menuButton} onPress={openSidebar} activeOpacity={0.7}>
            <Menu size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Notifications' as never)}>
              <Bell size={22} color={theme.colors.text} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowWalletModal(true)}>
              <Wallet size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={styles.profileIconContainer}>
              <TouchableOpacity style={styles.iconButton} onPress={(e) => { e.stopPropagation(); setShowProfileDropdown(!showProfileDropdown); }}>
                <User size={22} color={theme.colors.text} />
              </TouchableOpacity>
              {showProfileDropdown && (
                <TouchableWithoutFeedback onPress={() => setShowProfileDropdown(false)}>
                  <View style={[styles.dropdown, { backgroundColor: theme.colors.surface }]}>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileDropdown(false); navigation.navigate('Profile' as never); }}>
                      <User size={18} color={theme.colors.text} />++
                      <Text style={[styles.dropdownText, { color: theme.colors.text }]}>View Profile</Text>
                    </TouchableOpacity>
                    {(userGender === 'Female' || isPinkMode) && (
                      <>
                        <View style={[styles.dropdownDivider, { backgroundColor: theme.colors.border }]} />
                        <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileDropdown(false); isPinkMode ? setPinkMode(false) : navigation.navigate('PinkPoolingSplash' as never); }}>
                          <Heart size={18} color={isPinkMode ? theme.colors.primary : theme.colors.text} />
                          <Text style={[styles.dropdownText, { color: theme.colors.text }]}>{isPinkMode ? 'Exit HerPooling' : 'Enter HerPooling'}</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    <View style={[styles.dropdownDivider, { backgroundColor: theme.colors.border }]} />
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileDropdown(false); logout(); }}>
                      <LogOut size={18} color="#E53E3E" />
                      <Text style={[styles.dropdownText, { color: '#E53E3E' }]}>Logout</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              )}
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => { setShowProfileDropdown(false); Keyboard.dismiss(); }}
        >
          {/* ── Greeting ── */}
          <Text style={[styles.greeting, { color: theme.colors.text }]}>
            {greetingDisplayed}<Text style={styles.greetingCursor}>{!greetingAnimDone.current && greetingDisplayed.length > 0 ? '|' : ''}</Text>
          </Text>
          <Text style={[styles.greetingSub, { color: theme.colors.textSecondary }]}>Where are you heading today?</Text>

          {/* ── Where to? Search Card ── */}
          <View style={styles.whereToContainer}>
            <View style={[styles.whereToCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.whereToRow}>
                <TouchableOpacity
                  style={styles.whereToSearchTap}
                  onPress={handleWhereToPress}
                  activeOpacity={0.8}
                >
                  <View style={styles.whereToSearchDot} />
                  <Text style={[styles.whereToInputPlaceholder, { color: theme.colors.text }]}>Where to?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.whereToQuickAction, { borderColor: theme.colors.border }]}
                  onPress={handleWhereToPress}
                  activeOpacity={0.8}
                >
                  <Search size={14} color={theme.colors.primary} />
                  <Text style={[styles.whereToQuickActionText, { color: theme.colors.primary }]}>Take ride</Text>
                  <ChevronRight size={14} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>

              {/* ── Saved Places Row inside Card ── */}
              <View style={[styles.savedDivider, { backgroundColor: theme.colors.border }]} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedPlacesScroll}>
                <TouchableOpacity
                  style={[styles.savedChip, { borderColor: theme.colors.border }]}
                  onPress={() => { if (homeSaved) handleWhereToSelect(homeSaved); else handleSavePlace('home'); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.savedChipIcon, { backgroundColor: homeSaved ? '#E8F5E9' : theme.colors.background }]}>
                    <HomeIcon size={14} color={homeSaved ? '#2E7D32' : theme.colors.textSecondary} />
                  </View>
                  <Text style={[styles.savedChipText, { color: theme.colors.text }]} numberOfLines={1}>{homeSaved ? 'Home' : 'Set Home'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.savedChip, { borderColor: theme.colors.border }]}
                  onPress={() => { if (workSaved) handleWhereToSelect(workSaved); else handleSavePlace('work'); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.savedChipIcon, { backgroundColor: workSaved ? '#FFF4E6' : theme.colors.background }]}>
                    <Briefcase size={14} color={workSaved ? '#B85E00' : theme.colors.textSecondary} />
                  </View>
                  <Text style={[styles.savedChipText, { color: theme.colors.text }]} numberOfLines={1}>{workSaved ? 'Work' : 'Set Work'}</Text>
                </TouchableOpacity>
                {savedPlaces.filter((p: any) => p.label === 'custom').slice(0, 3).map((p: any, i: number) => (
                  <TouchableOpacity key={i} style={[styles.savedChip, { borderColor: theme.colors.border }]} onPress={() => handleWhereToSelect(p)} activeOpacity={0.7}>
                    <View style={[styles.savedChipIcon, { backgroundColor: theme.colors.background }]}>
                      <MapPin size={14} color={theme.colors.textSecondary} />
                    </View>
                    <Text style={[styles.savedChipText, { color: theme.colors.text }]} numberOfLines={1}>{p.customLabel || p.city || 'Saved'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

          </View>

          {/* ── Coins Rewards Carousel ── */}
          <View style={styles.coinsCarouselWrap}>
            <ScrollView
              ref={coinsScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_W - SPACING.md * 2));
                setCoinsIdx(idx);
              }}
              decelerationRate="fast"
              snapToInterval={SCREEN_W - SPACING.md * 2}
              contentContainerStyle={{ gap: 0 }}
            >
              {coinsCarouselData.map((card) => {
                const Icon = card.icon;
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[styles.coinsCard, { backgroundColor: card.bg, width: SCREEN_W - SPACING.md * 2 }]}
                    activeOpacity={0.9}
                    onPress={() => handleCoinsCardAction(card.id)}
                  >
                    <View style={styles.coinsCardContent}>
                      <View style={styles.coinsCardLeft}>
                        <View style={[styles.coinsTag, { backgroundColor: card.accent + '25' }]}>
                          <Text style={[styles.coinsTagText, { color: card.accent }]}>{card.tag}</Text>
                        </View>
                        <Text style={styles.coinsCardTitle}>{card.title}</Text>
                        <TouchableOpacity
                          style={[styles.coinsCta, { backgroundColor: card.accent }]}
                          activeOpacity={0.8}
                          onPress={() => handleCoinsCardAction(card.id)}
                        >
                          <Text style={styles.coinsCtaText}>{card.cta}</Text>
                          <ChevronRight size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.coinsCardRight}>
                        <View style={[styles.coinsDecoOuter, { borderColor: card.deco1 + '20' }]}>
                          <View style={[styles.coinsDecoMiddle, { borderColor: card.deco1 + '35' }]}>
                            <View style={[styles.coinsDecoInner, { backgroundColor: card.deco1 + '18' }]}>
                              <Icon size={32} color={card.accent} />
                            </View>
                          </View>
                        </View>
                        <View style={[styles.coinsMiniFloat1, { backgroundColor: card.deco2 + '30' }]} />
                        <View style={[styles.coinsMiniFloat2, { backgroundColor: card.accent + '20' }]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.coinsDots}>
              {coinsCarouselData.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    coinsScrollRef.current?.scrollTo({ x: i * (SCREEN_W - SPACING.md * 2), animated: true });
                    setCoinsIdx(i);
                  }}
                >
                  <View style={[styles.coinsDot, coinsIdx === i && styles.coinsDotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Quick Actions Grid ── */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.quickActionsHeading}>Quick actions</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action) => {
                const Icon = action.icon;
                const scale = getQuickActionScale(action.id);
                return (
                  <Animated.View key={action.id} style={{ transform: [{ scale }] }}>
                    <TouchableOpacity
                      style={[
                        styles.quickActionItem,
                        styles.quickActionItemPlain,
                      ]}
                      activeOpacity={0.85}
                      onPressIn={() => animateQuickAction(action.id, 0.96)}
                      onPressOut={() => animateQuickAction(action.id, 1)}
                      onPress={() => navigation.navigate(action.screen as never)}
                    >
                      <View style={styles.quickActionIcon}>
                        <Icon size={19} color={QUICK_ACTION_ACCENT} />
                      </View>
                      <Text style={styles.quickActionLabel} numberOfLines={2}>{action.label}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </View>

          {/* ── Active Ride Card ── */}
          {activeRide && (
            <TouchableOpacity
              style={styles.activeRideCard}
              activeOpacity={0.85}
              onPress={() => {
                if (activeRide.status === 'in_progress') {
                  if (activeRide.isDriver) {
                    (navigation.navigate as any)('DriverTrip', { bookingId: activeRide.bookingId });
                  } else {
                    (navigation.navigate as any)('TripTracking', { bookingId: activeRide.bookingId });
                  }
                } else {
                  (navigation.navigate as any)('BookingConfirmation', { bookingId: activeRide.bookingId });
                }
              }}
            >
              {activeRide.status === 'in_progress' ? (
                <View style={[styles.activeRideFill, { backgroundColor: '#2E7D32' }]}>
                  <View style={styles.activeRideLeft}>
                    <View style={styles.activeRideBadge}>
                      <Navigation size={14} color="#FFF" />
                    </View>
                    <View style={styles.activeRideInfo}>
                      <Text style={styles.activeRideLabel}>LIVE TRIP</Text>
                      <Text style={styles.activeRideDest} numberOfLines={1}>
                        To {activeRide.route?.to?.city || activeRide.route?.to?.address?.split(',')[0] || 'Destination'}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#FFF" />
                </View>
              ) : (
                <LinearGradient
                  colors={['#F99E3C', '#E08E35']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.activeRideFill}
                >
                  <View style={styles.activeRideLeft}>
                    <View style={styles.activeRideBadge}>
                      <Navigation size={14} color="#FFF" />
                    </View>
                    <View style={styles.activeRideInfo}>
                      <Text style={styles.activeRideLabel}>UPCOMING RIDE</Text>
                      <Text style={styles.activeRideDest} numberOfLines={1}>
                        To {activeRide.route?.to?.city || activeRide.route?.to?.address?.split(',')[0] || 'Destination'}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#FFF" />
                </LinearGradient>
              )}
            </TouchableOpacity>
          )}

          {/* ── HerPooling Banner ── */}
          {userGender === 'Female' && !isPinkMode && (
            <TouchableOpacity style={styles.pinkPoolingCard} activeOpacity={0.85} onPress={() => navigation.navigate('PinkPoolingSplash' as never)}>
              <View style={styles.pinkPoolingContent}>
                <View style={styles.pinkPoolingIconContainer}>
                  <Heart size={28} color="#FF6B9D" fill="#FF6B9D" />
                </View>
                <View style={styles.pinkPoolingTextContainer}>
                  <Text style={styles.pinkPoolingTitle}>HerPooling</Text>
                  <Text style={[styles.pinkPoolingSubtitle, { color: theme.colors.textSecondary }]}>Safe rides for women & girls</Text>
                </View>
                <ChevronRight size={20} color="#FF6B9D" />
              </View>
            </TouchableOpacity>
          )}

          {/* ── Nearby Rides ── */}
          {nearbyRides.length > 0 && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Rides near you</Text>
                <TouchableOpacity onPress={() => navigation.navigate('SearchPooling' as never)}>
                  <Text style={[styles.sectionLink, { color: theme.colors.primary }]}>View all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.nearbyScroll}>
                {nearbyRides.map((ride: any, index: number) => (
                  <TouchableOpacity
                    key={ride.offerId || index}
                    style={[styles.nearbyCard, { backgroundColor: theme.colors.surface }]}
                    activeOpacity={0.75}
                    onPress={() => (navigation.navigate as any)('PoolingDetails', { offerId: ride.offerId })}
                  >
                    <View style={styles.nearbyCardTop}>
                      <View style={[styles.nearbyAvatar, { backgroundColor: theme.colors.primary + '20' }]}>
                        <Text style={[styles.nearbyAvatarText, { color: theme.colors.primary }]}>
                          {(ride.driverName || 'D')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.nearbyDriverInfo}>
                        <Text style={[styles.nearbyDriverName, { color: theme.colors.text }]} numberOfLines={1}>{ride.driverName}</Text>
                        <View style={styles.nearbyRating}>
                          <Star size={12} color="#F5C25B" fill="#F5C25B" />
                          <Text style={[styles.nearbyRatingText, { color: theme.colors.textSecondary }]}>{ride.rating?.toFixed(1) || '—'}</Text>
                        </View>
                      </View>
                      {ride.price > 0 && (
                        <Text style={[styles.nearbyPrice, { color: theme.colors.text }]}>₹{ride.price}</Text>
                      )}
                    </View>
                    <View style={styles.nearbyRoute}>
                      <View style={styles.nearbyRouteDot} />
                      <Text style={[styles.nearbyRouteText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{ride.from?.city || ride.from?.address?.split(',')[0]}</Text>
                    </View>
                    <View style={styles.nearbyRoute}>
                      <View style={[styles.nearbyRouteDot, { backgroundColor: theme.colors.primary }]} />
                      <Text style={[styles.nearbyRouteText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{ride.to?.city || ride.to?.address?.split(',')[0]}</Text>
                    </View>
                    <View style={styles.nearbyCardBottom}>
                      <Text style={[styles.nearbyMeta, { color: theme.colors.textSecondary }]}>{ride.time} · {ride.availableSeats} seats</Text>
                      {ride.distanceFromUser != null && (
                        <Text style={[styles.nearbyDist, { color: theme.colors.primary }]}>{ride.distanceFromUser} km away</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Green Impact Card ── */}
          {greenImpact && (
            <View style={[styles.greenCard, { backgroundColor: '#E8F5E9' }]}>
              <View style={styles.greenCardHeader}>
                <View style={styles.greenIconWrap}>
                  <Leaf size={20} color="#2E7D32" />
                </View>
                <Text style={styles.greenTitle}>Your Green Impact</Text>
              </View>
              <View style={styles.greenStatsRow}>
                <View style={styles.greenStat}>
                  <Text style={styles.greenStatValue}>{greenImpact.co2SavedKg}</Text>
                  <Text style={styles.greenStatLabel}>kg CO₂ saved</Text>
                </View>
                <View style={styles.greenStatDivider} />
                <View style={styles.greenStat}>
                  <Text style={styles.greenStatValue}>{greenImpact.totalRidesShared}</Text>
                  <Text style={styles.greenStatLabel}>rides shared</Text>
                </View>
                <View style={styles.greenStatDivider} />
                <View style={styles.greenStat}>
                  <Text style={styles.greenStatValue}>{greenImpact.totalDistanceKm}</Text>
                  <Text style={styles.greenStatLabel}>km pooled</Text>
                </View>
              </View>
              <View style={styles.greenBadge}>
                <Shield size={14} color="#2E7D32" />
                <Text style={styles.greenBadgeText}>{greenImpact.ecoLevel}</Text>
              </View>
            </View>
          )}

          {/* ── Coin Balance Card ── */}
          {coins && (
            <TouchableOpacity style={styles.coinCard} activeOpacity={0.85} onPress={() => (navigation.navigate as any)('Wallet', { tab: 'coins' })}>
              <View style={styles.coinCardContent}>
                <Text style={styles.coinCardTitle}>
                  Coin balance:{'\n'}
                  <Text style={styles.coinCardAmount}>{coins.balance} coins</Text>
                </Text>
                <Text style={styles.coinCardAction}>Redeem →</Text>
              </View>
              <View style={styles.coinCirclesWrap}>
                <View style={styles.coinCircleOuter}>
                  <View style={styles.coinCircleMiddle}>
                    <View style={styles.coinCircleInner}>
                      <Coins size={26} color="#D4920A" />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Referral Banner ── */}
          {referral?.code && (
            <TouchableOpacity style={styles.referralCard} activeOpacity={0.85} onPress={handleShareReferral}>
              <LinearGradient
                colors={['#0F172B', '#0F172B']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.referralGradient}
              >
                <View style={styles.referralLeft}>
                  <View style={styles.referralIconWrap}>
                    <Gift size={22} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.referralTitle}>Invite Friends, Earn Coins</Text>
                    <Text style={styles.referralCode}>
                      <Text style={styles.referralCodeLabel}>Code: </Text>
                      <Text style={styles.referralCodeValue}>{referral.code}</Text>
                    </Text>
                  </View>
                </View>
                <Share2 size={20} color="#51A7EA" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ── 4 Steps Carousel (shown for new users) ── */}
          {showSteps && (
            <View style={styles.stepsCarousel}>
              <ScrollView
                ref={stepsScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setStepsActiveIndex(Math.round(e.nativeEvent.contentOffset.x / STEP_CARD_W))}
              >
                {bookingSteps.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <View key={item.id} style={[styles.stepSlide, { width: STEP_CARD_W }]}>
                      <View style={styles.stepSlideInner}>
                        <View style={styles.stepTextSide}>
                          <Text style={styles.stepLabel}>❖ {item.step}</Text>
                          <Text style={styles.stepTitle}>{item.title}</Text>
                          <Text style={styles.stepCta}>{item.cta}</Text>
                        </View>
                        <View style={styles.stepIconPanel}>
                          <IconComp size={normalize(64)} color="rgba(255,255,255,0.85)" strokeWidth={1.3} />
                        </View>
                        <View style={styles.stepsDots}>
                          {bookingSteps.map((_, i) => (
                            <TouchableOpacity
                              key={i}
                              onPress={() => { stepsScrollRef.current?.scrollTo({ x: STEP_CARD_W * i, animated: true }); setStepsActiveIndex(i); }}
                              style={[styles.stepDot, i === stepsActiveIndex ? styles.stepDotActive : styles.stepDotInactive]}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={{ height: normalize(16) }} />
        </ScrollView>

        {/* ── Wallet Modal ── */}
        <Modal visible={showWalletModal} transparent animationType="slide" onRequestClose={() => setShowWalletModal(false)}>
          <TouchableWithoutFeedback onPress={() => setShowWalletModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.walletModal, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.walletModalHeader}>
                    <Text style={[styles.walletModalTitle, { color: theme.colors.text }]}>Wallet</Text>
                    <TouchableOpacity onPress={() => setShowWalletModal(false)}>
                      <X size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.walletModalRow}>
                    <View style={[styles.walletModalCard, { backgroundColor: theme.colors.background }]}>
                      <TrendingUp size={24} color={theme.colors.success} />
                      <Text style={[styles.walletModalLabel, { color: theme.colors.textSecondary }]}>Balance</Text>
                      <View style={styles.walletModalAmountRow}>
                        <IndianRupee size={20} color={theme.colors.text} />
                        <Text style={[styles.walletModalAmount, { color: theme.colors.text }]}>
                          {homeData?.financial?.walletBalance?.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.walletModalCard, { backgroundColor: '#FFF8E7' }]}>
                      <Coins size={24} color="#F5A623" />
                      <Text style={[styles.walletModalLabel, { color: '#8B6914' }]}>Coins</Text>
                      <Text style={[styles.walletModalAmount, { color: '#8B5E00' }]}>
                        {homeData?.coins?.balance ?? 0}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.walletModalButtons}>
                    <TouchableOpacity
                      style={styles.walletModalBtn}
                      onPress={() => {
                        setShowWalletModal(false);
                        (navigation.navigate as any)('Wallet', { openWithdrawal: true });
                      }}
                    >
                      <LinearGradient
                        colors={['#51A7EA', '#0284C7']}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={styles.walletModalBtnGradient}
                      >
                        <Text style={styles.walletModalBtnText}>Withdrawal</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.walletModalBtn, { backgroundColor: '#0369A1' }]} onPress={() => { setShowWalletModal(false); (navigation.navigate as any)('Wallet', {}); }}>
                      <Text style={styles.walletModalBtnText}>Wallet</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={[styles.walletModalViewAll, { borderColor: theme.colors.border }]} onPress={() => { setShowWalletModal(false); (navigation.navigate as any)('Wallet', {}); }}>
                    <Text style={[styles.walletModalViewAllText, { color: '#0284C7' }]}>View wallet details →</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* ── Schedule Modal (Now dropdown) ── */}
        <Modal visible={showScheduleModal} transparent animationType="fade" onRequestClose={() => setShowScheduleModal(false)}>
          <TouchableWithoutFeedback onPress={() => setShowScheduleModal(false)}>
            <View style={styles.scheduleOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.scheduleModal, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.scheduleTitle, { color: theme.colors.text }]}>When do you want to ride?</Text>
                  <TouchableOpacity style={[styles.scheduleOption, { borderColor: theme.colors.border }]} onPress={() => { setShowScheduleModal(false); }}>
                    <Clock size={20} color={theme.colors.primary} />
                    <View>
                      <Text style={[styles.scheduleOptionTitle, { color: theme.colors.text }]}>Now</Text>
                      <Text style={[styles.scheduleOptionSub, { color: theme.colors.textSecondary }]}>Find rides leaving right away</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.scheduleOption, { borderColor: theme.colors.border }]} onPress={() => { setShowScheduleModal(false); navigation.navigate('SearchPooling' as never); }}>
                    <MapPin size={20} color={theme.colors.primary} />
                    <View>
                      <Text style={[styles.scheduleOptionTitle, { color: theme.colors.text }]}>Schedule for later</Text>
                      <Text style={[styles.scheduleOptionSub, { color: theme.colors.textSecondary }]}>Pick a date & time</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* ── Sidebar Drawer ── */}
        <Modal visible={showSidebar} transparent animationType="none" onRequestClose={closeSidebar}>
          <View style={styles.sidebarModalRoot}>
            <TouchableWithoutFeedback onPress={closeSidebar}>
              <Animated.View style={[styles.sidebarOverlay, { opacity: overlayAnim }]} />
            </TouchableWithoutFeedback>
            <Animated.View style={[styles.sidebarContainer, { transform: [{ translateX: sidebarAnim }] }]}>
              <View style={styles.sidebarHeader}>
                <Image
                  source={require('../../../assets/sidebar_ezway_logo_transparent.png')}
                  style={styles.sidebarLogo}
                  resizeMode="contain"
                />
              </View>

              <ScrollView
                style={styles.sidebarMenu}
                contentContainerStyle={styles.sidebarMenuContent}
                showsVerticalScrollIndicator={false}
              >
                {sidebarMenuItems.map((item, index) => {
                  const IconComp = item.icon;
                  const isActive = item.screen === currentRouteName || (item.screen === 'MainDashboard' && !currentRouteName);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.sidebarMenuItemTouchable}
                      activeOpacity={0.78}
                      onPress={() => { closeSidebar(); if (item.screen !== 'MainDashboard') (navigation.navigate as any)(item.screen); }}
                    >
                      {isActive ? (
                        <LinearGradient
                          colors={['#F99E3C', '#E08E35']}
                          start={{ x: 0.5, y: 0 }}
                          end={{ x: 0.5, y: 1 }}
                          style={[styles.sidebarMenuItem, styles.sidebarMenuItemActive]}
                        >
                          <View style={[styles.sidebarMenuIconWrap, styles.sidebarMenuIconWrapActive]}>
                            <IconComp size={18} color="#FFFFFF" />
                          </View>
                          <Text style={[styles.sidebarMenuText, styles.sidebarMenuTextActive]}>{item.label}</Text>
                          <ChevronRight size={16} color="rgba(255,255,255,0.9)" />
                        </LinearGradient>
                      ) : (
                        <View style={styles.sidebarMenuItem}>
                          <View style={styles.sidebarMenuIconWrap}>
                            <IconComp size={18} color="#475569" />
                          </View>
                          <Text style={styles.sidebarMenuText}>{item.label}</Text>
                          <ChevronRight size={16} color="#94A3B8" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                <View style={styles.sidebarDivider} />

                <TouchableOpacity
                  style={styles.sidebarMenuItemTouchable}
                  activeOpacity={0.78}
                  onPress={() => { closeSidebar(); logout(); }}
                >
                  <View style={styles.sidebarMenuItem}>
                    <View style={[styles.sidebarMenuIconWrap, { backgroundColor: '#FEE2E2' }]}>
                      <LogOut size={18} color="#FF6B6B" />
                    </View>
                    <Text style={[styles.sidebarMenuText, { color: '#FF7C7C' }]}>Logout</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ height: normalize(28) }} />
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: normalize(10),
    paddingTop: SPACING.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuButton: { padding: SPACING.xs },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: normalize(6) },
  iconButton: { padding: SPACING.xs, position: 'relative' as const },
  notifBadge: {
    position: 'absolute' as const, top: normalize(-4), right: normalize(-6),
    backgroundColor: '#FF3B30', borderRadius: normalize(10), minWidth: normalize(20),
    height: normalize(20), justifyContent: 'center' as const, alignItems: 'center' as const,
    paddingHorizontal: normalize(4), borderWidth: 2, borderColor: COLORS.white,
  },
  notifBadgeText: { color: COLORS.white, fontSize: normalize(10), fontWeight: 'bold' as const, fontFamily: FONTS.regular },
  profileIconContainer: { position: 'relative' as const },
  dropdown: {
    position: 'absolute' as const, top: normalize(45), right: 0, minWidth: wp(48),
    borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.xs, ...SHADOWS.lg, zIndex: 1000,
  },
  dropdownItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: SPACING.sm, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  dropdownText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md },
  dropdownDivider: { height: 1, marginVertical: SPACING.xs },

  // ── ScrollView ──
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: normalize(120) },

  // ── Greeting ──
  greeting: { fontFamily: FONTS.medium, fontSize: normalize(22), fontWeight: 'bold', marginBottom: normalize(2) },
  greetingSub: { fontFamily: FONTS.regular, fontSize: normalize(14), marginBottom: SPACING.md },

  // ── Where to? Card ──
  whereToContainer: { zIndex: 100, marginBottom: SPACING.lg },
  whereToCard: {
    borderRadius: normalize(16), ...SHADOWS.md, overflow: 'hidden',
  },
  whereToRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: normalize(12), paddingHorizontal: SPACING.md,
    gap: normalize(10),
  },
  whereToSearchTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  whereToSearchDot: {
    width: normalize(10), height: normalize(10), borderRadius: normalize(5),
    backgroundColor: '#4CAF50', marginRight: normalize(10),
  },
  whereToInputPlaceholder: {
    fontFamily: FONTS.medium,
    fontSize: normalize(16),
    fontWeight: '600',
  },
  whereToQuickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(4),
    borderWidth: 1,
    borderRadius: normalize(16),
    paddingVertical: normalize(6),
    paddingHorizontal: normalize(10),
  },
  whereToQuickActionText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    fontWeight: '600',
  },
  whereToInput: { flex: 1, fontFamily: FONTS.medium, fontSize: normalize(16), paddingVertical: 0, fontWeight: '600' },
  whereToClose: { padding: normalize(4), marginRight: normalize(8) },
  whereToDivider: { width: 1, height: normalize(24), marginHorizontal: normalize(10) },
  whereToNow: { flexDirection: 'row', alignItems: 'center', gap: normalize(4), paddingVertical: normalize(4), paddingHorizontal: normalize(8) },
  whereToNowText: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '600' },
  whereToChevron: { fontSize: normalize(11), marginLeft: normalize(1) },
  savedDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: SPACING.md },
  savedPlacesScroll: { paddingHorizontal: SPACING.md, paddingVertical: normalize(10), gap: normalize(8) },
  savedChip: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(6),
    paddingVertical: normalize(5), paddingHorizontal: normalize(12),
    borderRadius: normalize(18), borderWidth: 1,
  } as any,
  savedChipIcon: {
    width: normalize(24), height: normalize(24), borderRadius: normalize(12),
    alignItems: 'center', justifyContent: 'center',
  },
  savedChipText: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '500' },
  whereToDropdown: { marginTop: normalize(4), borderRadius: normalize(16), paddingVertical: normalize(6), overflow: 'hidden', ...SHADOWS.lg, maxHeight: normalize(280) },
  whereToDropdownScroll: { maxHeight: normalize(260) },
  whereToDropdownLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: normalize(16), gap: SPACING.sm },
  whereToDropdownLoadingText: { fontFamily: FONTS.regular, fontSize: normalize(14) },
  whereToDropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: normalize(12), paddingHorizontal: SPACING.md, gap: normalize(12) },
  whereToDropdownIcon: { width: normalize(36), height: normalize(36), borderRadius: normalize(18), alignItems: 'center', justifyContent: 'center' },
  whereToDropdownText: { flex: 1 },
  whereToDropdownTitle: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '600' },
  whereToDropdownSubtitle: { fontFamily: FONTS.regular, fontSize: normalize(12), marginTop: normalize(2) },

  // ── Coins Carousel ──
  coinsCarouselWrap: { marginBottom: SPACING.lg },
  coinsCard: {
    borderRadius: normalize(16),
    overflow: 'hidden' as const,
    paddingVertical: normalize(18),
    paddingHorizontal: normalize(16),
  },
  coinsCardContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  coinsCardLeft: { flex: 1, paddingRight: normalize(12) },
  coinsTag: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(4),
    borderRadius: normalize(12),
    marginBottom: normalize(8),
  },
  coinsTagText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(11),
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  coinsCardTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(17),
    fontWeight: '700' as const,
    color: '#FFFFFF',
    lineHeight: normalize(23),
    marginBottom: normalize(12),
  },
  coinsCta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
    gap: normalize(4),
  },
  coinsCtaText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    fontWeight: '700' as const,
    color: '#FFF',
  },
  coinsCardRight: {
    width: normalize(100),
    height: normalize(100),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    position: 'relative' as const,
  },
  coinsDecoOuter: {
    width: normalize(96),
    height: normalize(96),
    borderRadius: normalize(48),
    borderWidth: 1.5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  coinsDecoMiddle: {
    width: normalize(72),
    height: normalize(72),
    borderRadius: normalize(36),
    borderWidth: 1.5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  coinsDecoInner: {
    width: normalize(52),
    height: normalize(52),
    borderRadius: normalize(26),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  coinsMiniFloat1: {
    position: 'absolute' as const,
    top: normalize(4),
    right: normalize(4),
    width: normalize(10),
    height: normalize(10),
    borderRadius: normalize(5),
  },
  coinsMiniFloat2: {
    position: 'absolute' as const,
    bottom: normalize(8),
    left: normalize(2),
    width: normalize(7),
    height: normalize(7),
    borderRadius: normalize(4),
  },
  coinsDots: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: normalize(10),
    gap: normalize(6),
  },
  coinsDot: {
    width: normalize(6),
    height: normalize(6),
    borderRadius: normalize(3),
    backgroundColor: '#D1D5DB',
  },
  coinsDotActive: {
    width: normalize(20),
    backgroundColor: '#F5C25B',
  },

  // ── Active Ride ──
  activeRideCard: {
    borderRadius: normalize(16), marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  activeRideFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: normalize(14),
    paddingHorizontal: SPACING.md,
  },
  activeRideLeft: { flexDirection: 'row', alignItems: 'center', gap: normalize(12), flex: 1 },
  activeRideBadge: {
    width: normalize(36), height: normalize(36), borderRadius: normalize(18),
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  activeRideInfo: { flex: 1 },
  activeRideLabel: { fontFamily: FONTS.regular, fontSize: normalize(11), color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  activeRideDest: { fontFamily: FONTS.medium, fontSize: normalize(16), color: '#FFF', fontWeight: '600' },

  // ── Quick Actions ──
  quickActionsSection: {
    marginBottom: SPACING.lg,
  },
  quickActionsHeading: {
    fontFamily: FONTS.regular,
    fontSize: normalize(18),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: normalize(10),
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(8),
  },
  quickActionItem: {
    width: (SCREEN_W - SPACING.md * 2 - normalize(8) * 3) / 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: normalize(9),
    paddingHorizontal: normalize(6),
    borderRadius: normalize(14),
    borderWidth: 1,
    minHeight: normalize(86),
  },
  quickActionItemPlain: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEF0F4',
  },
  quickActionIcon: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: normalize(7),
    backgroundColor: '#FAF2F2',
    borderWidth: 1.3,
    borderColor: '#C88A8A',
  },
  quickActionLabel: {
    fontFamily: FONTS.medium,
    fontSize: normalize(10.5),
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: normalize(13),
    minHeight: normalize(24),
    color: '#1F2937',
  },

  // ── HerPooling ──
  pinkPoolingCard: { marginBottom: SPACING.lg, backgroundColor: '#FFF5F8', borderWidth: 2, borderColor: '#FFDEE7', borderRadius: BORDER_RADIUS.lg },
  pinkPoolingContent: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  pinkPoolingIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFDEE7', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  pinkPoolingTextContainer: { flex: 1 },
  pinkPoolingTitle: { fontFamily: FONTS.medium, fontSize: normalize(17), color: '#FF6B9D', fontWeight: 'bold' },
  pinkPoolingSubtitle: { fontFamily: FONTS.regular, fontSize: normalize(13), marginTop: normalize(2) },

  // ── Section ──
  sectionWrap: { marginBottom: SPACING.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { fontFamily: FONTS.medium, fontSize: normalize(18), fontWeight: 'bold' },
  sectionLink: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '600' },

  // ── Nearby Rides ──
  nearbyScroll: { gap: SPACING.sm },
  nearbyCard: {
    width: normalize(220), borderRadius: normalize(16), padding: SPACING.md, ...SHADOWS.sm,
  },
  nearbyCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: normalize(10), gap: normalize(8) },
  nearbyAvatar: { width: normalize(36), height: normalize(36), borderRadius: normalize(18), alignItems: 'center', justifyContent: 'center' },
  nearbyAvatarText: { fontFamily: FONTS.medium, fontSize: normalize(16), fontWeight: 'bold' },
  nearbyDriverInfo: { flex: 1 },
  nearbyDriverName: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '600' },
  nearbyRating: { flexDirection: 'row', alignItems: 'center', gap: normalize(3) },
  nearbyRatingText: { fontFamily: FONTS.regular, fontSize: normalize(11) },
  nearbyPrice: { fontFamily: FONTS.medium, fontSize: normalize(16), fontWeight: 'bold' },
  nearbyRoute: { flexDirection: 'row', alignItems: 'center', gap: normalize(8), marginBottom: normalize(4) },
  nearbyRouteDot: { width: normalize(8), height: normalize(8), borderRadius: normalize(4), backgroundColor: '#2E7D32' },
  nearbyRouteText: { fontFamily: FONTS.regular, fontSize: normalize(12), flex: 1 },
  nearbyCardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: normalize(8) },
  nearbyMeta: { fontFamily: FONTS.regular, fontSize: normalize(11) },
  nearbyDist: { fontFamily: FONTS.medium, fontSize: normalize(11), fontWeight: '600' },

  // ── Green Impact ──
  greenCard: { borderRadius: normalize(18), padding: SPACING.md, marginBottom: SPACING.lg },
  greenCardHeader: { flexDirection: 'row', alignItems: 'center', gap: normalize(8), marginBottom: SPACING.md },
  greenIconWrap: { width: normalize(32), height: normalize(32), borderRadius: normalize(16), backgroundColor: '#C8E6C9', alignItems: 'center', justifyContent: 'center' },
  greenTitle: { fontFamily: FONTS.medium, fontSize: normalize(16), fontWeight: 'bold', color: '#1B5E20' },
  greenStatsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.sm },
  greenStat: { alignItems: 'center' },
  greenStatValue: { fontFamily: FONTS.medium, fontSize: normalize(20), fontWeight: 'bold', color: '#2E7D32' },
  greenStatLabel: { fontFamily: FONTS.regular, fontSize: normalize(11), color: '#388E3C', marginTop: normalize(2) },
  greenStatDivider: { width: 1, backgroundColor: '#A5D6A7' },
  greenBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: normalize(6), backgroundColor: '#C8E6C9', paddingVertical: normalize(6), paddingHorizontal: normalize(14), borderRadius: normalize(20), alignSelf: 'center' },
  greenBadgeText: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '600', color: '#2E7D32' },

  // ── Coin Card ──
  coinCard: {
    backgroundColor: '#F5C25B', borderRadius: normalize(20), paddingLeft: SPACING.lg,
    paddingVertical: SPACING.lg, marginBottom: SPACING.lg, minHeight: normalize(120),
    overflow: 'hidden', ...SHADOWS.md,
  },
  coinCardContent: { maxWidth: '60%' },
  coinCardTitle: { fontFamily: FONTS.regular, fontSize: normalize(14), color: '#5A3E00', lineHeight: normalize(20) },
  coinCardAmount: { fontFamily: FONTS.medium, fontSize: normalize(22), fontWeight: 'bold', color: '#1A1A1A' },
  coinCardAction: { fontFamily: FONTS.medium, fontSize: normalize(14), color: '#3D2800', marginTop: SPACING.sm, fontWeight: '600' },
  coinCirclesWrap: { position: 'absolute', right: normalize(-33), top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  coinCircleOuter: { width: normalize(140), height: normalize(140), borderRadius: normalize(70), backgroundColor: '#FAE3A4', alignItems: 'center', justifyContent: 'center' },
  coinCircleMiddle: { width: normalize(100), height: normalize(100), borderRadius: normalize(50), backgroundColor: '#FDF2DB', alignItems: 'center', justifyContent: 'center' },
  coinCircleInner: { width: normalize(60), height: normalize(60), borderRadius: normalize(30), backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },

  // ── Referral ──
  referralCard: {
    borderRadius: normalize(18), marginBottom: SPACING.lg, overflow: 'hidden',
  },
  referralGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  referralLeft: { flexDirection: 'row', alignItems: 'center', gap: normalize(12), flex: 1 },
  referralIconWrap: {
    width: normalize(42), height: normalize(42), borderRadius: normalize(21),
    backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center',
  },
  referralTitle: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: 'bold', color: '#FFFFFF' },
  referralCode: { fontFamily: FONTS.regular, fontSize: normalize(12), marginTop: normalize(2) },
  referralCodeLabel: { color: 'rgba(255,255,255,0.84)' },
  referralCodeValue: { color: '#51A7EA' },

  // ── Steps Carousel ──
  stepsCarousel: { marginBottom: SPACING.lg, marginHorizontal: -SPACING.md },
  stepSlide: { paddingHorizontal: SPACING.md },
  stepSlideInner: { backgroundColor: '#AC924B', borderRadius: normalize(18), overflow: 'hidden', minHeight: normalize(160), position: 'relative' },
  stepTextSide: { width: '58%', paddingTop: SPACING.lg, paddingLeft: SPACING.lg, paddingBottom: SPACING.lg, justifyContent: 'center' },
  stepLabel: { fontFamily: FONTS.regular, fontSize: normalize(11), color: '#E8D5A8', marginBottom: SPACING.xs, letterSpacing: 0.5 },
  stepTitle: { fontFamily: FONTS.medium, fontSize: normalize(22), fontWeight: 'bold', color: '#FFFFFF', lineHeight: normalize(28) },
  stepCta: { fontFamily: FONTS.medium, fontSize: normalize(14), color: '#F0E0BE', marginTop: SPACING.sm, fontWeight: '600' },
  stepIconPanel: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: '45%',
    backgroundColor: '#927023', borderTopLeftRadius: normalize(50), borderBottomLeftRadius: normalize(50),
    alignItems: 'center', justifyContent: 'center',
  },
  stepsDots: {
    position: 'absolute', bottom: normalize(12), left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: normalize(6),
  },
  stepDot: { borderRadius: normalize(5) },
  stepDotActive: { width: normalize(10), height: normalize(10), backgroundColor: '#FFFFFF' },
  stepDotInactive: { width: normalize(8), height: normalize(8), backgroundColor: 'rgba(255,255,255,0.4)' },

  // ── Wallet Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  walletModal: { borderTopLeftRadius: normalize(24), borderTopRightRadius: normalize(24), padding: SPACING.lg, paddingBottom: normalize(40) },
  walletModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  walletModalTitle: { fontFamily: FONTS.medium, fontSize: normalize(20), fontWeight: 'bold' },
  walletModalRow: { flexDirection: 'row', gap: normalize(12), marginBottom: SPACING.lg },
  walletModalCard: { flex: 1, borderRadius: normalize(14), padding: normalize(14), gap: normalize(6) },
  walletModalLabel: { fontFamily: FONTS.regular, fontSize: normalize(12) },
  walletModalAmountRow: { flexDirection: 'row', alignItems: 'center' },
  walletModalAmount: { fontFamily: FONTS.medium, fontSize: normalize(24), fontWeight: 'bold' },
  walletModalButtons: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  walletModalBtn: { flex: 1, borderRadius: normalize(14), overflow: 'hidden' },
  walletModalBtnGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: normalize(14) },
  walletModalBtnText: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '600', color: '#FFFFFF' },
  walletModalViewAll: { borderTopWidth: 1, paddingTop: SPACING.md, alignItems: 'center' },
  walletModalViewAllText: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '600' },

  // ── Schedule Modal ──
  scheduleOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  scheduleModal: { width: '100%', borderRadius: normalize(20), padding: SPACING.lg, ...SHADOWS.lg },
  scheduleTitle: { fontFamily: FONTS.medium, fontSize: normalize(18), fontWeight: 'bold', marginBottom: SPACING.lg, textAlign: 'center' },
  scheduleOption: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(14),
    paddingVertical: normalize(16), paddingHorizontal: SPACING.md,
    borderWidth: 1, borderRadius: normalize(14), marginBottom: SPACING.sm,
  },
  scheduleOptionTitle: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '600' },
  scheduleOptionSub: { fontFamily: FONTS.regular, fontSize: normalize(12), marginTop: normalize(2) },

  // ── Greeting cursor ──
  greetingCursor: { fontFamily: FONTS.regular, fontSize: normalize(22), color: '#F99E3C' },

  // ── Sidebar ──
  sidebarModalRoot: {
    flex: 1,
  },
  sidebarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  sidebarContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SCREEN_W * 0.82,
    backgroundColor: '#F3F3F3',
    ...SHADOWS.lg,
    elevation: 20,
    overflow: 'hidden',
  },
  sidebarHeader: {
    paddingTop: normalize(10),
    paddingBottom: normalize(10),
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  sidebarLogo: {
    width: normalize(170),
    height: normalize(60),
  },
  sidebarMenu: { flex: 1, paddingTop: SPACING.sm, paddingHorizontal: normalize(10) },
  sidebarMenuContent: { paddingBottom: normalize(96) },
  sidebarMenuItemTouchable: {
    marginBottom: normalize(4),
  },
  sidebarMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(12),
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(12),
    borderRadius: normalize(12),
    backgroundColor: 'transparent',
  },
  sidebarMenuItemActive: {
    borderWidth: 0,
  },
  sidebarMenuIconWrap: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(10),
    backgroundColor: '#FFF4D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarMenuIconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  sidebarMenuText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(15),
    fontWeight: '500',
    flex: 1,
    color: '#0F172B',
  },
  sidebarMenuTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sidebarDivider: { height: 1, marginVertical: SPACING.md, marginHorizontal: normalize(6), backgroundColor: 'rgba(15,23,43,0.08)' },
});

export default MainDashboardScreen;
