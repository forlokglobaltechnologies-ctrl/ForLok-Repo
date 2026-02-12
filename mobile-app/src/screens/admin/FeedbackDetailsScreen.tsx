import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import {
  ArrowLeft,
  CreditCard,
  Lightbulb,
  XCircle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  MessageSquare,
  Send,
  Archive,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { Button } from '@components/common/Button';
import { useLanguage } from '@context/LanguageContext';
import { adminFeedbackApi } from '@utils/apiClient';
import { normalize, hp } from '@utils/responsive';

const FeedbackDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const { feedbackId } = route.params as { feedbackId: string };

  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [showResponseInput, setShowResponseInput] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, [feedbackId]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const res = await adminFeedbackApi.getById(feedbackId);
      if (res.success && res.data) {
        setFeedback(res.data);
      } else {
        Alert.alert('Error', 'Failed to load feedback details');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      Alert.alert('Error', 'Failed to load feedback details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      setActionLoading(true);
      const res = await adminFeedbackApi.updateStatus(feedbackId, status);
      if (res.success) {
        setFeedback(res.data);
        Alert.alert('Success', `Feedback status updated to ${status}`);
      } else {
        Alert.alert('Error', res.error || 'Failed to update status');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendResponse = async () => {
    if (!responseText.trim()) {
      Alert.alert('Error', 'Please enter a response');
      return;
    }

    try {
      setActionLoading(true);
      const res = await adminFeedbackApi.respond(feedbackId, responseText.trim());
      if (res.success) {
        setFeedback(res.data);
        setResponseText('');
        setShowResponseInput(false);
        Alert.alert('Success', 'Response sent successfully');
      } else {
        Alert.alert('Error', res.error || 'Failed to send response');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send response');
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'issue':
        return CreditCard;
      case 'suggestion':
        return Lightbulb;
      case 'complaint':
        return XCircle;
      default:
        return MessageSquare;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return COLORS.warning;
      case 'acknowledged':
        return COLORS.primary;
      case 'resolved':
        return COLORS.success;
      case 'archived':
        return COLORS.textSecondary;
      default:
        return COLORS.textSecondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return COLORS.error;
      case 'medium':
        return COLORS.warning;
      case 'low':
        return COLORS.success;
      default:
        return COLORS.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Feedback Details</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading feedback...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!feedback) return null;

  const IconComponent = getTypeIcon(feedback.type);
  const statusColor = getStatusColor(feedback.status);
  const priorityColor = getPriorityColor(feedback.priority);

  return (
    <SafeAreaView style={styles.container}>
      {/* Blue Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Image Background */}
        <View style={styles.imageContainer}>
          <ImageBackground
            source={require('../../../assets/feedback.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            <View style={styles.overlay} />
            <BlurView intensity={50} style={styles.blurContainer}>
              <View style={styles.feedbackHeaderContent}>
                <View style={styles.feedbackIconContainer}>
                  <IconComponent size={48} color={COLORS.white} />
                </View>
                <Text style={styles.feedbackTypeText}>{capitalize(feedback.type)}</Text>
                <View style={styles.feedbackIdBadge}>
                  <Text style={styles.feedbackIdText}>{feedback.feedbackId}</Text>
                </View>
              </View>
            </BlurView>
          </ImageBackground>
        </View>

        {/* Status and Priority */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {capitalize(feedback.status)}
            </Text>
          </View>
          <View style={[styles.priorityBadgeTop, { backgroundColor: priorityColor + '20' }]}>
            <Text style={[styles.priorityTextTop, { color: priorityColor }]}>
              {capitalize(feedback.priority)} Priority
            </Text>
          </View>
        </View>

        {/* User Information */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>User Information</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{feedback.user?.name || 'Unknown'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID:</Text>
            <Text style={styles.infoValue}>{feedback.user?.userId || feedback.userId}</Text>
          </View>
          {feedback.user?.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{feedback.user.email}</Text>
            </View>
          )}
          {feedback.user?.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{feedback.user.phone}</Text>
            </View>
          )}
        </Card>

        {/* Feedback Details */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <MessageSquare size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Feedback Details</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Subject:</Text>
            <Text style={styles.infoValue}>{feedback.subject}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Description:</Text>
            <Text style={styles.infoDescription}>{feedback.description}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIconRow}>
              <Calendar size={16} color={COLORS.textSecondary} />
              <Text style={styles.infoLabel}>Submitted:</Text>
            </View>
            <Text style={styles.infoValue}>{formatDate(feedback.createdAt)}</Text>
          </View>
          {feedback.updatedAt && feedback.updatedAt !== feedback.createdAt && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconRow}>
                <Clock size={16} color={COLORS.textSecondary} />
                <Text style={styles.infoLabel}>Updated:</Text>
              </View>
              <Text style={styles.infoValue}>{formatDate(feedback.updatedAt)}</Text>
            </View>
          )}
        </Card>

        {/* Admin Response Section */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Send size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Admin Response</Text>
          </View>
          {feedback.adminResponse ? (
            <View style={styles.responseContainer}>
              <View style={styles.responseItem}>
                <Text style={styles.responseText}>{feedback.adminResponse}</Text>
                {feedback.respondedAt && (
                  <Text style={styles.responseDate}>
                    Responded: {formatDate(feedback.respondedAt)}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.noResponseContainer}>
              <Text style={styles.noResponseText}>No response yet</Text>
            </View>
          )}

          {/* Response Input */}
          {showResponseInput && (
            <View style={styles.responseInputContainer}>
              <TextInput
                style={styles.responseInput}
                value={responseText}
                onChangeText={setResponseText}
                placeholder="Type your response..."
                placeholderTextColor={COLORS.textSecondary}
                multiline
                numberOfLines={4}
                maxLength={1000}
              />
              <Text style={styles.charCount}>{responseText.length}/1000</Text>
              <View style={styles.responseActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowResponseInput(false);
                    setResponseText('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Button
                  title={actionLoading ? 'Sending...' : 'Send Response'}
                  onPress={handleSendResponse}
                  variant="primary"
                  size="small"
                  disabled={actionLoading || !responseText.trim()}
                  icon={<Send size={16} color={COLORS.white} />}
                />
              </View>
            </View>
          )}
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {feedback.status === 'pending' && (
            <Button
              title={actionLoading ? 'Updating...' : 'ACKNOWLEDGE'}
              onPress={() => handleUpdateStatus('acknowledged')}
              variant="primary"
              size="large"
              style={styles.actionButton}
              icon={<CheckCircle size={20} color={COLORS.white} />}
              disabled={actionLoading}
            />
          )}
          {feedback.status !== 'resolved' && feedback.status !== 'archived' && (
            <Button
              title={actionLoading ? 'Updating...' : 'RESOLVE'}
              onPress={() => handleUpdateStatus('resolved')}
              variant="outline"
              size="large"
              style={styles.actionButton}
              icon={<CheckCircle size={20} color={COLORS.success} />}
              disabled={actionLoading}
            />
          )}
          {feedback.status === 'resolved' && (
            <Button
              title={actionLoading ? 'Updating...' : 'ARCHIVE'}
              onPress={() => handleUpdateStatus('archived')}
              variant="outline"
              size="large"
              style={styles.actionButton}
              icon={<Archive size={20} color={COLORS.textSecondary} />}
              disabled={actionLoading}
            />
          )}
          {!showResponseInput && (
            <Button
              title="SEND RESPONSE"
              onPress={() => setShowResponseInput(true)}
              variant="primary"
              size="large"
              style={styles.actionButton}
              icon={<Send size={20} color={COLORS.white} />}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.xl,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.white,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: SPACING.sm,
  },
  headerRight: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  imageContainer: {
    width: '100%',
    height: hp(25),
    position: 'relative',
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 25, 82, 0.75)',
  },
  blurContainer: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackHeaderContent: {
    alignItems: 'center',
  },
  feedbackIconContainer: {
    width: normalize(80),
    height: normalize(80),
    borderRadius: normalize(40),
    backgroundColor: COLORS.white + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  feedbackTypeText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.white,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  feedbackIdBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white + '20',
  },
  feedbackIdText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  statusText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  priorityBadgeTop: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  priorityTextTop: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  card: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    alignItems: 'flex-start',
  },
  infoIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  infoLabel: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
    width: normalize(100),
  },
  infoValue: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    flex: 1,
  },
  infoDescription: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    flex: 1,
    lineHeight: normalize(20),
    marginTop: SPACING.xs,
  },
  responseContainer: {
    marginTop: SPACING.sm,
  },
  responseItem: {
    padding: SPACING.md,
    backgroundColor: COLORS.primary + '08',
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  responseText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    lineHeight: normalize(20),
  },
  responseDate: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  noResponseContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  noResponseText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  responseInputContainer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  responseInput: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    minHeight: normalize(100),
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  responseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  cancelButtonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  actionsContainer: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  actionButton: {
    marginBottom: SPACING.sm,
  },
});

export default FeedbackDetailsScreen;
