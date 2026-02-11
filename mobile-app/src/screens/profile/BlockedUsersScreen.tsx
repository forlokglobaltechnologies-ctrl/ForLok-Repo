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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  User,
  UserX,
  Shield,
  Trash2,
  Clock,
  AlertTriangle,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { Card } from '@components/common/Card';
import { blockApi } from '@utils/apiClient';
import { useLanguage } from '@context/LanguageContext';

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
  const { t } = useLanguage();
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
            <ActivityIndicator size="small" color={COLORS.error} />
          ) : (
            <Trash2 size={20} color={COLORS.error} />
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Blocked Users</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Shield size={20} color={COLORS.primary} />
        <Text style={styles.infoBannerText}>
          Blocked users cannot see your rides, message you, or book with you.
        </Text>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingTop: SPACING.xl,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xl,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  placeholder: { width: 24 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.md,
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  infoBannerText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  listContent: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  userCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
    gap: 4,
    marginTop: 4,
  },
  blockDate: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  unblockButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
    lineHeight: 20,
  },
});

export default BlockedUsersScreen;
