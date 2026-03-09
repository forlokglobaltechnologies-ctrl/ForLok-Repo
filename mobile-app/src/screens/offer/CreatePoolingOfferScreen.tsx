import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, MapPin, Calendar, Clock, ChevronDown, ChevronRight, Car, Bike, ArrowUpDown } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { normalize } from '@utils/responsive';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@context/LanguageContext';
import { useSnackbar } from '@context/SnackbarContext';
import { poolingApi, vehicleApi } from '@utils/apiClient';
import { LocationData } from '@components/common/LocationPicker';
import { getUserErrorMessage } from '@utils/errorUtils';
import { WebView } from 'react-native-webview';

interface RouteAlternative {
  routeId: string;
  distanceKm: number;
  durationMin: number;
  polyline: Array<{ lat: number; lng: number; index: number }>;
}

const buildRouteAlternativesMapHtml = (
  routes: RouteAlternative[],
  selectedRouteId: string | null,
  fromLocation: LocationData | null,
  toLocation: LocationData | null
) => {
  const safeRoutes = JSON.stringify(routes).replace(/</g, '\\u003c');
  const safeSelectedRouteId = JSON.stringify(selectedRouteId);
  const safeFrom = JSON.stringify(
    fromLocation ? { lat: fromLocation.lat, lng: fromLocation.lng } : null
  );
  const safeTo = JSON.stringify(toLocation ? { lat: toLocation.lat, lng: toLocation.lng } : null);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #f3f4f6;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const routes = ${safeRoutes};
    const selectedRouteId = ${safeSelectedRouteId};
    const fromPoint = ${safeFrom};
    const toPoint = ${safeTo};
    const colors = ['#D47B1B', '#FFB55A', '#64748B'];

    const firstPoint = routes?.[0]?.polyline?.[0];
    const map = L.map('map', { zoomControl: false }).setView(
      firstPoint ? [firstPoint.lat, firstPoint.lng] : [16.5, 80.6],
      8
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    const boundsPoints = [];
    routes.forEach((route, idx) => {
      const latLngs = (route.polyline || []).map((p) => [p.lat, p.lng]);
      if (latLngs.length === 0) return;

      latLngs.forEach((pt) => boundsPoints.push(pt));
      const isSelected = route.routeId === selectedRouteId;
      const polyline = L.polyline(latLngs, {
        color: isSelected ? '#B85E00' : (colors[idx % colors.length] || '#94A3B8'),
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.95 : 0.55
      }).addTo(map);

      polyline.on('click', () => {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'route_select', routeId: route.routeId })
          );
        }
      });

      if (isSelected) {
        polyline.bringToFront();
      }
    });

    if (fromPoint) {
      const marker = L.circleMarker([fromPoint.lat, fromPoint.lng], {
        radius: 7,
        color: '#16A34A',
        fillColor: '#22C55E',
        fillOpacity: 0.95
      }).addTo(map);
      boundsPoints.push([fromPoint.lat, fromPoint.lng]);
      marker.bindTooltip('From');
    }

    if (toPoint) {
      const marker = L.circleMarker([toPoint.lat, toPoint.lng], {
        radius: 7,
        color: '#B91C1C',
        fillColor: '#EF4444',
        fillOpacity: 0.95
      }).addTo(map);
      boundsPoints.push([toPoint.lat, toPoint.lng]);
      marker.bindTooltip('To');
    }

    if (boundsPoints.length > 0) {
      map.fitBounds(boundsPoints, { padding: [24, 24] });
    }
  </script>
