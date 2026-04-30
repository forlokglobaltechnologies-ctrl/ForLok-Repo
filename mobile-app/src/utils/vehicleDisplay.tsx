import React from 'react';
import { Bike } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/** Bike & scooty only in-app; legacy API values like `car` use the bike icon. */
export function VehicleTypeIcon({
  type,
  size = 20,
  color,
}: {
  type?: string | null;
  size?: number;
  color: string;
}) {
  const t = (type || 'bike').toLowerCase();
  if (t === 'scooty' || t === 'scooter') {
    return <MaterialCommunityIcons name="moped" size={size} color={color} />;
  }
  return <Bike size={size} color={color} />;
}
