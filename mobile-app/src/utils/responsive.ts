import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base design width (iPhone SE / iPhone 8)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Width percentage – returns a value based on a percentage of the screen width.
 * Example: wp(50) on a 375px screen → 187.5
 */
export const wp = (percentage: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * percentage) / 100);
};

/**
 * Height percentage – returns a value based on a percentage of the screen height.
 * Example: hp(50) on an 812px screen → 406
 */
export const hp = (percentage: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * percentage) / 100);
};

/**
 * Normalize a size value relative to the base design width.
 * Scales up/down proportionally and clamps between 0.8x and 1.3x
 * so things never get absurdly small or large.
 */
export const normalize = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * Math.min(Math.max(scale, 0.8), 1.3);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Pick a value based on the current device size bucket.
 */
export const responsiveSize = (small: number, medium: number, large: number): number => {
  if (SCREEN_WIDTH < 360) return small;
  if (SCREEN_WIDTH <= 414) return medium;
  return large;
};

// Screen breakpoint flags
export const isSmallDevice = SCREEN_WIDTH < 360;
export const isMediumDevice = SCREEN_WIDTH >= 360 && SCREEN_WIDTH <= 414;
export const isLargeDevice = SCREEN_WIDTH > 414;

// Raw screen dimensions for one-off calculations
export { SCREEN_WIDTH, SCREEN_HEIGHT };
