import { StyleSheet, Platform, Dimensions, PixelRatio } from 'react-native';

// Inline normalize to avoid circular / load-order issues
const _SCREEN_WIDTH = Dimensions.get('window').width;
const _BASE_WIDTH = 375;
const normalize = (size: number): number => {
  const scale = _SCREEN_WIDTH / _BASE_WIDTH;
  const newSize = size * Math.min(Math.max(scale, 0.8), 1.3);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/* ───────────────────────────────────────────────────────────── */

export const COLORS = {
  primary: '#F99E3C',
  primaryDark: '#E08E35',
  primaryLight: '#FFB55A',
  secondary: '#F99E3C',
  accent: '#FF6B35',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#757575',
  lightGray: '#E0E0E0',
  darkGray: '#424242',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// HerPooling Theme Colors
export const PINK_COLORS = {
  primary: '#FF6B9D',
  primaryDark: '#FF87A8',
  primaryLight: '#FFDEE7',
  secondary: '#FFB6C1',
  accent: '#FF6B9D',
  background: '#FFF5F8',
  border: '#FFDEE7',
  pinkGradient: ['#FFDEE7', '#FF87A8'],
};

export const FONTS = {
  regular: 'MomoTrustDisplay-Regular',
  medium: 'MomoTrustDisplay-Regular',
  semiBold: 'MomoTrustDisplay-Regular',
  bold: 'MomoTrustDisplay-Regular',
  light: 'MomoTrustDisplay-Regular',
  sizes: {
    xs: normalize(12),
    sm: normalize(14),
    md: normalize(16),
    lg: normalize(18),
    xl: normalize(20),
    xxl: normalize(24),
    xxxl: normalize(32),
  },
};

export const SPACING = {
  xs: normalize(4),
  sm: normalize(8),
  md: normalize(16),
  lg: normalize(24),
  xl: normalize(32),
  xxl: normalize(48),
};

export const BORDER_RADIUS = {
  sm: normalize(4),
  md: normalize(8),
  lg: normalize(12),
  xl: normalize(16),
  round: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
};





