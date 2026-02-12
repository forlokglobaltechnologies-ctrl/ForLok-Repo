import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@constants/theme';

export type ThemeMode = 'normal' | 'pink';

interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  white: string;
  black: string;
  gray: string;
  lightGray: string;
  darkGray: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  transparent: string;
  overlay: string;
  // Pink theme specific
  pinkGradient: string[];
}

interface ThemeContextType {
  isPinkMode: boolean;
  theme: {
    colors: ThemeColors;
    mode: ThemeMode;
  };
  togglePinkMode: () => void;
  setPinkMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@forlok_theme_mode';

// Normal theme colors (existing)
const normalColors: ThemeColors = {
  primary: COLORS.primary,
  primaryDark: COLORS.primaryDark,
  primaryLight: COLORS.primaryLight,
  secondary: COLORS.secondary,
  accent: COLORS.accent,
  success: COLORS.success,
  warning: COLORS.warning,
  error: COLORS.error,
  white: COLORS.white,
  black: COLORS.black,
  gray: COLORS.gray,
  lightGray: COLORS.lightGray,
  darkGray: COLORS.darkGray,
  background: COLORS.background,
  surface: COLORS.surface,
  text: COLORS.text,
  textSecondary: COLORS.textSecondary,
  border: COLORS.border,
  transparent: COLORS.transparent,
  overlay: COLORS.overlay,
  pinkGradient: ['#FFDEE7', '#FF87A8'],
};

// Pink theme colors
const pinkColors: ThemeColors = {
  primary: '#FF6B9D',
  primaryDark: '#FF87A8',
  primaryLight: '#FFDEE7',
  secondary: '#FFB6C1',
  accent: '#FF6B9D',
  success: COLORS.success,
  warning: COLORS.warning,
  error: COLORS.error,
  white: COLORS.white,
  black: COLORS.black,
  gray: COLORS.gray,
  lightGray: COLORS.lightGray,
  darkGray: COLORS.darkGray,
  background: '#FFF5F8',
  surface: COLORS.white,
  text: COLORS.text,
  textSecondary: COLORS.textSecondary,
  border: '#FFDEE7',
  transparent: COLORS.transparent,
  overlay: COLORS.overlay,
  pinkGradient: ['#FFDEE7', '#FF87A8'],
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPinkMode, setIsPinkMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      // Don't load saved pink theme on app start - always start with normal theme
      // Pink theme is optional and only applies when user clicks HerPooling
      setIsPinkMode(false);
    } catch (error) {
      console.error('Error loading theme:', error);
      setIsPinkMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePinkMode = async () => {
    const newMode = !isPinkMode;
    setIsPinkMode(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode ? 'pink' : 'normal');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setPinkMode = async (enabled: boolean) => {
    setIsPinkMode(enabled);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, enabled ? 'pink' : 'normal');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = {
    colors: isPinkMode ? pinkColors : normalColors,
    mode: isPinkMode ? 'pink' : 'normal' as ThemeMode,
  };

  if (isLoading) {
    return null; // Or return a loading component
  }

  return (
    <ThemeContext.Provider value={{ isPinkMode, theme, togglePinkMode, setPinkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
