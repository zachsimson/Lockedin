import axios from 'axios';
import storage from './storage';
import { Platform } from 'react-native';

// Get the backend URL
// For both web and mobile, we use the full backend URL 
// because Expo dev server doesn't proxy API requests
const getApiUrl = () => {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  console.log('[API] EXPO_PUBLIC_BACKEND_URL:', backendUrl);
  
  // Use the environment variable if available, otherwise use the default
  if (backendUrl) {
    return backendUrl;
  }
  
  // Fallback for web development
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Use current host if we're on web
    return window.location.origin;
  }
  
  return 'https://gamblefree.preview.emergentagent.com';
};

const API_URL = getApiUrl();
console.log('[API] Using API_URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('[API] Request:', config.method?.toUpperCase(), config.baseURL + config.url);
  return config;
});

// Log responses/errors for debugging
api.interceptors.response.use(
  (response) => {
    console.log('[API] Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('[API] Error:', error.message, error.config?.url);
    return Promise.reject(error);
  }
);

export default api;
