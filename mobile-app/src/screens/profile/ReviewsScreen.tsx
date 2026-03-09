import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowLeft, Star, User, ThumbsUp, TrendingUp, Award, MessageSquare } from 'lucide-react-native';
import { normalize, hp } from '@utils/responsive';
import { FONTS } from '@constants/theme';
import { ratingApi } from '@utils/apiClient';
import { useTheme } from '@context/ThemeContext';
import useMasterData from '../../hooks/useMasterData';

interface Rating {
  ratingId: string;
  bookingId: string;
  userId: string;
  ratedUserId: string;
  ratingType: 'passenger_to_driver' | 'driver_to_passenger';
  overallRating: number;
  punctuality?: number;
  vehicleCondition?: number;
  driving?: number;
  behavior?: number;
  communication?: number;
  service?: number;
  comment?: string;
  tags?: string[];
  createdAt: string;
  rater?: { userId: string; name: string; photo?: string };
  userName?: string;
  userPhoto?: string;
}

interface RatingBreakdown {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: { [key: number]: number };
  categoryAverages: { punctuality?: number; vehicleCondition?: number; driving?: number; behavior?: number; communication?: number; service?: number };
  recentTags: string[];
  asDriver?: { average: number; count: number };
  asPassenger?: { average: number; count: number };
}

const normalizeBreakdown = (data: any): RatingBreakdown => ({
  averageRating: data.averageRating ?? data.average ?? 0,
  totalRatings: data.totalRatings ?? data.total ?? 0,
  ratingDistribution: data.ratingDistribution ?? data.breakdown ?? {},
  categoryAverages: data.categoryAverages ?? {},
  recentTags: data.recentTags ?? [],
  asDriver: data.asDriver,
  asPassenger: data.asPassenger,
});

type RouteParams = { ReviewsScreen: { userId: string; userName?: string } };

const STAR_COLOR = '#FFB800';

const ReviewsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ReviewsScreen'>>();
  const { userId, userName } = route.params;
  const { theme } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<RatingBreakdown | null>(null);
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const { items: reviewTypeItems } = useMasterData('review_type', [
    { type: 'review_type', key: 'passenger_to_driver', label: 'As Driver' },
    { type: 'review_type', key: 'driver_to_passenger', label: 'As Rider' },
  ]);

  const fetchData = useCallback(async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const [breakdownRes, reviewsRes] = await Promise.all([
        reset || !breakdown ? ratingApi.getBreakdown(userId) : Promise.resolve(null),
        ratingApi.getUserRatingsDetails(userId, {
          page: currentPage,
          limit: 20,
          ratingType: selectedFilter !== 'all' ? selectedFilter : undefined,
        }),
      ]);

      if (breakdownRes?.success && breakdownRes.data) {
        setBreakdown(normalizeBreakdown(breakdownRes.data));
      }
      if (reviewsRes.success && reviewsRes.data) {
        const newReviews = reviewsRes.data.ratings || [];
        setReviews(reset ? newReviews : (prev) => [...prev, ...newReviews]);
        setHasMore(newReviews.length === 20);
        if (!reset) setPage(currentPage + 1);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, page, selectedFilter, breakdown]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchData(true);
  }, [selectedFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchData(true);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loading && hasMore) fetchData();
  };

  const fmtDate = (dateString: string) => {
    const d = new Date(dateString);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const ratingColor = (r: number) => {
    if (r >= 4) return '#4CAF50';
    if (r >= 3) return '#FF9800';
    if (r >= 2) return '#FF5722';
    return '#F44336';
  };

  const ratingWord = (r: number) => {
    if (r >= 4.5) return 'Excellent';
    if (r >= 3.5) return 'Very Good';
    if (r >= 2.5) return 'Good';
    if (r >= 1.5) return 'Fair';
    return 'Poor';
  };

  const humanize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  /* ── Stars ── */
  const Stars = ({ rating, size = 14 }: { rating: number; size?: number }) => (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} color={i <= rating ? STAR_COLOR : '#E0E0E0'} fill={i <= rating ? STAR_COLOR : 'transparent'} />
      ))}
    </View>
  );

  /* ── Bar ── */
  const Bar = ({ stars, count, total }: { stars: number; count: number; total: number }) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
      <View style={s.barRow}>
        <Text style={[s.barLabel, { color: theme.colors.textSecondary }]}>{stars}</Text>
        <Star size={9} color={STAR_COLOR} fill={STAR_COLOR} />
        <View style={[s.barTrack, { backgroundColor: theme.colors.border + '80' }]}>
          <View style={[s.barFill, { width: `${pct}%`, backgroundColor: ratingColor(stars) }]} />
        </View>
        <Text style={[s.barCount, { color: theme.colors.textSecondary }]}>{count}</Text>
      </View>
    );
  };

  /* ── Summary header ── */
  const SummaryHeader = () => {
    if (!breakdown) return null;
    const avg = breakdown.averageRating;
    return (
      <View style={[s.summaryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {/* Score + bars */}
        <View style={s.summaryRow}>
          <View style={s.scoreCol}>
            <Text style={[s.scoreNum, { color: theme.colors.text }]}>{avg.toFixed(1)}</Text>
            <Stars rating={Math.round(avg)} size={16} />
            <Text style={[s.scoreWord, { color: ratingColor(avg) }]}>{ratingWord(avg)}</Text>
            <Text style={[s.scoreCount, { color: theme.colors.textSecondary }]}>
              {breakdown.totalRatings} ratings
            </Text>
          </View>
          <View style={[s.scoreDivider, { backgroundColor: theme.colors.border }]} />
          <View style={s.barsCol}>
            {[5, 4, 3, 2, 1].map((n) => (
              <Bar key={n} stars={n} count={breakdown.ratingDistribution[n] || 0} total={breakdown.totalRatings} />
            ))}
          </View>
        </View>

        {/* Driver / Passenger split */}
        {(breakdown.asDriver?.count || breakdown.asPassenger?.count) ? (
          <View style={[s.splitRow, { borderTopColor: theme.colors.border }]}>
            {breakdown.asDriver && breakdown.asDriver.count > 0 && (
              <View style={[s.splitPill, { backgroundColor: '#EEF2FF' }]}>
                <Award size={14} color="#4F46E5" />
                <Text style={[s.splitPillLabel, { color: '#4F46E5' }]}>Driver</Text>
                <Text style={[s.splitPillValue, { color: '#4F46E5' }]}>{breakdown.asDriver.average.toFixed(1)}</Text>
                <Star size={10} color={STAR_COLOR} fill={STAR_COLOR} />
                <Text style={s.splitPillCount}>({breakdown.asDriver.count})</Text>
              </View>
            )}
            {breakdown.asPassenger && breakdown.asPassenger.count > 0 && (
              <View style={[s.splitPill, { backgroundColor: '#FFF7ED' }]}>
                <User size={14} color="#EA580C" />
                <Text style={[s.splitPillLabel, { color: '#EA580C' }]}>Rider</Text>
                <Text style={[s.splitPillValue, { color: '#EA580C' }]}>{breakdown.asPassenger.average.toFixed(1)}</Text>
                <Star size={10} color={STAR_COLOR} fill={STAR_COLOR} />
                <Text style={s.splitPillCount}>({breakdown.asPassenger.count})</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Tags */}
        {breakdown.recentTags?.length > 0 && (
          <View style={[s.tagsSection, { borderTopColor: theme.colors.border }]}>
            <View style={s.tagsSectionHeader}>
              <TrendingUp size={13} color={theme.colors.textSecondary} />
              <Text style={[s.tagsSectionTitle, { color: theme.colors.textSecondary }]}>Top mentions</Text>
            </View>
            <View style={s.tagsWrap}>
              {breakdown.recentTags.slice(0, 6).map((tag, i) => (
                <View key={i} style={[s.tagChip, { backgroundColor: theme.colors.primary + '10' }]}>
                  <Text style={[s.tagChipText, { color: theme.colors.primary }]}>{humanize(tag)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  /* ── Filter row ── */
  const filters = [
    { key: 'all', label: 'All' },
    ...reviewTypeItems.map((item: any) => ({
      key: String(item.value || item.key || '').toLowerCase(),
      label: String(item.label || item.value || item.key || ''),
    })).filter((item: any) => item.key),
  ];

  const FilterRow = () => (
    <View style={s.filterRow}>
      {filters.map((f) => {
        const active = selectedFilter === f.key;
        return (
          <TouchableOpacity
            key={f.key}
            onPress={() => selectedFilter !== f.key && setSelectedFilter(f.key)}
            style={[
              s.filterPill,
              { borderColor: active ? theme.colors.primary : theme.colors.border },
              active && { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text style={[s.filterPillText, { color: active ? '#FFF' : theme.colors.textSecondary }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      <View style={{ flex: 1 }} />
      <Text style={[s.resultCount, { color: theme.colors.textSecondary }]}>
        {reviews.length} review{reviews.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  /* ── Review card ── */
  const renderReview = ({ item }: { item: Rating }) => {
    const name = item.rater?.name || item.userName || 'User';
    const photo = item.rater?.photo || item.userPhoto || null;
    const isDriver = item.ratingType === 'passenger_to_driver';

    const categoryEntries = [
      { key: 'punctuality', label: 'Punctual', val: item.punctuality },
      { key: 'vehicleCondition', label: 'Vehicle', val: item.vehicleCondition },
      { key: 'driving', label: 'Driving', val: item.driving },
      { key: 'behavior', label: 'Behavior', val: item.behavior },
      { key: 'communication', label: 'Comms', val: item.communication },
    ].filter((c) => c.val != null);

    return (
      <View style={[s.reviewCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {/* Header */}
        <View style={s.reviewTop}>
          {photo ? (
            <Image source={{ uri: photo }} style={s.avatar} />
          ) : (
            <View style={[s.avatarFallback, { backgroundColor: theme.colors.primary + '15' }]}>
              <Text style={[s.avatarLetter, { color: theme.colors.primary }]}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <View style={s.reviewInfo}>
            <Text style={[s.reviewName, { color: theme.colors.text }]}>{name}</Text>
            <View style={s.reviewMeta}>
              <Text style={[s.reviewType, { color: isDriver ? '#4F46E5' : '#EA580C' }]}>
                {isDriver ? 'Driver' : 'Rider'}
              </Text>
              <View style={s.dot} />
              <Text style={[s.reviewDate, { color: theme.colors.textSecondary }]}>{fmtDate(item.createdAt)}</Text>
            </View>
          </View>

          <View style={[s.ratingPill, { backgroundColor: ratingColor(item.overallRating) }]}>
            <Star size={11} color="#FFF" fill="#FFF" />
            <Text style={s.ratingPillText}>{Number(item.overallRating).toFixed(1)}</Text>
          </View>
        </View>

        {/* Comment */}
        {item.comment ? (
          <Text style={[s.comment, { color: theme.colors.text }]}>{item.comment}</Text>
        ) : null}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View style={s.reviewTagsRow}>
            {item.tags.map((tag, i) => (
              <View key={i} style={[s.reviewTag, { backgroundColor: theme.colors.primary + '0D' }]}>
                <ThumbsUp size={9} color={theme.colors.primary} />
                <Text style={[s.reviewTagText, { color: theme.colors.primary }]}>{humanize(tag)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Category mini-bars */}
        {categoryEntries.length > 0 && (
          <View style={[s.catRow, { borderTopColor: theme.colors.border + '60' }]}>
            {categoryEntries.map((c) => (
              <View key={c.key} style={s.catItem}>
                <Text style={[s.catLabel, { color: theme.colors.textSecondary }]}>{c.label}</Text>
                <View style={s.catValueRow}>
                  <Star size={9} color={STAR_COLOR} fill={STAR_COLOR} />
                  <Text style={[s.catValue, { color: theme.colors.text }]}>{Number(c.val).toFixed(1)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  /* ── Main render ── */
  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={s.headerTitles}>
          <Text style={[s.headerTitle, { color: theme.colors.text }]}>
            {userName ? `${userName}'s Reviews` : 'Reviews'}
          </Text>
          {breakdown && (
            <Text style={[s.headerSub, { color: theme.colors.textSecondary }]}>
              {breakdown.averageRating.toFixed(1)} avg · {breakdown.totalRatings} total
            </Text>
          )}
        </View>
      </View>

      {loading && reviews.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.ratingId}
          renderItem={renderReview}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={() => (
            <>
              <SummaryHeader />
              <FilterRow />
            </>
          )}
          ListEmptyComponent={() => (
            <View style={s.emptyWrap}>
              <View style={[s.emptyCircle, { backgroundColor: theme.colors.border + '40' }]}>
                <MessageSquare size={28} color={theme.colors.textSecondary} />
              </View>
              <Text style={[s.emptyTitle, { color: theme.colors.text }]}>No reviews yet</Text>
              <Text style={[s.emptySub, { color: theme.colors.textSecondary }]}>
                Reviews appear after trips are completed and rated
              </Text>
            </View>
          )}
          ListFooterComponent={loading && hasMore ? <ActivityIndicator style={{ paddingVertical: normalize(20) }} color={theme.colors.primary} /> : null}
        />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: normalize(48),
    paddingBottom: normalize(14),
    paddingHorizontal: normalize(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: normalize(36),
    height: normalize(36),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: normalize(8),
  },
  headerTitles: { flex: 1 },
  headerTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(22),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    marginTop: normalize(1),
  },

  /* Summary */
  summaryCard: {
    borderRadius: normalize(12),
    borderWidth: StyleSheet.hairlineWidth,
    padding: normalize(16),
    marginBottom: normalize(14),
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  scoreCol: {
    alignItems: 'center',
    minWidth: normalize(80),
    marginRight: normalize(16),
  },
  scoreNum: {
    fontFamily: FONTS.medium,
    fontSize: normalize(40),
    fontWeight: '700',
    lineHeight: normalize(46),
  },
  scoreWord: {
    fontFamily: FONTS.medium,
    fontSize: normalize(11),
    fontWeight: '700',
    marginTop: normalize(4),
  },
  scoreCount: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10.5),
    marginTop: normalize(2),
  },
  scoreDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginRight: normalize(16),
  },
  barsCol: {
    flex: 1,
    justifyContent: 'center',
    gap: normalize(3),
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10.5),
    width: normalize(12),
    textAlign: 'center',
    marginRight: normalize(3),
  },
  barTrack: {
    flex: 1,
    height: normalize(5),
    borderRadius: normalize(3),
    marginHorizontal: normalize(5),
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: normalize(3),
  },
  barCount: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10.5),
    width: normalize(22),
    textAlign: 'right',
  },

  /* Split row */
  splitRow: {
    flexDirection: 'row',
    gap: normalize(8),
    marginTop: normalize(14),
    paddingTop: normalize(14),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  splitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(5),
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(7),
    borderRadius: normalize(8),
  },
  splitPillLabel: {
    fontFamily: FONTS.medium,
    fontSize: normalize(11),
    fontWeight: '600',
  },
  splitPillValue: {
    fontFamily: FONTS.medium,
    fontSize: normalize(13),
    fontWeight: '700',
  },
  splitPillCount: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    color: '#9CA3AF',
  },

  /* Tags */
  tagsSection: {
    marginTop: normalize(14),
    paddingTop: normalize(14),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tagsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(5),
    marginBottom: normalize(8),
  },
  tagsSectionTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(11.5),
    fontWeight: '600',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(6),
  },
  tagChip: {
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(5),
    borderRadius: normalize(20),
  },
  tagChipText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(11),
    fontWeight: '500',
  },

  /* Filters */
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
    marginBottom: normalize(14),
  },
  filterPill: {
    paddingHorizontal: normalize(14),
    paddingVertical: normalize(7),
    borderRadius: normalize(20),
    borderWidth: 1,
  },
  filterPillText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    fontWeight: '600',
  },
  resultCount: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
  },

  /* Review card */
  reviewCard: {
    borderRadius: normalize(12),
    borderWidth: StyleSheet.hairlineWidth,
    padding: normalize(14),
    marginBottom: normalize(10),
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(10),
  },
  avatar: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
  },
  avatarFallback: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: FONTS.medium,
    fontSize: normalize(16),
    fontWeight: '700',
  },
  reviewInfo: { flex: 1 },
  reviewName: {
    fontFamily: FONTS.medium,
    fontSize: normalize(14),
    fontWeight: '600',
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(5),
    marginTop: normalize(2),
  },
  reviewType: {
    fontFamily: FONTS.medium,
    fontSize: normalize(11),
    fontWeight: '600',
  },
  dot: {
    width: normalize(3),
    height: normalize(3),
    borderRadius: normalize(1.5),
    backgroundColor: '#BDBDBD',
  },
  reviewDate: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(3),
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(4),
    borderRadius: normalize(6),
  },
  ratingPillText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    fontWeight: '700',
    color: '#FFF',
  },
  comment: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    lineHeight: normalize(20),
    marginTop: normalize(10),
  },
  reviewTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(5),
    marginTop: normalize(10),
  },
  reviewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(4),
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(4),
    borderRadius: normalize(14),
  },
  reviewTagText: {
    fontFamily: FONTS.medium,
    fontSize: normalize(10.5),
    fontWeight: '500',
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalize(12),
    marginTop: normalize(10),
    paddingTop: normalize(10),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  catItem: {
    alignItems: 'center',
    minWidth: normalize(48),
  },
  catLabel: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    marginBottom: normalize(2),
  },
  catValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(2),
  },
  catValue: {
    fontFamily: FONTS.medium,
    fontSize: normalize(12),
    fontWeight: '700',
  },

  /* List */
  listContent: {
    paddingHorizontal: normalize(16),
    paddingTop: normalize(14),
    paddingBottom: normalize(30),
  },

  /* Center / empty */
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: normalize(60),
  },
  emptyCircle: {
    width: normalize(64),
    height: normalize(64),
    borderRadius: normalize(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: normalize(16),
  },
  emptyTitle: {
    fontFamily: FONTS.medium,
    fontSize: normalize(16),
    fontWeight: '700',
    marginBottom: normalize(4),
  },
  emptySub: {
    fontFamily: FONTS.regular,
    fontSize: normalize(13),
    textAlign: 'center',
    paddingHorizontal: normalize(40),
  },
});

export default ReviewsScreen;
