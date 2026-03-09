import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { ArrowLeft, CheckCircle, Clock, Send, User, XCircle } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { adminWithdrawalApi } from '@utils/apiClient';
import { AppLoader } from '@components/common/AppLoader';

const AdminWithdrawalsScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        adminWithdrawalApi.getPending({ limit: 50 }),
        adminWithdrawalApi.getApproved({ limit: 50 }),
      ]);

      if (pendingRes.success && pendingRes.data) {
        setPending(pendingRes.data.withdrawals || []);
      } else {
        setPending([]);
      }
      if (approvedRes.success && approvedRes.data) {
        setApproved(approvedRes.data.withdrawals || []);
      } else {
        setApproved([]);
      }
    } catch (error) {
      console.error('Error loading withdrawals:', error);
      Alert.alert('Error', 'Failed to load withdrawals.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleApprove = async (withdrawalId: string) => {
    try {
      setProcessingId(withdrawalId);
      const response = await adminWithdrawalApi.approve(withdrawalId);
      if (response.success) {
        Alert.alert('Approved', 'Withdrawal approved. Mark it as sent after transfer.');
        await loadData();
      } else {
        Alert.alert('Failed', response.error || 'Unable to approve withdrawal.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Unable to approve withdrawal.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (withdrawalId: string) => {
    try {
      setProcessingId(withdrawalId);
      const response = await adminWithdrawalApi.reject(withdrawalId, 'Rejected by admin');
      if (response.success) {
        Alert.alert('Rejected', 'Withdrawal request rejected.');
        await loadData();
      } else {
        Alert.alert('Failed', response.error || 'Unable to reject withdrawal.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Unable to reject withdrawal.');
    } finally {
      setProcessingId(null);
    }
  };

  const openCompleteModal = (withdrawalId: string) => {
    setSelectedWithdrawalId(withdrawalId);
    setTransactionId('');
    setNotes('');
    setShowCompleteModal(true);
  };

  const handleComplete = async () => {
    if (!selectedWithdrawalId || !transactionId.trim()) {
      Alert.alert('Transaction ID Required', 'Enter transfer reference / transaction ID.');
      return;
    }
    try {
      setProcessingId(selectedWithdrawalId);
      const response = await adminWithdrawalApi.complete(selectedWithdrawalId, {
        transactionId: transactionId.trim(),
        notes: notes.trim() || undefined,
      });
      if (response.success) {
        Alert.alert('Marked as Sent', 'Withdrawal completed and wallet has been debited.');
        setShowCompleteModal(false);
        await loadData();
      } else {
        Alert.alert('Failed', response.error || 'Unable to complete withdrawal.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Unable to complete withdrawal.');
    } finally {
      setProcessingId(null);
    }
  };

  const list = activeTab === 'pending' ? pending : approved;

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <AppLoader size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Withdrawals</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Clock size={15} color={activeTab === 'pending' ? '#fff' : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({pending.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'approved' && styles.tabBtnActive]}
          onPress={() => setActiveTab('approved')}
        >
          <CheckCircle size={15} color={activeTab === 'approved' ? '#fff' : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'approved' && styles.tabTextActive]}>
            Approved ({approved.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {list.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No {activeTab} withdrawal requests.</Text>
          </View>
        ) : (
          list.map((item) => (
            <View style={styles.card} key={item.withdrawalId}>
              <View style={styles.rowBetween}>
                <Text style={styles.withdrawalId}>{item.withdrawalId}</Text>
                <Text style={styles.amount}>Rs {item.amount}</Text>
              </View>

              <View style={styles.metaRow}>
                <User size={14} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>
                  {item.user?.name || 'Driver'} · {item.user?.phone || 'N/A'}
                </Text>
              </View>
              <Text style={styles.metaText}>
                Method: {String(item.paymentMethod || '').toUpperCase()} · Requested:{' '}
                {new Date(item.requestedAt).toLocaleString('en-IN')}
              </Text>

              {Array.isArray(item.earningReferences) && item.earningReferences.length > 0 && (
                <View style={styles.rideBox}>
                  <Text style={styles.rideTitle}>Ride earnings linked</Text>
                  {item.earningReferences.slice(0, 3).map((ref: any, idx: number) => (
                    <Text key={`${item.withdrawalId}-ref-${idx}`} style={styles.rideText}>
                      • {ref.bookingId || 'N/A'} · Rs {ref.amount}
                    </Text>
                  ))}
                </View>
              )}

              {activeTab === 'pending' ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleReject(item.withdrawalId)}
                    disabled={processingId === item.withdrawalId}
                  >
                    <XCircle size={15} color="#fff" />
                    <Text style={styles.actionText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleApprove(item.withdrawalId)}
                    disabled={processingId === item.withdrawalId}
                  >
                    <CheckCircle size={15} color="#fff" />
                    <Text style={styles.actionText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.completeBtn]}
                  onPress={() => openCompleteModal(item.withdrawalId)}
                  disabled={processingId === item.withdrawalId}
                >
                  <Send size={15} color="#fff" />
                  <Text style={styles.actionText}>Mark Sent</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showCompleteModal} transparent animationType="slide" onRequestClose={() => setShowCompleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Complete Withdrawal</Text>
            <TextInput
              style={styles.input}
              value={transactionId}
              onChangeText={setTransactionId}
              placeholder="Transaction / UTR ID"
              placeholderTextColor={COLORS.textSecondary}
            />
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={COLORS.textSecondary}
              multiline
            />
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => setShowCompleteModal(false)}>
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.completeBtn]} onPress={handleComplete}>
                <Text style={styles.actionText}>Confirm Sent</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#fff',
  },
  headerTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.lg, color: COLORS.text, fontWeight: '700' },
  tabRow: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabText: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },
  emptyCard: { backgroundColor: '#fff', borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, ...SHADOWS.sm },
  emptyText: { fontFamily: FONTS.regular, color: COLORS.textSecondary },
  card: { backgroundColor: '#fff', borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  withdrawalId: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: FONTS.sizes.xs },
  amount: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, marginBottom: 2 },
  rideBox: { marginTop: 8, backgroundColor: '#F7F8FA', borderRadius: 8, padding: 8 },
  rideTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.text, fontWeight: '700', marginBottom: 4 },
  rideText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 10,
  },
  actionText: { fontFamily: FONTS.regular, color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.sm },
  approveBtn: { backgroundColor: '#0E9F6E' },
  rejectBtn: { backgroundColor: '#EF4444' },
  completeBtn: { backgroundColor: '#2563EB' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  modalTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.lg, color: COLORS.text, fontWeight: '700', marginBottom: SPACING.md },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  notesInput: { minHeight: 72, textAlignVertical: 'top' },
});

export default AdminWithdrawalsScreen;
