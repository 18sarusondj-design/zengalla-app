import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { toast } from 'sonner';
import api from '../../../config/api.js';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUser = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (err) {
      // Token expired or invalid — clear it
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      setToken(data.token);
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

  const verifyOtp = async (email, otp) => {
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp });
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logout = (silent = false) => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    if (!silent) toast.info('Logged out successfully');
  };

  const updateProfile = async (profileData) => {
    try {
      const { data } = await api.put('/auth/me', profileData);
      setUser(data.user);
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
    user, token, loading,
    login, register, logout, updateProfile, resetPassword, finalizePasswordReset, refreshUser, verifyOtp, changePassword,
    session: token ? { access_token: token } : null,
  }), [user, token, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

