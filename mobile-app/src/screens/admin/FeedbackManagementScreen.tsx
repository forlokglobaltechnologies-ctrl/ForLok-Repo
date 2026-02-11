import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  Lightbulb,
  XCircle,
  CheckCircle,
  CreditCard,
  MessageSquare,
  Clock,
  ChevronRight,
  Inbox,
  AlertTriangle,
  Eye,
  Star,
  Bug,
  User,
  Calendar,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { adminFeedbackApi } from '@utils/apiClient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FeedbackManagementScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const tabs = [
    { key: 'all', label: 'All', icon: MessageSquare, color: '#4A90D9' },
    { key: 'pending', label: 'Pending', icon: Clock, color: '#F39C12' },
    { key: 'acknowledged', label: 'In Review', icon: Eye, color: '#7B61FF' },
    { key: 'resolved', label: 'Resolved', icon: CheckCircle, color: '#00B894' },
    { key: 'archived', label: 'Archived', icon: Inbox, color: '#94A3B8' },
  ];

  const fetchData = useCallback(async (reset = false) => {
    try {
      if (reset) setLoading(true);
      const currentPage = reset ? 1 : page;

      const [statsRes, feedbackRes] = await Promise.all([
        reset || !stats ? adminFeedbackApi.getStats() : Promise.resolve(null),
        adminFeedbackApi.getAll({
          status: activeTab !== 'all' ? activeTab : undefined,
          page: currentPage,
          limit: 20,
        }),
      ]);

      if (statsRes?.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (feedbackRes.success && feedbackRes.data) {
        const newFeedbacks = feedbackRes.data.feedback || [];
        if (reset) {
          setFeedbacks(newFeedbacks);
          setPage(2);
        } else {
          setFeedbacks((prev) => [...prev, ...newFeedbacks]);
          setPage(currentPage + 1);
        }
        setTotal(feedbackRes.data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching feedback data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, page, stats]);

  useEffect(() => {
    fetchData(true);
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  // ── Helpers ─────────────────────────────────────────────────
  const getTypeConfig = (type: string) => {
    const map: Record<string, { icon: any; color: string; bg: string; label: string }> = {
      bug:        { icon: Bug,           color: '#E74C3C', bg: '#FFEBEE', label: 'Bug Report' },
      issue:      { icon: AlertTriangle, color: '#F39C12', bg: '#FFF8E1', label: 'Issue' },
      suggestion: { icon: Lightbulb,     color: '#4A90D9', bg: '#EBF5FF', label: 'Suggestion' },
      complaint:  { icon: XCircle,       color: '#E74C3C', bg: '#FFEBEE', label: 'Complaint' },
      feedback:   { icon: MessageSquare, color: '#7B61FF', bg: '#F0EBFF', label: 'Feedback' },
      general:    { icon: MessageSquare, color: '#7B61FF', bg: '#F0EBFF', label: 'General' },
    };
    return map[type] || { icon: MessageSquare, color: '#94A3B8', bg: '#F1F5F9', label: type || 'Feedback' };
  };

  const getStatusConfig = (status: string) => {
    const map: Record<string, { color: string; bg: string; label: string }> = {
      pending:      { color: '#F39C12', bg: '#F39C12' + '15', label: 'Pending' },
      acknowledged: { color: '#7B61FF', bg: '#7B61FF' + '15', label: 'In Review' },
      resolved:     { color: '#00B894', bg: '#00B894' + '15', label: 'Resolved' },
      archived:     { color: '#94A3B8', bg: '#94A3B8' + '15', label: 'Archived' },
    };
    return map[status] || { color: '#94A3B8', bg: '#F1F5F9', label: status };
  };

  const getPriorityConfig = (priority: string) => {
    const map: Record<string, { color: string; bg: string; label: string }> = {
      high:   { color: '#E74C3C', bg: '#E74C3C' + '15', label: 'High' },
      medium: { color: '#F39C12', bg: '#F39C12' + '15', label: 'Medium' },
      low:    { color: '#00B894', bg: '#00B894' + '15', label: 'Low' },
    };
    return map[priority] || { color: '#94A3B8', bg: '#F1F5F9', label: priority || 'Normal' };
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

  const capitalize = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

  // ── Stats summary row ───────────────────────────────────────
  const statItems = stats
    ? [
        { label: 'Total', value: stats.total || 0, color: '#4A90D9', icon: MessageSquare },
        { label: 'Pending', value: stats.pending || 0, color: '#F39C12', icon: Clock },
        { label: 'Reviewed', value: stats.acknowledged || 0, color: '#7B61FF', icon: Eye },
        { label: 'Resolved', value: stats.resolved || 0, color: '#00B894', icon: CheckCircle },
      ]
    : [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ─── Hero Header ──────────────────────────────────────── */}
      <ImageBackground
        source={require('../../../assets/feedbackm.png')}
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
              <Text style={styles.heroTitle}>Feedback Management</Text>
              <Text style={styles.heroSubtitle}>
                {total} total feedback{total !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={{ width: 38 }} />
          </View>
        </BlurView>
      </ImageBackground>

      {/* ─── Stats Strip ──────────────────────────────────────── */}
      {stats && (
        <View style={styles.statsStrip}>
          {statItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <View key={idx} style={styles.statsStripItem}>
                <View style={[styles.statsStripIcon, { backgroundColor: item.color + '15' }]}>
                  <Icon size={16} color={item.color} />
                </View>
                <Text style={[styles.statsStripValue, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.statsStripLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ─── Filter Tabs ──────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          const count = tab.key !== 'all' && stats ? stats[tab.key] || 0 : null;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && { backgroundColor: tab.color }]}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon size={14} color={isActive ? '#fff' : tab.color} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {count !== null && count > 0 && (
                <View style={[styles.tabBadge, isActive && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                  <Text style={[styles.tabBadgeText, isActive && { color: '#fff' }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── Content ──────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.loadingText}>Loading feedback...</Text>
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
          {feedbacks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Inbox size={48} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>No Feedback Found</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'all'
                  ? 'No feedback has been submitted yet.'
                  : `No ${activeTab} feedback at the moment.`}
              </Text>
            </View>
          ) : (
            <>
              {feedbacks.map((feedback) => {
                const typeConf = getTypeConfig(feedback.type);
                const statusConf = getStatusConfig(feedback.status);
                const priorityConf = getPriorityConfig(feedback.priority);
                const TypeIcon = typeConf.icon;

                return (
                  <TouchableOpacity
                    key={feedback.feedbackId}
                    style={styles.feedbackCard}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate(
                        'FeedbackDetails' as never,
                        { feedbackId: feedback.feedbackId } as never
                      )
                    }
                  >
                    {/* Card header row */}
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardTypeIcon, { backgroundColor: typeConf.bg }]}>
                        <TypeIcon size={18} color={typeConf.color} />
                      </View>
                      <View style={styles.cardHeaderInfo}>
                        <Text style={styles.cardSubject} numberOfLines={1}>
                          {feedback.subject || 'No Subject'}
                        </Text>
                        <Text style={styles.cardId}>#{feedback.feedbackId}</Text>
                      </View>
                      <ChevronRight size={18} color="#CBD5E1" />
                    </View>

                    {/* Message preview */}
                    {feedback.description && (
                      <Text style={styles.cardMessage} numberOfLines={2}>
                        {feedback.description}
                      </Text>
                    )}

                    {/* Badges row */}
                    <View style={styles.cardBadgeRow}>
                      {/* Status */}
                      <View style={[styles.cardBadge, { backgroundColor: statusConf.bg }]}>
                        <View style={[styles.cardBadgeDot, { backgroundColor: statusConf.color }]} />
                        <Text style={[styles.cardBadgeText, { color: statusConf.color }]}>
                          {statusConf.label}
                        </Text>
                      </View>

                      {/* Type */}
                      <View style={[styles.cardBadge, { backgroundColor: typeConf.bg }]}>
                        <Text style={[styles.cardBadgeText, { color: typeConf.color }]}>
                          {typeConf.label}
                        </Text>
                      </View>

                      {/* Priority */}
                      <View style={[styles.cardBadge, { backgroundColor: priorityConf.bg }]}>
                        <Text style={[styles.cardBadgeText, { color: priorityConf.color }]}>
                          {priorityConf.label}
                        </Text>
                      </View>

                      {/* Responded indicator */}
                      {feedback.adminResponse && (
                        <View style={[styles.cardBadge, { backgroundColor: '#00B894' + '15' }]}>
                          <CheckCircle size={10} color="#00B894" />
                          <Text style={[styles.cardBadgeText, { color: '#00B894' }]}>
                            Replied
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Footer row */}
                    <View style={styles.cardFooter}>
                      <View style={styles.cardUserRow}>
                        <View style={styles.cardUserAvatar}>
                          <User size={12} color="#94A3B8" />
                        </View>
                        <Text style={styles.cardUserName} numberOfLines={1}>
                          {feedback.user?.name || 'Unknown User'}
                        </Text>
                      </View>
                      <View style={styles.cardTimeRow}>
                        <Clock size={12} color="#94A3B8" />
                        <Text style={styles.cardTime}>
                          {getTimeAgo(feedback.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {/* Rating stars if available */}
                    {feedback.rating > 0 && (
                      <View style={styles.cardRatingRow}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            color={s <= feedback.rating ? '#F5A623' : '#E2E8F0'}
                            fill={s <= feedback.rating ? '#F5A623' : 'transparent'}
                          />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Pagination info */}
              {feedbacks.length > 0 && (
                <Text style={styles.paginationInfo}>
                  Showing {feedbacks.length} of {total}
                </Text>
              )}

              {/* Load more */}
              {feedbacks.length < total && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  activeOpacity={0.7}
                  onPress={() => fetchData(false)}
                >
                  <Text style={styles.loadMoreText}>Load More</Text>
                  <ChevronRight size={14} color="#4A90D9" />
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
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

  /* ── Stats Strip ────────────────────────────────────────────── */
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: SPACING.lg,
    marginTop: -SPACING.md,
    borderRadius: 14,
    padding: SPACING.sm,
    ...SHADOWS.md,
    zIndex: 10,
  },
  statsStripItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  statsStripIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statsStripValue: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    fontWeight: '800',
  },
  statsStripLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 1,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
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

  /* ── Empty State ────────────────────────────────────────────── */
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
    paddingHorizontal: SPACING.xl,
  },

  /* ── Feedback Card ──────────────────────────────────────────── */
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOWS.sm,
  },

  /* Card header */
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardSubject: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: '#1E293B',
    fontWeight: '600',
    marginBottom: 2,
  },
  cardId: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* Card message */
  cardMessage: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: SPACING.sm,
    paddingLeft: 52,
  },

  /* Card badges */
  cardBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.sm,
    paddingLeft: 52,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  cardBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    fontWeight: '700',
  },

  /* Card footer */
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingLeft: 52,
  },
  cardUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  cardUserAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardUserName: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  cardTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardTime: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* Card rating */
  cardRatingRow: {
    flexDirection: 'row',
    gap: 2,
    paddingLeft: 52,
    marginTop: SPACING.xs,
  },

  /* ── Pagination & Load More ─────────────────────────────────── */
  paginationInfo: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    backgroundColor: '#4A90D9' + '10',
    borderRadius: 12,
    marginTop: SPACING.xs,
  },
  loadMoreText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: '#4A90D9',
    fontWeight: '600',
  },
});

export default FeedbackManagementScreen;
