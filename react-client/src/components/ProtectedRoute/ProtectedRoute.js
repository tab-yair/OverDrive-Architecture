import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Redirects to /login if user is not authenticated
 * Preserves attempted URL for redirect after login
 */
const ProtectedRoute = () => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) return null; // wait until the token check is complete

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;