import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import './Pages.css';
import './SettingsPage.css';

/**
 * SettingsPage Component
 * Settings layout with sidebar navigation and nested routes
 */
function SettingsPage() {
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect to general settings if on /settings
    useEffect(() => {
        if (location.pathname === '/settings') {
            navigate('/settings/general', { replace: true });
        }
    }, [location.pathname, navigate]);

    return (
        <div className="page settings-page">
            {/* Header */}
            <div className="settings-header">
                <button
                    className="settings-back-btn"
                    onClick={() => navigate(-1)}
                    aria-label="Go back"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="settings-title">Settings</h1>
            </div>

            <div className="settings-content">
                {/* Sidebar navigation */}
                <nav className="settings-nav">
                    <NavLink
                        to="/settings/general"
                        className={({ isActive }) =>
                            `settings-nav-item ${isActive ? 'active' : ''}`
                        }
                    >
                        <span className="material-symbols-outlined">tune</span>
                        <span>General</span>
                    </NavLink>
                    <NavLink
                        to="/settings/account"
                        className={({ isActive }) =>
                            `settings-nav-item ${isActive ? 'active' : ''}`
                        }
                    >
                        <span className="material-symbols-outlined">person</span>
                        <span>Account</span>
                    </NavLink>
                </nav>

                {/* Settings content area */}
                <div className="settings-main">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default SettingsPage;
