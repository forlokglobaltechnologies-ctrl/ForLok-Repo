import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Send, MapPin, Loader } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { chatApi } from '@utils/apiClient';
import { websocketService } from '@services/websocket.service';
import { useLanguage } from '@context/LanguageContext';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  messageId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  message: string;
  type: 'text' | 'location' | 'system' | 'image';
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  sentAt: string;
  readBy?: Array<{ userId: string; readAt: string }>;
}

interface RouteParams {
  conversationId?: string;
  bookingId?: string;
  type?: 'pooling' | 'rental';
  isGroup?: boolean;
  offerId?: string;
  otherUser?: {
    userId: string;
    name: string;
    photo?: string;
  };
}

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useLanguage();
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const params = route.params as RouteParams;
  const conversationId = params?.conversationId;
  const bookingId = params?.bookingId;
  const otherUser = params?.otherUser;
  const isGroup = params?.isGroup || false;
  const offerId = params?.offerId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [conversationDetails, setConversationDetails] = useState<any>(null);
  const [displayOtherUser, setDisplayOtherUser] = useState(otherUser);

  // Load current user ID
  useEffect(() => {
    const loadUserId = async () => {
      const userId = await AsyncStorage.getItem('userId');
      setCurrentUserId(userId);
    };
    loadUserId();
  }, []);

  // Load conversation and messages
  const loadConversation = useCallback(async () => {
    if (!conversationId && !bookingId) {
      setLoading(false);
      return;
    }

    try {
      let convId = conversationId;

      // If bookingId provided but no conversationId, get conversation by booking
      if (!convId && bookingId) {
        const convResponse = await chatApi.getConversationByBooking(bookingId);
        if (convResponse.success && convResponse.data) {
          convId = convResponse.data.conversationId;
        } else {
          Alert.alert('Error', 'Conversation not found for this booking');
          navigation.goBack();
          return;
        }
      }

      if (!convId) {
        // If offerId provided for pooling group chat, get group conversation
        if (isGroup && offerId) {
          const groupConvResponse = await chatApi.getGroupConversationByOffer(offerId);
          if (groupConvResponse.success && groupConvResponse.data) {
            convId = groupConvResponse.data.conversationId;
            setConversationDetails(groupConvResponse.data);
          }
        }
      } else {
        // Load conversation details
        const convDetailsResponse = await chatApi.getConversation(convId);
        if (convDetailsResponse.success && convDetailsResponse.data) {
          const convData = convDetailsResponse.data;
          setConversationDetails(convData);
          
          // For rental chats (one-to-one), always extract other participant from conversation
          // This ensures we show the OTHER person's name, not our own
          if (convData.type === 'rental' && convData.participants && convData.participants.length > 0) {
            const currentUserId = await AsyncStorage.getItem('userId');
            console.log('🔍 Chat - Current User ID:', currentUserId);
            console.log('🔍 Chat - Participants:', convData.participants);
            
            // Find the participant that is NOT the current user
            const otherParticipant = convData.participants.find(
              (p: any) => p.userId !== currentUserId && !p.leftAt
            );
            
            console.log('🔍 Chat - Other Participant:', otherParticipant);
            
            if (otherParticipant) {
              // Always update displayOtherUser with the other participant to ensure correct name
              setDisplayOtherUser({
                userId: otherParticipant.userId,
                name: otherParticipant.name,
                photo: otherParticipant.photo,
              });
            }
          }
        }
      }

      if (!convId) {
        setLoading(false);
        return;
      }

      // Load messages
      const messagesResponse = await chatApi.getMessages(convId, { limit: 50 });
      if (messagesResponse.success && messagesResponse.data) {
        setMessages(messagesResponse.data.messages || []);
        setHasMore(messagesResponse.data.hasMore || false);
      }

      // Mark conversation as read
      await chatApi.markConversationRead(convId);

      // Join WebSocket room
      websocketService.joinConversation(convId);
    } catch (error: any) {
      console.error('Error loading conversation:', error);
      Alert.alert('Error', 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [conversationId, bookingId, navigation]);

  // Load more messages (pagination)
  const loadMoreMessages = async () => {
    if (!conversationId || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const lastMessage = messages[0];
      const response = await chatApi.getMessages(conversationId, {
        limit: 50,
        before: lastMessage?.messageId,
      });

      if (response.success && response.data) {
        setMessages((prev) => [...(response.data.messages || []), ...prev]);
        setHasMore(response.data.hasMore || false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Setup WebSocket listeners
  useEffect(() => {
    if (!conversationId) return;

    const handleNewMessage = (data: any) => {
      if (data.conversationId === conversationId && data.message) {
        setMessages((prev) => [...prev, data.message]);
        // Mark as read if it's not from current user
        if (data.message.senderId !== currentUserId) {
          chatApi.markMessageRead(data.message.messageId);
          websocketService.markAsRead(data.message.messageId, conversationId);
        }
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    const handleTypingStart = (data: any) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        setOtherUserTyping(true);
      }
    };

    const handleTypingStop = (data: any) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        setOtherUserTyping(false);
      }
    };

    const unsubscribeNewMessage = websocketService.on('message:new', handleNewMessage);
    const unsubscribeTypingStart = websocketService.on('typing:start', handleTypingStart);
    const unsubscribeTypingStop = websocketService.on('typing:stop', handleTypingStop);

    return () => {
      unsubscribeNewMessage();
      unsubscribeTypingStart();
      unsubscribeTypingStop();
      if (conversationId) {
        websocketService.leaveConversation(conversationId);
      }
    };
  }, [conversationId, currentUserId]);

  // Load conversation on mount
  useFocusEffect(
    useCallback(() => {
      loadConversation();
    }, [loadConversation])
  );

  // Handle typing indicator
  const handleTyping = (text: string) => {
    setMessage(text);
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      if (conversationId) {
        websocketService.sendTyping(conversationId, true);
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (conversationId) {
        websocketService.sendTyping(conversationId, false);
      }
    }, 2000);
  };

  // Send message
  const handleSend = async () => {
    if (!message.trim() || !conversationId || sending) return;

    const messageText = message.trim();
    setMessage('');
    setIsTyping(false);
    if (conversationId) {
      websocketService.sendTyping(conversationId, false);
    }

    setSending(true);
    try {
      const response = await chatApi.sendMessage(conversationId, {
        message: messageText,
        type: 'text',
      });

      if (response.success && response.data) {
        // Message will be added via WebSocket, but add optimistically
        setMessages((prev) => [...prev, response.data]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', response.error || 'Failed to send message');
        setMessage(messageText); // Restore message on error
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  // Share location
  const handleShareLocation = async () => {
    if (!conversationId) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to share location');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      const address = geocode[0]
        ? `${geocode[0].street || ''} ${geocode[0].city || ''} ${geocode[0].postalCode || ''}`.trim()
        : 'Current Location';

      setSending(true);
      const response = await chatApi.shareLocation(conversationId, {
        lat: latitude,
        lng: longitude,
        address,
      });

      if (response.success && response.data) {
        setMessages((prev) => [...prev, response.data]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', 'Failed to share location');
      }
    } catch (error: any) {
      console.error('Error sharing location:', error);
      Alert.alert('Error', 'Failed to share location');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isMyMessage = (msg: Message) => msg.senderId === currentUserId;

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = isMyMessage(item);
    const isSystem = item.type === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessage}>{item.message}</Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageWrapper,
          isMine ? styles.myMessageWrapper : styles.otherMessageWrapper,
        ]}
      >
        {!isMine && (
          <Image
            source={{
              uri: item.senderPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
            }}
            style={styles.messageAvatar}
          />
        )}
        <View
          style={[
            styles.messageBubble,
            isMine ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}
        >
          {!isMine && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          {item.type === 'location' ? (
            <View style={styles.locationMessage}>
              <MapPin size={16} color={isMine ? COLORS.white : COLORS.primary} />
              <Text
                style={[
                  styles.messageText,
                  isMine ? styles.myMessageText : styles.otherMessageText,
                ]}
              >
                {item.location?.address || 'Shared Location'}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.messageText,
                isMine ? styles.myMessageText : styles.otherMessageText,
              ]}
            >
              {item.message}
            </Text>
          )}
          <Text
            style={[
              styles.messageTime,
              isMine ? styles.myMessageTime : styles.otherMessageTime,
            ]}
          >
            {formatTime(item.sentAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isGroup && conversationDetails?.groupName 
              ? conversationDetails.groupName 
              : displayOtherUser?.name || otherUser?.name || 'Chat'}
          </Text>
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
        <View style={styles.headerUser}>
          {isGroup && conversationDetails ? (
            <View style={styles.headerUserInfo}>
              <Text style={styles.headerName}>
                {conversationDetails.groupName || 'Group Chat'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {conversationDetails.participants?.filter((p: any) => !p.leftAt).length || 0} participants
              </Text>
            </View>
          ) : (
            <>
              <Image
                source={{
                  uri: displayOtherUser?.photo || otherUser?.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
                }}
                style={styles.headerAvatar}
              />
              <View style={styles.headerUserInfo}>
                <Text style={styles.headerName}>{displayOtherUser?.name || otherUser?.name || 'Chat'}</Text>
                {otherUserTyping && (
                  <Text style={styles.typingIndicator}>typing...</Text>
                )}
              </View>
            </>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.messageId}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          inverted={false}
          onEndReached={hasMore ? loadMoreMessages : undefined}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
        />

        {/* Input Container */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton} onPress={handleShareLocation}>
              <MapPin size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              value={message}
              onChangeText={handleTyping}
              placeholder={t('chat.typeMessage') || 'Type a message...'}
              placeholderTextColor={COLORS.textSecondary}
              multiline
              maxLength={1000}
              editable={!sending}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!message.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <Loader size={20} color={COLORS.white} />
            ) : (
              <Send size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5DDD5',
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
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
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: SPACING.xs,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  headerUserInfo: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.white,
    fontWeight: '600',
  },
  headerName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.white,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.white + 'CC',
    marginTop: 2,
  },
  typingIndicator: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  loadingMore: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  messageWrapper: {
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myMessageWrapper: {
    justifyContent: 'flex-end',
  },
  otherMessageWrapper: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: SPACING.xs,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    lineHeight: 20,
  },
  myMessageText: {
    color: COLORS.white,
  },
  otherMessageText: {
    color: COLORS.text,
  },
  messageTime: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    marginTop: SPACING.xs / 2,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherMessageTime: {
    color: COLORS.textSecondary,
  },
  locationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  systemMessage: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    backgroundColor: COLORS.white + '80',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border + '40',
    gap: SPACING.xs,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 24,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs / 2,
  },
  attachButton: {
    padding: SPACING.xs,
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    maxHeight: 100,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minHeight: 36,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.lightGray,
    elevation: 0,
  },
});

export default ChatScreen;
