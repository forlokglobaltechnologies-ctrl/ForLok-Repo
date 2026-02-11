import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Linking,
  ImageBackground,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Instagram,
  Youtube,
  Film,
  Image as ImageIcon,
  Coins,
  ChevronRight,
  Inbox,
  X,
  User,
  Eye,
  AlertTriangle,
  Link2,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import apiCall from '@utils/apiClient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PromoSubmission {
  submissionId: string;
  userId: string;
  userName: string;
  platform: string;
  proofUrl: string;
  status: string;
  coinsAwarded: number;
  reviewNote?: string;
  createdAt: string;
}

const AdminPromoReviewScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<PromoSubmission[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      const response = await apiCall(`/api/admin/promos?status=${filter}`, {
        method: 'GET',
        requiresAuth: true,
      });
      if (response.success && response.data) {
        setSubmissions(response.data.submissions || []);
      }
    } catch (error) {
      console.error('Error fetching promo submissions:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSubmissions();
    setRefreshing(false);
  };

  const handleApprove = async (submissionId: string) => {
    Alert.alert(
      'Approve Promo',
      'This will award coins to the user. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessing(submissionId);
            try {
              const response = await apiCall(`/api/admin/promos/${submissionId}/approve`, {
                method: 'PUT',
                body: {},
                requiresAuth: true,
              });
              if (response.success) {
                Alert.alert('Success', response.message || 'Promo approved and coins awarded!');
                fetchSubmissions();
              } else {
                Alert.alert('Error', response.message || 'Failed to approve');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;
    setProcessing(selectedSubmission);
    try {
      const response = await apiCall(`/api/admin/promos/${selectedSubmission}/reject`, {
        method: 'PUT',
        body: { reason: rejectReason || 'Does not meet requirements' },
        requiresAuth: true,
      });
      if (response.success) {
        Alert.alert('Rejected', 'Submission rejected. User notified.');
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedSubmission(null);
        fetchSubmissions();
      } else {
        Alert.alert('Error', response.message || 'Failed to reject');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────
  const getStatusConfig = (status: string) => {
    const map: Record<string, { color: string; bg: string; label: string; icon: any }> = {
      pending:  { color: '#F39C12', bg: '#F39C12' + '15', label: 'Pending',  icon: Clock },
      approved: { color: '#00B894', bg: '#00B894' + '15', label: 'Approved', icon: CheckCircle },
      rejected: { color: '#E74C3C', bg: '#E74C3C' + '15', label: 'Rejected', icon: XCircle },
    };
    return map[status] || { color: '#94A3B8', bg: '#F1F5F9', label: status, icon: Clock };
  };

  const getPlatformInfo = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('instagram_story') || p.includes('ig_story')) {
      return { label: 'IG Story', icon: ImageIcon, color: '#E1306C' };
    }
    if (p.includes('instagram_reel') || p.includes('ig_reel') || p.includes('reel')) {
      return { label: 'IG Reel', icon: Film, color: '#E1306C' };
    }
    if (p.includes('youtube') || p.includes('yt')) {
      return { label: 'YouTube', icon: Youtube, color: '#FF0000' };
    }
    if (p.includes('instagram')) {
      return { label: 'Instagram', icon: Instagram, color: '#E1306C' };
    }
    return { label: platform.replace(/_/g, ' '), icon: Film, color: '#4A90D9' };
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

  const openProofUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open the proof URL');
    });
  };

  const FILTERS = [
    { key: 'pending' as const,  label: 'Pending',  icon: Clock,       color: '#F39C12' },
    { key: 'approved' as const, label: 'Approved', icon: CheckCircle, color: '#00B894' },
    { key: 'rejected' as const, label: 'Rejected', icon: XCircle,     color: '#E74C3C' },
    { key: 'all' as const,      label: 'All',      icon: Eye,         color: '#4A90D9' },
  ];

  const pendingCount = filter === 'pending' ? submissions.length : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ─── Hero Header ──────────────────────────────────────── */}
      <ImageBackground
        source={require('../../../assets/social.png')}
        style={styles.heroHeader}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay} />
        <BlurView intensity={20} tint="dark" style={styles.heroBlur}>
          <View style={styles.heroNav}>
            <TouchableOpacity
              style={styles.heroBackBtn}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroTitle}>Promo Reviews</Text>
              <Text style={styles.heroSubtitle}>
                {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={{ width: 38 }} />
          </View>
        </BlurView>
      </ImageBackground>

      {/* ─── Filter Tabs ──────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          const Icon = f.icon;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.tab, isActive && { backgroundColor: f.color, borderColor: f.color }]}
              activeOpacity={0.7}
              onPress={() => { setFilter(f.key); setLoading(true); }}
            >
              <Icon size={14} color={isActive ? '#fff' : f.color} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── Content ──────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.loadingText}>Loading submissions...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A90D9" />
          }
          showsVerticalScrollIndicator={false}
        >
          {submissions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Inbox size={48} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>No Submissions</Text>
              <Text style={styles.emptyText}>
                No {filter !== 'all' ? filter : ''} promo submissions found.
              </Text>
            </View>
          ) : (
            submissions.map((sub) => {
              const statusConf = getStatusConfig(sub.status);
              const platformInfo = getPlatformInfo(sub.platform);
              const PlatformIcon = platformInfo.icon;
              const StatusIcon = statusConf.icon;

              return (
                <View key={sub.submissionId} style={styles.card}>
                  {/* Card header */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardPlatformIcon, { backgroundColor: platformInfo.color + '15' }]}>
                      <PlatformIcon size={20} color={platformInfo.color} />
                    </View>
                    <View style={styles.cardHeaderInfo}>
                      <Text style={styles.cardUserName}>{sub.userName || 'Unknown User'}</Text>
                      <Text style={[styles.cardPlatformLabel, { color: platformInfo.color }]}>
                        {platformInfo.label}
                      </Text>
                    </View>
                    <View style={[styles.cardStatusBadge, { backgroundColor: statusConf.bg }]}>
                      <StatusIcon size={12} color={statusConf.color} />
                      <Text style={[styles.cardStatusText, { color: statusConf.color }]}>
                        {statusConf.label}
                      </Text>
                    </View>
                  </View>

                  {/* Proof URL */}
                  <TouchableOpacity
                    style={styles.cardProofRow}
                    activeOpacity={0.7}
                    onPress={() => openProofUrl(sub.proofUrl)}
                  >
                    <View style={styles.cardProofIcon}>
                      <Link2 size={14} color="#4A90D9" />
                    </View>
                    <Text style={styles.cardProofUrl} numberOfLines={1}>
                      {sub.proofUrl}
                    </Text>
                    <ExternalLink size={14} color="#4A90D9" />
                  </TouchableOpacity>

                  {/* Meta row */}
                  <View style={styles.cardMetaRow}>
                    <View style={styles.cardMetaItem}>
                      <Clock size={12} color="#94A3B8" />
                      <Text style={styles.cardMetaText}>{getTimeAgo(sub.createdAt)}</Text>
                    </View>
                    <View style={styles.cardMetaItem}>
                      <User size={12} color="#94A3B8" />
                      <Text style={styles.cardMetaText}>ID: {sub.userId?.slice(-8) || '...'}</Text>
                    </View>
                    {sub.coinsAwarded > 0 && (
                      <View style={[styles.cardCoinsBadge]}>
                        <Coins size={12} color="#F5A623" />
                        <Text style={styles.cardCoinsText}>+{sub.coinsAwarded}</Text>
                      </View>
                    )}
                  </View>

                  {/* Review note */}
                  {sub.reviewNote && (
                    <View style={styles.cardReviewNote}>
                      <AlertTriangle size={12} color="#94A3B8" />
                      <Text style={styles.cardReviewNoteText}>{sub.reviewNote}</Text>
                    </View>
                  )}

                  {/* Action buttons for pending */}
                  {sub.status === 'pending' && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.cardActionBtn, styles.cardApproveBtn]}
                        activeOpacity={0.8}
                        onPress={() => handleApprove(sub.submissionId)}
                        disabled={processing === sub.submissionId}
                      >
                        {processing === sub.submissionId ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <CheckCircle size={16} color="#fff" />
                            <Text style={styles.cardActionText}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cardActionBtn, styles.cardRejectBtn]}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedSubmission(sub.submissionId);
                          setShowRejectModal(true);
                        }}
                        disabled={processing === sub.submissionId}
                      >
                        <XCircle size={16} color="#fff" />
                        <Text style={styles.cardActionText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ─── Reject Modal ─────────────────────────────────────── */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismiss}
            activeOpacity={1}
            onPress={() => {
              setShowRejectModal(false);
              setRejectReason('');
              setSelectedSubmission(null);
            }}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: '#E74C3C' + '15' }]}>
                <XCircle size={22} color="#E74C3C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Reject Submission</Text>
                <Text style={styles.modalSubtitle}>User will be notified</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedSubmission(null);
                }}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Reason input */}
            <Text style={styles.modalLabel}>Reason for rejection</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Doesn't meet requirements, blurry screenshot..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedSubmission(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalRejectBtn]}
                activeOpacity={0.8}
                onPress={handleReject}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <XCircle size={16} color="#fff" />
                    <Text style={styles.modalRejectText}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
    height: Platform.OS === 'android' ? 140 + (StatusBar.currentHeight || 0) : 160,
    width: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 52, 96, 0.5)',
  },
  heroBlur: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  heroNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitleWrap: {
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: FONTS.regular,
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  heroSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  /* ── Filter Tabs ────────────────────────────────────────────── */
  tabsScroll: {
    marginTop: SPACING.md,
    maxHeight: 48,
  },
  tabsContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
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

  /* ── Empty ──────────────────────────────────────────────────── */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  },

  /* ── Submission Card ────────────────────────────────────────── */
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOWS.sm,
  },

  /* Card header */
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardPlatformIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardUserName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#1E293B',
    fontWeight: '600',
    marginBottom: 2,
  },
  cardPlatformLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: '600',
  },
  cardStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  cardStatusText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '700',
  },

  /* Proof URL */
  cardProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4A90D9' + '08',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: SPACING.sm,
  },
  cardProofIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#4A90D9' + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardProofUrl: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#4A90D9',
  },

  /* Meta row */
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.xs,
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  cardCoinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5A623' + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  cardCoinsText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#F5A623',
    fontWeight: '700',
  },

  /* Review note */
  cardReviewNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  cardReviewNoteText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    lineHeight: 18,
  },

  /* Action buttons */
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  cardApproveBtn: {
    backgroundColor: '#00B894',
  },
  cardRejectBtn: {
    backgroundColor: '#E74C3C',
  },
  cardActionText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#fff',
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
    width: 44,
    height: 44,
    borderRadius: 14,
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
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#1E293B',
    marginBottom: SPACING.lg,
    minHeight: 100,
    backgroundColor: '#F8FAFC',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalCancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#64748B',
    fontWeight: '600',
  },
  modalRejectBtn: {
    backgroundColor: '#E74C3C',
  },
  modalRejectText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#fff',
    fontWeight: '700',
  },
});

export default AdminPromoReviewScreen;
