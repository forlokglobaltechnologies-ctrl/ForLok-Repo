import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import LocationPicker, { LocationData } from '@components/common/LocationPicker';

const LocationPickerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { title, onLocationSelect, initialLocation } = route.params as {
    title?: string;
    onLocationSelect: (location: LocationData) => void;
    initialLocation?: LocationData;
  };

  const handleLocationSelect = (location: LocationData) => {
    if (onLocationSelect) {
      onLocationSelect(location);
    }
    navigation.goBack();
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
