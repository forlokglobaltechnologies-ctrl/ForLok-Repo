import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { normalize, hp } from '@utils/responsive';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  Star,
  AlertCircle,
  CreditCard,
  XCircle,
  FileText,
  Trash2,
  Coins,
  Gift,
  Trophy,
  Users,
  ShieldAlert,
  MessageCircle,
  Eye,
  CheckCheck,
  Archive,
  ChevronRight,
  X,
  Clock,
  BellOff,
  Inbox,
  Wallet,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { useNotifications } from '@context/NotificationContext';
import { notificationApi } from '@utils/apiClient';

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { markAllAsRead, refreshUnreadCount } = useNotifications();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Response modal state
  const [responseModal, setResponseModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const response = await notificationApi.getNotifications({ page: pageNum, limit: 20 });
      if (response.success) {
        const items = response.data?.notifications || response.data || [];
        if (append) {
          setNotifications((prev) => [...prev, ...items]);
        } else {
          setNotifications(items);
        }
        const total = response.data?.total || response.pagination?.total || items.length;
        setHasMore(items.length === 20 && notifications.length + items.length < total);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications(1, false);
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkRead = async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          (n.notificationId === notificationId || n._id === notificationId)
            ? { ...n, read: true }
            : n
        )
      );
      refreshUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationApi.deleteNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((n) => n.notificationId !== notificationId && n._id !== notificationId)
      );
      refreshUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // ── View admin response ─────────────────────────────────────
  const handleViewResponse = (notification: any) => {
    const id = notification.notificationId || notification._id;
    if (!notification.read) handleMarkRead(id);
    setSelectedNotification(notification);
    setResponseModal(true);
  };

  const handleAction = (notification: any, action: string) => {
    const bookingId = notification.data?.bookingId;
    const id = notification.notificationId || notification._id;
    handleMarkRead(id);

    switch (action) {
      case 'open_trip':
        if (bookingId) navigation.navigate('TripTracking' as never, { bookingId } as never);
        break;
      case 'view_booking':
        if (bookingId) navigation.navigate('BookingConfirmation' as never, { bookingId } as never);
        break;
      case 'rate':
        if (bookingId) navigation.navigate('Rating' as never, { bookingId } as never);
        break;
      case 'view_wallet':
        (navigation.navigate as any)('Wallet', { tab: 'coins' });
        break;
      case 'earn_coins':
        navigation.navigate('EarnCoins' as never);
        break;
      default:
        break;
    }
  };

  // ── Notification icon mapping ────────────────────────────────
  const getNotificationIcon = (type: string): { icon: React.ReactNode; color: string; bg: string } => {
    const iconMap: Record<string, { Icon: any; color: string; bg: string }> = {
      booking_request:     { Icon: Bell,         color: '#F99E3C', bg: '#FFF4E6' },
      booking_confirmed:   { Icon: CheckCircle,  color: '#00B894', bg: '#E8FFF3' },
      booking_cancelled:   { Icon: XCircle,      color: '#E74C3C', bg: '#FFEBEE' },
      payment_required:    { Icon: CreditCard,   color: '#F39C12', bg: '#FFF8E1' },
      payment_received:    { Icon: CheckCircle,  color: '#00B894', bg: '#E8FFF3' },
      payment_completed:   { Icon: CheckCircle,  color: '#00B894', bg: '#E8FFF3' },
      rating_request:      { Icon: Star,         color: '#F39C12', bg: '#FFF8E1' },
      document_verified:   { Icon: FileText,     color: '#00B894', bg: '#E8FFF3' },
      document_rejected:   { Icon: FileText,     color: '#E74C3C', bg: '#FFEBEE' },
      coin_earned:         { Icon: Coins,        color: '#F5A623', bg: '#FFF8E1' },
      coin_redeemed:       { Icon: Coins,        color: '#27AE60', bg: '#E8FFF3' },
      referral_reward:     { Icon: Users,        color: '#F99E3C', bg: '#FFF4E6' },
      milestone_achieved:  { Icon: Trophy,       color: '#F5A623', bg: '#FFF8E1' },
      promo_approved:      { Icon: Gift,         color: '#00B894', bg: '#E8FFF3' },
      promo_rejected:      { Icon: Gift,         color: '#E74C3C', bg: '#FFEBEE' },
      sos_alert:           { Icon: ShieldAlert,  color: '#D32F2F', bg: '#FFEBEE' },
      // ── Feedback notification types ──
      feedback_acknowledged: { Icon: Eye,          color: '#F99E3C', bg: '#FFF4E6' },
      feedback_resolved:     { Icon: CheckCheck,   color: '#00B894', bg: '#E8FFF3' },
      feedback_response:     { Icon: MessageCircle, color: '#7B61FF', bg: '#F0EBFF' },
      feedback_archived:     { Icon: Archive,       color: '#94A3B8', bg: '#F1F5F9' },
    };

    const entry = iconMap[type] || { Icon: AlertCircle, color: '#94A3B8', bg: '#F1F5F9' };
    return {
      icon: <entry.Icon size={20} color={entry.color} />,
      color: entry.color,
      bg: entry.bg,
    };
  };

  const getTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  // ── Check if notification has admin response data ───────────
  const hasAdminResponse = (notification: any): boolean => {
    return !!(notification.data?.adminResponse);
  };

  // ── Render action buttons ───────────────────────────────────
  const renderActionButtons = (notification: any) => {
    const type = notification.type;

    // ── Feedback types with response → show "View Response" button ──
    if (
      (type === 'feedback_response' ||
        type === 'feedback_acknowledged' ||
        type === 'feedback_resolved' ||
        type === 'feedback_archived') &&
      hasAdminResponse(notification)
    ) {
      return (
        <TouchableOpacity
          style={styles.responseButton}
          activeOpacity={0.7}
          onPress={() => handleViewResponse(notification)}
        >
          <MessageCircle size={14} color="#7B61FF" />
          <Text style={styles.responseButtonText}>View Response</Text>
          <ChevronRight size={14} color="#7B61FF" />
        </TouchableOpacity>
      );
    }

    // ── Feedback types without response → show status only ──
    if (
      type === 'feedback_acknowledged' ||
      type === 'feedback_resolved' ||
      type === 'feedback_archived'
    ) {
      return null; // just status, no action needed
    }

    if (type === 'payment_required') {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => handleAction(notification, 'open_trip')}
          >
            <Text style={styles.actionBtnPrimaryText}>Open Trip</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (type === 'booking_request') {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => handleAction(notification, 'accept')}
          >
            <Text style={styles.actionBtnPrimaryText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => handleAction(notification, 'decline')}
          >
            <Text style={styles.actionBtnOutlineText}>Decline</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (type === 'rating_request') {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => handleAction(notification, 'rate')}
          >
            <Star size={14} color="#fff" />
            <Text style={styles.actionBtnPrimaryText}>Rate Now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (type === 'payment_completed' || type === 'payment_received' || type === 'booking_confirmed') {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => handleAction(notification, 'view_booking')}
          >
            <Text style={styles.actionBtnOutlineText}>View Details</Text>
            <ChevronRight size={14} color="#F99E3C" />
          </TouchableOpacity>
        </View>
      );
    }

    if (type === 'coin_earned' || type === 'coin_redeemed' || type === 'milestone_achieved') {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => handleAction(notification, 'view_wallet')}
          >
            <Wallet size={14} color="#fff" />
            <Text style={styles.actionBtnPrimaryText}>View Wallet</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (type === 'referral_reward') {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => handleAction(notification, 'view_wallet')}
          >
            <Text style={styles.actionBtnPrimaryText}>View Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => handleAction(notification, 'earn_coins')}
          >
            <Text style={styles.actionBtnOutlineText}>Invite More</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (type === 'promo_approved' || type === 'promo_rejected') {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => handleAction(notification, type === 'promo_approved' ? 'view_wallet' : 'earn_coins')}
          >
            <Text style={styles.actionBtnPrimaryText}>
              {type === 'promo_approved' ? 'View Wallet' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  // ── Render a notification card ──────────────────────────────
  const renderNotification = (notification: any, index: number) => {
    const id = notification.notificationId || notification._id || `notif-${index}`;
    const isUnread = !notification.read;
    const { icon, color, bg } = getNotificationIcon(notification.type);

    return (
      <TouchableOpacity
        key={id}
        activeOpacity={0.7}
        onPress={() => {
          if (isUnread) handleMarkRead(id);
          // If it's a feedback response, open the response modal
          if (hasAdminResponse(notification)) {
            handleViewResponse(notification);
          }
        }}
        style={[
          styles.notifCard,
          isUnread ? styles.notifCardUnread : styles.notifCardRead,
        ]}
      >
        {/* Unread indicator strip */}
        {isUnread && <View style={[styles.unreadStrip, { backgroundColor: color }]} />}

        <View style={styles.notifRow}>
          {/* Icon */}
          <View style={[styles.notifIconWrap, { backgroundColor: bg }]}>
            {icon}
          </View>

          {/* Content */}
          <View style={styles.notifContent}>
            <View style={styles.notifTitleRow}>
              <Text
                style={[styles.notifTitle, isUnread && styles.notifTitleUnread]}
                numberOfLines={1}
              >
                {notification.title}
              </Text>
              <Text style={styles.notifTime}>
                {getTimeAgo(notification.createdAt || notification.time)}
              </Text>
            </View>

            <Text style={styles.notifMessage} numberOfLines={2}>
              {notification.message}
            </Text>

            {/* Amount / Coins badges */}
            <View style={styles.badgeRow}>
              {notification.data?.amount && (
                <View style={[styles.infoBadge, { backgroundColor: '#F99E3C' + '15' }]}>
                  <CreditCard size={12} color="#F99E3C" />
                  <Text style={[styles.infoBadgeText, { color: '#F99E3C' }]}>
                    ₹{notification.data.amount}
                  </Text>
                </View>
              )}
              {notification.data?.coins && (
                <View style={[styles.infoBadge, { backgroundColor: '#F5A623' + '15' }]}>
                  <Coins size={12} color="#F5A623" />
                  <Text style={[styles.infoBadgeText, { color: '#F5A623' }]}>
                    +{notification.data.coins}
                  </Text>
                </View>
              )}
              {notification.data?.status && (
                <View style={[styles.infoBadge, { backgroundColor: color + '15' }]}>
                  <Text style={[styles.infoBadgeText, { color }]}>
                    {notification.data.status}
                  </Text>
                </View>
              )}
            </View>

            {/* Action buttons */}
            {renderActionButtons(notification)}
          </View>

          {/* Delete button */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={14} color="#CBD5E1" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Unread count ────────────────────────────────────────────
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ─── Hero Header ──────────────────────────────────────── */}
      <ImageBackground
        source={require('../../../assets/notification.png')}
        style={styles.heroHeader}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay} />
        <BlurView intensity={20} tint="dark" style={styles.heroBlur}>
          <View style={styles.heroContent}>
            <TouchableOpacity
              style={styles.heroBackBtn}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>

            <View style={styles.heroCenter}>
              <Text style={styles.heroTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>{unreadCount} new</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.heroActionBtn}
              onPress={handleMarkAllRead}
            >
              <CheckCheck size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </BlurView>
      </ImageBackground>

      {/* ─── Content ──────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F99E3C" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F99E3C" />
          }
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Inbox size={48} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptyText}>
                No new notifications. We'll let you know when something important happens.
              </Text>
            </View>
          ) : (
            <>
              {/* Filter pills */}
              <View style={styles.filterRow}>
                <View style={styles.filterPill}>
                  <Bell size={12} color="#F99E3C" />
                  <Text style={styles.filterPillText}>All ({notifications.length})</Text>
                </View>
                {unreadCount > 0 && (
                  <View style={[styles.filterPill, styles.filterPillActive]}>
                    <View style={styles.filterDot} />
                    <Text style={[styles.filterPillText, styles.filterPillActiveText]}>
                      Unread ({unreadCount})
                    </Text>
                  </View>
                )}
              </View>

              {/* Notification cards */}
              {notifications.map((notification, index) =>
                renderNotification(notification, index)
              )}

              {hasMore && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => loadNotifications(page + 1, true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loadMoreText}>Load More</Text>
                  <ChevronRight size={14} color="#F99E3C" />
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ─── Response Modal ───────────────────────────────────── */}
      <Modal
        visible={responseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setResponseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismiss}
            activeOpacity={1}
            onPress={() => setResponseModal(false)}
          />
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: '#7B61FF' + '15' }]}>
                <MessageCircle size={22} color="#7B61FF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Admin Response</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedNotification?.data?.feedbackType || 'Feedback'} — {selectedNotification?.data?.status || ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setResponseModal(false)}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Original feedback info */}
            {selectedNotification && (
              <View style={styles.modalFeedbackInfo}>
                <Text style={styles.modalFeedbackLabel}>Your Feedback</Text>
                <Text style={styles.modalFeedbackSubject}>
                  {selectedNotification.message || selectedNotification.title}
                </Text>
              </View>
            )}

            {/* The admin response */}
            <View style={styles.modalResponseWrap}>
              <View style={styles.modalResponseHeader}>
                <View style={styles.modalResponseDot} />
                <Text style={styles.modalResponseLabel}>Team Response</Text>
                {selectedNotification?.data?.respondedAt && (
                  <Text style={styles.modalResponseDate}>
                    {getTimeAgo(selectedNotification.data.respondedAt)}
                  </Text>
                )}
              </View>
              <Text style={styles.modalResponseText}>
                {selectedNotification?.data?.adminResponse || 'No response available.'}
              </Text>
            </View>

            {/* Status pill */}
            {selectedNotification?.data?.status && (
              <View style={styles.modalStatusRow}>
                <Text style={styles.modalStatusLabel}>Status:</Text>
                <View
                  style={[
                    styles.modalStatusPill,
                    {
                      backgroundColor:
                        selectedNotification.data.status === 'resolved'
                          ? '#00B894' + '15'
                          : selectedNotification.data.status === 'acknowledged'
                          ? '#F99E3C' + '15'
                          : '#94A3B8' + '15',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalStatusText,
                      {
                        color:
                          selectedNotification.data.status === 'resolved'
                            ? '#00B894'
                            : selectedNotification.data.status === 'acknowledged'
                            ? '#F99E3C'
                            : '#94A3B8',
                      },
                    ]}
                  >
                    {selectedNotification.data.status.charAt(0).toUpperCase() +
                      selectedNotification.data.status.slice(1)}
                  </Text>
                </View>
              </View>
            )}

            {/* Close button */}
            <TouchableOpacity
              style={styles.modalDoneBtn}
              activeOpacity={0.8}
              onPress={() => setResponseModal(false)}
            >
              <Text style={styles.modalDoneBtnText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  /* ── Hero Header ────────────────────────────────────────────── */
  heroHeader: {
    height: Platform.OS === 'android' ? hp(17) + (StatusBar.currentHeight || 0) : hp(20),
    width: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 52, 96, 0.55)',
  },
  heroBlur: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBackBtn: {
    width: normalize(38),
    height: normalize(38),
    borderRadius: normalize(19),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  heroTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(22),
    color: '#fff',
    fontWeight: '700',
  },
  heroBadge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(3),
    borderRadius: normalize(12),
  },
  heroBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: '#fff',
    fontWeight: '700',
  },
  heroActionBtn: {
    width: normalize(38),
    height: normalize(38),
    borderRadius: normalize(19),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Loading ────────────────────────────────────────────────── */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#94A3B8',
    marginTop: SPACING.md,
  },

  /* ── Scroll ─────────────────────────────────────────────────── */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
  },

  /* ── Filter pills ───────────────────────────────────────────── */
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(6),
    backgroundColor: '#fff',
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(8),
    borderRadius: normalize(20),
    ...SHADOWS.sm,
  },
  filterPillActive: {
    backgroundColor: '#F99E3C',
  },
  filterPillText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  filterPillActiveText: {
    color: '#fff',
  },
  filterDot: {
    width: normalize(6),
    height: normalize(6),
    borderRadius: normalize(3),
    backgroundColor: '#fff',
  },

  /* ── Notification Card ──────────────────────────────────────── */
  notifCard: {
    borderRadius: normalize(14),
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  notifCardUnread: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F99E3C' + '30',
    ...SHADOWS.md,
  },
  notifCardRead: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  unreadStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: normalize(4),
    borderTopLeftRadius: normalize(14),
    borderBottomLeftRadius: normalize(14),
  },
  notifRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  notifIconWrap: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  notifTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
    marginRight: SPACING.sm,
  },
  notifTitleUnread: {
    color: '#1E293B',
    fontWeight: '700',
  },
  notifTime: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    color: '#94A3B8',
    fontWeight: '500',
  },
  notifMessage: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#64748B',
    lineHeight: normalize(19),
    marginBottom: normalize(6),
  },
  deleteBtn: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(14),
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },

  /* ── Badge Row ──────────────────────────────────────────────── */
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(4),
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(3),
    borderRadius: normalize(10),
  },
  infoBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    fontWeight: '700',
  },

  /* ── Action Buttons ─────────────────────────────────────────── */
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(6),
    paddingVertical: normalize(10),
    borderRadius: normalize(10),
  },
  actionBtnPrimary: {
    backgroundColor: '#191919',
  },
  actionBtnPrimaryText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#fff',
    fontWeight: '600',
  },
  actionBtnOutline: {
    backgroundColor: '#232323',
    borderWidth: 1,
    borderColor: '#343434',
  },
  actionBtnOutlineText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#F99E3C',
    fontWeight: '600',
  },

  /* ── Response Button (for feedback) ─────────────────────────── */
  responseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: 2,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  responseButtonText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#7B61FF',
    fontWeight: '600',
  },

  /* ── Empty State ────────────────────────────────────────────── */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyIconWrap: {
    width: normalize(80),
    height: normalize(80),
    borderRadius: normalize(40),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    lineHeight: 20,
  },

  /* ── Load More ──────────────────────────────────────────────── */
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.md,
  },
  loadMoreText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#F99E3C',
    fontWeight: '600',
  },

  /* ── Modal ──────────────────────────────────────────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? normalize(40) : SPACING.xl,
    maxHeight: '80%',
  },
  modalHandle: {
    width: normalize(40),
    height: normalize(4),
    borderRadius: normalize(2),
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  modalIconWrap: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: '#1E293B',
    fontWeight: '700',
  },
  modalSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: '#94A3B8',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  modalCloseBtn: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Modal feedback info ────────────────────────────────────── */
  modalFeedbackInfo: {
    backgroundColor: '#F8FAFC',
    borderRadius: normalize(12),
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  modalFeedbackLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalFeedbackSubject: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#475569',
    lineHeight: 20,
  },

  /* ── Modal response ─────────────────────────────────────────── */
  modalResponseWrap: {
    backgroundColor: '#7B61FF' + '08',
    borderRadius: normalize(12),
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: '#7B61FF',
  },
  modalResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(6),
    marginBottom: SPACING.sm,
  },
  modalResponseDot: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    backgroundColor: '#7B61FF',
  },
  modalResponseLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: '#7B61FF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  modalResponseDate: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    color: '#94A3B8',
  },
  modalResponseText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#1E293B',
    lineHeight: 22,
  },

  /* ── Modal status ───────────────────────────────────────────── */
  modalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  modalStatusLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#64748B',
    fontWeight: '500',
  },
  modalStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  modalStatusText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },

  /* ── Modal Done Button ──────────────────────────────────────── */
  modalDoneBtn: {
    backgroundColor: '#F99E3C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#fff',
    fontWeight: '700',
  },
});

export default NotificationsScreen;
