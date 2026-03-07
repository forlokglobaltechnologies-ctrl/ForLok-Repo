/**
 * LocationPicker Component — Production-grade, 100% free
 *
 * Search:  Open-Meteo Geocoding API — free, fast, no API key needed
 * Fallback: Nominatim (1 req/s limit) — only used if Open-Meteo is down
 * Reverse:  Photon (primary) → Nominatim (fallback) — single call per tap
 * Map:      Leaflet + OpenStreetMap tiles in WebView
 * GPS:      expo-location (device native)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Keyboard,
  Platform,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { ArrowLeft, MapPin, Search, X, Navigation, Check, Crosshair } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { normalize, wp, hp } from '@utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { AppLoader } from '@components/common/AppLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOCATION_ACCENT = '#F99E3C';

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
  const [searchFocused, setSearchFocused] = useState(false);

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
        if (!initialLocation) {
          moveMapTo(latitude, longitude, 14);
        }
      }
    } catch (error) {
      console.warn('[LocationPicker] GPS unavailable:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Reverse geocoding: Photon (primary) → Nominatim (fallback) ──
  const reverseGeocode = async (lat: number, lng: number): Promise<LocationData | null> => {
    try {
      const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&limit=1`;
      const photonResp = await fetch(photonUrl, {
        headers: { 'User-Agent': 'Forlok-App/1.0' },
      });
      if (photonResp.ok) {
        const photonData = await photonResp.json();
        const feature = photonData?.features?.[0];
        if (feature?.properties) {
          const p = feature.properties;
          const parts = [p.name, p.street, p.city || p.town || p.village, p.state].filter(Boolean);
          return {
            address: parts.join(', ') || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            lat,
            lng,
            city: p.city || p.town || p.village || p.county,
            state: p.state,
            pincode: p.postcode,
          };
        }
      }
    } catch (_) {}

    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}` +
        `&format=json&addressdetails=1&zoom=18`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Forlok-App/1.0' },
      });

      if (!response.ok) {
        return { address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, lat, lng };
      }

      const data = await response.json();
      if (!data || !data.address) return null;

      return {
        address: data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
        city:
          data.address.city || data.address.town || data.address.village || data.address.county,
        state: data.address.state,
        pincode: data.address.postcode,
      };
    } catch (error) {
      return { address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, lat, lng };
    }
  };

  // ─── Forward search: Open-Meteo (primary) → Nominatim (fallback) ──
  const performSearch = useCallback(async (query: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    setSearching(true);

    try {
      const encodedQuery = encodeURIComponent(query);
      const meteoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodedQuery}&count=6&language=en&format=json`;
      const response = await fetch(meteoUrl, {
        signal: abortRef.current.signal,
      });
      if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);

      const data = await response.json();
      const results: LocationData[] = (data.results || []).map((item: any) => {
        const parts = [item.name, item.admin3, item.admin2, item.admin1, item.country].filter(Boolean);
        return {
          address: parts.join(', '),
          lat: item.latitude,
          lng: item.longitude,
          city: item.name || item.admin3 || item.admin2,
          state: item.admin1,
          pincode: undefined,
        };
      });
      setSearchResults(results);
    } catch (error: any) {
      if (error.name === 'AbortError') return;

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
      } catch (_) {}
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // ─── Move map marker + center ──────────────────────────────
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

  const handleSearchResultSelect = useCallback((location: LocationData) => {
    setSelectedLocation(location);
    setSearchResults([]);
    setSearchQuery(location.city ? `${location.city}, ${location.state || ''}` : location.address);
    setSearchFocused(false);
    Keyboard.dismiss();
    moveMapTo(location.lat, location.lng, 15);
  }, [moveMapTo]);

  const handleMapTap = useCallback(async (lat: number, lng: number) => {
    setSelectedLocation({ address: 'Fetching address...', lat, lng });
    const address = await reverseGeocode(lat, lng);
    if (address) {
      setSelectedLocation(address);
    }
  }, []);

  const selectedLocationRef = useRef<LocationData | null>(selectedLocation);
  selectedLocationRef.current = selectedLocation;

  const confirmSelection = useCallback(() => {
    const loc = selectedLocationRef.current;
    if (loc && loc.address !== 'Fetching address...') {
      onLocationSelect(loc);
    }
  }, [onLocationSelect]);

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
        var map = L.map('map', { zoomControl: false }).setView([${mapCenter.lat}, ${mapCenter.lng}], 13);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '',
          maxZoom: 19
        }).addTo(map);

        var customIcon = L.divIcon({
          html: '<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="#1B2B4B"/><path d="M12 6.5c-1.38 0-2.5 1.12-2.5 2.5S10.62 11.5 12 11.5s2.5-1.12 2.5-2.5S13.38 6.5 12 6.5z" fill="white"/></svg></div>',
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        });

        var marker = L.marker([${mapCenter.lat}, ${mapCenter.lng}], { draggable: true, icon: customIcon }).addTo(map);

        function sendLocation(lat, lng) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'location', lat: lat, lng: lng }));
        }

        marker.on('dragend', function() {
          var pos = marker.getLatLng();
          sendLocation(pos.lat, pos.lng);
        });

        map.on('click', function(e) {
          marker.setLatLng([e.latlng.lat, e.latlng.lng]);
          sendLocation(e.latlng.lat, e.latlng.lng);
        });

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Hero Header with loc.png ── */}
      <View style={styles.heroContainer}>
        <Image
          source={require('../../../assets/loc.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(27,43,75,0.85)', 'rgba(27,43,75,0.6)', 'transparent']}
          style={styles.heroGradient}
        />
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleBlock}>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle}>Search or tap on the map to pick a location</Text>
          </View>
        </View>
      </View>

      {/* ── Floating Search Card ── */}
      <View style={styles.searchCard}>
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Search size={18} color={searchFocused ? LOCATION_ACCENT : '#9CA3AF'} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search city, area, or landmark..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            autoCorrect={false}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searching && (
            <AppLoader size="small" color={LOCATION_ACCENT} style={{ marginRight: 4 }} />
          )}
          {searchQuery.length > 0 && !searching && (
            <TouchableOpacity
              onPress={() => { setSearchQuery(''); setSearchResults([]); }}
              style={styles.clearButton}
            >
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick actions row */}
        {currentLocation && !searchResults.length && (
          <TouchableOpacity style={styles.quickLocationRow} onPress={useMyLocation} activeOpacity={0.7}>
            <View style={styles.quickLocationIcon}>
              <Crosshair size={16} color={LOCATION_ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickLocationTitle}>Use current location</Text>
              <Text style={styles.quickLocationAddr} numberOfLines={1}>
                {currentLocation.address}
              </Text>
            </View>
            <Navigation size={16} color={LOCATION_ACCENT} />
          </TouchableOpacity>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <FlatList
            data={searchResults}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            style={styles.resultsList}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[styles.resultItem, index === searchResults.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => handleSearchResultSelect(item)}
                activeOpacity={0.6}
              >
                <View style={styles.resultPinWrapper}>
                  <MapPin size={16} color={LOCATION_ACCENT} />
                </View>
                <View style={styles.resultText}>
                  <Text style={styles.resultAddress} numberOfLines={2}>
                    {item.address}
                  </Text>
                  {item.city && (
                    <Text style={styles.resultDetails}>
                      {item.city}{item.state ? `, ${item.state}` : ''}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* ── Map ── */}
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
              <AppLoader size="large" color={LOCATION_ACCENT} />
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          )}
        />
      ) : (
        <View style={styles.loadingContainer}>
          <AppLoader size="large" color={LOCATION_ACCENT} />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      )}

      {/* ── GPS re-center FAB ── */}
      {currentLocation && mapReady && (
        <TouchableOpacity style={styles.gpsFab} onPress={useMyLocation} activeOpacity={0.8}>
          <Crosshair size={20} color={LOCATION_ACCENT} />
        </TouchableOpacity>
      )}

      {/* ── Bottom Confirm Card ── */}
      {selectedLocation && (
        <View style={styles.confirmCard}>
          <View style={styles.confirmHandle} />
          <View style={styles.confirmRow}>
            <View style={styles.confirmPinBadge}>
              <MapPin size={18} color="#fff" />
            </View>
            <View style={styles.confirmInfo}>
              <Text style={styles.confirmLabel}>Selected Location</Text>
              <Text style={styles.confirmAddress} numberOfLines={2}>
                {selectedLocation.address}
              </Text>
              {selectedLocation.city && (
                <Text style={styles.confirmCity}>
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
              selectedLocation.address === 'Fetching address...' && styles.confirmButtonDisabled,
            ]}
            onPress={confirmSelection}
            disabled={selectedLocation.address === 'Fetching address...'}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#F99E3C', '#E08E35']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.confirmButtonGradient}
            >
              <Check size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirm Location</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },

  // Hero header
  heroContainer: {
    height: hp(22),
    minHeight: normalize(160),
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 40 : 50,
    paddingHorizontal: SPACING.md,
  },
  backButton: {
    width: normalize(38),
    height: normalize(38),
    borderRadius: normalize(19),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    marginTop: SPACING.sm,
  },
  heroTitle: {
    fontSize: normalize(22),
    fontFamily: FONTS.bold,
    color: '#fff',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    fontSize: normalize(12),
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // Floating search card
  searchCard: {
    marginHorizontal: SPACING.md,
    marginTop: -normalize(28),
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.lg,
    elevation: 8,
    zIndex: 20,
    overflow: 'hidden',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? normalize(12) : normalize(6),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBarFocused: {
    borderBottomColor: LOCATION_ACCENT,
  },
  searchInput: {
    flex: 1,
    fontSize: normalize(14),
    color: '#1F2937',
    fontFamily: FONTS.regular,
    marginLeft: SPACING.sm,
    paddingVertical: Platform.OS === 'ios' ? 0 : 4,
  },
  clearButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },

  // Quick use-current-location row
  quickLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: normalize(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  quickLocationIcon: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    backgroundColor: `${LOCATION_ACCENT}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  quickLocationTitle: {
    fontSize: normalize(13),
    fontFamily: FONTS.medium,
    color: LOCATION_ACCENT,
  },
  quickLocationAddr: {
    fontSize: normalize(11),
    fontFamily: FONTS.regular,
    color: '#9CA3AF',
    marginTop: 1,
  },

  // Search results
  resultsList: {
    maxHeight: normalize(220),
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: normalize(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  resultPinWrapper: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(14),
    backgroundColor: `${LOCATION_ACCENT}12`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  resultText: {
    flex: 1,
  },
  resultAddress: {
    fontSize: normalize(13),
    fontFamily: FONTS.regular,
    color: '#1F2937',
    lineHeight: normalize(18),
  },
  resultDetails: {
    fontSize: normalize(11),
    fontFamily: FONTS.regular,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Map
  map: {
    flex: 1,
    zIndex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: normalize(13),
    color: '#6B7280',
    fontFamily: FONTS.regular,
  },

  // GPS FAB
  gpsFab: {
    position: 'absolute',
    right: SPACING.md,
    bottom: normalize(180),
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(22),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
    elevation: 6,
    zIndex: 10,
  },

  // Bottom confirm card
  confirmCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: normalize(20),
    borderTopRightRadius: normalize(20),
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? normalize(34) : SPACING.md,
    ...SHADOWS.lg,
    elevation: 12,
    zIndex: 20,
  },
  confirmHandle: {
    width: normalize(36),
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  confirmPinBadge: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(10),
    backgroundColor: LOCATION_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  confirmInfo: {
    flex: 1,
  },
  confirmLabel: {
    fontSize: normalize(11),
    fontFamily: FONTS.medium,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  confirmAddress: {
    fontSize: normalize(14),
    fontFamily: FONTS.medium,
    color: '#1F2937',
    lineHeight: normalize(20),
  },
  confirmCity: {
    fontSize: normalize(11),
    fontFamily: FONTS.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  confirmButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: normalize(14),
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: normalize(16),
    fontFamily: FONTS.bold,
    letterSpacing: 0.3,
  },
});

export default LocationPicker;
