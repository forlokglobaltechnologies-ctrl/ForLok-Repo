import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Coins,
  Gift,
  Star,
  Car,
  Zap,
  TrendingUp,
  TrendingDown,
  IndianRupee,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { normalize } from '@utils/responsive';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { walletApi, coinApi, withdrawalApi } from '@utils/apiClient';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { AppLoader } from '@components/common/AppLoader';

const BLUE_TOP = '#51A7EA';
const BLUE_BOTTOM = '#0284C7';
const BLUE_ACCENT = '#0284C7';

interface Transaction {
  transactionId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference: string;
  bookingId?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

interface CoinTransaction {
  transactionId: string;
  type: 'earn' | 'redeem';
  amount: number;
  reason: string;
  description: string;
  createdAt: string;
}

interface WithdrawalItem {
  withdrawalId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  paymentMethod: 'bank' | 'upi';
  requestedAt: string;
  rejectedAt?: string;
  completedAt?: string;
  rejectionReason?: string;
}

const WalletScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [walletSummary, setWalletSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletConfig, setWalletConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'wallet' | 'coins'>(
    route.params?.tab === 'coins' ? 'coins' : 'wallet'
  );
  const [coinBalance, setCoinBalance] = useState<any>(null);
  const [coinTransactions, setCoinTransactions] = useState<CoinTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');

  const fetchWalletData = useCallback(async () => {
    try {
      const [summaryRes, transactionsRes, configRes, coinBalanceRes, coinTxRes, myWithdrawalsRes] = await Promise.all([
        walletApi.getSummary(),
        walletApi.getTransactions({ limit: 20 }),
        walletApi.getConfig(),
        coinApi.getBalance(),
        coinApi.getTransactions(),
        withdrawalApi.getMyWithdrawals({ limit: 10 }),
      ]);

      if (summaryRes.success && summaryRes.data) {
        setWalletSummary(summaryRes.data);
      }
      if (transactionsRes.success && transactionsRes.data) {
        setTransactions(transactionsRes.data.transactions || []);
      }
      if (configRes.success && configRes.data) {
        setWalletConfig(configRes.data);
      }
      if (coinBalanceRes.success && coinBalanceRes.data) {
        setCoinBalance(coinBalanceRes.data);
      }
      if (coinTxRes.success && coinTxRes.data) {
        setCoinTransactions(coinTxRes.data.transactions || []);
      }
      if (myWithdrawalsRes.success && myWithdrawalsRes.data) {
        setWithdrawals(myWithdrawalsRes.data.withdrawals || []);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  useEffect(() => {
    if (route.params?.openWithdrawal) {
      setActiveTab('wallet');
      setShowWithdrawalModal(true);
      navigation.setParams({ openWithdrawal: false });
    }
  }, [navigation, route.params?.openWithdrawal]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  // Get wallet balance - backend returns `balance` field directly
  const getBalance = () => {
    if (!walletSummary) return 0;
    return walletSummary.availableBalance ?? walletSummary.balance ?? 0;
  };

  const getTotalCredits = () => {
    if (walletSummary?.totalCredits != null) return walletSummary.totalCredits;
    // Calculate from recent transactions if not available
    const recentTx = walletSummary?.recentTransactions || [];
    return recentTx.filter((t: any) => t.type === 'credit').reduce((s: number, t: any) => s + (t.amount || 0), 0);
  };

  const getTotalDebits = () => {
    if (walletSummary?.totalDebits != null) return walletSummary.totalDebits;
    const recentTx = walletSummary?.recentTransactions || [];
    return recentTx.filter((t: any) => t.type === 'debit').reduce((s: number, t: any) => s + (t.amount || 0), 0);
  };

  const resetWithdrawalForm = () => {
    setWithdrawAmount('');
    setWithdrawMethod('upi');
    setUpiId('');
    setAccountNumber('');
    setIfscCode('');
    setAccountHolderName('');
    setBankName('');
  };

  const handleCreateWithdrawal = async () => {
    const amount = Number(withdrawAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }
    if (amount > getBalance()) {
      Alert.alert('Insufficient Balance', `Your available balance is ${formatCurrency(getBalance())}.`);
      return;
    }

    if (withdrawMethod === 'upi') {
      if (!upiId.trim()) {
        Alert.alert('UPI Required', 'Please enter your UPI ID.');
        return;
      }
    } else {
      if (!accountNumber.trim() || !ifscCode.trim() || !accountHolderName.trim() || !bankName.trim()) {
        Alert.alert('Bank Details Required', 'Please fill all bank account fields.');
        return;
      }
    }

    try {
      setWithdrawalLoading(true);
      const payload =
        withdrawMethod === 'upi'
          ? { amount, paymentMethod: 'upi' as const, upiId: upiId.trim() }
          : {
              amount,
              paymentMethod: 'bank' as const,
              bankAccount: {
                accountNumber: accountNumber.trim(),
                ifscCode: ifscCode.trim().toUpperCase(),
                accountHolderName: accountHolderName.trim(),
                bankName: bankName.trim(),
              },
            };

      const response = await withdrawalApi.create(payload);
      if (response.success) {
        Alert.alert('Request Sent', 'Withdrawal request submitted successfully.');
        setShowWithdrawalModal(false);
        resetWithdrawalForm();
        fetchWalletData();
      } else {
        Alert.alert('Request Failed', response.error || 'Could not submit withdrawal request.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to submit withdrawal request.');
    } finally {
      setWithdrawalLoading(false);
    }
  };

  // ── Loading State ──
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.simpleHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.simpleHeaderTitle, { color: theme.colors.text }]}>Wallet</Text>
          <View style={styles.navPlaceholder} />
        </View>
        <View style={styles.loadingWrap}>
          <AppLoader size="large" color={BLUE_ACCENT} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.simpleHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.simpleHeaderTitle, { color: theme.colors.text }]}>My Wallet</Text>
        <View style={styles.navPlaceholder} />
      </View>

      {/* ── Tab Bar ── */}
      <View style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wallet' && [styles.tabActive, { borderBottomColor: BLUE_ACCENT }]]}
          onPress={() => setActiveTab('wallet')}
        >
          <Wallet size={16} color={activeTab === 'wallet' ? BLUE_ACCENT : theme.colors.textSecondary} />
          <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'wallet' && { color: BLUE_ACCENT, fontWeight: '700' }]}>
            Wallet (₹)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'coins' && [styles.tabActive, { borderBottomColor: '#F5A623' }]]}
          onPress={() => setActiveTab('coins')}
        >
          <Coins size={16} color={activeTab === 'coins' ? '#F5A623' : theme.colors.textSecondary} />
          <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'coins' && { color: '#F5A623', fontWeight: '700' }]}>
            Coins{coinBalance ? ` (${coinBalance.balance})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'coins' ? (
        /* ════════ COINS TAB ════════ */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F5A623']} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Coin Balance Card */}
          <View style={[styles.coinBalanceCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.coinIconWrap}>
              <Coins size={30} color="#F5A623" />
            </View>
            <Text style={[styles.coinLabel, { color: theme.colors.textSecondary }]}>Your Coins</Text>
            <Text style={styles.coinAmount}>{coinBalance?.balance || 0}</Text>
            <View style={styles.coinWorthPill}>
              <IndianRupee size={12} color="#8B5E00" />
              <Text style={styles.coinWorthText}>Worth ₹{coinBalance?.worthInRupees || 0}</Text>
            </View>
            <View style={[styles.coinStatsRow, { borderTopColor: theme.colors.border }]}>
              <View style={styles.coinStatItem}>
                <Text style={styles.coinStatVal}>{coinBalance?.totalEarned || 0}</Text>
                <Text style={[styles.coinStatLbl, { color: theme.colors.textSecondary }]}>Earned</Text>
              </View>
              <View style={[styles.coinStatDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.coinStatItem}>
                <Text style={styles.coinStatVal}>{coinBalance?.totalRedeemed || 0}</Text>
                <Text style={[styles.coinStatLbl, { color: theme.colors.textSecondary }]}>Redeemed</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.coinActionBtn} onPress={() => navigation.navigate('EarnCoins' as never)} activeOpacity={0.8}>
              <Gift size={18} color="#FFF" />
              <Text style={styles.coinActionText}>Earn More</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.coinActionBtn, { backgroundColor: '#27AE60' }]} onPress={() => navigation.navigate('MainDashboard' as never)} activeOpacity={0.8}>
              <Car size={18} color="#FFF" />
              <Text style={styles.coinActionText}>Book a Ride</Text>
            </TouchableOpacity>
          </View>

          {/* How to Use */}
          <View style={[styles.howToCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.howToHeader}>
              <Zap size={18} color="#F5A623" />
              <Text style={[styles.howToTitle, { color: theme.colors.text }]}>How to Use Coins</Text>
            </View>
            {[
              'Book a ride from the Dashboard',
              'Toggle "Apply Coins" ON in trip summary',
              'Up to 50% off your fare!',
            ].map((step, idx) => (
              <View key={idx} style={styles.howToStep}>
                <View style={styles.howToNum}>
                  <Text style={styles.howToNumText}>{idx + 1}</Text>
                </View>
                <Text style={[styles.howToStepText, { color: theme.colors.text }]}>{step}</Text>
              </View>
            ))}
            <View style={[styles.howToNote, { backgroundColor: '#F5A623' + '12' }]}>
              <Info size={13} color="#8B5E00" />
              <Text style={styles.howToNoteText}>50 coins = ₹1 discount. Max 50% per ride.</Text>
            </View>
          </View>

          {/* Coin History */}
          <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Coin History</Text>
          {coinTransactions.length > 0 ? (
            <View style={[styles.txCard, { backgroundColor: theme.colors.surface }]}>
              {coinTransactions.map((tx, index) => (
                <View key={tx.transactionId}>
                  <View style={styles.txItem}>
                    <View style={[styles.txIcon, { backgroundColor: tx.type === 'earn' ? '#F5A623' + '15' : '#F44336' + '15' }]}>
                      {tx.type === 'earn' ? <Star size={18} color="#F5A623" /> : <ArrowUpRight size={18} color="#F44336" />}
                    </View>
                    <View style={styles.txDetails}>
                      <Text style={[styles.txDesc, { color: theme.colors.text }]} numberOfLines={2}>{tx.description}</Text>
                      <Text style={[styles.txDate, { color: theme.colors.textSecondary }]}>{formatDate(tx.createdAt)} · {formatTime(tx.createdAt)}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: tx.type === 'earn' ? '#F5A623' : '#F44336' }]}>
                      {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                    </Text>
                  </View>
                  {index < coinTransactions.length - 1 && <View style={[styles.txDivider, { backgroundColor: theme.colors.border }]} />}
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
              <Coins size={40} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No coin transactions yet</Text>
              <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>Complete rides and invite friends to earn coins!</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        /* ════════ WALLET TAB ════════ */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BLUE_ACCENT]} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Balance Card */}
          <LinearGradient
            colors={['#0F172B', '#0F172B']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.balanceCard}
          >
            {/* Decorative overlays for richer card background */}
            <View style={styles.balanceOverlayCircleLg} />
            <View style={styles.balanceOverlayCircleSm} />
            <View style={styles.balanceOverlayCurve} />
            <View style={styles.balanceTop}>
              <View style={styles.balanceIconWrap}>
                <Wallet size={24} color="#51A7EA" />
              </View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
            </View>
            <Text style={styles.balanceAmount}>{formatCurrency(getBalance())}</Text>
            {walletSummary?.lockedAmount > 0 && (
              <View style={styles.lockedRow}>
                <Info size={13} color="#51A7EA" />
                <Text style={styles.lockedText}>₹{walletSummary.lockedAmount.toLocaleString('en-IN')} locked for bookings</Text>
              </View>
            )}
            {/* Booking Status */}
            {walletSummary && (
              <View style={styles.bookingStatusRow}>
                <View style={[styles.bookingStatusPill, { backgroundColor: walletSummary.canBookRide ? 'rgba(81,167,234,0.22)' : 'rgba(245,197,66,0.22)' }]}>
                  {walletSummary.canBookRide ? <CheckCircle size={12} color="#7CC2F1" /> : <XCircle size={12} color="#F7D87A" />}
                  <Text style={[styles.bookingStatusText, { color: walletSummary.canBookRide ? '#9CD2F7' : '#F7D87A' }]}>
                    {walletSummary.canBookRide ? 'Can book rides' : `Min ₹${walletSummary.minimumRequired} to book`}
                  </Text>
                </View>
              </View>
            )}
          </LinearGradient>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.statIconWrap, { backgroundColor: '#4CAF50' + '12' }]}>
                <TrendingUp size={20} color="#4CAF50" />
              </View>
              <Text style={[styles.statCardLabel, { color: theme.colors.textSecondary }]}>Total In</Text>
              <Text style={[styles.statCardValue, { color: '#4CAF50' }]}>{formatCurrency(getTotalCredits())}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.statIconWrap, { backgroundColor: '#F44336' + '12' }]}>
                <TrendingDown size={20} color="#F44336" />
              </View>
              <Text style={[styles.statCardLabel, { color: theme.colors.textSecondary }]}>Total Out</Text>
              <Text style={[styles.statCardValue, { color: '#F44336' }]}>{formatCurrency(getTotalDebits())}</Text>
            </View>
          </View>

          <View style={styles.walletActionRow}>
            <TouchableOpacity
              style={styles.walletActionBtn}
              onPress={() => setShowWithdrawalModal(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[BLUE_TOP, BLUE_BOTTOM]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.walletActionBtnGradient}
              >
                <ArrowUpRight size={16} color="#FFF" />
                <Text style={styles.walletActionBtnText}>Request Withdrawal</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Info Banner */}
          {walletConfig?.minBalanceForOffline && (
            <View style={[styles.infoBanner, { backgroundColor: '#FF9800' + '10', borderColor: '#FF9800' + '30' }]}>
              <AlertCircle size={18} color="#FF9800" />
              <View style={styles.infoBannerContent}>
                <Text style={[styles.infoBannerTitle, { color: theme.colors.text }]}>Offline Booking</Text>
                <Text style={[styles.infoBannerText, { color: theme.colors.textSecondary }]}>
                  Maintain min ₹{walletConfig.minBalanceForOffline} to book with cash
                </Text>
              </View>
            </View>
          )}

          {/* Transactions */}
          <View style={styles.txSectionHeader}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: BLUE_ACCENT }]}>See All</Text>
            </TouchableOpacity>
          </View>

          {transactions.length > 0 ? (
            <View style={[styles.txCard, { backgroundColor: theme.colors.surface }]}>
              {transactions.map((tx, index) => (
                <View key={tx.transactionId}>
                  <View style={styles.txItem}>
                    <View style={[styles.txIcon, { backgroundColor: tx.type === 'credit' ? '#4CAF50' + '15' : '#F44336' + '15' }]}>
                      {tx.type === 'credit' ? <ArrowDownLeft size={18} color="#4CAF50" /> : <ArrowUpRight size={18} color="#F44336" />}
                    </View>
                    <View style={styles.txDetails}>
                      <Text style={[styles.txDesc, { color: theme.colors.text }]} numberOfLines={1}>{tx.description}</Text>
                      <View style={styles.txMetaRow}>
                        <Text style={[styles.txDate, { color: theme.colors.textSecondary }]}>{formatDate(tx.createdAt)}</Text>
                        {tx.status === 'completed' && <CheckCircle size={12} color="#4CAF50" />}
                        {tx.status === 'pending' && <Clock size={12} color="#FF9800" />}
                        {tx.status === 'failed' && <XCircle size={12} color="#F44336" />}
                      </View>
                    </View>
                    <Text style={[styles.txAmount, { color: tx.type === 'credit' ? '#4CAF50' : '#F44336' }]}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </Text>
                  </View>
                  {index < transactions.length - 1 && <View style={[styles.txDivider, { backgroundColor: theme.colors.border }]} />}
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
              <Clock size={40} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No transactions yet</Text>
              <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>Your transaction history will appear here</Text>
            </View>
          )}

          <View style={styles.txSectionHeader}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Withdrawal Requests</Text>
          </View>
          {withdrawals.length > 0 ? (
            <View style={[styles.txCard, { backgroundColor: theme.colors.surface }]}>
              {withdrawals.map((item, index) => {
                const statusColor =
                  item.status === 'completed'
                    ? '#4CAF50'
                    : item.status === 'rejected'
                    ? '#F44336'
                    : item.status === 'approved'
                    ? '#FF9800'
                    : '#3B82F6';
                return (
                  <View key={item.withdrawalId}>
                    <View style={styles.txItem}>
                      <View style={[styles.txIcon, { backgroundColor: statusColor + '20' }]}>
                        <ArrowUpRight size={16} color={statusColor} />
                      </View>
                      <View style={styles.txDetails}>
                        <Text style={[styles.txDesc, { color: theme.colors.text }]}>
                          {formatCurrency(item.amount)} via {item.paymentMethod.toUpperCase()}
                        </Text>
                        <Text style={[styles.txDate, { color: theme.colors.textSecondary }]}>
                          {formatDate(item.requestedAt)} · {item.status.toUpperCase()}
                        </Text>
                        {item.rejectionReason ? (
                          <Text style={[styles.txDate, { color: '#F44336' }]}>{item.rejectionReason}</Text>
                        ) : null}
                      </View>
                    </View>
                    {index < withdrawals.length - 1 && <View style={[styles.txDivider, { backgroundColor: theme.colors.border }]} />}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
              <ArrowUpRight size={40} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No withdrawals yet</Text>
              <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
                Create a withdrawal request to transfer wallet money to your bank or UPI.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={showWithdrawalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWithdrawalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Withdrawal Request</Text>
              <TouchableOpacity onPress={() => setShowWithdrawalModal(false)} style={styles.modalClose}>
                <XCircle size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Amount</Text>
            <View style={[styles.amountInputWrap, { borderColor: BLUE_ACCENT, backgroundColor: theme.colors.background }]}>
              <Text style={[styles.currencySymbol, { color: theme.colors.text }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.colors.text }]}
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.methodSwitchRow}>
              <TouchableOpacity
                style={[
                  styles.methodSwitchBtn,
                  { borderColor: theme.colors.border, backgroundColor: theme.colors.background },
                  withdrawMethod === 'upi' && { borderColor: BLUE_ACCENT, backgroundColor: '#0284C718' },
                ]}
                onPress={() => setWithdrawMethod('upi')}
              >
                <Text
                  style={[
                    styles.methodSwitchText,
                    { color: theme.colors.textSecondary },
                    withdrawMethod === 'upi' && { color: BLUE_ACCENT },
                  ]}
                >
                  UPI
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.methodSwitchBtn,
                  { borderColor: theme.colors.border, backgroundColor: theme.colors.background },
                  withdrawMethod === 'bank' && { borderColor: BLUE_ACCENT, backgroundColor: '#0284C718' },
                ]}
                onPress={() => setWithdrawMethod('bank')}
              >
                <Text
                  style={[
                    styles.methodSwitchText,
                    { color: theme.colors.textSecondary },
                    withdrawMethod === 'bank' && { color: BLUE_ACCENT },
                  ]}
                >
                  Bank
                </Text>
              </TouchableOpacity>
            </View>

            {withdrawMethod === 'upi' ? (
              <>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>UPI ID</Text>
                <TextInput
                  style={[styles.textField, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="example@upi"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                />
              </>
            ) : (
              <>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Account Holder Name</Text>
                <TextInput
                  style={[styles.textField, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  value={accountHolderName}
                  onChangeText={setAccountHolderName}
                  placeholder="Full name"
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Account Number</Text>
                <TextInput
                  style={[styles.textField, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="Bank account number"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="number-pad"
                />
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>IFSC Code</Text>
                <TextInput
                  style={[styles.textField, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  value={ifscCode}
                  onChangeText={setIfscCode}
                  placeholder="IFSC"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="characters"
                />
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Bank Name</Text>
                <TextInput
                  style={[styles.textField, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Bank name"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.confirmBtn, withdrawalLoading && { opacity: 0.7 }]}
              onPress={handleCreateWithdrawal}
              disabled={withdrawalLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[BLUE_TOP, BLUE_BOTTOM]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.confirmBtnGradient}
              >
                {withdrawalLoading ? (
                  <AppLoader color="#FFF" size="small" />
                ) : (
                  <>
                    <ArrowUpRight size={18} color="#FFF" />
                    <Text style={styles.confirmBtnText}>Submit Request</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ──
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  simpleHeaderTitle: { fontFamily: FONTS.regular, fontSize: normalize(18), fontWeight: '700' },
  navPlaceholder: { width: normalize(40) },

  // ── Loading ──
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.sm },
  loadingText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm },

  // ── Tab Bar ──
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 6, borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '500' },

  // ── Scroll ──
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },

  // ── Balance Card (Wallet Tab) ──
  balanceCard: {
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.md,
    overflow: 'hidden',
  },
  balanceOverlayCircleLg: {
    position: 'absolute',
    width: normalize(170),
    height: normalize(170),
    borderRadius: normalize(85),
    right: -normalize(55),
    top: -normalize(35),
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  balanceOverlayCircleSm: {
    position: 'absolute',
    width: normalize(90),
    height: normalize(90),
    borderRadius: normalize(45),
    left: -normalize(20),
    bottom: -normalize(20),
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  balanceOverlayCurve: {
    position: 'absolute',
    width: normalize(190),
    height: normalize(80),
    right: normalize(12),
    bottom: normalize(42),
    borderRadius: normalize(40),
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  balanceTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  balanceIconWrap: {
    width: normalize(44), height: normalize(44), borderRadius: normalize(22),
    backgroundColor: 'rgba(81,167,234,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  balanceLabel: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: '#F5D067' },
  balanceAmount: { fontFamily: FONTS.regular, fontSize: normalize(38), fontWeight: 'bold', color: '#F5D067', marginBottom: 4 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(5), marginBottom: SPACING.sm },
  lockedText: { fontFamily: FONTS.regular, fontSize: normalize(12), color: '#9BCBEE' },
  bookingStatusRow: { marginBottom: SPACING.md },
  bookingStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(5),
    paddingHorizontal: normalize(10), paddingVertical: normalize(5), borderRadius: BORDER_RADIUS.round, alignSelf: 'flex-start',
  },
  bookingStatusText: { fontFamily: FONTS.regular, fontSize: normalize(11), fontWeight: '600' },
  addMoneyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: normalize(11),
    borderRadius: BORDER_RADIUS.md, gap: 6,
  },
  addMoneyText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, color: '#FFF', fontWeight: '700' },

  // ── Stats Row ──
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: {
    flex: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm,
  },
  statIconWrap: {
    width: normalize(40), height: normalize(40), borderRadius: normalize(20), justifyContent: 'center', alignItems: 'center', marginBottom: normalize(6),
  },
  statCardLabel: { fontFamily: FONTS.regular, fontSize: normalize(11), marginBottom: 2 },
  statCardValue: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.lg, fontWeight: 'bold' },
  walletActionRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  walletActionBtn: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  walletActionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(6),
    paddingVertical: normalize(11),
  },
  walletActionBtnText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#FFF',
    fontWeight: '700',
  },

  // ── Info Banner ──
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, marginBottom: SPACING.md,
  },
  infoBannerContent: { flex: 1 },
  infoBannerTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  infoBannerText: { fontFamily: FONTS.regular, fontSize: 11, marginTop: 2 },

  // ── Transactions (shared) ──
  txSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm,
  },
  sectionLabel: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.lg, fontWeight: 'bold', marginBottom: SPACING.sm },
  seeAllText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  txCard: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.sm },
  txItem: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  txIcon: { width: normalize(40), height: normalize(40), borderRadius: normalize(20), justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  txDetails: { flex: 1 },
  txDesc: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: normalize(5), marginTop: 2 },
  txDate: { fontFamily: FONTS.regular, fontSize: normalize(11) },
  txAmount: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, fontWeight: 'bold', marginLeft: SPACING.xs },
  txDivider: { height: 1, marginHorizontal: SPACING.md },

  // ── Empty State ──
  emptyCard: {
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl, alignItems: 'center', ...SHADOWS.sm,
  },
  emptyTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, fontWeight: '600', marginTop: SPACING.sm },
  emptySub: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, marginTop: 4, textAlign: 'center' },

  // ── Coin Balance Card ──
  coinBalanceCard: {
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, alignItems: 'center',
    marginBottom: SPACING.md, ...SHADOWS.sm,
  },
  coinIconWrap: {
    width: normalize(56), height: normalize(56), borderRadius: normalize(28),
    backgroundColor: '#F5A623' + '18', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xs,
  },
  coinLabel: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm },
  coinAmount: { fontFamily: FONTS.regular, fontSize: normalize(44), fontWeight: 'bold', color: '#8B5E00' },
  coinWorthPill: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(3),
    backgroundColor: '#FFF8E7', paddingHorizontal: normalize(10), paddingVertical: normalize(4),
    borderRadius: BORDER_RADIUS.round, marginTop: 4, marginBottom: SPACING.md,
  },
  coinWorthText: { fontFamily: FONTS.regular, fontSize: 12, fontWeight: '600', color: '#8B5E00' },
  coinStatsRow: {
    flexDirection: 'row', width: '100%', paddingTop: SPACING.md, borderTopWidth: 1,
  },
  coinStatItem: { flex: 1, alignItems: 'center' },
  coinStatVal: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xl, fontWeight: 'bold', color: '#8B5E00' },
  coinStatLbl: { fontFamily: FONTS.regular, fontSize: normalize(11), marginTop: 2 },
  coinStatDivider: { width: 1, height: normalize(30), alignSelf: 'center' },

  // ── Coin Actions ──
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  coinActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5A623', paddingVertical: normalize(11), borderRadius: BORDER_RADIUS.md, gap: normalize(6),
  },
  coinActionText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: '#FFF', fontWeight: '700' },

  // ── How to Use ──
  howToCard: { borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
  howToHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  howToTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.lg, fontWeight: 'bold' },
  howToStep: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  howToNum: {
    width: normalize(24), height: normalize(24), borderRadius: normalize(12), backgroundColor: '#F5A623',
    justifyContent: 'center', alignItems: 'center',
  },
  howToNumText: { fontFamily: FONTS.regular, fontSize: normalize(11), fontWeight: 'bold', color: '#FFF' },
  howToStepText: { flex: 1, fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, lineHeight: normalize(20) },
  howToNote: {
    flexDirection: 'row', alignItems: 'center', gap: normalize(6),
    padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, marginTop: SPACING.xs,
  },
  howToNoteText: { flex: 1, fontFamily: FONTS.regular, fontSize: normalize(11), color: '#8B5E00', lineHeight: normalize(16) },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: normalize(24), borderTopRightRadius: normalize(24), padding: SPACING.lg, paddingBottom: SPACING.xl },
  modalHandle: { width: normalize(40), height: normalize(4), borderRadius: normalize(2), backgroundColor: '#DDD', alignSelf: 'center', marginBottom: SPACING.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontFamily: FONTS.regular, fontSize: normalize(20), fontWeight: 'bold' },
  modalClose: { padding: normalize(4) },
  inputLabel: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, marginBottom: SPACING.sm },
  amountInputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 2,
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.lg,
  },
  currencySymbol: { fontFamily: FONTS.regular, fontSize: normalize(24), fontWeight: 'bold' },
  amountInput: {
    flex: 1, fontFamily: FONTS.regular, fontSize: normalize(32), fontWeight: 'bold',
    paddingVertical: SPACING.md, marginLeft: SPACING.xs,
  },
  quickLabel: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, marginBottom: SPACING.sm },
  quickRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  quickBtn: {
    flex: 1, paddingVertical: normalize(10), borderRadius: BORDER_RADIUS.md, alignItems: 'center', borderWidth: 1,
  },
  quickBtnText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, fontWeight: '600' },
  methodSwitchRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  methodSwitchBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: normalize(10),
    alignItems: 'center',
  },
  methodSwitchText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  textField: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: normalize(10),
    marginBottom: SPACING.sm,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
  },
  confirmBtn: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  confirmBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: normalize(14),
    gap: SPACING.sm,
  },
  confirmBtnText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, color: '#FFF', fontWeight: 'bold' },
});

export default WalletScreen;
