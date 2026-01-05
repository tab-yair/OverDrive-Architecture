import React from 'react';
import { useAuth } from '../../context/AuthContext';
import SidebarItem from './SidebarItem';
import StorageIndicator from '../StorageIndicator/StorageIndicator';
import './Sidebar.css';

/**
 * Sidebar Component
 * Navigation sidebar with:
 * - "New" button for creating files/folders
 * - Navigation items (Home, My Drive, Shared, Recent, Starred, Trash)
 * - Storage indicator at the bottom
 *
 * Only renders when user is authenticated (controlled by Layout)
 */
function Sidebar() {
    const { isAuthenticated } = useAuth();

    // Don't render if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    // Navigation items configuration
    const navItems = [
        { icon: 'home', label: 'Home', to: '/home' },
        { icon: 'folder', label: 'My Drive', to: '/mydrive' },
        { icon: 'people', label: 'Shared with me', to: '/shared' },
        { icon: 'schedule', label: 'Recent', to: '/recent' },
        { icon: 'star', label: 'Starred', to: '/starred' },
        { icon: 'delete', label: 'Trash', to: '/trash' },
    ];

    // Handle "New" button click
    const handleNewClick = () => {
        // TODO: Open "New" menu (Create folder, Upload file, etc.)
        console.log('New button clicked - TODO: Implement new file/folder menu');
    };

    return (
        <aside className="sidebar">
            {/* New button */}
            <div className="sidebar-new-btn-container">
                <button
                    className="sidebar-new-btn"
                    onClick={handleNewClick}
                    aria-label="Create new file or folder"
                >
                    <span className="material-symbols-outlined">add</span>
                    <span className="sidebar-new-btn-text">New</span>
                </button>
            </div>

            {/* Navigation items */}
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <SidebarItem
                        key={item.to}
                        icon={item.icon}
                        label={item.label}
                        to={item.to}
                    />
                ))}
            </nav>

            {/* Storage indicator at bottom */}
            <div className="sidebar-footer">
                <StorageIndicator />
            </div>
        </aside>
    );
}

export default Sidebar;
