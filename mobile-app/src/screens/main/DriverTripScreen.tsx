import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, MapPin, Clock, Navigation, Play, Phone, MessageCircle, Users, LogIn, LogOut, KeyRound, X, ArrowRight, Route, Timer, Gauge, User, CircleDot, ChevronDown, Shield, CheckCircle } from 'lucide-react-native';
import { normalize, wp, hp, SCREEN_WIDTH } from '@utils/responsive';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { trackingApi, bookingApi } from '@utils/apiClient';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';

const BLUE_ACCENT = '#D47B1B';
const BLUE_LIGHT = '#FFB55A';
const BLUE_GRADIENT: [string, string] = [BLUE_LIGHT, BLUE_ACCENT];
const GREEN_LIGHT = '#04645E';
const GREEN_DARK = '#013532';
const GREEN_GRADIENT: [string, string] = [GREEN_LIGHT, GREEN_DARK];
const MODAL_BLUE_GRADIENT: [string, string] = ['#F99E3C', '#E08E35'];
const MODAL_ORANGE_GRADIENT: [string, string] = ['#F99E3C', '#E08E35'];

interface RouteParams {
  bookingId?: string;
  booking?: any;
  offerId?: string;
  offer?: any;
}

const DriverTripScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const params = (route.params as RouteParams) || {};
  const bookingId = params.bookingId || params.booking?.bookingId;

  const [booking, setBooking] = useState<any>(params.booking || null);
  const resolvedOfferId =
    params.offerId ||
    params.booking?.poolingOfferId ||
    params.booking?.rentalOfferId ||
    booking?.poolingOfferId ||
    booking?.rentalOfferId;

  const resolvedServiceType: 'pooling' | 'rental' =
    (booking?.serviceType as 'pooling' | 'rental') ||
    (params.offer?.type as 'pooling' | 'rental') ||
    ((params.offer?.pricePerHour || params.offer?.minimumHours || params.booking?.rentalOfferId || booking?.rentalOfferId)
      ? 'rental'
      : 'pooling');
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(params.bookingId || null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState(0);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState('0m');
  const [loading, setLoading] = useState(true);
  const [mapHTML, setMapHTML] = useState<string>('');
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [stoppingLocations, setStoppingLocations] = useState<any[]>([]);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showEndTripConfirmModal, setShowEndTripConfirmModal] = useState(false);
  const [selectedPassenger, setSelectedPassenger] = useState<any>(null);
  const [passengerCode, setPassengerCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  // Payment method selection now happens on passenger's device

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const toRad = (degrees: number) => (degrees * Math.PI) / 180;
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Calculate duration in minutes based on distance
   * Assumes average speed of 45 km/h for city driving
   */
  const calculateDuration = (distanceKm: number): string => {
    const averageSpeedKmh = 45; // Average city driving speed
    const durationHours = distanceKm / averageSpeedKmh;
    const durationMinutes = Math.round(durationHours * 60);
    
    if (durationMinutes < 60) {
      return `${durationMinutes}m`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  };

  /**
   * Calculate distance and duration from route coordinates
   */
  const calculateRouteMetrics = () => {
    let fromLat = 0;
    let fromLng = 0;
    let toLat = 0;
    let toLng = 0;

    // Get coordinates from booking
    if (booking?.route) {
      if (typeof booking.route.from === 'object' && booking.route.from.lat && booking.route.from.lng) {
        fromLat = booking.route.from.lat;
        fromLng = booking.route.from.lng;
      }
      if (typeof booking.route.to === 'object' && booking.route.to.lat && booking.route.to.lng) {
        toLat = booking.route.to.lat;
        toLng = booking.route.to.lng;
      }
    }
    
    // Fallback to offer if booking doesn't have coordinates
    if ((!fromLat || !fromLng || !toLat || !toLng) && params.offer?.route) {
      if (params.offer.route.from?.lat && params.offer.route.from?.lng) {
        fromLat = params.offer.route.from.lat;
        fromLng = params.offer.route.from.lng;
      }
      if (params.offer.route.to?.lat && params.offer.route.to?.lng) {
        toLat = params.offer.route.to.lat;
        toLng = params.offer.route.to.lng;
      }
    }

    // Calculate if we have valid coordinates
    if (fromLat && fromLng && toLat && toLng) {
      const calculatedDistance = calculateDistance(fromLat, fromLng, toLat, toLng);
      const calculatedDuration = calculateDuration(calculatedDistance);
      
      setDistance(parseFloat(calculatedDistance.toFixed(1)));
      setDuration(calculatedDuration);
      
      // Calculate ETA (same as duration for now, can be updated with real-time tracking)
      const durationMinutes = Math.round((calculatedDistance / 45) * 60);
      setEta(durationMinutes);
      
      console.log(`📍 Route metrics calculated: ${calculatedDistance.toFixed(2)} km, ${calculatedDuration}`);
    }
  };

  useEffect(() => {
    // If bookingId is provided, load booking
    // If offerId is provided, find the booking for that offer
    if (bookingId) {
      loadBooking();
    } else if (resolvedOfferId) {
      findBookingForOffer();
    } else if (params.offer) {
      initializeWithOffer(params.offer);
    }

    // If the offer is already in_progress, auto-resume tracking
    if (params.offer?.status === 'in_progress') {
      (async () => {
        await requestLocationPermission();
        startLocationTracking();
        setIsTracking(true);
        if (resolvedOfferId) loadPassengers();
      })();
    }

    return () => {
      stopLocationTracking();
    };
  }, [bookingId, params.offerId, params.offer, resolvedOfferId]);

  // Load passengers when trip is in progress
  useEffect(() => {
    if (isTracking && resolvedOfferId) {
      loadPassengers();
    }
  }, [isTracking, params.offerId, resolvedOfferId]);

  // Recalculate metrics when booking or offer data changes
  useEffect(() => {
    if (booking || params.offer) {
      // Use a small delay to ensure booking state is updated
      const timer = setTimeout(() => {
        calculateRouteMetrics();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [booking?.route?.from?.lat, booking?.route?.from?.lng, booking?.route?.to?.lat, booking?.route?.to?.lng, params.offer?.route?.from?.lat, params.offer?.route?.from?.lng, params.offer?.route?.to?.lat, params.offer?.route?.to?.lng]);

  const findBookingForOffer = async () => {
    if (!resolvedOfferId) return;

    try {
      setLoading(true);
      // Determine service type from offer - check if it has rental-specific fields
      // If offer has 'pricePerHour' or 'minimumHours', it's a rental, otherwise pooling
      const serviceType = resolvedServiceType;
      
      console.log(`🔍 Looking for booking: offerId=${resolvedOfferId}, serviceType=${serviceType}`);
      
      const response = await bookingApi.getBookingByOffer(resolvedOfferId, serviceType);
      
      console.log(`📦 Booking API response:`, response);
      
      if (response.success && response.data) {
        const booking = response.data;
        setBooking(booking);
        setCurrentBookingId(booking.bookingId);
        
        console.log(`✅ Booking found: ${booking.bookingId}`);
        
        // Initialize map with booking route
        if (booking.route) {
          const fromLat = typeof booking.route.from === 'object' 
            ? booking.route.from.lat 
            : booking.route.from?.lat || 0;
          const fromLng = typeof booking.route.from === 'object' 
            ? booking.route.from.lng 
            : booking.route.from?.lng || 0;
          
          if (fromLat && fromLng) {
            updateMap(fromLat, fromLng);
          }
        }
        
        // Calculate distance and duration from route
        calculateRouteMetrics();
        
        // If booking is already in_progress, start tracking
        if (booking.status === 'in_progress') {
          await requestLocationPermission();
          startLocationTracking();
          setIsTracking(true);
        }
      } else {
        // No booking found yet, try fallback: search driver bookings
        console.log(`⚠️ Direct API call failed, trying fallback search`);
        try {
          const driverBookingsResponse = await bookingApi.getDriverBookings({ 
            serviceType: serviceType 
          });
          
          console.log(`📦 Driver bookings fallback response:`, driverBookingsResponse);
          
          if (driverBookingsResponse.success && driverBookingsResponse.data?.bookings) {
            const bookings = Array.isArray(driverBookingsResponse.data.bookings) 
              ? driverBookingsResponse.data.bookings 
              : driverBookingsResponse.data.data?.bookings || [];
            
            console.log(`📋 Found ${bookings.length} driver bookings in fallback`);
            
            const matchingBooking = bookings.find(
              (b: any) => {
                const matches = (serviceType === 'pooling' && b.poolingOfferId === resolvedOfferId) ||
                                (serviceType === 'rental' && b.rentalOfferId === resolvedOfferId);
                console.log(`🔍 Fallback check: bookingId=${b.bookingId}, poolingOfferId=${b.poolingOfferId}, rentalOfferId=${b.rentalOfferId}, matches=${matches}`);
                return matches;
              }
            );
            
            if (matchingBooking) {
              setBooking(matchingBooking);
              setCurrentBookingId(matchingBooking.bookingId);
              console.log(`✅ Found booking via fallback: ${matchingBooking.bookingId}`);
              
              // Initialize map and metrics
              if (matchingBooking.route) {
                const fromLat = typeof matchingBooking.route.from === 'object' 
                  ? matchingBooking.route.from.lat 
                  : matchingBooking.route.from?.lat || 0;
                const fromLng = typeof matchingBooking.route.from === 'object' 
                  ? matchingBooking.route.from.lng 
                  : matchingBooking.route.from?.lng || 0;
                
                if (fromLat && fromLng) {
                  updateMap(fromLat, fromLng);
                }
              }
              calculateRouteMetrics();
              
              if (matchingBooking.status === 'in_progress') {
                await requestLocationPermission();
                startLocationTracking();
                setIsTracking(true);
              }
            } else {
              // No booking found, initialize with offer data
              console.log(`⚠️ No matching booking in fallback search`);
              if (params.offer) {
                await initializeWithOffer(params.offer);
              } else {
                navigation.goBack();
              }
            }
          } else {
            // No bookings available, initialize with offer data
            console.log(`⚠️ No driver bookings available`);
            if (params.offer) {
              await initializeWithOffer(params.offer);
            } else {
              navigation.goBack();
            }
          }
        } catch (fallbackError: any) {
          console.error('❌ Fallback search failed:', fallbackError);
          // Still initialize with offer data if available
          if (params.offer) {
            await initializeWithOffer(params.offer);
          } else {
            navigation.goBack();
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error finding booking:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      // If error but we have offer data, still initialize
      if (params.offer) {
        await initializeWithOffer(params.offer);
      } else {
        Alert.alert('Error', error.message || 'Failed to load booking');
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadBooking = async () => {
    if (!bookingId) return;

    try {
      setLoading(true);
      const response = await bookingApi.getBooking(bookingId);
      if (response.success && response.data) {
        const bookingData = response.data;
        setBooking(bookingData);
        
        // Initialize map with booking route
        if (bookingData.route) {
          const fromLat = typeof bookingData.route.from === 'object' 
            ? bookingData.route.from.lat 
            : bookingData.route.from?.lat || 0;
          const fromLng = typeof bookingData.route.from === 'object' 
            ? bookingData.route.from.lng 
            : bookingData.route.from?.lng || 0;
          
          if (fromLat && fromLng) {
            updateMap(fromLat, fromLng);
          }
        }
        
        // Calculate distance and duration from route
        calculateRouteMetrics();
        
        // If booking is already in_progress, start tracking
        if (bookingData.status === 'in_progress') {
          await requestLocationPermission();
          startLocationTracking();
          setIsTracking(true);
        }
      }
    } catch (error: any) {
      console.error('Error loading booking:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const loadPassengers = async () => {
    if (!resolvedOfferId) return;

    try {
      const serviceType = resolvedServiceType;
      const response = await bookingApi.getTripPassengers(resolvedOfferId, serviceType);

      if (response.success && response.data) {
        const passengersList = response.data;
        setPassengers(passengersList);

        // Extract stopping locations from passenger routes
        const locations: any[] = [];
        passengersList.forEach((passenger: any) => {
          if (passenger.route?.from) {
            locations.push({
              type: 'pickup',
              location: passenger.route.from,
              passengerName: passenger.passengerName,
              bookingId: passenger.bookingId,
            });
          }
          if (passenger.route?.to) {
            locations.push({
              type: 'dropoff',
              location: passenger.route.to,
              passengerName: passenger.passengerName,
              bookingId: passenger.bookingId,
            });
          }
        });
        setStoppingLocations(locations);
      }
    } catch (error: any) {
      console.error('Error loading passengers:', error);
    }
  };

  const handleGetIn = async (passengerBookingId: string) => {
    try {
      const response = await bookingApi.markPassengerGotIn(passengerBookingId);
      if (response.success) {
        Alert.alert('Success', 'Passenger marked as got in');
        loadPassengers();
      } else {
        Alert.alert('Error', response.error || 'Failed to mark passenger');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark passenger');
    }
  };

  const handleGetOut = async (passengerBookingId: string) => {
    try {
      const response = await bookingApi.markPassengerGotOut(passengerBookingId);
      if (response.success) {
        setSelectedPassenger({ bookingId: passengerBookingId, waitingForPayment: true });
        setShowCodeModal(true);
        // Start polling for passenger payment choice
        startPaymentPolling(passengerBookingId);
      } else {
        Alert.alert('Error', response.error || 'Failed to mark passenger got out');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark passenger got out');
    }
  };

  // Poll booking to detect completion-code generation by passenger
  const paymentPollRef = useRef<NodeJS.Timeout | null>(null);

  const startPaymentPolling = (passengerBookingId: string) => {
    // Clear any existing poll
    if (paymentPollRef.current) clearInterval(paymentPollRef.current);

    paymentPollRef.current = setInterval(async () => {
      try {
        const response = await bookingApi.getBooking(passengerBookingId);
        if (response.success && response.data) {
          const b = response.data;

          // If passenger chose CASH → code is set, show code entry
          if (b.paymentMethod === 'offline_cash' && b.passengerCode) {
            if (paymentPollRef.current) clearInterval(paymentPollRef.current);
            setSelectedPassenger({ bookingId: passengerBookingId, waitingForPayment: false, cashMode: true });
            // Keep modal open, switch to code entry view
          }

          // Trip completed
          if (b.status === 'completed') {
            if (paymentPollRef.current) clearInterval(paymentPollRef.current);
            setShowCodeModal(false);
            setSelectedPassenger(null);
            Alert.alert(
              'Trip Completed',
              `Ride marked complete successfully.`,
              [{ text: 'OK', onPress: () => loadPassengers() }]
            );
          }
        }
      } catch (err) {
        console.error('Trip status poll error:', err);
      }
    }, 3000); // Poll every 3 seconds
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (paymentPollRef.current) clearInterval(paymentPollRef.current);
    };
  }, []);

  const handleVerifyCode = async () => {
    if (!selectedPassenger || !passengerCode) {
      Alert.alert('Error', 'Please enter the 4-digit code');
      return;
    }

    if (passengerCode.length !== 4) {
      Alert.alert('Error', 'Code must be 4 digits');
      return;
    }

    try {
      setVerifyingCode(true);
      const response = await bookingApi.verifyPassengerCode(selectedPassenger.bookingId, passengerCode, 'offline_cash');

      if (response.success) {
        Alert.alert(
          'Trip Completed',
          `Trip completion verified successfully.`,
          [{
            text: 'OK',
            onPress: () => {
              setShowCodeModal(false);
              setPassengerCode('');
              setSelectedPassenger(null);
              loadPassengers();
            },
          }]
        );
      } else {
        Alert.alert('Error', response.error || 'Invalid code');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify code');
    } finally {
      setVerifyingCode(false);
    }
  };

  const startTrip = async () => {
    let activeBookingId = currentBookingId || bookingId;
    
    // If no booking ID, try to find booking for the offer
    if (!activeBookingId && resolvedOfferId) {
      try {
        // Determine service type from offer - check if it has rental-specific fields
        const serviceType = resolvedServiceType;
        
        console.log(`🚀 Start Trip: Looking for booking - offerId=${resolvedOfferId}, serviceType=${serviceType}`);
        
        const response = await bookingApi.getBookingByOffer(resolvedOfferId, serviceType);
        
        console.log(`📦 Start Trip API response:`, response);
        
        if (response.success && response.data) {
          activeBookingId = response.data.bookingId;
          setBooking(response.data);
          setCurrentBookingId(activeBookingId);
          console.log(`✅ Start Trip: Booking found - ${activeBookingId}`);
        } else {
          console.log(`⚠️ Start Trip: No booking found - success=${response.success}, data=${response.data}`);
          // Try alternative: get driver bookings and find one matching this offer
          try {
            console.log(`🔄 Fallback: Searching driver bookings for offer ${resolvedOfferId}`);
            // Search all driver bookings (no status filter) to find any booking for this offer
            const driverBookingsResponse = await bookingApi.getDriverBookings({ 
              serviceType: serviceType 
            });
            
            console.log(`📦 Driver bookings response:`, driverBookingsResponse);
            
            if (driverBookingsResponse.success && driverBookingsResponse.data?.bookings) {
              const bookings = Array.isArray(driverBookingsResponse.data.bookings) 
                ? driverBookingsResponse.data.bookings 
                : driverBookingsResponse.data.data?.bookings || [];
              
              console.log(`📋 Found ${bookings.length} driver bookings`);
              
              // Find booking matching this offer, prioritizing active statuses
              const matchingBookings = bookings.filter(
                (b: any) => {
                  const matches = (serviceType === 'pooling' && b.poolingOfferId === resolvedOfferId) ||
                                  (serviceType === 'rental' && b.rentalOfferId === resolvedOfferId);
                  if (matches) {
                    console.log(`🔍 Found matching booking ${b.bookingId}: status=${b.status}, poolingOfferId=${b.poolingOfferId}, rentalOfferId=${b.rentalOfferId}`);
                  }
                  return matches;
                }
              );
              
              // Prioritize bookings with active statuses
              const activeStatuses = ['pending', 'confirmed', 'in_progress'];
              const activeBooking = matchingBookings.find((b: any) => activeStatuses.includes(b.status));
              const matchingBooking = activeBooking || matchingBookings[0];
              
              if (matchingBooking) {
                activeBookingId = matchingBooking.bookingId;
                setBooking(matchingBooking);
                setCurrentBookingId(activeBookingId);
                console.log(`✅ Start Trip: Found booking via driver bookings - ${activeBookingId}, status: ${matchingBooking.status}`);
              } else {
                console.log(`❌ No matching booking found in ${bookings.length} bookings`);
                throw new Error('No matching booking found');
              }
            } else {
              console.log(`❌ Driver bookings API failed or returned no data`);
              throw new Error('No bookings available');
            }
          } catch (fallbackError: any) {
            console.error('❌ Fallback booking search failed:', fallbackError);
            Alert.alert(
              'No Booking Found',
              'No booking has been made for this offer yet. Please wait for passengers to book before starting the trip.',
              [{ text: 'OK' }]
            );
            return;
          }
        }
      } catch (error: any) {
        console.error('❌ Error finding booking in startTrip:', error);
        console.error('Error response:', error.response || error.message);
        Alert.alert(
          'Error',
          `Failed to find booking: ${error.message || 'Unknown error'}. Please try again.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    if (!activeBookingId) {
      console.log('\n❌ ERROR: No active booking ID after search');
      console.log('  - Cannot proceed to start trip without booking ID');
      
      Alert.alert(
        'Error',
        'Booking not found. Please ensure someone has booked this trip before starting.',
        [{ text: 'OK' }]
      );
      return;
    }

    console.log('\n🎯 Step 4: Updating booking status to "in_progress"...');
    console.log('  - Booking ID:', activeBookingId);
    
    try {
      // Update booking status to 'in_progress'
      console.log('🌐 Calling updateBookingStatus API...');
      console.log('  - Endpoint: /api/bookings/:bookingId/status');
      console.log('  - Booking ID:', activeBookingId);
      console.log('  - New Status: in_progress');
      
      const response = await bookingApi.updateBookingStatus(activeBookingId, 'in_progress');
      
      console.log('\n📦 API Response (updateBookingStatus):');
      console.log('  - success:', response.success);
      console.log('  - data:', response.data);
      console.log('  - error:', response.error);
      console.log('  - message:', response.message);
      
      if (response.success) {
        // Reload booking to get updated status
        if (activeBookingId) {
          await loadBooking();
        } else {
          await findBookingForOffer();
        }
        
        // Start trip using new API
        const serviceType = resolvedServiceType;
        const startTripResponse = await bookingApi.startTrip(resolvedOfferId || '', serviceType);
        
        if (startTripResponse.success) {
        // Start location tracking
        await requestLocationPermission();
        startLocationTracking();
        setIsTracking(true);
          
          // Load passengers and update map with stopping locations
          await loadPassengers();
          if (currentLocation) {
            updateMap(currentLocation.lat, currentLocation.lng);
          }
        
        Alert.alert('Trip Started', 'Location tracking has started. Passengers can now see your location.');
        } else {
          Alert.alert('Error', startTripResponse.error || 'Failed to start trip');
        }
      } else {
        Alert.alert('Error', response.error || response.message || 'Failed to start trip');
      }
    } catch (error: any) {
      console.error('Error starting trip:', error);
      const errorMessage = error.message || error.error || 'Failed to start trip';
      Alert.alert('Error', errorMessage);
    }
  };

  const endTrip = async () => {
    if (!resolvedOfferId) {
      Alert.alert('Error', 'Offer ID not found');
      return;
    }
    setShowEndTripConfirmModal(true);
  };

  const confirmEndTrip = async () => {
    try {
      stopLocationTracking();
      setIsTracking(false);
      setShowEndTripConfirmModal(false);

      const serviceType = resolvedServiceType;
      const response = await bookingApi.endTrip(resolvedOfferId || '', serviceType);

      if (response.success) {
        Alert.alert('Trip Ended', 'Trip has been completed successfully. The offer has been removed from My Offers.');
        navigation.goBack();
      } else {
        Alert.alert('Error', response.error || 'Failed to end trip');
      }
    } catch (error: any) {
      console.error('Error ending trip:', error);
      Alert.alert('Error', error.message || 'Failed to end trip');
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to track your trip. Please enable it in settings.'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const startLocationTracking = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    // Get initial location
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ lat: latitude, lng: longitude });
      
      // Send initial location
      await updateLocation(latitude, longitude, location.coords.heading, location.coords.speed, location.coords.accuracy);
      
      // Update map
      updateMap(latitude, longitude);
      
      // Start watching location changes
      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        async (location) => {
          const { latitude, longitude, heading, speed, accuracy } = location.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          await updateLocation(latitude, longitude, heading || undefined, speed || undefined, accuracy || undefined);
          updateMap(latitude, longitude);
        }
      );

      // Also fetch trip metrics periodically
      locationIntervalRef.current = setInterval(() => {
        fetchTripMetrics();
      }, 10000); // Every 10 seconds

      setIsTracking(true);
      console.log('✅ Location tracking started');
    } catch (error: any) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  const stopLocationTracking = () => {
    if (locationWatchRef.current) {
      locationWatchRef.current.remove();
      locationWatchRef.current = null;
    }
    
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    
    setIsTracking(false);
    console.log('🛑 Location tracking stopped');
  };

  const updateLocation = async (
    lat: number,
    lng: number,
    heading?: number,
    speed?: number,
    accuracy?: number
  ) => {
    const activeBookingId = currentBookingId || bookingId;
    if (!activeBookingId) {
      console.warn('⚠️ No booking ID available for location update');
      return;
    }

    try {
      const response = await trackingApi.updateLocation({
        bookingId: activeBookingId,
        lat,
        lng,
        heading,
        speed,
        accuracy,
      });

      if (response.success) {
        console.log(`📍 Location updated: ${lat}, ${lng}`);
      }
    } catch (error: any) {
      console.error('Error updating location:', error);
      // Don't show alert for every failed update to avoid spam
    }
  };

  const fetchTripMetrics = async () => {
    const activeBookingId = currentBookingId || bookingId;
    if (!activeBookingId) {
      // If no booking ID, calculate from route
      calculateRouteMetrics();
      return;
    }

    try {
      const response = await trackingApi.getTripMetrics(activeBookingId);
      if (response.success && response.data) {
        // Use API data if available, otherwise calculate from route
        if (response.data.distance && response.data.distance > 0) {
          setEta(response.data.eta || 0);
          setDistance(response.data.distance || 0);
          setDuration(response.data.duration || '0m');
        } else {
          calculateRouteMetrics();
        }
      } else {
        // Fallback to calculating from route
        calculateRouteMetrics();
      }
    } catch (error: any) {
      console.error('Error fetching trip metrics:', error);
      // Fallback to calculating from route
      calculateRouteMetrics();
    }
  };

  const updateMap = (lat: number, lng: number) => {
    // Get destination from booking or offer
    let destinationLat = lat;
    let destinationLng = lng;
    
    if (booking?.route?.to) {
      destinationLat = typeof booking.route.to === 'object' 
        ? booking.route.to.lat 
        : booking.route.to?.lat || lat;
      destinationLng = typeof booking.route.to === 'object' 
        ? booking.route.to.lng 
        : booking.route.to?.lng || lng;
    } else if (params.offer?.route?.to) {
      destinationLat = params.offer.route.to.lat || lat;
      destinationLng = params.offer.route.to.lng || lng;
    }

    // Build stopping locations markers (only pickup points)
    const stoppingMarkers = stoppingLocations
      .filter((stop) => stop.type === 'pickup')
      .map((stop, index) => {
        const stopLat = typeof stop.location === 'object' ? stop.location.lat : 0;
        const stopLng = typeof stop.location === 'object' ? stop.location.lng : 0;
        return `L.marker([${stopLat}, ${stopLng}], {
          icon: L.divIcon({
            className: 'stop-marker',
            html: '<div style="background: ${COLORS.warning}; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          })
        }).addTo(map);`;
      })
      .join('\n    ');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    const map = L.map('map').setView([${lat}, ${lng}], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    
    // Current location marker (driver)
    const driverMarker = L.marker([${lat}, ${lng}], {
      icon: L.divIcon({
        className: 'driver-marker',
        html: '<div style="background: ${COLORS.primary}; width: 24px; height: 24px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    }).addTo(map);
    
    // Destination marker
    const destMarker = L.marker([${destinationLat}, ${destinationLng}], {
      icon: L.divIcon({
        className: 'dest-marker',
        html: '<div style="background: ${COLORS.success}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(map);
    
    // Route line
    const routeLine = L.polyline([
      [${lat}, ${lng}],
      [${destinationLat}, ${destinationLng}]
    ], {
      color: '${COLORS.primary}',
      weight: 4,
      opacity: 0.7
    }).addTo(map);
    
    // Stopping locations markers (pickup points only)
    ${stoppingMarkers || ''}
    
    // Fit bounds - include all markers
    const bounds = [[${lat}, ${lng}], [${destinationLat}, ${destinationLng}]];
    ${stoppingLocations.filter((s) => s.type === 'pickup').length > 0
      ? stoppingLocations
          .filter((s) => s.type === 'pickup')
          .map((s) => {
            const sLat = typeof s.location === 'object' ? s.location.lat : 0;
            const sLng = typeof s.location === 'object' ? s.location.lng : 0;
            return `bounds.push([${sLat}, ${sLng}]);`;
          })
          .join('\n    ')
      : ''}
    map.fitBounds(bounds, { padding: [50, 50] });
    
    // Update function for real-time location
    window.updateDriverPosition = function(newLat, newLng) {
      driverMarker.setLatLng([newLat, newLng]);
      routeLine.setLatLngs([
        [newLat, newLng],
        [${destinationLat}, ${destinationLng}]
      ]);
      map.setView([newLat, newLng], map.getZoom());
    };
    
    // Update stopping locations if needed
    window.updateStoppingLocations = function(locations) {
      // This can be called to update stopping locations dynamically
    };
  </script>
</body>
</html>
    `;
    setMapHTML(html);
  };

  // ─── Address Helpers ───
  const getFromAddr = () => {
    if (typeof booking?.route?.from === 'string') return booking.route.from;
    return booking?.route?.from?.address || params.offer?.route?.from?.address || 'N/A';
  };
  const getToAddr = () => {
    if (typeof booking?.route?.to === 'string') return booking.route.to;
    return booking?.route?.to?.address || params.offer?.route?.to?.address || 'N/A';
  };

  const getPassengerStatusStyle = (status: string) => {
    switch (status) {
      case 'waiting': return { bg: '#FF9800' + '15', color: '#FF9800', label: 'Waiting' };
      case 'got_in': return { bg: GREEN_LIGHT + '18', color: GREEN_LIGHT, label: 'In Vehicle' };
      case 'got_out': return { bg: BLUE_ACCENT + '18', color: BLUE_ACCENT, label: 'Dropped Off' };
      default: return { bg: '#9E9E9E' + '15', color: '#9E9E9E', label: status || 'Unknown' };
    }
  };

  // ─── Loading State ───
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE_ACCENT} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading trip details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const SCREEN_H = Dimensions.get('window').height;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Map (full top area, Uber-style) ── */}
      <View style={[styles.mapWrap, { height: SCREEN_H * 0.32 }]}>
        {mapHTML ? (
          <WebView source={{ html: mapHTML }} style={styles.webView} javaScriptEnabled />
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: theme.colors.background }]}>
            <ActivityIndicator size="large" color={BLUE_ACCENT} />
          </View>
        )}

        {/* Floating header over map */}
        <View style={styles.floatingHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.floatingBtn, { backgroundColor: theme.colors.surface }]}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
          {isTracking ? (
            <LinearGradient
              colors={GREEN_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.liveChip}
            >
              <View style={[styles.liveDot, { backgroundColor: '#FFF' }]} />
              <Text style={[styles.liveText, { color: '#FFF' }]}>LIVE</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.liveChip, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.liveDot, { backgroundColor: theme.colors.textSecondary }]} />
              <Text style={[styles.liveText, { color: theme.colors.textSecondary }]}>IDLE</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Bottom Sheet Content ── */}
      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        {/* Drag Handle */}
        <View style={styles.sheetHandle} />

        {/* ── Metric Strip ── */}
        <View style={[styles.metricStrip, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{distance || 0}</Text>
            <Text style={[styles.metricUnit, { color: theme.colors.textSecondary }]}>km</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{duration || '0m'}</Text>
            <Text style={[styles.metricUnit, { color: theme.colors.textSecondary }]}>est.</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{eta || 0}</Text>
            <Text style={[styles.metricUnit, { color: theme.colors.textSecondary }]}>min ETA</Text>
          </View>
        </View>

        {/* ── Route Timeline ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.routeTimeline}>
            <View style={styles.routeStop}>
              <View style={[styles.routeDot, { backgroundColor: GREEN_LIGHT }]} />
              <View style={styles.routeStopInfo}>
                <Text style={[styles.routeLabel, { color: theme.colors.textSecondary }]}>PICKUP</Text>
                <Text style={[styles.routeAddr, { color: theme.colors.text }]} numberOfLines={2}>{getFromAddr()}</Text>
              </View>
            </View>
            <View style={styles.routeLineWrap}>
              <View style={[styles.routeLine, { borderColor: theme.colors.border }]} />
            </View>
            <View style={styles.routeStop}>
              <View style={[styles.routeDot, { backgroundColor: '#E53E3E' }]} />
              <View style={styles.routeStopInfo}>
                <Text style={[styles.routeLabel, { color: theme.colors.textSecondary }]}>DROP-OFF</Text>
                <Text style={[styles.routeAddr, { color: theme.colors.text }]} numberOfLines={2}>{getToAddr()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Passengers ── */}
        {passengers.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cardHeader}>
              <Users size={16} color={BLUE_ACCENT} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Passengers</Text>
              <View style={[styles.countPill, { backgroundColor: BLUE_ACCENT }]}>
                <Text style={styles.countPillText}>{passengers.length}</Text>
              </View>
            </View>

            {passengers.map((passenger: any, index: number) => {
              const pStatus = getPassengerStatusStyle(passenger.passengerStatus);
              const bookedSeats = Math.max(1, Number(passenger?.seatsBooked || 1));
              const isWaiting = passenger.passengerStatus === 'waiting';
              const isInVehicle = passenger.passengerStatus === 'got_in';
              const isDroppedOff = passenger.passengerStatus === 'got_out';
              const isDone = passenger.status === 'completed';

              return (
                <View key={index} style={[styles.pCard, { backgroundColor: theme.colors.background }, index > 0 && { marginTop: normalize(8) }]}>
                  {/* Top: Avatar + Info + Status */}
                  <View style={styles.pTopRow}>
                    <View style={[styles.pAvatar, { backgroundColor: pStatus.color + '15' }]}>
                      <User size={18} color={pStatus.color} />
                    </View>
                    <View style={styles.pInfo}>
                      <View style={styles.pNameRow}>
                        <Text style={[styles.pName, { color: theme.colors.text }]}>
                          {bookedSeats > 1 ? 'Group Booking' : (passenger.passengerName || 'Passenger')}
                        </Text>
                        <View style={[styles.seatBadge, { backgroundColor: BLUE_ACCENT + '15' }]}>
                          <Users size={11} color={BLUE_ACCENT} />
                          <Text style={[styles.seatBadgeText, { color: BLUE_ACCENT }]}>
                            {bookedSeats} member{bookedSeats > 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                      {bookedSeats > 1 && (
                        <Text style={[styles.pSub, { color: theme.colors.textSecondary }]}>
                          Contact: {passenger.passengerName || 'Passenger'}
                        </Text>
                      )}
                      <Text style={[styles.pRoute, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {typeof passenger.route?.from === 'object' ? passenger.route.from.address?.split(',')[0] : 'From'}
                        {' → '}
                        {typeof passenger.route?.to === 'object' ? passenger.route.to.address?.split(',')[0] : 'To'}
                      </Text>
                    </View>
                    <View style={[styles.pStatusChip, { backgroundColor: pStatus.bg }]}>
                      <View style={[styles.pStatusDot, { backgroundColor: pStatus.color }]} />
                      <Text style={[styles.pStatusLabel, { color: pStatus.color }]}>{pStatus.label}</Text>
                    </View>
                  </View>

                  {/* Actions row */}
                  <View style={styles.pActions}>
                    {isWaiting && (
                      <TouchableOpacity
                        style={styles.pBtn}
                        onPress={() => handleGetIn(passenger.bookingId)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#F99E3C', '#E08E35']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.pBtnGradient}
                        >
                          <LogIn size={15} color="#FFF" />
                          <Text style={styles.pBtnText}>Picked Up</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}

                    {isInVehicle && (
                      <TouchableOpacity
                        style={[styles.pBtn, { backgroundColor: '#FF9800' }]}
                        onPress={() => handleGetOut(passenger.bookingId)}
                        activeOpacity={0.8}
                      >
                        <LogOut size={15} color="#FFF" />
                        <Text style={styles.pBtnText}>Drop Off</Text>
                      </TouchableOpacity>
                    )}

                    {isDroppedOff && !isDone && (
                      <TouchableOpacity
                        style={[styles.pBtn, styles.pBtnSolid, { backgroundColor: BLUE_ACCENT }]}
                        onPress={() => {
                          if (passenger.paymentMethod === 'offline_cash' && passenger.passengerCode) {
                            setSelectedPassenger({ bookingId: passenger.bookingId, waitingForPayment: false, cashMode: true });
                            setShowCodeModal(true);
                          } else {
                            setSelectedPassenger({ bookingId: passenger.bookingId, waitingForPayment: true });
                            setShowCodeModal(true);
                            startPaymentPolling(passenger.bookingId);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <KeyRound size={15} color="#FFF" />
                        <Text style={styles.pBtnText}>Verify Completion</Text>
                      </TouchableOpacity>
                    )}

                    {isDone && !passenger.settlementStatus && (
                      <View style={[styles.pDoneBadge, { backgroundColor: GREEN_LIGHT + '15' }]}>
                        <CheckCircle size={14} color={GREEN_LIGHT} />
                        <Text style={styles.pDoneText}>Completed</Text>
                      </View>
                    )}

                    {isDone && passenger.settlementStatus === 'driver_requested' && (
                      <View style={[styles.pDoneBadge, { backgroundColor: GREEN_LIGHT + '15' }]}>
                        <CheckCircle size={14} color={GREEN_LIGHT} />
                        <Text style={styles.pDoneText}>Completed</Text>
                      </View>
                    )}

                    {/* Quick call */}
                    {passenger.passengerPhone && (
                      <TouchableOpacity style={[styles.pIconBtn, { backgroundColor: GREEN_LIGHT + '15' }]}>
                        <Phone size={16} color={GREEN_LIGHT} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Stops Timeline ── */}
        {stoppingLocations.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cardHeader}>
              <MapPin size={16} color={BLUE_ACCENT} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Stops</Text>
            </View>
            {stoppingLocations.map((stop, index) => {
              const isPickup = stop.type === 'pickup';
              return (
                <View key={index} style={styles.stopRow}>
                  <View style={styles.stopTimelineCol}>
                    <View style={[styles.stopDot, { backgroundColor: isPickup ? GREEN_LIGHT : '#E53E3E' }]} />
                    {index < stoppingLocations.length - 1 && <View style={[styles.stopConnector, { backgroundColor: theme.colors.border }]} />}
                  </View>
                  <View style={[styles.stopCard, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.stopTopRow}>
                      <View style={[styles.stopBadge, { backgroundColor: (isPickup ? GREEN_LIGHT : '#E53E3E') + '12' }]}>
                        <Text style={[styles.stopBadgeText, { color: isPickup ? GREEN_LIGHT : '#E53E3E' }]}>{isPickup ? 'Pick' : 'Drop'}</Text>
                      </View>
                      <Text style={[styles.stopName, { color: theme.colors.text }]}>{stop.passengerName}</Text>
                    </View>
                    <Text style={[styles.stopAddr, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {typeof stop.location === 'object' ? stop.location.address : stop.location}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Start / End Trip ── */}
        <View style={styles.tripActionWrap}>
          {!isTracking ? (
            <TouchableOpacity style={styles.startBtn} onPress={startTrip} activeOpacity={0.85}>
              <LinearGradient
                colors={['#F99E3C', '#E08E35']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.startBtnGradient}
              >
                <Play size={20} color="#FFF" />
                <Text style={styles.startBtnText}>Start Trip</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.endBtn} onPress={endTrip} activeOpacity={0.85}>
              <View style={styles.stopIcon} />
              <Text style={styles.endBtnText}>End Trip</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: normalize(120) }} />
      </ScrollView>

      {/* ── Completion Code Modal ── */}
      <Modal visible={showCodeModal} transparent animationType="slide"
        onRequestClose={() => { if (paymentPollRef.current) clearInterval(paymentPollRef.current); setShowCodeModal(false); setPassengerCode(''); setSelectedPassenger(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.modalClose} onPress={() => { if (paymentPollRef.current) clearInterval(paymentPollRef.current); setShowCodeModal(false); setPassengerCode(''); setSelectedPassenger(null); }}>
              <X size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {selectedPassenger?.waitingForPayment && (
              <>
                <View style={[styles.modalIcon, { backgroundColor: BLUE_ACCENT + '12' }]}>
                  <Clock size={28} color={BLUE_ACCENT} />
                </View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Waiting for Passenger</Text>
                <Text style={[styles.modalSub, { color: theme.colors.textSecondary }]}>
                  Passenger is generating completion code...
                </Text>
                <ActivityIndicator size="large" color={BLUE_ACCENT} style={{ marginVertical: normalize(20) }} />
                <Text style={[styles.modalHint, { color: theme.colors.textSecondary }]}>Auto-updates when ready</Text>
              </>
            )}

            {selectedPassenger?.cashMode && (
              <>
                <View style={[styles.modalIcon, { backgroundColor: GREEN_LIGHT + '15' }]}>
                  <KeyRound size={28} color={GREEN_LIGHT} />
                </View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Enter Completion Code</Text>
                <Text style={[styles.modalSub, { color: theme.colors.textSecondary }]}>
                  Ask the passenger for their 4-digit code
                </Text>
                <TextInput
                  style={[styles.codeInput, { borderColor: BLUE_ACCENT, backgroundColor: theme.colors.background, color: theme.colors.text }]}
                  value={passengerCode} onChangeText={setPassengerCode}
                  placeholder="0000" placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="number-pad" maxLength={4} autoFocus
                />
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.modalCancelBtn}
                    onPress={() => { if (paymentPollRef.current) clearInterval(paymentPollRef.current); setShowCodeModal(false); setPassengerCode(''); setSelectedPassenger(null); }}>
                    <LinearGradient
                      colors={MODAL_BLUE_GRADIENT}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.modalBtnGradient}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, (verifyingCode || passengerCode.length !== 4) && { opacity: 0.5 }]}
                    onPress={handleVerifyCode} disabled={verifyingCode || passengerCode.length !== 4}>
                    <LinearGradient
                      colors={MODAL_ORANGE_GRADIENT}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.modalBtnGradient}
                    >
                      <Text style={styles.modalConfirmText}>{verifyingCode ? 'Verifying...' : 'Verify'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEndTripConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndTripConfirmModal(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.confirmTitle, { color: theme.colors.text }]}>End Trip</Text>
            <Text style={[styles.confirmMessage, { color: theme.colors.textSecondary }]}>
              Are you sure you want to end this trip? All remaining bookings will be marked as completed.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmBtn}
                activeOpacity={0.85}
                onPress={() => setShowEndTripConfirmModal(false)}
              >
                <LinearGradient
                  colors={MODAL_BLUE_GRADIENT}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.confirmBtnGradient}
                >
                  <Text style={styles.confirmBtnText}>Cancel</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                activeOpacity={0.85}
                onPress={confirmEndTrip}
              >
                <LinearGradient
                  colors={MODAL_ORANGE_GRADIENT}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.confirmBtnGradient}
                >
                  <Text style={styles.confirmBtnText}>End Trip</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Map
  mapWrap: { position: 'relative' },
  webView: { flex: 1 },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Floating header
  floatingHeader: { position: 'absolute', top: normalize(40), left: normalize(14), right: normalize(14), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  floatingBtn: { width: normalize(40), height: normalize(40), borderRadius: normalize(20), alignItems: 'center', justifyContent: 'center', ...SHADOWS.md },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: normalize(5), paddingHorizontal: normalize(12), paddingVertical: normalize(7), borderRadius: normalize(16), ...SHADOWS.md },
  liveDot: { width: normalize(7), height: normalize(7), borderRadius: normalize(4) },
  liveText: { fontFamily: FONTS.medium, fontSize: normalize(11), fontWeight: '800', letterSpacing: 1 },

  // Sheet
  sheet: { flex: 1, borderTopLeftRadius: normalize(20), borderTopRightRadius: normalize(20), backgroundColor: 'transparent' },
  sheetContent: { paddingHorizontal: normalize(14), paddingBottom: normalize(120) },
  sheetHandle: { width: normalize(36), height: normalize(4), borderRadius: normalize(2), backgroundColor: '#D1D5DB', alignSelf: 'center', marginTop: normalize(10), marginBottom: normalize(14) },

  // Metrics
  metricStrip: { flexDirection: 'row', borderRadius: normalize(14), padding: normalize(14), marginBottom: normalize(10), ...SHADOWS.sm },
  metricItem: { flex: 1, alignItems: 'center' },
  metricValue: { fontFamily: FONTS.medium, fontSize: normalize(20), fontWeight: '800' },
  metricUnit: { fontFamily: FONTS.regular, fontSize: normalize(10), marginTop: normalize(1) },
  metricDivider: { width: 1, height: normalize(28), alignSelf: 'center' },

  // Card
  card: { borderRadius: normalize(14), padding: normalize(14), marginBottom: normalize(10), ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: normalize(8), marginBottom: normalize(10) },
  cardTitle: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '700', flex: 1 },
  countPill: { width: normalize(22), height: normalize(22), borderRadius: normalize(11), alignItems: 'center', justifyContent: 'center' },
  countPillText: { fontFamily: FONTS.medium, fontSize: normalize(11), fontWeight: '700', color: '#FFF' },

  // Route Timeline
  routeTimeline: {},
  routeStop: { flexDirection: 'row', alignItems: 'flex-start', gap: normalize(12) },
  routeDot: { width: normalize(10), height: normalize(10), borderRadius: normalize(5), marginTop: normalize(4) },
  routeStopInfo: { flex: 1, paddingBottom: normalize(4) },
  routeLabel: { fontFamily: FONTS.regular, fontSize: normalize(10), fontWeight: '600', letterSpacing: 0.8, marginBottom: normalize(2) },
  routeAddr: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '600', lineHeight: normalize(19) },
  routeLineWrap: { paddingLeft: normalize(4), paddingVertical: normalize(2) },
  routeLine: { width: 0, height: normalize(22), borderLeftWidth: 1.5, borderStyle: 'dashed' as any },

  // Passengers
  pCard: { borderRadius: normalize(12), padding: normalize(12) },
  pTopRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(10) },
  pAvatar: { width: normalize(38), height: normalize(38), borderRadius: normalize(19), alignItems: 'center', justifyContent: 'center' },
  pInfo: { flex: 1 },
  pNameRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), flexWrap: 'wrap' },
  pName: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '600' },
  pSub: { fontFamily: FONTS.regular, fontSize: normalize(11), marginTop: normalize(2) },
  seatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(4),
    paddingHorizontal: normalize(7),
    paddingVertical: normalize(3),
    borderRadius: normalize(8),
  },
  seatBadgeText: { fontFamily: FONTS.medium, fontSize: normalize(10), fontWeight: '700' },
  pRoute: { fontFamily: FONTS.regular, fontSize: normalize(11), marginTop: normalize(2) },
  pStatusChip: { flexDirection: 'row', alignItems: 'center', gap: normalize(4), paddingHorizontal: normalize(8), paddingVertical: normalize(4), borderRadius: normalize(8) },
  pStatusDot: { width: normalize(6), height: normalize(6), borderRadius: normalize(3) },
  pStatusLabel: { fontFamily: FONTS.medium, fontSize: normalize(10), fontWeight: '700' },
  pActions: { flexDirection: 'row', alignItems: 'center', gap: normalize(8), marginTop: normalize(10), paddingTop: normalize(10), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.06)' },
  pBtn: { borderRadius: normalize(10), overflow: 'hidden' },
  pBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), paddingHorizontal: normalize(16), paddingVertical: normalize(9) },
  pBtnSolid: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), paddingHorizontal: normalize(16), paddingVertical: normalize(9), borderRadius: normalize(10) },
  pBtnText: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '600', color: '#FFF' },
  pIconBtn: { width: normalize(36), height: normalize(36), borderRadius: normalize(10), alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  pDoneBadge: { flexDirection: 'row', alignItems: 'center', gap: normalize(5), paddingHorizontal: normalize(12), paddingVertical: normalize(8), borderRadius: normalize(10) },
  pDoneText: { fontFamily: FONTS.medium, fontSize: normalize(12), fontWeight: '600', color: GREEN_LIGHT },

  // Stops
  stopRow: { flexDirection: 'row', marginBottom: normalize(2) },
  stopTimelineCol: { width: normalize(24), alignItems: 'center' },
  stopDot: { width: normalize(10), height: normalize(10), borderRadius: normalize(5), marginTop: normalize(10) },
  stopConnector: { width: 2, flex: 1, marginTop: normalize(4) },
  stopCard: { flex: 1, borderRadius: normalize(10), padding: normalize(10), marginLeft: normalize(8), marginBottom: normalize(6) },
  stopTopRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), marginBottom: normalize(3) },
  stopBadge: { paddingHorizontal: normalize(6), paddingVertical: normalize(2), borderRadius: normalize(6) },
  stopBadgeText: { fontFamily: FONTS.medium, fontSize: normalize(9), fontWeight: '700' },
  stopName: { fontFamily: FONTS.medium, fontSize: normalize(12), fontWeight: '600' },
  stopAddr: { fontFamily: FONTS.regular, fontSize: normalize(11) },

  // Trip Actions
  tripActionWrap: { marginTop: normalize(4) },
  startBtn: { borderRadius: normalize(14), overflow: 'hidden', ...SHADOWS.md },
  startBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: normalize(10), paddingVertical: normalize(16) },
  startBtnText: { fontFamily: FONTS.medium, fontSize: normalize(16), fontWeight: '700', color: '#FFF' },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(10),
    height: normalize(54),
    borderRadius: normalize(30),
    backgroundColor: '#FF0000',
    ...SHADOWS.md,
  },
  endBtnText: { fontFamily: FONTS.medium, fontSize: normalize(16), fontWeight: '700', color: '#FFF' },
  stopIcon: { width: normalize(14), height: normalize(14), borderRadius: normalize(3), backgroundColor: '#FFF' },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: normalize(12) },
  loadingText: { fontFamily: FONTS.regular, fontSize: normalize(14) },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: normalize(24), borderTopRightRadius: normalize(24), padding: SPACING.xl, paddingTop: SPACING.md, alignItems: 'center', ...SHADOWS.lg },
  modalHandle: { width: normalize(36), height: normalize(4), borderRadius: normalize(2), backgroundColor: '#D1D5DB', marginBottom: SPACING.lg },
  modalClose: { position: 'absolute', top: SPACING.md, right: SPACING.md, padding: SPACING.xs, zIndex: 1 },
  modalIcon: { width: normalize(56), height: normalize(56), borderRadius: normalize(28), alignItems: 'center', justifyContent: 'center', marginBottom: normalize(12) },
  modalTitle: { fontFamily: FONTS.medium, fontSize: normalize(18), fontWeight: '700', marginBottom: normalize(6), textAlign: 'center' },
  modalSub: { fontFamily: FONTS.regular, fontSize: normalize(13), textAlign: 'center', lineHeight: normalize(20), marginBottom: SPACING.md },
  modalHint: { fontFamily: FONTS.regular, fontSize: normalize(11), textAlign: 'center' },
  codeInput: { width: '100%', borderWidth: 2, borderRadius: normalize(14), padding: SPACING.md, fontSize: normalize(28), fontWeight: '800', textAlign: 'center', letterSpacing: normalize(16), marginBottom: SPACING.lg },
  modalBtns: { flexDirection: 'row', gap: SPACING.md, width: '100%' },
  modalCancelBtn: { flex: 1, borderRadius: normalize(14), overflow: 'hidden' },
  modalConfirmBtn: { flex: 1, borderRadius: normalize(14), overflow: 'hidden' },
  modalBtnGradient: { paddingVertical: normalize(14), alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '600', color: '#FFF' },
  modalConfirmText: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '700', color: '#FFF' },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: normalize(22),
  },
  confirmCard: {
    width: '100%',
    borderRadius: normalize(16),
    padding: normalize(16),
    ...SHADOWS.lg,
  },
  confirmTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(20),
    fontWeight: '700',
    marginBottom: normalize(10),
  },
  confirmMessage: {
    fontFamily: FONTS.regular,
    fontSize: normalize(14),
    lineHeight: normalize(21),
    marginBottom: normalize(16),
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: normalize(10),
  },
  confirmBtn: {
    flex: 1,
    borderRadius: normalize(12),
    overflow: 'hidden',
  },
  confirmBtnGradient: {
    paddingVertical: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(14),
    fontWeight: '700',
    color: '#FFF',
  },
});

export default DriverTripScreen;
