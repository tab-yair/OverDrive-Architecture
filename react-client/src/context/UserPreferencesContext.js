import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { storageApi, userApi } from '../services/api';
import { useAppEvent } from '../hooks/useAppEvent';
import { AppEvents } from '../utils/eventManager';

// Create the user preferences context
const UserPreferencesContext = createContext(null);

/**
 * User Preferences Provider Component
 * Manages user preferences and storage info
 */
export function UserPreferencesProvider({ children }) {
    const { user, token, isAuthenticated, refreshUser, notifyUserUpdate } = useAuth();
    const [preferences, setPreferences] = useState({ theme: 'system', startPage: 'home' });

    // Storage info state
    const [storageInfo, setStorageInfo] = useState(null);
    const [storageLoading, setStorageLoading] = useState(false);
    const [storageError, setStorageError] = useState(null);

    // Load preferences when user logs in
    // Prioritize server preferences (landingPage from Preference table)
    useEffect(() => {
        if (isAuthenticated && user) {
            if (user.preferences) {
                const serverStartPage = user.preferences.landingPage || user.preferences.startPage || 'home';
                setPreferences({
                    theme: user.preferences.theme || 'system',
                    startPage: serverStartPage
                });
            } 
        } else if (!isAuthenticated) {
            setPreferences({ theme: 'system', startPage: 'home' });
        }
    }, [isAuthenticated, user]);

    // Fetch storage info when authenticated
    const refreshStorage = useCallback(async () => {
        if (!isAuthenticated || !token) {
            setStorageInfo(null);
            return;
        }

        setStorageLoading(true);
        setStorageError(null);

        try {
            const data = await storageApi.getStorageInfo(token);
            setStorageInfo(data);
        } catch (error) {
            console.error('Failed to fetch storage info:', error);
            setStorageError(error.message);
            // Set fallback values
            setStorageInfo({
                storageUsed: 0,
                storageLimit: 15 * 1024 * 1024 * 1024, // 15 GB
                storageAvailable: 15 * 1024 * 1024 * 1024,
                storageUsedMB: 0,
                storageLimitMB: 15360,
                storageAvailableMB: 15360,
                usagePercentage: 0
            });
        } finally {
            setStorageLoading(false);
        }
    }, [isAuthenticated, token]);

    // Fetch storage on auth change
    useEffect(() => {
        if (isAuthenticated && token) {
            refreshStorage();
        } else {
            setStorageInfo(null);
        }
    }, [isAuthenticated, token, refreshStorage]);

    // Listen for storage-updated events (triggered by file upload/delete)
    useAppEvent(AppEvents.STORAGE_UPDATED, () => {
        refreshStorage();
    }, [refreshStorage]);

    /**
     * Update a preference
     * Maps frontend startPage to backend landingPage
     * @param {string} key - Preference key (theme or startPage)
     * @param {any} value - Preference value
     */
    const updatePreference = useCallback(async (key, value) => {
        if (!isAuthenticated || !user?.id || !token) return;

        // Store previous preferences for rollback
        const previousPrefs = preferences;
        
        // Update local state IMMEDIATELY for optimistic UI - radio button reacts instantly
        const newPrefs = { ...preferences, [key]: value };
        setPreferences(newPrefs);

        try {
            // Send to API - will be mapped to landingPage on backend
            await userApi.updatePreferences(token, user.id, newPrefs);
            
            // Refresh user data to ensure state is in sync
            if (refreshUser) await refreshUser();
            if (notifyUserUpdate) notifyUserUpdate();
        } catch (err) {
            console.error("Failed to update preferences:", err);
            // Revert optimistic update on error
            setPreferences(previousPrefs);
        }
    }, [isAuthenticated, user?.id, token, preferences, refreshUser, notifyUserUpdate]);

    // Context value to provide to consumers
    const value = {
        preferences,
        storageInfo,
        storageLoading,
        storageError,
        updatePreference,
        refreshStorage
    };

    return (
        <UserPreferencesContext.Provider value={value}>
            {children}
        </UserPreferencesContext.Provider>
    );
}

/**
 * Custom hook to use user preferences context
 * @returns {Object} User preferences context value
 */
export function useUserPreferences() {
    const context = useContext(UserPreferencesContext);
    if (!context) {
        throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
    }
    return context;
}

export default UserPreferencesContext;
