import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { apiCall, REFRESH_TOKEN_KEY, TOKEN_KEY } from '../lib/http';

type AdminUser = {
  adminId?: string;
  username?: string;
  role?: string;
  permissions?: string[];
};

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  admin: AdminUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  reloadPermissions: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  const loadFromStorage = useCallback(() => {
    const raw = localStorage.getItem('forlok_admin_profile');
    if (raw) {
      try {
        setAdmin(JSON.parse(raw));
      } catch {
        setAdmin(null);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const persistAdmin = (value: AdminUser | null) => {
    if (value) {
      localStorage.setItem('forlok_admin_profile', JSON.stringify(value));
    } else {
      localStorage.removeItem('forlok_admin_profile');
    }
  };

  const login = async (username: string, password: string) => {
    const res: any = await apiCall(API_ENDPOINTS.ADMIN_LOGIN, {
      method: 'POST',
      body: { username, password },
    });
    const adminData = res?.data?.admin ?? res?.admin;
    const tokens = res?.data?.tokens ?? res?.tokens;
    if (!tokens?.accessToken || !adminData) {
      throw new Error(res?.message || 'Invalid login response');
    }
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
    setAdmin(adminData);
    persistAdmin(adminData);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    persistAdmin(null);
    setAdmin(null);
  };

  const reloadPermissions = async () => {
    const res: any = await apiCall(API_ENDPOINTS.ADMIN_PERMISSIONS);
    const payload = res?.data ?? res;
    setAdmin((prev) => {
      const next = {
        ...(prev || {}),
        adminId: payload?.adminId ?? prev?.adminId,
        role: payload?.role ?? prev?.role,
        permissions: payload?.permissions ?? prev?.permissions ?? [],
      };
      persistAdmin(next);
      return next;
    });
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
      admin,
      login,
      logout,
      reloadPermissions,
    }),
    [admin, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
