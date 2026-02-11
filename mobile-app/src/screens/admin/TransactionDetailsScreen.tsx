import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  Car,
  KeyRound,
  User,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
  Navigation,
  CreditCard,
  FileText,
  ChevronRight,
  Users,
  Fuel,
  Settings2,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { bookingApi, adminApi } from '@utils/apiClient';

const { width } = Dimensions.get('window');

/* ── Helpers ── */

const safeStr = (v: any, fallback = 'N/A'): string => {
  if (!v) return fallback;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    return v.name || v.city || v.address || v.label || v.title || JSON.stringify(v).slice(0, 60);
  }
  return fallback;
};

const safeNum = (v: any): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  if (v && typeof v === 'object') {
    return Number(v.amount ?? v.total ?? v.value ?? v.count ?? 0) || 0;
  }
  return 0;
};

const formatCurrency = (v: any): string => {
  const n = safeNum(v);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (d: any): string => {
  if (!d) return 'N/A';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return 'N/A'; }
};

const formatDateTime = (d: any): string => {
  if (!d) return 'N/A';
  try {
    const date = new Date(d);
    return date.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return 'N/A'; }
};

const getServiceConfig = (type: string) => {
  const t = (type || '').toLowerCase();
  if (t === 'rental') return { label: 'Rental', icon: KeyRound, color: '#8B5CF6', bg: '#F3E8FF' };
  return { label: 'Pooling', icon: Car, color: '#0EA5E9', bg: '#E0F2FE' };
};

const getStatusConfig = (status: string) => {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'completed': return { label: 'Completed', color: '#10B981', bg: '#D1FAE5', icon: CheckCircle };
    case 'cancelled': return { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2', icon: XCircle };
    case 'active': case 'in_progress': return { label: s === 'active' ? 'Active' : 'In Progress', color: '#F59E0B', bg: '#FEF3C7', icon: Clock };
    case 'upcoming': return { label: 'Upcoming', color: '#3B82F6', bg: '#DBEAFE', icon: Calendar };
    case 'pending': return { label: 'Pending', color: '#F97316', bg: '#FFEDD5', icon: AlertCircle };
    default: return { label: status || 'Unknown', color: '#6B7280', bg: '#F3F4F6', icon: AlertCircle };
  }
};

/* ── Screen ── */

const TransactionDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { transactionId } = (route.params as any) || {};

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchBooking = useCallback(async (isRefresh = false) => {
    if (!transactionId) { setError('No booking ID provided.'); setLoading(false); return; }
    if (!isRefresh) setLoading(true);
    setError('');
    try {
      const id = String(transactionId).replace(/^#/, '');

      let singleData: any = null;
      let listData: any = null;

      // Fetch from both endpoints in parallel for best results
      const [singleRes, listRes] = await Promise.allSettled([
        bookingApi.getBooking(id),
        adminApi.getBookings({ limit: 100 }),
      ]);

      // Extract from single booking endpoint
      if (singleRes.status === 'fulfilled' && singleRes.value?.data) {
        const r = singleRes.value;
        singleData = r.data?.booking || r.data || r.booking || null;
      }

      // Extract from admin bookings list (has populated user/driver)
      if (listRes.status === 'fulfilled' && listRes.value?.data) {
        const allBookings = listRes.value.data?.bookings || listRes.value.data?.data || listRes.value.data || [];
        if (Array.isArray(allBookings)) {
          listData = allBookings.find((b: any) =>
            (b.bookingId || b._id || b.id) === id ||
            (b.bookingId || b._id || b.id) === transactionId
          );
        }
      }

      // Merge: list data (populated user/driver) takes precedence, then single booking data
      // single endpoint may have more detail fields, list has populated references
      const raw = singleData || listData;
      const populated = listData || singleData;

      if (__DEV__) {
        console.log('📋 TransactionDetails - single endpoint data:', JSON.stringify(singleData, null, 2));
        console.log('📋 TransactionDetails - list match data:', JSON.stringify(listData, null, 2));
      }

      if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
        // Merge: start with offer data, then single endpoint, then list data on top
        const offer = raw.offer || raw.poolingOffer || raw.rentalOffer || {};
        const merged = { ...offer, ...raw };

        // Overlay populated fields from list data (user, driver objects)
        if (populated && populated !== raw) {
          if (populated.user && typeof populated.user === 'object') merged.user = populated.user;
          if (populated.driver && typeof populated.driver === 'object') merged.driver = populated.driver;
          if (populated.passenger && typeof populated.passenger === 'object') merged.passenger = populated.passenger;
          if (populated.vehicle && typeof populated.vehicle === 'object') merged.vehicle = populated.vehicle;
        }

        if (__DEV__) {
          console.log('📋 TransactionDetails - merged data:', JSON.stringify(merged, null, 2));
        }

        setBooking(merged);
      } else {
        setError('Booking not found.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load booking details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [transactionId]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

  const onRefresh = () => { setRefreshing(true); fetchBooking(true); };

  /* ── Extract fields (deep, handles all known API shapes) ── */
  const b = booking || {};
  const bookingId = b.bookingId || b._id || b.id || transactionId;
  const service = b.serviceType || b.type || 'pooling';
  const svcConf = getServiceConfig(service);
  const SvcIcon = svcConf.icon;
  const statusConf = getStatusConfig(b.status);
  const StatusIcon = statusConf.icon;

  // User / Passenger — API stores passengers in a `passengers` array
  const firstPassenger = Array.isArray(b.passengers) && b.passengers.length > 0 ? b.passengers[0] : null;
  const rawUser = b.user || b.passenger || null;
  const userIsObj = rawUser && typeof rawUser === 'object' && !Array.isArray(rawUser);
  const userName = firstPassenger?.name
    || (userIsObj ? (rawUser.name || rawUser.fullName) : null)
    || b.userName || b.passengerName || 'N/A';
  const userPhone = firstPassenger?.phone
    || (userIsObj ? (rawUser.phone || rawUser.mobile) : null)
    || b.userPhone || b.passengerPhone || '';
  const userEmail = firstPassenger?.email
    || (userIsObj ? rawUser.email : null)
    || b.userEmail || b.passengerEmail || '';
  const userIdStr = firstPassenger?.userId || b.userId || '';

  // Driver — handle string IDs vs populated objects
  const rawDriver = b.driver || null;
  const driverIsObj = rawDriver && typeof rawDriver === 'object' && !Array.isArray(rawDriver);
  const driverName = (driverIsObj ? (rawDriver.name || rawDriver.fullName) : null)
    || b.driverName || b.driver?.name || '';
  const driverPhone = (driverIsObj ? (rawDriver.phone || rawDriver.mobile) : null)
    || b.driverPhone || b.driver?.phone || '';

  // Route
  const fromObj = b.from || b.pickup || b.origin || b.route?.from || b.startLocation || null;
  const toObj = b.to || b.dropoff || b.destination || b.route?.to || b.endLocation || null;
  const getPlaceStr = (obj: any): string => {
    if (!obj) return 'N/A';
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'object') {
      return obj.address || obj.formattedAddress || obj.fullAddress || obj.city || obj.name || obj.label || 'N/A';
    }
    return 'N/A';
  };
  const fromFull = getPlaceStr(fromObj);
  const toFull = getPlaceStr(toObj);

  // Vehicle
  const veh = b.vehicle || {};
  const vehicleStr = typeof veh === 'string'
    ? veh
    : [veh.brand, veh.model, veh.type, veh.year].filter(Boolean).join(' ') || b.vehicleType || b.vehicleModel || 'N/A';
  const vehicleNumber = (typeof veh === 'object' ? (veh.number || veh.plateNumber || veh.registrationNumber) : '') || b.vehicleNumber || '';
  const vehicleSeats = (typeof veh === 'object' ? veh.seats : '') || b.totalSeats || '';
  const vehicleFuel = (typeof veh === 'object' ? (veh.fuel || veh.fuelType) : '') || '';
  const vehicleTransmission = (typeof veh === 'object' ? veh.transmission : '') || '';
  const vehiclePhotos = (typeof veh === 'object' ? veh.photos : null) || [];

  // Amounts - handle objects and numbers
  const totalAmount = b.totalAmount || b.amount || b.fare || b.price || b.pricePerSeat || 0;
  const basePrice = b.basePrice || b.baseFare || b.amount || b.pricePerSeat || b.price || 0;
  const platformFee = b.platformFee || b.serviceFee || b.adminFee || 0;
  const discount = b.discount || b.couponDiscount || 0;
  const tax = b.tax || b.gst || b.taxes || 0;

  // Payment
  const payObj = b.payment || {};
  const paymentMethod = b.paymentMethod || (typeof payObj === 'object' ? payObj.method : '') || b.paymentMode || 'N/A';
  const paymentStatus = b.paymentStatus || (typeof payObj === 'object' ? payObj.status : '') || 'N/A';
  const paymentId = b.paymentId || (typeof payObj === 'object' ? payObj.transactionId : '') || '';

  // Dates
  const createdAt = b.createdAt || b.date || b.bookingDate || b.created_at;
  const scheduledAt = b.scheduledAt || b.departureTime || b.departureDate || b.startDate || b.startTime;
  const completedAt = b.completedAt || b.endDate || b.completedDate || b.endTime;
  const updatedAt = b.updatedAt || b.updated_at;

  // Misc
  const seats = b.seats || b.seatsBooked || b.seatsAvailable || '';
  const notes = b.notes || b.description || b.remarks || b.additionalInfo || '';
  const distance = b.distance || b.totalDistance || '';
  const duration = b.duration || b.totalDuration || b.estimatedDuration || '';
  const bookingNumber = b.bookingNumber || '';
  const time = b.time || '';

  // Cancellation
  const cancellationReason = b.cancellationReason || '';
  const cancelledAt = b.cancelledAt || '';
  const cancelledBy = b.cancelledBy || '';
  const cancellationFee = b.cancellationFee ?? '';

  // Settlement
  const settlementStatus = b.settlementStatus || '';
  const passengerStatus = b.passengerStatus || '';

  /* ── Render ── */

  const renderInfoRow = (icon: any, label: string, value: string, options?: { color?: string; action?: () => void }) => {
    const Icon = icon;
    return (
      <TouchableOpacity
        style={styles.infoRow}
        activeOpacity={options?.action ? 0.6 : 1}
        onPress={options?.action}
        disabled={!options?.action}
      >
        <View style={styles.infoIconWrap}>
          <Icon size={16} color={options?.color || '#64748B'} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={[styles.infoValue, options?.color ? { color: options.color } : null]} numberOfLines={2}>
            {value}
          </Text>
        </View>
        {options?.action && <ChevronRight size={14} color="#CBD5E1" />}
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Hero Header */}
      <ImageBackground
        source={require('../../../assets/td.png')}
        style={styles.heroHeader}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay} />
        <BlurView intensity={20} tint="dark" style={styles.heroBlur}>
          <View style={styles.heroNav}>
            <TouchableOpacity style={styles.heroBackBtn} onPress={() => navigation.goBack()}>
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroTitle}>Transaction Details</Text>
              <Text style={styles.heroSubtitle} numberOfLines={1}>
                {transactionId ? `#${String(transactionId).replace(/^#/, '')}` : 'Booking'}
              </Text>
            </View>
            <View style={{ width: 38 }} />
          </View>
        </BlurView>
      </ImageBackground>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorIconWrap}>
            <AlertCircle size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchBooking()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : booking ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusCardTop}>
              <View style={[styles.serviceBadge, { backgroundColor: svcConf.bg }]}>
                <SvcIcon size={16} color={svcConf.color} />
                <Text style={[styles.serviceBadgeText, { color: svcConf.color }]}>{svcConf.label}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
                <StatusIcon size={14} color={statusConf.color} />
                <Text style={[styles.statusBadgeText, { color: statusConf.color }]}>{statusConf.label}</Text>
              </View>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>{formatCurrency(totalAmount)}</Text>
            </View>
            <View style={styles.idRow}>
              <Hash size={12} color="#94A3B8" />
              <Text style={styles.idText} numberOfLines={1}>{String(bookingId).replace(/^#/, '')}</Text>
            </View>
          </View>

          {/* Route Section */}
          {renderSection('Route Details', (
            <>
              <View style={styles.routeContainer}>
                <View style={styles.routeTimeline}>
                  <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
                  <View style={styles.routeLine} />
                  <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
                </View>
                <View style={styles.routeInfo}>
                  <View style={styles.routePoint}>
                    <Text style={styles.routePointLabel}>Pickup</Text>
                    <Text style={styles.routePointValue} numberOfLines={3}>{fromFull}</Text>
                  </View>
                  <View style={styles.routePoint}>
                    <Text style={styles.routePointLabel}>Drop-off</Text>
                    <Text style={styles.routePointValue} numberOfLines={3}>{toFull}</Text>
                  </View>
                </View>
              </View>
              {distance ? renderInfoRow(Navigation, 'Distance', typeof distance === 'number' ? `${distance} km` : String(distance)) : null}
              {duration ? renderInfoRow(Clock, 'Duration', typeof duration === 'number' ? `${duration} min` : String(duration)) : null}
              {scheduledAt ? renderInfoRow(Calendar, 'Scheduled', formatDateTime(scheduledAt)) : null}
              {completedAt ? renderInfoRow(Clock, 'Completed', formatDateTime(completedAt)) : null}
            </>
          ))}

          {/* Passenger Section */}
          {renderSection('Passenger', (
            <>
              {renderInfoRow(User, 'Name', userName)}
              {userIdStr ? renderInfoRow(Hash, 'User ID', userIdStr) : null}
              {userPhone ? renderInfoRow(Phone, 'Phone', userPhone, {
                color: COLORS.secondary,
                action: () => Linking.openURL(`tel:${userPhone}`),
              }) : null}
              {userEmail ? renderInfoRow(Mail, 'Email', userEmail, {
                color: COLORS.secondary,
                action: () => Linking.openURL(`mailto:${userEmail}`),
              }) : null}
              {firstPassenger?.status ? renderInfoRow(CheckCircle, 'Status', firstPassenger.status.charAt(0).toUpperCase() + firstPassenger.status.slice(1)) : null}
              {seats ? renderInfoRow(Users, 'Seats Booked', String(seats)) : null}
              {Array.isArray(b.passengers) && b.passengers.length > 1 ? renderInfoRow(Users, 'Total Passengers', String(b.passengers.length)) : null}
            </>
          ))}

          {/* Driver Section */}
          {driverName ? renderSection('Driver', (
            <>
              {renderInfoRow(User, 'Name', driverName)}
              {driverPhone ? renderInfoRow(Phone, 'Phone', driverPhone, {
                color: COLORS.secondary,
                action: () => Linking.openURL(`tel:${driverPhone}`),
              }) : null}
            </>
          )) : null}

          {/* Vehicle Section */}
          {vehicleStr !== 'N/A' ? renderSection('Vehicle', (
            <>
              {renderInfoRow(Car, 'Vehicle', vehicleStr)}
              {vehicleNumber ? renderInfoRow(Hash, 'Number Plate', vehicleNumber) : null}
              {vehicleSeats ? renderInfoRow(Users, 'Seats', String(vehicleSeats)) : null}
              {vehicleFuel ? renderInfoRow(Fuel, 'Fuel Type', vehicleFuel) : null}
              {vehicleTransmission ? renderInfoRow(Settings2, 'Transmission', vehicleTransmission) : null}
            </>
          )) : null}

          {/* Payment Breakdown */}
          {renderSection('Payment Details', (
            <>
              {renderInfoRow(CreditCard, 'Payment Method', safeStr(paymentMethod))}
              {renderInfoRow(CheckCircle, 'Payment Status', safeStr(paymentStatus), {
                color: String(paymentStatus).toLowerCase() === 'paid' || String(paymentStatus).toLowerCase() === 'completed' ? '#10B981' : '#F59E0B',
              })}
              {paymentId ? renderInfoRow(Hash, 'Transaction ID', paymentId) : null}
              <View style={styles.divider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Base Fare</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(basePrice)}</Text>
              </View>
              {safeNum(platformFee) > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Platform Fee</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(platformFee)}</Text>
                </View>
              )}
              {safeNum(tax) > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tax / GST</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(tax)}</Text>
                </View>
              )}
              {safeNum(discount) > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Discount</Text>
                  <Text style={[styles.breakdownValue, { color: '#10B981' }]}>-{formatCurrency(discount)}</Text>
                </View>
              )}
              <View style={[styles.divider, { marginTop: 8 }]} />
              <View style={[styles.breakdownRow, { marginTop: 4 }]}>
                <Text style={styles.breakdownTotalLabel}>Total</Text>
                <Text style={styles.breakdownTotalValue}>{formatCurrency(totalAmount)}</Text>
              </View>
            </>
          ))}

          {/* Dates */}
          {renderSection('Timeline', (
            <>
              {renderInfoRow(Calendar, 'Booked On', formatDateTime(createdAt))}
              {time ? renderInfoRow(Clock, 'Departure Time', time) : null}
              {scheduledAt ? renderInfoRow(Clock, 'Scheduled For', formatDateTime(scheduledAt)) : null}
              {completedAt ? renderInfoRow(CheckCircle, 'Completed At', formatDateTime(completedAt), { color: '#10B981' }) : null}
              {cancelledAt ? renderInfoRow(XCircle, 'Cancelled At', formatDateTime(cancelledAt), { color: '#EF4444' }) : null}
              {updatedAt ? renderInfoRow(Clock, 'Last Updated', formatDateTime(updatedAt)) : null}
              {bookingNumber ? renderInfoRow(Hash, 'Booking Number', bookingNumber) : null}
            </>
          ))}

          {/* Cancellation */}
          {cancellationReason ? renderSection('Cancellation', (
            <>
              {renderInfoRow(XCircle, 'Reason', cancellationReason, { color: '#EF4444' })}
              {cancelledBy ? renderInfoRow(User, 'Cancelled By', cancelledBy.charAt(0).toUpperCase() + cancelledBy.slice(1)) : null}
              {typeof cancellationFee === 'number' ? renderInfoRow(DollarSign, 'Cancellation Fee', formatCurrency(cancellationFee)) : null}
            </>
          )) : null}

          {/* Status Info */}
          {(settlementStatus || passengerStatus) ? renderSection('Additional Status', (
            <>
              {settlementStatus ? renderInfoRow(DollarSign, 'Settlement', settlementStatus.charAt(0).toUpperCase() + settlementStatus.slice(1), {
                color: settlementStatus === 'completed' ? '#10B981' : '#F59E0B',
              }) : null}
              {passengerStatus ? renderInfoRow(User, 'Passenger Status', passengerStatus.charAt(0).toUpperCase() + passengerStatus.slice(1)) : null}
            </>
          )) : null}

          {/* Notes */}
          {notes ? renderSection('Notes', (
            <View style={styles.notesContainer}>
              <FileText size={16} color="#94A3B8" />
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          )) : null}

          {/* Raw Data (debug - all remaining fields) */}
          {__DEV__ && renderSection('All Booking Data', (
            <ScrollView horizontal>
              <Text style={styles.notesText} selectable>{JSON.stringify(b, null, 2)}</Text>
            </ScrollView>
          ))}

          {/* Actions */}
          <View style={styles.actionsRow}>
            {booking?.status !== 'cancelled' && booking?.status !== 'completed' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => {
                  Alert.alert(
                    'Cancel Booking',
                    'Are you sure you want to cancel this booking?',
                    [
                      { text: 'No', style: 'cancel' },
                      {
                        text: 'Yes, Cancel',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const id = String(bookingId).replace(/^#/, '');
                            await bookingApi.cancelBooking(id, 'Cancelled by admin');
                            Alert.alert('Success', 'Booking cancelled successfully.');
                            fetchBooking(true);
                          } catch (e: any) {
                            Alert.alert('Error', e?.message || 'Failed to cancel booking.');
                          }
                        },
                      },
                    ],
                  );
                }}
              >
                <XCircle size={16} color="#EF4444" />
                <Text style={styles.cancelBtnText}>Cancel Booking</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : null}
    </View>
  );
};

