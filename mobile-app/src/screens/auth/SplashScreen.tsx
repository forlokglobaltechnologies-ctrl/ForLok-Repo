import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import { normalize, hp } from '@utils/responsive';
import { useAuth } from '@context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@forlok_onboarding_seen';

const SplashScreen = () => {
  const navigation = useNavigation();
  const videoRef = useRef<Video>(null);
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

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
      <StatusBar hidden />
      <Video
        ref={videoRef}
        source={require('../../../assets/videos/mobile screen logo copy_1.mp4')}
        style={StyleSheet.absoluteFillObject}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />
      <ActivityIndicator
        size="large"
        color="#FFFFFF"
        style={styles.loader}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loader: {
    position: 'absolute',
    bottom: hp(6),
    alignSelf: 'center',
  },
});

export default SplashScreen;
