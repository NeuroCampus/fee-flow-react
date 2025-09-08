
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authAPI } from '@/lib/api';

interface User {
  id: number;
  email: string;
  role: 'student' | 'admin' | 'hod';
  is_staff: boolean;
  is_superuser: boolean;
  name?: string;
  usn?: string;
  dept?: string;
  semester?: number;
  admission_mode?: string;
  status?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (storedAccessToken && storedRefreshToken) {
        try {
          // In a real application, you might want to refresh the token here
          // For now, we'll just assume the token is valid and fetch user data.
          const response = await authAPI.me();
          setUser(response.data);
          setAccessToken(storedAccessToken);
        } catch (error) {
          console.error('Auth check error:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
          setAccessToken(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      const { access, refresh, user: userData } = response.data;
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      setUser(userData);
      setAccessToken(access);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const navigate = useNavigate();

  const logout = () => {
    // perform an async logout with best-effort backend call, then clear local state/storage and navigate
    (async () => {
      try {
        await authAPI.logout();
      } catch (e) {
        // ignore network errors — proceed to clear local session
        console.debug('Backend logout failed or unavailable', e);
      }

      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setAccessToken(null);

      // Clear any axios default Authorization header
      try {
        delete (axios.defaults.headers.common as any).Authorization;
      } catch (e) {
        // ignore
      }

      // Redirect to login page (replace history)
      try {
        navigate('/login', { replace: true });
      } catch (e) {
        // Fallback to full reload if react-router isn't available for some reason
        window.location.href = '/login';
      }
    })();
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
