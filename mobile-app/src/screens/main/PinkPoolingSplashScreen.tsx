import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { useTheme } from '@context/ThemeContext';
import { wp, hp } from '@utils/responsive';

const PinkPoolingSplashScreen = () => {
  const navigation = useNavigation();
  const { setPinkMode } = useTheme();
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    // Start animation
    animationRef.current?.play();

    const timer = setTimeout(() => {
      // Set pink mode AFTER splash completes, then navigate
      setPinkMode(true);
      navigation.navigate('MainDashboard' as never);
    }, 3000); // 3 seconds for animation

    return () => clearTimeout(timer);
  }, [navigation, setPinkMode]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.animationContainer}>
          <LottieView
            ref={animationRef}
            source={require('../../../assets/videos/car green.json')}
            style={styles.animation}
            autoPlay
            loop
          />
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  animationContainer: {
    width: wp(75),
    height: hp(25),
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});

export default PinkPoolingSplashScreen;
