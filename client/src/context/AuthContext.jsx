import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // In-memory token & user state, initialized from localStorage if available
  const [token, setToken] = useState(() => localStorage.getItem('campusloop_token') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  /**
   * Verify session on app load or page refresh using GET /api/auth/me
   */
  const loadUserFromToken = useCallback(async () => {
    const storedToken = localStorage.getItem('campusloop_token');
    if (!storedToken) {
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      if (response.data?.success && response.data?.user) {
        setUser(response.data.user);
        setToken(storedToken);
      } else {
        throw new Error('Failed to validate session');
      }
    } catch (err) {
      console.warn('Session expired or invalid token:', err.response?.data?.message || err.message);
      localStorage.removeItem('campusloop_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserFromToken();
  }, [loadUserFromToken]);

  /**
   * Register new user (restricted to NIT Durgapur emails)
   */
  const register = async ({ name, email, password, campus, phone }) => {
    setAuthError(null);
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        campus,
        phone,
      });

      const { token: receivedToken, user: receivedUser } = response.data;

      // Persist in localStorage and in-memory state
      localStorage.setItem('campusloop_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);

      return { success: true, user: receivedUser };
    } catch (err) {
      const isDev = import.meta.env.DEV;
      const networkMessage = isDev
        ? 'Cannot connect to local backend (port 5000). Make sure npm run dev is running.'
        : 'Cannot connect to backend server. If the server was sleeping, please wait a moment and try again.';
      const message =
        err.response?.data?.message ||
        (err.code === 'ERR_NETWORK' || !err.response
          ? networkMessage
          : 'Registration failed. Please check your details.');
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  /**
   * Login user with email & password
   */
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const { token: receivedToken, user: receivedUser } = response.data;

      // Persist in localStorage and in-memory state
      localStorage.setItem('campusloop_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);

      return { success: true, user: receivedUser };
    } catch (err) {
      const isDev = import.meta.env.DEV;
      const networkMessage = isDev
        ? 'Cannot connect to local backend (port 5000). Make sure npm run dev is running.'
        : 'Cannot connect to backend server. If the server was sleeping, please wait a moment and try again.';
      const message =
        err.response?.data?.message ||
        (err.code === 'ERR_NETWORK' || !err.response
          ? networkMessage
          : 'Invalid email or password. Please try again.');
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  /**
   * Login as Guest Demo User
   */
  const guestLogin = async () => {
    setAuthError(null);
    try {
      const response = await api.post('/auth/guest-login');
      const { token: receivedToken, user: receivedUser } = response.data;

      // Persist in localStorage and in-memory state
      localStorage.setItem('campusloop_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);

      return { success: true, user: receivedUser };
    } catch (err) {
      const isDev = import.meta.env.DEV;
      const networkMessage = isDev
        ? 'Cannot connect to local backend (port 5000). Make sure npm run dev is running.'
        : 'Cannot connect to backend server. If the server was sleeping, please wait a moment and try again.';
      const message =
        err.response?.data?.message ||
        (err.code === 'ERR_NETWORK' || !err.response
          ? networkMessage
          : 'Failed to enter Demo Mode. Please try again.');
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  /**
   * Logout user and clear tokens
   */
  const logout = () => {
    localStorage.removeItem('campusloop_token');
    setToken(null);
    setUser(null);
    setAuthError(null);
  };

  const clearAuthError = () => setAuthError(null);

  const value = {
    user,
    token,
    loading,
    authError,
    isAuthenticated: !!token && !!user,
    register,
    login,
    guestLogin,
    logout,
    clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to access auth context easily
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
