import { StyleSheet, Platform } from 'react-native';

/* ─────────────────────────────────────────────────────────────
   GLOBAL FONT FIX – StyleSheet.create patch
   
   On Android, specifying fontWeight (700, 800, bold …) alongside
   a custom fontFamily causes the OS to look for a bold-variant
   font file.  If it cannot find one it silently falls back to
   the SYSTEM font (Roboto).
   
   Because we ship only a single-weight file (MomoTrustDisplay-
   Regular), the fix is to:
     1. Inject fontFamily into every text-related style
     2. Strip fontWeight on Android so the OS never attempts
        a bold-variant lookup
   
   This patch runs BEFORE any screen module calls StyleSheet.create
   (theme.ts is imported first in App.tsx's dependency tree).
   ───────────────────────────────────────────────────────────── */
const _GLOBAL_FONT = 'MomoTrustDisplay-Regular';
const _IS_ANDROID = Platform.OS === 'android';

const _isTextStyle = (s: Record<string, any>): boolean =>
  s.fontSize !== undefined ||
  s.fontWeight !== undefined ||
  s.fontFamily !== undefined ||
  s.fontStyle !== undefined ||
  s.lineHeight !== undefined ||
  s.letterSpacing !== undefined ||
  s.textAlign !== undefined ||
  s.textDecorationLine !== undefined ||
  s.textTransform !== undefined;

const _origCreate = StyleSheet.create;
(StyleSheet as any).create = function (styles: Record<string, any>) {
  const patched: Record<string, any> = {};
  for (const key of Object.keys(styles)) {
    const style = styles[key];
    if (style && typeof style === 'object' && !Array.isArray(style) && _isTextStyle(style)) {
      patched[key] = { ...style, fontFamily: _GLOBAL_FONT };
      if (_IS_ANDROID) delete patched[key].fontWeight;
    } else {
      patched[key] = style;
    }
  }
  return _origCreate(patched);
};

/* ───────────────────────────────────────────────────────────── */

export const COLORS = {
  primary: '#071952',
  primaryDark: '#050E3A',
  primaryLight: '#0A2A6B',
  secondary: '#1E88E5',
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

// Pink Pooling Theme Colors
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
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
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





