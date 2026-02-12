/**
 * LocationPicker Component — Production-grade, 100% free
 *
 * Search:  Photon (photon.komoot.io) — fast OSM geocoder, no harsh rate limits
 * Fallback: Nominatim (1 req/s limit) — only used if Photon is down
 * Reverse:  Nominatim — single call per tap, well within rate limit
 * Map:      Leaflet + OpenStreetMap tiles in WebView
 * GPS:      expo-location (device native)
 *
 * Key improvements over previous version:
 *  - 500 ms debounce on search (prevents rate-limit errors)
 *  - AbortController cancels stale in-flight requests
 *  - Confirm bar: user sees address before committing
 *  - Search result moves map marker (doesn't immediately navigate back)
 *  - GPS failure is graceful (no blocking alert)
 *  - Loading spinner inside search bar while fetching
 *  - FlatList with keyboardShouldPersistTaps for smooth UX
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  FlatList,
  Keyboard,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { ArrowLeft, MapPin, Search, X, Navigation, Check } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';

// ─── Public types (unchanged — consumed by 6+ files) ─────────
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

// ─── Debounce hook ────────────────────────────────────────────
function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Component ────────────────────────────────────────────────
const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLocation,
  title = 'Select Location',
  onBack,
}) => {
  // --- State ---
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    initialLocation || null,
  );
  const [mapReady, setMapReady] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const abortRef = useRef<AbortController | null>(null);

  const defaultCenter = initialLocation
    ? { lat: initialLocation.lat, lng: initialLocation.lng }
    : { lat: 20.5937, lng: 78.9629 }; // India center fallback

  const [mapCenter] = useState(defaultCenter);

  // --- Debounced search trigger (500 ms) ---
  const debouncedQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // ─── GPS: get current device location ──────────────────────
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[LocationPicker] Location permission denied');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      const address = await reverseGeocode(latitude, longitude);
      if (address) {
        setCurrentLocation(address);
        // Move map to current location if no initial location was provided
        if (!initialLocation) {
          moveMapTo(latitude, longitude, 14);
        }
      }
    } catch (error) {
      // GPS may fail on emulators or when location services are off.
      // Don't block the user — silently fall back to default map center.
      console.warn('[LocationPicker] GPS unavailable:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Reverse geocoding (Nominatim) — single call per tap ──
  const reverseGeocode = async (lat: number, lng: number): Promise<LocationData | null> => {
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}` +
        `&format=json&addressdetails=1&zoom=18`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Forlok-App/1.0' },
      });

      if (!response.ok) {
        throw new Error(`Reverse geocode HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data || !data.address) return null;

      return {
        address: data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
        city:
          data.address.city ||
          data.address.town ||
          data.address.village ||
          data.address.county,
        state: data.address.state,
        pincode: data.address.postcode,
      };
    } catch (error) {
      console.error('[LocationPicker] Reverse geocoding error:', error);
      // Return raw coordinates so the user isn't blocked
      return { address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, lat, lng };
    }
  };

  // ─── Forward search: Photon (primary) → Nominatim (fallback) ──
  const performSearch = useCallback(async (query: string) => {
    // Cancel any in-flight request to avoid stale results
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setSearching(true);
    try {
      const encodedQuery = encodeURIComponent(query);

      // PRIMARY: Photon — fast, free, OSM data, no harsh rate limits
      // Bias towards India (lat=20.5, lon=78.9)
      const photonUrl =
        `https://photon.komoot.io/api/?q=${encodedQuery}&limit=6&lang=en&lat=20.5&lon=78.9`;

      const response = await fetch(photonUrl, {
        signal: abortRef.current.signal,
        headers: { 'User-Agent': 'Forlok-App/1.0' },
      });

      if (!response.ok) {
        throw new Error(`Photon HTTP ${response.status}`);
      }

      const data = await response.json();
      const results: LocationData[] = (data.features || [])
        .filter((f: any) => f.geometry?.coordinates)
        .map((feature: any) => {
          const props = feature.properties || {};
          const [lng, lat] = feature.geometry.coordinates;
          // Build a human-readable address from structured fields
          const parts = [
            props.name,
            props.street,
            props.city || props.town || props.village,
            props.state,
            props.country,
          ].filter(Boolean);
          return {
            address: parts.join(', ') || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            lat,
            lng,
            city: props.city || props.town || props.village || props.county,
            state: props.state,
            pincode: props.postcode,
          };
        });

      setSearchResults(results);
    } catch (error: any) {
      // AbortError means the request was cancelled because the user typed more — ignore
      if (error.name === 'AbortError') return;

      console.warn('[LocationPicker] Photon search failed, trying Nominatim fallback:', error);

      // FALLBACK: Nominatim (1 req/s limit, but only reached if Photon is down)
      try {
        const nominatimUrl =
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
          `&format=json&limit=5&countrycodes=in&addressdetails=1`;
        const fallbackResp = await fetch(nominatimUrl, {
          headers: { 'User-Agent': 'Forlok-App/1.0' },
        });
        if (fallbackResp.ok) {
          const fallbackData = await fallbackResp.json();
          const results: LocationData[] = fallbackData.map((item: any) => ({
            address: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            city: item.address?.city || item.address?.town || item.address?.village,
            state: item.address?.state,
            pincode: item.address?.postcode,
          }));
          setSearchResults(results);
          return;
        }
      } catch (_) {
        /* both providers failed */
      }

      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // ─── Move map marker + center via JS injection ─────────────
  const moveMapTo = useCallback((lat: number, lng: number, zoom?: number) => {
    const js = `
      if (typeof marker !== 'undefined' && typeof map !== 'undefined') {
        marker.setLatLng([${lat}, ${lng}]);
        map.setView([${lat}, ${lng}], ${zoom || 15});
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  // ─── Search result tap: show on map, DON'T navigate back yet ─
  const handleSearchResultSelect = useCallback((location: LocationData) => {
    setSelectedLocation(location);
    setSearchResults([]);
    setSearchQuery(location.city ? `${location.city}, ${location.state || ''}` : location.address);
    Keyboard.dismiss();
    moveMapTo(location.lat, location.lng, 15);
  }, [moveMapTo]);

  // ─── Map tap: move pin + reverse geocode ───────────────────
  const handleMapTap = useCallback(async (lat: number, lng: number) => {
    // Immediately show coordinates while reverse-geocoding
    setSelectedLocation({ address: 'Fetching address…', lat, lng });

    const address = await reverseGeocode(lat, lng);
    if (address) {
      setSelectedLocation(address);
    }
  }, []);

  // ─── Confirm button: commit the selection ──────────────────
  const confirmSelection = useCallback(() => {
    if (selectedLocation && selectedLocation.address !== 'Fetching address…') {
      onLocationSelect(selectedLocation);
    }
  }, [selectedLocation, onLocationSelect]);

  // ─── Use current GPS location ──────────────────────────────
  const useMyLocation = useCallback(() => {
    if (currentLocation) {
      setSelectedLocation(currentLocation);
      moveMapTo(currentLocation.lat, currentLocation.lng, 15);
    }
  }, [currentLocation, moveMapTo]);

  // ─── Leaflet map HTML ──────────────────────────────────────
  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #map { width: 100%; height: 100%; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: true }).setView([${mapCenter.lat}, ${mapCenter.lng}], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        var marker = L.marker([${mapCenter.lat}, ${mapCenter.lng}], { draggable: true }).addTo(map);

        function sendLocation(lat, lng) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'location',
            lat: lat,
            lng: lng
          }));
        }

        marker.on('dragend', function() {
          var pos = marker.getLatLng();
          sendLocation(pos.lat, pos.lng);
        });

        map.on('click', function(e) {
          marker.setLatLng([e.latlng.lat, e.latlng.lng]);
          sendLocation(e.latlng.lat, e.latlng.lng);
        });

        // Tell RN the map is ready
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
      <\/script>
    </body>
    </html>
  `;

  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setMapReady(true);
        // If initial location was provided, move marker there
        if (initialLocation) {
          moveMapTo(initialLocation.lat, initialLocation.lng, 15);
        }
      } else if (data.type === 'location') {
        await handleMapTap(data.lat, data.lng);
      }
    } catch (error) {
      console.error('[LocationPicker] WebView message error:', error);
    }
  }, [initialLocation, moveMapTo, handleMapTap]);

  // ─── Render ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
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
          placeholder="Search city, area, or landmark…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.textSecondary}
          returnKeyType="search"
          autoCorrect={false}
        />
        {searching && (
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={{ marginRight: SPACING.xs }}
          />
        )}
        {searchQuery.length > 0 && !searching && (
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

      {/* Search Results Dropdown */}
      {searchResults.length > 0 && (
        <View style={styles.searchResults}>
          <FlatList
            data={searchResults}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSearchResultSelect(item)}
                activeOpacity={0.7}
              >
                <MapPin size={18} color={COLORS.primary} />
                <View style={styles.resultText}>
                  <Text style={styles.resultAddress} numberOfLines={2}>
                    {item.address}
                  </Text>
                  {item.city && (
                    <Text style={styles.resultDetails}>
                      {item.city}
                      {item.state ? `, ${item.state}` : ''}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Current Location Button */}
      {currentLocation && (
        <TouchableOpacity style={styles.currentLocationButton} onPress={useMyLocation}>
          <Navigation size={18} color={COLORS.white} />
          <Text style={styles.currentLocationText}>Use Current Location</Text>
        </TouchableOpacity>
      )}

      {/* Map */}
      {!loading ? (
        <WebView
          ref={webViewRef}
          source={{ html: mapHTML }}
          style={styles.map}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading map…</Text>
            </View>
          )}
        />
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Getting your location…</Text>
        </View>
      )}

      {/* Bottom Confirm Bar */}
      {selectedLocation && (
        <View style={styles.confirmBar}>
          <View style={styles.confirmAddressRow}>
            <MapPin size={18} color={COLORS.primary} style={{ marginTop: 2 }} />
            <View style={styles.confirmAddressContent}>
              <Text style={styles.confirmAddressText} numberOfLines={2}>
                {selectedLocation.address}
              </Text>
              {selectedLocation.city && (
                <Text style={styles.confirmCityText}>
                  {selectedLocation.city}
                  {selectedLocation.state ? `, ${selectedLocation.state}` : ''}
                  {selectedLocation.pincode ? ` - ${selectedLocation.pincode}` : ''}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              selectedLocation.address === 'Fetching address…' && styles.confirmButtonDisabled,
            ]}
            onPress={confirmSelection}
            disabled={selectedLocation.address === 'Fetching address…'}
            activeOpacity={0.8}
          >
            <Check size={20} color={COLORS.white} />
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────
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

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
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
    paddingVertical: Platform.OS === 'ios' ? 0 : SPACING.xs,
  },
  clearButton: {
    padding: SPACING.xs,
  },

  // Search results dropdown
  searchResults: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 240,
    ...SHADOWS.md,
    zIndex: 10,
    elevation: 5,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    lineHeight: 20,
  },
  resultDetails: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Current location
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  currentLocationText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.medium,
    marginLeft: SPACING.xs,
  },

  // Map
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

  // Bottom confirm bar
  confirmBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.lg,
    elevation: 8,
  },
  confirmAddressRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: SPACING.sm,
  },
  confirmAddressContent: {
    flex: 1,
    marginLeft: SPACING.xs,
  },
  confirmAddressText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    lineHeight: 18,
  },
  confirmCityText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.medium,
    fontWeight: '600',
  },
});

export default LocationPicker;
