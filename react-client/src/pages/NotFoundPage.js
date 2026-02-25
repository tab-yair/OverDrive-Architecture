import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo/Logo';
import './Pages.css';

/**
 * NotFoundPage Component
 * 404 page shown when a route doesn't exist
 */
function NotFoundPage() {
    const { isAuthenticated } = useAuth();
    
    const homePath = isAuthenticated ? '/home' : '/';
    const homeLabel = isAuthenticated ? 'Go to Home' : 'Go to Landing Page';

    return (
        <div className="page not-found-page">
            <div className="not-found-content">
                <div className="not-found-icon">
                    <span className="material-symbols-outlined">explore_off</span>
                </div>
                
                <h1 className="not-found-title">404</h1>
                <h2 className="not-found-subtitle">Page Not Found</h2>
                
                <p className="not-found-description">
                    Oops! The page you're looking for doesn't exist or has been moved.
                </p>

                <div className="not-found-actions">
                    <Link to={homePath} className="btn btn-primary btn-large">
                        <span className="material-symbols-outlined">home</span>
                        {homeLabel}
                    </Link>
                </div>

                <div className="not-found-suggestions">
                    <p>Here are some helpful links:</p>
                    <div className="not-found-links">
                        {isAuthenticated ? (
                            <>
                                <Link to="/mydrive" className="not-found-link">
                                    <span className="material-symbols-outlined">folder</span>
                                    My Drive
                                </Link>
                                <Link to="/recent" className="not-found-link">
                                    <span className="material-symbols-outlined">schedule</span>
                                    Recent
                                </Link>
                                <Link to="/shared" className="not-found-link">
                                    <span className="material-symbols-outlined">group</span>
                                    Shared
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="not-found-link">
                                    <span className="material-symbols-outlined">login</span>
                                    Sign In
                                </Link>
                                <Link to="/signup" className="not-found-link">
                                    <span className="material-symbols-outlined">person_add</span>
                                    Create Account
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default NotFoundPage;
