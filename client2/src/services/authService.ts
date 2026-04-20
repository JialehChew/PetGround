import type { User, RegisterData, LoginResponse, ApiError } from "../types";
import { api } from '../config/api';

const initializeAuth = (): boolean => {
  const token = localStorage.getItem("authToken");
  if (token) {
    return true;
  }
  return false;
};

const register = async (userData: RegisterData): Promise<LoginResponse> => {
  try {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error: unknown) {
    console.error("Registration error:", error);
    const apiError = error as { response?: { data?: ApiError } };
    throw apiError.response?.data || { error: "Registration failed" };
  }
};

const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post('/auth/login', { 
      email, 
      password 
    });
    
    if (response.data.token) {
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error: unknown) {
    console.error("Login error:", error);
    const apiError = error as { response?: { data?: ApiError } };
    throw apiError.response?.data || { error: "Login failed" };
  }
};

const logout = (): void => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
};

const forgotPassword = async (email: string): Promise<{ message: string }> => {
  try {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  } catch (error: unknown) {
    console.error("Forgot password error:", error);
    const apiError = error as { response?: { data?: ApiError } };
    throw apiError.response?.data || { error: "Failed to send reset email" };
  }
};

const resetPassword = async (token: string, password: string): Promise<{ message: string }> => {
  try {
    const response = await api.post(`/auth/reset-password/${token}`, { password });
    return response.data;
  } catch (error: unknown) {
    console.error("Reset password error:", error);
    const apiError = error as { response?: { data?: ApiError } };
    throw apiError.response?.data || { error: "Failed to reset password" };
  }
};

const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};

const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("authToken");
};

const getToken = (): string | null => {
  return localStorage.getItem("authToken");
};

const authService = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  isAuthenticated,
  getToken,
  initializeAuth,
};

export default authService;
