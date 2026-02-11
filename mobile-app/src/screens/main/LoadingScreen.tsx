import React from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING } from '@constants/theme';

const LoadingScreen = () => {
  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../../../assets/flogo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>
        <ActivityIndicator size="large" color={COLORS.white} style={styles.loader} />
        <Text style={styles.loadingText}>Loading...</Text>
        <Text style={styles.pleaseWaitText}>Please wait</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: SPACING.xl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  loader: {
    marginBottom: SPACING.md,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  pleaseWaitText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    opacity: 0.8,
  },
});

export default LoadingScreen;






