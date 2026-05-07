import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    // Skip auth check on public pages
    const publicPages = ['/demo', '/mobile-monitor', '/led-monitor'];
    if (publicPages.includes(window.location.pathname)) {
      setIsLoadingAuth(false);
      setIsLoadingPublicSettings(false);
      return;
    }
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // Check if user has stored token
      const storedToken = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
      const token = storedToken || appParams.token;
      
      // If no token, redirect to login
      if (!token) {
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        window.location.href = '/demo';
        return;
      }
      
      // Check user auth with token
      await checkUserAuth();
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      window.location.href = '/demo';
    }
  };

  const autoLoginDemo = async () => {
    try {
      setIsLoadingAuth(true);
      // Redirect to demo launcher for login
      window.location.href = '/demo';
    } catch (err) {
      console.error("Login redirect failed:", err);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      setAuthError({
        type: 'auth_required',
        message: 'Please login'
      });
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // Token is invalid/expired, redirect to login
      window.localStorage.removeItem('token');
      window.location.href = '/demo';
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(false);
    
    if (shouldRedirect) {
      // Mock logout - just reload the page to trigger re-login
      window.location.reload();
    }
  };

  const navigateToLogin = () => {
    // Redirect to demo launcher instead of platform login
    if (typeof window !== 'undefined') {
      window.location.href = '/demo';
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};