</body>
</html>
`;
};

const CreatePoolingOfferScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { showSnackbar } = useSnackbar();
  
  // ── All state declarations FIRST ──
  const [documentsUploaded, setDocumentsUploaded] = useState(false);
  const [isCheckingDocuments, setIsCheckingDocuments] = useState(true);
  const [allVehicles, setAllVehicles] = useState<any[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [lockedVehicleIds, setLockedVehicleIds] = useState<Set<string>>(new Set());
  const [driverOffers, setDriverOffers] = useState<any[]>([]);
  const [fromLocation, setFromLocation] = useState<LocationData | null>(null);
  const [toLocation, setToLocation] = useState<LocationData | null>(null);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [vehicleType, setVehicleType] = useState<'Car' | 'Bike' | 'Scooty' | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [availableSeats, setAvailableSeats] = useState(1);
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [waypoints, setWaypoints] = useState<LocationData[]>([]);
  const [minRequired, setMinRequired] = useState(0);
  const [routeDistanceKm, setRouteDistanceKm] = useState(0);
  const [routeAlternatives, setRouteAlternatives] = useState<RouteAlternative[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeMapHtml, setRouteMapHtml] = useState('');
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [syncingAutoWaypoints, setSyncingAutoWaypoints] = useState(false);

  // ── Derived: filtered vehicles computed fresh every render ──
  const filteredVehicles = vehicleType
    ? allVehicles.filter((v: any) => {
        const vType = (v.type || '').toLowerCase();
        if (vehicleType === 'Scooty') return vType === 'scooty' || vType === 'scooter';
        return vType === vehicleType.toLowerCase();
      })
    : allVehicles;

  // ── Functions ──
  const loadVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const vehicleRes = await vehicleApi.getVehicles();
      if (vehicleRes.success && vehicleRes.data) {
        console.log('🚗 [CreatePooling] Loaded vehicles:', vehicleRes.data.map((v: any) => `${v.brand}(${v.type})`));
        setAllVehicles(vehicleRes.data);
      }
    } catch (error: any) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoadingVehicles(false);
    }
    // Load driver offers in background (non-blocking); lock calculation is time-window based.
    try {
      const offersRes = await poolingApi.getOffers();
      if (offersRes.success && offersRes.data) {
        setDriverOffers(Array.isArray(offersRes.data) ? offersRes.data : []);
      }
    } catch (err) {
      console.warn('Could not check locked vehicles:', err);
    }
  };

  const checkDocumentsStatus = async () => {
    try {
      setIsCheckingDocuments(true);
      console.log('🔍 Checking documents status for createPooling...');
      
      const { getUserDocuments, hasAllRequiredDocuments } = require('@utils/documentUtils');
      const existingDocuments = await getUserDocuments();
      console.log('📋 Existing documents:', existingDocuments);
      
      const hasAllDocuments = hasAllRequiredDocuments('createPooling', existingDocuments);
      console.log('✅ Has all required documents:', hasAllDocuments);
      
      if (!hasAllDocuments || !existingDocuments) {
        console.log('❌ Missing documents, navigating to DocumentVerification...');
        navigation.navigate('DocumentVerification' as never, {
          serviceType: 'createPooling',
          onComplete: () => {
            setDocumentsUploaded(true);
            setIsCheckingDocuments(false);
          },
        } as never);
      } else {
        console.log('✅ All documents present, allowing access to create pooling');
        setDocumentsUploaded(true);
        setIsCheckingDocuments(false);
      }
    } catch (error) {
      console.error('❌ Error checking documents:', error);
      navigation.navigate('DocumentVerification' as never, {
        serviceType: 'createPooling',
        onComplete: () => {
          setDocumentsUploaded(true);
          setIsCheckingDocuments(false);
        },
      } as never);
    }
  };

  // ── Effects ──
  useEffect(() => {
    checkDocumentsStatus();
  }, []);

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    const activeStatuses = ['active', 'pending', 'in_progress', 'booked'];
    const selectedRoute = routeAlternatives.find((route) => route.routeId === selectedRouteId);

    const candidateStart = new Date(date);
    candidateStart.setHours(time.getHours(), time.getMinutes(), 0, 0);
    if (Number.isNaN(candidateStart.getTime())) {
      setLockedVehicleIds(new Set());
      return;
    }

    const candidateDurationMin = (() => {
      if (selectedRoute?.durationMin && selectedRoute.durationMin > 0) {
        return Math.ceil(selectedRoute.durationMin);
      }
      const distanceKm = selectedRoute?.distanceKm || routeDistanceKm || 0;
      const speed = getVehicleAverageSpeedKmh(vehicleType || 'car');
      return Math.max(10, Math.ceil((Math.max(1, distanceKm) / speed) * 60));
    })();
    const candidateEnd = new Date(candidateStart.getTime() + (candidateDurationMin + 10) * 60 * 1000);

    const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
      aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();

    const lockedNumbers = new Set<string>(
      (driverOffers || [])
        .filter((offer: any) => activeStatuses.includes(offer?.status))
        .filter((offer: any) => {
          const offerStart = buildOfferStartDateTime(offer);
          if (!offerStart) return false;
          const offerDuration = estimateOfferDurationMinutes(offer?.route, offer?.vehicle?.type);
          const offerEnd = new Date(offerStart.getTime() + (offerDuration + 10) * 60 * 1000);
          return overlaps(candidateStart, candidateEnd, offerStart, offerEnd);
        })
        .map((offer: any) => offer?.vehicle?.number)
        .filter(Boolean)
    );

    setLockedVehicleIds(lockedNumbers);
  }, [driverOffers, date, time, selectedRouteId, routeAlternatives, routeDistanceKm, vehicleType]);

  const getMinWaypointCountByDistance = (distanceKm: number) => {
    if (distanceKm < 20) return 1;
    if (distanceKm < 80) return 2;
    if (distanceKm < 200) return 3;
    return 4;
  };

  const calculateDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const getVehicleAverageSpeedKmh = (type?: string | null) => {
    const t = (type || '').toLowerCase();
    if (t === 'bike') return 40;
    if (t === 'scooty' || t === 'scooter') return 35;
    return 45;
  };

  const parseTimeLabelToMinutes = (label?: string | null): number | null => {
    if (!label) return null;
    const cleaned = String(label).trim();
    if (!cleaned) return null;

    const match12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let hour = parseInt(match12[1], 10);
      const minute = parseInt(match12[2], 10);
      const ampm = match12[3].toUpperCase();
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
      if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
      if (ampm === 'AM') hour = hour === 12 ? 0 : hour;
      else hour = hour === 12 ? 12 : hour + 12;
      return hour * 60 + minute;
    }

    const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const hour = parseInt(match24[1], 10);
      const minute = parseInt(match24[2], 10);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
      return hour * 60 + minute;
    }

    return null;
  };

  const estimateOfferDurationMinutes = (routeLike: any, vehicleTypeLike?: string | null) => {
    const explicitDuration = Number(routeLike?.duration);
    if (Number.isFinite(explicitDuration) && explicitDuration > 0) {
      return Math.max(5, Math.ceil(explicitDuration));
    }

    let routeKm = Number(routeLike?.distance);
    if (!Number.isFinite(routeKm) || routeKm <= 0) {
      const from = routeLike?.from;
      const to = routeLike?.to;
      if (
        from &&
        to &&
        Number.isFinite(from.lat) &&
        Number.isFinite(from.lng) &&
        Number.isFinite(to.lat) &&
        Number.isFinite(to.lng)
      ) {
        routeKm = calculateDistanceKm(from.lat, from.lng, to.lat, to.lng);
      }
    }

    if (!Number.isFinite(routeKm) || routeKm <= 0) routeKm = 5;
    const speed = getVehicleAverageSpeedKmh(vehicleTypeLike);
    return Math.max(10, Math.ceil((routeKm / speed) * 60));
  };

  const buildOfferStartDateTime = (offer: any): Date | null => {
    if (!offer?.date) return null;
    const dt = new Date(offer.date);
    if (Number.isNaN(dt.getTime())) return null;
    const minutes = parseTimeLabelToMinutes(offer?.time);
    if (minutes !== null) {
      dt.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    }
    return dt;
  };

  const fetchRouteAlternatives = async (from: LocationData, to: LocationData) => {
    try {
      setLoadingRoutes(true);
      setRoutesError(null);
      setRouteAlternatives([]);
      setSelectedRouteId(null);

      const response: any = await poolingApi.getRouteAlternatives({
        fromLat: from.lat,
        fromLng: from.lng,
        toLat: to.lat,
        toLng: to.lng,
        maxAlternatives: 8,
      });

      const routes = response?.success ? response?.data?.routes : [];
      const normalizedRoutes: RouteAlternative[] = Array.isArray(routes)
        ? routes
            .filter((route: any) => Array.isArray(route?.polyline) && route.polyline.length >= 2)
            .map((route: any, idx: number) => ({
              routeId: route.routeId || `r${idx}`,
              distanceKm: Number(route.distanceKm || 0),
              durationMin: Number(route.durationMin || 0),
              polyline: route.polyline.map((point: any, pointIdx: number) => ({
                lat: Number(point.lat),
                lng: Number(point.lng),
                index: Number.isFinite(point.index) ? Number(point.index) : pointIdx,
              })),
            }))
        : [];

      if (normalizedRoutes.length === 0) {
        setRoutesError('No route alternatives available right now.');
        return;
      }

      setRouteAlternatives(normalizedRoutes);
      setSelectedRouteId(normalizedRoutes[0].routeId);
    } catch (error: any) {
      console.error('Failed to fetch route alternatives:', error);
      setRoutesError(error?.message || 'Unable to fetch route alternatives.');
    } finally {
      setLoadingRoutes(false);
    }
  };

  const syncAutoWaypointsForSelectedRoute = async () => {
    const selectedRoute = routeAlternatives.find((route) => route.routeId === selectedRouteId);
    if (!selectedRoute || !Array.isArray(selectedRoute.polyline) || selectedRoute.polyline.length < 2) {
      return;
    }

    try {
      setSyncingAutoWaypoints(true);
      const response: any = await poolingApi.suggestWaypointsFromPolyline({
        selectedPolyline: selectedRoute.polyline,
        intervalKm: 4,
        maxPoints: 120,
      });

      const list = response?.success ? response?.data?.waypoints : [];
      const normalizedWaypoints: LocationData[] = Array.isArray(list)
        ? list.map((wp: any, idx: number) => ({
            address: wp.address,
            lat: Number(wp.lat),
            lng: Number(wp.lng),
            city: wp.city,
          }))
        : [];

      if (typeof response?.data?.routeDistanceKm === 'number') {
        setRouteDistanceKm(response.data.routeDistanceKm);
      }
      if (typeof response?.data?.minRequired === 'number') {
        setMinRequired(response.data.minRequired);
      }

      setWaypoints(normalizedWaypoints);
    } catch (error: any) {
      console.error('Auto waypoint sync failed:', error);
      setWaypoints([]);
    } finally {
      setSyncingAutoWaypoints(false);
    }
  };

  useEffect(() => {
    if (fromLocation && toLocation) {
      setWaypoints([]);
      const dist = calculateDistanceKm(fromLocation.lat, fromLocation.lng, toLocation.lat, toLocation.lng);
      const rounded = Math.round(dist);
      setRouteDistanceKm(rounded);
      setMinRequired(getMinWaypointCountByDistance(dist));
      fetchRouteAlternatives(fromLocation, toLocation);
    } else {
      setRouteDistanceKm(0);
      setMinRequired(0);
      setWaypoints([]);
      setRouteAlternatives([]);
      setSelectedRouteId(null);
      setRouteMapHtml('');
      setRoutesError(null);
    }
  }, [fromLocation?.lat, fromLocation?.lng, toLocation?.lat, toLocation?.lng]);

  useEffect(() => {
    const selectedRoute = routeAlternatives.find((route) => route.routeId === selectedRouteId);
    if (selectedRoute) {
      const rounded = Math.round(selectedRoute.distanceKm);
      setRouteDistanceKm(rounded);
      setMinRequired(getMinWaypointCountByDistance(selectedRoute.distanceKm));
    }
  }, [routeAlternatives, selectedRouteId]);

  useEffect(() => {
    if (!fromLocation || !toLocation || !selectedRouteId || routeAlternatives.length === 0) {
      return;
    }
    syncAutoWaypointsForSelectedRoute();
  }, [selectedRouteId, routeAlternatives.length, fromLocation?.lat, fromLocation?.lng, toLocation?.lat, toLocation?.lng]);

  useEffect(() => {
    if (!fromLocation || !toLocation || routeAlternatives.length === 0) {
      setRouteMapHtml('');
      return;
    }

    setRouteMapHtml(
      buildRouteAlternativesMapHtml(routeAlternatives, selectedRouteId, fromLocation, toLocation)
    );
  }, [
    fromLocation?.lat,
    fromLocation?.lng,
    toLocation?.lat,
    toLocation?.lng,
    routeAlternatives,
    selectedRouteId,
  ]);

  useEffect(() => {
    if (vehicleType !== 'Car' && availableSeats !== 1) {
      setAvailableSeats(1);
    }
  }, [vehicleType, availableSeats]);

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTime = (time: Date) => {
    let hours = time.getHours();
    const minutes = time.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const cleanFieldLabel = (label: string) => label.replace(/\s*\*+\s*/g, '').trim();

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const handleRouteMapMessage = (event: any) => {
    try {
      const payload = JSON.parse(event?.nativeEvent?.data || '{}');
      if (payload?.type === 'route_select' && typeof payload?.routeId === 'string') {
        const exists = routeAlternatives.some((route) => route.routeId === payload.routeId);
        if (exists) {
          setSelectedRouteId(payload.routeId);
        }
      }
    } catch (error) {
      console.warn('Invalid route map message:', error);
    }
  };

  const handleCreate = async () => {
    // Validation
    if (!fromLocation) {
      Alert.alert('Missing Information', 'Please select pickup location');
      return;
    }
    if (!toLocation) {
      Alert.alert('Missing Information', 'Please select destination');
      return;
    }
    if (!vehicleType) {
      Alert.alert('Missing Information', 'Please select vehicle type');
      return;
    }
    if (!selectedVehicle) {
      Alert.alert('Missing Information', 'Please select a vehicle');
      return;
    }

    const selectedRoute = routeAlternatives.find((route) => route.routeId === selectedRouteId);
    if (!selectedRoute || !Array.isArray(selectedRoute.polyline) || selectedRoute.polyline.length < 2) {
      Alert.alert('Route Selection Required', 'Please select one available route before creating offer.');
      return;
    }

    // Validate date+time is in the future
    const combinedDateTime = new Date(date);
    combinedDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);
    if (combinedDateTime.getTime() <= Date.now()) {
      Alert.alert('Invalid Date/Time', 'Please select a date and time in the future.');
      return;
    }

    // Hard validation: via points are mandatory based on route distance.
    if (minRequired > 0 && waypoints.length < minRequired) {
      Alert.alert(
        'Via Points Required',
        `For a ${routeDistanceKm} km route, at least ${minRequired} via point${minRequired > 1 ? 's are' : ' is'} required. You added ${waypoints.length}.`
      );
      return;
    }
    return proceedCreate();
  };

  const showCreateOfferErrorPopup = (message: string) => {
    Alert.alert('Unable to Create Offer', message, [{ text: 'OK' }]);
  };

  const proceedCreate = async () => {
    try {
      setCreating(true);
      const selectedRoute = routeAlternatives.find((route) => route.routeId === selectedRouteId);

      // Combine date and time
      const dateTime = new Date(date);
      dateTime.setHours(time.getHours());
      dateTime.setMinutes(time.getMinutes());
      dateTime.setSeconds(0);
      dateTime.setMilliseconds(0);

      // Prepare offer data
      const offerData: any = {
        route: {
          from: {
            address: fromLocation.address,
            lat: fromLocation.lat,
            lng: fromLocation.lng,
            city: fromLocation.city,
            state: fromLocation.state,
          },
          to: {
            address: toLocation.address,
            lat: toLocation.lat,
            lng: toLocation.lng,
            city: toLocation.city,
            state: toLocation.state,
          },
          selectedRouteId: selectedRoute?.routeId,
          selectedPolyline: selectedRoute?.polyline,
          distance: selectedRoute?.distanceKm,
          duration: selectedRoute?.durationMin,
        },
        date: dateTime.toISOString(),
        time: formatTime(time),
        vehicleId: selectedVehicle.vehicleId,
        availableSeats: parseInt(availableSeats.toString()),
        notes: notes || undefined,
      };

      if (waypoints.length > 0) {
        offerData.route.waypoints = waypoints.map((wp, idx) => ({
          address: wp.address,
          lat: wp.lat,
          lng: wp.lng,
          city: wp.city,
          order: idx,
        }));
      }

      console.log('Creating pooling offer:', offerData);

      const response = await poolingApi.createOffer(offerData);

      if (response.success) {
        Alert.alert(
          'Success',
          'Pooling offer created successfully!',
          [
            {
              text: 'View My Offers',
              onPress: () => navigation.navigate('MyOffers' as never),
            },
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        const message = getUserErrorMessage(response as any, 'Failed to create offer. Please try again.');
        showCreateOfferErrorPopup(message);
      }
    } catch (error: any) {
      console.error('Error creating offer:', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to create offer. Please try again.';
      showCreateOfferErrorPopup(message);
    } finally {
      setCreating(false);
    }
  };

  const handleFromLocationSelect = (location: LocationData) => {
    setFromLocation(location);
  };

  const handleToLocationSelect = (location: LocationData) => {
    setToLocation(location);
  };

  const handleSwapLocations = () => {
    const from = fromLocation;
    const to = toLocation;
    setFromLocation(to);
    setToLocation(from);
  };

  // Show loading while checking documents
  if (isCheckingDocuments || !documentsUploaded) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View style={styles.stickyHeader}>
        <TouchableOpacity style={styles.heroBackButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.heroTitle}>Give a Ride</Text>
        <View style={styles.heroRightSpacer} />
      </View>
      <View style={styles.taglineBar}>
        <Text style={styles.taglineText}>Start a Shared Trip</Text>
      </View>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Form Fields */}
          <View style={styles.formContainer}>
            <View style={styles.routeSectionPlain}>
              <View style={styles.googleLikeRouteWrap}>
                <View style={styles.routeMarkersCol}>
                  <View style={styles.blueDotOuter}>
                    <View style={styles.blueDotInner} />
                  </View>
                  <View style={styles.routeDashedConnector} />
                  <MapPin size={14} color="#E11D48" />
                </View>

                <View style={styles.googleInputsCol}>
                  <TouchableOpacity
                    style={styles.mapsInputRow}
                    onPress={() =>
                      navigation.navigate('LocationPicker' as never, {
                        title: 'Select Pickup Location',
                        onLocationSelect: handleFromLocationSelect,
                        initialLocation: fromLocation || undefined,
                      } as never)
                    }
                  >
                    <Text
                      style={[
                        styles.mapsInputText,
                        !fromLocation && styles.mapsInputPlaceholder,
                        styles.inputTopBlueText,
                      ]}
                      numberOfLines={1}
                    >
                      {fromLocation?.address || 'Your location'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.mapsInputRow}
                    onPress={() =>
                      navigation.navigate('LocationPicker' as never, {
                        title: 'Select Destination',
                        onLocationSelect: handleToLocationSelect,
                        initialLocation: toLocation || undefined,
                      } as never)
                    }
                  >
                    <Text style={[styles.mapsInputText, !toLocation && styles.mapsInputPlaceholder]} numberOfLines={1}>
                      {toLocation?.address || 'Choose destination'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.swapRouteBtn} onPress={handleSwapLocations}>
                  <ArrowUpDown size={16} color="#334155" />
                </TouchableOpacity>
              </View>

              <View style={styles.modeIconRow}>
                <TouchableOpacity
                  style={[styles.modeIconBtn, vehicleType === 'Car' && styles.modeIconBtnSelected]}
                  onPress={() => setVehicleType('Car')}
                >
                  <Car size={16} color={vehicleType === 'Car' ? '#0F766E' : '#334155'} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeIconBtn, vehicleType === 'Bike' && styles.modeIconBtnSelected]}
                  onPress={() => {
                    setVehicleType('Bike');
                    setAvailableSeats(1);
                  }}
                >
                  <Bike size={16} color={vehicleType === 'Bike' ? '#0F766E' : '#334155'} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeIconBtn, vehicleType === 'Scooty' && styles.modeIconBtnSelected]}
                  onPress={() => {
                    setVehicleType('Scooty');
                    setAvailableSeats(1);
                  }}
                >
                  <MaterialCommunityIcons name="moped" size={17} color={vehicleType === 'Scooty' ? '#0F766E' : '#334155'} />
                </TouchableOpacity>
              </View>

              <View style={styles.topSectionDivider} />

              <View style={styles.waypointsSection}>
                {fromLocation && toLocation && (
                  <View style={styles.requiredViaBanner}>
                    <Text style={styles.requiredViaTitle}>
                      Route: {routeDistanceKm} km
                    </Text>
                    <Text style={styles.requiredViaText}>
                      Add at least {minRequired} via point{minRequired > 1 ? 's' : ''} for this route.
                    </Text>
                  </View>
                )}

                {fromLocation && toLocation && (
                  <View style={styles.routeSelectionSection}>
                    <Text style={styles.label}>Choose Route</Text>
                    {routeAlternatives.length > 0 ? (
                      <Text style={styles.routeCountText}>
                        {routeAlternatives.length} route option{routeAlternatives.length > 1 ? 's' : ''} found
                      </Text>
                    ) : null}
                    {syncingAutoWaypoints ? (
                      <Text style={styles.autoSyncText}>Auto-selecting via points from selected route...</Text>
                    ) : null}

                    {loadingRoutes ? (
                      <View style={styles.routeLoadingBox}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={styles.routeLoadingText}>Loading route options...</Text>
                      </View>
                    ) : (
                      <>
                        {routeMapHtml ? (
                          <View style={styles.routeMapCard}>
                            <WebView
                              originWhitelist={['*']}
                              source={{ html: routeMapHtml }}
                              style={styles.routeMap}
                              javaScriptEnabled
                              domStorageEnabled
                              scrollEnabled={false}
                              onMessage={handleRouteMapMessage}
                            />
                          </View>
                        ) : null}

                        {routeAlternatives.length > 0 ? (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.routeCardsRow}
                          >
                            {routeAlternatives.map((routeOption, idx) => {
                              const isSelected = selectedRouteId === routeOption.routeId;
                              return (
                                <TouchableOpacity
                                  key={routeOption.routeId}
                                  style={[
                                    styles.routeCard,
                                    isSelected && styles.routeCardSelected,
                                  ]}
                                  onPress={() => setSelectedRouteId(routeOption.routeId)}
                                >
                                  <Text style={styles.routeCardTitle}>
                                    Route {idx + 1} {isSelected ? '(Selected)' : ''}
                                  </Text>
                                  <Text style={styles.routeCardSubtext}>
                                    {Math.round(routeOption.distanceKm)} km • {Math.round(routeOption.durationMin)} min
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        ) : null}
                      </>
                    )}

                    {routesError ? <Text style={styles.routeErrorText}>{routesError}</Text> : null}

                  </View>
                )}

                {waypoints.length > 0 && (
                  <Text style={styles.label}>
                    Auto-selected Stops ({waypoints.length})
                  </Text>
                )}

                {waypoints.map((wp, idx) => (
                  <View key={idx} style={styles.waypointRow}>
                    <View style={styles.waypointDot}>
                      <View style={styles.waypointDotInner} />
                    </View>
                    <Text style={styles.waypointAddress} numberOfLines={1}>{wp.address}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Schedule</Text>
              </View>
              <View style={styles.scheduleRow}>
                <TouchableOpacity style={styles.scheduleCol} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.scheduleLabel}>{cleanFieldLabel(t('createPoolingOffer.date'))}</Text>
                  <View style={styles.scheduleSmallBox}>
                    <Calendar size={16} color={COLORS.textSecondary} />
                    <Text style={styles.scheduleSmallText} numberOfLines={1}>{formatDate(date)}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.scheduleCol} onPress={() => setShowTimePicker(true)}>
                  <Text style={styles.scheduleLabel}>{cleanFieldLabel(t('createPoolingOffer.time'))}</Text>
                  <View style={styles.scheduleSmallBox}>
                    <Clock size={16} color={COLORS.textSecondary} />
                    <Text style={styles.scheduleSmallText} numberOfLines={1}>{formatTime(time)}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
                is24Hour={false}
              />
            )}

            {vehicleType && (
              <View style={styles.sectionCard}>
                <View style={styles.vehicleSelectContainer}>
                  <Text style={styles.label}>Select Vehicle</Text>
                  {loadingVehicles ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.loadingText}>Loading vehicles...</Text>
                    </View>
                  ) : filteredVehicles.length === 0 ? (
                    <TouchableOpacity
                      style={styles.addVehicleButton}
                      onPress={() => navigation.navigate('AddVehicle' as never)}
                    >
                      <Text style={styles.addVehicleText}>+ Add {vehicleType}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.vehicleDropdown}
                      onPress={() => {
                        console.log(`🔽 Dropdown toggled: was=${showVehicleDropdown}, filtered=${filteredVehicles.length}, allVehicles=${allVehicles.length}`);
                        setShowVehicleDropdown(!showVehicleDropdown);
                      }}
                    >
                      <Text style={[styles.vehicleDropdownText, !selectedVehicle && styles.placeholderText]}>
                        {selectedVehicle
                          ? `${selectedVehicle.brand || 'Vehicle'} - ${selectedVehicle.number}`
                          : `Select a ${vehicleType.toLowerCase()}`}
                      </Text>
                      <ChevronDown size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}

                  {showVehicleDropdown && filteredVehicles.length > 0 && (
                    <View style={styles.vehicleDropdownList}>
                      {filteredVehicles.map((vehicle) => {
                        const isLocked = lockedVehicleIds.has(vehicle.number);
                        console.log(`📋 Dropdown item: ${vehicle.brand} - ${vehicle.number}, locked=${isLocked}`);
                        return (
                          <TouchableOpacity
                            key={vehicle.number || vehicle.vehicleId || vehicle._id}
                            style={[
                              styles.vehicleDropdownItem,
                              isLocked && styles.vehicleDropdownItemLocked,
                            ]}
                            disabled={isLocked}
                            onPress={() => {
                              setSelectedVehicle(vehicle);
                              setShowVehicleDropdown(false);
                              if (vehicleType !== 'Car') {
                                setAvailableSeats(1);
                              } else if (vehicle.seats && availableSeats > vehicle.seats) {
                                setAvailableSeats(vehicle.seats);
                              }
                            }}
                          >
                            <Text style={[styles.vehicleDropdownItemText, isLocked && { color: '#999' }]}>
                              {vehicle.brand || 'Vehicle'} - {vehicle.number || 'N/A'}
                            </Text>
                            {isLocked ? (
                              <Text style={styles.vehicleLockedText}>In active offer — not available</Text>
                            ) : vehicle.seats ? (
                              <Text style={styles.vehicleDropdownItemSubtext}>
                                {vehicle.seats} seats
                              </Text>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            )}

            {vehicleType === 'Car' && (
              <View style={styles.sectionCard}>
                <View style={styles.seatsContainer}>
                  <Text style={styles.label}>{cleanFieldLabel(t('createPoolingOffer.availableSeats'))}</Text>
                  <View style={styles.seatsRangeContainer}>
                    <View style={styles.seatsRangeRow}>
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <TouchableOpacity
                          key={num}
                          style={[
                            styles.seatRangeButton,
                            availableSeats === num && styles.seatRangeSelected,
                          ]}
                          onPress={() => {
                            setAvailableSeats(num);
                          }}
                        >
                          {availableSeats === num ? (
                            <LinearGradient
                              colors={['#F99E3C', '#E08E35']}
                              start={{ x: 0.5, y: 0 }}
                              end={{ x: 0.5, y: 1 }}
                              style={styles.seatRangeGradient}
                            >
                              <Text style={[styles.seatRangeText, styles.seatRangeTextSelected]}>{num}</Text>
                            </LinearGradient>
                          ) : (
                            <Text style={styles.seatRangeText}>
                              {num}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Additional Notes</Text>
              </View>
              <View style={styles.notesContainer}>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('createPoolingOffer.additionalNotes')}
                  placeholderTextColor={COLORS.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={styles.notesTextArea}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.85}
              style={[styles.createOfferBtn, creating && styles.createOfferBtnDisabled]}
            >
              <LinearGradient
                colors={['#F99E3C', '#E08E35']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.createOfferGradient}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createOfferText}>{t('createPoolingOffer.createOffer')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  stickyHeader: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: normalize(24),
    paddingBottom: normalize(10),
    borderBottomWidth: 1,
    borderBottomColor: '#E5EBF5',
    ...SHADOWS.sm,
    zIndex: 20,
  },
  taglineBar: {
    backgroundColor: '#EEF4FF',
    borderBottomWidth: 1,
    borderBottomColor: '#D6E4FF',
    paddingHorizontal: SPACING.md,
    paddingVertical: normalize(6),
  },
  taglineText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(11.5),
    color: '#1E3A8A',
    textAlign: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scrollContent: {
    paddingBottom: normalize(120),
    backgroundColor: '#F5F7FB',
  },
  heroBackButton: {
    paddingVertical: normalize(6),
    paddingRight: normalize(8),
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(19),
    fontWeight: '700',
    color: COLORS.text,
  },
  heroRightSpacer: { width: normalize(36), height: normalize(36) },
  formContainer: {
    padding: SPACING.md,
    paddingTop: normalize(8),
    gap: normalize(12),
    backgroundColor: '#F5F7FB',
  },
  sectionCard: {
    backgroundColor: '#FCFDFF',
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: '#E5EBF5',
    padding: normalize(12),
    ...SHADOWS.sm,
  },
  routeSectionPlain: {
    paddingTop: normalize(2),
  },
  sectionHeader: {
    marginBottom: normalize(6),
  },
  sectionTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(15),
    color: COLORS.text,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(11),
    color: '#6E7A8A',
    marginTop: normalize(2),
  },
  routeRowsWrap: {
    gap: normalize(8),
    marginBottom: normalize(8),
  },
  mapsInputsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
    marginBottom: normalize(10),
  },
  googleLikeRouteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
    marginBottom: normalize(10),
  },
  routeMarkersCol: {
    width: normalize(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueDotOuter: {
    width: normalize(11),
    height: normalize(11),
    borderRadius: normalize(6),
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueDotInner: {
    width: normalize(6),
    height: normalize(6),
    borderRadius: normalize(3),
    backgroundColor: '#D47B1B',
  },
  routeDashedConnector: {
    height: normalize(18),
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    borderLeftColor: '#94A3B8',
    marginVertical: normalize(3),
  },
  googleInputsCol: {
    flex: 1,
    gap: normalize(8),
  },
  mapsInputsLeft: {
    flex: 1,
    gap: normalize(8),
  },
  mapsInputRow: {
    minHeight: normalize(44),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: normalize(9),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: normalize(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
  },
  mapsDot: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
  },
  mapsDotFrom: {
    backgroundColor: '#D47B1B',
  },
  mapsInputText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: normalize(12.5),
    color: COLORS.text,
  },
  inputTopBlueText: {
    color: '#D47B1B',
  },
  mapsInputPlaceholder: {
    color: '#64748B',
  },
  swapRouteBtn: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    borderWidth: 1,
    borderColor: '#DDE6F5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: normalize(22),
  },
  modeIconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: normalize(12),
    marginBottom: normalize(6),
  },
  modeIconBtn: {
    width: normalize(44),
    height: normalize(30),
    borderRadius: normalize(15),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconBtnSelected: {
    backgroundColor: '#BFF4F0',
    borderColor: '#8BE7DF',
  },
  topSectionDivider: {
    marginTop: normalize(6),
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  locationTag: {
    borderRadius: normalize(8),
    paddingHorizontal: normalize(6),
    paddingVertical: normalize(2),
    marginRight: normalize(2),
  },
  locationTagFrom: {
    backgroundColor: '#DBEAFE',
  },
  locationTagTo: {
    backgroundColor: '#FEE2E2',
  },
  locationTagText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(9.5),
    letterSpacing: 0.3,
  },
  locationTagTextFrom: {
    color: '#B85E00',
  },
  locationTagTextTo: {
    color: '#B91C1C',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: normalize(50),
    paddingHorizontal: normalize(10),
    borderWidth: 1,
    borderColor: '#DDE6F5',
    borderRadius: normalize(10),
    backgroundColor: '#F7FAFF',
  },
  routeMarkerCol: {
    width: normalize(28),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: normalize(8),
  },
  routeIconBadge: {
    width: normalize(24),
    height: normalize(24),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeIconBadgeFrom: {
    backgroundColor: '#DCFCE7',
  },
  routeIconBadgeTo: {
    backgroundColor: '#FEE2E2',
  },
  routeTextWrap: {
    flex: 1,
  },
  routeRowLabel: {
    fontFamily: FONTS.medium,
    fontSize: normalize(10),
    color: COLORS.textSecondary,
  },
  routeRowValue: {
    marginTop: normalize(1),
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    color: COLORS.text,
  },
  routeRowPlaceholder: {
    color: COLORS.textSecondary,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: normalize(10),
  },
  scheduleCol: {
    flex: 1,
  },
  scheduleLabel: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    color: COLORS.textSecondary,
    marginBottom: normalize(5),
  },
  scheduleSmallBox: {
    height: normalize(42),
    borderWidth: 1,
    borderColor: '#DDE6F5',
    borderRadius: normalize(10),
    paddingHorizontal: normalize(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(7),
    backgroundColor: '#F7FAFF',
  },
  scheduleSmallText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: normalize(13),
    color: COLORS.text,
  },
  input: {
    marginBottom: SPACING.md,
  },
  cardInput: {
    marginBottom: normalize(10),
  },
  compactInput: {
    marginBottom: 0,
  },
  vehicleTypeContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: COLORS.text,
    marginBottom: normalize(6),
    fontWeight: '600',
  },
  vehicleTypeOptions: {
    flexDirection: 'row',
    gap: normalize(8),
  },
  vehicleTypeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(8),
    borderRadius: normalize(12),
    borderWidth: 1.4,
  },
  vehicleIconWrap: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: normalize(5),
  },
  vehicleTypeLabel: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    fontWeight: '600',
  },
  vehicleCheckDot: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    marginTop: normalize(6),
  },
  seatsContainer: {
    marginBottom: 0,
  },
  seatsRangeContainer: {
    marginTop: SPACING.xs,
  },
  seatsRangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(8),
  },
  seatRangeButton: {
    width: normalize(38),
    height: normalize(38),
    borderRadius: normalize(19),
    borderWidth: 1,
    borderColor: '#DDE6F5',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFF',
    overflow: 'hidden',
  },
  seatRangeSelected: {
    borderColor: '#D47B1B',
  },
  seatRangeGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: normalize(19),
  },
  seatRangeDisabled: {
    backgroundColor: COLORS.lightGray,
    opacity: 0.5,
  },
  seatRangeText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    color: COLORS.text,
    fontWeight: '600',
  },
  seatRangeTextSelected: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  seatRangeTextDisabled: {
    color: COLORS.textSecondary,
  },
  hint: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  notesContainer: {
    marginBottom: SPACING.md,
  },
  notesInput: {
    minHeight: normalize(100),
  },
  notesTextArea: {
    minHeight: normalize(92),
    borderWidth: 1,
    borderColor: '#DDE6F5',
    borderRadius: normalize(10),
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(10),
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    color: COLORS.text,
    backgroundColor: '#F8FAFF',
  },
  createOfferBtn: {
    marginTop: normalize(4),
    marginBottom: SPACING.xl,
    borderRadius: normalize(14),
    overflow: 'hidden',
  },
  createOfferBtnDisabled: {
    opacity: 0.65,
  },
  createOfferGradient: {
    minHeight: normalize(52),
    borderRadius: normalize(14),
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  createOfferText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(15),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  vehicleSelectContainer: {
    marginBottom: 0,
  },
  vehicleDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7FAFF',
    borderWidth: 1,
    borderColor: '#DDE6F5',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  vehicleDropdownText: {
    fontSize: normalize(16),
    fontFamily: FONTS.regular,
    color: COLORS.text,
    flex: 1,
  },
  placeholderText: {
    color: COLORS.textSecondary,
  },
  vehicleDropdownList: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xs,
    overflow: 'visible',
  },
  vehicleDropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: normalize(48),
    justifyContent: 'center',
  },
  vehicleDropdownItemText: {
    fontSize: normalize(16),
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  vehicleDropdownItemSubtext: {
    fontSize: normalize(14),
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: normalize(2),
  },
  vehicleDropdownItemLocked: {
    backgroundColor: '#FFF3F3',
    borderLeftWidth: 3,
    borderLeftColor: '#E53935',
  },
  vehicleLockedText: {
    fontSize: normalize(12),
    fontFamily: FONTS.medium,
    color: '#E53935',
    marginTop: normalize(2),
  },
  addVehicleButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  addVehicleText: {
    color: COLORS.white,
    fontSize: normalize(16),
    fontFamily: FONTS.medium,
  },
  waypointsSection: {
    marginBottom: SPACING.md,
  },
  waypointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: normalize(10),
    paddingHorizontal: SPACING.sm,
    marginBottom: normalize(8),
  },
  waypointDot: {
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: normalize(10),
  },
  waypointDotInner: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    backgroundColor: '#43A047',
  },
  waypointAddress: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    color: COLORS.text,
  },
  waypointRemove: {
    padding: normalize(4),
    marginLeft: normalize(8),
  },
  addWaypointBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: normalize(12),
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.md,
  },
  addWaypointText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(14),
    color: COLORS.primary,
    marginLeft: normalize(8),
  },
  requiredViaBanner: {
    marginBottom: normalize(10),
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(9),
    borderRadius: normalize(10),
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#D6E4FF',
  },
  requiredViaTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    color: '#1E3A8A',
    marginBottom: normalize(2),
  },
  requiredViaText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11.5),
    color: '#334155',
  },
  routeSelectionSection: {
    marginBottom: normalize(10),
  },
  routeLoadingBox: {
    minHeight: normalize(64),
    borderWidth: 1,
    borderColor: '#DDE6F5',
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: normalize(8),
    backgroundColor: '#F8FAFF',
  },
  routeLoadingText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    color: COLORS.textSecondary,
  },
  routeMapCard: {
    height: normalize(210),
    borderWidth: 1,
    borderColor: '#DDE6F5',
    borderRadius: normalize(10),
    overflow: 'hidden',
    backgroundColor: '#F8FAFF',
  },
  routeMap: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  routeCardsRow: {
    paddingTop: normalize(8),
    paddingBottom: normalize(4),
    paddingRight: normalize(4),
    gap: normalize(8),
  },
  routeCard: {
    minWidth: normalize(145),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: '#DDE6F5',
    backgroundColor: '#F8FAFF',
    paddingVertical: normalize(9),
    paddingHorizontal: normalize(10),
  },
  routeCardSelected: {
    borderColor: '#B85E00',
    backgroundColor: '#EEF4FF',
  },
  routeCardTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    color: COLORS.text,
  },
  routeCardSubtext: {
    marginTop: normalize(2),
    fontFamily: FONTS.regular,
    fontSize: normalize(11.5),
    color: COLORS.textSecondary,
  },
  routeErrorText: {
    marginTop: normalize(6),
    fontFamily: FONTS.medium,
    fontSize: normalize(11.5),
    color: COLORS.error || '#DC2626',
  },
  routeCountText: {
    marginBottom: normalize(6),
    fontFamily: FONTS.medium,
    fontSize: normalize(11.5),
    color: '#334155',
  },
  autoSyncText: {
    marginBottom: normalize(6),
    fontFamily: FONTS.regular,
    fontSize: normalize(11.5),
    color: COLORS.textSecondary,
  },
  autoSuggestBtn: {
    marginTop: normalize(8),
    borderWidth: 1,
    borderColor: '#DDE6F5',
    borderRadius: normalize(10),
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: normalize(6),
    backgroundColor: '#F8FAFF',
  },
  autoSuggestBtnText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    color: COLORS.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: normalize(16),
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: normalize(14),
    padding: normalize(14),
    maxHeight: '75%',
  },
  modalTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(16),
    color: COLORS.text,
    fontWeight: '700',
  },
  modalSubtitle: {
    marginTop: normalize(4),
    marginBottom: normalize(10),
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: COLORS.textSecondary,
  },
  modalSearchInput: {
    borderWidth: 1,
    borderColor: '#DDE6F5',
    borderRadius: normalize(10),
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(8),
    fontFamily: FONTS.regular,
    fontSize: normalize(12.5),
    color: COLORS.text,
    backgroundColor: '#F8FAFF',
    marginBottom: normalize(10),
  },
  modalList: {
    maxHeight: normalize(320),
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: normalize(10),
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(9),
    marginBottom: normalize(8),
    backgroundColor: '#F8FAFF',
  },
  modalRowContent: {
    flex: 1,
    marginRight: normalize(8),
  },
  modalRowTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12.5),
    color: COLORS.text,
  },
  modalRowAddress: {
    marginTop: normalize(2),
    fontFamily: FONTS.regular,
    fontSize: normalize(11.5),
    color: COLORS.textSecondary,
  },
  modalRowDistance: {
    marginTop: normalize(2),
    fontFamily: FONTS.medium,
    fontSize: normalize(11),
    color: '#334155',
  },
  modalAddBtn: {
    borderRadius: normalize(8),
    borderWidth: 1,
    borderColor: '#B85E00',
    paddingVertical: normalize(6),
    paddingHorizontal: normalize(10),
    backgroundColor: '#EEF4FF',
  },
  modalAddBtnDisabled: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F9',
  },
  modalAddBtnText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(11.5),
    color: '#B85E00',
  },
  modalAddBtnTextDisabled: {
    color: '#64748B',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: normalize(10),
    marginTop: normalize(10),
  },
  modalSecondaryBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: normalize(8),
    paddingVertical: normalize(8),
    paddingHorizontal: normalize(12),
  },
  modalSecondaryText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    color: '#334155',
  },
  modalPrimaryBtn: {
    borderRadius: normalize(8),
    backgroundColor: '#B85E00',
    paddingVertical: normalize(8),
    paddingHorizontal: normalize(12),
  },
  modalPrimaryText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    color: '#FFFFFF',
  },
});

export default CreatePoolingOfferScreen;
