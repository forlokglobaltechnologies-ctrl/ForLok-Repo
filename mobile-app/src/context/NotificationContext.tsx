import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { notificationApi } from '@utils/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await notificationApi.getUnreadCount();
      if (response.success && response.data !== undefined) {
        const count = typeof response.data === 'number' 
          ? response.data 
          : response.data?.unreadCount ?? response.data?.count ?? 0;
        setUnreadCount(count);
      }
    } catch (_error) {
      // Silently fail
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (_error) {
      // Silently fail
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setUnreadCount(0);
    } catch (_error) {
      // Silently fail
    }
  }, []);

  // Poll for unread count every 10 seconds
  useEffect(() => {
    refreshUnreadCount();

    pollRef.current = setInterval(() => {
      refreshUnreadCount();
    }, 10000);

    // Also refresh when app comes to foreground
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        refreshUnreadCount();
      }
    });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      subscription.remove();
    };
  }, [refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
