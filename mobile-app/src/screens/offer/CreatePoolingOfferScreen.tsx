import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, MapPin, Calendar, Clock, CheckCircle, IndianRupee, ChevronDown, ChevronRight, Car, Bike, Plus, X, GripVertical } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { normalize, wp, hp } from '@utils/responsive';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { useLanguage } from '@context/LanguageContext';
import { useSnackbar } from '@context/SnackbarContext';
import { poolingApi, vehicleApi } from '@utils/apiClient';
import LocationPicker, { LocationData } from '@components/common/LocationPicker';
import { getUserErrorMessage } from '@utils/errorUtils';

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
  const [suggestedWaypoints, setSuggestedWaypoints] = useState<Array<{ address: string; lat: number; lng: number; city?: string; order: number }>>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [minRequired, setMinRequired] = useState(0);
  const [routeDistanceKm, setRouteDistanceKm] = useState(0);
  const route = useRoute();

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
    // Load locked vehicles in background (non-blocking)
    try {
      const offersRes = await poolingApi.getOffers();
      if (offersRes.success && offersRes.data) {
        const activeStatuses = ['active', 'pending', 'in_progress', 'booked'];
        const lockedNumbers = new Set<string>(
          offersRes.data
            .filter((o: any) => activeStatuses.includes(o.status))
            .map((o: any) => o.vehicle?.number)
            .filter(Boolean)
        );
        console.log('🔒 Locked vehicle numbers:', [...lockedNumbers]);
        setLockedVehicleIds(lockedNumbers);
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
    if (fromLocation && toLocation) {
      fetchSuggestedWaypoints();
    } else {
      setSuggestedWaypoints([]);
      setSelectedSuggestions(new Set());
    }
  }, [fromLocation?.lat, fromLocation?.lng, toLocation?.lat, toLocation?.lng]);

  const fetchSuggestedWaypoints = async () => {
    if (!fromLocation || !toLocation) return;
    try {
      setLoadingSuggestions(true);
      const res = await poolingApi.suggestWaypoints({
        fromLat: fromLocation.lat,
        fromLng: fromLocation.lng,
        toLat: toLocation.lat,
        toLng: toLocation.lng,
      });
      if (res.success && res.data) {
        setSuggestedWaypoints(res.data.waypoints || []);
        setMinRequired(res.data.minRequired || 0);
        setRouteDistanceKm(res.data.routeDistanceKm || 0);
        setSelectedSuggestions(new Set());
      }
    } catch (err) {
      console.warn('Failed to fetch suggested waypoints:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const toggleSuggestion = (idx: number) => {
    const next = new Set(selectedSuggestions);
    const sw = suggestedWaypoints[idx];
    if (next.has(idx)) {
      next.delete(idx);
      setWaypoints((prev) => prev.filter((wp) => wp.lat !== sw.lat || wp.lng !== sw.lng));
    } else {
      if (waypoints.length >= 5) return;
      next.add(idx);
      setWaypoints((prev) => [...prev, { address: sw.address, lat: sw.lat, lng: sw.lng, city: sw.city } as LocationData]);
    }
    setSelectedSuggestions(next);
  };

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

  const handleAddWaypoint = (location: LocationData) => {
    if (waypoints.length < 5) {
      setWaypoints([...waypoints, location]);
    }
  };

  const handleRemoveWaypoint = (index: number) => {
    setWaypoints(waypoints.filter((_, i) => i !== index));
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

    // Validate date+time is in the future
    const combinedDateTime = new Date(date);
    combinedDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);
    if (combinedDateTime.getTime() <= Date.now()) {
      Alert.alert('Invalid Date/Time', 'Please select a date and time in the future.');
      return;
    }

    // Soft validation: warn if fewer waypoints than recommended
    if (minRequired > 0 && waypoints.length < minRequired) {
      return new Promise<void>((resolve) => {
        Alert.alert(
          'Add More Stops?',
          `For a ${routeDistanceKm} km route, we recommend at least ${minRequired} stop${minRequired > 1 ? 's' : ''} to help passengers find your ride. You've added ${waypoints.length}.\n\nContinue anyway?`,
          [
            { text: 'Add Stops', style: 'cancel', onPress: () => resolve() },
            { text: 'Continue', onPress: () => { proceedCreate(); resolve(); } },
          ]
        );
      });
    }
    return proceedCreate();
  };

  const proceedCreate = async () => {
    try {
      setCreating(true);

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
        showSnackbar({
          message: getUserErrorMessage(response as any, 'Failed to create offer. Please try again.'),
          type: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error creating offer:', error);
      showSnackbar({ message: error.message || 'Failed to create offer. Please try again.', type: 'error' });
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
      <View style={styles.stickyHeader}>
        <TouchableOpacity style={styles.heroBackButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.heroTitle}>Give a Ride</Text>
        <View style={styles.heroRightSpacer} />
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
          {/* Uber/Rapido style clean header */}
          <View style={styles.heroSection}>
            <Image
              source={require('../../../assets/forlok_give_ride_vector_blue_bg_v2.png')}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Route Details</Text>
              </View>

              <View style={styles.routeRowsWrap}>
                <TouchableOpacity
                  style={styles.routeRow}
                  onPress={() =>
                    navigation.navigate('LocationPicker' as never, {
                      title: 'Select Pickup Location',
                      onLocationSelect: handleFromLocationSelect,
                      initialLocation: fromLocation || undefined,
                    } as never)
                  }
                >
                  <View style={styles.routeMarkerCol}>
                    <View style={[styles.routeIconBadge, styles.routeIconBadgeFrom]}>
                      <MapPin size={14} color="#16A34A" />
                    </View>
                  </View>
                  <View style={styles.routeTextWrap}>
                    <Text style={styles.routeRowLabel}>{cleanFieldLabel(t('createPoolingOffer.from'))}</Text>
                    <Text style={[styles.routeRowValue, !fromLocation && styles.routeRowPlaceholder]} numberOfLines={1}>
                      {fromLocation?.address || t('createPoolingOffer.selectPickup')}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.routeRow}
                  onPress={() =>
                    navigation.navigate('LocationPicker' as never, {
                      title: 'Select Destination',
                      onLocationSelect: handleToLocationSelect,
                      initialLocation: toLocation || undefined,
                    } as never)
                  }
                >
                  <View style={styles.routeMarkerCol}>
                    <View style={[styles.routeIconBadge, styles.routeIconBadgeTo]}>
                      <MapPin size={14} color="#DC2626" />
                    </View>
                  </View>
                  <View style={styles.routeTextWrap}>
                    <Text style={styles.routeRowLabel}>{cleanFieldLabel(t('createPoolingOffer.to'))}</Text>
                    <Text style={[styles.routeRowValue, !toLocation && styles.routeRowPlaceholder]} numberOfLines={1}>
                      {toLocation?.address || t('createPoolingOffer.selectDestination')}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.waypointsSection}>
                {suggestedWaypoints.length > 0 && (
                  <View style={styles.suggestedBlock}>
                    <Text style={styles.label}>Suggested Stops ({routeDistanceKm} km route)</Text>
                    {minRequired > 0 && (
                      <Text style={styles.suggestedHint}>
                        At least {minRequired} stop{minRequired > 1 ? 's' : ''} recommended for better matching
                      </Text>
                    )}
                    {suggestedWaypoints.map((sw, idx) => {
                      const isSelected = selectedSuggestions.has(idx);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.suggestedRow, isSelected && styles.suggestedRowSelected]}
                          onPress={() => toggleSuggestion(idx)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.suggestedCheck, isSelected && styles.suggestedCheckActive]}>
                            {isSelected && <CheckCircle size={18} color="#fff" />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.suggestedCity} numberOfLines={1}>
                              {sw.city || sw.address.split(',')[0]}
                            </Text>
                            <Text style={styles.suggestedAddr} numberOfLines={1}>
                              {sw.address}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {loadingSuggestions && (
                  <View style={styles.suggestedLoading}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.suggestedLoadingText}>Finding stops along your route...</Text>
                  </View>
                )}

                {waypoints.length > 0 && (
                  <Text style={[styles.label, { marginTop: suggestedWaypoints.length > 0 ? SPACING.md : 0 }]}>
                    Selected Stops ({waypoints.length})
                  </Text>
                )}

                {waypoints.map((wp, idx) => (
                  <View key={idx} style={styles.waypointRow}>
                    <View style={styles.waypointDot}>
                      <View style={styles.waypointDotInner} />
                    </View>
                    <Text style={styles.waypointAddress} numberOfLines={1}>{wp.address}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        const removed = waypoints[idx];
                        handleRemoveWaypoint(idx);
                        const sugIdx = suggestedWaypoints.findIndex((s) => s.lat === removed.lat && s.lng === removed.lng);
                        if (sugIdx >= 0) {
                          setSelectedSuggestions((prev) => { const n = new Set(prev); n.delete(sugIdx); return n; });
                        }
                      }}
                      style={styles.waypointRemove}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={16} color={COLORS.error || '#E53935'} />
                    </TouchableOpacity>
                  </View>
                ))}

                {waypoints.length < 5 && (
                  <TouchableOpacity
                    style={styles.addWaypointBtn}
                    onPress={() =>
                      navigation.navigate('LocationPicker' as never, {
                        title: `Add Stop ${waypoints.length + 1}`,
                        onLocationSelect: handleAddWaypoint,
                      } as never)
                    }
                  >
                    <Plus size={18} color={COLORS.primary} />
                    <Text style={styles.addWaypointText}>Add a way-point along the way</Text>
                  </TouchableOpacity>
                )}
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

            <View style={styles.sectionCard}>
             

              <View style={styles.vehicleTypeContainer}>
                <Text style={styles.label}>{t('dashboard.selectYourVehicle')}</Text>
                <View style={styles.vehicleTypeOptions}>
                  {([
                    { type: 'Car' as const, lucide: Car, color: '#1565C0', bg: '#E3F2FD', label: 'Car' },
                    { type: 'Bike' as const, lucide: Bike, color: '#E65100', bg: '#FFF3E0', label: 'Bike' },
                    { type: 'Scooty' as const, lucide: null, color: '#6A1B9A', bg: '#F3E5F5', label: 'Scooty' },
                  ]).map((vt) => {
                    const isSelected = vehicleType === vt.type;
                    return (
                      <TouchableOpacity
                        key={vt.type}
                        style={[
                          styles.vehicleTypeButton,
                          { backgroundColor: isSelected ? vt.bg : '#F7FAFF', borderColor: isSelected ? vt.color : '#DDE6F5' },
                        ]}
                        onPress={() => {
                          setVehicleType(vt.type);
                          setSelectedVehicle(null);
                          setShowVehicleDropdown(false);
                          setAvailableSeats(1);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.vehicleIconWrap, { backgroundColor: isSelected ? vt.color : vt.bg }]}>
                          {vt.lucide ? (
                            <vt.lucide size={22} color={isSelected ? '#FFF' : vt.color} />
                          ) : (
                            <MaterialCommunityIcons name="moped" size={22} color={isSelected ? '#FFF' : vt.color} />
                          )}
                        </View>
                        <Text style={[styles.vehicleTypeLabel, { color: isSelected ? vt.color : COLORS.text }]}>{vt.label}</Text>
                        {isSelected && <View style={[styles.vehicleCheckDot, { backgroundColor: vt.color }]} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {vehicleType && (
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
                              if (vehicle.seats && availableSeats > vehicle.seats) {
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
              )}

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
                          (vehicleType === 'Bike' || vehicleType === 'Scooty') && num > 1 && styles.seatRangeDisabled,
                        ]}
                        onPress={() => {
                          if ((vehicleType === 'Bike' || vehicleType === 'Scooty') && num > 1) return;
                          setAvailableSeats(num);
                        }}
                        disabled={(vehicleType === 'Bike' || vehicleType === 'Scooty') && num > 1}
                      >
                        <Text
                          style={[
                            styles.seatRangeText,
                            availableSeats === num && styles.seatRangeTextSelected,
                            (vehicleType === 'Bike' || vehicleType === 'Scooty') && num > 1 && styles.seatRangeTextDisabled,
                          ]}
                        >
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {(vehicleType === 'Bike' || vehicleType === 'Scooty') && (
                    <Text style={styles.hint}>Only 1 seat available for {vehicleType}</Text>
                  )}
                </View>
              </View>
            </View>

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

            <Button
              title={creating ? 'Creating...' : t('createPoolingOffer.createOffer')}
              onPress={handleCreate}
              variant="primary"
              size="large"
              style={[styles.createButton, styles.createButtonModern]}
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
    backgroundColor: '#F5F7FB',
  },
  stickyHeader: {
    backgroundColor: '#F5F7FB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: normalize(24),
    paddingBottom: normalize(2),
    zIndex: 20,
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
  heroSection: {
    width: '100%',
    backgroundColor: '#F5F7FB',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: normalize(8),
  },
  heroBackButton: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(19),
    fontWeight: '700',
    color: COLORS.text,
  },
  heroRightSpacer: { width: normalize(36), height: normalize(36) },
  heroImage: {
    width: '100%',
    height: normalize(138),
    marginTop: 0,
    marginBottom: 0,
  },
  formContainer: {
    padding: SPACING.md,
    paddingTop: normalize(14),
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
    marginBottom: SPACING.md,
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
  createButton: {
    marginTop: normalize(4),
    marginBottom: SPACING.xl,
  },
  createButtonModern: {
    borderRadius: normalize(14),
    ...SHADOWS.md,
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
  suggestedBlock: {
    marginBottom: SPACING.sm,
  },
  suggestedHint: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: COLORS.primary,
    marginBottom: normalize(8),
    fontStyle: 'italic',
  },
  suggestedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: normalize(10),
    paddingHorizontal: SPACING.sm,
    marginBottom: normalize(6),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestedRowSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#43A047',
  },
  suggestedCheck: {
    width: normalize(26),
    height: normalize(26),
    borderRadius: normalize(13),
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: normalize(10),
  },
  suggestedCheckActive: {
    backgroundColor: '#43A047',
    borderColor: '#43A047',
  },
  suggestedCity: {
    fontFamily: FONTS.medium,
    fontSize: normalize(14),
    color: COLORS.text,
    fontWeight: '600',
  },
  suggestedAddr: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: COLORS.textSecondary,
    marginTop: normalize(2),
  },
  suggestedLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: normalize(12),
    gap: normalize(8),
  },
  suggestedLoadingText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    color: COLORS.textSecondary,
  },
});

export default CreatePoolingOfferScreen;
