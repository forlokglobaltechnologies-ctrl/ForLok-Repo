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
  ImageBackground,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, MapPin, Clock, Navigation, Play, Square, Phone, MessageCircle, Users, LogIn, LogOut, KeyRound, X, ArrowRight, Route, Timer, Gauge, User, CircleDot, ChevronDown } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { trackingApi, bookingApi } from '@utils/apiClient';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    } else if (params.offerId) {
      findBookingForOffer();
    } else if (params.offer) {
      // If offer is provided but no booking yet, initialize with offer data
      initializeWithOffer(params.offer);
    }

    return () => {
      stopLocationTracking();
    };
  }, [bookingId, params.offerId, params.offer]);

  // Load passengers when trip is in progress
  useEffect(() => {
    if (isTracking && params.offerId) {
      loadPassengers();
    }
  }, [isTracking, params.offerId]);

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
    if (!params.offerId) return;

    try {
      setLoading(true);
      // Determine service type from offer - check if it has rental-specific fields
      // If offer has 'pricePerHour' or 'minimumHours', it's a rental, otherwise pooling
      const serviceType = (params.offer?.pricePerHour || params.offer?.minimumHours) ? 'rental' : 'pooling';
      
      console.log(`🔍 Looking for booking: offerId=${params.offerId}, serviceType=${serviceType}`);
      
      const response = await bookingApi.getBookingByOffer(params.offerId, serviceType);
      
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
                const matches = (serviceType === 'pooling' && b.poolingOfferId === params.offerId) ||
                                (serviceType === 'rental' && b.rentalOfferId === params.offerId);
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
    if (!params.offerId) return;

    try {
      const serviceType = (params.offer?.pricePerHour || params.offer?.minimumHours) ? 'rental' : 'pooling';
      const response = await bookingApi.getTripPassengers(params.offerId, serviceType);

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

  // Poll booking to detect payment choice by passenger
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

          // If passenger chose ONLINE and payment completed
          if (b.status === 'completed') {
            if (paymentPollRef.current) clearInterval(paymentPollRef.current);
            setShowCodeModal(false);
            setSelectedPassenger(null);
            Alert.alert(
              'Payment Received',
              `₹${b.totalAmount || ''} paid online. Trip completed!\n\nEarnings credited to your wallet.`,
              [{ text: 'OK', onPress: () => loadPassengers() }]
            );
          }
        }
      } catch (err) {
        console.error('Payment poll error:', err);
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
          `Cash payment recorded. Platform fee deducted from wallet.`,
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

  const handleWithdraw = async (passengerBookingId: string) => {
    Alert.alert(
      'Request Withdrawal',
      'Are you sure you want to request withdrawal for this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              const response = await bookingApi.requestWithdrawal(passengerBookingId);
              if (response.success) {
                Alert.alert('Success', 'Withdrawal request submitted. Admin will process it.');
                loadPassengers();
              } else {
                Alert.alert('Error', response.error || 'Failed to request withdrawal');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to request withdrawal');
            }
          },
        },
      ]
    );
  };

  const startTrip = async () => {
    let activeBookingId = currentBookingId || bookingId;
    
    // If no booking ID, try to find booking for the offer
    if (!activeBookingId && params.offerId) {
      try {
        // Determine service type from offer - check if it has rental-specific fields
        const serviceType = (params.offer?.pricePerHour || params.offer?.minimumHours) ? 'rental' : 'pooling';
        
        console.log(`🚀 Start Trip: Looking for booking - offerId=${params.offerId}, serviceType=${serviceType}`);
        
        const response = await bookingApi.getBookingByOffer(params.offerId, serviceType);
        
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
            console.log(`🔄 Fallback: Searching driver bookings for offer ${params.offerId}`);
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
                  const matches = (serviceType === 'pooling' && b.poolingOfferId === params.offerId) ||
                                  (serviceType === 'rental' && b.rentalOfferId === params.offerId);
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
        const serviceType = (params.offer?.pricePerHour || params.offer?.minimumHours) ? 'rental' : 'pooling';
        const startTripResponse = await bookingApi.startTrip(params.offerId || '', serviceType);
        
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
    if (!params.offerId) {
      Alert.alert('Error', 'Offer ID not found');
      return;
    }

    Alert.alert(
      'End Trip',
      'Are you sure you want to end this trip? All remaining bookings will be marked as completed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Trip',
          style: 'destructive',
          onPress: async () => {
            try {
              stopLocationTracking();
              setIsTracking(false);
              
              const serviceType = params.offer?.type === 'rental' ? 'rental' : 'pooling';
              
              // End entire trip (marks all bookings as completed and offer as completed)
              const response = await bookingApi.endTrip(params.offerId || '', serviceType);
              
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
          },
        },
      ]
    );
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
      case 'got_in': return { bg: '#4CAF50' + '15', color: '#4CAF50', label: 'In Vehicle' };
      case 'got_out': return { bg: '#2196F3' + '15', color: '#2196F3', label: 'Dropped Off' };
      default: return { bg: '#9E9E9E' + '15', color: '#9E9E9E', label: status || 'Unknown' };
    }
  };

  // ─── Loading State ───
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading trip details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Hero Header ── */}
      <ImageBackground
        source={require('../../../assets/track.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={40} style={styles.blurContainer}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.navTitle}>Driver Trip</Text>
              <Text style={styles.navSubtitle}>
                {isTracking ? 'Trip in progress' : 'Ready to start'}
              </Text>
            </View>
            {/* Live Indicator */}
            <View style={[styles.liveIndicator, { backgroundColor: isTracking ? '#4CAF50' : 'rgba(255,255,255,0.25)' }]}>
              <View style={[styles.liveDot, { backgroundColor: isTracking ? '#FFF' : 'rgba(255,255,255,0.5)' }]} />
              <Text style={styles.liveText}>{isTracking ? 'LIVE' : 'OFF'}</Text>
            </View>
          </View>
        </BlurView>
      </ImageBackground>

      {/* ── Map ── */}
      <View style={[styles.mapContainer, { borderColor: theme.colors.border }]}>
        {mapHTML ? (
          <WebView
            source={{ html: mapHTML }}
            style={styles.webView}
            javaScriptEnabled={true}
          />
        ) : (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.mapHint, { color: theme.colors.textSecondary }]}>Loading map...</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Metric Strip (below map) ── */}
        <View style={[styles.metricStrip, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.metricItem}>
            <Route size={14} color={theme.colors.primary} />
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{distance || 0} km</Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Distance</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.metricItem}>
            <Timer size={14} color={theme.colors.primary} />
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{duration || '0m'}</Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Duration</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.metricItem}>
            <Gauge size={14} color={theme.colors.primary} />
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>{eta || 0} min</Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>ETA</Text>
          </View>
        </View>

        {/* ── Route Card ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Route</Text>
          <View style={styles.routeSection}>
            <View style={[styles.routeBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <MapPin size={16} color={theme.colors.primary} />
              <Text style={[styles.routeText, { color: theme.colors.text }]} numberOfLines={2}>
                {getFromAddr()}
              </Text>
            </View>
            <View style={[styles.routeArrowCircle, { backgroundColor: theme.colors.primary + '15' }]}>
              <ArrowRight size={16} color={theme.colors.primary} />
            </View>
            <View style={[styles.routeBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <MapPin size={16} color="#F44336" />
              <Text style={[styles.routeText, { color: theme.colors.text }]} numberOfLines={2}>
                {getToAddr()}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Stopping Locations ── */}
        {stoppingLocations.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cardTitleRow}>
              <MapPin size={18} color={theme.colors.primary} />
              <Text style={[styles.cardTitle, { color: theme.colors.text, marginBottom: 0 }]}>Stops</Text>
              <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                <Text style={[styles.countBadgeText, { color: theme.colors.primary }]}>{stoppingLocations.length}</Text>
              </View>
            </View>

            {stoppingLocations.map((stop, index) => {
              const isPickup = stop.type === 'pickup';
              return (
                <View key={index} style={styles.stopRow}>
                  <View style={styles.stopTimeline}>
                    <View style={[styles.stopDot, { backgroundColor: isPickup ? '#4CAF50' : '#F44336' }]} />
                    {index < stoppingLocations.length - 1 && (
                      <View style={[styles.stopLine, { backgroundColor: theme.colors.border }]} />
                    )}
                  </View>
                  <View style={[styles.stopContent, { backgroundColor: theme.colors.background }]}>
                    <View style={styles.stopHeader}>
                      <View style={[styles.stopTypeBadge, { backgroundColor: (isPickup ? '#4CAF50' : '#F44336') + '15' }]}>
                        <Text style={[styles.stopTypeText, { color: isPickup ? '#4CAF50' : '#F44336' }]}>
                          {isPickup ? 'Pickup' : 'Dropoff'}
                        </Text>
                      </View>
                      <Text style={[styles.stopPassengerName, { color: theme.colors.text }]}>{stop.passengerName}</Text>
                    </View>
                    <Text style={[styles.stopAddress, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                      {typeof stop.location === 'object' ? stop.location.address : stop.location}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Passengers ── */}
        {passengers.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cardTitleRow}>
              <Users size={18} color={theme.colors.primary} />
              <Text style={[styles.cardTitle, { color: theme.colors.text, marginBottom: 0 }]}>Passengers</Text>
              <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                <Text style={[styles.countBadgeText, { color: theme.colors.primary }]}>{passengers.length}</Text>
              </View>
            </View>

            {passengers.map((passenger: any, index: number) => {
              const pStatus = getPassengerStatusStyle(passenger.passengerStatus);
              return (
                <View key={index} style={[styles.passengerCard, { backgroundColor: theme.colors.background }]}>
                  <View style={styles.passengerTop}>
                    <View style={[styles.passengerAvatar, { backgroundColor: theme.colors.primary + '15' }]}>
                      <User size={18} color={theme.colors.primary} />
                    </View>
                    <View style={styles.passengerInfo}>
                      <Text style={[styles.passengerName, { color: theme.colors.text }]}>{passenger.passengerName}</Text>
                      <View style={styles.passengerRouteRow}>
                        <Text style={[styles.passengerRouteText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          {typeof passenger.route?.from === 'object'
                            ? passenger.route.from.address?.split(',')[0]
                            : 'From'}
                        </Text>
                        <ArrowRight size={12} color={theme.colors.textSecondary} />
                        <Text style={[styles.passengerRouteText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          {typeof passenger.route?.to === 'object'
                            ? passenger.route.to.address?.split(',')[0]
                            : 'To'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.pStatusBadge, { backgroundColor: pStatus.bg }]}>
                      <Text style={[styles.pStatusText, { color: pStatus.color }]}>{pStatus.label}</Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.passengerActions}>
                    {passenger.passengerStatus === 'waiting' && (
                      <TouchableOpacity
                        style={[styles.pActionBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => handleGetIn(passenger.bookingId)}
                      >
                        <LogIn size={15} color="#FFF" />
                        <Text style={styles.pActionBtnText}>Get In</Text>
                      </TouchableOpacity>
                    )}
                    {(passenger.passengerStatus === 'got_in' || (passenger.passengerStatus === 'got_out' && passenger.status !== 'completed')) && (
                      <TouchableOpacity
                        style={[styles.pActionBtn, {
                          backgroundColor: passenger.passengerStatus === 'got_out' ? theme.colors.primary : 'transparent',
                          borderWidth: passenger.passengerStatus === 'got_out' ? 0 : 1.5,
                          borderColor: theme.colors.primary,
                        }]}
                        onPress={() => {
                          if (passenger.passengerStatus === 'got_out') {
                            if (passenger.paymentMethod === 'offline_cash' && passenger.passengerCode) {
                              setSelectedPassenger({ bookingId: passenger.bookingId, waitingForPayment: false, cashMode: true });
                              setShowCodeModal(true);
                            } else if (passenger.status === 'completed') {
                              Alert.alert('Completed', 'This trip is already completed.');
                            } else {
                              setSelectedPassenger({ bookingId: passenger.bookingId, waitingForPayment: true });
                              setShowCodeModal(true);
                              startPaymentPolling(passenger.bookingId);
                            }
                          } else {
                            handleGetOut(passenger.bookingId);
                          }
                        }}
                      >
                        {passenger.passengerStatus === 'got_out'
                          ? <KeyRound size={15} color="#FFF" />
                          : <LogOut size={15} color={theme.colors.primary} />}
                        <Text style={[styles.pActionBtnText, {
                          color: passenger.passengerStatus === 'got_out' ? '#FFF' : theme.colors.primary,
                        }]}>
                          {passenger.passengerStatus === 'got_out' ? 'Verify Code' : 'Get Out'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {passenger.status === 'completed' && passenger.settlementStatus === 'driver_requested' && (
                      <TouchableOpacity
                        style={[styles.pActionBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => handleWithdraw(passenger.bookingId)}
                      >
                        <KeyRound size={15} color="#FFF" />
                        <Text style={styles.pActionBtnText}>Withdraw</Text>
                      </TouchableOpacity>
                    )}
                    {passenger.status === 'completed' && !passenger.settlementStatus && (
                      <View style={[styles.completedBadge, { backgroundColor: '#4CAF50' + '15' }]}>
                        <Text style={[styles.completedBadgeText, { color: '#4CAF50' }]}>Completed</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Start / End Trip Button ── */}
        <View style={styles.tripActionContainer}>
          {!isTracking ? (
            <TouchableOpacity
              style={[styles.tripStartBtn, { backgroundColor: theme.colors.primary }]}
              onPress={startTrip}
              activeOpacity={0.85}
            >
              <Play size={22} color="#FFF" />
              <Text style={styles.tripStartBtnText}>Start Trip & Begin Tracking</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.tripEndBtn]}
              onPress={endTrip}
              activeOpacity={0.85}
            >
              <Square size={20} color="#F44336" />
              <Text style={styles.tripEndBtnText}>End Trip</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ── Payment / Code Modal ── */}
      <Modal
        visible={showCodeModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (paymentPollRef.current) clearInterval(paymentPollRef.current);
          setShowCodeModal(false);
          setPassengerCode('');
          setSelectedPassenger(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHandle} />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                if (paymentPollRef.current) clearInterval(paymentPollRef.current);
                setShowCodeModal(false);
                setPassengerCode('');
                setSelectedPassenger(null);
              }}
            >
              <X size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {/* STATE 1: Waiting for passenger to choose payment */}
            {selectedPassenger?.waitingForPayment && (
              <>
                <View style={[styles.modalIconCircle, { backgroundColor: theme.colors.primary + '12' }]}>
                  <Clock size={32} color={theme.colors.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Waiting for Payment</Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  Passenger has been notified to pay.{'\n'}Waiting for them to choose Online or Cash.
                </Text>
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 24 }} />
                <Text style={[styles.modalHint, { color: theme.colors.textSecondary }]}>
                  This screen will update automatically
                </Text>
              </>
            )}

            {/* STATE 2: Passenger chose CASH — enter code */}
            {selectedPassenger?.cashMode && (
              <>
                <View style={[styles.modalIconCircle, { backgroundColor: '#4CAF50' + '12' }]}>
                  <KeyRound size={32} color="#4CAF50" />
                </View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Enter Cash Code</Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  Passenger chose to pay cash.{'\n'}Ask them for the 4-digit code.
                </Text>

                <TextInput
                  style={[styles.codeInput, { borderColor: theme.colors.primary, backgroundColor: theme.colors.background, color: theme.colors.text }]}
                  value={passengerCode}
                  onChangeText={setPassengerCode}
                  placeholder="0000"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { borderColor: theme.colors.border }]}
                    onPress={() => {
                      if (paymentPollRef.current) clearInterval(paymentPollRef.current);
                      setShowCodeModal(false);
                      setPassengerCode('');
                      setSelectedPassenger(null);
                    }}
                  >
                    <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, {
                      backgroundColor: theme.colors.primary,
                      opacity: verifyingCode || passengerCode.length !== 4 ? 0.5 : 1,
                    }]}
                    onPress={handleVerifyCode}
                    disabled={verifyingCode || passengerCode.length !== 4}
                  >
                    <Text style={styles.modalConfirmText}>{verifyingCode ? 'Verifying...' : 'Verify Code'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  /* ── Container ── */
  container: {
    flex: 1,
  },

  /* ── Hero Header ── */
  headerImage: {
    width: '100%',
    height: 150,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.78,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  navTitle: {
    fontFamily: FONTS.regular,
    fontSize: 22,
    color: '#FFF',
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  navSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#FFF',
    fontWeight: '800',
    letterSpacing: 1,
  },

  /* ── Metric Strip (card below map) ── */
  metricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    fontWeight: '500',
  },
  metricDivider: {
    width: 1,
    height: 28,
  },

  /* ── Map ── */
  mapContainer: {
    height: 260,
    marginHorizontal: SPACING.md,
    marginTop: 23,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  webView: {
    flex: 1,
    height: 260,
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  mapHint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    marginTop: SPACING.sm,
  },

  /* ── Scroll ── */
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },

  /* ── Shared Card ── */
  card: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  cardTitle: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.md,
    letterSpacing: 0.2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.md,
  },
  countBadge: {
    marginLeft: 'auto',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: '800',
  },

  /* ── Route Display ── */
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 11,
    gap: 6,
  },
  routeText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  routeArrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Stopping Locations (Timeline) ── */
  stopRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  stopTimeline: {
    width: 24,
    alignItems: 'center',
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  stopLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  stopContent: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginLeft: 8,
    marginBottom: 8,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stopTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stopTypeText: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  stopPassengerName: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: '600',
  },
  stopAddress: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 17,
  },

  /* ── Passengers ── */
  passengerCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  passengerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '600',
  },
  passengerRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  passengerRouteText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    maxWidth: SCREEN_WIDTH * 0.25,
  },
  pStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pStatusText: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  passengerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  pActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  pActionBtnText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  completedBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  completedBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: '700',
  },

  /* ── Trip Action Buttons ── */
  tripActionContainer: {
    marginTop: SPACING.sm,
  },
  tripStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    ...SHADOWS.md,
  },
  tripStartBtnText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: '#FFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tripEndBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F44336',
    backgroundColor: '#F44336' + '08',
  },
  tripEndBtnText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: '#F44336',
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* ── Loading ── */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    marginTop: SPACING.md,
  },

  /* ── Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xl,
    paddingTop: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginBottom: SPACING.lg,
  },
  modalCloseButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    padding: SPACING.xs,
    zIndex: 1,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontFamily: FONTS.regular,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  modalHint: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    textAlign: 'center',
  },
  codeInput: {
    width: '100%',
    borderWidth: 2,
    borderRadius: 14,
    padding: SPACING.md,
    fontSize: 28,
    fontFamily: FONTS.regular,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 16,
    marginBottom: SPACING.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default DriverTripScreen;
