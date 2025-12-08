/**
 * Authentication Context
 * Manages user authentication state across the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../lib/api/client';
import type { ApiResponse } from '../lib/api/types';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

interface LoginResponse {
  token: string;
  user: User;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  console.log('[AuthProvider] Component initializing');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load stored auth on mount (skip verification - trust stored token)
  useEffect(() => {
    console.log('[AuthProvider] useEffect triggered - loading stored auth');
    loadStoredAuth(true); // Skip verification on app start
  }, []);

  const loadStoredAuth = async (skipVerification = false) => {
    try {
      console.log('[AuthProvider] Loading stored auth from AsyncStorage');
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user');

      console.log('[AuthProvider] Stored auth:', { hasToken: !!storedToken, hasUser: !!storedUser });

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        console.log('[AuthProvider] Auth loaded successfully');

        // Verify token is still valid (skip for fresh logins)
        if (!skipVerification) {
          await verifyToken(storedToken);
        }
      } else {
        console.log('[AuthProvider] No stored auth found');
      }
    } catch (error) {
      console.error('[AuthContext] Error loading stored auth:', error);
      await logout();
    } finally {
      setLoading(false);
      console.log('[AuthProvider] Loading complete, isAuthenticated:', !!user && !!token);
    }
  };

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response: ApiResponse<{ user: User }> = await apiClient.get(
        '/api/auth/mobile-login'
      );

      if (response.success && response.data) {
        setUser(response.data.user);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      } else {
        // Token invalid, logout
        await logout();
      }
    } catch (error) {
      console.error('[AuthContext] Token verification failed:', error);
      await logout();
    }
  };

  const login = async (email: string, password: string) => {
    const response: ApiResponse<LoginResponse> = await apiClient.post(
      '/api/auth/mobile-login',
      {
        email: email.toLowerCase().trim(),
        password,
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Login failed');
    }

    const { token: newToken, user: newUser } = response.data;

    // Store credentials
    await AsyncStorage.setItem('auth_token', newToken);
    await AsyncStorage.setItem('user', JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);

    console.log('[AuthContext] Login successful:', newUser.email);
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
      console.log('[AuthContext] Logged out');
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    await verifyToken(token);
  };

  const checkAuth = async () => {
    console.log('[AuthContext] Checking auth after login...');
    await loadStoredAuth(true); // Skip verification for fresh login
    console.log('[AuthContext] Auth loaded, isAuthenticated:', !!user && !!token);
  };

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    loading,
    login,
    logout,
    refreshUser,
    checkAuth,
  };

  console.log('[AuthProvider] Rendering, loading:', loading, 'isAuthenticated:', !!user && !!token);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
