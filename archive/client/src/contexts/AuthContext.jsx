import React, { createContext, useState, useEffect, useContext } from "react";
import authService from "../services/authService";

// create the auth context
const AuthContext = createContext();

// custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // initialize auth state on app load
  useEffect(() => {
    const initAuth = () => {
      // check if token exists and set axios headers
      const isTokenValid = authService.initializeAuth();

      if (isTokenValid) {
        // get user from localStorage
        const savedUser = authService.getCurrentUser();
        setUser(savedUser);
        setIsAuthenticated(true);
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  // register a new user
  const register = async (userData) => {
    const response = await authService.register(userData);
    setUser(response.user);
    setIsAuthenticated(true);
    return response;
  };

  // login user
  const login = async (email, password) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    setIsAuthenticated(true);
    return response;
  };

  // logout user
  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // update user in context and localStorage if user data changes
  const updateUser = (updatedUser) => {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const authContextValue = {
    user,
    loading,
    isAuthenticated,
    register,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
