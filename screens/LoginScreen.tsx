/**
 * Login Screen
 * Authenticates users with JWT tokens via /api/auth/mobile-login
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ColorTheme } from '../theme/ThemeContext';
import NeomorphicInput from '../components/NeomorphicInput';
import NeomorphicButton from '../components/NeomorphicButton';
import NeomorphicToggle from '../components/NeomorphicToggle';
import { apiClient } from '../lib/api/client';
import type { ApiResponse } from '../lib/api/types';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
}

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  console.log('[LoginScreen] ===== LOGIN SCREEN RENDERING =====');
  const { tokens, colorTheme, setColorTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordInputRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    console.log('[LoginScreen] ===== HANDLE LOGIN CALLED =====');
    console.log('[LoginScreen] Email:', email);
    console.log('[LoginScreen] Password exists:', !!password);

    // Validate inputs
    if (!email || !password) {
      console.log('[LoginScreen] Validation failed - missing email or password');
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    console.log('[LoginScreen] Validation passed, setting loading...');
    setLoading(true);

    try {
      const credentials = {
        email: email.toLowerCase().trim(),
        password,
      };

      console.log('[LoginScreen] Attempting login with email:', credentials.email);
      console.log('[LoginScreen] Password length:', credentials.password.length);

      // Call the JWT login endpoint
      const response: any = await apiClient.post(
        '/api/auth/mobile-login',
        credentials
      );

      console.log('[LoginScreen] Response received, success:', response.success);
      console.log('[LoginScreen] Has token:', !!response.token);
      console.log('[LoginScreen] Has user:', !!response.user);

      if (response.success) {
        // Token and user are at top level of response, not in response.data
        const token = response.token || response.data?.token;
        const user = response.user || response.data?.user;

        console.log('[LoginScreen] Extracted token:', !!token);
        console.log('[LoginScreen] Extracted user:', user ? user.email : 'none');

        if (token && user) {
          // Store token in AsyncStorage
          console.log('[LoginScreen] Storing auth data...');
          await AsyncStorage.setItem('auth_token', token);
          await AsyncStorage.setItem('user', JSON.stringify(user));

          console.log('[LoginScreen] Auth data stored successfully');
          console.log('[LoginScreen] Calling onLoginSuccess...');

          // Navigate to main app
          onLoginSuccess();

          console.log('[LoginScreen] onLoginSuccess called');
        } else {
          console.error('[LoginScreen] Missing token or user in response');
          console.error('[LoginScreen] Token:', token);
          console.error('[LoginScreen] User:', user);
          Alert.alert('Login Failed', 'Invalid response from server');
        }
      } else {
        console.error('[LoginScreen] Login failed, response.success is false');
        Alert.alert('Login Failed', response.error || 'Invalid credentials');
      }
    } catch (error: any) {
      console.error('[LoginScreen] Login error:', error);
      Alert.alert(
        'Login Error',
        error.message || 'Unable to connect to server'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const themes: ColorTheme[] = ['light', 'mocha'];
    const currentIndex = themes.indexOf(colorTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setColorTheme(themes[nextIndex]);
  };

  const isDark = colorTheme === 'mocha' || colorTheme === 'true-night';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: tokens.background }]}
    >
      {/* Theme switcher in top right */}
      <View style={styles.themeToggleContainer}>
        <TouchableOpacity
          onPress={toggleTheme}
          style={styles.themeToggle}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={24} color={tokens.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: tokens.textPrimary }]}>
            Becky CRM
          </Text>
          <Text style={[styles.subtitle, { color: tokens.textSecondary }]}>
            Sign in to continue
          </Text>
        </View>

        {/* Login Form with better spacing */}
        <View style={styles.formCard}>
          <View style={styles.form}>
            <NeomorphicInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              nextInput={passwordInputRef}
              style={styles.input}
            />

            <NeomorphicInput
              ref={passwordInputRef}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
              style={styles.input}
            />

            <NeomorphicButton
              onPress={handleLogin}
              variant="active"
              size="large"
              disabled={loading}
              style={styles.button}
            >
              {loading ? (
                <ActivityIndicator color={tokens.background} />
              ) : (
                'Sign In'
              )}
            </NeomorphicButton>
          </View>
        </View>

        {/* Demo credentials hint */}
        <View style={styles.footer}>
          <Text style={[styles.hint, { color: tokens.textSecondary }]}>
            Demo: Use your email and password from the web app
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  themeToggleContainer: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 100,
  },
  themeToggle: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: 'Montserrat',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  formCard: {
    width: '100%',
    paddingVertical: 32,
  },
  form: {
    width: '100%',
    gap: 24,
  },
  input: {
    width: '100%',
    marginBottom: 0,
  },
  button: {
    width: '100%',
    marginTop: 8,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
  },
});
