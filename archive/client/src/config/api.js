// centralized API config

import axios from "axios";

// base API url with fallback
export const BASE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.headers.common["Accept"] = "application/json";
axios.defaults.headers.common["Content-Type"] = "application/json";

// endpoint-specific URLs
export const API_ENDPOINTS = {
  AUTH: `${BASE_API_URL}/auth`,
  PETS: `${BASE_API_URL}/pets`,
  GROOMERS: `${BASE_API_URL}/groomers`,
  APPOINTMENTS: `${BASE_API_URL}/appointments`,
};

// add interceptor to handle errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default API_ENDPOINTS;
