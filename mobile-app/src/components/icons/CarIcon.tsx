import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '@constants/theme';

interface CarIconProps {
  size?: number;
  color?: string;
  variant?: 'car' | 'bike';
}

export const CarIcon: React.FC<CarIconProps> = ({
  size = 40,
  color = COLORS.primary,
  variant = 'car',
}) => {
  if (variant === 'bike') {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View style={[styles.bikeBody, { backgroundColor: color, opacity: 0.3 }]} />
        <View style={[styles.bikeWheel1, { backgroundColor: color, opacity: 0.5 }]} />
        <View style={[styles.bikeWheel2, { backgroundColor: color, opacity: 0.5 }]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.carBody, { backgroundColor: color, opacity: 0.3 }]} />
      <View style={[styles.carWindow, { backgroundColor: color, opacity: 0.2 }]} />
      <View style={[styles.carWheel1, { backgroundColor: color, opacity: 0.5 }]} />
      <View style={[styles.carWheel2, { backgroundColor: color, opacity: 0.5 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  carBody: {
    width: '80%',
    height: '50%',
    borderRadius: 8,
    position: 'absolute',
    top: '25%',
  },
  carWindow: {
    width: '40%',
    height: '25%',
    borderRadius: 4,
    position: 'absolute',
    top: '30%',
    left: '30%',
  },
  carWheel1: {
    width: '20%',
    height: '20%',
    borderRadius: 999,
    position: 'absolute',
    bottom: '10%',
    left: '15%',
  },
  carWheel2: {
    width: '20%',
    height: '20%',
    borderRadius: 999,
    position: 'absolute',
    bottom: '10%',
    right: '15%',
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











