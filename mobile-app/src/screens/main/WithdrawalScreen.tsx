import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, IndianRupee, Building2, Smartphone, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import { Card } from '@components/common/Card';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { withdrawalApi, dashboardApi } from '@utils/apiClient';
import { LinearGradient } from 'expo-linear-gradient';

const WithdrawalScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { theme, isPinkMode } = useTheme();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [financialData, setFinancialData] = useState<any>(null);
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);

  // Form state
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'upi'>('bank');
  const [bankAccount, setBankAccount] = useState({
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    bankName: '',
  });
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    loadFinancialData();
    loadWithdrawalHistory();
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getFinancial();
      if (response.success && response.data) {
        setFinancialData(response.data);
      }
    } catch (error: any) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawalHistory = async () => {
    try {
      const response = await withdrawalApi.getMyWithdrawals({ limit: 10 });
      if (response.success && response.data) {
        setWithdrawalHistory(response.data.withdrawals || []);
      }
    } catch (error: any) {
      console.error('Error loading withdrawal history:', error);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!amount || parseFloat(amount) < 100) {
      Alert.alert('Error', 'Minimum withdrawal amount is ₹100');
      return;
    }

    const withdrawalAmount = parseFloat(amount);
    const availableBalance = financialData?.walletBalance || 0;

    if (withdrawalAmount > availableBalance) {
      Alert.alert('Error', `Insufficient wallet balance. Available: ₹${availableBalance}`);
      return;
    }

    if (paymentMethod === 'bank') {
      if (!bankAccount.accountNumber || !bankAccount.ifscCode || !bankAccount.accountHolderName || !bankAccount.bankName) {
        Alert.alert('Error', 'Please fill all bank account details');
        return;
      }
    } else {
      if (!upiId) {
        Alert.alert('Error', 'Please enter UPI ID');
        return;
      }
    }

    Alert.alert(
      'Confirm Withdrawal',
      `Are you sure you want to withdraw ₹${withdrawalAmount}?\n\nAdmin will process your request within 24-48 hours.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setSubmitting(true);
              const response = await withdrawalApi.createWithdrawal({
                amount: withdrawalAmount,
                paymentMethod,
                bankAccount: paymentMethod === 'bank' ? bankAccount : undefined,
                upiId: paymentMethod === 'upi' ? upiId : undefined,
              });

              if (response.success) {
                Alert.alert(
                  'Success',
                  'Withdrawal request submitted successfully. Admin will process it within 24-48 hours.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        navigation.goBack();
                      },
                    },
                  ]
                );
                // Reload data
                loadFinancialData();
                loadWithdrawalHistory();
              } else {
                Alert.alert('Error', response.error || 'Failed to submit withdrawal request');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to submit withdrawal request');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} color={COLORS.success} />;
      case 'approved':
        return <CheckCircle size={20} color={COLORS.primary} />;
      case 'rejected':
        return <XCircle size={20} color={COLORS.error} />;
      default:
        return <Clock size={20} color={COLORS.warning} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return COLORS.success;
      case 'approved':
        return COLORS.primary;
      case 'rejected':
        return COLORS.error;
      default:
        return COLORS.warning;
    }
  };

  const maxAmount = financialData?.walletBalance || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      {isPinkMode ? (
        <LinearGradient
          colors={theme.colors.pinkGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <ArrowLeft size={24} color={theme.colors.white} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.white }]}>Withdraw Money</Text>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
      ) : (
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={theme.colors.white} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.white }]}>Withdraw Money</Text>
          <View style={styles.placeholder} />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {/* Available Balance Card */}
            <Card style={[styles.balanceCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>Wallet Balance</Text>
              <View style={styles.balanceAmountContainer}>
                <IndianRupee size={32} color={theme.colors.success} />
                <Text style={[styles.balanceAmount, { color: theme.colors.success }]}>
                  {financialData?.walletBalance || 0}
                </Text>
              </View>
              <Text style={[styles.balanceSubtext, { color: theme.colors.textSecondary }]}>
                Available to withdraw
              </Text>
            </Card>

            {/* Withdrawal Form */}
            <Card style={[styles.formCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Withdrawal Details</Text>

              {/* Amount Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Amount (₹)</Text>
                <Input
                  placeholder="Enter amount (min ₹100)"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                  Maximum: ₹{maxAmount}
                </Text>
              </View>

              {/* Payment Method Selection */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Payment Method</Text>
                <View style={styles.paymentMethodContainer}>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodButton,
                      paymentMethod === 'bank' && {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary,
                      },
                      { borderColor: theme.colors.border },
                    ]}
                    onPress={() => setPaymentMethod('bank')}
                  >
                    <Building2
                      size={24}
                      color={paymentMethod === 'bank' ? theme.colors.white : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        { color: paymentMethod === 'bank' ? theme.colors.white : theme.colors.text },
                      ]}
                    >
                      Bank Transfer
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentMethodButton,
                      paymentMethod === 'upi' && {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary,
                      },
                      { borderColor: theme.colors.border },
                    ]}
                    onPress={() => setPaymentMethod('upi')}
                  >
                    <Smartphone
                      size={24}
                      color={paymentMethod === 'upi' ? theme.colors.white : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        { color: paymentMethod === 'upi' ? theme.colors.white : theme.colors.text },
                      ]}
                    >
                      UPI
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bank Account Details */}
              {paymentMethod === 'bank' && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Bank Account Details</Text>
                  <Input
                    placeholder="Account Number"
                    value={bankAccount.accountNumber}
                    onChangeText={(text) => setBankAccount({ ...bankAccount, accountNumber: text })}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                  <Input
                    placeholder="IFSC Code"
                    value={bankAccount.ifscCode}
                    onChangeText={(text) => setBankAccount({ ...bankAccount, ifscCode: text.toUpperCase() })}
                    style={styles.input}
                    autoCapitalize="characters"
                  />
                  <Input
                    placeholder="Account Holder Name"
                    value={bankAccount.accountHolderName}
                    onChangeText={(text) => setBankAccount({ ...bankAccount, accountHolderName: text })}
                    style={styles.input}
                    autoCapitalize="words"
                  />
                  <Input
                    placeholder="Bank Name"
                    value={bankAccount.bankName}
                    onChangeText={(text) => setBankAccount({ ...bankAccount, bankName: text })}
                    style={styles.input}
                    autoCapitalize="words"
                  />
                </View>
              )}

              {/* UPI Details */}
              {paymentMethod === 'upi' && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>UPI ID</Text>
                  <Input
                    placeholder="yourname@upi"
                    value={upiId}
                    onChangeText={setUpiId}
                    keyboardType="email-address"
                    style={styles.input}
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Submit Button */}
              <Button
                title={submitting ? 'Submitting...' : 'Submit Withdrawal Request'}
                onPress={handleSubmit}
                variant="primary"
                size="large"
                style={styles.submitButton}
                disabled={submitting || !amount || parseFloat(amount) < 100 || parseFloat(amount) > maxAmount}
              />
            </Card>

            {/* Withdrawal History */}
            {withdrawalHistory.length > 0 && (
              <Card style={[styles.historyCard, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Withdrawals</Text>
                {withdrawalHistory.map((withdrawal: any) => (
                  <View key={withdrawal.withdrawalId} style={styles.historyItem}>
                    <View style={styles.historyItemLeft}>
                      {getStatusIcon(withdrawal.status)}
                      <View style={styles.historyItemDetails}>
                        <Text style={[styles.historyAmount, { color: theme.colors.text }]}>
                          ₹{withdrawal.amount}
                        </Text>
                        <Text style={[styles.historyDate, { color: theme.colors.textSecondary }]}>
                          {new Date(withdrawal.requestedAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(withdrawal.status) + '20' },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: getStatusColor(withdrawal.status) }]}
                      >
                        {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerTitle: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
  },
  placeholder: {
    width: 24,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  balanceCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  balanceLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
  },
  balanceAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  balanceAmount: {
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
  },
  balanceSubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
  },
  formCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
  },
  input: {
    marginBottom: SPACING.xs,
  },
  hint: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    marginTop: SPACING.xs,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  paymentMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
  },
  paymentMethodText: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
  },
  submitButton: {
    marginTop: SPACING.md,
  },
  historyCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  historyItemDetails: {
    flex: 1,
  },
  historyAmount: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  historyDate: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
});

export default WithdrawalScreen;
