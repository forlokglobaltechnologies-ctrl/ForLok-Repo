import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  ImageBackground,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Star, User, CheckCircle, ChevronDown, X } from 'lucide-react-native';
import { normalize, wp, hp } from '@utils/responsive';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Button } from '@components/common/Button';
import { Card } from '@components/common/Card';
import { ratingApi, bookingApi } from '@utils/apiClient';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';

const RatingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const params = route.params as any;

  // Can receive full booking object or just bookingId
  const [booking, setBooking] = useState<any>(params?.booking || null);
  const [loading, setLoading] = useState(!params?.booking);
  const [submitting, setSubmitting] = useState(false);
  const [canRate, setCanRate] = useState<any>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);

  const [overallRating, setOverallRating] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [vehicleCondition, setVehicleCondition] = useState(0);
  const [driving, setDriving] = useState(0);
  const [behavior, setBehavior] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [review, setReview] = useState('');

  const bookingId = booking?.bookingId || params?.bookingId;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const targetBookingId = params?.booking?.bookingId || params?.bookingId;

      if (!targetBookingId) {
        Alert.alert('Error', 'No booking information provided');
        navigation.goBack();
        return;
      }

      // Fetch booking details if not passed
      if (!params?.booking) {
        const bookingRes = await bookingApi.getBooking(targetBookingId);
        if (bookingRes.success && bookingRes.data) {
          setBooking(bookingRes.data);
        } else {
          Alert.alert('Error', 'Could not load booking details');
          navigation.goBack();
          return;
        }
      }

      // Check if user can rate
      const canRateRes = await ratingApi.canRate(targetBookingId);
      if (canRateRes.success && canRateRes.data) {
        setCanRate(canRateRes.data);

        if (!canRateRes.data.canRate) {
          Alert.alert(
            'Cannot Rate',
            canRateRes.data.reason || 'You cannot rate this trip',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }

        // Load available tags based on rating type
        if (canRateRes.data.ratingType) {
          const tagsRes = await ratingApi.getTags(canRateRes.data.ratingType);
          if (tagsRes.success && tagsRes.data) {
            setTags(Array.isArray(tagsRes.data) ? tagsRes.data : []);
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading rating data:', error);
      Alert.alert('Error', 'Failed to load rating data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      Alert.alert('Error', 'Please provide an overall rating');
      return;
    }

    if (!canRate?.ratedUserId || !canRate?.ratingType) {
      Alert.alert('Error', 'Rating information is incomplete');
      return;
    }

    try {
      setSubmitting(true);

      const ratingData: any = {
        bookingId,
        ratedUserId: canRate.ratedUserId,
        serviceType: booking?.serviceType || 'pooling',
        ratingType: canRate.ratingType,
        overallRating,
        comment: review.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      };

      if (punctuality > 0) ratingData.punctuality = punctuality;
      if (vehicleCondition > 0) ratingData.vehicleCondition = vehicleCondition;
      if (driving > 0) ratingData.driving = driving;
      if (behavior > 0) ratingData.behavior = behavior;
      if (communication > 0) ratingData.communication = communication;

      const response = await ratingApi.create(ratingData);

      if (response.success) {
        Alert.alert(
          t('rating.thankYou'),
          'Your review has been submitted successfully.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to submit rating');
      }
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', error.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const formatTag = (tag: string) => {
    return tag
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getRatingLabel = (rating: number) => {
    if (rating === 0) return '';
    if (rating === 1) return 'Poor';
    if (rating === 2) return 'Fair';
    if (rating === 3) return 'Good';
    if (rating === 4) return 'Very Good';
    return 'Excellent';
  };

  const renderStars = (rating: number, onRatingChange: (rating: number) => void, size = 36) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRatingChange(star)}
            style={styles.starButton}
            activeOpacity={0.7}
          >
            <Star
              size={size}
              color={star <= rating ? COLORS.warning : theme.colors.border}
              fill={star <= rating ? COLORS.warning : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMiniStars = (rating: number, onRatingChange: (rating: number) => void) => {
    return (
      <View style={styles.miniStarsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRatingChange(star)}
            style={styles.miniStarButton}
            activeOpacity={0.7}
          >
            <Star
              size={22}
              color={star <= rating ? COLORS.warning : theme.colors.border}
              fill={star <= rating ? COLORS.warning : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Determine who we're rating
  const isRatingDriver = canRate?.ratingType === 'passenger_to_driver';
  const ratedUserName = canRate?.ratedUserName || booking?.driver?.name || booking?.owner?.name || 'User';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ImageBackground
          source={require('../../../assets/rate.png')}
          style={styles.headerImage}
          resizeMode="cover"
        >
          <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
          <BlurView intensity={50} style={styles.blurContainer}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <ArrowLeft size={20} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{t('rating.title')}</Text>
            </View>
          </BlurView>
        </ImageBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with image + blue overlay */}
      <ImageBackground
        source={require('../../../assets/rate.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={50} style={styles.blurContainer}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <ArrowLeft size={20} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{t('rating.title')}</Text>
              <Text style={styles.headerSubtitle}>
                {isRatingDriver ? t('rating.rateDriver') : 'Rate Passenger'}
              </Text>
            </View>
          </View>
        </BlurView>
      </ImageBackground>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        <Card style={[styles.userCard, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary + '15' }]}>
            <User size={32} color={theme.colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>{ratedUserName}</Text>
            <Text style={[styles.userRole, { color: theme.colors.textSecondary }]}>
              {isRatingDriver ? 'Driver' : 'Passenger'}
            </Text>
          </View>
        </Card>

        {/* Overall Rating */}
        <Card style={[styles.ratingCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('rating.howWasTrip')}
          </Text>
          {renderStars(overallRating, setOverallRating)}
          {overallRating > 0 ? (
            <Text style={[styles.ratingLabel, { color: theme.colors.primary }]}>
              {getRatingLabel(overallRating)}
            </Text>
          ) : (
            <Text style={[styles.ratingHint, { color: theme.colors.textSecondary }]}>
              {t('rating.tapToRate')}
            </Text>
          )}
        </Card>

        {/* Quick Tags - Multi-select Dropdown */}
        {tags.length > 0 && (
          <Card style={[styles.tagsCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('rating.quickTags')}
            </Text>

            {/* Dropdown Trigger */}
            <TouchableOpacity
              style={[styles.dropdownTrigger, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              onPress={() => setShowTagsDropdown(true)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dropdownText,
                  { color: selectedTags.length > 0 ? theme.colors.text : theme.colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {selectedTags.length > 0
                  ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`
                  : t('rating.selectTags')}
              </Text>
              <ChevronDown size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            {/* Selected Tags Display */}
            {selectedTags.length > 0 && (
              <View style={styles.selectedTagsRow}>
                {selectedTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.selectedTag, { backgroundColor: theme.colors.primary + '15' }]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.selectedTagText, { color: theme.colors.primary }]}>
                      {formatTag(tag)}
                    </Text>
                    <X size={14} color={theme.colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Tags Dropdown Modal */}
            <Modal
              visible={showTagsDropdown}
              transparent
              animationType="fade"
              onRequestClose={() => setShowTagsDropdown(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowTagsDropdown(false)}
              >
                <View style={[styles.dropdownModal, { backgroundColor: theme.colors.surface }]}>
                  <View style={[styles.dropdownHeader, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.dropdownTitle, { color: theme.colors.text }]}>
                      {t('rating.quickTags')}
                    </Text>
                    <TouchableOpacity onPress={() => setShowTagsDropdown(false)}>
                      <X size={22} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={tags}
                    keyExtractor={(item) => item}
                    style={styles.dropdownList}
                    renderItem={({ item }) => {
                      const isSelected = selectedTags.includes(item);
                      return (
                        <TouchableOpacity
                          style={[
                            styles.dropdownItem,
                            { borderBottomColor: theme.colors.border },
                            isSelected && { backgroundColor: theme.colors.primary + '08' },
                          ]}
                          onPress={() => toggleTag(item)}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              { borderColor: theme.colors.border },
                              isSelected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                            ]}
                          >
                            {isSelected && <CheckCircle size={14} color={COLORS.white} />}
                          </View>
                          <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>
                            {formatTag(item)}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.dropdownDone, { backgroundColor: theme.colors.primary }]}
                    onPress={() => setShowTagsDropdown(false)}
                  >
                    <Text style={styles.dropdownDoneText}>Done ({selectedTags.length} selected)</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          </Card>
        )}

        {/* Written Review */}
        <Card style={[styles.reviewCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('rating.writeReview')}
          </Text>
          <TextInput
            style={[
              styles.reviewInput,
              {
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            value={review}
            onChangeText={setReview}
            placeholder={t('rating.shareExperience')}
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={4}
            maxLength={1000}
          />
          <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
            {review.length}/1000
          </Text>
        </Card>

        {/* Specific Aspect Ratings */}
        <Card style={[styles.aspectsCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('rating.rateSpecificAspects')}
          </Text>
          <Text style={[styles.optionalHint, { color: theme.colors.textSecondary }]}>
            (Optional)
          </Text>

          <View style={[styles.aspectRow, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.aspectLabel, { color: theme.colors.text }]}>
              {t('rating.punctuality')}
            </Text>
            {renderMiniStars(punctuality, setPunctuality)}
          </View>

          {isRatingDriver && (
            <>
              <View style={[styles.aspectRow, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.aspectLabel, { color: theme.colors.text }]}>
                  {t('rating.vehicleCondition')}
                </Text>
                {renderMiniStars(vehicleCondition, setVehicleCondition)}
              </View>

              <View style={[styles.aspectRow, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.aspectLabel, { color: theme.colors.text }]}>
                  {t('rating.driving')}
                </Text>
                {renderMiniStars(driving, setDriving)}
              </View>
            </>
          )}

          {!isRatingDriver && (
            <View style={[styles.aspectRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.aspectLabel, { color: theme.colors.text }]}>Behavior</Text>
              {renderMiniStars(behavior, setBehavior)}
            </View>
          )}

          <View style={[styles.aspectRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.aspectLabel, { color: theme.colors.text }]}>Communication</Text>
            {renderMiniStars(communication, setCommunication)}
          </View>
        </Card>

        {/* Submit Button */}
        <Button
          title={submitting ? 'Submitting...' : t('rating.submitReview')}
          onPress={handleSubmit}
          variant="primary"
          size="large"
          style={styles.submitButton}
          disabled={overallRating === 0 || submitting}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // ===== Header with image =====
  headerImage: {
    width: '100%',
    height: hp(25),
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  blurContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: '100%',
    position: 'relative',
  },
  backButton: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: SPACING.md,
    top: SPACING.xl,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xxl || 24,
    color: COLORS.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white + 'CC',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  // ===== Loading =====
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    marginTop: SPACING.md,
  },
  // ===== Content =====
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  // ===== User Card =====
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  avatarCircle: {
    width: normalize(56),
    height: normalize(56),
    borderRadius: normalize(28),
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  userName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  userRole: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    marginTop: normalize(2),
  },
  // ===== Section Title =====
  sectionTitle: {
    fontFamily: FONTS.medium || FONTS.regular,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  // ===== Overall Rating =====
  ratingCard: {
    alignItems: 'center',
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  starButton: {
    padding: SPACING.xs,
  },
  ratingLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  ratingHint: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    marginTop: SPACING.sm,
  },
  // ===== Tags Dropdown =====
  tagsCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  dropdownText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    flex: 1,
  },
  selectedTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + normalize(2),
    borderRadius: BORDER_RADIUS.full,
  },
  selectedTagText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  // ===== Dropdown Modal =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  dropdownModal: {
    borderRadius: BORDER_RADIUS.lg,
    maxHeight: hp(52),
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  dropdownTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  dropdownList: {
    maxHeight: normalize(300),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  checkbox: {
    width: normalize(24),
    height: normalize(24),
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownItemText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    flex: 1,
  },
  dropdownDone: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  dropdownDoneText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    fontWeight: '600',
  },
  // ===== Review Input =====
  reviewCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  reviewInput: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    minHeight: normalize(110),
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  // ===== Aspect Ratings =====
  aspectsCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  optionalHint: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
  },
  aspectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + normalize(2),
    borderBottomWidth: 1,
  },
  aspectLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    flex: 1,
  },
  miniStarsContainer: {
    flexDirection: 'row',
    gap: normalize(2),
  },
  miniStarButton: {
    padding: normalize(3),
  },
  // ===== Submit =====
  submitButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
});

export default RatingScreen;
