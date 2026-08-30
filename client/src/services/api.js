import axios from 'axios';

/**
 * Resolve API Base URL:
 * 1. Checks VITE_API_URL or VITE_API_BASE_URL from environment variables.
 * 2. In production builds, falls back to the deployed Render backend URL.
 * 3. In local development, falls back to '/api' (proxied by Vite to localhost:5000).
 */
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  if (import.meta.env.PROD) {
    return 'https://campus-loop-jxca.onrender.com/api';
  }
  return '/api';
};

// Base API instance
const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Request Interceptor: Automatically attaches Bearer JWT from localStorage to every outgoing request
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('campusloop_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor: Intercepts 401s (expired / invalid token) to clear stale state
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized during auth check, clear stale token
      const isAuthCheck = error.config.url?.includes('/auth/me');
      if (isAuthCheck) {
        localStorage.removeItem('campusloop_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
