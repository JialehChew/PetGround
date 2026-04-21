import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

// create base URL from env or default to localhost:3000/api
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// API endpoints configuration
export const API_ENDPOINTS = {
  AUTH: `${BASE_URL}/auth`,
  PETS: `${BASE_URL}/pets`,
  APPOINTMENTS: `${BASE_URL}/appointments`,
  GROOMERS: `${BASE_URL}/groomers`,
};

// create axios instance
const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  const refreshClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    withCredentials: true,
  });

  let isRefreshing = false;
  let pendingRequests: Array<(token: string | null) => void> = [];

  const enqueuePendingRequest = (cb: (token: string | null) => void) => {
    pendingRequests.push(cb);
  };

  const resolvePendingRequests = (token: string | null) => {
    pendingRequests.forEach((cb) => cb(token));
    pendingRequests = [];
  };

  const shouldSkipRefresh = (requestUrl?: string) => {
    if (!requestUrl) return false;
    return [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/refresh',
      '/auth/verify-email',
    ].some((path) => requestUrl.includes(path));
  };

  // request interceptor to add auth token
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // FormData must not use default JSON Content-Type; let the runtime set multipart boundary
      if (config.data instanceof FormData && config.headers) {
        const h = config.headers as { delete?: (name: string) => void } & Record<string, unknown>;
        if (typeof h.delete === 'function') {
          h.delete('Content-Type');
          h.delete('content-type');
        } else {
          delete h['Content-Type'];
          delete h['content-type'];
        }
      }

      // use consistent token key
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      console.error('API Error:', error.response?.data || error.message);

      const originalRequest = (error.config || {}) as AxiosRequestConfig & { _retry?: boolean };
      const status = error.response?.status;
      const requestUrl = originalRequest.url;

      if (status === 401 && !shouldSkipRefresh(requestUrl)) {
        if (originalRequest._retry) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            enqueuePendingRequest((newToken) => {
              if (!newToken) {
                reject(error);
                return;
              }
              originalRequest.headers = originalRequest.headers || {};
              (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
              resolve(instance(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshResponse = await refreshClient.post('/auth/refresh');
          const newToken = refreshResponse.data?.accessToken || refreshResponse.data?.token;
          if (!newToken) {
            throw new Error('No access token returned from refresh endpoint');
          }

          localStorage.setItem('authToken', newToken);
          resolvePendingRequests(newToken);

          originalRequest.headers = originalRequest.headers || {};
          (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          resolvePendingRequests(null);
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// export the configured axios instance
export const api = createApiInstance();

// export endpoints for backward compatibility
export default API_ENDPOINTS;
