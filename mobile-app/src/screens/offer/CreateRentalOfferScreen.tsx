import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { Video, ResizeMode } from 'expo-av';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, MapPin, Calendar, Clock, Car, IndianRupee, FileText, Minus, Plus, ChevronDown } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';
import { rentalApi, vehicleApi } from '@utils/apiClient';
import LocationPicker, { LocationData } from '@components/common/LocationPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RENTAL_COMING_SOON = true; // V2 feature — flip to false to re-enable

const CreateRentalOfferScreen = () => {
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`🚀 CreateRentalOfferScreen component rendered (render #${renderCount.current})`);
  
  const navigation = useNavigation();

  if (RENTAL_COMING_SOON) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="dark-content" />
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', top: Platform.OS === 'android' ? 40 : 54, left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <LottieView source={require('../../../assets/videos/Coming soon.json')} autoPlay loop style={{ width: 300, height: 300 }} />
      </View>
    );
  }

  const { t } = useLanguage();
  const videoRef = useRef<Video>(null);
  
  // Check if documents are uploaded (in real app, get from user context/state)
  const [documentsUploaded, setDocumentsUploaded] = useState(false);
  const [isCheckingDocuments, setIsCheckingDocuments] = useState(true);

  // STATE DECLARATIONS - Must be at the top before any code that uses them
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [availableFrom, setAvailableFrom] = useState<Date>(new Date());
  const [availableUntil, setAvailableUntil] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFromTimePicker, setShowFromTimePicker] = useState(false);
  const [showUntilTimePicker, setShowUntilTimePicker] = useState(false);
  const [vehicleType, setVehicleType] = useState<'Car' | 'Bike' | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [userType, setUserType] = useState<'individual' | 'company'>('individual');
  const [pricePerHour, setPricePerHour] = useState('');
  const [minimumHours, setMinimumHours] = useState(2);
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Price calculation
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);

  // Check documents on screen focus - but don't reset state
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Screen focused - checking documents and loading data');
      checkDocumentsStatus();
      loadUserType();
      // Only load vehicles if we don't have any yet, or if vehicleType changed
      if (vehicles.length === 0 || vehicleType) {
      loadVehicles();
      }
    }, [])
  );

  // Load user type
  const loadUserType = async () => {
    try {
      const userData = await AsyncStorage.getItem('@user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUserType(parsed.userType || 'individual');
      }
    } catch (error) {
      console.error('Error loading user type:', error);
    }
  };

  // Load vehicles from backend
  const loadVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const response = await vehicleApi.getVehicles();
      if (response.success && response.data) {
        // Filter vehicles by selected type (Car -> car, Bike -> bike)
        const selectedType = vehicleType === 'Car' ? 'car' : vehicleType === 'Bike' ? 'bike' : null;
        const filteredVehicles = selectedType 
          ? response.data.filter((v: any) => v.type?.toLowerCase() === selectedType)
          : response.data;
        setVehicles(filteredVehicles);
        console.log(`✅ Loaded ${filteredVehicles.length} vehicles of type ${selectedType || 'all'}`);
      } else {
        Alert.alert('Error', 'Failed to load vehicles. Please add a vehicle first.');
        setVehicles([]);
      }
    } catch (error: any) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Error', 'Failed to load vehicles');
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  // Reload vehicles when vehicle type changes and auto-select if only one vehicle
  useEffect(() => {
    if (vehicleType && documentsUploaded) {
      loadVehicles();
      // Only reset selectedVehicle if vehicleType actually changed
      // Don't reset if user is just selecting a different vehicle of the same type
      setSelectedVehicle(null);
      setCalculatedPrice(null);
      setPriceBreakdown(null);
      setPricePerHour('');
    }
  }, [vehicleType]);

  // Auto-select vehicle when vehicles are loaded and match the selected type
  useEffect(() => {
    if (vehicles.length > 0 && vehicleType && !selectedVehicle) {
      const selectedType = vehicleType === 'Car' ? 'car' : vehicleType === 'Bike' ? 'bike' : null;
      const matchingVehicles = selectedType
        ? vehicles.filter((v: any) => v.type?.toLowerCase() === selectedType)
        : vehicles;
      if (matchingVehicles.length === 1) {
        // Auto-select if only one vehicle of this type
        setSelectedVehicle(matchingVehicles[0]);
      }
    }
  }, [vehicles, vehicleType]);

  const formatTime = (time: Date) => {
    let hours = time.getHours();
    const minutes = time.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const calculateRentalPrice = useCallback(async () => {
    console.log('💰 calculateRentalPrice function CALLED');
    // Check all required fields
    if (!selectedVehicle || !date || !availableFrom || !availableUntil || !pickupLocation) {
      // Only log if we have some data but not all (to avoid spam when form is empty)
      if (date || availableFrom || pickupLocation) {
        console.log('⚠️ Price calculation skipped - missing data:', {
          hasVehicle: !!selectedVehicle,
          hasDate: !!date,
          hasTime: !!availableFrom,
          hasUntil: !!availableUntil,
          hasLocation: !!pickupLocation,
          selectedVehicleValue: selectedVehicle ? 'exists' : 'null',
        });
      }
      return;
    }

    // Validate vehicle has required fields
    if (!selectedVehicle.brand || !selectedVehicle.seats || !selectedVehicle.fuelType || !selectedVehicle.transmission) {
      console.error('❌ Vehicle missing required fields:', {
        vehicleId: selectedVehicle.vehicleId,
        hasBrand: !!selectedVehicle.brand,
        hasSeats: !!selectedVehicle.seats,
        hasFuelType: !!selectedVehicle.fuelType,
        hasTransmission: !!selectedVehicle.transmission,
        vehicleObject: selectedVehicle,
      });
      Alert.alert('Vehicle Incomplete', 'Selected vehicle is missing required information. Please select a complete vehicle.');
      return;
    }

    try {
      setCalculatingPrice(true);
      
      const dateTime = new Date(date);
      dateTime.setHours(0);
      dateTime.setMinutes(0);
      dateTime.setSeconds(0);
      dateTime.setMilliseconds(0);

      // Build price calculation data with ALL vehicle details (same as AddVehicleScreen)
      // PLUS additional factors: location, date, time (for day/night and supply/demand)
      const priceData: any = {
        // Vehicle details (same as AddVehicleScreen) - required for base price calculation
        vehicleType: selectedVehicle.type?.toLowerCase() || (vehicleType === 'Car' ? 'car' : 'bike'),
        brand: selectedVehicle.brand,
        model: selectedVehicle.vehicleModel || selectedVehicle.model || undefined,
        year: selectedVehicle.year || undefined,
        seats: selectedVehicle.seats,
        fuelType: selectedVehicle.fuelType.charAt(0).toUpperCase() + selectedVehicle.fuelType.slice(1),
        transmission: selectedVehicle.transmission.charAt(0).toUpperCase() + selectedVehicle.transmission.slice(1),
        
        // Additional factors for rental offer (not in AddVehicleScreen)
        // Location city/state are optional in backend, so we can pass empty strings if not available
        location: pickupLocation ? {
          city: pickupLocation.city || '',
          state: pickupLocation.state || '',
        } : undefined,
        date: dateTime.toISOString(),
        availableFrom: formatTime(availableFrom),
        availableUntil: formatTime(availableUntil),
      };

      // If vehicleId is available, also pass it (backend can use it for validation)
      if (selectedVehicle.vehicleId) {
        priceData.vehicleId = selectedVehicle.vehicleId;
      }

      console.log('✅ Calculating price with vehicle details + rental factors:', {
        vehicleDetails: {
          vehicleType: priceData.vehicleType,
          brand: priceData.brand,
          model: priceData.model,
          year: priceData.year,
          seats: priceData.seats,
          fuelType: priceData.fuelType,
          transmission: priceData.transmission,
        },
        rentalFactors: {
          location: priceData.location,
          date: priceData.date,
          availableFrom: priceData.availableFrom,
          availableUntil: priceData.availableUntil,
        },
      });

      console.log('📊 Sending price calculation request:', JSON.stringify(priceData, null, 2));
      const response = await rentalApi.calculatePrice(priceData);
      
      console.log('📥 Price calculation response:', {
        success: response.success,
        hasData: !!response.data,
        error: response.error,
        message: response.message,
        responseData: response.data,
      });

      if (response.success && response.data) {
        console.log('✅ Price calculated successfully:', response.data);
        const suggestedPrice = response.data.suggestedPrice;
        const breakdown = response.data.breakdown || response.data;
        const factors = response.data.factors || [];
        
        console.log('💰 Setting price state:', {
          suggestedPrice,
          hasBreakdown: !!breakdown,
          hasFactors: factors.length > 0,
        });
        
        if (suggestedPrice && suggestedPrice > 0) {
          setCalculatedPrice(suggestedPrice);
          setPriceBreakdown({
            ...breakdown,
            factors: factors,
          });
          setPricePerHour(suggestedPrice.toString());
          console.log('✅ Price state updated successfully');
        } else {
          console.error('❌ Invalid price value:', suggestedPrice);
          Alert.alert('Error', 'Invalid price calculated. Please try again.');
        }
      } else {
        console.error('❌ Price calculation failed:', {
          success: response.success,
          error: response.error,
          message: response.message,
          fullResponse: response,
        });
        Alert.alert(
          'Price Calculation Failed', 
          response.error || response.message || 'Failed to calculate price. Please check vehicle details.'
        );
        setCalculatedPrice(null);
        setPriceBreakdown(null);
        setPricePerHour('');
      }
    } catch (error: any) {
      console.error('❌ Exception during price calculation:', {
        error,
        message: error?.message,
        stack: error?.stack,
        response: error?.response,
      });
      Alert.alert(
        'Error', 
        error?.message || error?.response?.data?.message || 'Failed to calculate price. Please check vehicle details.'
      );
      setCalculatedPrice(null);
      setPriceBreakdown(null);
      setPricePerHour('');
    } finally {
      setCalculatingPrice(false);
    }
  }, [selectedVehicle, date, availableFrom, availableUntil, pickupLocation, vehicleType]);

  // Check if all fields are filled for enabling Calculate Price button
  // Calculate directly - no memoization to ensure it always runs
  // Check if all fields are filled - use direct checks to avoid closure issues
  // IMPORTANT: These checks must happen AFTER state declarations (line 399-402)
  const hasVehicle = !!selectedVehicle;
  const hasDate = date instanceof Date && !isNaN(date.getTime());
  const hasFrom = availableFrom instanceof Date && !isNaN(availableFrom.getTime());
  const hasUntil = availableUntil instanceof Date && !isNaN(availableUntil.getTime());
  const hasLocation = !!pickupLocation;
  
  // Check vehicle properties - ensure they exist and have valid values
  const hasBrand = !!(selectedVehicle?.brand);
  const hasSeats = !!(selectedVehicle?.seats) && typeof selectedVehicle.seats === 'number';
  const hasFuelType = !!(selectedVehicle?.fuelType);
  const hasTransmission = !!(selectedVehicle?.transmission);
  
  const canCalculatePrice = hasVehicle && hasDate && hasFrom && hasUntil && hasLocation && 
                           hasBrand && hasSeats && hasFuelType && hasTransmission;
  
  // Debug: Log the actual state values with more detail
  console.log('🔍 State values at render:', {
    selectedVehicleExists: !!selectedVehicle,
    dateExists: !!date,
    dateType: typeof date,
    dateIsDate: date instanceof Date,
    dateValue: date ? date.toString() : 'NULL',
    dateIsValid: date instanceof Date ? !isNaN(date.getTime()) : false,
    availableFromExists: !!availableFrom,
    availableFromType: typeof availableFrom,
    availableFromIsDate: availableFrom instanceof Date,
    availableFromValue: availableFrom ? availableFrom.toString() : 'NULL',
    availableUntilExists: !!availableUntil,
    availableUntilType: typeof availableUntil,
    availableUntilIsDate: availableUntil instanceof Date,
    availableUntilValue: availableUntil ? availableUntil.toString() : 'NULL',
    pickupLocationExists: !!pickupLocation,
    canCalculatePrice,
  });

  // Always log on every render to debug
  console.log('🔍 canCalculatePrice check (EVERY RENDER):', {
    hasVehicle,
    hasDate,
    hasFrom,
    hasUntil,
    hasLocation,
    hasBrand,
    hasSeats,
    hasFuelType,
    hasTransmission,
    canCalculatePrice,
    selectedVehicle: selectedVehicle ? {
      brand: selectedVehicle.brand,
      seats: selectedVehicle.seats,
      fuelType: selectedVehicle.fuelType,
      transmission: selectedVehicle.transmission,
      type: typeof selectedVehicle,
      keys: Object.keys(selectedVehicle),
    } : 'NULL',
    dateValue: date ? date.toString() : 'NULL',
    fromValue: availableFrom ? availableFrom.toString() : 'NULL',
    untilValue: availableUntil ? availableUntil.toString() : 'NULL',
    locationValue: pickupLocation ? {
      address: pickupLocation.address,
      city: pickupLocation.city,
      state: pickupLocation.state,
    } : 'NULL',
  });

  // Debug: Log field status whenever dependencies change
  useEffect(() => {
    console.log('🔍 Calculate Price button status check:', {
      hasVehicle,
      hasDate,
      hasFrom,
      hasUntil,
      hasLocation,
      hasBrand,
      hasSeats,
      hasFuelType,
      hasTransmission,
      canCalculatePrice,
      selectedVehicleKeys: selectedVehicle ? Object.keys(selectedVehicle) : [],
      selectedVehicleFull: selectedVehicle, // Log entire vehicle object
      pickupLocationFull: pickupLocation, // Log entire location object
    });
  }, [selectedVehicle, date, availableFrom, availableUntil, pickupLocation]);

  const checkDocumentsStatus = async () => {
    try {
      setIsCheckingDocuments(true);
      console.log('🔍 Checking documents status for createRental...');
      
      // Import document utilities
      const { getUserDocuments, hasAllRequiredDocuments } = require('@utils/documentUtils');
      
      // Get existing documents from backend
      const existingDocuments = await getUserDocuments();
      
      console.log('📋 Existing documents:', existingDocuments);
      
      // Check if all required documents exist for offering rental
      // Offering rental needs Aadhar + Vehicle
      const hasAllDocuments = hasAllRequiredDocuments('createRental', existingDocuments);
      
      console.log('✅ Has all required documents:', hasAllDocuments);
      
      if (!hasAllDocuments || !existingDocuments) {
        console.log('❌ Missing documents, navigating to DocumentVerification...');
        // Navigate to document verification screen
        navigation.navigate('DocumentVerification' as never, {
          serviceType: 'createRental',
          onComplete: () => {
            console.log('✅ Documents completed, setting documentsUploaded to true');
            setDocumentsUploaded(true);
            setIsCheckingDocuments(false);
          },
        } as never);
      } else {
        console.log('✅ All documents present, allowing access to create rental');
        setDocumentsUploaded(true);
        setIsCheckingDocuments(false);
      }
    } catch (error) {
      console.error('❌ Error checking documents:', error);
      // If error, navigate to document verification
      navigation.navigate('DocumentVerification' as never, {
        serviceType: 'createRental',
        onComplete: () => {
          setDocumentsUploaded(true);
          setIsCheckingDocuments(false);
        },
      } as never);
    }
  };

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      console.log('📅 Date changed:', selectedDate.toString());
      setDate(selectedDate);
    }
  };

  const onFromTimeChange = (event: any, selectedTime?: Date) => {
    setShowFromTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      console.log('⏰ Available From changed:', selectedTime.toString());
      setAvailableFrom(selectedTime);
    }
  };

  const onUntilTimeChange = (event: any, selectedTime?: Date) => {
    setShowUntilTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      console.log('⏰ Available Until changed:', selectedTime.toString());
      setAvailableUntil(selectedTime);
    }
  };

  const handleLocationSelect = (location: LocationData) => {
    console.log('📍 Location selected:', location);
    setPickupLocation(location);
  };

  const handleCreate = async () => {
    if (!pickupLocation) {
      Alert.alert('Missing Information', 'Please select pickup location');
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
    // Price should be auto-calculated
    if (!calculatedPrice || calculatedPrice <= 0) {
      Alert.alert('Missing Information', 'Please wait for price calculation to complete. Ensure all fields are filled.');
      return;
    }
    // Ensure pricePerHour is set from calculated price
    if (!pricePerHour || parseFloat(pricePerHour) !== calculatedPrice) {
      setPricePerHour(calculatedPrice.toString());
    }

    try {
      setCreating(true);

      // Combine date with time
      const dateTime = new Date(date);
      dateTime.setHours(0);
      dateTime.setMinutes(0);
      dateTime.setSeconds(0);
      dateTime.setMilliseconds(0);

      // Prepare offer data
      const offerData = {
        ownerType: userType,
        vehicleId: selectedVehicle.vehicleId,
        location: {
          address: pickupLocation.address,
          lat: pickupLocation.lat,
          lng: pickupLocation.lng,
          city: pickupLocation.city,
          state: pickupLocation.state,
          pincode: pickupLocation.pincode,
        },
        date: dateTime.toISOString(),
        availableFrom: formatTime(availableFrom),
        availableUntil: formatTime(availableUntil),
        pricePerHour: parseFloat(pricePerHour),
        minimumHours: minimumHours,
        notes: notes || undefined,
      };

      console.log('Creating rental offer:', offerData);

      const response = await rentalApi.createOffer(offerData);

      if (response.success) {
        Alert.alert(
          'Success',
          'Rental offer created successfully!',
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
        Alert.alert('Error', response.error || 'Failed to create offer. Please try again.');
      }
    } catch (error: any) {
      console.error('Error creating offer:', error);
      Alert.alert('Error', error.message || 'Failed to create offer. Please try again.');
    } finally {
      setCreating(false);
    }
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
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Video Container */}
          <View style={styles.videoContainer}>
            <Video
              ref={videoRef}
              source={require('../../../assets/videos/car_rental.mp4')}
              style={styles.video}
              resizeMode={ResizeMode.COVER}
              isLooping
              isMuted
              shouldPlay
            />
            <View style={styles.videoOverlay}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
            <ArrowLeft size={24} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.quote}>
                {t('createRentalOffer.quote')}
              </Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('LocationPicker' as never, {
                  title: 'Select Pickup Location',
                  onLocationSelect: handleLocationSelect,
                  initialLocation: pickupLocation || undefined,
                } as never)
              }
            >
              <Input
                label={t('createRentalOffer.pickupAddress')}
                value={pickupLocation?.address || ''}
                placeholder={t('createRentalOffer.selectPickup')}
                editable={false}
                containerStyle={styles.input}
                leftIcon={<MapPin size={20} color={COLORS.textSecondary} />}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <Input
                label={t('createRentalOffer.date')}
                value={formatDate(date)}
                placeholder={t('common.select')}
                editable={false}
                containerStyle={styles.input}
                leftIcon={<Calendar size={20} color={COLORS.textSecondary} />}
              />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}

            <TouchableOpacity onPress={() => setShowFromTimePicker(true)}>
              <Input
                label={t('createRentalOffer.availableFrom')}
                value={formatTime(availableFrom)}
                placeholder={t('createRentalOffer.selectTime')}
                editable={false}
                containerStyle={styles.input}
                leftIcon={<Clock size={20} color={COLORS.textSecondary} />}
              />
            </TouchableOpacity>
            {showFromTimePicker && (
              <DateTimePicker
                value={availableFrom}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onFromTimeChange}
                is24Hour={false}
              />
            )}

            <TouchableOpacity onPress={() => setShowUntilTimePicker(true)}>
              <Input
                label={t('createRentalOffer.availableUntil')}
                value={formatTime(availableUntil)}
                placeholder={t('createRentalOffer.selectTime')}
                editable={false}
                containerStyle={styles.input}
                leftIcon={<Clock size={20} color={COLORS.textSecondary} />}
              />
            </TouchableOpacity>
            {showUntilTimePicker && (
              <DateTimePicker
                value={availableUntil}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onUntilTimeChange}
                is24Hour={false}
              />
            )}

            {/* Vehicle Type Selection */}
            <View style={styles.vehicleTypeContainer}>
              <Text style={styles.label}>{t('createRentalOffer.selectVehicleType')}</Text>
              <View style={styles.vehicleTypeOptions}>
                <TouchableOpacity
                  style={[
                    styles.vehicleTypeButton,
                    vehicleType === 'Car' && styles.vehicleTypeSelected,
                  ]}
                  onPress={() => {
                    setVehicleType('Car');
                    setSelectedVehicle(null);
                  }}
                >
                  <Image
                    source={require('../../../assets/car.jpg')}
                    style={styles.vehicleImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.vehicleTypeButton,
                    vehicleType === 'Bike' && styles.vehicleTypeSelected,
                  ]}
                  onPress={() => {
                    setVehicleType('Bike');
                    setSelectedVehicle(null);
                  }}
                >
                  <Image
                    source={require('../../../assets/bike.jpg')}
                    style={styles.vehicleImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Vehicle Selection Dropdown */}
            {vehicleType && (
              <View style={styles.vehicleSelectContainer}>
                <Text style={styles.label}>{t('createRentalOffer.selectVehicle')}</Text>
                {loadingVehicles ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading vehicles...</Text>
                  </View>
                ) : vehicles.length === 0 ? (
                  <TouchableOpacity
                    style={styles.addVehicleButton}
                    onPress={() => navigation.navigate('AddVehicle' as never)}
                  >
                    <Text style={styles.addVehicleText}>+ Add Vehicle</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowVehicleDropdown(!showVehicleDropdown)}
                    >
                      <Car size={20} color={COLORS.textSecondary} />
                      <Text style={[styles.dropdownText, selectedVehicle && styles.dropdownTextSelected]}>
                        {selectedVehicle 
                          ? `${selectedVehicle.brand || 'Vehicle'} - ${selectedVehicle.number}`
                          : t('createRentalOffer.chooseVehicle')}
                      </Text>
                      <ChevronDown size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    {showVehicleDropdown && (
                      <View style={styles.dropdownMenu}>
                        {vehicles
                          .filter((vehicle: any) => {
                            // Double-check filter: only show vehicles matching selected type
                            const selectedType = vehicleType === 'Car' ? 'car' : vehicleType === 'Bike' ? 'bike' : null;
                            return selectedType ? vehicle.type?.toLowerCase() === selectedType : true;
                          })
                          .map((vehicle) => (
                          <TouchableOpacity
                            key={vehicle.vehicleId}
                            style={styles.dropdownItem}
                            onPress={() => {
                                console.log('🚗 Vehicle selected:', {
                                  vehicleId: vehicle.vehicleId,
                                  brand: vehicle.brand,
                                  seats: vehicle.seats,
                                  fuelType: vehicle.fuelType,
                                  transmission: vehicle.transmission,
                                  type: vehicle.type,
                                  hasAllFields: !!(vehicle.brand && vehicle.seats && vehicle.fuelType && vehicle.transmission),
                                });
                                console.log('🚗 Setting selectedVehicle state with:', vehicle);
                              setSelectedVehicle(vehicle);
                              setShowVehicleDropdown(false);
                                // Force a re-render check after state update
                                setTimeout(() => {
                                  console.log('🚗 State updated - selectedVehicle should now be set');
                                }, 100);
                                // Price calculation will be triggered by useEffect when selectedVehicle changes
                            }}
                          >
                            <Text style={styles.dropdownItemText}>
                                {vehicle.brand || 'Vehicle'} {vehicle.vehicleModel || vehicle.model || ''} - {vehicle.number}
                            </Text>
                              <Text style={styles.dropdownItemSubtext}>
                                {vehicle.seats || 'N/A'} seats • {vehicle.fuelType || 'N/A'} • {vehicle.transmission || 'N/A'}
                              </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Calculate Price Button */}
            <View style={styles.calculatePriceContainer}>
              {/* Debug Info - Remove after fixing */}
              <View style={{ backgroundColor: '#f0f0f0', padding: 8, marginBottom: 8, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, color: '#666' }}>
                  Debug: Vehicle={hasVehicle ? '✓' : '✗'} Date={hasDate ? '✓' : '✗'} From={hasFrom ? '✓' : '✗'} Until={hasUntil ? '✓' : '✗'} Location={hasLocation ? '✓' : '✗'}
                </Text>
                <Text style={{ fontSize: 10, color: '#666' }}>
                  Brand={hasBrand ? '✓' : '✗'} Seats={hasSeats ? '✓' : '✗'} Fuel={hasFuelType ? '✓' : '✗'} Trans={hasTransmission ? '✓' : '✗'}
                </Text>
                <Text style={{ fontSize: 10, color: canCalculatePrice ? 'green' : 'red', fontWeight: 'bold' }}>
                  Can Calculate: {canCalculatePrice ? 'YES' : 'NO'}
                </Text>
                {selectedVehicle && (
                  <Text style={{ fontSize: 8, color: '#999', marginTop: 4 }}>
                    Vehicle keys: {Object.keys(selectedVehicle).join(', ')}
                  </Text>
                )}
                {selectedVehicle && (
                  <Text style={{ fontSize: 8, color: '#999' }}>
                    Brand: {selectedVehicle.brand || 'MISSING'} | Seats: {selectedVehicle.seats || 'MISSING'} | Fuel: {selectedVehicle.fuelType || 'MISSING'} | Trans: {selectedVehicle.transmission || 'MISSING'}
                  </Text>
                )}
              </View>
              
              <Button
                title={calculatingPrice ? 'Calculating...' : 'Calculate Price'}
                onPress={() => {
                  console.log('💰 Calculate Price button pressed');
                  calculateRentalPrice();
                }}
                variant="primary"
                size="large"
                style={styles.calculateButton}
                disabled={!canCalculatePrice || calculatingPrice}
              />
              {!canCalculatePrice && (
                <Text style={styles.calculateHint}>
                  Please fill all fields (vehicle, date, time, location) to calculate price
                </Text>
              )}
            </View>

            {/* Calculated Price Display */}
            {calculatedPrice && priceBreakdown && (
              <Card style={styles.priceCard}>
                <View style={styles.priceHeader}>
                  <Text style={styles.priceLabel}>💰 Suggested Price (Calculated)</Text>
                  {calculatingPrice && <ActivityIndicator size="small" color={COLORS.primary} />}
                </View>
                <Text style={styles.priceAmount}>₹{calculatedPrice}/hour</Text>
                <View style={styles.priceBreakdown}>
                  <Text style={styles.breakdownTitle}>Price Factors:</Text>
                  {priceBreakdown.factors && priceBreakdown.factors.map((factor: string, index: number) => (
                    <Text key={index} style={styles.breakdownText}>• {factor}</Text>
                  ))}
                </View>
                <Text style={styles.priceNote}>
                  Price is auto-calculated based on vehicle details, time (day/night), location, and market availability
                </Text>
              </Card>
            )}

            {/* Price Per Hour - Display calculated price */}
            <View style={styles.input}>
              <Text style={styles.label}>{t('createRentalOffer.pricePerHour')} *</Text>
              {calculatedPrice ? (
                <View style={styles.priceInputContainer}>
                  <View style={styles.priceDisplayContainer}>
                    <IndianRupee size={24} color={COLORS.primary} />
                    <Text style={styles.priceDisplay}>₹{calculatedPrice}/hour</Text>
                  </View>
                  <Text style={styles.priceNoteText}>
                    (Calculated based on vehicle, time, location, and availability)
                  </Text>
                </View>
              ) : (
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceNoteText}>
                    Click "Calculate Price" button above to see the suggested price
                  </Text>
                </View>
              )}
              {/* Hidden input for form submission */}
            <Input
              value={pricePerHour}
                onChangeText={() => {}} // Read-only
                placeholder="Price will be calculated"
              keyboardType="numeric"
                containerStyle={{ height: 0, opacity: 0, position: 'absolute' }}
                editable={false}
            />
            </View>

            {/* Minimum Rental Hours */}
          <View style={styles.hoursContainer}>
              <Text style={styles.label}>{t('createRentalOffer.minimumHours')}</Text>
              <View style={styles.hoursControlsWrapper}>
                <TouchableOpacity
                  style={styles.hoursButton}
                  onPress={() => setMinimumHours(Math.max(1, minimumHours - 1))}
                >
                  <Minus size={24} color={COLORS.white} />
              </TouchableOpacity>
                <View style={styles.hoursDisplay}>
              <Text style={styles.hoursCount}>{minimumHours}</Text>
                  <Text style={styles.hoursLabel}>{t('createRentalOffer.hours')}</Text>
                </View>
                <TouchableOpacity
                  style={styles.hoursButton}
                  onPress={() => setMinimumHours(minimumHours + 1)}
                >
                  <Plus size={24} color={COLORS.white} />
              </TouchableOpacity>
              </View>
            </View>

            <View style={styles.notesContainer}>
              <Text style={styles.label}>{t('createRentalOffer.additionalNotes')}</Text>
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder={t('createRentalOffer.enterAdditionalInfo')}
                multiline
                numberOfLines={4}
                containerStyle={styles.notesInput}
                leftIcon={<FileText size={20} color={COLORS.textSecondary} />}
              />
            </View>

            <Button
              title={creating ? 'Creating...' : t('createRentalOffer.createOffer')}
              onPress={handleCreate}
              variant="primary"
              size="large"
              style={styles.createButton}
              disabled={creating}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  videoContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 25, 82, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: 40,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: SPACING.md,
    padding: SPACING.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  quote: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
    letterSpacing: 0.3,
    paddingHorizontal: SPACING.sm,
  },
  formContainer: {
    padding: SPACING.md,
  },
  input: {
    marginBottom: SPACING.md,
  },
  vehicleTypeContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  vehicleTypeOptions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  vehicleTypeButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  vehicleTypeSelected: {
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  vehicleImage: {
    width: '100%',
    height: 140,
  },
  vehicleSelectContainer: {
    marginBottom: SPACING.md,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  dropdownText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    flex: 1,
  },
  dropdownTextSelected: {
    color: COLORS.text,
  },
  dropdownMenu: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.xs,
    ...SHADOWS.md,
  },
  dropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  dropdownItemText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  hoursContainer: {
    marginBottom: SPACING.md,
  },
  hoursControlsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  hoursButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  hoursDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  hoursCount: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxxl,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  hoursLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs / 2,
  },
  notesContainer: {
    marginBottom: SPACING.md,
  },
  notesInput: {
    minHeight: 100,
  },
  createButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
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
    marginTop: SPACING.sm,
  },
  vehicleSelectContainer: {
    marginBottom: SPACING.md,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  dropdownText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  dropdownTextSelected: {
    color: COLORS.text,
  },
  dropdownMenu: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xs,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  dropdownItemSubtext: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
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
    fontSize: 16,
    fontFamily: FONTS.medium,
  },
  priceCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    borderRadius: BORDER_RADIUS.md,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  priceLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  priceAmount: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  priceBreakdown: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  breakdownTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  breakdownText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs / 2,
  },
  priceNote: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  priceInputContainer: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    marginTop: SPACING.xs,
  },
  priceDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  priceDisplay: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  priceNoteText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  calculatePriceContainer: {
    marginBottom: SPACING.md,
  },
  calculateButton: {
    marginBottom: SPACING.xs,
  },
  calculateHint: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
});

export default CreateRentalOfferScreen;
