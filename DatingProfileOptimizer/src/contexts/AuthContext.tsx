import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  email_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (tokens: { access_token: string; refresh_token: string }, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const [accessToken, userData] = await AsyncStorage.multiGet([
        '@access_token',
        '@user_data',
      ]);

      if (accessToken[1] && userData[1]) {
        const parsedUser = JSON.parse(userData[1]);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (tokens: { access_token: string; refresh_token: string }, user: User) => {
    try {
      await AsyncStorage.multiSet([
        ['@access_token', tokens.access_token],
        ['@refresh_token', tokens.refresh_token],
        ['@user_data', JSON.stringify(user)],
      ]);
      setUser(user);
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        '@access_token',
        '@refresh_token',
        '@user_data',
      ]);
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenValue = await AsyncStorage.getItem('@refresh_token');
      
      if (!refreshTokenValue) {
        return false;
      }

      const response = await fetch('http://localhost:3004/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshTokenValue,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await AsyncStorage.setItem('@access_token', data.tokens.access_token);
        return true;
      } else {
        // Refresh token is invalid, logout user
        await logout();
        return false;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};