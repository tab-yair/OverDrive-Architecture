import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { UserPreferencesProvider, useUserPreferences } from '../context/UserPreferencesContext';
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
import NotFoundPage from '../pages/NotFoundPage';
import FileManagementExample from '../components/FileManagement/FileManagementExample';

import './App.css';

function AppRoutes() {
    const { isAuthenticated, loading, user } = useAuth();
    const { preferences } = useUserPreferences();
    const navigate = useNavigate();
    const location = useLocation();

    // Logic for preferred landing page
    const landingPage = user?.preferences?.landingPage || 
                        user?.preferences?.startPage || 
                        preferences?.startPage || 
                        'home';
    const userHomePath = landingPage === 'mydrive' ? '/mydrive' : '/home';

    // Smart Redirect Effect: Handles initial landing on auth pages
    useEffect(() => {
        if (!loading && isAuthenticated) {
            const authPaths = ['/', '/login', '/signup'];
            if (authPaths.includes(location.pathname)) {
                navigate(userHomePath, { replace: true });
            }
        }
    }, [isAuthenticated, loading, userHomePath, location.pathname, navigate]);

    if (loading) return null;

    return (
        <Routes>
            {/* Auth Pages */}
            <Route 
                path="/" 
                element={isAuthenticated ? <Navigate to={userHomePath} replace /> : <GuestLandingPage />} 
            />
            <Route 
                path="/login" 
                element={isAuthenticated ? <Navigate to={userHomePath} replace /> : <LoginPage />} 
            />
            <Route 
                path="/signup" 
                element={isAuthenticated ? <Navigate to={userHomePath} replace /> : <SignupPage />} 
            />

            {/* MAIN APP ROUTES */}
            <Route element={<Layout />}>
                <Route path="/test" element={<FileManagementExample />} />

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

                    <Route path="/settings" element={<SettingsPage />}>
                        <Route path="general" element={<GeneralSettingsPage />} />
                        <Route path="account" element={<AccountSettingsPage />} />
                        <Route path="storage" element={<GetMoreStoragePage />} />
                    </Route>
                </Route>

                {/* Catch-all route for 404 */}
                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
}

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