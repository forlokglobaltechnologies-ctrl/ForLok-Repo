import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  User,
  UserX,
  Shield,
  Trash2,
  Clock,
  AlertTriangle,
} from 'lucide-react-native';
import { normalize } from '@utils/responsive';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { blockApi } from '@utils/apiClient';

interface BlockedUser {
  blockId: string;
  blockedId: string;
  blockedName: string;
  blockedPhoto?: string;
  reason?: string;
  reasonCategory?: string;
  bookingId?: string;
  createdAt: string;
}

const BlockedUsersScreen = () => {
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const fetchBlockedUsers = useCallback(async () => {
    try {
      const response = await blockApi.getBlockedUsers();
      if (response.success && response.data) {
        setBlockedUsers(response.data.blockedUsers || []);
      }
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBlockedUsers();
    setRefreshing(false);
  };

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${user.blockedName}? They will be able to see your rides and contact you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: () => confirmUnblock(user),
        },
      ]
    );
  };

  const confirmUnblock = async (user: BlockedUser) => {
    setUnblocking(user.blockId);
    try {
      const response = await blockApi.unblockUser(user.blockedId);
      if (response.success) {
        setBlockedUsers(prev => prev.filter(u => u.blockId !== user.blockId));
        Alert.alert('Success', `${user.blockedName} has been unblocked`);
      } else {
        Alert.alert('Error', response.error || 'Failed to unblock user');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setUnblocking(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'harassment':
        return <AlertTriangle size={14} color={COLORS.error} />;
      case 'inappropriate_behavior':
        return <UserX size={14} color={COLORS.warning} />;
      case 'safety_concern':
        return <Shield size={14} color={COLORS.error} />;
      default:
        return <User size={14} color={COLORS.textSecondary} />;
    }
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'harassment':
        return 'Harassment';
      case 'inappropriate_behavior':
        return 'Inappropriate Behavior';
      case 'safety_concern':
        return 'Safety Concern';
      case 'spam':
        return 'Spam';
      case 'other':
        return 'Other';
      default:
        return 'Not specified';
    }
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => (
    <Card style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <User size={24} color={COLORS.textSecondary} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.blockedName}</Text>
            <View style={styles.blockMeta}>
              <Clock size={12} color={COLORS.textSecondary} />
              <Text style={styles.blockDate}>Blocked on {formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.unblockButton}
          onPress={() => handleUnblock(item)}
          disabled={unblocking === item.blockId}
        >
          {unblocking === item.blockId ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <View style={styles.unblockContent}>
              <Trash2 size={13} color={COLORS.white} />
              <Text style={styles.unblockText}>Unblock</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {(item.reasonCategory || item.reason) && (
        <View style={styles.reasonSection}>
          <View style={styles.reasonCategory}>
            {getCategoryIcon(item.reasonCategory)}
            <Text style={styles.reasonCategoryText}>
              {getCategoryLabel(item.reasonCategory)}
            </Text>
          </View>
          {item.reason && (
            <Text style={styles.reasonText}>{item.reason}</Text>
          )}
        </View>
      )}
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Blocked Users</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1C65D8', '#2A7BEF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Blocked Users</Text>
          <Text style={styles.headerSubtitle}>Manage your safety controls</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <View style={styles.infoBanner}>
        <View style={styles.infoTopRow}>
          <View style={styles.infoChip}>
            <Text style={styles.infoChipText}>{blockedUsers.length} blocked</Text>
          </View>
        </View>
        <View style={styles.infoBody}>
          <Shield size={18} color={COLORS.primary} />
          <Text style={styles.infoBannerText}>
            Blocked users cannot see your rides, contact you, or book with you.
          </Text>
        </View>
      </View>

      <FlatList
        data={blockedUsers}
        keyExtractor={(item) => item.blockId}
        renderItem={renderBlockedUser}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <UserX size={48} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No blocked users</Text>
            <Text style={styles.emptyText}>
              Users you block will appear here. You can block someone from their profile or after a ride.
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(18),
    color: COLORS.white,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  headerSpacer: { width: normalize(36) },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    backgroundColor: COLORS.white,
    paddingVertical: normalize(10),
    paddingHorizontal: SPACING.md,
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  infoTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  infoChip: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(4),
  },
  infoChipText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: COLORS.primary,
    fontWeight: '700',
  },
  infoBody: {
    marginTop: normalize(8),
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoBannerText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: normalize(12),
    color: COLORS.text,
  },
  listContent: {
    padding: SPACING.md,
    paddingTop: 0,
    paddingBottom: SPACING.xl,
  },
  userCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  avatarContainer: {
    width: normalize(48),
    height: normalize(48),
    borderRadius: normalize(24),
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: { flex: 1 },
  userName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  blockMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(4),
    marginTop: normalize(4),
  },
  blockDate: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  unblockButton: {
    minWidth: normalize(72),
    height: normalize(34),
    borderRadius: normalize(17),
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: normalize(10),
    ...SHADOWS.sm,
  },
  unblockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(5),
  },
  unblockText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: COLORS.white,
    fontWeight: '700',
  },
  reasonSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reasonCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  reasonCategoryText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  reasonText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconContainer: {
    width: normalize(80),
    height: normalize(80),
    borderRadius: normalize(40),
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: normalize(20),
  },
});

export default BlockedUsersScreen;
