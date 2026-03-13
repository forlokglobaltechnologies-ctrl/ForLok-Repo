import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '@constants/theme';
import { normalize, wp, hp } from '@utils/responsive';
import { AppLoader } from '@components/common/AppLoader';

const LoadingScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/forlok_splash_arrow_sharp_dark.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <AppLoader size="large" color={COLORS.primary} style={styles.loader} />
        <Text style={styles.loadingText}>Loading...</Text>
        <Text style={styles.pleaseWaitText}>Please wait</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#191919',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: SPACING.xl,
  },
  logoImage: {
    width: normalize(170),
    height: normalize(170),
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
    color: '#B8B8B8',
  },
});

export default LoadingScreen;






