import React, { useState } from 'react';
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
  Shield,
  AlertTriangle,
  UserX,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { normalize } from '@utils/responsive';
import { blockApi } from '@utils/apiClient';
import { AppLoader } from '@components/common/AppLoader';
import { LinearGradient } from 'expo-linear-gradient';

const MODAL_BLUE_GRADIENT: [string, string] = ['#51A7EA', '#0284C7'];
const MODAL_ORANGE_GRADIENT: [string, string] = ['#F99E3C', '#E08E35'];

interface BlockUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userId: string;
  userName: string;
  bookingId?: string;
}

const BLOCK_CATEGORIES = [
  { id: 'harassment', label: 'Harassment', icon: AlertTriangle },
  { id: 'inappropriate_behavior', label: 'Inappropriate Behavior', icon: UserX },
  { id: 'safety_concern', label: 'Safety Concern', icon: Shield },
  { id: 'spam', label: 'Spam or Scam', icon: AlertTriangle },
  { id: 'other', label: 'Other', icon: UserX },
];

const BlockUserModal: React.FC<BlockUserModalProps> = ({
  visible,
  onClose,
  onSuccess,
  userId,
  userName,
  bookingId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = () => {
    setSelectedCategory(null);
    setReason('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleBlock = async () => {
    if (!selectedCategory) {
      Alert.alert('Category Required', 'Please select a reason category');
      return;
    }

    Alert.alert(
      'Block User',
      `Are you sure you want to block ${userName}? They won't be able to see your rides or contact you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: confirmBlock,
        },
      ]
    );
  };

  const confirmBlock = async () => {
    setLoading(true);
    try {
      const response = await blockApi.blockUser({
        blockedId: userId,
        reason: reason.trim() || undefined,
        reasonCategory: selectedCategory || undefined,
        bookingId,
      });

      if (response.success) {
        Alert.alert('User Blocked', `${userName} has been blocked successfully`);
        handleReset();
        onSuccess?.();
        onClose();
      } else {
        Alert.alert('Error', response.error || 'Failed to block user');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
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
            <Text style={styles.headerTitle}>Block User</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Warning Banner */}
            <View style={styles.warningBanner}>
              <Shield size={24} color={COLORS.error} />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Block {userName}?</Text>
                <Text style={styles.warningText}>
                  This user won't be able to:{'\n'}
                  • See your rides or offers{'\n'}
                  • Send you messages{'\n'}
                  • Book rides with you
                </Text>
              </View>
            </View>

            {/* Category Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Why are you blocking this user?</Text>
              {BLOCK_CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      selectedCategory === category.id && styles.categoryOptionSelected,
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <View style={[
                      styles.categoryIcon,
                      selectedCategory === category.id && styles.categoryIconSelected,
                    ]}>
                      <Icon 
                        size={20} 
                        color={selectedCategory === category.id ? COLORS.white : COLORS.textSecondary} 
                      />
                    </View>
                    <Text style={[
                      styles.categoryText,
                      selectedCategory === category.id && styles.categoryTextSelected,
                    ]}>
                      {category.label}
                    </Text>
                    <View style={[
                      styles.radioButton,
                      selectedCategory === category.id && styles.radioButtonSelected,
                    ]}>
                      {selectedCategory === category.id && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Additional Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Provide more details about the issue..."
                placeholderTextColor={COLORS.textSecondary}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCount}>{reason.length}/500</Text>
            </View>

            {/* Info Note */}
            <View style={styles.infoNote}>
              <AlertTriangle size={16} color={COLORS.warning} />
              <Text style={styles.infoNoteText}>
                You can unblock this user at any time from Settings → Blocked Users
              </Text>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <LinearGradient
                colors={MODAL_BLUE_GRADIENT}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.footerBtnGradient}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.blockBtn,
                !selectedCategory && styles.blockBtnDisabled,
              ]}
              onPress={handleBlock}
              disabled={loading || !selectedCategory}
            >
              <LinearGradient
                colors={MODAL_ORANGE_GRADIENT}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.footerBtnGradient}
              >
                {loading ? (
                  <AppLoader color={COLORS.white} size="small" />
                ) : (
                  <>
                    <UserX size={18} color={COLORS.white} />
                    <Text style={styles.blockBtnText}>Block User</Text>
                  </>
                )}
              </LinearGradient>
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
    maxHeight: '85%',
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
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.error + '10',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  warningContent: { flex: 1 },
  warningTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: SPACING.xs,
  },
  warningText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: normalize(20),
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
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.lightGray,
    marginBottom: SPACING.sm,
  },
  categoryOptionSelected: {
    backgroundColor: COLORS.error + '10',
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  categoryIcon: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  categoryIconSelected: {
    backgroundColor: COLORS.error,
  },
  categoryText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  categoryTextSelected: {
    fontWeight: '500',
    color: COLORS.error,
  },
  radioButton: {
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.error,
  },
  radioButtonInner: {
    width: normalize(10),
    height: normalize(10),
    borderRadius: normalize(5),
    backgroundColor: COLORS.error,
  },
  reasonInput: {
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
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.warning + '10',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  infoNoteText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  cancelBtnText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    fontWeight: '500',
  },
  blockBtn: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  blockBtnDisabled: {
    opacity: 0.5,
  },
  footerBtnGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  blockBtnText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default BlockUserModal;
