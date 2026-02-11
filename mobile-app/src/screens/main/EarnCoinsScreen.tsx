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
  Share,
  Clipboard,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Coins,
  Users,
  Instagram,
  Video,
  Car,
  Trophy,
  Copy,
  Share2,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  Gift,
  TrendingUp,
  Zap,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { coinApi, referralApi, promoApi } from '@utils/apiClient';
import { useTheme } from '@context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COIN_COLOR = '#F5A623';
const COIN_BG = '#FFF8E7';
const COIN_DARK = '#8B5E00';

const EarnCoinsScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState<any>(null);
  const [milestones, setMilestones] = useState<any>(null);
  const [coinBalance, setCoinBalance] = useState<any>(null);
  const [promoSubmissions, setPromoSubmissions] = useState<any[]>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'instagram_story' | 'instagram_reel' | 'youtube_short'>('instagram_story');
  const [proofUrl, setProofUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [balanceRes, referralRes, milestoneRes, promoRes] = await Promise.all([
        coinApi.getBalance(),
        referralApi.getStats(),
        coinApi.getMilestones(),
        promoApi.getMySubmissions(),
      ]);

      if (balanceRes.success) setCoinBalance(balanceRes.data);
      if (referralRes.success) {
        setReferralCode(referralRes.data.code);
        setReferralStats(referralRes.data);
      }
      if (milestoneRes.success) setMilestones(milestoneRes.data);
      if (promoRes.success) setPromoSubmissions(promoRes.data.submissions || []);
    } catch (error) {
      console.error('Error fetching earn data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCopyCode = () => {
    Clipboard.setString(referralCode);
    Alert.alert('Copied!', 'Referral code copied to clipboard');
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join Forlok and get bonus coins! Use my referral code: ${referralCode}\n\nDownload Forlok now!`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSubmitPromo = async () => {
    if (!proofUrl.trim()) {
      Alert.alert('Error', 'Please enter the proof URL');
      return;
    }

    setSubmitting(true);
    try {
      const response = await promoApi.submit(selectedPlatform, proofUrl.trim());
      if (response.success) {
        Alert.alert('Success', 'Your proof has been submitted. Admin will review and award coins!');
        setShowPromoModal(false);
        setProofUrl('');
        fetchData();
      } else {
        Alert.alert('Error', response.message || 'Failed to submit proof');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit proof');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return COIN_COLOR;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={14} color="#4CAF50" />;
      case 'rejected': return <XCircle size={14} color="#F44336" />;
      default: return <Clock size={14} color={COIN_COLOR} />;
    }
  };

  const getPlatformLabel = (platform: string) => {
    return platform.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // ── Loading State ──
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ImageBackground
          source={require('../../../assets/coins.png')}
          style={styles.headerImage}
          resizeMode="cover"
        >
          <View style={styles.headerOverlay} />
          <BlurView intensity={40} style={styles.blurContainer}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <ArrowLeft size={22} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Earn Coins</Text>
              <View style={styles.headerPlaceholder} />
            </View>
          </BlurView>
        </ImageBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COIN_COLOR} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Hero Header with Image ── */}
      <ImageBackground
        source={require('../../../assets/coins.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={styles.headerOverlay} />
        <BlurView intensity={40} style={styles.blurContainer}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Earn Coins</Text>
              <Text style={styles.headerSubtitle}>Complete tasks & earn rewards</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </View>
        </BlurView>
      </ImageBackground>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COIN_COLOR]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Coin Balance Card ── */}
        <View style={[styles.balanceCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.balanceIconWrap}>
            <Coins size={32} color={COIN_COLOR} />
          </View>
          <View style={styles.balanceInfo}>
            <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>Your Balance</Text>
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>
                {coinBalance?.balance || 0}
              </Text>
              <Text style={[styles.balanceCoinLabel, { color: COIN_COLOR }]}>coins</Text>
            </View>
          </View>
          <View style={[styles.worthBadge, { backgroundColor: COIN_BG }]}>
            <Text style={[styles.worthText, { color: COIN_DARK }]}>
              ₹{coinBalance?.worthInRupees || 0}
            </Text>
          </View>
        </View>

        {/* ── 1. Invite Friends (Referral) ── */}
        <View style={[styles.earnCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.earnCardHeader}>
            <View style={[styles.earnIconWrap, { backgroundColor: '#4A90D9' + '15' }]}>
              <Users size={22} color="#4A90D9" />
            </View>
            <View style={styles.earnCardTitleWrap}>
              <Text style={[styles.earnCardTitle, { color: theme.colors.text }]}>Invite Friends</Text>
              <View style={[styles.coinBadge, { backgroundColor: COIN_BG }]}>
                <Coins size={12} color={COIN_COLOR} />
                <Text style={styles.coinBadgeText}>20-150</Text>
              </View>
            </View>
          </View>

          <View style={[styles.referralCodeBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
            <Text style={[styles.referralCodeLabel, { color: theme.colors.textSecondary }]}>Your Referral Code</Text>
            <View style={styles.referralCodeRow}>
              <Text style={styles.referralCodeText}>{referralCode || '---'}</Text>
              <TouchableOpacity onPress={handleCopyCode} style={[styles.copyBtn, { backgroundColor: '#4A90D9' + '15' }]}>
                <Copy size={16} color="#4A90D9" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.referralStatsRow}>
            <View style={[styles.statItem, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>{referralStats?.totalReferrals || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Friends Joined</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.statNumber, { color: COIN_COLOR }]}>{referralStats?.totalCoinsEarned || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Coins Earned</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.shareButton} onPress={handleShareCode} activeOpacity={0.8}>
            <Share2 size={16} color="#FFF" />
            <Text style={styles.shareButtonText}>Share Invite Link</Text>
          </TouchableOpacity>
        </View>

        {/* ── 2. Instagram Story ── */}
        <View style={[styles.earnCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.earnCardHeader}>
            <View style={[styles.earnIconWrap, { backgroundColor: '#E4405F' + '15' }]}>
              <Instagram size={22} color="#E4405F" />
            </View>
            <View style={styles.earnCardTitleWrap}>
              <Text style={[styles.earnCardTitle, { color: theme.colors.text }]}>Instagram Story</Text>
              <View style={[styles.coinBadge, { backgroundColor: COIN_BG }]}>
                <Coins size={12} color={COIN_COLOR} />
                <Text style={styles.coinBadgeText}>100-500</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.earnDescription, { color: theme.colors.textSecondary }]}>
            Post a story mentioning @forlok and submit the link as proof. Admin will review.
          </Text>
          <View style={[styles.limitBadge, { backgroundColor: '#E4405F' + '10' }]}>
            <Clock size={12} color="#E4405F" />
            <Text style={[styles.limitText, { color: '#E4405F' }]}>1 submission per day</Text>
          </View>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#E4405F' }]}
            onPress={() => { setSelectedPlatform('instagram_story'); setShowPromoModal(true); }}
            activeOpacity={0.8}
          >
            <ExternalLink size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>Submit Proof</Text>
          </TouchableOpacity>
        </View>

        {/* ── 3. Reel / YouTube Short ── */}
        <View style={[styles.earnCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.earnCardHeader}>
            <View style={[styles.earnIconWrap, { backgroundColor: '#FF0000' + '15' }]}>
              <Video size={22} color="#FF0000" />
            </View>
            <View style={styles.earnCardTitleWrap}>
              <Text style={[styles.earnCardTitle, { color: theme.colors.text }]}>Reel / YouTube Short</Text>
              <View style={[styles.coinBadge, { backgroundColor: COIN_BG }]}>
                <Coins size={12} color={COIN_COLOR} />
                <Text style={styles.coinBadgeText}>200-1000</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.earnDescription, { color: theme.colors.textSecondary }]}>
            Create a reel or YouTube Short about Forlok and submit the link. Higher reward!
          </Text>
          <View style={[styles.limitBadge, { backgroundColor: '#FF0000' + '10' }]}>
            <Clock size={12} color="#FF0000" />
            <Text style={[styles.limitText, { color: '#FF0000' }]}>1 submission per week</Text>
          </View>
          <View style={styles.dualButtonRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#E4405F', flex: 1 }]}
              onPress={() => { setSelectedPlatform('instagram_reel'); setShowPromoModal(true); }}
              activeOpacity={0.8}
            >
              <Instagram size={14} color="#FFF" />
              <Text style={styles.actionButtonText}>IG Reel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF0000', flex: 1 }]}
              onPress={() => { setSelectedPlatform('youtube_short'); setShowPromoModal(true); }}
              activeOpacity={0.8}
            >
              <Video size={14} color="#FFF" />
              <Text style={styles.actionButtonText}>YT Short</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 4. Ride & Earn ── */}
        <View style={[styles.earnCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.earnCardHeader}>
            <View style={[styles.earnIconWrap, { backgroundColor: '#27AE60' + '15' }]}>
              <Car size={22} color="#27AE60" />
            </View>
            <View style={styles.earnCardTitleWrap}>
              <Text style={[styles.earnCardTitle, { color: theme.colors.text }]}>Ride & Earn</Text>
              <View style={[styles.coinBadge, { backgroundColor: COIN_BG }]}>
                <Coins size={12} color={COIN_COLOR} />
                <Text style={styles.coinBadgeText}>1-200</Text>
              </View>
            </View>
          </View>
          <Text style={[styles.earnDescription, { color: theme.colors.textSecondary }]}>
            Complete rides as a passenger or driver and earn random coins. Min 2 km distance required.
          </Text>
          <View style={[styles.rideEarnInfo, { backgroundColor: '#27AE60' + '10' }]}>
            <Zap size={14} color="#27AE60" />
            <Text style={[styles.rideEarnText, { color: '#27AE60' }]}>Coins awarded automatically after each trip</Text>
          </View>
        </View>

        {/* ── 5. Milestones ── */}
        <View style={[styles.earnCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.earnCardHeader}>
            <View style={[styles.earnIconWrap, { backgroundColor: COIN_COLOR + '15' }]}>
              <Trophy size={22} color={COIN_COLOR} />
            </View>
            <View style={styles.earnCardTitleWrap}>
              <Text style={[styles.earnCardTitle, { color: theme.colors.text }]}>Milestones</Text>
              <View style={[styles.coinBadge, { backgroundColor: COIN_BG }]}>
                <TrendingUp size={12} color={COIN_COLOR} />
                <Text style={styles.coinBadgeText}>{milestones?.totalTrips || 0} rides</Text>
              </View>
            </View>
          </View>

          {milestones?.milestones?.map((m: any, idx: number) => (
            <View
              key={idx}
              style={[
                styles.milestoneRow,
                { borderBottomColor: theme.colors.border },
                idx === (milestones.milestones.length - 1) && { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.milestoneLeft}>
                <View style={[
                  styles.milestoneIconWrap,
                  { backgroundColor: m.achieved ? COIN_COLOR + '20' : theme.colors.background },
                ]}>
                  <Star
                    size={16}
                    color={m.achieved ? COIN_COLOR : theme.colors.textSecondary}
                    fill={m.achieved ? COIN_COLOR : 'transparent'}
                  />
                </View>
                <View>
                  <Text style={[
                    styles.milestoneName,
                    { color: m.achieved ? COIN_DARK : theme.colors.text },
                    m.achieved && styles.milestoneAchieved,
                  ]}>
                    {m.badge}
                  </Text>
                  <Text style={[styles.milestoneRides, { color: theme.colors.textSecondary }]}>
                    {m.rides} rides
                  </Text>
                </View>
              </View>
              <View style={[
                styles.milestoneCoinsWrap,
                { backgroundColor: m.achieved ? COIN_BG : theme.colors.background },
              ]}>
                {m.achieved && <CheckCircle size={12} color="#4CAF50" />}
                <Coins size={12} color={m.achieved ? COIN_COLOR : theme.colors.textSecondary} />
                <Text style={[
                  styles.milestoneCoins,
                  { color: m.achieved ? COIN_COLOR : theme.colors.textSecondary },
                ]}>
                  {m.coins}
                </Text>
              </View>
            </View>
          ))}

          {milestones?.nextMilestone && (
            <View style={[styles.nextMilestoneBox, { backgroundColor: COIN_BG }]}>
              <Gift size={16} color={COIN_DARK} />
              <Text style={styles.nextMilestoneText}>
                Next: <Text style={{ fontWeight: 'bold' }}>{milestones.nextMilestone.badge}</Text> — {milestones.nextMilestone.ridesRemaining} rides to go!
              </Text>
            </View>
          )}
        </View>

        {/* ── Promo Submissions History ── */}
        {promoSubmissions.length > 0 && (
          <View style={styles.submissionsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Submissions</Text>
            {promoSubmissions.map((sub: any) => (
              <View key={sub.submissionId} style={[styles.submissionCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.submissionLeft}>
                  <View style={[styles.submissionPlatformIcon, {
                    backgroundColor: sub.platform.includes('youtube') ? '#FF0000' + '15' : '#E4405F' + '15',
                  }]}>
                    {sub.platform.includes('youtube') ? (
                      <Video size={16} color="#FF0000" />
                    ) : (
                      <Instagram size={16} color="#E4405F" />
                    )}
                  </View>
                  <View>
                    <Text style={[styles.submissionPlatform, { color: theme.colors.text }]}>
                      {getPlatformLabel(sub.platform)}
                    </Text>
                    <Text style={[styles.submissionDate, { color: theme.colors.textSecondary }]}>
                      {new Date(sub.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
                <View style={styles.submissionRight}>
                  <View style={[styles.statusPill, { backgroundColor: getStatusColor(sub.status) + '15' }]}>
                    {getStatusIcon(sub.status)}
                    <Text style={[styles.statusText, { color: getStatusColor(sub.status) }]}>
                      {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                    </Text>
                  </View>
                  {sub.coinsAwarded > 0 && (
                    <View style={[styles.awardedBadge, { backgroundColor: COIN_BG }]}>
                      <Coins size={11} color={COIN_COLOR} />
                      <Text style={styles.awardedText}>+{sub.coinsAwarded}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Promo Submit Modal ── */}
      <Modal
        visible={showPromoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPromoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Submit Proof</Text>
              <TouchableOpacity onPress={() => setShowPromoModal(false)} style={styles.modalClose}>
                <XCircle size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalPlatformBadge, {
              backgroundColor: selectedPlatform.includes('youtube') ? '#FF0000' + '15' : '#E4405F' + '15',
            }]}>
              {selectedPlatform.includes('youtube') ? (
                <Video size={18} color="#FF0000" />
              ) : (
                <Instagram size={18} color="#E4405F" />
              )}
              <Text style={[styles.modalPlatformText, {
                color: selectedPlatform.includes('youtube') ? '#FF0000' : '#E4405F',
              }]}>
                {getPlatformLabel(selectedPlatform)}
              </Text>
            </View>

            <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
              Proof URL (link to your post/story)
            </Text>
            <TextInput
              style={[styles.proofInput, { 
                borderColor: theme.colors.border, 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
              }]}
              value={proofUrl}
              onChangeText={setProofUrl}
              placeholder="https://www.instagram.com/stories/..."
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity
              style={[styles.submitButton, submitting && { opacity: 0.7 }]}
              onPress={handleSubmitPromo}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <CheckCircle size={18} color="#FFF" />
                  <Text style={styles.submitButtonText}>Submit for Review</Text>
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
  container: {
    flex: 1,
  },

  // ── Header with Image ──
  headerImage: {
    width: '100%',
    height: 180,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COIN_COLOR,
    opacity: 0.65,
  },
  blurContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 40,
  },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
  },

  // ── Scroll ──
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },

  // ── Balance Card ──
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  balanceIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COIN_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    marginBottom: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  balanceAmount: {
    fontFamily: FONTS.regular,
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  balanceCoinLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  worthBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
  },
  worthText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
  },

  // ── Earn Card (shared) ──
  earnCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  earnCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  earnIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earnCardTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  earnCardTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    flex: 1,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
  },
  coinBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '700',
    color: COIN_DARK,
  },
  earnDescription: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.round,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  limitText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Action Buttons ──
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  actionButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#FFF',
    fontWeight: '700',
  },
  dualButtonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },

  // ── Ride & Earn ──
  rideEarnInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  rideEarnText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  // ── Referral ──
  referralCodeBox: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  referralCodeLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginBottom: 6,
  },
  referralCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referralCodeText: {
    fontFamily: FONTS.regular,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4A90D9',
    letterSpacing: 3,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralStatsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  statNumber: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 2,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90D9',
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  shareButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#FFF',
    fontWeight: '700',
  },

  // ── Milestones ──
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  milestoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  milestoneIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
  },
  milestoneAchieved: {
    fontWeight: 'bold',
  },
  milestoneRides: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 1,
  },
  milestoneCoinsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  milestoneCoins: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
  },
  nextMilestoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  nextMilestoneText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COIN_DARK,
    flex: 1,
  },

  // ── Submissions ──
  submissionsSection: {
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  submissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  submissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  submissionPlatformIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submissionPlatform: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  submissionDate: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 1,
  },
  submissionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '600',
  },
  awardedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
  },
  awardedText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: 'bold',
    color: COIN_COLOR,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontFamily: FONTS.regular,
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalClose: {
    padding: 4,
  },
  modalPlatformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalPlatformText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  modalLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
  },
  proofInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    marginBottom: SPACING.lg,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COIN_COLOR,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  submitButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default EarnCoinsScreen;
