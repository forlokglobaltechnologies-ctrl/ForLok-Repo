import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  Send,
  CreditCard,
  XCircle,
  ThumbsUp,
  Star,
  Info,
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SPACING, SHADOWS } from '@constants/theme';
import { useLanguage } from '@context/LanguageContext';
import { useTheme } from '@context/ThemeContext';
import { feedbackApi } from '@utils/apiClient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FeedbackScreen = () => {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [feedbackType, setFeedbackType] = useState<'issue' | 'suggestion' | 'complaint' | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const feedbackTypes = [
    { id: 'issue', label: 'Report Issue', icon: AlertTriangle, color: '#F44336', desc: 'Something went wrong' },
    { id: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: '#FF9800', desc: 'Ideas to improve' },
    { id: 'complaint', label: 'Complaint', icon: XCircle, color: '#9C27B0', desc: 'Share a concern' },
  ];

  const priorities = [
    { id: 'high', label: 'High', color: '#F44336' },
    { id: 'medium', label: 'Medium', color: '#FF9800' },
    { id: 'low', label: 'Low', color: '#4CAF50' },
  ];

  const handleSubmit = async () => {
    if (!feedbackType) {
      Alert.alert(t('common.error'), t('feedback.selectType'));
      return;
    }
    if (!subject.trim()) {
      Alert.alert(t('common.error'), t('feedback.enterSubject'));
      return;
    }
    if (!description.trim()) {
      Alert.alert(t('common.error'), t('feedback.enterDescription'));
      return;
    }

    try {
      setSubmitting(true);
      const response = await feedbackApi.submit({
        type: feedbackType,
        subject: subject.trim(),
        description: `${description.trim()}${rating > 0 ? `\n\nOverall Rating: ${rating}/5 stars` : ''}`,
        priority,
      });

      if (response.success) {
        Alert.alert(
          t('common.success'),
          t('feedback.submitSuccess'),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(t('common.error'), response.error || 'Failed to submit feedback');
      }
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      Alert.alert(t('common.error'), error.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Hero Header ── */}
      <ImageBackground
        source={require('../../../assets/feedback1.png')}
        style={styles.headerImage}
        resizeMode="cover"
      >
        <View style={[styles.headerOverlay, { backgroundColor: theme.colors.primary }]} />
        <BlurView intensity={40} style={styles.blurContainer}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Give Feedback</Text>
            <View style={{ width: 38 }} />
          </View>
        </BlurView>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Welcome Banner ── */}
        <View style={[styles.welcomeBanner, { backgroundColor: theme.colors.primary + '08', borderColor: theme.colors.primary + '20' }]}>
          <ThumbsUp size={20} color={theme.colors.primary} />
          <Text style={[styles.welcomeText, { color: theme.colors.text }]}>
            Your feedback helps us improve Forlok for everyone. We read every submission!
          </Text>
        </View>

        {/* ── Overall Rating ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>How's your experience?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                <Star
                  size={36}
                  color={star <= rating ? '#FFB300' : theme.colors.border}
                  fill={star <= rating ? '#FFB300' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={[styles.ratingLabel, { color: theme.colors.textSecondary }]}>
              {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : 'Excellent!'}
            </Text>
          )}
        </View>

        {/* ── Feedback Type ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Feedback Type *</Text>
          <View style={styles.typeRow}>
            {feedbackTypes.map((type) => {
              const isSelected = feedbackType === type.id;
              const Icon = type.icon;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeCard,
                    {
                      borderColor: isSelected ? type.color : theme.colors.border,
                      backgroundColor: isSelected ? type.color + '10' : theme.colors.background,
                    },
                  ]}
                  onPress={() => setFeedbackType(type.id as any)}
                  activeOpacity={0.7}
                >
                  <Icon size={24} color={isSelected ? type.color : theme.colors.textSecondary} />
                  <Text style={[styles.typeLabel, { color: isSelected ? type.color : theme.colors.text }]}>
                    {type.label}
                  </Text>
                  <Text style={[styles.typeDesc, { color: theme.colors.textSecondary }]}>{type.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Subject ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Subject *</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
            value={subject}
            onChangeText={setSubject}
            placeholder="What's this about?"
            placeholderTextColor={theme.colors.textSecondary}
            maxLength={100}
          />
          <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>{subject.length}/100</Text>
        </View>

        {/* ── Description ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Description *</Text>
          <TextInput
            style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Tell us more about your feedback..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>{description.length}/500</Text>
        </View>

        {/* ── Priority ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Priority</Text>
          <View style={styles.priorityRow}>
            {priorities.map((p) => {
              const isSelected = priority === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.priorityChip,
                    {
                      borderColor: isSelected ? p.color : theme.colors.border,
                      backgroundColor: isSelected ? p.color + '10' : theme.colors.background,
                    },
                  ]}
                  onPress={() => setPriority(p.id as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                  <Text style={[styles.priorityLabel, { color: isSelected ? p.color : theme.colors.text }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Info Note ── */}
        <View style={[styles.infoNote, { backgroundColor: theme.colors.background }]}>
          <Info size={16} color={theme.colors.primary} />
          <Text style={[styles.infoNoteText, { color: theme.colors.textSecondary }]}>
            Your feedback will be reviewed by our support team. We typically respond within 24-48 hours.
          </Text>
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: theme.colors.primary, opacity: submitting ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Send size={18} color="#FFF" />
              <Text style={styles.submitText}>Submit Feedback</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* ── Hero Header ── */
  headerImage: { width: '100%', height: 160 },
  headerOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.78 },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  headerNav: { flexDirection: 'row', alignItems: 'center' },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 22,
    color: '#FFF',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.4,
  },

  /* ── Scroll ── */
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xl * 2 },

  /* ── Welcome Banner ── */
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  welcomeText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 19,
  },

  /* ── Card ── */
  card: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  cardTitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },

  /* ── Stars ── */
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  ratingLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: SPACING.sm,
  },

  /* ── Feedback Type ── */
  typeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  typeLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  typeDesc: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    textAlign: 'center',
  },

  /* ── Inputs ── */
  input: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
  },
  textArea: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    minHeight: 120,
  },
  charCount: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },

  /* ── Priority ── */
  priorityRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priorityLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: '700',
  },

  /* ── Info Note ── */
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  infoNoteText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 18,
  },

  /* ── Submit ── */
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: SPACING.xl,
  },
  submitText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default FeedbackScreen;
