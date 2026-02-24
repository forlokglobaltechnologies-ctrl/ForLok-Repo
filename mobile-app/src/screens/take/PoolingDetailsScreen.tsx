import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  Image, ActivityIndicator, Alert, Dimensions, Share, TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft, Heart, Share2, MapPin, Star, User, Calendar, Clock, Car, Tag,
  Users, IndianRupee, FileText, Shield, ChevronRight, Phone, MessageSquare,
  Zap, Leaf, CheckCircle,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { normalize, wp, hp } from '@utils/responsive';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { useAuth } from '@context/AuthContext';
import { poolingApi } from '@utils/apiClient';
import LocationPicker, { LocationData } from '@components/common/LocationPicker';

const SCREEN_W = Dimensions.get('window').width;

type CoPassengerInput = {
  name: string;
  age: string;
  gender: 'Male' | 'Female' | 'Other';
};

const PoolingDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { user } = useAuth();
  const params = route.params as any;
  const offerId = params?.offerId;
  const passedOffer = params?.offer;
  const passedPassengerRoute = params?.passengerRoute;
  const seatsRequested = Math.max(1, Number(params?.seatsRequested || 1));

  const [offer, setOffer] = useState<any>(passedOffer || null);
  const [loading, setLoading] = useState(!!offerId && !passedOffer);
  const [joining, setJoining] = useState(false);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [liked, setLiked] = useState(false);
  const [passengerRoute, setPassengerRoute] = useState<{
    from: LocationData | null;
    to: LocationData | null;
  }>({
    from: passedPassengerRoute?.from || null,
    to: passedPassengerRoute?.to || null,
  });
  const [selectedSeats, setSelectedSeats] = useState<number>(seatsRequested);
  const [primaryPassenger, setPrimaryPassenger] = useState<{ name: string; gender: 'Male' | 'Female' | 'Other' }>({
    name: '',
    gender: 'Male',
  });
  const [coPassengers, setCoPassengers] = useState<CoPassengerInput[]>([]);
  const [pricePreview, setPricePreview] = useState<{ perPerson: number; total: number } | null>(null);

  useEffect(() => {
    if (offerId) loadOffer();
  }, [offerId]);

  useEffect(() => {
    setPrimaryPassenger({
      name: (user?.name || user?.username || '').trim(),
      gender: (user?.gender === 'Female' || user?.gender === 'Other' ? user.gender : 'Male') as 'Male' | 'Female' | 'Other',
    });
  }, [user?.name, user?.username, user?.gender]);

  useEffect(() => {
    const requiredCount = Math.max(0, selectedSeats - 1);
    setCoPassengers((prev) => {
      if (prev.length === requiredCount) return prev;
      if (prev.length < requiredCount) {
        const additions = Array.from({ length: requiredCount - prev.length }).map(() => ({
          name: '',
          age: '',
          gender: 'Male' as const,
        }));
        return [...prev, ...additions];
      }
      return prev.slice(0, requiredCount);
    });
  }, [selectedSeats]);

  useEffect(() => {
    if (!offer?.availableSeats) return;
    if (selectedSeats > offer.availableSeats) {
      setSelectedSeats(Math.max(1, offer.availableSeats));
    }
  }, [offer?.availableSeats, selectedSeats]);

  useEffect(() => {
    const hasRoute = !!passengerRoute.from && !!passengerRoute.to;
    if (!offer?.offerId || !hasRoute) {
      setPricePreview(null);
      return;
    }

    let cancelled = false;
    const fetchPricePreview = async () => {
      try {
        const response = await poolingApi.calculatePrice({
          offerId: offer.offerId,
          passengerRoute: {
            from: {
              address: passengerRoute.from!.address,
              lat: passengerRoute.from!.lat,
              lng: passengerRoute.from!.lng,
              city: passengerRoute.from!.city,
              state: passengerRoute.from!.state,
            },
            to: {
              address: passengerRoute.to!.address,
              lat: passengerRoute.to!.lat,
              lng: passengerRoute.to!.lng,
              city: passengerRoute.to!.city,
              state: passengerRoute.to!.state,
            },
          },
        });

        if (!cancelled && response.success && response.data) {
          const perPerson = Math.round(response.data.totalAmount || 0);
          setPricePreview({
            perPerson,
            total: perPerson * selectedSeats,
          });
        }
      } catch {
        if (!cancelled) setPricePreview(null);
      }
    };

    fetchPricePreview();
    return () => {
      cancelled = true;
    };
  }, [
    offer?.offerId,
    passengerRoute.from?.address,
    passengerRoute.from?.lat,
    passengerRoute.from?.lng,
    passengerRoute.to?.address,
    passengerRoute.to?.lat,
    passengerRoute.to?.lng,
    selectedSeats,
  ]);

  const loadOffer = async () => {
    if (!offerId) return;
    try {
      setLoading(true);
      const response = await poolingApi.getOffer(offerId);
      if (response.success && response.data) {
        setOffer(response.data);
      } else {
        Alert.alert('Error', response.error || 'Failed to load offer details');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to load offer: ${error.message || 'Unknown error'}`);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this pooling ride from ${getRouteText(offer?.route?.from)} to ${getRouteText(offer?.route?.to)} on ForLok!`,
      });
    } catch {}
  };

  const getRouteText = (loc: any) => {
    if (typeof loc === 'string') return loc;
    return loc?.city || loc?.address?.split(',')[0] || 'N/A';
  };

  const getFullRouteText = (loc: any) => {
    if (typeof loc === 'string') return loc;
    return loc?.address || loc?.city || 'N/A';
  };

  const getVehicleIcon = () => {
    const type = offer?.vehicle?.type?.toLowerCase();
    if (type === 'scooty') return <MaterialCommunityIcons name="moped" size={18} color={theme.colors.primary} />;
    if (type === 'bike') return <MaterialCommunityIcons name="motorbike" size={18} color={theme.colors.primary} />;
    return <Car size={18} color={theme.colors.primary} />;
  };

  const formatOfferDate = (rawDate: any) => {
    if (!rawDate) return 'N/A';
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return String(rawDate);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatOfferTime = (rawDate: any, rawTime: any) => {
    if (rawTime) return String(rawTime);
    if (!rawDate) return 'N/A';
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleJoinPool = async () => {
    if (!offer || !offer.offerId) {
      Alert.alert('Error', 'Offer information is missing');
      return;
    }
    if (offer.availableSeats <= 0) {
      Alert.alert('No Seats Available', 'This pooling offer is full.');
      return;
    }
    if (selectedSeats > offer.availableSeats) {
      Alert.alert('Seat Unavailable', `Only ${offer.availableSeats} seat(s) are available.`);
      return;
    }
    if (!primaryPassenger.name.trim()) {
      Alert.alert('Profile Required', 'Please update your profile name before booking.');
      return;
    }

    const normalizedCoPassengers = coPassengers.map((p) => ({
      name: p.name.trim(),
      age: Number(p.age),
      gender: p.gender,
    }));

    const invalidPassenger = normalizedCoPassengers.find(
      (p) => !p.name || !Number.isFinite(p.age) || p.age < 1 || p.age > 120
    );
    if (invalidPassenger) {
      Alert.alert('Passenger Details Required', 'Please fill valid name and age for all co-passengers.');
      return;
    }

    if (!passengerRoute.from || !passengerRoute.to) {
      Alert.alert('Select Your Route', 'Please select pickup and destination to calculate the price.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Ride Route',
          onPress: () => {
            setPassengerRoute({
              from: {
                address: typeof offer.route?.from === 'string' ? offer.route.from : offer.route?.from?.address || '',
                lat: typeof offer.route?.from === 'object' ? offer.route.from.lat : 0,
                lng: typeof offer.route?.from === 'object' ? offer.route.from.lng : 0,
                city: typeof offer.route?.from === 'object' ? offer.route.from.city : '',
                state: typeof offer.route?.from === 'object' ? offer.route.from.state : '',
              },
              to: {
                address: typeof offer.route?.to === 'string' ? offer.route.to : offer.route?.to?.address || '',
                lat: typeof offer.route?.to === 'object' ? offer.route.to.lat : 0,
                lng: typeof offer.route?.to === 'object' ? offer.route.to.lng : 0,
                city: typeof offer.route?.to === 'object' ? offer.route.to.city : '',
                state: typeof offer.route?.to === 'object' ? offer.route.to.state : '',
              },
            });
          },
        },
      ]);
      return;
    }

    try {
      setCalculatingPrice(true);
      const priceResponse = await poolingApi.calculatePrice({
        offerId: offer.offerId,
        passengerRoute: {
          from: { address: passengerRoute.from.address, lat: passengerRoute.from.lat, lng: passengerRoute.from.lng, city: passengerRoute.from.city, state: passengerRoute.from.state },
          to: { address: passengerRoute.to.address, lat: passengerRoute.to.lat, lng: passengerRoute.to.lng, city: passengerRoute.to.city, state: passengerRoute.to.state },
        },
      });
      if (priceResponse.success && priceResponse.data) {
        navigation.navigate('PriceSummary' as never, {
          offerId: offer.offerId, offer,
          seatsBooked: selectedSeats,
          coPassengers: normalizedCoPassengers,
          passengerRoute: {
            from: { address: passengerRoute.from.address, lat: passengerRoute.from.lat, lng: passengerRoute.from.lng },
            to: { address: passengerRoute.to.address, lat: passengerRoute.to.lat, lng: passengerRoute.to.lng },
          },
          priceBreakdown: priceResponse.data,
        } as never);
      } else {
        Alert.alert('Error', priceResponse.error || 'Failed to calculate price.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to calculate price.');
    } finally {
      setCalculatingPrice(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[s.loadingText, { color: theme.colors.textSecondary }]}>Loading ride details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!offer) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
        <View style={s.loadingWrap}>
          <Text style={[s.loadingText, { color: theme.colors.textSecondary }]}>Ride not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const driverName = offer.driver?.name || offer.driverName || 'Driver';
  const driverPhoto = offer.driver?.photo || offer.driverPhoto;
  const driverRating = Number(offer.driver?.rating ?? offer.rating ?? 0).toFixed(1);
  const driverReviews = offer.driver?.totalReviews ?? offer.totalReviews ?? 0;
  const vehicleBrand = offer.vehicle?.brand || 'Vehicle';
  const vehicleModel = offer.vehicle?.model || '';
  const vehicleNumber = offer.vehicle?.number || '';
  const vehicleColor = offer.vehicle?.color || '';
  const vehicleType = offer.vehicle?.type || 'car';
  const seatsFilled = (offer.totalSeats || offer.availableSeats || 1) - (offer.availableSeats || 0);
  const totalSeats = offer.totalSeats || offer.availableSeats || 1;
  const formattedDate = formatOfferDate(offer.date);
  const formattedTime = formatOfferTime(offer.date, offer.time);
  const fallbackPerPerson = Number(offer.price || 0) > 0 ? Math.round(Number(offer.price || 0)) : null;
  const displayPerPerson = pricePreview?.perPerson ?? fallbackPerPerson;
  const displayTotal = pricePreview?.total ?? (fallbackPerPerson ? fallbackPerPerson * selectedSeats : null);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Minimal Header ── */}
      <View style={[s.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <ArrowLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>Ride Details</Text>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.headerBtn} onPress={() => setLiked(!liked)}>
            <Heart size={20} color={liked ? '#E53E3E' : theme.colors.textSecondary} fill={liked ? '#E53E3E' : 'none'} />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtn} onPress={handleShare}>
            <Share2 size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* ── Driver Strip ── */}
        <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
          <View style={s.driverRow}>
            {driverPhoto ? (
              <Image source={{ uri: driverPhoto }} style={s.driverAvatar} />
            ) : (
              <View style={[s.driverAvatarPlaceholder, { backgroundColor: theme.colors.primary + '15' }]}>
                <User size={24} color={theme.colors.primary} />
              </View>
            )}
            <View style={s.driverInfo}>
              <View style={s.driverNameRow}>
                <Text style={[s.driverName, { color: theme.colors.text }]} numberOfLines={1}>{driverName}</Text>
                {offer.driver?.isVerified && <CheckCircle size={14} color="#4CAF50" fill="#4CAF50" />}
              </View>
              <View style={s.driverMeta}>
                <View style={s.ratingPill}>
                  <Star size={12} color="#FFB800" fill="#FFB800" />
                  <Text style={s.ratingText}>{driverRating}</Text>
                  <Text style={s.ratingCount}>({driverReviews})</Text>
                </View>
                {(offer.driver?.totalTrips || 0) > 0 && (
                  <Text style={[s.tripCount, { color: theme.colors.textSecondary }]}>{offer.driver.totalTrips} trips</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[s.chatBtn, { backgroundColor: theme.colors.primary + '12' }]}
              onPress={() => navigation.navigate('Chat' as never)}
            >
              <MessageSquare size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Route Timeline ── */}
        <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
          <View style={s.routeTimeline}>
            {/* From */}
            <View style={s.routeStop}>
              <View style={s.timelineDotWrap}>
                <View style={[s.timelineDot, { backgroundColor: '#4CAF50' }]} />
              </View>
              <View style={s.routeStopInfo}>
                <Text style={[s.routeStopLabel, { color: theme.colors.textSecondary }]}>PICKUP</Text>
                <Text style={[s.routeStopText, { color: theme.colors.text }]} numberOfLines={2}>
                  {getFullRouteText(offer.route?.from)}
                </Text>
              </View>
            </View>
            {/* Timeline line */}
            <View style={s.timelineLineWrap}>
              <View style={[s.timelineLine, { borderColor: theme.colors.border }]} />
              {offer.estimatedDistance && (
                <View style={[s.distancePill, { backgroundColor: theme.colors.background }]}>
                  <Text style={[s.distanceText, { color: theme.colors.textSecondary }]}>
                    ~{typeof offer.estimatedDistance === 'number' ? offer.estimatedDistance.toFixed(1) : offer.estimatedDistance} km
                  </Text>
                </View>
              )}
            </View>
            {/* To */}
            <View style={s.routeStop}>
              <View style={s.timelineDotWrap}>
                <View style={[s.timelineDot, { backgroundColor: '#E53E3E' }]} />
              </View>
              <View style={s.routeStopInfo}>
                <Text style={[s.routeStopLabel, { color: theme.colors.textSecondary }]}>DROP-OFF</Text>
                <Text style={[s.routeStopText, { color: theme.colors.text }]} numberOfLines={2}>
                  {getFullRouteText(offer.route?.to)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Trip Info Chips ── */}
        <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
          <View style={s.chipsGrid}>
            <View style={[s.chip, { backgroundColor: theme.colors.background }]}>
              <Calendar size={16} color={theme.colors.primary} />
              <View>
                <Text style={[s.chipLabel, { color: theme.colors.textSecondary }]}>Date</Text>
                <Text style={[s.chipValue, { color: theme.colors.text }]}>{formattedDate}</Text>
              </View>
            </View>
            <View style={[s.chip, { backgroundColor: theme.colors.background }]}>
              <Clock size={16} color={theme.colors.primary} />
              <View>
                <Text style={[s.chipLabel, { color: theme.colors.textSecondary }]}>Time</Text>
                <Text style={[s.chipValue, { color: theme.colors.text }]}>{formattedTime}</Text>
              </View>
            </View>
          </View>

          {/* Vehicle & Seats Row */}
          <View style={[s.vehicleRow, { borderTopColor: theme.colors.border }]}>
            <View style={s.vehicleInfo}>
              <View style={[s.vehicleIconWrap, { backgroundColor: theme.colors.primary + '10' }]}>
                {getVehicleIcon()}
              </View>
              <View>
                <Text style={[s.vehicleName, { color: theme.colors.text }]}>
                  {vehicleBrand}{vehicleModel ? ` ${vehicleModel}` : ''}
                </Text>
                <Text style={[s.vehicleMeta, { color: theme.colors.textSecondary }]}>
                  {vehicleNumber}{vehicleColor ? ` · ${vehicleColor}` : ''} · {vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)}
                </Text>
              </View>
            </View>
            {/* Seats indicator */}
            <View style={s.seatsWrap}>
              {Array.from({ length: totalSeats }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    s.seatDot,
                    { backgroundColor: i < seatsFilled ? theme.colors.primary : theme.colors.border },
                  ]}
                >
                  <User size={10} color={i < seatsFilled ? '#FFF' : theme.colors.textSecondary} />
                </View>
              ))}
              <Text style={[s.seatsText, { color: theme.colors.textSecondary }]}>
                {offer.availableSeats} left
              </Text>
            </View>
          </View>
        </View>

        

        {/* ── Seats & Passenger Details ── */}
        <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[s.cardTitle, { color: theme.colors.text }]}>Seats & Passenger Details</Text>
          <View style={[s.seatCounterWrap, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
            <Text style={[s.seatCounterLabel, { color: theme.colors.textSecondary }]}>Seats to book</Text>
            <View style={s.seatCounterControls}>
              <TouchableOpacity
                style={[s.counterBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                onPress={() => setSelectedSeats((prev) => Math.max(1, prev - 1))}
              >
                <Text style={[s.counterBtnText, { color: theme.colors.text }]}>-</Text>
              </TouchableOpacity>
              <Text style={[s.counterValue, { color: theme.colors.text }]}>{selectedSeats}</Text>
              <TouchableOpacity
                style={[s.counterBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                onPress={() => setSelectedSeats((prev) => Math.min(Math.min(offer.availableSeats || 1, 4), prev + 1))}
              >
                <Text style={[s.counterBtnText, { color: theme.colors.text }]}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={[s.seatCounterHint, { color: theme.colors.textSecondary }]}>
              {offer.availableSeats} seat(s) available
            </Text>
          </View>

          <View style={[s.primaryPassengerCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
            <View style={s.primaryPassengerHeader}>
              <Text style={[s.primaryPassengerTitle, { color: theme.colors.text }]}>Passenger 1 (You)</Text>
              <View style={[s.youBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                <Text style={[s.youBadgeText, { color: theme.colors.primary }]}>Logged in</Text>
              </View>
            </View>
            <TextInput
              style={[s.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
              value={primaryPassenger.name}
              editable={false}
              placeholder="Your name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          {coPassengers.map((p, idx) => (
            <View
              key={`co-passenger-${idx}`}
              style={[s.coPassengerCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
            >
              <Text style={[s.coPassengerTitle, { color: theme.colors.text }]}>
                Passenger {idx + 2}
              </Text>

              <TextInput
                style={[s.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                placeholder="Full name"
                placeholderTextColor={theme.colors.textSecondary}
                value={p.name}
                onChangeText={(text) => {
                  setCoPassengers((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], name: text };
                    return next;
                  });
                }}
              />

              <TextInput
                style={[s.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                placeholder="Age"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="number-pad"
                value={p.age}
                onChangeText={(text) => {
                  const ageText = text.replace(/[^0-9]/g, '');
                  setCoPassengers((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], age: ageText };
                    return next;
                  });
                }}
              />

              <View style={s.genderRow}>
                {(['Male', 'Female', 'Other'] as const).map((gender) => {
                  const active = p.gender === gender;
                  return (
                    <TouchableOpacity
                      key={`${idx}-${gender}`}
                      style={[
                        s.genderChip,
                        {
                          backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                          borderColor: active ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => {
                        setCoPassengers((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], gender };
                          return next;
                        });
                      }}
                    >
                      <Text style={[s.genderChipText, { color: active ? '#FFF' : theme.colors.text }]}>
                        {gender}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* ── Passengers ── */}
        {(offer.passengers || []).length > 0 && (
          <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[s.cardTitle, { color: theme.colors.text }]}>Co-travellers</Text>
            {(offer.passengers || []).map((p: any, i: number) => (
              <View key={p.userId || i} style={[s.passengerRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
                {p.photo ? (
                  <Image source={{ uri: p.photo }} style={s.passengerAvatar} />
                ) : (
                  <View style={[s.passengerAvatarPlaceholder, { backgroundColor: theme.colors.primary + '12' }]}>
                    <User size={16} color={theme.colors.primary} />
                  </View>
                )}
                <View style={s.passengerInfo}>
                  <Text style={[s.passengerName, { color: theme.colors.text }]}>{p.name}</Text>
                  <View style={s.passengerMetaRow}>
                    <Star size={11} color="#FFB800" fill="#FFB800" />
                    <Text style={[s.passengerRating, { color: theme.colors.textSecondary }]}>
                      {Number(p.rating ?? 0).toFixed(1)}
                    </Text>
                  </View>
                </View>
                <View style={[s.statusPill, {
                  backgroundColor: p.status === 'confirmed' ? '#E8F5E9' : p.status === 'cancelled' ? '#FFEBEE' : '#FFF8E1',
                }]}>
                  <Text style={[s.statusPillText, {
                    color: p.status === 'confirmed' ? '#2E7D32' : p.status === 'cancelled' ? '#C62828' : '#F57F17',
                  }]}>
                    {p.status?.charAt(0).toUpperCase() + p.status?.slice(1)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Notes ── */}
        {offer.notes && (
          <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
            <View style={s.notesRow}>
              <FileText size={16} color={theme.colors.primary} />
              <Text style={[s.cardTitle, { color: theme.colors.text, marginBottom: 0 }]}>Driver's Note</Text>
            </View>
            <Text style={[s.notesText, { color: theme.colors.textSecondary }]}>{offer.notes}</Text>
          </View>
        )}

        {/* ── Your Route ── */}
        <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[s.cardTitle, { color: theme.colors.text }]}>Your Route</Text>
          {/* Pickup */}
          <TouchableOpacity
            style={[s.routeInput, { borderColor: passengerRoute.from ? '#4CAF50' + '40' : theme.colors.border, backgroundColor: theme.colors.background }]}
            onPress={() =>
              navigation.navigate('LocationPicker' as never, {
                title: 'Select Pickup Location',
                onLocationSelect: (location: LocationData) => {
                  setPassengerRoute((prev) => ({ ...prev, from: location }));
                },
                initialLocation: passengerRoute.from || undefined,
              } as never)
            }
            activeOpacity={0.7}
          >
            <View style={[s.routeInputDot, { backgroundColor: passengerRoute.from ? '#4CAF50' : theme.colors.border }]} />
            <View style={s.routeInputContent}>
              <Text style={[s.routeInputLabel, { color: theme.colors.textSecondary }]}>Pickup</Text>
              <Text
                style={[s.routeInputValue, { color: passengerRoute.from ? theme.colors.text : theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {passengerRoute.from?.address || 'Select pickup location'}
              </Text>
            </View>
            {passengerRoute.from && (
              <Text style={[s.editLink, { color: theme.colors.primary }]}>Edit</Text>
            )}
          </TouchableOpacity>
          {/* Destination */}
          <TouchableOpacity
            style={[s.routeInput, { borderColor: passengerRoute.to ? '#E53E3E' + '40' : theme.colors.border, backgroundColor: theme.colors.background }]}
            onPress={() =>
              navigation.navigate('LocationPicker' as never, {
                title: 'Select Destination',
                onLocationSelect: (location: LocationData) => {
                  setPassengerRoute((prev) => ({ ...prev, to: location }));
                },
                initialLocation: passengerRoute.to || undefined,
              } as never)
            }
            activeOpacity={0.7}
          >
            <View style={[s.routeInputDot, { backgroundColor: passengerRoute.to ? '#E53E3E' : theme.colors.border }]} />
            <View style={s.routeInputContent}>
              <Text style={[s.routeInputLabel, { color: theme.colors.textSecondary }]}>Destination</Text>
              <Text
                style={[s.routeInputValue, { color: passengerRoute.to ? theme.colors.text : theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {passengerRoute.to?.address || 'Select destination'}
              </Text>
            </View>
            {passengerRoute.to && (
              <Text style={[s.editLink, { color: theme.colors.primary }]}>Edit</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Safety Features ── */}
        <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
          <View style={s.safetyRow}>
            <Shield size={16} color="#4CAF50" />
            <Text style={[s.safetyText, { color: theme.colors.text }]}>Verified driver & vehicle</Text>
          </View>
          <View style={s.safetyRow}>
            <Zap size={16} color="#F59E0B" />
            <Text style={[s.safetyText, { color: theme.colors.text }]}>Real-time ride tracking</Text>
          </View>
          <View style={s.safetyRow}>
            <Phone size={16} color={theme.colors.primary} />
            <Text style={[s.safetyText, { color: theme.colors.text }]}>24/7 emergency support</Text>
          </View>
        </View>

        <View style={{ height: normalize(100) }} />
      </ScrollView>

      {/* ── Sticky Bottom CTA ── */}
      <View style={[s.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <View style={s.bottomLeft}>
          <Text style={[s.bottomPriceLabel, { color: theme.colors.textSecondary }]}>Estimated total ({selectedSeats} seat{selectedSeats > 1 ? 's' : ''})</Text>
          {displayTotal != null ? (
            <View style={s.bottomPriceRow}>
              <IndianRupee size={18} color={theme.colors.text} />
              <Text style={[s.bottomPrice, { color: theme.colors.text }]}>{displayTotal}</Text>
            </View>
          ) : (
            <Text style={[s.bottomHintText, { color: theme.colors.textSecondary }]}>Shown in Price Summary</Text>
          )}
        </View>
        <TouchableOpacity
          style={[s.joinBtn, { backgroundColor: offer.availableSeats > 0 ? theme.colors.primary : '#CCC' }]}
          onPress={handleJoinPool}
          disabled={calculatingPrice || joining || offer.availableSeats <= 0}
          activeOpacity={0.8}
        >
          {calculatingPrice ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={s.joinBtnText}>
              {offer.availableSeats <= 0 ? 'Full' : 'Join Ride'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: normalize(12) },
  loadingText: { fontFamily: FONTS.regular, fontSize: normalize(14) },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: normalize(12), paddingVertical: normalize(10), paddingTop: normalize(40),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: normalize(38), height: normalize(38), borderRadius: normalize(19), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.medium, fontSize: normalize(17), fontWeight: '700' },
  headerRight: { flexDirection: 'row', gap: normalize(2) },

  scroll: { padding: normalize(14), gap: normalize(10) },

  // Card base
  card: { borderRadius: normalize(14), padding: normalize(14), ...SHADOWS.sm },
  cardTitle: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '700', marginBottom: normalize(10) },

  // Driver
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(12) },
  driverAvatar: { width: normalize(52), height: normalize(52), borderRadius: normalize(26), borderWidth: 2, borderColor: '#E0E0E0' },
  driverAvatarPlaceholder: { width: normalize(52), height: normalize(52), borderRadius: normalize(26), alignItems: 'center', justifyContent: 'center' },
  driverInfo: { flex: 1 },
  driverNameRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), marginBottom: normalize(4) },
  driverName: { fontFamily: FONTS.medium, fontSize: normalize(16), fontWeight: '700' },
  driverMeta: { flexDirection: 'row', alignItems: 'center', gap: normalize(10) },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: normalize(3), backgroundColor: '#FFF8E1', paddingHorizontal: normalize(8), paddingVertical: normalize(3), borderRadius: normalize(10) },
  ratingText: { fontFamily: FONTS.medium, fontSize: normalize(12), fontWeight: '700', color: '#8B6914' },
  ratingCount: { fontFamily: FONTS.regular, fontSize: normalize(11), color: '#B08C00' },
  tripCount: { fontFamily: FONTS.regular, fontSize: normalize(12) },
  chatBtn: { width: normalize(40), height: normalize(40), borderRadius: normalize(20), alignItems: 'center', justifyContent: 'center' },

  // Route Timeline
  routeTimeline: { gap: 0 },
  routeStop: { flexDirection: 'row', alignItems: 'flex-start', gap: normalize(12) },
  timelineDotWrap: { width: normalize(24), alignItems: 'center', paddingTop: normalize(4) },
  timelineDot: { width: normalize(10), height: normalize(10), borderRadius: normalize(5) },
  routeStopInfo: { flex: 1, paddingBottom: normalize(4) },
  routeStopLabel: { fontFamily: FONTS.regular, fontSize: normalize(10), fontWeight: '600', letterSpacing: 0.8, marginBottom: normalize(2) },
  routeStopText: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '600', lineHeight: normalize(20) },
  timelineLineWrap: { flexDirection: 'row', alignItems: 'center', paddingLeft: normalize(11), paddingVertical: normalize(2) },
  timelineLine: { width: 0, height: normalize(28), borderLeftWidth: 1.5, borderStyle: 'dashed' },
  distancePill: { marginLeft: normalize(14), paddingHorizontal: normalize(10), paddingVertical: normalize(3), borderRadius: normalize(8) },
  distanceText: { fontFamily: FONTS.regular, fontSize: normalize(11), fontWeight: '500' },

  // Trip Info Chips
  chipsGrid: { flexDirection: 'row', gap: normalize(10), marginBottom: normalize(12) },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: normalize(8), paddingHorizontal: normalize(12), paddingVertical: normalize(10), borderRadius: normalize(10) },
  chipLabel: { fontFamily: FONTS.regular, fontSize: normalize(10) },
  chipValue: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '600' },

  // Vehicle Row
  vehicleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: normalize(12), borderTopWidth: StyleSheet.hairlineWidth },
  vehicleInfo: { flexDirection: 'row', alignItems: 'center', gap: normalize(10), flex: 1 },
  vehicleIconWrap: { width: normalize(36), height: normalize(36), borderRadius: normalize(10), alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '600' },
  vehicleMeta: { fontFamily: FONTS.regular, fontSize: normalize(11), marginTop: normalize(1) },
  seatsWrap: { flexDirection: 'row', alignItems: 'center', gap: normalize(4) },
  seatDot: { width: normalize(20), height: normalize(20), borderRadius: normalize(10), alignItems: 'center', justifyContent: 'center' },
  seatsText: { fontFamily: FONTS.regular, fontSize: normalize(11), marginLeft: normalize(2) },

  // Price Card
  priceCard: { borderRadius: normalize(14), padding: normalize(16), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLeft: {},
  priceLabel: { fontFamily: FONTS.regular, fontSize: normalize(12), marginBottom: normalize(4) },
  priceAmountRow: { flexDirection: 'row', alignItems: 'center' },
  priceAmount: { fontFamily: FONTS.medium, fontSize: normalize(28), fontWeight: '800' },
  priceHintText: { fontFamily: FONTS.regular, fontSize: normalize(12), fontWeight: '500' },
  priceBadge: { flexDirection: 'row', alignItems: 'center', gap: normalize(4), paddingHorizontal: normalize(10), paddingVertical: normalize(6), borderRadius: normalize(8) },
  priceBadgeText: { fontFamily: FONTS.medium, fontSize: normalize(11), fontWeight: '600', color: '#2E7D32' },

  // Seats & passenger details
  seatCounterWrap: {
    borderWidth: 1,
    borderRadius: normalize(12),
    padding: normalize(12),
    marginBottom: normalize(12),
  },
  seatCounterLabel: { fontFamily: FONTS.regular, fontSize: normalize(11), marginBottom: normalize(8) },
  seatCounterControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: normalize(14) },
  counterBtn: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: { fontFamily: FONTS.medium, fontSize: normalize(20), fontWeight: '700', marginTop: -1 },
  counterValue: { fontFamily: FONTS.medium, fontSize: normalize(20), fontWeight: '800', minWidth: normalize(30), textAlign: 'center' },
  seatCounterHint: { fontFamily: FONTS.regular, fontSize: normalize(11), marginTop: normalize(8), textAlign: 'center' },
  primaryPassengerCard: {
    borderWidth: 1,
    borderRadius: normalize(12),
    padding: normalize(10),
    marginBottom: normalize(10),
  },
  primaryPassengerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: normalize(8) },
  primaryPassengerTitle: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '700' },
  youBadge: { paddingHorizontal: normalize(8), paddingVertical: normalize(3), borderRadius: normalize(8) },
  youBadgeText: { fontFamily: FONTS.medium, fontSize: normalize(10), fontWeight: '700' },
  coPassengerCard: {
    borderWidth: 1,
    borderRadius: normalize(12),
    padding: normalize(10),
    marginBottom: normalize(10),
  },
  coPassengerTitle: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '700', marginBottom: normalize(8) },
  input: {
    borderWidth: 1,
    borderRadius: normalize(10),
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(9),
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    marginBottom: normalize(8),
  },
  genderRow: { flexDirection: 'row', gap: normalize(8) },
  genderChip: {
    borderWidth: 1,
    borderRadius: normalize(8),
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(6),
  },
  genderChipText: { fontFamily: FONTS.medium, fontSize: normalize(12), fontWeight: '600' },

  // Passengers
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(10), paddingVertical: normalize(10) },
  passengerAvatar: { width: normalize(36), height: normalize(36), borderRadius: normalize(18), borderWidth: 1.5, borderColor: '#E0E0E0' },
  passengerAvatarPlaceholder: { width: normalize(36), height: normalize(36), borderRadius: normalize(18), alignItems: 'center', justifyContent: 'center' },
  passengerInfo: { flex: 1 },
  passengerName: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '600', marginBottom: normalize(2) },
  passengerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(3) },
  passengerRating: { fontFamily: FONTS.regular, fontSize: normalize(11) },
  statusPill: { paddingHorizontal: normalize(10), paddingVertical: normalize(4), borderRadius: normalize(8) },
  statusPillText: { fontFamily: FONTS.medium, fontSize: normalize(10), fontWeight: '600' },

  // Notes
  notesRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(8), marginBottom: normalize(8) },
  notesText: { fontFamily: FONTS.regular, fontSize: normalize(13), lineHeight: normalize(20) },

  // Your Route inputs
  routeInput: { flexDirection: 'row', alignItems: 'center', gap: normalize(10), paddingHorizontal: normalize(12), paddingVertical: normalize(12), borderRadius: normalize(12), borderWidth: 1, marginBottom: normalize(8) },
  routeInputDot: { width: normalize(10), height: normalize(10), borderRadius: normalize(5) },
  routeInputContent: { flex: 1 },
  routeInputLabel: { fontFamily: FONTS.regular, fontSize: normalize(10), marginBottom: normalize(1) },
  routeInputValue: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '500' },
  editLink: { fontFamily: FONTS.medium, fontSize: normalize(12), fontWeight: '600' },

  // Safety
  safetyRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(10), paddingVertical: normalize(8) },
  safetyText: { fontFamily: FONTS.regular, fontSize: normalize(13) },

  // Bottom Bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: normalize(16), paddingVertical: normalize(14),
    paddingBottom: normalize(28), borderTopWidth: StyleSheet.hairlineWidth, ...SHADOWS.lg,
  },
  bottomLeft: {},
  bottomPriceLabel: { fontFamily: FONTS.regular, fontSize: normalize(11) },
  bottomPriceRow: { flexDirection: 'row', alignItems: 'center', marginTop: normalize(2) },
  bottomPrice: { fontFamily: FONTS.medium, fontSize: normalize(22), fontWeight: '800' },
  bottomHintText: { fontFamily: FONTS.regular, fontSize: normalize(12), marginTop: normalize(2) },
  joinBtn: { paddingHorizontal: normalize(32), paddingVertical: normalize(14), borderRadius: normalize(14), minWidth: normalize(140), alignItems: 'center' },
  joinBtnText: { fontFamily: FONTS.medium, fontSize: normalize(16), fontWeight: '700', color: '#FFF' },
});

export default PoolingDetailsScreen;
