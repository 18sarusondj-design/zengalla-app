/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { toast } from 'sonner';
import api from '../../../config/api.js';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const hasToken = !!localStorage.getItem('token');
      if (!hasToken) {
        localStorage.removeItem('cached_user');
        return null;
      }
      const cached = localStorage.getItem('cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch (err) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(() => {
    const hasToken = !!localStorage.getItem('token');
    const hasCachedUser = !!localStorage.getItem('cached_user');
    return hasToken && !hasCachedUser;
  });

  // Load user on mount if token exists
  useEffect(() => {
    if (token) {
      const hasCachedUser = !!localStorage.getItem('cached_user');
      refreshUser(hasCachedUser);
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUser = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      localStorage.setItem('cached_user', JSON.stringify(data.user));
    } catch (err) {
      // ONLY clear session if the server explicitly reports 401/403 (unauthorized/invalid token)
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('cached_user');
        setToken(null);
        setRefreshToken(null);
        setUser(null);
      } else {
        console.warn("Silent session sync failed (network or server issue):", err.message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('cached_user', JSON.stringify(data.user));
      setToken(data.token);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await api.post('/auth/register', userData);
      // Return success and set requiresOtp: true for the frontend logic
      return { success: true, email: userData.email, message: data.message, requiresOtp: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const verifyOtp = async (email, otp, phone = null) => {
    try {
      const payload = email ? { email, otp } : { phone, otp };
      const { data } = await api.post('/auth/verify-otp', payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('cached_user', JSON.stringify(data.user));
      setToken(data.token);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const sendLoginOtp = async (phone) => {
    try {
      const { data } = await api.post('/auth/send-login-otp', { phone });
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const verifyLoginOtp = async (phone, otp) => {
    try {
      const { data } = await api.post('/auth/verify-login-otp', { phone, otp });
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('cached_user', JSON.stringify(data.user));
      setToken(data.token);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logout = async (silent = false) => {
    if (token) {
      try {
        await api.post('/auth/logout');
      } catch (err) {
        // Ignore logout error if token is already invalid
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('cached_user');
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    if (!silent) toast.info('Logged out successfully');
  };

  const updateProfile = async (profileData) => {
    try {
      const { data } = await api.put('/auth/me', profileData);
      setUser(data.user);
      localStorage.setItem('cached_user', JSON.stringify(data.user));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const finalizePasswordReset = async (email, otp, password) => {
    try {
      const { data } = await api.post('/auth/reset-password', { email, otp, password });
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const { data } = await api.put('/auth/change-password', { oldPassword, newPassword });
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  };

  const value = useMemo(() => ({
    user, token, refreshToken, loading,
    login, register, logout, updateProfile, resetPassword, finalizePasswordReset, refreshUser, verifyOtp, changePassword, sendLoginOtp, verifyLoginOtp,
    session: token ? { access_token: token, refresh_token: refreshToken } : null,
  }), [user, token, refreshToken, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

