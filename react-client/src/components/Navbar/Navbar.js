import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import SearchBar from '../SearchBar/SearchBar';
import './Navbar.css';

/**
 * Navbar Component
 * Displays different content based on authentication state:
 * - Guest: Logo + Login/Register button
 * - Authenticated: Logo + SearchBar + Theme toggle + User profile dropdown
 */
function Navbar() {
    const { isAuthenticated, user, logout, mockLogin } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();

    // State for user dropdown menu
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle logout
    const handleLogout = () => {
        setShowDropdown(false);
        logout();
        navigate('/');
    };

    // Get user initials for avatar
    const getUserInitials = () => {
        if (!user?.displayName) return 'U';
        const names = user.displayName.split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase();
        }
        return names[0][0].toUpperCase();
    };

    return (
        <nav className="navbar">
            {/* Logo section - always visible */}
            <div className="navbar-left">
                <Link to={isAuthenticated ? '/home' : '/'} className="navbar-logo">
                    <span className="material-symbols-outlined logo-icon">
                        cloud
                    </span>
                    <span className="logo-text">OverDrive</span>
                </Link>
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
                            onClick={toggleTheme}
                            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            <span className="material-symbols-outlined">
                                {isDarkMode ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>

                        {/* User profile dropdown */}
                        <div className="user-menu" ref={dropdownRef}>
                            <button
                                className="user-menu-trigger"
                                onClick={() => setShowDropdown(!showDropdown)}
                                aria-expanded={showDropdown}
                                aria-haspopup="true"
                            >
                                {user?.profileImage ? (
                                    <img
                                        src={user.profileImage}
                                        alt={user.displayName}
                                        className="user-avatar"
                                    />
                                ) : (
                                    <div className="user-avatar user-avatar-initials">
                                        {getUserInitials()}
                                    </div>
                                )}
                            </button>

                            {/* Dropdown menu */}
                            {showDropdown && (
                                <div className="user-dropdown slide-in">
                                    <div className="user-dropdown-header">
                                        <div className="user-dropdown-avatar">
                                            {user?.profileImage ? (
                                                <img src={user.profileImage} alt="" />
                                            ) : (
                                                <div className="user-avatar-initials large">
                                                    {getUserInitials()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="user-dropdown-info">
                                            <span className="user-dropdown-name">
                                                {user?.displayName || 'User'}
                                            </span>
                                            <span className="user-dropdown-email">
                                                {user?.username}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="user-dropdown-divider" />

                                    <button
                                        className="user-dropdown-item"
                                        onClick={handleLogout}
                                    >
                                        <span className="material-symbols-outlined">
                                            logout
                                        </span>
                                        <span>Sign out</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* Guest mode: Login/Register and Mock Login buttons */
                    <div className="navbar-guest-actions">
                        {/* Mock login for testing */}
                        <button
                            className="btn btn-secondary"
                            onClick={mockLogin}
                            title="Development: Login with mock user"
                        >
                            Mock Login
                        </button>

                        <Link to="/login" className="btn btn-primary">
                            Login / Register
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Navbar;
