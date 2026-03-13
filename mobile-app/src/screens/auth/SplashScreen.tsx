import React, { useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar, Text, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { normalize, hp } from '@utils/responsive';
import { useAuth } from '@context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLoader } from '@components/common/AppLoader';

const ONBOARDING_KEY = '@forlok_onboarding_seen';
const DEBUG_ENDPOINT = 'http://127.0.0.1:7775/ingest/9bdd2fd3-ac77-45be-b342-a40ab02f34f7';
const SPLASH_LOGO = require('../../../assets/forlok_splash_arrow_sharp_dark.png');

const SplashScreen = () => {
  const navigation = useNavigation();
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const hasNavigatedRef = React.useRef(false);

  // Check if user has seen onboarding before
  useEffect(() => {
    // #region agent log
    fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H9',location:'SplashScreen.tsx:mount',message:'Splash screen mounted',data:{},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const checkOnboarding = async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasSeenOnboarding(seen === 'true');
        // #region agent log
        fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H9',location:'SplashScreen.tsx:checkOnboarding:success',message:'Onboarding state read',data:{hasSeenOnboarding:seen === 'true'},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      } catch (error) {
        // #region agent log
        fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H9',location:'SplashScreen.tsx:checkOnboarding:catch',message:'Onboarding state read failed',data:{errorMessage:(error as any)?.message || 'unknown'},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        console.warn('Unable to read onboarding state from storage:', error);
        setHasSeenOnboarding(false);
      } finally {
        setOnboardingChecked(true);
      }
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    // Wait for both auth check and onboarding check to complete
    if (isLoading || !onboardingChecked || hasNavigatedRef.current) return;

    console.log('🚀 [Splash] Auth flow decision:', {
      isAuthenticated,
      hasSeenOnboarding,
      isLoading,
    });

    const timer = setTimeout(() => {
      if (hasNavigatedRef.current) return;
      hasNavigatedRef.current = true;

      if (isAuthenticated) {
        // #region agent log
        fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H10',location:'SplashScreen.tsx:navigate:main',message:'Splash navigating to MainDashboard',data:{},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        // User has valid tokens — go straight to dashboard
        console.log('🚀 [Splash] → MainDashboard (authenticated)');
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainDashboard' as never }],
        });
      } else if (hasSeenOnboarding) {
        // #region agent log
        fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H10',location:'SplashScreen.tsx:navigate:signin',message:'Splash navigating to SignIn',data:{},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        // Returning user (logged out) — skip onboarding, go to sign in
        console.log('🚀 [Splash] → SignIn (seen onboarding, not authenticated)');
        navigation.reset({
          index: 0,
          routes: [{ name: 'SignIn' as never }],
        });
      } else {
        // #region agent log
        fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H10',location:'SplashScreen.tsx:navigate:onboarding',message:'Splash navigating to Onboarding',data:{},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        // First time user — show onboarding
        console.log('🚀 [Splash] → Onboarding (first time user)');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' as never }],
        });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation, isAuthenticated, isLoading, onboardingChecked, hasSeenOnboarding]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#191919" />
      <View style={styles.gradient}>
        <View style={styles.brandTag}>
          <Image source={SPLASH_LOGO} style={styles.brandImage} resizeMode="contain" />
        
        </View>

        <View style={styles.loaderWrap}>
          <AppLoader size="small" color="#FE8800" style={styles.loader} />
          <Text style={styles.loadingText}>Loading</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#191919',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#191919',
  },
  brandTag: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  brandImage: {
    width: normalize(400),
    height: normalize(400),
  },
  brandText: {
    marginTop: normalize(10),
    color: '#FE8800',
    fontSize: normalize(26),
    fontFamily: 'MomoTrustDisplay-Regular',
    letterSpacing: 0.4,
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
    fontFamily: 'MomoTrustDisplay-Regular',
    letterSpacing: 0.2,
    alignSelf: 'center',
  },
});

export default SplashScreen;
