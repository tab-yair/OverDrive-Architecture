import { useAuth } from '../../context/AuthContext';
import './MainContent.css';

/**
 * MainContent Component
 * Wrapper for the main content area
 * Provides consistent padding and styling for page content
 * Adds margin-left when sidebar is present (user authenticated)
 */
function MainContent({ children }) {
    const { isAuthenticated } = useAuth();

    return (
        <main className={`main-content ${isAuthenticated ? 'with-sidebar' : ''}`}>
            <div className="main-content-inner">
                {children}
            </div>
        </main>
    );
}

export default MainContent;
