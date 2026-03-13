import React, { useState, useCallback } from 'react';
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
import { ArrowLeft, MessageCircle, Search, ChevronRight } from 'lucide-react-native';
import { normalize } from '@utils/responsive';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '@constants/theme';
import { bookingApi, chatApi } from '@utils/apiClient';
import { useLanguage } from '@context/LanguageContext';

const ORANGE_LIGHT = '#F99E3C';
const ORANGE_DARK = '#D47B1B';

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
        const incoming = response.data.conversations || [];
        const filtered = await Promise.all(
          incoming.map(async (conversation: Conversation) => {
            if (!conversation.isActive) return null;
            if (!conversation.bookingId) return conversation;

            try {
              const bookingRes = await bookingApi.getBooking(conversation.bookingId);
              const bookingStatus = bookingRes?.data?.status as string | undefined;
              if (bookingStatus && ['completed', 'cancelled', 'expired'].includes(bookingStatus)) {
                return null;
              }
              return conversation;
            } catch {
              return conversation;
            }
          })
        );
        setConversations(filtered.filter(Boolean) as Conversation[]);
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
            <ChevronRight size={16} color={COLORS.textSecondary} />
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
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.searchButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ORANGE_LIGHT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Search size={20} color={COLORS.textSecondary} />
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
              colors={[ORANGE_LIGHT]}
              tintColor={ORANGE_LIGHT}
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
    backgroundColor: '#F6F7F9',
  },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: normalize(14),
    paddingTop: normalize(46),
    paddingBottom: normalize(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '55',
  },
  backButton: {
    padding: normalize(4),
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(18),
    color: COLORS.text,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: normalize(8),
  },
  searchButton: {
    width: normalize(28),
    height: normalize(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(12),
    paddingBottom: normalize(24),
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(11),
    backgroundColor: COLORS.white,
    borderRadius: normalize(14),
    marginBottom: normalize(8),
    ...SHADOWS.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  avatar: {
    width: normalize(56),
    height: normalize(56),
    borderRadius: normalize(28),
    backgroundColor: COLORS.lightGray,
  },
  unreadBadge: {
    position: 'absolute',
    top: normalize(-2),
    right: normalize(-2),
    backgroundColor: '#FF3B30',
    borderRadius: normalize(10),
    minWidth: normalize(20),
    height: normalize(20),
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
    color: '#8B8B8B',
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
    backgroundColor: ORANGE_LIGHT + '20',
    borderRadius: normalize(12),
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(2),
    marginLeft: SPACING.xs,
  },
  groupBadgeText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: ORANGE_DARK,
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
