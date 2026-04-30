import React from 'react';
import { Keyboard } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import LocationPicker, { LocationData } from '@components/common/LocationPicker';
import { normalize, wp, hp } from '@utils/responsive';

const LocationPickerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { title, onLocationSelect, initialLocation } = route.params as {
    title?: string;
    onLocationSelect: (location: LocationData) => void;
    initialLocation?: LocationData;
  };

  const handleLocationSelect = (location: LocationData) => {
    Keyboard.dismiss();
    navigation.goBack();
    if (onLocationSelect) {
      setTimeout(() => onLocationSelect(location), 150);
    }
  };

  return (
    <LocationPicker
      onLocationSelect={handleLocationSelect}
      initialLocation={initialLocation}
      title={title || 'Select Location'}
      onBack={() => navigation.goBack()}
    />
  );
};

export default LocationPickerScreen;
