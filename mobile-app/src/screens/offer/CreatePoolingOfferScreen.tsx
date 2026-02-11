import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, MapPin, Calendar, Clock, CheckCircle, IndianRupee, FileText, ChevronDown } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { useLanguage } from '@context/LanguageContext';
import { poolingApi, vehicleApi } from '@utils/apiClient';
import LocationPicker, { LocationData } from '@components/common/LocationPicker';

const CreatePoolingOfferScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const videoRef = useRef<Video>(null);
  
  // Check if documents are uploaded (in real app, get from user context/state)
  const [documentsUploaded, setDocumentsUploaded] = useState(false);
  const [isCheckingDocuments, setIsCheckingDocuments] = useState(true);

  // Check documents on screen focus
  useFocusEffect(
    React.useCallback(() => {
      checkDocumentsStatus();
      loadVehicles();
    }, [])
  );

  // Load vehicles from backend
  const loadVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const response = await vehicleApi.getVehicles();
      if (response.success && response.data) {
        const filteredVehicles = response.data.filter((v: any) => 
          vehicleType ? v.type.toLowerCase() === vehicleType.toLowerCase() : true
        );
        setVehicles(filteredVehicles);
      } else {
        Alert.alert('Error', 'Failed to load vehicles. Please add a vehicle first.');
      }
    } catch (error: any) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Error', 'Failed to load vehicles');
    } finally {
      setLoadingVehicles(false);
    }
  };

  // Reload vehicles when vehicle type changes and auto-select if only one vehicle
  useEffect(() => {
    if (vehicleType && documentsUploaded) {
      loadVehicles();
      setSelectedVehicle(null);
    }
  }, [vehicleType]);

  // Auto-select vehicle when vehicles are loaded and match the selected type
  useEffect(() => {
    if (vehicles.length > 0 && vehicleType && !selectedVehicle) {
      const matchingVehicles = vehicles.filter((v: any) => 
        v.type.toLowerCase() === vehicleType.toLowerCase()
      );
      if (matchingVehicles.length === 1) {
        // Auto-select if only one vehicle of this type
        setSelectedVehicle(matchingVehicles[0]);
        if (matchingVehicles[0].seats && availableSeats > matchingVehicles[0].seats) {
          setAvailableSeats(matchingVehicles[0].seats);
        }
      }
    }
  }, [vehicles, vehicleType]);

  const checkDocumentsStatus = async () => {
    try {
      setIsCheckingDocuments(true);
      console.log('🔍 Checking documents status for createPooling...');
      
      // Import document utilities
      const { getUserDocuments, hasAllRequiredDocuments } = require('@utils/documentUtils');
      
      // Get existing documents from backend
      const existingDocuments = await getUserDocuments();
      
      console.log('📋 Existing documents:', existingDocuments);
      
      // Check if all required documents exist for offering pooling
      const hasAllDocuments = hasAllRequiredDocuments('createPooling', existingDocuments);
      
      console.log('✅ Has all required documents:', hasAllDocuments);
      
      if (!hasAllDocuments || !existingDocuments) {
        console.log('❌ Missing documents, navigating to DocumentVerification...');
        // Navigate to document verification screen
        navigation.navigate('DocumentVerification' as never, {
          serviceType: 'createPooling',
          onComplete: () => {
            console.log('✅ Documents completed, setting documentsUploaded to true');
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
      // If error, navigate to document verification
      navigation.navigate('DocumentVerification' as never, {
        serviceType: 'createPooling',
        onComplete: () => {
          setDocumentsUploaded(true);
          setIsCheckingDocuments(false);
        },
      } as never);
    }
  };
  const [fromLocation, setFromLocation] = useState<LocationData | null>(null);
  const [toLocation, setToLocation] = useState<LocationData | null>(null);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [vehicleType, setVehicleType] = useState<'Car' | 'Bike' | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [availableSeats, setAvailableSeats] = useState(1);
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const route = useRoute();

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

    try {
      setCreating(true);

      // Combine date and time
      const dateTime = new Date(date);
      dateTime.setHours(time.getHours());
      dateTime.setMinutes(time.getMinutes());
      dateTime.setSeconds(0);
      dateTime.setMilliseconds(0);

      // Prepare offer data
      const offerData = {
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
        },
        date: dateTime.toISOString(),
        time: formatTime(time),
        vehicleId: selectedVehicle.vehicleId,
        availableSeats: parseInt(availableSeats.toString()),
        notes: notes || undefined,
      };

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
        Alert.alert('Error', response.error || 'Failed to create offer. Please try again.');
      }
    } catch (error: any) {
      console.error('Error creating offer:', error);
      Alert.alert('Error', error.message || 'Failed to create offer. Please try again.');
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
              source={require('../../../assets/videos/craete_pooling.mp4')}
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
                "Share the journey, share the joy.{'\n'}Create your pool today!"
              </Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
          <TouchableOpacity
              onPress={() =>
                navigation.navigate('LocationPicker' as never, {
                  title: 'Select Pickup Location',
                  onLocationSelect: handleFromLocationSelect,
                  initialLocation: fromLocation || undefined,
                } as never)
              }
          >
            <Input
                label={t('createPoolingOffer.from')}
              value={fromLocation?.address || ''}
                placeholder={t('createPoolingOffer.selectPickup')}
              editable={false}
              containerStyle={styles.input}
                leftIcon={<MapPin size={20} color={COLORS.textSecondary} />}
            />
          </TouchableOpacity>

          <TouchableOpacity
              onPress={() =>
                navigation.navigate('LocationPicker' as never, {
                  title: 'Select Destination',
                  onLocationSelect: handleToLocationSelect,
                  initialLocation: toLocation || undefined,
                } as never)
              }
          >
            <Input
                label={t('createPoolingOffer.to')}
              value={toLocation?.address || ''}
                placeholder={t('createPoolingOffer.selectDestination')}
              editable={false}
              containerStyle={styles.input}
                leftIcon={<MapPin size={20} color={COLORS.textSecondary} />}
            />
          </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Input
                label={t('createPoolingOffer.date')}
                value={formatDate(date)}
                placeholder={t('createPoolingOffer.date')}
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

            <TouchableOpacity onPress={() => setShowTimePicker(true)}>
            <Input
                label={t('createPoolingOffer.time')}
                value={formatTime(time)}
                placeholder={t('createPoolingOffer.time')}
              editable={false}
              containerStyle={styles.input}
                leftIcon={<Clock size={20} color={COLORS.textSecondary} />}
            />
          </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
                is24Hour={false}
              />
            )}

            {/* Vehicle Type Selection */}
          <View style={styles.vehicleTypeContainer}>
              <Text style={styles.label}>{t('dashboard.selectYourVehicle')}</Text>
            <View style={styles.vehicleTypeOptions}>
              <TouchableOpacity
                style={[
                  styles.vehicleTypeButton,
                  vehicleType === 'Car' && styles.vehicleTypeSelected,
                ]}
                  onPress={() => {
                    setVehicleType('Car');
                    setSelectedVehicle(null);
                    setAvailableSeats(1);
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
                    setAvailableSeats(1);
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

          {/* Vehicle Selection */}
          {vehicleType && (
            <View style={styles.vehicleSelectContainer}>
              <Text style={styles.label}>Select Vehicle *</Text>
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
                <TouchableOpacity
                  style={styles.vehicleDropdown}
                  onPress={() => setShowVehicleDropdown(!showVehicleDropdown)}
                >
                  <Text style={[styles.vehicleDropdownText, !selectedVehicle && styles.placeholderText]}>
                    {selectedVehicle 
                      ? `${selectedVehicle.brand || 'Vehicle'} - ${selectedVehicle.number}`
                      : 'Select a vehicle'}
                  </Text>
                  <ChevronDown size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
              
              {showVehicleDropdown && vehicles.length > 0 && (
                <View style={styles.vehicleDropdownList}>
                  {vehicles.map((vehicle) => (
                    <TouchableOpacity
                      key={vehicle.vehicleId}
                      style={styles.vehicleDropdownItem}
                      onPress={() => {
                        setSelectedVehicle(vehicle);
                        setShowVehicleDropdown(false);
                        // Set max seats based on vehicle
                        if (vehicle.seats && availableSeats > vehicle.seats) {
                          setAvailableSeats(vehicle.seats);
                        }
                      }}
                    >
                      <Text style={styles.vehicleDropdownItemText}>
                        {vehicle.brand || 'Vehicle'} - {vehicle.number}
                      </Text>
                      {vehicle.seats && (
                        <Text style={styles.vehicleDropdownItemSubtext}>
                          {vehicle.seats} seats
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

            {/* Available Seats */}
          <View style={styles.seatsContainer}>
              <Text style={styles.label}>{t('createPoolingOffer.availableSeats')}</Text>
              <View style={styles.seatsRangeContainer}>
                <View style={styles.seatsRangeRow}>
                  {[1, 2, 3, 4, 5, 6].map((num) => (
              <TouchableOpacity
                      key={num}
                      style={[
                        styles.seatRangeButton,
                        availableSeats === num && styles.seatRangeSelected,
                        vehicleType === 'Bike' && num > 1 && styles.seatRangeDisabled,
                      ]}
                      onPress={() => {
                        if (vehicleType === 'Bike' && num > 1) return;
                        setAvailableSeats(num);
                      }}
                      disabled={vehicleType === 'Bike' && num > 1}
                    >
                      <Text
                        style={[
                          styles.seatRangeText,
                          availableSeats === num && styles.seatRangeTextSelected,
                          vehicleType === 'Bike' && num > 1 && styles.seatRangeTextDisabled,
                        ]}
                      >
                        {num}
                      </Text>
              </TouchableOpacity>
                  ))}
                </View>
                {vehicleType === 'Bike' && (
                  <Text style={styles.hint}>Only 1 seat available for Bike</Text>
                )}
              </View>
          </View>


          <View style={styles.notesContainer}>
              <Text style={styles.label}>{t('createPoolingOffer.additionalNotes')}</Text>
            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder={t('createPoolingOffer.additionalNotes')}
              multiline
              numberOfLines={4}
              containerStyle={styles.notesInput}
                leftIcon={<FileText size={20} color={COLORS.textSecondary} />}
            />
          </View>

          <Button
              title={creating ? 'Creating...' : t('createPoolingOffer.createOffer')}
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
    backgroundColor: COLORS.background,
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
  seatsContainer: {
    marginBottom: SPACING.md,
  },
  seatsRangeContainer: {
    marginTop: SPACING.xs,
  },
  seatsRangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  seatRangeButton: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  seatRangeSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  seatRangeDisabled: {
    backgroundColor: COLORS.lightGray,
    opacity: 0.5,
  },
  seatRangeText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
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
  },
  vehicleSelectContainer: {
    marginBottom: SPACING.md,
  },
  vehicleDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  vehicleDropdownText: {
    fontSize: 16,
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
    maxHeight: 200,
  },
  vehicleDropdownItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  vehicleDropdownItemText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  vehicleDropdownItemSubtext: {
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
});

export default CreatePoolingOfferScreen;
