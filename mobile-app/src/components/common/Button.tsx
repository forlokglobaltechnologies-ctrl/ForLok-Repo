import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { FONTS, BORDER_RADIUS } from '@constants/theme';
import { useTheme } from '@context/ThemeContext';
import { AppLoader } from '@components/common/AppLoader';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const { theme } = useTheme();
  
  // Always use theme colors
  const colors = theme.colors;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: BORDER_RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    switch (size) {
      case 'small':
        baseStyle.paddingVertical = 8;
        baseStyle.paddingHorizontal = 16;
        break;
      case 'medium':
        baseStyle.paddingVertical = 12;
        baseStyle.paddingHorizontal = 24;
        break;
      case 'large':
        baseStyle.paddingVertical = 16;
        baseStyle.paddingHorizontal = 32;
        break;
    }

    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = colors.primary;
        break;
      case 'secondary':
        baseStyle.backgroundColor = colors.secondary;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.primary;
        break;
      case 'text':
        baseStyle.backgroundColor = 'transparent';
        break;
    }

    if (disabled || loading) {
      baseStyle.opacity = 0.6;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontFamily: FONTS.regular,
    };

    switch (size) {
      case 'small':
        baseStyle.fontSize = FONTS.sizes.sm;
        break;
      case 'medium':
        baseStyle.fontSize = FONTS.sizes.md;
        break;
      case 'large':
        baseStyle.fontSize = FONTS.sizes.lg;
        break;
    }

    switch (variant) {
      case 'primary':
      case 'secondary':
        baseStyle.color = colors.white;
        break;
      case 'outline':
      case 'text':
        baseStyle.color = colors.primary;
        break;
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <AppLoader
          color={variant === 'primary' || variant === 'secondary' ? colors.white : colors.primary}
          size="small"
        />
      ) : (
        <>
          {icon && <View style={{ marginRight: title ? 8 : 0 }}>{icon}</View>}
          {title && <Text style={[getTextStyle(), textStyle]}>{title}</Text>}
        </>
      )}
    </TouchableOpacity>
  );
};

