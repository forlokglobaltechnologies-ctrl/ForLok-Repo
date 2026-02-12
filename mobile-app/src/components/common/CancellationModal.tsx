import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  X,
  AlertTriangle,
  Clock,
  Wallet,
  Info,
  ChevronRight,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { normalize } from '@utils/responsive';
import { refundApi, bookingsApi } from '@utils/apiClient';

interface CancellationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  bookingId: string;
  isDriver?: boolean;
}

interface RefundCalculation {
  originalAmount: number;
  refundAmount: number;
  cancellationFee: number;
  refundPercentage: number;
  hoursBeforeTrip: number;
  refundMethod: string;
  feeDistribution?: {
    driverCompensation: number;
    platformFee: number;
  };
}

const CANCELLATION_REASONS = [
  { id: 'change_plans', label: 'Change of plans' },
  { id: 'found_alternative', label: 'Found alternative transport' },
  { id: 'emergency', label: 'Personal emergency' },
  { id: 'schedule_conflict', label: 'Schedule conflict' },
  { id: 'weather', label: 'Weather conditions' },
  { id: 'safety', label: 'Safety concerns' },
  { id: 'other', label: 'Other reason' },
];

const CancellationModal: React.FC<CancellationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  bookingId,
  isDriver = false,
}) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRefund, setLoadingRefund] = useState(true);
  const [refundInfo, setRefundInfo] = useState<RefundCalculation | null>(null);

  useEffect(() => {
    const fetchRefundInfo = async () => {
      if (!visible || !bookingId) return;
      
      setLoadingRefund(true);
      try {
        const response = await refundApi.calculateRefund(bookingId);
        if (response.success && response.data) {
          setRefundInfo(response.data);
        }
      } catch (error) {
        console.error('Error fetching refund info:', error);
      } finally {
        setLoadingRefund(false);
      }
    };

    fetchRefundInfo();
  }, [visible, bookingId]);

  const handleReset = () => {
    setSelectedReason(null);
    setCustomReason('');
    setRefundInfo(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleConfirm = () => {
    if (!selectedReason) {
      Alert.alert('Reason Required', 'Please select a reason for cancellation');
      return;
    }

    const reason = selectedReason === 'other' ? customReason : 
      CANCELLATION_REASONS.find(r => r.id === selectedReason)?.label || '';

    if (selectedReason === 'other' && !customReason.trim()) {
      Alert.alert('Reason Required', 'Please enter your reason for cancellation');
      return;
    }

    Alert.alert(
      'Confirm Cancellation',
      `Are you sure you want to cancel this booking?${refundInfo && refundInfo.cancellationFee > 0 ? 
        `\n\nCancellation fee: ₹${refundInfo.cancellationFee}` : ''}`,
      [
        { text: 'No, Keep Booking', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => {
            handleReset();
            onConfirm(reason);
          }
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Cancel Booking</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Warning Banner */}
            <View style={styles.warningBanner}>
              <AlertTriangle size={24} color={COLORS.warning} />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Cancellation Policy</Text>
                <Text style={styles.warningText}>
                  {isDriver 
                    ? 'Frequent cancellations may affect your rating and earnings.'
                    : 'Cancellation fees may apply based on timing.'}
                </Text>
              </View>
            </View>

            {/* Refund Information */}
            {loadingRefund ? (
              <View style={styles.loadingRefund}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.loadingText}>Calculating refund...</Text>
              </View>
            ) : refundInfo && (
              <View style={styles.refundSection}>
                <Text style={styles.sectionTitle}>Refund Details</Text>
                
                <View style={styles.refundCard}>
                  <View style={styles.refundRow}>
                    <View style={styles.refundIcon}>
                      <Clock size={16} color={COLORS.textSecondary} />
                    </View>
                    <Text style={styles.refundLabel}>Time before trip</Text>
                    <Text style={styles.refundValue}>
                      {refundInfo.hoursBeforeTrip.toFixed(1)} hours
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.refundRow}>
                    <View style={styles.refundIcon}>
                      <Wallet size={16} color={COLORS.textSecondary} />
                    </View>
                    <Text style={styles.refundLabel}>Booking Amount</Text>
                    <Text style={styles.refundValue}>
                      {formatCurrency(refundInfo.originalAmount)}
                    </Text>
                  </View>

                  <View style={styles.refundRow}>
                    <View style={[styles.refundIcon, { backgroundColor: COLORS.error + '15' }]}>
                      <AlertTriangle size={16} color={COLORS.error} />
                    </View>
                    <Text style={styles.refundLabel}>Cancellation Fee</Text>
                    <Text style={[styles.refundValue, styles.feeText]}>
                      -{formatCurrency(refundInfo.cancellationFee)}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.refundRow}>
                    <View style={[styles.refundIcon, { backgroundColor: COLORS.success + '15' }]}>
                      <Wallet size={16} color={COLORS.success} />
                    </View>
                    <Text style={[styles.refundLabel, styles.refundTotalLabel]}>
                      Refund Amount
                    </Text>
                    <Text style={[styles.refundValue, styles.refundTotalValue]}>
                      {formatCurrency(refundInfo.refundAmount)}
                    </Text>
                  </View>

                  <View style={styles.refundPercentage}>
                    <Info size={14} color={COLORS.primary} />
                    <Text style={styles.refundPercentageText}>
                      {refundInfo.refundPercentage}% refund • 
                      {refundInfo.refundMethod === 'wallet' ? ' Credited to wallet' : 
                       refundInfo.refundMethod === 'razorpay' ? ' Credited to original payment method' :
                       ' Deducted from wallet'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Reason Selection */}
            <View style={styles.reasonSection}>
              <Text style={styles.sectionTitle}>Select Reason</Text>
              {CANCELLATION_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonOption,
                    selectedReason === reason.id && styles.reasonOptionSelected,
                  ]}
                  onPress={() => setSelectedReason(reason.id)}
                >
                  <View style={[
                    styles.radioButton,
                    selectedReason === reason.id && styles.radioButtonSelected,
                  ]}>
                    {selectedReason === reason.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <Text style={[
                    styles.reasonText,
                    selectedReason === reason.id && styles.reasonTextSelected,
                  ]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {selectedReason === 'other' && (
                <TextInput
                  style={styles.customReasonInput}
                  placeholder="Please specify your reason..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={200}
                />
              )}
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.keepButton} onPress={handleClose}>
              <Text style={styles.keepButtonText}>Keep Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                !selectedReason && styles.cancelButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={loading || !selectedReason}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel Booking</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    padding: SPACING.md,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.warning + '15',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  warningContent: { flex: 1 },
  warningTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  warningText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  loadingRefund: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  refundSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  refundCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  refundIcon: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(14),
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  refundLabel: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  refundValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  feeText: {
    color: COLORS.error,
  },
  refundTotalLabel: {
    fontWeight: '600',
    color: COLORS.text,
  },
  refundTotalValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  refundPercentage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  refundPercentageText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
  },
  reasonSection: {
    marginBottom: SPACING.md,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  reasonOptionSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  radioButton: {
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: normalize(10),
    height: normalize(10),
    borderRadius: normalize(5),
    backgroundColor: COLORS.primary,
  },
  reasonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  reasonTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    minHeight: normalize(80),
    marginTop: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  keepButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  keepButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  cancelButtonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  cancelButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default CancellationModal;
