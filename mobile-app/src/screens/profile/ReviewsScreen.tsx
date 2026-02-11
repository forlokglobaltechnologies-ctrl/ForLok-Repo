import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  ImageBackground,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  ArrowLeft,
  Star,
  User,
  MessageSquare,
  ThumbsUp,
  Calendar,
  TrendingUp,
  Award,
  ChevronDown,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { ratingApi } from '@utils/apiClient';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  rater?: {
    userId: string;
    name: string;
    photo?: string;
  };
  // Legacy fields (may not exist)
  userName?: string;
  userPhoto?: string;
}

interface RatingBreakdown {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: { [key: number]: number };
  categoryAverages: {
    punctuality?: number;
    vehicleCondition?: number;
    driving?: number;
    behavior?: number;
    communication?: number;
    service?: number;
  };
  recentTags: string[];
  asDriver?: { average: number; count: number };
  asPassenger?: { average: number; count: number };
}

// Normalize backend response to match RatingBreakdown interface
const normalizeBreakdown = (data: any): RatingBreakdown => ({
  averageRating: data.averageRating ?? data.average ?? 0,
  totalRatings: data.totalRatings ?? data.total ?? 0,
  ratingDistribution: data.ratingDistribution ?? data.breakdown ?? {},
  categoryAverages: data.categoryAverages ?? {},
  recentTags: data.recentTags ?? [],
  asDriver: data.asDriver,
  asPassenger: data.asPassenger,
});

type RouteParams = {
  ReviewsScreen: {
    userId: string;
    userName?: string;
  };
};

const ReviewsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ReviewsScreen'>>();
  const { userId, userName } = route.params;
  const { t } = useLanguage();
  const { theme } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<RatingBreakdown | null>(null);
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

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
        if (reset) {
          setReviews(newReviews);
        } else {
          setReviews((prev) => [...prev, ...newReviews]);
        }
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
    if (!loading && hasMore) {
      fetchData();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 3.5) return 'Very Good';
    if (rating >= 2.5) return 'Good';
    if (rating >= 1.5) return 'Fair';
    return 'Poor';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return '#4CAF50';
    if (rating >= 3) return '#FF9800';
    if (rating >= 2) return '#FF5722';
    return '#F44336';
  };

  const getReviewerName = (item: Rating): string => {
    // Backend provides rater object with enriched user data
    if (item.rater?.name) return item.rater.name;
    // Fallback to legacy fields
    if (item.userName) return item.userName;
    return 'User';
  };

  const getReviewerPhoto = (item: Rating): string | null => {
    if (item.rater?.photo) return item.rater.photo;
    if (item.userPhoto) return item.userPhoto;
    return null;
  };

  const renderStars = (rating: number, size = 16) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            color={star <= rating ? '#FFB800' : '#E0E0E0'}
            fill={star <= rating ? '#FFB800' : 'transparent'}
          />
        ))}
      </View>
    );
  };

  const renderRatingBar = (stars: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <View style={styles.ratingBarRow} key={stars}>
        <Text style={[styles.ratingBarLabel, { color: theme.colors.textSecondary }]}>{stars}</Text>
        <Star size={10} color="#FFB800" fill="#FFB800" />
        <View style={[styles.ratingBarContainer, { backgroundColor: theme.colors.border }]}>
          <View
            style={[
              styles.ratingBarFill,
              { width: `${percentage}%`, backgroundColor: getRatingColor(stars) },
            ]}
          />
        </View>
        <Text style={[styles.ratingBarCount, { color: theme.colors.textSecondary }]}>{count}</Text>
      </View>
    );
  };

  const renderReview = ({ item }: { item: Rating }) => {
    const reviewerName = getReviewerName(item);
    const reviewerPhoto = getReviewerPhoto(item);
    const ratingColor = getRatingColor(item.overallRating);
    const isDriverReview = item.ratingType === 'passenger_to_driver';

    return (
      <View style={[styles.reviewCard, { backgroundColor: theme.colors.surface }]}>
        {/* Review Header */}
        <View style={styles.reviewHeader}>
          <View style={styles.reviewerInfo}>
            {reviewerPhoto ? (
              <Image source={{ uri: reviewerPhoto }} style={styles.reviewerAvatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={[styles.avatarInitial, { color: theme.colors.primary }]}>
                  {reviewerName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.reviewerDetails}>
              <Text style={[styles.reviewerName, { color: theme.colors.text }]}>{reviewerName}</Text>
              <View style={styles.reviewMetaRow}>
                <View style={[styles.typeBadge, { backgroundColor: isDriverReview ? '#E3F2FD' : '#FFF3E0' }]}>
                  <Text style={[styles.typeBadgeText, { color: isDriverReview ? '#1565C0' : '#E65100' }]}>
                    {isDriverReview ? 'As Driver' : 'As Passenger'}
                  </Text>
                </View>
                <Text style={[styles.reviewDate, { color: theme.colors.textSecondary }]}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.ratingBadge, { backgroundColor: ratingColor }]}>
            <Star size={12} color="#FFF" fill="#FFF" />
            <Text style={styles.ratingBadgeText}>{Number(item.overallRating).toFixed(1)}</Text>
          </View>
        </View>

        {/* Comment */}
        {item.comment ? (
          <Text style={[styles.reviewComment, { color: theme.colors.text }]}>{item.comment}</Text>
        ) : null}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: theme.colors.primary + '12' }]}>
                <ThumbsUp size={10} color={theme.colors.primary} />
                <Text style={[styles.tagText, { color: theme.colors.primary }]}>
                  {tag.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Category Ratings */}
        {(item.punctuality != null ||
          item.vehicleCondition != null ||
          item.driving != null ||
          item.behavior != null ||
          item.communication != null) && (
          <View style={[styles.categoryRatings, { borderTopColor: theme.colors.border }]}>
            {item.punctuality != null && (
              <View style={styles.categoryItem}>
                <Text style={[styles.categoryLabel, { color: theme.colors.textSecondary }]}>Punctuality</Text>
                <View style={styles.categoryValueRow}>
                  <Star size={10} color="#FFB800" fill="#FFB800" />
                  <Text style={[styles.categoryValue, { color: theme.colors.text }]}>
                    {Number(item.punctuality).toFixed(1)}
                  </Text>
                </View>
              </View>
            )}
            {item.vehicleCondition != null && (
              <View style={styles.categoryItem}>
                <Text style={[styles.categoryLabel, { color: theme.colors.textSecondary }]}>Vehicle</Text>
                <View style={styles.categoryValueRow}>
                  <Star size={10} color="#FFB800" fill="#FFB800" />
                  <Text style={[styles.categoryValue, { color: theme.colors.text }]}>
                    {Number(item.vehicleCondition).toFixed(1)}
                  </Text>
                </View>
              </View>
            )}
            {item.driving != null && (
              <View style={styles.categoryItem}>
                <Text style={[styles.categoryLabel, { color: theme.colors.textSecondary }]}>Driving</Text>
                <View style={styles.categoryValueRow}>
                  <Star size={10} color="#FFB800" fill="#FFB800" />
                  <Text style={[styles.categoryValue, { color: theme.colors.text }]}>
                    {Number(item.driving).toFixed(1)}
                  </Text>
                </View>
              </View>
            )}
            {item.behavior != null && (
              <View style={styles.categoryItem}>
                <Text style={[styles.categoryLabel, { color: theme.colors.textSecondary }]}>Behavior</Text>
                <View style={styles.categoryValueRow}>
                  <Star size={10} color="#FFB800" fill="#FFB800" />
                  <Text style={[styles.categoryValue, { color: theme.colors.text }]}>
                    {Number(item.behavior).toFixed(1)}
                  </Text>
                </View>
              </View>
            )}
            {item.communication != null && (
              <View style={styles.categoryItem}>
                <Text style={[styles.categoryLabel, { color: theme.colors.textSecondary }]}>Communication</Text>
                <View style={styles.categoryValueRow}>
                  <Star size={10} color="#FFB800" fill="#FFB800" />
                  <Text style={[styles.categoryValue, { color: theme.colors.text }]}>
                    {Number(item.communication).toFixed(1)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const filters = [
    { key: 'all', label: 'All Reviews' },
    { key: 'passenger_to_driver', label: 'As Driver' },
    { key: 'driver_to_passenger', label: 'As Passenger' },
  ];

  if (loading && !refreshing && reviews.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ImageBackground
          source={require('../../../assets/reviews.png')}
          style={styles.headerImage}
          resizeMode="cover"
        >
          <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
          <BlurView intensity={40} style={styles.blurContainer}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <ArrowLeft size={22} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Reviews & Ratings</Text>
              <View style={styles.headerPlaceholder} />
            </View>
          </BlurView>
        </ImageBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading reviews...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Hero Header with Image */}
      <ImageBackground
        source={require('../../../assets/reviews.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={40} style={styles.blurContainer}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>
                {userName ? `${userName}'s Reviews` : 'Reviews & Ratings'}
              </Text>
              {breakdown && (
                <Text style={styles.headerSubtitle}>
                  {breakdown.totalRatings} reviews
                </Text>
              )}
            </View>
            <View style={styles.headerPlaceholder} />
          </View>
        </BlurView>
      </ImageBackground>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.ratingId}
        renderItem={renderReview}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={() => (
          <>
            {/* Overall Rating Summary Card */}
            {breakdown && (
              <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
                {/* Big rating number + stars */}
                <View style={styles.summaryTop}>
                  <View style={styles.summaryLeft}>
                    <Text style={[styles.bigRating, { color: theme.colors.text }]}>
                      {breakdown.averageRating.toFixed(1)}
                    </Text>
                    {renderStars(Math.round(breakdown.averageRating), 18)}
                    <Text style={[styles.ratingLabel, { color: getRatingColor(breakdown.averageRating) }]}>
                      {getRatingLabel(breakdown.averageRating)}
                    </Text>
                    <Text style={[styles.totalCount, { color: theme.colors.textSecondary }]}>
                      Based on {breakdown.totalRatings} reviews
                    </Text>
                  </View>

                  {/* Distribution bars */}
                  <View style={styles.summaryRight}>
                    {[5, 4, 3, 2, 1].map((stars) =>
                      renderRatingBar(
                        stars,
                        breakdown.ratingDistribution[stars] || 0,
                        breakdown.totalRatings
                      )
                    )}
                  </View>
                </View>

                {/* As Driver / As Passenger split */}
                {(breakdown.asDriver || breakdown.asPassenger) && (
                  <View style={[styles.splitRatings, { borderTopColor: theme.colors.border }]}>
                    {breakdown.asDriver && breakdown.asDriver.count > 0 && (
                      <View style={[styles.splitItem, { backgroundColor: '#E3F2FD' }]}>
                        <Award size={16} color="#1565C0" />
                        <View style={styles.splitInfo}>
                          <Text style={styles.splitLabel}>As Driver</Text>
                          <View style={styles.splitValueRow}>
                            <Text style={[styles.splitValue, { color: '#1565C0' }]}>
                              {breakdown.asDriver.average.toFixed(1)}
                            </Text>
                            <Star size={12} color="#FFB800" fill="#FFB800" />
                            <Text style={styles.splitCount}>({breakdown.asDriver.count})</Text>
                          </View>
                        </View>
                      </View>
                    )}
                    {breakdown.asPassenger && breakdown.asPassenger.count > 0 && (
                      <View style={[styles.splitItem, { backgroundColor: '#FFF3E0' }]}>
                        <User size={16} color="#E65100" />
                        <View style={styles.splitInfo}>
                          <Text style={styles.splitLabel}>As Passenger</Text>
                          <View style={styles.splitValueRow}>
                            <Text style={[styles.splitValue, { color: '#E65100' }]}>
                              {breakdown.asPassenger.average.toFixed(1)}
                            </Text>
                            <Star size={12} color="#FFB800" fill="#FFB800" />
                            <Text style={styles.splitCount}>({breakdown.asPassenger.count})</Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Popular Tags */}
                {breakdown.recentTags && breakdown.recentTags.length > 0 && (
                  <View style={[styles.popularTags, { borderTopColor: theme.colors.border }]}>
                    <View style={styles.popularTagsHeader}>
                      <TrendingUp size={14} color={theme.colors.primary} />
                      <Text style={[styles.popularTagsTitle, { color: theme.colors.text }]}>
                        Popular Mentions
                      </Text>
                    </View>
                    <View style={styles.popularTagsRow}>
                      {breakdown.recentTags.slice(0, 6).map((tag, index) => (
                        <View key={index} style={[styles.popularTag, { backgroundColor: theme.colors.primary + '12' }]}>
                          <Text style={[styles.popularTagText, { color: theme.colors.primary }]}>
                            {tag.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Filter Tabs */}
            <View style={[styles.filterContainer, { backgroundColor: theme.colors.surface }]}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterTab,
                    selectedFilter === filter.key && [styles.filterTabActive, { backgroundColor: theme.colors.primary }],
                  ]}
                  onPress={() => {
                    if (selectedFilter !== filter.key) {
                      setSelectedFilter(filter.key);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      { color: theme.colors.textSecondary },
                      selectedFilter === filter.key && styles.filterTabTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Reviews count label */}
            <Text style={[styles.reviewsSectionLabel, { color: theme.colors.textSecondary }]}>
              {reviews.length > 0
                ? `Showing ${reviews.length} review${reviews.length !== 1 ? 's' : ''}`
                : ''}
            </Text>
          </>
        )}
        ListEmptyComponent={() => (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.emptyIconWrapper, { backgroundColor: theme.colors.primary + '15' }]}>
              <MessageSquare size={40} color={theme.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Reviews Yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Reviews will appear here once trips are completed and rated.
            </Text>
          </View>
        )}
        ListFooterComponent={() =>
          loading && hasMore ? (
            <ActivityIndicator style={styles.footerLoader} color={theme.colors.primary} />
          ) : null
        }
      />
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
    fontSize: 20,
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

  // ── List ──
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },

  // ── Summary Card ──
  summaryCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  summaryTop: {
    flexDirection: 'row',
  },
  summaryLeft: {
    alignItems: 'center',
    paddingRight: SPACING.lg,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    marginRight: SPACING.lg,
    minWidth: 90,
  },
  bigRating: {
    fontFamily: FONTS.regular,
    fontSize: 44,
    fontWeight: 'bold',
    lineHeight: 50,
  },
  ratingLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    marginTop: 4,
  },
  totalCount: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    marginTop: 2,
  },
  summaryRight: {
    flex: 1,
    justifyContent: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingBarLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    width: 12,
    marginRight: 2,
    textAlign: 'center',
  },
  ratingBarContainer: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginHorizontal: SPACING.xs,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  ratingBarCount: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    width: 22,
    textAlign: 'right',
  },

  // ── Split Ratings (Driver/Passenger) ──
  splitRatings: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  splitItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  splitInfo: {
    flex: 1,
  },
  splitLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  splitValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  splitValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
  },
  splitCount: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: '#999',
  },

  // ── Popular Tags ──
  popularTags: {
    borderTopWidth: 1,
    paddingTop: SPACING.md,
    marginTop: SPACING.md,
  },
  popularTagsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  popularTagsTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  popularTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  popularTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.round,
  },
  popularTagText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '500',
  },

  // ── Filter Tabs ──
  filterContainer: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  filterTabActive: {
    ...SHADOWS.sm,
  },
  filterTabText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },

  // ── Reviews Section Label ──
  reviewsSectionLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    marginBottom: SPACING.sm,
    paddingLeft: 4,
  },

  // ── Review Card ──
  reviewCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  reviewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    fontWeight: 'bold',
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 3,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
  },
  typeBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    fontWeight: '600',
  },
  reviewDate: {
    fontFamily: FONTS.regular,
    fontSize: 11,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
    marginLeft: SPACING.xs,
  },
  ratingBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFF',
  },

  // ── Comment ──
  reviewComment: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },

  // ── Tags ──
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  tagText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '500',
  },

  // ── Category Ratings ──
  categoryRatings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  categoryItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  categoryLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    marginBottom: 2,
  },
  categoryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  categoryValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: 'bold',
  },

  // ── Empty State ──
  emptyCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Footer ──
  footerLoader: {
    paddingVertical: SPACING.lg,
  },
});

export default ReviewsScreen;
