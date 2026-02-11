/**
 * API Service
 * Handles all API calls to backend
 */

import { API_CONFIG, getApiUrl } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@forlok_access_token';
const REFRESH_TOKEN_KEY = '@forlok_refresh_token';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  requiresAuth?: boolean;
}

class ApiService {
  /**
   * Get access token from storage
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Get refresh token from storage
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Save tokens to storage
   */
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, accessToken);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  /**
   * Clear tokens from storage
   */
  async clearTokens(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Make API request
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<{ success: boolean; data?: T; error?: string; message?: string }> {
    try {
      const {
        method = 'GET',
        headers = {},
        body,
        requiresAuth = true,
      } = options;

      // Build URL
      const url = getApiUrl(endpoint);

      // Prepare headers
      const requestHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        ...headers,
      };

      // Add authentication token if required
      if (requiresAuth) {
        const token = await this.getAccessToken();
        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
        }
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        method,
        headers: requestHeaders,
      };

      // Add body for POST, PUT, PATCH
      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        requestOptions.body = JSON.stringify(body);
      }

      // Make request
      const response = await fetch(url, requestOptions);

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && requiresAuth) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry request with new token
          const newToken = await this.getAccessToken();
          if (newToken) {
            requestHeaders['Authorization'] = `Bearer ${newToken}`;
            const retryResponse = await fetch(url, {
              ...requestOptions,
              headers: requestHeaders,
            });
            return this.handleResponse<T>(retryResponse);
          }
        }
        // Refresh failed, clear tokens
        await this.clearTokens();
        throw new Error('Authentication failed. Please login again.');
      }

      return this.handleResponse<T>(response);
    } catch (error: any) {
      console.error('API Request Error:', error);
      return {
        success: false,
        error: error.message || 'Network error. Please check your connection.',
      };
    }
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<{
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  }> {
    try {
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'Request failed',
          message: data.message,
        };
      }

      // Auto-save tokens if present in response
      if (data.data && data.data.tokens) {
        await this.saveTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
      } else if (data.tokens) {
        await this.saveTokens(data.tokens.accessToken, data.tokens.refreshToken);
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to parse response',
      };
    }
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await this.request<{
        accessToken: string;
        refreshToken: string;
      }>(API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN, {
        method: 'POST',
        body: { refreshToken },
        requiresAuth: false,
      });

      if (response.success && response.data) {
        await this.saveTokens(response.data.accessToken, response.data.refreshToken);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  /**
   * Upload file
   */
  async uploadFile(
    endpoint: string,
    file: { uri: string; type: string; name: string },
    additionalData?: Record<string, any>
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const url = getApiUrl(endpoint);

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as any);

      // Add additional data
      if (additionalData) {
        Object.keys(additionalData).forEach((key) => {
          formData.append(key, additionalData[key]);
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'File upload failed',
      };
    }
  }
}

export const apiService = new ApiService();
export default apiService;
