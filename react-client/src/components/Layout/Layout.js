import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';
import MainContent from '../MainContent/MainContent';
import './Layout.css';

/**
 * Layout Component
 * Main application layout with navbar, sidebar (when authenticated), and main content area
 * Uses React Router's Outlet for nested route rendering
 */
function Layout() {
    const { isAuthenticated, loading } = useAuth();

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="layout-loading">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="layout">
            {/* Top navigation bar */}
            <Navbar />

            <div className="layout-body">
                {/* Sidebar - only shown when user is authenticated */}
                {isAuthenticated && <Sidebar />}

                {/* Main content area - renders matched child route */}
                <MainContent>
                    <Outlet />
                </MainContent>
            </div>
        </div>
    );
}

export default Layout;
