import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';

const SplashScreen = () => {
  const navigation = useNavigation();
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('Onboarding' as never);
    }, 6000);

    return () => clearTimeout(timer);
  }, [navigation]);

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
    bottom: 50,
    alignSelf: 'center',
  },
});

export default SplashScreen;
