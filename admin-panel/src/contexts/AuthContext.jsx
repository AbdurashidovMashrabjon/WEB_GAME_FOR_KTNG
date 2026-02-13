// src/contexts/AuthContext.jsx - Authentication Context
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/api';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await auth.getProfile();
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(phone_number, password) {
    const response = await auth.login(phone_number, password);
    setUser(response.data.user);
    return response.data;
  }

  async function logout() {
    await auth.logout();
    setUser(null);
  }

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
