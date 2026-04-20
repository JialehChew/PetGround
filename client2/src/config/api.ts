import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

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
    (error) => {
      console.error('API Error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        // clear token and redirect to login on 401
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
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
