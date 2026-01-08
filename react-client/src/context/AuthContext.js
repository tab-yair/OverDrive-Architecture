import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { userApi } from '../services/api';

const AuthContext = createContext();

// Key for localStorage events to sync user updates across tabs
const USER_UPDATE_EVENT_KEY = 'user_data_updated';

export const AuthProvider = ({ children }) => {
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
          // Token is invalid or expired, clear it
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
    
    // Ensure id field exists
    normalized.id = normalized.id || normalized.userId || normalized._id;
    
    // Ensure displayName exists
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
      // Only respond to our specific event key
      if (e.key === USER_UPDATE_EVENT_KEY && e.newValue) {
        console.log('🔄 User data updated in another tab, refreshing...');
        
        try {
          await refreshUser();
        } catch (error) {
          console.error('Failed to sync user data from other tab:', error);
        }
      }
    };

    // Listen to storage events (fired when localStorage changes in OTHER tabs)
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

    setToken(newToken);
    setUser(normalizedUser);
    
    // Only save token to localStorage
    localStorage.setItem('token', newToken);
  };

  /*
   * logout function: clears state and localStorage
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  /*
   * Notifier: Notify other tabs that user data has been updated
   * Call this after any PATCH/PUT to user data
   */
  const notifyUserUpdate = () => {
    // Set a timestamp in localStorage to trigger storage event in other tabs
    localStorage.setItem(USER_UPDATE_EVENT_KEY, Date.now().toString());
    
    // Clean up after a short delay to avoid cluttering localStorage
    setTimeout(() => {
      localStorage.removeItem(USER_UPDATE_EVENT_KEY);
    }, 100);
    
    console.log('📢 Notified other tabs about user update');
  };

  // the context value that will be supplied to any descendants of this provider
  const value = {
    token,
    user,
    login,
    logout,
    refreshUser,
    notifyUserUpdate,
    loading,
    isAuthenticated: !!token // converts the token to a boolean (true/false)
  };

  return (
    <AuthContext.Provider value={value}>
      {/* don't render children until we've checked localStorage */}
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