import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '@constants/theme';

interface CarIconProps {
  size?: number;
  color?: string;
}

/** Two-wheeler glyph (legacy name kept for imports). */
export const CarIcon: React.FC<CarIconProps> = ({
  size = 40,
  color = COLORS.primary,
}) => (
  <View style={[styles.container, { width: size, height: size }]}>
    <View style={[styles.bikeBody, { backgroundColor: color, opacity: 0.3 }]} />
    <View style={[styles.bikeWheel1, { backgroundColor: color, opacity: 0.5 }]} />
    <View style={[styles.bikeWheel2, { backgroundColor: color, opacity: 0.5 }]} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bikeBody: {
    width: '60%',
    height: '30%',
    borderRadius: 4,
    position: 'absolute',
    top: '35%',
  },
  bikeWheel1: {
    width: '30%',
    height: '30%',
    borderRadius: 999,
    position: 'absolute',
    bottom: '5%',
    left: '10%',
  },
  bikeWheel2: {
    width: '30%',
    height: '30%',
    borderRadius: 999,
    position: 'absolute',
    bottom: '5%',
    right: '10%',
  },
});











