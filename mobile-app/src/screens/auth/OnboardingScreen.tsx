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
  Animated,
  PanResponder,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Lock } from 'lucide-react-native';
import { FONTS, SPACING } from '@constants/theme';
import { normalize, wp, hp } from '@utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = '@forlok_onboarding_seen';
const DEBUG_ENDPOINT = 'http://127.0.0.1:7775/ingest/9bdd2fd3-ac77-45be-b342-a40ab02f34f7';
const KNOB_SIZE = normalize(40);
const KNOB_PADDING = normalize(6);

const SLIDE_ACCENT: Record<number, string> = {
  0: '#F9A825',
  1: '#B85E00',
  2: '#2E7D32',
};

const SLIDE_BUTTON_GRADIENT: Record<number, readonly [string, string]> = {
  0: ['#F99E3C', '#E08E35'],
  1: ['#F99E3C', '#E08E35'],
  2: ['#F99E3C', '#E08E35'],
};

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [capsuleWidth, setCapsuleWidth] = useState(0);
  const swipeX = useRef(new Animated.Value(0)).current;
  const maxDragRef = useRef(0);

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
  const buttonGradient = SLIDE_BUTTON_GRADIENT[currentPage] ?? ['#F99E3C', '#E08E35'];
  const maxDrag = Math.max(0, capsuleWidth - (KNOB_SIZE + KNOB_PADDING * 2));
  maxDragRef.current = maxDrag;

  React.useEffect(() => {
    Animated.spring(swipeX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start();
  }, [currentPage, swipeX]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_evt, gestureState) => {
          const clamped = Math.max(0, Math.min(maxDragRef.current, gestureState.dx));
          swipeX.setValue(clamped);
        },
        onPanResponderRelease: (_evt, gestureState) => {
          const threshold = maxDragRef.current * 0.85;
          if (gestureState.dx >= threshold && maxDragRef.current > 0) {
            Animated.timing(swipeX, {
              toValue: maxDragRef.current,
              duration: 120,
              useNativeDriver: true,
            }).start(() => {
              handleGetStarted();
              swipeX.setValue(0);
            });
          } else {
            Animated.spring(swipeX, {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
              tension: 120,
            }).start();
          }
        },
      }),
    [handleGetStarted, swipeX]
  );

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
        <LinearGradient
          colors={[buttonGradient[0], buttonGradient[1]]}
          start={currentPage === 2 ? { x: 0.15, y: 0.12 } : { x: 0.5, y: 0 }}
          end={currentPage === 2 ? { x: 0.9, y: 0.9 } : { x: 0.5, y: 1 }}
          style={styles.capsuleBtn}
          onLayout={(e) => setCapsuleWidth(e.nativeEvent.layout.width)}
        >
          <View style={styles.lockTarget}>
            <Lock size={normalize(16)} color={accent} strokeWidth={2.5} />
          </View>

          <View style={styles.capsuleCenter}>
            <Text style={styles.capsuleBtnText}>Get Started</Text>
            <Text style={styles.capsuleArrows}>  {'>>'}</Text>
          </View>

          <Animated.View
            style={[
              styles.lockKnob,
              {
                transform: [{ translateX: swipeX }],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Lock size={normalize(16)} color={accent} strokeWidth={2.5} />
          </Animated.View>
        </LinearGradient>
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
    justifyContent: 'center',
    borderRadius: normalize(40),
    paddingVertical: normalize(10),
    paddingHorizontal: KNOB_PADDING,
    width: '100%',
    minHeight: normalize(52),
    position: 'relative',
    overflow: 'hidden',
  },
  lockTarget: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: KNOB_PADDING,
    top: KNOB_PADDING,
    opacity: 0.9,
  },
  capsuleCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  lockKnob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: KNOB_PADDING,
    top: KNOB_PADDING,
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
