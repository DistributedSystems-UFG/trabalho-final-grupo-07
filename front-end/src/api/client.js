import axios from 'axios';

const API_GATEWAY_HOST = import.meta.env.VITE_API_GATEWAY_HOST || 'localhost:8000';

const apiClient = axios.create({
  baseURL: `http://${API_GATEWAY_HOST}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

let currentJwt = null;

export const setAuthToken = (jwt) => {
  currentJwt = jwt;
};

export const getAuthToken = () => currentJwt;

let onSessionExpired = null;

export const setOnSessionExpired = (callback) => {
  onSessionExpired = callback;
};

apiClient.interceptors.request.use((config) => {
  if (currentJwt) {
    config.headers.Authorization = `Bearer ${currentJwt}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = error.config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && currentJwt && !isAuthRoute) {
      currentJwt = null;
      if (onSessionExpired) {
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;