/* ── Styles ── */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  heroHeader: { height: Platform.OS === 'android' ? 140 + (StatusBar.currentHeight || 0) : 160, width: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 52, 96, 0.5)' },
  heroBlur: { flex: 1, justifyContent: 'flex-end', paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg },
  heroNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBackBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  heroTitleWrap: { alignItems: 'center', flex: 1, marginHorizontal: SPACING.sm },
  heroTitle: { fontFamily: FONTS.regular, fontSize: 20, color: '#fff', fontWeight: '700' },
  heroSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  loadingText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.md },
  errorIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  errorTitle: { fontFamily: FONTS.regular, fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: SPACING.xs },
  errorText: { fontFamily: FONTS.regular, fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: SPACING.lg },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.primary },
  retryBtnText: { fontFamily: FONTS.regular, fontSize: 14, fontWeight: '600', color: '#fff' },

  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingTop: SPACING.md },

  /* Status Card */
  statusCard: { backgroundColor: '#fff', borderRadius: 16, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.md },
  statusCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  serviceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  serviceBadgeText: { fontFamily: FONTS.regular, fontSize: 12, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusBadgeText: { fontFamily: FONTS.regular, fontSize: 11, fontWeight: '700' },
  amountRow: { alignItems: 'center', marginBottom: SPACING.sm },
  amountLabel: { fontFamily: FONTS.regular, fontSize: 12, color: '#94A3B8', fontWeight: '500', marginBottom: 4 },
  amountValue: { fontFamily: FONTS.regular, fontSize: 32, fontWeight: '800', color: '#1E293B' },
  idRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  idText: { fontFamily: FONTS.regular, fontSize: 11, color: '#94A3B8', fontWeight: '500', flex: 1 },

  /* Sections */
  section: { marginBottom: SPACING.md },
  sectionTitle: { fontFamily: FONTS.regular, fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: SPACING.sm, marginLeft: 4 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 14, padding: SPACING.md, ...SHADOWS.sm },

  /* Info Row */
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  infoIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  infoContent: { flex: 1 },
  infoLabel: { fontFamily: FONTS.regular, fontSize: 11, color: '#94A3B8', fontWeight: '500', marginBottom: 2 },
  infoValue: { fontFamily: FONTS.regular, fontSize: 14, color: '#1E293B', fontWeight: '600' },

  /* Route */
  routeContainer: { flexDirection: 'row', paddingVertical: SPACING.sm },
  routeTimeline: { width: 24, alignItems: 'center', paddingTop: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  routeInfo: { flex: 1, marginLeft: SPACING.sm, gap: SPACING.md },
  routePoint: { gap: 2 },
  routePointLabel: { fontFamily: FONTS.regular, fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  routePointValue: { fontFamily: FONTS.regular, fontSize: 14, color: '#1E293B', fontWeight: '600' },

  /* Payment breakdown */
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  breakdownLabel: { fontFamily: FONTS.regular, fontSize: 13, color: '#64748B', fontWeight: '500' },
  breakdownValue: { fontFamily: FONTS.regular, fontSize: 13, color: '#1E293B', fontWeight: '600' },
  breakdownTotalLabel: { fontFamily: FONTS.regular, fontSize: 15, color: '#1E293B', fontWeight: '700' },
  breakdownTotalValue: { fontFamily: FONTS.regular, fontSize: 18, color: '#00B894', fontWeight: '800' },

  /* Notes */
  notesContainer: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  notesText: { fontFamily: FONTS.regular, fontSize: 13, color: '#64748B', fontWeight: '500', flex: 1, lineHeight: 20 },

  /* Actions */
  actionsRow: { marginTop: SPACING.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  cancelBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
  cancelBtnText: { fontFamily: FONTS.regular, fontSize: 14, fontWeight: '700', color: '#EF4444' },
});

export default TransactionDetailsScreen;
