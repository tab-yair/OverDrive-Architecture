import { useAuth } from '../../context/AuthContext';
import SidebarItem from './SidebarItem';
import NewButton from './NewButton/NewButton';
import StorageIndicator from '../StorageIndicator/StorageIndicator';
import './Sidebar.css';

/**
 * Sidebar Component
 * Navigation sidebar with:
 * - "New" button dropdown for creating files/folders
 * - Navigation items (Home, My Drive, Shared, Recent, Starred, Trash, Storage)
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
        { icon: 'cloud', label: 'Storage', to: '/storage' },
    ];

    return (
        <aside className="sidebar">
            {/* New button with dropdown */}
            <div className="sidebar-new-btn-container">
                <NewButton />
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
