import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Create the theme context
const ThemeContext = createContext(null);

/**
 * Theme Provider Component
 * Manages dark/light mode state with per-user persistence
 */
export function ThemeProvider({ children }) {
    const { user, isAuthenticated } = useAuth();

    // Initialize theme from localStorage or system preference
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Try to get user-specific preference if logged in
        if (isAuthenticated && user?.id) {
            const savedTheme = localStorage.getItem(`theme_${user.id}`);
            if (savedTheme !== null) {
                return savedTheme === 'dark';
            }
        }

        // Fall back to general preference
        const generalTheme = localStorage.getItem('theme_general');
        if (generalTheme !== null) {
            return generalTheme === 'dark';
        }

        // Fall back to system preference
        if (window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        return false;
    });

    // Apply theme attribute to document root
    useEffect(() => {
        const theme = isDarkMode ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
    }, [isDarkMode]);

    // Listen for system theme changes (only if no saved preference)
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            // Only auto-switch if user hasn't set a preference
            const userKey = isAuthenticated && user?.id ? `theme_${user.id}` : 'theme_general';
            const savedTheme = localStorage.getItem(userKey);
            if (savedTheme === null) {
                setIsDarkMode(e.matches);
            }
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
    }, [isAuthenticated, user?.id]);

    // Persist theme preference when it changes
    useEffect(() => {
        const theme = isDarkMode ? 'dark' : 'light';

        // Save to user-specific key if logged in
        if (isAuthenticated && user?.id) {
            localStorage.setItem(`theme_${user.id}`, theme);
        }

        // Always save to general key as fallback
        localStorage.setItem('theme_general', theme);
    }, [isDarkMode, isAuthenticated, user?.id]);

    // Load user-specific theme when user logs in
    useEffect(() => {
        if (isAuthenticated && user?.id) {
            const savedTheme = localStorage.getItem(`theme_${user.id}`);
            if (savedTheme !== null) {
                setIsDarkMode(savedTheme === 'dark');
            }
        }
    }, [isAuthenticated, user?.id]);

    /**
     * Toggle between light and dark mode
     */
    const toggleTheme = () => {
        setIsDarkMode(prev => !prev);
    };

    /**
     * Set specific theme
     * @param {boolean} dark - True for dark mode, false for light mode
     */
    const setTheme = (dark) => {
        setIsDarkMode(dark);
    };

    // Context value to provide to consumers
    const value = {
        isDarkMode,
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
