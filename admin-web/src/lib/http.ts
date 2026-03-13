import axios from 'axios';
import { API_BASE_URL, replaceParams } from '../config/api';

export const TOKEN_KEY = 'forlok_admin_access_token';
export const REFRESH_TOKEN_KEY = 'forlok_admin_refresh_token';

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type ApiCallOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: any;
};

export async function apiCall<T = any>(path: string, options: ApiCallOptions = {}): Promise<T> {
  const { method = 'GET', params, query, body } = options;
  const url = params ? replaceParams(path, params) : path;
  const response = await http.request<T>({
    url,
    method,
    params: query,
    data: body,
  });
  return response.data;
}

export const getDataPayload = <T = any>(response: any): T => response?.data ?? response;
