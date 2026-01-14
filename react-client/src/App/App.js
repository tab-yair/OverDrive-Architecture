import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { UserPreferencesProvider } from '../context/UserPreferencesContext';
import { FilesProvider } from '../context/FilesContext';
import { NavigationProvider } from '../context/NavigationContext';
import Layout from '../components/Layout/Layout';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';

// Page imports - Keep the Page wrappers to maintain our Portal logic
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
import LoginPage from '../pages/LoginPage'; // Fixed: Use the Page wrapper
import SignupPage from '../pages/SignupPage'; // Fixed: Use the Page wrapper

// Keep the test component from your HEAD
import FileManagementExample from '../components/FileManagement/FileManagementExample';

import './App.css';

function AppRoutes() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return null;
    }

    return (
        <Routes>
            {/* AUTH ROUTES */}
            <Route 
                path="/login" 
                element={isAuthenticated ? <Navigate to="/home" replace /> : <LoginPage />} 
            />
            <Route 
                path="/signup" 
                element={isAuthenticated ? <Navigate to="/home" replace /> : <SignupPage />} 
            />

            {/* MAIN APP ROUTES - Nested inside Layout */}
            <Route element={<Layout />}>
                <Route path="/test" element={<FileManagementExample />} />

                <Route
                    path="/"
                    element={isAuthenticated ? <Navigate to="/home" replace /> : <GuestLandingPage />}
                />

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

                <Route
                    path="*"
                    element={isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/" replace />}
                />
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