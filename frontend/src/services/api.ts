import axios from 'axios';
import storage from './storage';
import { Platform } from 'react-native';

// For mobile (Expo Go), we need the full backend URL
// For web, we can use relative URLs since both are served from same domain
const getApiUrl = () => {
  // On web, use relative URLs (empty string)
  if (Platform.OS === 'web') {
    return '';
  }
  
  // On mobile, use the environment variable
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  console.log('[API] Backend URL:', backendUrl);
  return backendUrl || 'https://gamblefree.preview.emergentagent.com';
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
  console.log('[API] Request:', config.method?.toUpperCase(), config.url);
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
