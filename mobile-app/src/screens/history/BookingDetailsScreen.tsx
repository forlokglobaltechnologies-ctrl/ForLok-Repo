import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  Image, ActivityIndicator, Alert, Linking, Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft, Share2, MapPin, Calendar, Clock, Phone, MessageSquare, Car, Tag,
  User, CreditCard, IndianRupee, Star, CheckCircle, Shield, ChevronRight,
  Navigation, X, AlertTriangle, Copy, Link2,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SHADOWS, BORDER_RADIUS } from '@constants/theme';
import { normalize, wp } from '@utils/responsive';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { bookingApi } from '@utils/apiClient';
import { useAuth } from '@context/AuthContext';

const BookingDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.userId || null;
  const params = route.params as any;
  const passedBooking = params?.booking;
  const connectedLegs = params?.connectedLegs || null;
  const bookingId = params?.bookingId || passedBooking?.bookingId || passedBooking?.id;

  const [booking, setBooking] = useState<any>(passedBooking || null);
  const [loading, setLoading] = useState(!!bookingId && !passedBooking);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (bookingId) loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      const response = await bookingApi.getBooking(bookingId);
      if (response.success && response.data) {
        const d = response.data;
        const mapped = {
          ...d,
          id: d.bookingId || d._id,
          bookingId: d.bookingId || d._id,
          bookingNumber: d.bookingNumber || d.bookingId,
          type: d.serviceType || 'pooling',
          serviceType: d.serviceType || 'pooling',
          status: d.status || 'pending',
          date: d.date ? new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
          time: d.time || (d.startTime ? d.startTime : d.date ? new Date(d.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'),
          startTime: d.startTime || null,
          endTime: d.endTime || null,
          route: d.route ? {
            from: typeof d.route.from === 'string' ? d.route.from : d.route.from?.address || 'N/A',
            to: typeof d.route.to === 'string' ? d.route.to : d.route.to?.address || 'N/A',
          } : null,
          location: d.location || null,
          vehicle: d.vehicle ? {
            brand: d.vehicle.brand || 'N/A',
            number: d.vehicle.number || 'N/A',
            type: d.vehicle.type || 'car',
            model: d.vehicle.vehicleModel || d.vehicle.model || null,
            color: d.vehicle.color || null,
          } : null,
          driver: d.driver || null,
          owner: d.owner || null,
          renter: d.renter || null,
          userId: d.userId || null,
          duration: d.duration || null,
          amount: d.amount || 0,
          totalAmount: d.totalAmount || d.amount || 0,
          platformFee: d.platformFee || 0,
          paymentMethod: d.paymentMethod || 'N/A',
          paymentStatus: d.paymentStatus || 'pending',
          seatsBooked: d.seatsBooked || 1,
          coPassengers: d.coPassengers || [],
          passengers: d.passengers || [],
          rentalOfferId: d.rentalOfferId || null,
          poolingOfferId: d.poolingOfferId || null,
          connectedGroupId: d.connectedGroupId || null,
          legOrder: d.legOrder || null,
          connectionPoint: d.connectionPoint || null,
        };

        if (mapped.serviceType === 'rental' && !mapped.renter && mapped.bookingId) {
          try {
            const chatApi = (await import('@utils/apiClient')).chatApi;
            const convResponse = await chatApi.getConversationByBooking(mapped.bookingId);
            if (convResponse.success && convResponse.data?.participants) {
              const renterP = convResponse.data.participants.find((p: any) => p.role === 'renter');
              if (renterP) {
                mapped.renter = { userId: renterP.userId, name: renterP.name, photo: renterP.photo, rating: renterP.rating, totalReviews: renterP.totalReviews };
              }
            }
          } catch {}
        }
        setBooking(mapped);
      } else {
        Alert.alert('Error', response.error || 'Failed to load booking');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load booking');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    const bId = booking?.bookingId || bookingId;
    if (!bId) return;
    setCancelling(true);
    try {
      const preview = await bookingApi.previewCancellationFee(bId);
      if (!preview.success) {
        Alert.alert('Error', preview.message || 'Could not load cancellation details');
        setCancelling(false);
        return;
      }
      const info = preview.data;
      const title = info.isFirstCancellation ? 'Cancel Booking (Free)' : `Cancel Booking (Fee: ₹${info.cancellationFee})`;
      const message = info.isFirstCancellation
        ? 'This is your first cancellation — no charges.\n\nAre you sure?'
        : `Fee: ₹${info.cancellationFee} (${info.feePercentage}% of ₹${info.rideAmount})\nDeducted from wallet.\n\nAre you sure?`;
      setCancelling(false);
      Alert.alert(title, message, [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: info.cancellationFee > 0 ? `Pay ₹${info.cancellationFee} & Cancel` : 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const result = await bookingApi.cancelBooking(bId, 'Cancelled by user');
              if (result.success) {
                Alert.alert('Cancelled', result.data?.cancellationDetails?.message || 'Booking cancelled.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
                setBooking({ ...booking, status: 'cancelled' });
              } else {
                Alert.alert('Error', result.message || 'Failed to cancel');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to cancel');
            } finally { setCancelling(false); }
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load cancellation details');
      setCancelling(false);
    }
  };

  const handleChat = async () => {
    try {
      const chatApi = (await import('@utils/apiClient')).chatApi;
      const sType = booking.serviceType || (booking.rentalOfferId ? 'rental' : 'pooling');
      if (sType === 'pooling' && booking.poolingOfferId) {
        const r = await chatApi.getGroupConversationByOffer(booking.poolingOfferId);
        if (r.success && r.data) {
          navigation.navigate('Chat' as never, { conversationId: r.data.conversationId, type: 'pooling', isGroup: true, offerId: booking.poolingOfferId } as never);
        } else { navigation.navigate('ChatList' as never); }
      } else if (sType === 'rental' && (booking.bookingId || booking._id)) {
        const otherUser = isOwner ? null : booking.owner;
        navigation.navigate('Chat' as never, { bookingId: booking.bookingId || booking._id, type: 'rental', otherUser } as never);
      } else { navigation.navigate('ChatList' as never); }
    } catch { navigation.navigate('ChatList' as never); }
  };

  const handleShare = async () => {
    try {
      const fromText = typeof booking?.route?.from === 'string' ? booking.route.from : booking?.route?.from?.address || 'origin';
      const toText = typeof booking?.route?.to === 'string' ? booking.route.to : booking?.route?.to?.address || 'destination';
      await Share.share({ message: `Booking #${booking?.bookingId} on ForLok - Ride from ${fromText} to ${toText}` });
    } catch {}
  };

  if (loading) {
    return (
      <SafeAreaView style={[st.container, { backgroundColor: theme.colors.background }]}>
        <View style={st.centerWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[st.centerText, { color: theme.colors.textSecondary }]}>Loading booking...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={[st.container, { backgroundColor: theme.colors.background }]}>
        <View style={st.centerWrap}>
          <Text style={[st.centerText, { color: theme.colors.textSecondary }]}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isRental = booking.serviceType === 'rental' || booking.type === 'rental';
  const isOwner = isRental && currentUserId && booking.owner?.userId === currentUserId;
  const isRenter = isRental && currentUserId && booking.userId === currentUserId;
  const isPoolingDriver = !isRental && currentUserId && (booking.driver?.userId === currentUserId || booking.driverId === currentUserId);
  const isPoolingPassenger = !isRental && !isPoolingDriver;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed': return { bg: '#E3F2FD', color: '#1565C0', label: 'Confirmed' };
      case 'pending': return { bg: '#FFF3E0', color: '#E65100', label: 'Pending' };
      case 'in_progress': return { bg: '#E8F5E9', color: '#2E7D32', label: 'In Progress' };
      case 'completed': return { bg: '#E8F5E9', color: '#2E7D32', label: 'Completed' };
      case 'cancelled': return { bg: '#FFEBEE', color: '#C62828', label: 'Cancelled' };
      default: return { bg: '#F5F5F5', color: '#757575', label: status || 'Unknown' };
    }
  };
  const sts = getStatusStyle(booking.status);

  const otherPerson = isRental
    ? (isOwner ? (booking.renter || booking.user) : (booking.owner))
    : (isPoolingDriver ? null : (booking.driver));
  const otherLabel = isRental
    ? (isOwner ? 'Renter' : 'Owner')
    : (isPoolingDriver ? 'Passengers' : 'Driver');

  const vehicleType = booking.vehicle?.type?.toLowerCase() || 'car';
  const getVehicleIcon = () => {
    if (vehicleType === 'scooty') return <MaterialCommunityIcons name="moped" size={18} color={theme.colors.primary} />;
    if (vehicleType === 'bike') return <MaterialCommunityIcons name="motorbike" size={18} color={theme.colors.primary} />;
    return <Car size={18} color={theme.colors.primary} />;
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return 'N/A';
    if (timeStr.match(/\d{1,2}:\d{2}\s*(AM|PM)/i)) return timeStr;
    const [h, m] = timeStr.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const canCancel = booking.status !== 'cancelled' && booking.status !== 'completed' && booking.status !== 'in_progress';
  const isActive = booking.status === 'confirmed' || booking.status === 'in_progress';

  return (
    <SafeAreaView style={[st.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Header ── */}
      <View style={[st.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.headerBtn}>
          <ArrowLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: theme.colors.text }]}>Booking Details</Text>
        <TouchableOpacity style={st.headerBtn} onPress={handleShare}>
          <Share2 size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>
        {/* ── Status Banner ── */}
        <View style={[st.statusBanner, { backgroundColor: sts.bg }]}>
          <View style={st.statusLeft}>
            <View style={[st.statusDot, { backgroundColor: sts.color }]} />
            <View>
              <Text style={[st.statusLabel, { color: sts.color }]}>{sts.label}</Text>
              <Text style={[st.bookingIdText, { color: sts.color + 'AA' }]}>#{booking.bookingId}</Text>
            </View>
          </View>
          <View style={[st.typePill, { backgroundColor: theme.colors.primary + '15' }]}>
            <Text style={[st.typePillText, { color: theme.colors.primary }]}>
              {isRental ? 'Rental' : 'Pooling'}
            </Text>
          </View>
        </View>

        {/* ── Role Badge (what the user is) ── */}
        <View style={[st.roleBadge, { backgroundColor: isPoolingDriver || isOwner ? '#E8F5E9' : '#E3F2FD' }]}>
          <Text style={[st.roleBadgeText, { color: isPoolingDriver || isOwner ? '#2E7D32' : '#1565C0' }]}>
            {isPoolingDriver ? '🚗  You are the driver' : isOwner ? '🚗  You are the owner' : isRenter ? '🧑  You are the renter' : '🧑  You are a passenger'}
          </Text>
        </View>

        {/* ── Connected Ride Banner ── */}
        {booking.connectedGroupId && (
          <View style={[st.card, { backgroundColor: '#E8EAF6' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: normalize(8), marginBottom: normalize(8) }}>
              <Link2 size={16} color="#3F51B5" />
              <Text style={{ fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '700', color: '#3F51B5' }}>
                Connected Ride — Leg {booking.legOrder || '?'} of 2
              </Text>
            </View>
            {booking.connectionPoint && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: normalize(6), marginBottom: normalize(8) }}>
                <MapPin size={14} color="#5C6BC0" />
                <Text style={{ fontFamily: FONTS.regular, fontSize: normalize(12), color: '#3F51B5' }}>
                  Transfer at {booking.connectionPoint.city || booking.connectionPoint.address?.split(',')?.[0] || 'Transfer Point'}
                </Text>
              </View>
            )}
            {connectedLegs && connectedLegs.length === 2 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: FONTS.regular, fontSize: normalize(12), color: '#5C6BC0' }}>
                  Combined total: ₹{Math.round(connectedLegs.reduce((s: number, l: any) => s + (l.totalAmount || l.amount || 0), 0))}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const otherLeg = connectedLegs.find((l: any) => l.bookingId !== booking.bookingId);
                    if (otherLeg) {
                      navigation.navigate('BookingDetails' as never, {
                        bookingId: otherLeg.bookingId,
                        booking: otherLeg,
                        connectedLegs,
                      } as never);
                    }
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: normalize(4) }}
                >
                  <Text style={{ fontFamily: FONTS.medium, fontSize: normalize(12), fontWeight: '600', color: '#3F51B5' }}>
                    View Leg {booking.legOrder === 1 ? 2 : 1}
                  </Text>
                  <ChevronRight size={14} color="#3F51B5" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Date & Time Chips ── */}
        <View style={st.chipsRow}>
          <View style={[st.chip, { backgroundColor: theme.colors.surface }]}>
            <Calendar size={15} color={theme.colors.primary} />
            <Text style={[st.chipText, { color: theme.colors.text }]}>{booking.date}</Text>
          </View>
          <View style={[st.chip, { backgroundColor: theme.colors.surface }]}>
            <Clock size={15} color={theme.colors.primary} />
            <Text style={[st.chipText, { color: theme.colors.text }]}>{formatTime(booking.time)}</Text>
          </View>
        </View>

        {/* ── Route (Pooling) ── */}
        {!isRental && booking.route && (
          <View style={[st.card, { backgroundColor: theme.colors.surface }]}>
            <View style={st.routeTimeline}>
              <View style={st.routeStop}>
                <View style={[st.routeDot, { backgroundColor: '#4CAF50' }]} />
                <View style={st.routeStopInfo}>
                  <Text style={[st.routeStopLabel, { color: theme.colors.textSecondary }]}>PICKUP</Text>
                  <Text style={[st.routeStopText, { color: theme.colors.text }]} numberOfLines={2}>{typeof booking.route.from === 'string' ? booking.route.from : booking.route.from?.address || 'N/A'}</Text>
                </View>
              </View>
              <View style={st.routeLineWrap}>
                <View style={[st.routeLine, { borderColor: theme.colors.border }]} />
              </View>
              <View style={st.routeStop}>
                <View style={[st.routeDot, { backgroundColor: '#E53E3E' }]} />
                <View style={st.routeStopInfo}>
                  <Text style={[st.routeStopLabel, { color: theme.colors.textSecondary }]}>DROP-OFF</Text>
                  <Text style={[st.routeStopText, { color: theme.colors.text }]} numberOfLines={2}>{typeof booking.route.to === 'string' ? booking.route.to : booking.route.to?.address || 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Rental Details ── */}
        {isRental && (
          <View style={[st.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[st.cardTitle, { color: theme.colors.text }]}>Rental Details</Text>
            {booking.startTime && booking.endTime && (
              <View style={st.infoRow}>
                <Clock size={16} color={theme.colors.primary} />
                <View style={st.infoRowContent}>
                  <Text style={[st.infoLabel, { color: theme.colors.textSecondary }]}>Period</Text>
                  <Text style={[st.infoValue, { color: theme.colors.text }]}>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</Text>
                </View>
              </View>
            )}
            {booking.duration && (
              <View style={st.infoRow}>
                <Clock size={16} color={theme.colors.primary} />
                <View style={st.infoRowContent}>
                  <Text style={[st.infoLabel, { color: theme.colors.textSecondary }]}>Duration</Text>
                  <Text style={[st.infoValue, { color: theme.colors.text }]}>{booking.duration} hours</Text>
                </View>
              </View>
            )}
            {(booking.location?.address || booking.route?.from) && (
              <View style={st.infoRow}>
                <MapPin size={16} color={theme.colors.primary} />
                <View style={st.infoRowContent}>
                  <Text style={[st.infoLabel, { color: theme.colors.textSecondary }]}>Location</Text>
                  <Text style={[st.infoValue, { color: theme.colors.text }]}>{booking.location?.address || (typeof booking.route?.from === 'string' ? booking.route.from : booking.route?.from?.address) || 'N/A'}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Other Person Card (Driver/Owner/Renter) ── */}
        {otherPerson && (
          <View style={[st.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[st.cardTitle, { color: theme.colors.text }]}>{otherLabel}</Text>
            <View style={st.personRow}>
              {otherPerson.photo ? (
                <Image source={{ uri: otherPerson.photo }} style={st.personAvatar} />
              ) : (
                <View style={[st.personAvatarPlaceholder, { backgroundColor: theme.colors.primary + '12' }]}>
                  <User size={22} color={theme.colors.primary} />
                </View>
              )}
              <View style={st.personInfo}>
                <View style={st.personNameRow}>
                  <Text style={[st.personName, { color: theme.colors.text }]} numberOfLines={1}>{otherPerson.name || otherLabel}</Text>
                  {otherPerson.isVerified && <CheckCircle size={14} color="#4CAF50" fill="#4CAF50" />}
                </View>
                {otherPerson.rating != null && (
                  <View style={st.personRating}>
                    <Star size={12} color="#FFB800" fill="#FFB800" />
                    <Text style={st.personRatingText}>{Number(otherPerson.rating || 0).toFixed(1)} ({otherPerson.totalReviews || 0})</Text>
                  </View>
                )}
              </View>
              <View style={st.personActions}>
                {otherPerson.phone && (
                  <TouchableOpacity style={[st.personActionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => Linking.openURL(`tel:${otherPerson.phone}`)}>
                    <Phone size={16} color="#2E7D32" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[st.personActionBtn, { backgroundColor: theme.colors.primary + '12' }]} onPress={handleChat}>
                  <MessageSquare size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Passengers (Driver's view for pooling) ── */}
        {isPoolingDriver && (booking.passengers || []).length > 0 && (
          <View style={[st.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[st.cardTitle, { color: theme.colors.text }]}>Passenger Bookings ({booking.passengers.length})</Text>
            {booking.passengers.map((p: any, i: number) => (
              <View key={p.userId || i} style={[st.passengerRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
                {p.photo ? (
                  <Image source={{ uri: p.photo }} style={st.passengerAvatar} />
                ) : (
                  <View style={[st.passengerAvatarPlaceholder, { backgroundColor: theme.colors.primary + '10' }]}>
                    <User size={14} color={theme.colors.primary} />
                  </View>
                )}
                <View style={st.passengerInfo}>
                  <View style={st.passengerTopRow}>
                    <Text style={[st.passengerName, { color: theme.colors.text }]}>
                      {(p.seatsBooked || 1) > 1 ? 'Group Booking' : (p.name || 'Passenger')}
                    </Text>
                    <View style={[st.seatBadge, { backgroundColor: theme.colors.primary + '12' }]}>
                      <Text style={[st.seatBadgeText, { color: theme.colors.primary }]}>
                        {(p.seatsBooked || 1)} member{(p.seatsBooked || 1) > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  {(p.seatsBooked || 1) > 1 && (
                    <Text style={[st.passengerSubText, { color: theme.colors.textSecondary }]}>
                      Contact: {p.name || 'Passenger'}
                    </Text>
                  )}
                  {p.rating != null && (
                    <View style={st.passengerMeta}>
                      <Star size={10} color="#FFB800" fill="#FFB800" />
                      <Text style={[st.passengerRatingText, { color: theme.colors.textSecondary }]}>{Number(p.rating || 0).toFixed(1)}</Text>
                    </View>
                  )}
                </View>
                <View style={[st.statusPill, {
                  backgroundColor: p.status === 'confirmed' ? '#E8F5E9' : p.status === 'cancelled' ? '#FFEBEE' : '#FFF8E1',
                }]}>
                  <Text style={[st.statusPillText, {
                    color: p.status === 'confirmed' ? '#2E7D32' : p.status === 'cancelled' ? '#C62828' : '#F57F17',
                  }]}>
                    {p.status?.charAt(0).toUpperCase() + p.status?.slice(1) || 'Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Vehicle Card ── */}
        {booking.vehicle && (
          <View style={[st.card, { backgroundColor: theme.colors.surface }]}>
            <View style={st.vehicleRow}>
              <View style={[st.vehicleIconWrap, { backgroundColor: theme.colors.primary + '10' }]}>
                {getVehicleIcon()}
              </View>
              <View style={st.vehicleInfo}>
                <Text style={[st.vehicleName, { color: theme.colors.text }]}>
                  {booking.vehicle.brand}{booking.vehicle.model ? ` ${booking.vehicle.model}` : ''}
                </Text>
                <Text style={[st.vehicleMeta, { color: theme.colors.textSecondary }]}>
                  {booking.vehicle.number}{booking.vehicle.color ? ` · ${booking.vehicle.color}` : ''} · {vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Payment Card ── */}
        <View style={[st.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[st.cardTitle, { color: theme.colors.text }]}>
            {isPoolingDriver || isOwner ? 'Earnings' : 'Payment'}
          </Text>
          <View style={st.payRow}>
            <Text style={[st.payLabel, { color: theme.colors.textSecondary }]}>
              {isRental ? 'Rental Amount' : 'Ride Amount'}
            </Text>
            <View style={st.payValueRow}>
              <IndianRupee size={16} color={theme.colors.text} />
              <Text style={[st.payValue, { color: theme.colors.text }]}>{booking.amount || 0}</Text>
            </View>
          </View>
          {booking.platformFee > 0 && (
            <View style={st.payRow}>
              <Text style={[st.payLabel, { color: theme.colors.textSecondary }]}>Platform Fee</Text>
              <View style={st.payValueRow}>
                <IndianRupee size={14} color={theme.colors.textSecondary} />
                <Text style={[st.payValue, { color: theme.colors.textSecondary, fontSize: normalize(14) }]}>{booking.platformFee}</Text>
              </View>
            </View>
          )}
          <View style={[st.payTotalRow, { borderTopColor: theme.colors.border }]}>
            <Text style={[st.payTotalLabel, { color: theme.colors.text }]}>
              {isPoolingDriver || isOwner ? 'Your Earnings' : 'Total'}
            </Text>
            <View style={st.payValueRow}>
              <IndianRupee size={20} color={isPoolingDriver || isOwner ? '#2E7D32' : theme.colors.primary} />
              <Text style={[st.payTotalValue, { color: isPoolingDriver || isOwner ? '#2E7D32' : theme.colors.primary }]}>
                {isPoolingDriver || isOwner ? (booking.amount - (booking.platformFee || 0)) : (booking.totalAmount || booking.amount || 0)}
              </Text>
            </View>
          </View>
          <View style={st.payMethodRow}>
            <CreditCard size={14} color={theme.colors.textSecondary} />
            <Text style={[st.payMethodText, { color: theme.colors.textSecondary }]}>
              {booking.paymentMethod === 'offline_cash' ? 'Cash' : booking.paymentMethod === 'wallet' ? 'Wallet' : booking.paymentMethod || 'Pay at trip end'}
            </Text>
            <View style={[st.payStatusDot, {
              backgroundColor: booking.paymentStatus === 'paid' ? '#4CAF50' : booking.paymentStatus === 'failed' ? '#E53E3E' : '#FF9800',
            }]} />
            <Text style={[st.payStatusText, {
              color: booking.paymentStatus === 'paid' ? '#4CAF50' : booking.paymentStatus === 'failed' ? '#E53E3E' : '#FF9800',
            }]}>
              {booking.paymentStatus === 'paid' ? 'Paid' : booking.paymentStatus === 'failed' ? 'Failed' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={st.actionsWrap}>
          {isActive && (
            <>
              {/* Track Trip — for passengers and drivers */}
              {!isRental && (
                <TouchableOpacity
                  style={[st.actionBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    if (isPoolingDriver) {
                      (navigation.navigate as any)('DriverTrip', {
                        bookingId: booking.bookingId || booking.id,
                        offerId: booking.poolingOfferId || booking.rentalOfferId,
                        booking,
                      });
                    } else {
                      (navigation.navigate as any)('TripTracking', { bookingId: booking.bookingId || booking.id, booking });
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Navigation size={18} color="#FFF" />
                  <Text style={st.actionBtnText}>{isPoolingDriver ? 'Manage Trip' : 'Track Trip'}</Text>
                </TouchableOpacity>
              )}

              {/* Manage Rental — for owners */}
              {isRental && isOwner && booking.rentalOfferId && (
                <TouchableOpacity
                  style={[st.actionBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => (navigation.navigate as any)('OwnerRentalManagement', { offerId: booking.rentalOfferId })}
                  activeOpacity={0.8}
                >
                  <Car size={18} color="#FFF" />
                  <Text style={st.actionBtnText}>Manage Rental</Text>
                </TouchableOpacity>
              )}

              {/* Message */}
              <TouchableOpacity
                style={[st.actionBtnOutline, { borderColor: theme.colors.primary }]}
                onPress={handleChat}
                activeOpacity={0.8}
              >
                <MessageSquare size={18} color={theme.colors.primary} />
                <Text style={[st.actionBtnOutlineText, { color: theme.colors.primary }]}>
                  {isRental ? (isOwner ? 'Message Renter' : 'Message Owner') : (isPoolingDriver ? 'Group Chat' : 'Message Driver')}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Cancel */}
          {canCancel && (
            <TouchableOpacity
              style={[st.actionBtnOutline, { borderColor: '#E53E3E' }]}
              onPress={handleCancelBooking}
              disabled={cancelling}
              activeOpacity={0.8}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#E53E3E" />
              ) : (
                <>
                  <X size={18} color="#E53E3E" />
                  <Text style={[st.actionBtnOutlineText, { color: '#E53E3E' }]}>Cancel Booking</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Safety Notice ── */}
        <View style={[st.safetyCard, { backgroundColor: '#FFF8E1' }]}>
          <Shield size={16} color="#F57F17" />
          <Text style={st.safetyText}>Share your ride details with a trusted contact for safety</Text>
          <TouchableOpacity onPress={handleShare}>
            <Text style={st.safetyLink}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: normalize(20) }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  container: { flex: 1 },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: normalize(12) },
  centerText: { fontFamily: FONTS.regular, fontSize: normalize(14) },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: normalize(12), paddingVertical: normalize(10), paddingTop: normalize(40),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: normalize(38), height: normalize(38), borderRadius: normalize(19), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.medium, fontSize: normalize(17), fontWeight: '700' },

  scroll: { padding: normalize(14), gap: normalize(10) },

  // Status Banner
  statusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: normalize(14), padding: normalize(14) },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: normalize(10) },
  statusDot: { width: normalize(10), height: normalize(10), borderRadius: normalize(5) },
  statusLabel: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '700' },
  bookingIdText: { fontFamily: FONTS.regular, fontSize: normalize(11), marginTop: normalize(2) },
  typePill: { paddingHorizontal: normalize(10), paddingVertical: normalize(4), borderRadius: normalize(8) },
  typePillText: { fontFamily: FONTS.medium, fontSize: normalize(11), fontWeight: '600' },

  // Role Badge
  roleBadge: { borderRadius: normalize(10), paddingVertical: normalize(10), paddingHorizontal: normalize(14), alignItems: 'center' },
  roleBadgeText: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '600' },

  // Chips
  chipsRow: { flexDirection: 'row', gap: normalize(10) },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: normalize(8), paddingHorizontal: normalize(12), paddingVertical: normalize(10), borderRadius: normalize(12), ...SHADOWS.sm },
  chipText: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '600' },

  // Card
  card: { borderRadius: normalize(14), padding: normalize(14), ...SHADOWS.sm },
  cardTitle: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '700', marginBottom: normalize(10) },

  // Route Timeline
  routeTimeline: {},
  routeStop: { flexDirection: 'row', alignItems: 'flex-start', gap: normalize(12) },
  routeDot: { width: normalize(10), height: normalize(10), borderRadius: normalize(5), marginTop: normalize(4) },
  routeStopInfo: { flex: 1, paddingBottom: normalize(4) },
  routeStopLabel: { fontFamily: FONTS.regular, fontSize: normalize(10), fontWeight: '600', letterSpacing: 0.8, marginBottom: normalize(2) },
  routeStopText: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '600', lineHeight: normalize(20) },
  routeLineWrap: { paddingLeft: normalize(4), paddingVertical: normalize(2) },
  routeLine: { width: 0, height: normalize(24), borderLeftWidth: 1.5, borderStyle: 'dashed' },

  // Info Row (rental)
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(10), paddingVertical: normalize(8) },
  infoRowContent: { flex: 1 },
  infoLabel: { fontFamily: FONTS.regular, fontSize: normalize(10), marginBottom: normalize(1) },
  infoValue: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '600' },

  // Person Card
  personRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(12) },
  personAvatar: { width: normalize(48), height: normalize(48), borderRadius: normalize(24), borderWidth: 2, borderColor: '#E0E0E0' },
  personAvatarPlaceholder: { width: normalize(48), height: normalize(48), borderRadius: normalize(24), alignItems: 'center', justifyContent: 'center' },
  personInfo: { flex: 1 },
  personNameRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), marginBottom: normalize(4) },
  personName: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '700' },
  personRating: { flexDirection: 'row', alignItems: 'center', gap: normalize(3), backgroundColor: '#FFF8E1', paddingHorizontal: normalize(8), paddingVertical: normalize(3), borderRadius: normalize(8), alignSelf: 'flex-start' },
  personRatingText: { fontFamily: FONTS.medium, fontSize: normalize(11), fontWeight: '600', color: '#8B6914' },
  personActions: { flexDirection: 'row', gap: normalize(8) },
  personActionBtn: { width: normalize(36), height: normalize(36), borderRadius: normalize(12), alignItems: 'center', justifyContent: 'center' },

  // Passengers
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(10), paddingVertical: normalize(10) },
  passengerAvatar: { width: normalize(34), height: normalize(34), borderRadius: normalize(17), borderWidth: 1.5, borderColor: '#E0E0E0' },
  passengerAvatarPlaceholder: { width: normalize(34), height: normalize(34), borderRadius: normalize(17), alignItems: 'center', justifyContent: 'center' },
  passengerInfo: { flex: 1 },
  passengerTopRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), flexWrap: 'wrap' },
  passengerName: { fontFamily: FONTS.medium, fontSize: normalize(13), fontWeight: '600' },
  seatBadge: { paddingHorizontal: normalize(8), paddingVertical: normalize(3), borderRadius: normalize(8) },
  seatBadgeText: { fontFamily: FONTS.medium, fontSize: normalize(10), fontWeight: '700' },
  passengerSubText: { fontFamily: FONTS.regular, fontSize: normalize(11), marginTop: normalize(2) },
  passengerMeta: { flexDirection: 'row', alignItems: 'center', gap: normalize(3), marginTop: normalize(2) },
  passengerRatingText: { fontFamily: FONTS.regular, fontSize: normalize(11) },
  statusPill: { paddingHorizontal: normalize(10), paddingVertical: normalize(4), borderRadius: normalize(8) },
  statusPillText: { fontFamily: FONTS.medium, fontSize: normalize(10), fontWeight: '600' },

  // Vehicle
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(12) },
  vehicleIconWrap: { width: normalize(40), height: normalize(40), borderRadius: normalize(12), alignItems: 'center', justifyContent: 'center' },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '600' },
  vehicleMeta: { fontFamily: FONTS.regular, fontSize: normalize(11), marginTop: normalize(2) },

  // Payment
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: normalize(6) },
  payLabel: { fontFamily: FONTS.regular, fontSize: normalize(13) },
  payValueRow: { flexDirection: 'row', alignItems: 'center' },
  payValue: { fontFamily: FONTS.medium, fontSize: normalize(16), fontWeight: '600' },
  payTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: normalize(10), marginTop: normalize(6), borderTopWidth: StyleSheet.hairlineWidth },
  payTotalLabel: { fontFamily: FONTS.medium, fontSize: normalize(14), fontWeight: '700' },
  payTotalValue: { fontFamily: FONTS.medium, fontSize: normalize(22), fontWeight: '800' },
  payMethodRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(6), marginTop: normalize(10), paddingTop: normalize(8), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E0E0E0' },
  payMethodText: { fontFamily: FONTS.regular, fontSize: normalize(12), flex: 1 },
  payStatusDot: { width: normalize(6), height: normalize(6), borderRadius: normalize(3) },
  payStatusText: { fontFamily: FONTS.medium, fontSize: normalize(11), fontWeight: '600' },

  // Actions
  actionsWrap: { gap: normalize(10), marginTop: normalize(4) },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: normalize(8), paddingVertical: normalize(14), borderRadius: normalize(14) },
  actionBtnText: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '700', color: '#FFF' },
  actionBtnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: normalize(8), paddingVertical: normalize(13), borderRadius: normalize(14), borderWidth: 1.5 },
  actionBtnOutlineText: { fontFamily: FONTS.medium, fontSize: normalize(15), fontWeight: '600' },

  // Safety
  safetyCard: { flexDirection: 'row', alignItems: 'center', gap: normalize(8), borderRadius: normalize(12), padding: normalize(12), marginTop: normalize(4) },
  safetyText: { fontFamily: FONTS.regular, fontSize: normalize(12), color: '#5D4037', flex: 1 },
  safetyLink: { fontFamily: FONTS.medium, fontSize: normalize(12), fontWeight: '700', color: '#F57F17' },
});

export default BookingDetailsScreen;
