/**
 * WebSocket Service for Real-time Chat
 */

import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Token key from api.service.ts
const TOKEN_KEY = '@forlok_access_token';

export type WebSocketEventType =
  | 'auth:success'
  | 'conversations:list'
  | 'message:new'
  | 'message:delivered'
  | 'message:read'
  | 'typing:start'
  | 'typing:stop'
  | 'error'
  | 'joined'
  | 'left';

export interface WebSocketMessage {
  type: WebSocketEventType;
  data?: any;
  message?: any;
  conversationId?: string;
  userId?: string;
  messageId?: string;
  [key: string]: any;
}

type WebSocketEventHandler = (data: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers: Map<WebSocketEventType, Set<WebSocketEventHandler>> = new Map();
  private isConnecting = false;
  private isAuthenticated = false;
  private userId: string | null = null;
  private manuallyClosed = false;

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.manuallyClosed = false;
    this.isConnecting = true;

    try {
      // Get token for authentication
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        console.log('ℹ️ WebSocket: No auth token, skipping connection');
        this.isConnecting = false;
        return;
      }

      // Get WebSocket URL with token as query parameter
      const wsUrl = API_CONFIG.BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://') + `/ws/chat?token=${encodeURIComponent(token)}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        // Send auth message to server
        this.authenticate();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.warn('WebSocket: Error parsing message');
        }
      };

      this.ws.onerror = () => {
        // Suppress noisy error logs — onclose handles reconnection
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        this.isAuthenticated = false;
        this.isConnecting = false;
        this.ws = null;

        // Only reconnect if not manually closed and under retry limit
        if (!this.manuallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log('ℹ️ WebSocket: Server unreachable, will retry when chat is opened');
          this.reconnectAttempts = 0;
        }
      };
    } catch (error) {
      console.warn('WebSocket: Connection failed');
      this.isConnecting = false;
    }
  }

  /**
   * Authenticate with WebSocket server
   */
  private async authenticate(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        console.error('No auth token found');
        return;
      }

      // Get userId from stored user object
      const storedUser = await AsyncStorage.getItem('@forlok_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          this.userId = userData.userId || null;
        } catch {
          // ignore parse error
        }
      }

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'auth',
            token,
          })
        );
      }
    } catch (error) {
      console.error('Error authenticating WebSocket:', error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    if (message.type === 'auth:success') {
      this.isAuthenticated = true;
      this.userId = message.userId || this.userId;
      console.log('✅ WebSocket authenticated');
    }

    // Call registered event handlers
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in WebSocket event handler:', error);
        }
      });
    }

    // Also call handlers for 'message' type events
    if (message.type === 'message:new' && message.message) {
      const messageHandlers = this.eventHandlers.get('message:new');
      if (messageHandlers) {
        messageHandlers.forEach((handler) => {
          try {
            handler(message);
          } catch (error) {
            console.error('Error in message handler:', error);
          }
        });
      }
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    if (this.reconnectAttempts === 1) {
      console.log('ℹ️ WebSocket: Reconnecting...');
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated) {
      this.ws.send(
        JSON.stringify({
          type: 'join:conversation',
          conversationId,
        })
      );
    }
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'leave:conversation',
          conversationId,
        })
      );
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(conversationId: string, isTyping: boolean): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated) {
      this.ws.send(
        JSON.stringify({
          type: isTyping ? 'typing:start' : 'typing:stop',
          conversationId,
        })
      );
    }
  }

  /**
   * Mark message as delivered
   */
  markAsDelivered(messageId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated) {
      this.ws.send(
        JSON.stringify({
          type: 'message:delivered',
          messageId,
        })
      );
    }
  }

  /**
   * Mark message as read
   */
  markAsRead(messageId: string, conversationId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated) {
      this.ws.send(
        JSON.stringify({
          type: 'message:read',
          messageId,
          conversationId,
        })
      );
    }
  }

  /**
   * Register event handler
   */
  on(event: WebSocketEventType, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  /**
   * Remove event handler
   */
  off(event: WebSocketEventType, handler: WebSocketEventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.manuallyClosed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isAuthenticated = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.eventHandlers.clear();
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): 'connecting' | 'connected' | 'disconnected' {
    if (this.isConnecting) return 'connecting';
    if (this.isConnected()) return 'connected';
    return 'disconnected';
  }
}

export const websocketService = new WebSocketService();
