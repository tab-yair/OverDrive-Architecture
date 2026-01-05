import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Redirects to /login if user is not authenticated
 * Preserves attempted URL for redirect after login
 */
function ProtectedRoute() {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    // Don't redirect while still checking auth state
    if (loading) {
        return null; // Layout handles loading state
    }

    if (!isAuthenticated) {
        // Redirect to login, save the attempted URL for later redirect
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // User is authenticated, render child routes via Outlet
    return <Outlet />;
}

export default ProtectedRoute;
