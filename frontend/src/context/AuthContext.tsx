import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import storage from '../services/storage';
import api from '../services/api';
import { User, AuthResponse } from '../types';
import { socketService } from '../services/socket';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, weeklyAmount: number) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        const response = await api.get('/api/auth/me');
        setUser(response.data);
        
        // Connect socket
        await socketService.connect();
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      await SecureStore.deleteItemAsync('authToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post<AuthResponse>('/api/auth/login', {
        email,
        password,
      });

      await SecureStore.setItemAsync('authToken', response.data.access_token);
      setUser(response.data.user);
      
      // Connect socket
      await socketService.connect();
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const register = async (username: string, email: string, password: string, weeklyAmount: number) => {
    try {
      const response = await api.post<AuthResponse>('/api/auth/register', {
        username,
        email,
        password,
        gambling_weekly_amount: weeklyAmount,
      });

      await SecureStore.setItemAsync('authToken', response.data.access_token);
      setUser(response.data.user);
      
      // Connect socket
      await socketService.connect();
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('authToken');
    setUser(null);
    socketService.disconnect();
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
