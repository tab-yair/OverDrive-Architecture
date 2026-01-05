import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

// Create the theme context
const ThemeContext = createContext(null);

/**
 * Theme Provider Component
 * Manages dark/light/system mode state with per-user persistence
 */
export function ThemeProvider({ children }) {
    const { user, isAuthenticated } = useAuth();

    // Theme mode: 'light' | 'dark' | 'system'
    const [themeMode, setThemeModeState] = useState(() => {
        // Try to get user-specific preference if logged in
        if (isAuthenticated && user?.id) {
            const savedMode = localStorage.getItem(`themeMode_${user.id}`);
            if (savedMode) {
                return savedMode;
            }
        }

        // Fall back to general preference
        const generalMode = localStorage.getItem('themeMode_general');
        if (generalMode) {
            return generalMode;
        }

        // Default to system
        return 'system';
    });

    // Track system preference
    const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
        if (window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

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

    // Persist theme mode preference when it changes
    useEffect(() => {
        // Save to user-specific key if logged in
        if (isAuthenticated && user?.id) {
            localStorage.setItem(`themeMode_${user.id}`, themeMode);
        }

        // Always save to general key as fallback
        localStorage.setItem('themeMode_general', themeMode);
    }, [themeMode, isAuthenticated, user?.id]);

    // Load user-specific theme when user logs in
    useEffect(() => {
        if (isAuthenticated && user?.id) {
            const savedMode = localStorage.getItem(`themeMode_${user.id}`);
            if (savedMode) {
                setThemeModeState(savedMode);
            }
        }
    }, [isAuthenticated, user?.id]);

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
