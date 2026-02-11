import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ImageBackground,
  Platform,
  StatusBar,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  IndianRupee,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Building2,
  Smartphone,
  Inbox,
  ChevronRight,
  AlertCircle,
  CreditCard,
  Wallet,
  Send,
  X,
  Check,
  FileText,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { withdrawalApi } from '@utils/apiClient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 200 : 220;

/* ── helpers ──────────────────────────────────────────── */
const formatCurrency = (n: number): string => {
  if (!n) return '₹0';
  return `₹${n.toLocaleString('en-IN')}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('en', { month: 'short' });
  const year = date.getFullYear();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${day} ${month} ${year}, ${time}`;
};

const getTimeAgo = (dateString: string): string => {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
};

/* ── component ────────────────────────────────────────── */
const AdminPendingPaymentsScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved'>('pending');

  /* ── data fetch ─────────────────────────────────────── */
  const loadWithdrawals = useCallback(async () => {
    try {
      setLoading(true);
      const response =
        filter === 'pending'
          ? await withdrawalApi.getPendingWithdrawals()
          : await withdrawalApi.getApprovedWithdrawals();
      if (response.success && response.data) {
        setWithdrawals(response.data.withdrawals || []);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWithdrawals();
    setRefreshing(false);
  };

  /* ── actions ────────────────────────────────────────── */
  const handleApprove = async () => {
    if (!selectedWithdrawal) return;
    Alert.alert(
      'Approve Withdrawal',
      `Approve ₹${selectedWithdrawal.amount?.toLocaleString('en-IN')} for ${selectedWithdrawal.userId?.name || 'User'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setProcessing(true);
              const response = await withdrawalApi.approveWithdrawal(selectedWithdrawal.withdrawalId);
              if (response.success) {
                Alert.alert('Success', 'Withdrawal approved. Please process the payment and mark as completed.');
                setShowApproveModal(false);
                setSelectedWithdrawal(null);
                loadWithdrawals();
              } else {
                Alert.alert('Error', response.error || 'Failed to approve');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve');
            } finally {
              setProcessing(false);
            }
          },
        },
      ],
    );
  };

  const handleComplete = async () => {
    if (!selectedWithdrawal || !transactionId.trim()) {
      Alert.alert('Error', 'Please enter transaction ID');
      return;
    }
    try {
      setProcessing(true);
      const response = await withdrawalApi.completeWithdrawal(selectedWithdrawal.withdrawalId, {
        transactionId: transactionId.trim(),
      });
      if (response.success) {
        Alert.alert('Success', 'Withdrawal marked as completed');
        setShowCompleteModal(false);
        setSelectedWithdrawal(null);
        setTransactionId('');
        loadWithdrawals();
      } else {
        Alert.alert('Error', response.error || 'Failed to complete');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectionReason.trim()) {
      Alert.alert('Error', 'Please enter rejection reason');
      return;
    }
    try {
      setProcessing(true);
      const response = await withdrawalApi.rejectWithdrawal(selectedWithdrawal.withdrawalId, rejectionReason.trim());
      if (response.success) {
        Alert.alert('Success', 'Withdrawal rejected');
        setShowRejectModal(false);
        setSelectedWithdrawal(null);
        setRejectionReason('');
        loadWithdrawals();
      } else {
        Alert.alert('Error', response.error || 'Failed to reject');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject');
    } finally {
      setProcessing(false);
    }
  };

  /* ── derived ────────────────────────────────────────── */
  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length;
  const approvedCount = withdrawals.filter((w) => w.status === 'approved').length;
  const totalAmount = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

  /* ── tab config ─────────────────────────────────────── */
  const tabs = [
    { key: 'pending' as const, label: 'Pending', icon: Clock, color: '#F59E0B' },
    { key: 'approved' as const, label: 'Approved', icon: CheckCircle, color: '#10B981' },
  ];

  /* ── render card ────────────────────────────────────── */
  const renderWithdrawalCard = (withdrawal: any) => {
    const isPending = withdrawal.status === 'pending';
    const isApproved = withdrawal.status === 'approved';
    const isBank = withdrawal.paymentMethod === 'bank';

    return (
      <View key={withdrawal.withdrawalId} style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.avatarCircle, { backgroundColor: isPending ? '#F59E0B18' : '#10B98118' }]}>
              <User size={18} color={isPending ? '#F59E0B' : '#10B981'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{withdrawal.userId?.name || 'Unknown User'}</Text>
              <Text style={styles.userId}>ID: {withdrawal.userId?.userId || withdrawal.userId}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isPending ? '#FEF3C7' : '#D1FAE5' }]}>
            {isPending ? <Clock size={11} color="#B45309" /> : <CheckCircle size={11} color="#059669" />}
            <Text style={[styles.statusText, { color: isPending ? '#B45309' : '#059669' }]}>
              {isPending ? 'Pending' : 'Approved'}
            </Text>
          </View>
        </View>

        {/* Amount Strip */}
        <View style={styles.amountStrip}>
          <View style={styles.amountLeft}>
            <Text style={styles.amountLabel}>Withdrawal Amount</Text>
            <Text style={styles.amountValue}>{formatCurrency(withdrawal.amount)}</Text>
          </View>
          <View style={[styles.methodBadge, { backgroundColor: isBank ? '#EFF6FF' : '#F5F3FF' }]}>
            {isBank ? <Building2 size={14} color="#3B82F6" /> : <Smartphone size={14} color="#8B5CF6" />}
            <Text style={[styles.methodText, { color: isBank ? '#3B82F6' : '#8B5CF6' }]}>
              {isBank ? 'Bank' : 'UPI'}
            </Text>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.paymentDetails}>
          {isBank && withdrawal.bankAccount ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account Holder</Text>
                <Text style={styles.detailValue}>{withdrawal.bankAccount.accountHolderName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account No.</Text>
                <Text style={styles.detailValue}>{withdrawal.bankAccount.accountNumber}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>IFSC Code</Text>
                <Text style={styles.detailValue}>{withdrawal.bankAccount.ifscCode}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bank</Text>
                <Text style={styles.detailValue}>{withdrawal.bankAccount.bankName}</Text>
              </View>
            </>
          ) : (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>UPI ID</Text>
              <Text style={styles.detailValue}>{withdrawal.upiId || 'N/A'}</Text>
            </View>
          )}
          {withdrawal.userId?.phone && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{withdrawal.userId.phone}</Text>
            </View>
          )}
        </View>

        {/* Time */}
        <View style={styles.timeRow}>
          <Clock size={13} color="#94A3B8" />
          <Text style={styles.timeText}>{formatDate(withdrawal.requestedAt)}</Text>
          <Text style={styles.timeAgo}>{getTimeAgo(withdrawal.requestedAt)}</Text>
        </View>

        {/* Actions */}
        {isPending && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.approveBtn}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedWithdrawal(withdrawal);
                setShowApproveModal(true);
              }}
            >
              <Check size={15} color="#fff" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectBtn}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedWithdrawal(withdrawal);
                setShowRejectModal(true);
              }}
            >
              <X size={15} color="#EF4444" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
        {isApproved && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.completeBtn}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedWithdrawal(withdrawal);
                setShowCompleteModal(true);
              }}
            >
              <Send size={15} color="#fff" />
              <Text style={styles.completeBtnText}>Mark as Completed</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  /* ── render modal ───────────────────────────────────── */
  const renderModal = (
    visible: boolean,
    title: string,
    icon: React.ReactNode,
    color: string,
    onClose: () => void,
    children: React.ReactNode,
  ) => (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconWrap, { backgroundColor: color + '15' }]}>{icon}</View>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Selected withdrawal info */}
          {selectedWithdrawal && (
            <View style={styles.modalInfoStrip}>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>User</Text>
                <Text style={styles.modalInfoValue}>{selectedWithdrawal.userId?.name || 'Unknown'}</Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Amount</Text>
                <Text style={[styles.modalInfoValue, { color: COLORS.primary, fontWeight: '800' }]}>
                  {formatCurrency(selectedWithdrawal.amount)}
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Method</Text>
                <Text style={styles.modalInfoValue}>
                  {selectedWithdrawal.paymentMethod === 'bank' ? 'Bank Transfer' : 'UPI'}
                </Text>
              </View>
            </View>
          )}

          {children}
        </View>
      </View>
    </Modal>
  );

  /* ── main render ────────────────────────────────────── */
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Hero Header ──────────────────────────── */}
        <ImageBackground
          source={require('../../../assets/withdrraw.png')}
          style={styles.heroImage}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay} />
          <BlurView intensity={20} tint="dark" style={styles.heroBlur}>
            <View style={styles.heroTopRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                <BlurView intensity={30} tint="dark" style={styles.backBtnBlur}>
                  <ArrowLeft size={20} color="#fff" />
                </BlurView>
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={styles.heroTitle}>Withdrawal & Payments</Text>
                <Text style={styles.heroSub}>Manage payout requests</Text>
              </View>
            </View>
          </BlurView>
        </ImageBackground>

        {/* ── Floating Stats Strip ─────────────────── */}
        <View style={styles.statsStrip}>
          {[
            { label: 'Requests', value: withdrawals.length.toString(), icon: FileText, color: '#4A90D9' },
            { label: 'Total Amt', value: formatCurrency(totalAmount), icon: IndianRupee, color: '#10B981' },
            { label: filter === 'pending' ? 'Pending' : 'Approved', value: withdrawals.length.toString(), icon: filter === 'pending' ? Clock : CheckCircle, color: filter === 'pending' ? '#F59E0B' : '#10B981' },
            { label: 'Method', value: 'Bank/UPI', icon: CreditCard, color: '#8B5CF6' },
          ].map((s, i) => (
            <View key={i} style={styles.statsItem}>
              <View style={[styles.statsIcon, { backgroundColor: s.color + '18' }]}>
                <s.icon size={16} color={s.color} />
              </View>
              <Text style={styles.statsValue} numberOfLines={1}>
                {s.value}
              </Text>
              <Text style={styles.statsLabel} numberOfLines={1}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Filter Tabs ──────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {tabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabPill, active && { backgroundColor: tab.color, borderColor: tab.color }]}
                onPress={() => setFilter(tab.key)}
                activeOpacity={0.7}
              >
                <tab.icon size={15} color={active ? '#fff' : '#64748B'} />
                <Text style={[styles.tabPillText, active && { color: '#fff' }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Content ──────────────────────────────── */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading withdrawals...</Text>
            </View>
          ) : withdrawals.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Inbox size={40} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'pending' ? 'No Pending Withdrawals' : 'No Approved Withdrawals'}
              </Text>
              <Text style={styles.emptySub}>
                {filter === 'pending'
                  ? 'All withdrawal requests have been processed'
                  : 'No withdrawals awaiting completion'}
              </Text>
            </View>
          ) : (
            withdrawals.map(renderWithdrawalCard)
          )}
        </View>
      </ScrollView>

      {/* ── Approve Modal ──────────────────────────── */}
      {renderModal(
        showApproveModal,
        'Approve Withdrawal',
        <CheckCircle size={20} color="#10B981" />,
        '#10B981',
        () => {
          setShowApproveModal(false);
          setSelectedWithdrawal(null);
        },
        <View style={styles.modalActions}>
          <Text style={styles.modalNote}>
            This will approve the withdrawal request. You will need to process the payment manually and mark it as
            completed afterwards.
          </Text>
          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setShowApproveModal(false);
                setSelectedWithdrawal(null);
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, { backgroundColor: '#10B981' }]}
              onPress={handleApprove}
              disabled={processing}
              activeOpacity={0.7}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={16} color="#fff" />
                  <Text style={styles.modalConfirmText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>,
      )}

      {/* ── Complete Modal ─────────────────────────── */}
      {renderModal(
        showCompleteModal,
        'Complete Withdrawal',
        <Send size={20} color="#3B82F6" />,
        '#3B82F6',
        () => {
          setShowCompleteModal(false);
          setSelectedWithdrawal(null);
          setTransactionId('');
        },
        <View style={styles.modalActions}>
          <Text style={styles.inputLabel}>Transaction ID *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter bank/UPI transaction ID"
            value={transactionId}
            onChangeText={setTransactionId}
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
          />
          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setShowCompleteModal(false);
                setSelectedWithdrawal(null);
                setTransactionId('');
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, { backgroundColor: '#3B82F6', opacity: !transactionId.trim() ? 0.5 : 1 }]}
              onPress={handleComplete}
              disabled={processing || !transactionId.trim()}
              activeOpacity={0.7}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Send size={16} color="#fff" />
                  <Text style={styles.modalConfirmText}>Complete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>,
      )}

      {/* ── Reject Modal ──────────────────────────── */}
      {renderModal(
        showRejectModal,
        'Reject Withdrawal',
        <XCircle size={20} color="#EF4444" />,
        '#EF4444',
        () => {
          setShowRejectModal(false);
          setSelectedWithdrawal(null);
          setRejectionReason('');
        },
        <View style={styles.modalActions}>
          <Text style={styles.inputLabel}>Rejection Reason *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Explain why this withdrawal is being rejected..."
            value={rejectionReason}
            onChangeText={setRejectionReason}
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setShowRejectModal(false);
                setSelectedWithdrawal(null);
                setRejectionReason('');
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, { backgroundColor: '#EF4444', opacity: !rejectionReason.trim() ? 0.5 : 1 }]}
              onPress={handleReject}
              disabled={processing || !rejectionReason.trim()}
              activeOpacity={0.7}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <XCircle size={16} color="#fff" />
                  <Text style={styles.modalConfirmText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>,
      )}
    </View>
  );
};

/* ── styles ───────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  /* ── Hero ─────────── */
  heroImage: {
    width: '100%',
    height: HEADER_HEIGHT,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 52, 96, 0.50)',
  },
  heroBlur: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 54,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backBtnBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroTitle: {
    fontFamily: FONTS.regular,
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  heroSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  /* ── Stats Strip ──── */
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: -SPACING.md,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: SPACING.sm,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statsItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statsIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsValue: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  statsLabel: {
    fontFamily: FONTS.regular,
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* ── Tabs ─────────── */
  tabRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },

  /* ── Content ──────── */
  content: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },

  /* ── Card ─────────── */
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  userId: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '700',
  },

  /* ── Amount Strip ─── */
  amountStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  amountLeft: {
    gap: 2,
  },
  amountLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  amountValue: {
    fontFamily: FONTS.regular,
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  methodText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: '700',
  },

  /* ── Payment Details ─ */
  paymentDetails: {
    gap: 2,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  detailLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  detailValue: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },

  /* ── Time Row ──────── */
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timeText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#94A3B8',
    flex: 1,
  },
  timeAgo: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  /* ── Actions ──────── */
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
  },
  approveBtnText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectBtnText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  completeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 10,
  },
  completeBtnText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  /* ── Empty / Loading ─ */
  loadingWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#94A3B8',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: FONTS.regular,
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptySub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 260,
  },

  /* ── Modal ────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: FONTS.regular,
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInfoStrip: {
    backgroundColor: '#F8FAFC',
    padding: SPACING.md,
    gap: 6,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalInfoLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  modalInfoValue: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  modalActions: {
    padding: SPACING.md,
    gap: 12,
  },
  modalNote: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  inputLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modalConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalConfirmText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

export default AdminPendingPaymentsScreen;
