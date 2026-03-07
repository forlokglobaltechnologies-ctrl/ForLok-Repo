import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { normalize } from '@utils/responsive';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { chatApi } from '@utils/apiClient';
import { websocketService } from '@services/websocket.service';
import { useLanguage } from '@context/LanguageContext';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const ORANGE_LIGHT = '#F99E3C';
const ORANGE_DARK = '#D47B1B';

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

type ChatListItem =
  | { type: 'separator'; id: string; label: string }
  | { type: 'message'; id: string; message: Message };

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
  const [activeConversationId, setActiveConversationId] = useState<string | null>(params?.conversationId || null);
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
        setActiveConversationId(null);
        setLoading(false);
        return;
      }
      setActiveConversationId(convId);

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
  }, [conversationId, bookingId, navigation, isGroup, offerId]);

  // Load more messages (pagination)
  const loadMoreMessages = async () => {
    if (!activeConversationId || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const lastMessage = messages[0];
      const response = await chatApi.getMessages(activeConversationId, {
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
    if (!activeConversationId) return;

    const handleNewMessage = (data: any) => {
      if (data.conversationId === activeConversationId && data.message) {
        setMessages((prev) => [...prev, data.message]);
        // Mark as read if it's not from current user
        if (data.message.senderId !== currentUserId) {
          chatApi.markMessageRead(data.message.messageId);
          websocketService.markAsRead(data.message.messageId, activeConversationId);
        }
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    const handleTypingStart = (data: any) => {
      if (data.conversationId === activeConversationId && data.userId !== currentUserId) {
        setOtherUserTyping(true);
      }
    };

    const handleTypingStop = (data: any) => {
      if (data.conversationId === activeConversationId && data.userId !== currentUserId) {
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
      if (activeConversationId) {
        websocketService.leaveConversation(activeConversationId);
      }
    };
  }, [activeConversationId, currentUserId]);

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
      if (activeConversationId) {
        websocketService.sendTyping(activeConversationId, true);
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (activeConversationId) {
        websocketService.sendTyping(activeConversationId, false);
      }
    }, 2000);
  };

  // Send message
  const handleSend = async () => {
    if (!message.trim() || !activeConversationId || sending) return;

    const messageText = message.trim();
    setMessage('');
    setIsTyping(false);
    if (activeConversationId) {
      websocketService.sendTyping(activeConversationId, false);
    }

    setSending(true);
    try {
      const response = await chatApi.sendMessage(activeConversationId, {
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
    if (!activeConversationId) return;

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
      const response = await chatApi.shareLocation(activeConversationId, {
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
  const getDateLabel = (dateString: string) => {
    const msgDate = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMsg = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
    const diffDays = Math.floor((startOfToday.getTime() - startOfMsg.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return msgDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const chatItems = useMemo<ChatListItem[]>(() => {
    const items: ChatListItem[] = [];
    let lastLabel = '';
    for (const msg of messages) {
      const label = getDateLabel(msg.sentAt);
      if (label !== lastLabel) {
        items.push({
          type: 'separator',
          id: `sep-${label}-${msg.messageId}`,
          label,
        });
        lastLabel = label;
      }
      items.push({
        type: 'message',
        id: msg.messageId,
        message: msg,
      });
    }
    return items;
  }, [messages]);

  const renderMessage = (item: Message) => {
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
        {isMine ? (
          <LinearGradient
            colors={[ORANGE_LIGHT, ORANGE_DARK]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.messageBubble, styles.myMessageBubble]}
          >
            {item.type === 'location' ? (
              <View style={styles.locationMessage}>
                <MapPin size={16} color={COLORS.white} />
                <Text style={[styles.messageText, styles.myMessageText]}>
                  {item.location?.address || 'Shared Location'}
                </Text>
              </View>
            ) : (
              <Text style={[styles.messageText, styles.myMessageText]}>
                {item.message}
              </Text>
            )}
            <Text style={[styles.messageTime, styles.myMessageTime]}>
              {formatTime(item.sentAt)}
            </Text>
            <Text style={styles.messageReadTick}>
              {item.readBy?.some((r) => r.userId !== currentUserId) ? '✓✓' : '✓'}
            </Text>
          </LinearGradient>
        ) : (
          <View style={[styles.messageBubble, styles.otherMessageBubble]}>
            <Text style={styles.senderName}>{item.senderName}</Text>
            {item.type === 'location' ? (
              <View style={styles.locationMessage}>
                <MapPin size={16} color={ORANGE_DARK} />
                <Text style={[styles.messageText, styles.otherMessageText]}>
                  {item.location?.address || 'Shared Location'}
                </Text>
              </View>
            ) : (
              <Text style={[styles.messageText, styles.otherMessageText]}>
                {item.message}
              </Text>
            )}
            <Text style={[styles.messageTime, styles.otherMessageTime]}>
              {formatTime(item.sentAt)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderChatItem = ({ item }: { item: ChatListItem }) => {
    if (item.type === 'separator') {
      return (
        <View style={styles.dateSeparatorWrap}>
          <Text style={styles.dateSeparatorText}>{item.label}</Text>
        </View>
      );
    }
    return renderMessage(item.message);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isGroup && conversationDetails?.groupName 
              ? conversationDetails.groupName 
              : displayOtherUser?.name || otherUser?.name || 'Chat'}
          </Text>
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
                <Text style={otherUserTyping ? styles.typingIndicator : styles.headerSubtitle}>
                  {otherUserTyping ? 'typing...' : 'Trip chat'}
                </Text>
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
          data={chatItems}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          inverted={false}
          onEndReached={hasMore ? loadMoreMessages : undefined}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={ORANGE_LIGHT} />
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
            {!message.trim() || sending ? (
              <View style={styles.sendButtonDisabledInner}>
                {sending ? (
                  <Loader size={20} color={COLORS.white} />
                ) : (
                  <Send size={20} color={COLORS.white} />
                )}
              </View>
            ) : (
              <LinearGradient
                colors={[ORANGE_LIGHT, ORANGE_DARK]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.sendButtonGradient}
              >
                <Send size={20} color={COLORS.white} />
              </LinearGradient>
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
    backgroundColor: '#EEF2F6',
  },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(14),
    paddingTop: normalize(46),
    paddingBottom: normalize(10),
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF1',
  },
  backButton: {
    paddingVertical: normalize(4),
    paddingRight: normalize(8),
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: normalize(2),
  },
  headerAvatar: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerUserInfo: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(17),
    color: COLORS.text,
    fontWeight: '700',
  },
  headerName: {
    fontFamily: FONTS.regular,
    fontSize: normalize(16),
    color: COLORS.text,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  typingIndicator: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: ORANGE_DARK,
    fontStyle: 'italic',
    marginTop: 2,
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
    paddingHorizontal: normalize(12),
    paddingTop: normalize(14),
    paddingBottom: normalize(12),
  },
  loadingMore: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  messageWrapper: {
    marginBottom: normalize(10),
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myMessageWrapper: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  otherMessageWrapper: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  messageAvatar: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    marginRight: SPACING.xs,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(8),
    borderRadius: normalize(14),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  myMessageBubble: {
    borderBottomRightRadius: normalize(6),
  },
  otherMessageBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: normalize(6),
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  senderName: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: ORANGE_DARK,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    lineHeight: normalize(20),
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
  messageReadTick: {
    fontFamily: FONTS.regular,
    fontSize: normalize(10),
    color: 'rgba(255, 255, 255, 0.9)',
    alignSelf: 'flex-end',
    marginTop: normalize(2),
    marginLeft: normalize(8),
    fontWeight: '700',
  },
  otherMessageTime: {
    color: COLORS.textSecondary,
  },
  dateSeparatorWrap: {
    alignSelf: 'center',
    backgroundColor: '#E7EDF3',
    paddingHorizontal: normalize(10),
    paddingVertical: normalize(4),
    borderRadius: normalize(10),
    marginBottom: normalize(8),
    marginTop: normalize(2),
  },
  dateSeparatorText: {
    fontFamily: FONTS.regular,
    fontSize: normalize(11),
    color: '#6B7280',
    fontWeight: '600',
  },
  locationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(6),
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: normalize(6),
  },
  systemMessage: {
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    backgroundColor: '#FFF7EC',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: normalize(10),
    paddingTop: normalize(8),
    paddingBottom: normalize(24),
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#E8ECF1',
    gap: SPACING.xs,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: normalize(24),
    borderWidth: 1,
    borderColor: '#E5EAF0',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs / 2,
  },
  attachButton: {
    width: normalize(30),
    height: normalize(30),
    borderRadius: normalize(15),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E5',
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    maxHeight: normalize(100),
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minHeight: normalize(36),
  },
  sendButton: {
    width: normalize(46),
    height: normalize(46),
    borderRadius: normalize(23),
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#D9D9D9',
    elevation: 0,
  },
  sendButtonDisabledInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D9D9D9',
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatScreen;
