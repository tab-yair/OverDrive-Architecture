import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /*
   * an effect that runs once on mount to check LocalStorage for saved auth data
   */
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    
    setLoading(false);
  }, []);

  /*
   * login function: saves token and user data to state and LocalStorage
   */
  const login = (newToken, userData) => {
    // We create the displayName in the frontend context because the server doesn't store it
    if (userData && !userData.displayName) {
      userData.displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    }

    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  /*
   * logout function: clears state and LocalStorage
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // the context value that will be supplied to any descendants of this provider
  const value = {
    token,
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!token // converts the token to a boolean (true/false)
  };

  return (
    <AuthContext.Provider value={value}>
      {/* don't render children until we've checked LocalStorage */}
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