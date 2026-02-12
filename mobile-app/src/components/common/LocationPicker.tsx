/**
 * LocationPicker Component
 * Uses OpenStreetMap with WebView for location selection
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { ArrowLeft, MapPin, Search, X } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { normalize } from '@utils/responsive';

export interface LocationData {
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  pincode?: string;
}

interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  initialLocation?: LocationData;
  title?: string;
  onBack?: () => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLocation,
  title = 'Select Location',
  onBack,
}) => {
  // Navigation is optional - can use onBack prop instead
  // const navigation = useNavigation<any>();
  
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [searching, setSearching] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 12.9716, lng: 77.5946 }); // Default: Bangalore

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address
      const address = await reverseGeocode(latitude, longitude);
      if (address) {
        setCurrentLocation(address);
        setMapCenter({ lat: latitude, lng: longitude });
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<LocationData | null> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Forlok-App/1.0',
        },
      });

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      if (!data || !data.address) {
        return null;
      }

      return {
        address: data.display_name || `${lat}, ${lng}`,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
        city: data.address.city || data.address.town || data.address.village,
        state: data.address.state,
        pincode: data.address.postcode,
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        lat,
        lng,
      };
    }
  };

  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=5&countrycodes=in`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Forlok-App/1.0',
        },
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      const results: LocationData[] = data.map((item: any) => ({
        address: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        city: item.address?.city || item.address?.town || item.address?.village,
        state: item.address?.state,
        pincode: item.address?.postcode,
      }));

      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search location. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleLocationSelect = (location: LocationData) => {
    onLocationSelect(location);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng);
    if (address) {
      handleLocationSelect(address);
    }
  };

  // OpenStreetMap HTML with Leaflet
  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${mapCenter.lat}, ${mapCenter.lng}], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);
        
        let marker = L.marker([${mapCenter.lat}, ${mapCenter.lng}], { draggable: true }).addTo(map);
        
        marker.on('dragend', function(e) {
          const position = marker.getLatLng();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'location',
            lat: position.lat,
            lng: position.lng
          }));
        });
        
        map.on('click', function(e) {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          marker.setLatLng([lat, lng]);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'location',
            lat: lat,
            lng: lng
          }));
        });
        
        // Center on user location if available
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            map.setView([lat, lng], 13);
            marker.setLatLng([lat, lng]);
          });
        }
      </script>
    </body>
    </html>
  `;

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'location') {
        await handleMapClick(data.lat, data.lng);
      }
    } catch (error) {
      console.error('Error handling webview message:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (onBack) {
              onBack();
            }
          }} 
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search location..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchLocation(text);
          }}
          placeholderTextColor={COLORS.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
            }}
            style={styles.clearButton}
          >
            <X size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <View style={styles.searchResults}>
          {searchResults.map((result, index) => (
            <TouchableOpacity
              key={index}
              style={styles.resultItem}
              onPress={() => handleLocationSelect(result)}
            >
              <MapPin size={18} color={COLORS.primary} />
              <View style={styles.resultText}>
                <Text style={styles.resultAddress}>{result.address}</Text>
                {result.city && (
                  <Text style={styles.resultDetails}>{result.city}, {result.state}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Current Location Button */}
      {currentLocation && (
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={() => handleLocationSelect(currentLocation)}
        >
          <MapPin size={18} color={COLORS.white} />
          <Text style={styles.currentLocationText}>Use Current Location</Text>
        </TouchableOpacity>
      )}

      {/* Map */}
      {!loading && (
        <WebView
          ref={webViewRef}
          source={{ html: mapHTML }}
          style={styles.map}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  placeholder: {
    width: normalize(40),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  searchResults: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: normalize(200),
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  resultAddress: {
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  resultDetails: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  currentLocationText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
    marginLeft: SPACING.xs,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
});

export default LocationPicker;
