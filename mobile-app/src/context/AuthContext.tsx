import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/api.service';
import { websocketService } from '../services/websocket.service';
import { API_CONFIG } from '../config/api';

const TOKEN_KEY = '@forlok_access_token';
const REFRESH_TOKEN_KEY = '@forlok_refresh_token';
const USER_KEY = '@forlok_user';
const DEBUG_ENDPOINT = 'http://127.0.0.1:7775/ingest/9bdd2fd3-ac77-45be-b342-a40ab02f34f7';

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
      // #region agent log
      fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H7',location:'AuthContext.tsx:checkAuthState:start',message:'Auth state bootstrap started',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);

      if (token && refreshToken) {
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (parseError: any) {
            // #region agent log
            fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H8',location:'AuthContext.tsx:checkAuthState:parseUser:catch',message:'Stored user JSON parse failed',data:{errorMessage:parseError?.message || 'unknown'},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            await AsyncStorage.removeItem(USER_KEY);
            setUser(null);
          }
        }
        setIsAuthenticated(true);
        setIsLoading(false);
        // #region agent log
        fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H7',location:'AuthContext.tsx:checkAuthState:tokensFound',message:'Auth tokens found; user marked authenticated',data:{hasStoredUser:!!storedUser},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        websocketService.connect();

        // Refresh profile in the background — don't block the splash screen
        apiService.request(API_CONFIG.ENDPOINTS.USER.PROFILE, {
          method: 'GET',
          requiresAuth: true,
        }).then(async (profileResp) => {
          if (profileResp.success && profileResp.data) {
            const freshUser = profileResp.data;
            setUser(freshUser);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(freshUser));
          } else if (profileResp.error?.includes('Authentication failed') || profileResp.error?.includes('Please login')) {
            console.warn('Session expired, logging out');
            await apiService.clearTokens();
            await AsyncStorage.removeItem(USER_KEY);
            setUser(null);
            setIsAuthenticated(false);
          }
        }).catch(() => {});
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        // #region agent log
        fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H7',location:'AuthContext.tsx:checkAuthState:noTokens',message:'No auth tokens found; unauthenticated path',data:{},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      }
    } catch (error) {
      // #region agent log
      fetch(DEBUG_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9d349f'},body:JSON.stringify({sessionId:'9d349f',runId:'startup',hypothesisId:'H7',location:'AuthContext.tsx:checkAuthState:catch',message:'Auth bootstrap failed',data:{errorMessage:(error as any)?.message || 'unknown'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      console.error('Error checking auth state:', error);
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
    }
  };

  const login = useCallback(async (userData: User, tokens: { accessToken: string; refreshToken: string }) => {
    try {
      // Save tokens first so authenticated requests work
      await apiService.saveTokens(tokens.accessToken, tokens.refreshToken);

      // Set auth state with login response data (instant)
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);

      // Fetch full profile to fill any fields missing from the login response
      const profileResp = await apiService.request(API_CONFIG.ENDPOINTS.USER.PROFILE, {
        method: 'GET',
        requiresAuth: true,
      });
      if (profileResp.success && profileResp.data) {
        const fullUser = profileResp.data;
        setUser(fullUser);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(fullUser));
      }

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
