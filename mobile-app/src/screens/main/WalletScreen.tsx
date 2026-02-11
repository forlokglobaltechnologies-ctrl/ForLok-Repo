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
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  Wallet,
  Plus,
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
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { walletApi, coinApi } from '@utils/apiClient';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';

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

const WalletScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [walletSummary, setWalletSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [walletConfig, setWalletConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'wallet' | 'coins'>(
    route.params?.tab === 'coins' ? 'coins' : 'wallet'
  );
  const [coinBalance, setCoinBalance] = useState<any>(null);
  const [coinTransactions, setCoinTransactions] = useState<CoinTransaction[]>([]);

  const fetchWalletData = useCallback(async () => {
    try {
      const [summaryRes, transactionsRes, configRes, coinBalanceRes, coinTxRes] = await Promise.all([
        walletApi.getSummary(),
        walletApi.getTransactions({ limit: 20 }),
        walletApi.getConfig(),
        coinApi.getBalance(),
        coinApi.getTransactions(),
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
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData();
    setRefreshing(false);
  };

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (walletConfig?.minTopUp && amount < walletConfig.minTopUp) {
      Alert.alert('Minimum Amount', `Minimum top-up amount is ₹${walletConfig.minTopUp}`);
      return;
    }
    setTopUpLoading(true);
    try {
      const response = await walletApi.topUp(amount);
      if (response.success) {
        Alert.alert(
          'Recharge Successful',
          `₹${amount} has been added to your wallet.${response.data?.balance !== undefined ? `\n\nNew Balance: ₹${response.data.balance}` : ''}`,
          [{ text: 'OK', onPress: () => { setShowTopUpModal(false); setTopUpAmount(''); fetchWalletData(); } }]
        );
      } else {
        Alert.alert('Recharge Failed', response.error || 'Failed to top-up wallet');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setTopUpLoading(false);
    }
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

  // ── Loading State ──
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ImageBackground
          source={require('../../../assets/wallet.png')}
          style={styles.headerImage}
          resizeMode="cover"
        >
          <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
          <BlurView intensity={40} style={styles.blurContainer}>
            <View style={styles.headerNav}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
                <ArrowLeft size={22} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.navTitle}>Wallet</Text>
              <View style={styles.navPlaceholder} />
            </View>
          </BlurView>
        </ImageBackground>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Hero Header ── */}
      <ImageBackground
        source={require('../../../assets/wallet.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={40} style={styles.blurContainer}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.navTitle}>My Wallet</Text>
              <Text style={styles.navSubtitle}>Manage your funds & coins</Text>
            </View>
            <View style={styles.navPlaceholder} />
          </View>
        </BlurView>
      </ImageBackground>

      {/* ── Tab Bar ── */}
      <View style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wallet' && [styles.tabActive, { borderBottomColor: theme.colors.primary }]]}
          onPress={() => setActiveTab('wallet')}
        >
          <Wallet size={16} color={activeTab === 'wallet' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'wallet' && { color: theme.colors.primary, fontWeight: '700' }]}>
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
              'Toggle "Apply Coins" ON at payment',
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Balance Card */}
          <View style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
            <View style={styles.balanceTop}>
              <View style={styles.balanceIconWrap}>
                <Wallet size={24} color="#FFF" />
              </View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
            </View>
            <Text style={styles.balanceAmount}>{formatCurrency(getBalance())}</Text>
            {walletSummary?.lockedAmount > 0 && (
              <View style={styles.lockedRow}>
                <Info size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.lockedText}>₹{walletSummary.lockedAmount.toLocaleString('en-IN')} locked for bookings</Text>
              </View>
            )}
            {/* Booking Status */}
            {walletSummary && (
              <View style={styles.bookingStatusRow}>
                <View style={[styles.bookingStatusPill, { backgroundColor: walletSummary.canBookRide ? 'rgba(76,175,80,0.25)' : 'rgba(244,67,54,0.25)' }]}>
                  {walletSummary.canBookRide ? <CheckCircle size={12} color="#A5D6A7" /> : <XCircle size={12} color="#EF9A9A" />}
                  <Text style={[styles.bookingStatusText, { color: walletSummary.canBookRide ? '#A5D6A7' : '#EF9A9A' }]}>
                    {walletSummary.canBookRide ? 'Can book rides' : `Min ₹${walletSummary.minimumRequired} to book`}
                  </Text>
                </View>
              </View>
            )}
            <TouchableOpacity style={styles.addMoneyBtn} onPress={() => setShowTopUpModal(true)} activeOpacity={0.8}>
              <Plus size={18} color="#FFF" />
              <Text style={styles.addMoneyText}>Add Money</Text>
            </TouchableOpacity>
          </View>

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
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See All</Text>
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
        </ScrollView>
      )}

      {/* ── Top Up Modal ── */}
      <Modal visible={showTopUpModal} transparent animationType="slide" onRequestClose={() => setShowTopUpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Money</Text>
              <TouchableOpacity onPress={() => setShowTopUpModal(false)} style={styles.modalClose}>
                <XCircle size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Enter Amount</Text>
            <View style={[styles.amountInputWrap, { borderColor: theme.colors.primary, backgroundColor: theme.colors.background }]}>
              <Text style={[styles.currencySymbol, { color: theme.colors.text }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.colors.text }]}
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <Text style={[styles.quickLabel, { color: theme.colors.textSecondary }]}>Quick Add</Text>
            <View style={styles.quickRow}>
              {[100, 200, 500, 1000].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.quickBtn,
                    { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                    topUpAmount === amount.toString() && { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setTopUpAmount(amount.toString())}
                >
                  <Text style={[
                    styles.quickBtnText,
                    { color: theme.colors.text },
                    topUpAmount === amount.toString() && { color: theme.colors.primary, fontWeight: '700' },
                  ]}>₹{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }, topUpLoading && { opacity: 0.7 }]}
              onPress={handleTopUp}
              disabled={topUpLoading}
              activeOpacity={0.8}
            >
              {topUpLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Plus size={18} color="#FFF" />
                  <Text style={styles.confirmBtnText}>Add ₹{topUpAmount || '0'}</Text>
                </>
              )}
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
  headerImage: { width: '100%', height: 180 },
  headerOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.65 },
  blurContainer: { flex: 1, overflow: 'hidden' },
  headerNav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
  },
  navButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  navTitle: { fontFamily: FONTS.regular, fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  navSubtitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  navPlaceholder: { width: 40 },

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
  },
  balanceTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  balanceIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  balanceLabel: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { fontFamily: FONTS.regular, fontSize: 38, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: SPACING.sm },
  lockedText: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  bookingStatusRow: { marginBottom: SPACING.md },
  bookingStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.round, alignSelf: 'flex-start',
  },
  bookingStatusText: { fontFamily: FONTS.regular, fontSize: 11, fontWeight: '600' },
  addMoneyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 11,
    borderRadius: BORDER_RADIUS.md, gap: 6,
  },
  addMoneyText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, color: '#FFF', fontWeight: '700' },

  // ── Stats Row ──
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: {
    flex: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm,
  },
  statIconWrap: {
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  statCardLabel: { fontFamily: FONTS.regular, fontSize: 11, marginBottom: 2 },
  statCardValue: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.lg, fontWeight: 'bold' },

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
  txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  txDetails: { flex: 1 },
  txDesc: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, fontWeight: '500' },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  txDate: { fontFamily: FONTS.regular, fontSize: 11 },
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
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F5A623' + '18', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.xs,
  },
  coinLabel: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm },
  coinAmount: { fontFamily: FONTS.regular, fontSize: 44, fontWeight: 'bold', color: '#8B5E00' },
  coinWorthPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF8E7', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round, marginTop: 4, marginBottom: SPACING.md,
  },
  coinWorthText: { fontFamily: FONTS.regular, fontSize: 12, fontWeight: '600', color: '#8B5E00' },
  coinStatsRow: {
    flexDirection: 'row', width: '100%', paddingTop: SPACING.md, borderTopWidth: 1,
  },
  coinStatItem: { flex: 1, alignItems: 'center' },
  coinStatVal: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.xl, fontWeight: 'bold', color: '#8B5E00' },
  coinStatLbl: { fontFamily: FONTS.regular, fontSize: 11, marginTop: 2 },
  coinStatDivider: { width: 1, height: 30, alignSelf: 'center' },

  // ── Coin Actions ──
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  coinActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5A623', paddingVertical: 11, borderRadius: BORDER_RADIUS.md, gap: 6,
  },
  coinActionText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, color: '#FFF', fontWeight: '700' },

  // ── How to Use ──
  howToCard: { borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
  howToHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  howToTitle: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.lg, fontWeight: 'bold' },
  howToStep: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  howToNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#F5A623',
    justifyContent: 'center', alignItems: 'center',
  },
  howToNumText: { fontFamily: FONTS.regular, fontSize: 11, fontWeight: 'bold', color: '#FFF' },
  howToStepText: { flex: 1, fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, lineHeight: 20 },
  howToNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, marginTop: SPACING.xs,
  },
  howToNoteText: { flex: 1, fontFamily: FONTS.regular, fontSize: 11, color: '#8B5E00', lineHeight: 16 },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: SPACING.xl },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginBottom: SPACING.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontFamily: FONTS.regular, fontSize: 20, fontWeight: 'bold' },
  modalClose: { padding: 4 },
  inputLabel: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, marginBottom: SPACING.sm },
  amountInputWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 2,
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.lg,
  },
  currencySymbol: { fontFamily: FONTS.regular, fontSize: 24, fontWeight: 'bold' },
  amountInput: {
    flex: 1, fontFamily: FONTS.regular, fontSize: 32, fontWeight: 'bold',
    paddingVertical: SPACING.md, marginLeft: SPACING.xs,
  },
  quickLabel: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, marginBottom: SPACING.sm },
  quickRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  quickBtn: {
    flex: 1, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, alignItems: 'center', borderWidth: 1,
  },
  quickBtnText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, fontWeight: '600' },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: BORDER_RADIUS.md, gap: SPACING.sm,
  },
  confirmBtnText: { fontFamily: FONTS.regular, fontSize: FONTS.sizes.md, color: '#FFF', fontWeight: 'bold' },
});

export default WalletScreen;
