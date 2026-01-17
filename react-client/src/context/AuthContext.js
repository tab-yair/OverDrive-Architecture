import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { userApi } from '../services/api';

const AuthContext = createContext();

// Key for localStorage events to sync user updates across tabs
const USER_UPDATE_EVENT_KEY = 'user_data_updated';

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /*
   * Effect that runs once on mount to restore session from localStorage
   * Fetches fresh user data from server instead of using cached data
   */
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('token');

      if (savedToken) {
        try {
          // Decode JWT to get userId
          const decoded = jwtDecode(savedToken);
          
          // Fetch fresh user data from server
          const freshUserData = await userApi.getUser(savedToken, decoded.userId);
          
          // Normalize user data
          const normalizedUser = normalizeUserData(freshUserData);
          
          setToken(savedToken);
          setUser(normalizedUser);
        } catch (error) {
          // If token is invalid or expired, clear it
          console.error('Failed to restore session:', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  /*
   * Normalize user data to ensure consistent field names
   */
  const normalizeUserData = (userData) => {
    if (!userData || typeof userData !== 'object') return null;

    const normalized = { ...userData };
    normalized.id = normalized.id || normalized.userId || normalized._id;
    
    if (!normalized.displayName) {
      normalized.displayName = `${normalized.firstName || ''} ${normalized.lastName || ''}`.trim();
    }

    return normalized;
  };

  /*
   * refreshUser function: fetch fresh user data from server
   * Useful after profile updates
   */
  const refreshUser = useCallback(async () => {
    if (!token || !user?.id) return;

    try {
      const freshUserData = await userApi.getUser(token, user.id);
      const normalizedUser = normalizeUserData(freshUserData);
      setUser(normalizedUser);
      return normalizedUser;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      throw error;
    }
  }, [token, user?.id]);

  /*
   * Listener: Cross-tab synchronization
   * Listens for user update events from other tabs
   */
  useEffect(() => {
    if (!token || !user?.id) return;

    const handleStorageChange = async (e) => {
      if (e.key === USER_UPDATE_EVENT_KEY && e.newValue) {
        try {
          await refreshUser();
        } catch (error) {
          console.error('Failed to sync user data from other tab:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [token, user?.id, refreshUser]);

  /*
   * login function: saves token to localStorage and user data to state
   * Does NOT save user data to localStorage - only in memory
   */
  const login = (newToken, userData) => {
    const normalizedUser = normalizeUserData(userData);

    Object.keys(localStorage).forEach(key => {
        if (key.includes('preferences')) localStorage.removeItem(key);
    });

    setToken(newToken);
    setUser(normalizedUser);
    localStorage.setItem('token', newToken);
  };

  /*
   * logout function: clears state and localStorage
   * Uses setTimeout to ensure state clears before navigation
   */
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    
    setTimeout(() => {
      navigate('/');
    }, 0);
  }, [navigate]);

  /*
   * Notifier: Notify other tabs that user data has been updated
   * Call this after any PATCH/PUT to user data
   */
  const notifyUserUpdate = () => {
    localStorage.setItem(USER_UPDATE_EVENT_KEY, Date.now().toString());
    setTimeout(() => {
      localStorage.removeItem(USER_UPDATE_EVENT_KEY);
    }, 100);
  };

  const value = {
    token,
    user,
    login,
    logout,
    refreshUser,
    notifyUserUpdate,
    loading,
    isAuthenticated: !!token
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
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