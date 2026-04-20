import axios from "axios";
import { API_ENDPOINTS } from "../config/api";

const API_URL = API_ENDPOINTS.AUTH;

// Configure axios defaults
axios.defaults.withCredentials = true;

const setAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common["Authorization"];
  }
};

const initializeAuth = () => {
  const token = localStorage.getItem("authToken");
  if (token) {
    setAuthToken(token);
    return true;
  }
  return false;
};

const register = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/register`, userData);
    if (response.data.token) {
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      setAuthToken(response.data.token);
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: "Registration failed" };
  }
};

const login = async (email, password) => {
  try {
    const response = await axios.post(
      `${API_URL}/login`,
      { email, password },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: true,
      }
    );
    if (response.data.token) {
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      setAuthToken(response.data.token);
    }
    return response.data;
  } catch (error) {
    console.error("Login error:", error);
    throw error.response?.data || { error: "Login failed" };
  }
};

const logout = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  setAuthToken(null);
};

const getCurrentUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

const isAuthenticated = () => {
  return localStorage.getItem("authToken") !== null;
};

const getToken = () => {
  return localStorage.getItem("authToken");
};

const authService = {
  register,
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  getToken,
  initializeAuth,
};

export default authService;
