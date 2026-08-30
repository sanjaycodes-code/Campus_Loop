import axios from 'axios';

// Base API instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
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
      // If unauthorized, clear invalid token
      const isAuthCheck = error.config.url?.includes('/auth/me');
      if (isAuthCheck) {
        localStorage.removeItem('campusloop_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
