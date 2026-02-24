import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, StatusBar, Text, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { normalize, hp } from '@utils/responsive';
import { useAuth } from '@context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@forlok_onboarding_seen';
const BRAND_TEXT = 'ForLok';

const SplashScreen = () => {
  const navigation = useNavigation();
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const letterAnims = React.useRef(BRAND_TEXT.split('').map(() => new Animated.Value(0))).current;

  // Check if user has seen onboarding before
  useEffect(() => {
    const checkOnboarding = async () => {
      const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
      setHasSeenOnboarding(seen === 'true');
      setOnboardingChecked(true);
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    const appearAnim = Animated.stagger(
      90,
      letterAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 360,
          useNativeDriver: true,
        })
      )
    );
    appearAnim.start();
  }, [letterAnims]);

  useEffect(() => {
    // Wait for both auth check and onboarding check to complete
    if (isLoading || !onboardingChecked) return;

    console.log('🚀 [Splash] Auth flow decision:', {
      isAuthenticated,
      hasSeenOnboarding,
      isLoading,
    });

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        // User has valid tokens — go straight to dashboard
        console.log('🚀 [Splash] → MainDashboard (authenticated)');
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainDashboard' as never }],
        });
      } else if (hasSeenOnboarding) {
        // Returning user (logged out) — skip onboarding, go to sign in
        console.log('🚀 [Splash] → SignIn (seen onboarding, not authenticated)');
        navigation.reset({
          index: 0,
          routes: [{ name: 'SignIn' as never }],
        });
      } else {
        // First time user — show onboarding
        console.log('🚀 [Splash] → Onboarding (first time user)');
        navigation.navigate('Onboarding' as never);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation, isAuthenticated, isLoading, onboardingChecked, hasSeenOnboarding]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F4AB04" />
      <View style={styles.gradient}>
        <View style={styles.brandTag}>
          {BRAND_TEXT.split('').map((char, index) => (
            <Animated.Text
              key={`${char}-${index}`}
              style={[
                styles.brandLetter,
                {
                  opacity: letterAnims[index],
                  transform: [
                    {
                      translateY: letterAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {char}
            </Animated.Text>
          ))}
        </View>

        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color="#FFFFFF" style={styles.loader} />
          <Text style={styles.loadingText}>Loading</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4AB04',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4AB04',
  },
  brandTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  brandLetter: {
    color: '#FFFFFF',
    fontSize: normalize(42),
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  loaderWrap: {
    position: 'absolute',
    bottom: hp(6),
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
  },
  loader: {
    alignSelf: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: normalize(12),
    letterSpacing: 0.2,
    alignSelf: 'center',
  },
});

export default SplashScreen;
