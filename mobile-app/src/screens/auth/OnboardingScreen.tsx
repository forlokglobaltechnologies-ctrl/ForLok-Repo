import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Lock } from 'lucide-react-native';
import { FONTS, SPACING } from '@constants/theme';
import { normalize, wp, hp } from '@utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = '@forlok_onboarding_seen';
const DEBUG_ENDPOINT = 'http://127.0.0.1:7775/ingest/9bdd2fd3-ac77-45be-b342-a40ab02f34f7';

const SLIDE_ACCENT: Record<number, string> = {
  0: '#F9A825',
  1: '#1565C0',
  2: '#2E7D32',
};

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  React.useEffect(() => {
    // #region agent log
    fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H12',location:'OnboardingScreen.tsx:mount',message:'Onboarding screen mounted',data:{},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, []);

  const markOnboardingSeen = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  };

  const slides = [
    {
      id: 1,
      title: 'Find your dream\nride to start your\njourney',
      image: require('../../../assets/onboarding_ride_sharing.png'),
    },
    {
      id: 2,
      title: 'Rent vehicles\neasily from\ntrusted owners',
      image: require('../../../assets/onboarding_rental.png'),
    },
    {
      id: 3,
      title: 'Ride safe,\nwear a helmet,\narrive safe',
      image: require('../../../assets/onboarding_safety.png'),
    },
  ];

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (page !== currentPage) setCurrentPage(page);
  };

  const goToPage = (page: number) => {
    scrollViewRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
    setCurrentPage(page);
  };

  const handleGetStarted = () => {
    markOnboardingSeen();
    navigation.navigate('SignUp' as never);
  };

  const handleNext = () => {
    if (currentPage < slides.length - 1) {
      goToPage(currentPage + 1);
    } else {
      handleGetStarted();
    }
  };

  const accent = SLIDE_ACCENT[currentPage] ?? '#F9A825';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top bar: brand + Next */}
      <View style={styles.topBar}>
        <Text style={[styles.brandText, { color: accent }]}>ForLok</Text>
        <TouchableOpacity onPress={handleNext} activeOpacity={0.7}>
          <Text style={[styles.nextText, { color: accent }]}>
            {currentPage === slides.length - 1 ? 'Start' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.scrollView}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <View style={styles.imageWrap}>
              <Image
                source={slide.image}
                style={styles.slideImage}
                resizeMode="contain"
              />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom: capsule button */}
      <View style={styles.bottomSection}>
        <View style={[styles.capsuleBtn, { backgroundColor: accent }]}>
          <View style={styles.lockCircle}>
            <Lock size={normalize(16)} color={accent} strokeWidth={2.5} />
          </View>

          <TouchableOpacity
            onPress={handleGetStarted}
            activeOpacity={0.85}
            style={styles.capsuleCenter}
          >
            <Text style={styles.capsuleBtnText}>Get Started</Text>
            <Text style={styles.capsuleArrows}>  {'>>'}</Text>
          </TouchableOpacity>

          <View style={styles.lockCircle}>
            <Lock size={normalize(16)} color={accent} strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: hp(6),
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  brandText: {
    fontFamily: FONTS.bold,
    fontSize: normalize(28),
  },
  nextText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.md,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  slideTitle: {
    fontFamily: FONTS.bold,
    fontSize: normalize(30),
    color: '#1A1A1A',
    lineHeight: normalize(40),
    marginTop: hp(4),
  },
  imageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  slideImage: {
    width: wp(80),
    height: hp(35),
  },
  bottomSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: hp(5),
    alignItems: 'center',
  },
  capsuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: normalize(40),
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(6),
    width: '100%',
  },
  lockCircle: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capsuleCenter: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capsuleBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.lg,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  capsuleArrows: {
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.lg,
    color: '#FFFFFF',
  },
});

export default OnboardingScreen;
