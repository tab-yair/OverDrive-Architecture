import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { formatBytes } from '../services/api';
import './SettingsPage.css';

/**
 * GeneralSettingsPage Component
 * General settings: storage, start page, appearance
 */
function GeneralSettingsPage() {
    const navigate = useNavigate();
    const { themeMode, setThemeMode } = useTheme();
    const { preferences, storageInfo, updatePreference } = useUserPreferences();

    // Calculate storage values
    const storageUsed = storageInfo?.storageUsed || 0;
    const storageLimit = storageInfo?.storageLimit || (15 * 1024 * 1024 * 1024);
    const usagePercent = storageInfo?.usagePercentage || 0;

    // Handle start page change
    const handleStartPageChange = (value) => {
        updatePreference('startPage', value);
    };

    // Handle theme change (sync with ThemeContext)
    const handleThemeChange = (value) => {
        setThemeMode(value);
        updatePreference('theme', value);
    };

    return (
        <div className="general-settings">
            {/* Storage Section */}
            <section className="settings-section">
                <h2 className="settings-section-title">Storage</h2>
                <div className="settings-section-content">
                    <div className="storage-settings">
                        <div className="storage-settings-bar">
                            <div
                                className="storage-settings-bar-fill"
                                style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                        </div>
                        <p className="storage-settings-text">
                            {formatBytes(storageUsed)} of {formatBytes(storageLimit)} used
                        </p>
                        <div className="storage-settings-actions">
                            <button className="btn btn-secondary" disabled>
                                Get more storage
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate('/storage')}
                            >
                                Manage storage
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Start Page Section */}
            <section className="settings-section">
                <h2 className="settings-section-title">Start page</h2>
                <p className="settings-section-description">
                    Choose the page to show when you open OverDrive
                </p>
                <div className="settings-section-content">
                    <div className="settings-radio-group">
                        <label className="settings-radio">
                            <input
                                type="radio"
                                name="startPage"
                                value="home"
                                checked={preferences.startPage === 'home'}
                                onChange={() => handleStartPageChange('home')}
                            />
                            <span className="settings-radio-custom" />
                            <span className="settings-radio-label">Home</span>
                        </label>
                        <label className="settings-radio">
                            <input
                                type="radio"
                                name="startPage"
                                value="mydrive"
                                checked={preferences.startPage === 'mydrive'}
                                onChange={() => handleStartPageChange('mydrive')}
                            />
                            <span className="settings-radio-custom" />
                            <span className="settings-radio-label">My Drive</span>
                        </label>
                    </div>
                </div>
            </section>

            {/* Appearance Section */}
            <section className="settings-section">
                <h2 className="settings-section-title">Appearance</h2>
                <p className="settings-section-description">
                    Choose how OverDrive looks to you
                </p>
                <div className="settings-section-content">
                    <div className="settings-radio-group">
                        <label className="settings-radio">
                            <input
                                type="radio"
                                name="theme"
                                value="light"
                                checked={themeMode === 'light'}
                                onChange={() => handleThemeChange('light')}
                            />
                            <span className="settings-radio-custom" />
                            <span className="settings-radio-label">Light</span>
                        </label>
                        <label className="settings-radio">
                            <input
                                type="radio"
                                name="theme"
                                value="dark"
                                checked={themeMode === 'dark'}
                                onChange={() => handleThemeChange('dark')}
                            />
                            <span className="settings-radio-custom" />
                            <span className="settings-radio-label">Dark</span>
                        </label>
                        <label className="settings-radio">
                            <input
                                type="radio"
                                name="theme"
                                value="system"
                                checked={themeMode === 'system'}
                                onChange={() => handleThemeChange('system')}
                            />
                            <span className="settings-radio-custom" />
                            <span className="settings-radio-label">Device default</span>
                        </label>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default GeneralSettingsPage;
