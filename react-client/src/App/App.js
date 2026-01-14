import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { UserPreferencesProvider } from '../context/UserPreferencesContext';
import { FilesProvider } from '../context/FilesContext';
import { NavigationProvider } from '../context/NavigationContext';
import Layout from '../components/Layout/Layout';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';

// Page imports
import GuestLandingPage from '../pages/GuestLandingPage';
import HomePage from '../pages/HomePage';
import MyDrivePage from '../pages/MyDrivePage';
import FolderPage from '../pages/FolderPage';
import SharedPage from '../pages/SharedPage';
import RecentPage from '../pages/RecentPage';
import StarredPage from '../pages/StarredPage';
import TrashPage from '../pages/TrashPage';
import StoragePage from '../pages/StoragePage';
import SearchPage from '../pages/SearchPage';
import SettingsPage from '../pages/SettingsPage';
import GeneralSettingsPage from '../pages/GeneralSettingsPage';
import AccountSettingsPage from '../pages/AccountSettingsPage';
import GetMoreStoragePage from '../pages/GetMoreStoragePage';
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
            {/* Public auth routes - OUTSIDE of Layout */}
            <Route 
                path="/login" 
                element={
                    isAuthenticated ? <Navigate to="/home" replace /> : <LoginPage />
                } 
            />
            <Route 
                path="/signup" 
                element={
                    isAuthenticated ? <Navigate to="/home" replace /> : <SignupPage />
                } 
            />

            {/* Layout wrapper - all routes render inside Layout */}
            <Route element={<Layout />}>

                {/* Root route - redirect based on auth status */}
                <Route
                    path="/"
                    element={
                        isAuthenticated ? <Navigate to="/home" replace /> : <GuestLandingPage />
                    }
                />

                {/* Protected routes - wrapped in single ProtectedRoute */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/mydrive" element={<MyDrivePage />} />
                    <Route path="/folders/:folderId" element={<FolderPage />} />
                    <Route path="/shared" element={<SharedPage />} />
                    <Route path="/recent" element={<RecentPage />} />
                    <Route path="/starred" element={<StarredPage />} />
                    <Route path="/trash" element={<TrashPage />} />
                    <Route path="/storage" element={<StoragePage />} />
                    <Route path="/search" element={<SearchPage />} />

                    {/* Settings with nested routes */}
                    <Route path="/settings" element={<SettingsPage />}>
                        <Route path="general" element={<GeneralSettingsPage />} />
                        <Route path="account" element={<AccountSettingsPage />} />
                        <Route path="storage" element={<GetMoreStoragePage />} />
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
 * 
 * Provider hierarchy:
 * - AuthProvider: Authentication state
 * - ThemeProvider: UI theme (light/dark)
 * - UserPreferencesProvider: User preferences
 * - NavigationProvider: File/folder navigation and open actions
 */
function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <UserPreferencesProvider>
                    <FilesProvider>
                        <NavigationProvider>
                            <div className="app">
                                <AppRoutes />
                            </div>
                        </NavigationProvider>
                    </FilesProvider>
                </UserPreferencesProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
