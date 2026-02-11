import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, MessageCircle, Search } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { chatApi } from '@utils/apiClient';
import { useLanguage } from '@context/LanguageContext';

interface Conversation {
  conversationId: string;
  type: 'pooling' | 'rental';
  bookingId?: string;
  offerId?: string;
  isGroup?: boolean;
  groupName?: string;
  lastMessage?: {
    text: string;
    senderName: string;
    sentAt: string;
    type: string;
  };
  unreadCount: number;
  otherParticipants: Array<{
    userId: string;
    name: string;
    photo?: string;
    role: string;
  }>;
  participantCount: number;
  isActive: boolean;
  updatedAt: string;
}

const ChatListScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = async () => {
    try {
      const response = await chatApi.getConversations({ isActive: true });
      if (response.success && response.data) {
        setConversations(response.data.conversations || []);
      }
    } catch (error: any) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getConversationTitle = (conversation: Conversation) => {
    if (conversation.type === 'rental') {
      return conversation.otherParticipants[0]?.name || 'Rental Owner';
    } else {
      // Pooling - show group name if it's a group chat, otherwise driver name
      if (conversation.isGroup && conversation.groupName) {
        return conversation.groupName;
      }
      const driver = conversation.otherParticipants.find((p) => p.role === 'driver');
      if (driver) {
        return driver.name;
      }
      if (conversation.participantCount > 2) {
        return `Group (${conversation.participantCount})`;
      }
      return conversation.otherParticipants[0]?.name || 'Pooling Trip';
    }
  };

  const getConversationSubtitle = (conversation: Conversation) => {
    if (conversation.lastMessage) {
      const prefix = conversation.lastMessage.type === 'location' 
        ? '📍 Location' 
        : conversation.lastMessage.type === 'system'
        ? '🔔 '
        : '';
      return `${prefix}${conversation.lastMessage.text}`;
    }
    return 'No messages yet';
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUser = item.otherParticipants[0];
    const title = getConversationTitle(item);
    const subtitle = getConversationSubtitle(item);

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => {
          navigation.navigate('Chat' as never, {
            conversationId: item.conversationId,
            bookingId: item.bookingId,
            type: item.type,
            otherUser: otherUser,
          } as never);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: otherUser?.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
            }}
            style={styles.avatar}
          />
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {title}
            </Text>
            {item.lastMessage && (
              <Text style={styles.conversationTime}>
                {formatTime(item.lastMessage.sentAt)}
              </Text>
            )}
          </View>
          <View style={styles.conversationFooter}>
            <Text
              style={[
                styles.conversationMessage,
                item.unreadCount > 0 && styles.unreadMessage,
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
            {item.type === 'pooling' && item.participantCount > 2 && (
              <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>
                  {item.participantCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Search size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageCircle size={64} color={COLORS.lightGray} />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>
            Start chatting when you make a booking
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.conversationId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
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
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
    textAlign: 'center',
    marginRight: 40, // Balance the back button
  },
  searchButton: {
    padding: SPACING.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: SPACING.xs,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '40',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.lightGray,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  unreadText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs / 2,
  },
  conversationName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  conversationTime: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationMessage: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  unreadMessage: {
    color: COLORS.text,
    fontWeight: '600',
  },
  groupBadge: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: SPACING.xs,
  },
  groupBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    marginTop: SPACING.md,
    fontWeight: '600',
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});

export default ChatListScreen;
