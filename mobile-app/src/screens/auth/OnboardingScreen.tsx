import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { normalize, wp, hp } from '@utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@forlok_onboarding_seen';

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();

  const markOnboardingSeen = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  };
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const slides = [
    {
      id: 1,
      title: 'Share Your Journey',
      description: 'Connect with travelers going to the same destination and split the cost of travel',
      image: require('../../../assets/onboarding1.jpg'),
    },
    {
      id: 2,
      title: 'Rent Vehicles Easily',
      description: 'Rent vehicles from trusted owners and companies. Flexible hours, competitive prices.',
      image: require('../../../assets/onboarding2.jpg'),
    },
  ];

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / wp(100));
    setCurrentPage(page);
  };

  const goToPage = (page: number) => {
    scrollViewRef.current?.scrollTo({ x: page * wp(100), animated: true });
    setCurrentPage(page);
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => { markOnboardingSeen(); navigation.navigate('SignUp' as never); }}
      >
        <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, index) => (
          <ImageBackground
            key={slide.id}
            source={slide.image}
            style={styles.slide}
            resizeMode="cover"
          >
            <LinearGradient
              colors={[COLORS.primary + 'DD', COLORS.primaryDark + 'DD']}
              style={styles.overlay}
            >
              <View style={styles.slideContent}>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideDescription}>{slide.description}</Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        ))}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                currentPage === index && styles.activeDot,
              ]}
              onPress={() => goToPage(index)}
            />
          ))}
        </View>
        <Button
          title={t('common.signUp')}
          onPress={() => { markOnboardingSeen(); navigation.navigate('SignUp' as never); }}
          variant="primary"
          size="large"
          style={styles.signUpButton}
        />
        <Button
          title={t('common.signIn')}
          onPress={() => { markOnboardingSeen(); navigation.navigate('SignIn' as never); }}
          variant="outline"
          size="large"
          style={styles.signInButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  skipButton: {
    position: 'absolute',
    top: hp(6),
    right: SPACING.md,
    zIndex: 10,
    padding: SPACING.sm,
  },
  skipText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
  },
  slide: {
    width: wp(100),
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  slideContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  slideTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  slideDescription: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.9,
    paddingHorizontal: SPACING.xl,
    lineHeight: normalize(24),
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  dot: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    backgroundColor: COLORS.primary,
    opacity: 0.3,
    marginHorizontal: normalize(4),
  },
  activeDot: {
    opacity: 1,
    width: normalize(24),
  },
  buttonContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderTopLeftRadius: normalize(30),
    borderTopRightRadius: normalize(30),
    minHeight: hp(32),
  },
  signUpButton: {
    marginBottom: SPACING.md,
  },
  signInButton: {
    backgroundColor: 'transparent',
  },
});

export default OnboardingScreen;











