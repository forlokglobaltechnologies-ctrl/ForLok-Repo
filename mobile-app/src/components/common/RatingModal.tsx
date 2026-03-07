import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import {
  X,
  Star,
  ThumbsUp,
  User,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { normalize } from '@utils/responsive';
import { ratingApi } from '@utils/apiClient';
import { AppLoader } from '@components/common/AppLoader';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bookingId: string;
  ratedUserId: string;
  ratedUserName: string;
  serviceType: 'pooling' | 'rental';
  ratingType: 'passenger_to_driver' | 'driver_to_passenger';
}

interface RatingCategory {
  key: string;
  label: string;
  value: number;
}

const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  onClose,
  onSuccess,
  bookingId,
  ratedUserId,
  ratedUserName,
  serviceType,
  ratingType,
}) => {
  const [overallRating, setOverallRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTags, setLoadingTags] = useState(true);
  const [categoryRatings, setCategoryRatings] = useState<RatingCategory[]>([]);

  // Initialize category ratings based on rating type
  useEffect(() => {
    if (ratingType === 'passenger_to_driver') {
      setCategoryRatings([
        { key: 'punctuality', label: 'Punctuality', value: 0 },
        { key: 'vehicleCondition', label: 'Vehicle Condition', value: 0 },
        { key: 'driving', label: 'Driving', value: 0 },
        { key: 'communication', label: 'Communication', value: 0 },
      ]);
    } else {
      setCategoryRatings([
        { key: 'punctuality', label: 'Punctuality', value: 0 },
        { key: 'behavior', label: 'Behavior', value: 0 },
        { key: 'communication', label: 'Communication', value: 0 },
      ]);
    }
  }, [ratingType]);

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await ratingApi.getTags(ratingType);
        if (response.success && response.data) {
          setAvailableTags(response.data);
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      } finally {
        setLoadingTags(false);
      }
    };

    if (visible) {
      fetchTags();
    }
  }, [visible, ratingType]);

  const handleReset = () => {
    setOverallRating(0);
    setComment('');
    setSelectedTags([]);
    setCategoryRatings(prev => prev.map(cat => ({ ...cat, value: 0 })));
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const updateCategoryRating = (key: string, value: number) => {
    setCategoryRatings(prev =>
      prev.map(cat => (cat.key === key ? { ...cat, value } : cat))
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      Alert.alert('Rating Required', 'Please provide an overall rating');
      return;
    }

    setLoading(true);
    try {
      const ratingData: any = {
        bookingId,
        ratedUserId,
        serviceType,
        ratingType,
        overallRating,
        comment: comment.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      };

      // Add category ratings
      categoryRatings.forEach(cat => {
        if (cat.value > 0) {
          ratingData[cat.key] = cat.value;
        }
      });

      const response = await ratingApi.create(ratingData);
      if (response.success) {
        Alert.alert('Thank You!', 'Your rating has been submitted successfully');
        handleReset();
        onSuccess?.();
        onClose();
      } else {
        Alert.alert('Error', response.error || 'Failed to submit rating');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number, onPress: (value: number) => void, size = 32) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onPress(star)}>
            <Star
              size={size}
              color={star <= rating ? COLORS.warning : COLORS.lightGray}
              fill={star <= rating ? COLORS.warning : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1:
        return 'Poor';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Very Good';
      case 5:
        return 'Excellent';
      default:
        return 'Tap to rate';
    }
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
            <Text style={styles.headerTitle}>Rate Your Experience</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* User Info */}
            <View style={styles.userSection}>
              <View style={styles.avatarPlaceholder}>
                <User size={32} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.userName}>{ratedUserName}</Text>
              <Text style={styles.ratingTypeLabel}>
                {ratingType === 'passenger_to_driver' ? 'Rate as Driver' : 'Rate as Passenger'}
              </Text>
            </View>

            {/* Overall Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overall Rating</Text>
              {renderStars(overallRating, setOverallRating, 40)}
              <Text style={styles.ratingLabel}>{getRatingLabel(overallRating)}</Text>
            </View>

            {/* Category Ratings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rate Specific Areas</Text>
              {categoryRatings.map((category) => (
                <View key={category.key} style={styles.categoryRow}>
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                  {renderStars(category.value, (value) => updateCategoryRating(category.key, value), 24)}
                </View>
              ))}
            </View>

            {/* Tags */}
            {!loadingTags && availableTags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Tags</Text>
                <View style={styles.tagsContainer}>
                  {availableTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagButton,
                        selectedTags.includes(tag) && styles.tagButtonSelected,
                      ]}
                      onPress={() => toggleTag(tag)}
                    >
                      {selectedTags.includes(tag) && (
                        <ThumbsUp size={12} color={COLORS.white} />
                      )}
                      <Text
                        style={[
                          styles.tagText,
                          selectedTags.includes(tag) && styles.tagTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Comment */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Comments (Optional)</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Share your experience..."
                placeholderTextColor={COLORS.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={comment}
                onChangeText={setComment}
                maxLength={500}
              />
              <Text style={styles.charCount}>{comment.length}/500</Text>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, overallRating === 0 && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading || overallRating === 0}
            >
              {loading ? (
                <AppLoader color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Rating</Text>
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
  userSection: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatarPlaceholder: {
    width: normalize(64),
    height: normalize(64),
    borderRadius: normalize(32),
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  userName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  ratingTypeLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  ratingLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontWeight: '500',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tagText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  tagTextSelected: {
    color: COLORS.white,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    minHeight: normalize(100),
  },
  charCount: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  submitButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    fontWeight: 'bold',
  },
});

export default RatingModal;
