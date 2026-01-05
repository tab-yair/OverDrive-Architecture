import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { formatBytes } from '../../services/api';
import './ProfileDropdown.css';

/**
 * ProfileDropdown Component
 * User profile dropdown with avatar, account info, and actions
 */
function ProfileDropdown() {
    const { user, logout } = useAuth();
    const { storageInfo } = useUserPreferences();
    const navigate = useNavigate();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get user initials
    const getUserInitials = () => {
        if (!user?.displayName) return 'U';
        const names = user.displayName.split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase();
        }
        return names[0][0].toUpperCase();
    };

    // Handle logout
    const handleLogout = () => {
        setIsOpen(false);
        logout();
        navigate('/');
    };

    // Handle navigation
    const handleNavigate = (path) => {
        setIsOpen(false);
        navigate(path);
    };

    // Calculate storage values
    const storageUsed = storageInfo?.storageUsed || 0;
    const storageLimit = storageInfo?.storageLimit || (15 * 1024 * 1024 * 1024);
    const usagePercent = storageInfo?.usagePercentage || 0;

    return (
        <div className="profile-dropdown-container" ref={dropdownRef}>
            {/* Avatar trigger */}
            <button
                className="profile-dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                {user?.profileImage ? (
                    <img
                        src={user.profileImage}
                        alt={user.displayName}
                        className="profile-trigger-avatar"
                    />
                ) : (
                    <div className="profile-trigger-avatar profile-trigger-initials">
                        {getUserInitials()}
                    </div>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="profile-dropdown slide-in">
                    {/* Header with avatar and info */}
                    <div
                        className="profile-dropdown-header"
                        onClick={() => handleNavigate('/settings/account')}
                    >
                        <div className="profile-dropdown-avatar-container">
                            {user?.profileImage ? (
                                <img
                                    src={user.profileImage}
                                    alt=""
                                    className="profile-dropdown-avatar"
                                />
                            ) : (
                                <div className="profile-dropdown-avatar profile-dropdown-initials">
                                    {getUserInitials()}
                                </div>
                            )}
                            <div className="profile-dropdown-avatar-badge">
                                <span className="material-symbols-outlined">photo_camera</span>
                            </div>
                        </div>
                        <div className="profile-dropdown-info">
                            <span className="profile-dropdown-name">
                                {user?.displayName || 'User'}
                            </span>
                            <span className="profile-dropdown-email">
                                {user?.username}
                            </span>
                        </div>
                    </div>

                    <div className="profile-dropdown-divider" />

                    {/* Storage section */}
                    <button
                        className="profile-dropdown-storage"
                        onClick={() => handleNavigate('/storage')}
                    >
                        <span className="material-symbols-outlined storage-icon">cloud</span>
                        <div className="storage-details">
                            <span className="storage-label">Storage</span>
                            <div className="storage-bar">
                                <div
                                    className="storage-bar-fill"
                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                />
                            </div>
                            <span className="storage-text">
                                {formatBytes(storageUsed)} of {formatBytes(storageLimit)} used
                            </span>
                        </div>
                    </button>

                    <div className="profile-dropdown-divider" />

                    {/* Actions */}
                    <button
                        className="profile-dropdown-item"
                        onClick={() => handleNavigate('/settings/account')}
                    >
                        <span className="material-symbols-outlined">manage_accounts</span>
                        <span>Manage account</span>
                    </button>

                    <button
                        className="profile-dropdown-item"
                        onClick={handleLogout}
                    >
                        <span className="material-symbols-outlined">logout</span>
                        <span>Sign out</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default ProfileDropdown;
