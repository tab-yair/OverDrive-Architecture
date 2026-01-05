import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the authentication context
const AuthContext = createContext(null);

/**
 * Authentication Provider Component
 * Manages user authentication state and provides auth methods to children
 */
export function AuthProvider({ children }) {
    // User data state: { id, username, displayName, profileImage }
    const [user, setUser] = useState(null);
    // JWT token state
    const [token, setToken] = useState(null);
    // Loading state for initial auth check
    const [loading, setLoading] = useState(true);

    // Check for existing token on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('overdrive_token');
        const storedUser = localStorage.getItem('overdrive_user');

        if (storedToken && storedUser) {
            try {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));

                // TODO: Verify token is still valid with server
                // fetch('/api/users/me', {
                //     headers: { 'Authorization': `Bearer ${storedToken}` }
                // }).then(res => {
                //     if (!res.ok) {
                //         // Token invalid, clear auth state
                //         logout();
                //     }
                // });
            } catch (error) {
                console.error('Error parsing stored user data:', error);
                localStorage.removeItem('overdrive_token');
                localStorage.removeItem('overdrive_user');
            }
        }
        setLoading(false);
    }, []);

    /**
     * Login function - stores user data and token
     * @param {Object} userData - User data object { id, username, displayName, profileImage }
     * @param {string} authToken - JWT token from server
     */
    const login = (userData, authToken) => {
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('overdrive_token', authToken);
        localStorage.setItem('overdrive_user', JSON.stringify(userData));
    };

    /**
     * Logout function - clears all auth state
     */
    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('overdrive_token');
        localStorage.removeItem('overdrive_user');

        // TODO: Call server to invalidate token (optional)
        // fetch('/api/tokens/revoke', {
        //     method: 'POST',
        //     headers: { 'Authorization': `Bearer ${token}` }
        // });
    };

    /**
     * Mock login for development/testing
     * Creates a fake user session without server interaction
     */
    const mockLogin = () => {
        const mockUser = {
            id: 'mock-user-123',
            username: 'testuser@example.com',
            displayName: 'Test User',
            profileImage: null // Will show default avatar
        };
        const mockToken = 'mock-jwt-token-for-development';
        login(mockUser, mockToken);
    };

    // Derived state: is user authenticated?
    const isAuthenticated = !!token && !!user;

    // Context value to provide to consumers
    const value = {
        user,
        token,
        loading,
        isAuthenticated,
        login,
        logout,
        mockLogin
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Custom hook to use auth context
 * @returns {Object} Auth context value
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
