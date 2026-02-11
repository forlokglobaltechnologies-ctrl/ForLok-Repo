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
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers: Map<WebSocketEventType, Set<WebSocketEventHandler>> = new Map();
  private isConnecting = false;
  private isAuthenticated = false;
  private userId: string | null = null;

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      // Get token for authentication
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        console.warn('No auth token found for WebSocket connection');
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
        // Authentication is handled via token in URL, no need to call authenticate()
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        this.isAuthenticated = false;
        this.isConnecting = false;
        this.ws = null;

        // Attempt to reconnect if not manually closed
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
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

      // Get userId from token or AsyncStorage
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        console.error('No userId found');
        return;
      }

      this.userId = userId;

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

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

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
