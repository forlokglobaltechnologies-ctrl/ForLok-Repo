import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';

interface AppLoaderProps {
  size?: 'small' | 'large' | number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  text?: string;
}

const resolveSize = (size: AppLoaderProps['size']): number => {
  if (typeof size === 'number') {
    return size;
  }

  if (size === 'small') {
    return 20;
  }

  if (size === 'large') {
    return 56;
  }

  return 36;
};

export const AppLoader: React.FC<AppLoaderProps> = ({
  size = 'small',
  color,
  style,
  text,
}) => {
  const loaderSize = resolveSize(size);

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={loaderSize} color={color || '#FE8800'} />
      {text ? <Text style={[styles.text, color ? { color } : null]}>{text}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 8,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
