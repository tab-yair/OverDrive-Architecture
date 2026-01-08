import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { storageApi, userApi } from '../services/api';

// Create the user preferences context
const UserPreferencesContext = createContext(null);

/**
 * User Preferences Provider Component
 * Manages user preferences and storage info
 */
export function UserPreferencesProvider({ children }) {
    const { user, token, isAuthenticated } = useAuth();

    // User preferences state
    const [preferences, setPreferences] = useState({
        theme: 'system',
        startPage: 'home'
    });

    // Storage info state
    const [storageInfo, setStorageInfo] = useState(null);
    const [storageLoading, setStorageLoading] = useState(false);
    const [storageError, setStorageError] = useState(null);

    // Load preferences when user logs in
    useEffect(() => {
        if (isAuthenticated && user?.id) {
            const savedPrefs = userApi.getPreferences(user.id);
            setPreferences(savedPrefs);
        } else {
            // Reset to defaults when logged out
            setPreferences({
                theme: 'system',
                startPage: 'home'
            });
        }
    }, [isAuthenticated, user?.id]);

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
    useEffect(() => {
        const handleStorageUpdate = () => {
            console.log('[UserPreferences] Storage update event received - refreshing');
            refreshStorage();
        };

        window.addEventListener('storage-updated', handleStorageUpdate);
        return () => window.removeEventListener('storage-updated', handleStorageUpdate);
    }, [refreshStorage]);

    /**
     * Update a preference
     * @param {string} key - Preference key
     * @param {any} value - Preference value
     */
    const updatePreference = useCallback((key, value) => {
        if (!isAuthenticated || !user?.id) return;

        setPreferences(prev => {
            const updated = { ...prev, [key]: value };
            // TODO: Replace localStorage with API call when server implements
            // PATCH /api/users/:id/preferences
            userApi.updatePreferences(user.id, { [key]: value });
            return updated;
        });
    }, [isAuthenticated, user?.id]);

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
