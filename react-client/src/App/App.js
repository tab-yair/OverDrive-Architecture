import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import Layout from '../components/Layout/Layout';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';

// Page imports
import GuestLandingPage from '../pages/GuestLandingPage';
import HomePage from '../pages/HomePage';
import MyDrivePage from '../pages/MyDrivePage';
import SharedPage from '../pages/SharedPage';
import RecentPage from '../pages/RecentPage';
import StarredPage from '../pages/StarredPage';
import TrashPage from '../pages/TrashPage';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';

import './App.css';

/**
 * AppRoutes Component
 * Defines all application routes using nested routing pattern
 * Must be inside AuthProvider to access auth state
 */
function AppRoutes() {
    const { isAuthenticated, loading } = useAuth();

    // Don't render routes until auth state is determined
    if (loading) {
        return null; // Layout will show loading state
    }

    return (
        <Routes>
            {/* Layout wrapper - all routes render inside Layout */}
            <Route element={<Layout />}>

                {/* Root route - redirect based on auth status */}
                <Route
                    path="/"
                    element={
                        isAuthenticated
                            ? <Navigate to="/home" replace />
                            : <GuestLandingPage />
                    }
                />

                {/* Public auth routes - redirect to home if already authenticated */}
                <Route
                    path="/login"
                    element={
                        isAuthenticated
                            ? <Navigate to="/home" replace />
                            : <LoginPage />
                    }
                />
                <Route
                    path="/signup"
                    element={
                        isAuthenticated
                            ? <Navigate to="/home" replace />
                            : <SignupPage />
                    }
                />

                {/* Protected routes - wrapped in single ProtectedRoute */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/mydrive" element={<MyDrivePage />} />
                    <Route path="/shared" element={<SharedPage />} />
                    <Route path="/recent" element={<RecentPage />} />
                    <Route path="/starred" element={<StarredPage />} />
                    <Route path="/trash" element={<TrashPage />} />
                </Route>

                {/* Catch-all route */}
                <Route
                    path="*"
                    element={
                        isAuthenticated
                            ? <Navigate to="/home" replace />
                            : <Navigate to="/" replace />
                    }
                />
            </Route>
        </Routes>
    );
}

/**
 * App Component
 * Root component - sets up providers
 * Note: BrowserRouter is in index.js
 */
function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <div className="app">
                    <AppRoutes />
                </div>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
