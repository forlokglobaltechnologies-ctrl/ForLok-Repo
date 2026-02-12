import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api.service';
import { websocketService } from '../services/websocket.service';

const TOKEN_KEY = '@forlok_access_token';
const REFRESH_TOKEN_KEY = '@forlok_refresh_token';
const USER_KEY = '@forlok_user';

interface User {
  userId: string;
  username?: string;
  name?: string;
  phone?: string;
  email?: string;
  userType?: string;
  gender?: string;
  [key: string]: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (userData: User, tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: async () => {},
  logout: async () => {},
  updateUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Check for existing tokens on app startup
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);

      if (token && refreshToken) {
        // We have tokens — user is authenticated
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        setIsAuthenticated(true);
        // Connect WebSocket now that we're authenticated
        websocketService.connect();
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (userData: User, tokens: { accessToken: string; refreshToken: string }) => {
    try {
      // Save tokens
      await apiService.saveTokens(tokens.accessToken, tokens.refreshToken);
      // Save user data
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      // Connect WebSocket after login
      websocketService.connect();
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Disconnect WebSocket before clearing tokens
      websocketService.disconnect();
      await apiService.clearTokens();
      await AsyncStorage.removeItem(USER_KEY);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, []);

  const updateUser = useCallback(async (userData: Partial<User>) => {
    try {
      const updatedUser = { ...user, ...userData } as User;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
