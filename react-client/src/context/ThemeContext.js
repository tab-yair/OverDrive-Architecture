import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { userApi } from '../services/api';

// Create the theme context
const ThemeContext = createContext(null);

/**
 * Theme Provider Component
 * Manages dark/light/system mode state with server-side persistence
 */
export function ThemeProvider({ children }) {
    const { user, token, isAuthenticated } = useAuth();

    // Theme mode: 'light' | 'dark' | 'system'
    const [themeMode, setThemeModeState] = useState('light');
    const [themeModeLoaded, setThemeModeLoaded] = useState(false);

    // Track system preference
    const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
        if (window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    // Fetch theme from server when user logs in
    useEffect(() => {
        const fetchTheme = async () => {
            if (isAuthenticated && user?.id && token) {
                try {
                    const prefs = await userApi.getPreferences(token, user.id);
                    setThemeModeState(prefs.theme || 'light');
                    setThemeModeLoaded(true);
                } catch (error) {
                    console.error('Failed to fetch theme:', error);
                    setThemeModeState('light');
                    setThemeModeLoaded(true);
                }
            } else if (!isAuthenticated) {
                // For logged out users, use localStorage
                const savedMode = localStorage.getItem('themeMode_general');
                setThemeModeState(savedMode || 'light');
                setThemeModeLoaded(true);
            }
        };

        fetchTheme();
    }, [isAuthenticated, user?.id, token]);

    // Computed: actual dark mode state based on themeMode
    const isDarkMode = themeMode === 'system' ? systemPrefersDark : themeMode === 'dark';

    // Apply theme attribute to document root
    useEffect(() => {
        const theme = isDarkMode ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
    }, [isDarkMode]);

    // Listen for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            setSystemPrefersDark(e.matches);
        };

        // Add listener for system theme changes
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
        } else {
            // Fallback for older browsers
            mediaQuery.addListener(handleChange);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleChange);
            } else {
                mediaQuery.removeListener(handleChange);
            }
        };
    }, []);

    // Persist theme mode preference when it changes (only for logged out users)
    useEffect(() => {
        if (!isAuthenticated) {
            localStorage.setItem('themeMode_general', themeMode);
        }
    }, [themeMode, isAuthenticated]);

    /**
     * Set theme mode
     * @param {'light' | 'dark' | 'system'} mode - Theme mode to set
     */
    const setThemeMode = useCallback((mode) => {
        if (['light', 'dark', 'system'].includes(mode)) {
            setThemeModeState(mode);
        }
    }, []);

    /**
     * Toggle between light and dark mode (for navbar icon)
     * Cycles: current -> opposite (ignores system mode for quick toggle)
     */
    const toggleTheme = useCallback(() => {
        setThemeModeState(prev => {
            // If currently in system mode, toggle to opposite of current appearance
            if (prev === 'system') {
                return systemPrefersDark ? 'light' : 'dark';
            }
            // Otherwise toggle between light and dark
            return prev === 'dark' ? 'light' : 'dark';
        });
    }, [systemPrefersDark]);

    /**
     * Set specific theme (legacy support)
     * @param {boolean} dark - True for dark mode, false for light mode
     */
    const setTheme = useCallback((dark) => {
        setThemeModeState(dark ? 'dark' : 'light');
    }, []);

    // Context value to provide to consumers
    const value = {
        isDarkMode,
        themeMode,
        themeModeLoaded,
        setThemeMode,
        toggleTheme,
        setTheme
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * Custom hook to use theme context
 * @returns {Object} Theme context value
 */
export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export default ThemeContext;
