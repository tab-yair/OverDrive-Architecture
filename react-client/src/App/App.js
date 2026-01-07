import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { UserPreferencesProvider } from '../context/UserPreferencesContext';
import Layout from '../components/Layout/Layout';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import { useTruncationHandler } from '../hooks/useTruncationHandler';
import '../hooks/useTruncationHandler.css';

// Page imports
import GuestLandingPage from '../pages/GuestLandingPage';
import HomePage from '../pages/HomePage';
import MyDrivePage from '../pages/MyDrivePage';
import SharedPage from '../pages/SharedPage';
import RecentPage from '../pages/RecentPage';
import StarredPage from '../pages/StarredPage';
import TrashPage from '../pages/TrashPage';
import StoragePage from '../pages/StoragePage';
import SettingsPage from '../pages/SettingsPage';
import GeneralSettingsPage from '../pages/GeneralSettingsPage';
import AccountSettingsPage from '../pages/AccountSettingsPage';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';

// --- הייבוא החדש עבור הדמו ---
import FileManagementExample from '../components/FileManagement/FileManagementExample';
import PermissionsDemo from '../components/PermissionsManager/PermissionsDemo';

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

            {/* נתיב זמני לבדיקת הרכיבים החדשים */}
            {/* גש בדפדפן לכתובת: http://localhost:3000/test */}
            <Route path="/test" element={<FileManagementExample />} />
            {/* דמו לניהול הרשאות: http://localhost:3000/permissions-demo */}
            <Route path="/permissions-demo" element={<PermissionsDemo />} />

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
                    <Route path="/storage" element={<StoragePage />} />

                    {/* Settings with nested routes */}
                    <Route path="/settings" element={<SettingsPage />}>
                        <Route path="general" element={<GeneralSettingsPage />} />
                        <Route path="account" element={<AccountSettingsPage />} />
                    </Route>
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
    const TruncationModal = useTruncationHandler();

    return (
        <AuthProvider>
            <ThemeProvider>
                <UserPreferencesProvider>
                    <div className="app">
                        <AppRoutes />
                        {TruncationModal}
                    </div>
                </UserPreferencesProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
