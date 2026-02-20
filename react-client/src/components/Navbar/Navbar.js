import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useUserPreferences } from '../../context/UserPreferencesContext'; 
import Logo from '../Logo/Logo';
import SearchBar from '../SearchBar/SearchBar';
import ProfileDropdown from '../ProfileDropdown/ProfileDropdown';
import NewButton from '../Sidebar/NewButton/NewButton';
import './Navbar.css';

/**
 * Navbar Component
 * Displays different content based on authentication state:
 * - Guest: Logo + Login/Register button
 * - Authenticated: Logo + SearchBar + Theme toggle + Settings + User profile dropdown
 */
function Navbar() {
    const { isAuthenticated, user } = useAuth();
    const { isDarkMode, themeMode, setThemeMode } = useTheme(); 
    const { preferences, updatePreference } = useUserPreferences();
    const navigate = useNavigate();
    
    // Handle theme toggle with server sync
    const handleThemeToggle = () => {
        // Calculate new theme mode (toggle between light and dark)
        const newMode = themeMode === 'dark' ? 'light' : 'dark';
        
        // Update local theme immediately for instant UI response
        setThemeMode(newMode);
        
        // Sync with server (only if authenticated)
        if (isAuthenticated && user?.id) {
            updatePreference('theme', newMode);
        }
    };
    
    const getStartPageRoute = () => {
        if (!isAuthenticated) return '/';
        // Use landingPage from user preferences (from server)
        const landingPage = user?.preferences?.landingPage || 
                           user?.preferences?.startPage || 
                           preferences?.startPage || 
                           'home';
        return landingPage === 'mydrive' ? '/mydrive' : '/home';
    };
    return (
        <nav className="navbar">
            {/* Logo section - dynamic based on preferences */}
            <div className="navbar-left">
                <Logo
                    size="sm"
                    to={getStartPageRoute()}
                />
            </div>

            {/* Center section - search bar (only when authenticated) */}
            {isAuthenticated && (
                <div className="navbar-center">
                    <SearchBar />
                </div>
            )}

            {/* Right section - differs based on auth state */}
            <div className="navbar-right">
                {isAuthenticated ? (
                    <>
                        {/* Theme toggle button */}
                        <button
                            className="navbar-icon-btn"
                            onClick={handleThemeToggle}
                            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            <span className="material-symbols-outlined">
                                {isDarkMode ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>

                        {/* Settings button */}
                        <button
                            className="navbar-icon-btn navbar-settings-btn"
                            onClick={() => navigate('/settings/general')}
                            title="Settings"
                            aria-label="Settings"
                        >
                            <span className="material-symbols-outlined">settings</span>
                        </button>

                        {/* User profile dropdown */}
                        <ProfileDropdown />
                    </>
                ) : null}
            </div>
        </nav>
    );
}

export default Navbar;