import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING } from '@constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = SPACING.md,
}) => {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: COLORS.white,
      borderRadius: BORDER_RADIUS.lg,
      padding,
    };

    switch (variant) {
      case 'elevated':
        return { ...baseStyle, ...SHADOWS.md };
      case 'outlined':
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: COLORS.border,
        };
      default:
        return { ...baseStyle, ...SHADOWS.sm };
    }
  };

  return <View style={[getCardStyle(), style]}>{children}</View>;
};











