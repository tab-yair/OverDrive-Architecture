import { useNavigate } from 'react-router-dom';
import { useUserPreferences } from '../../context/UserPreferencesContext';
import { formatBytes } from '../../services/api';
import './StorageIndicator.css';

/**
 * StorageIndicator Component
 * Displays storage usage with progress bar
 * Fetches real data from UserPreferencesContext
 */
function StorageIndicator() {
    const navigate = useNavigate();
    const { storageInfo, storageLoading } = useUserPreferences();

    // Calculate storage values
    const storageUsed = storageInfo?.storageUsed || 0;
    const storageLimit = storageInfo?.storageLimit || (15 * 1024 * 1024 * 1024);
    const usagePercent = storageInfo?.usagePercentage || (storageUsed / storageLimit * 100);

    // Determine color based on usage
    const getProgressColor = () => {
        if (usagePercent >= 90) return 'var(--danger-color)';
        if (usagePercent >= 70) return 'var(--warning-color)';
        return 'var(--accent-color)';
    };

    return (
        <button
            className="storage-indicator"
            onClick={() => navigate('/storage')}
            aria-label="View storage"
        >
            {/* Cloud icon */}
            <div className="storage-icon">
                <span className="material-symbols-outlined">cloud</span>
            </div>

            {/* Storage info */}
            <div className="storage-info">
                {/* Progress bar */}
                <div className="storage-progress">
                    <div
                        className="storage-progress-bar"
                        style={{
                            width: `${Math.min(usagePercent, 100)}%`,
                            backgroundColor: getProgressColor()
                        }}
                    />
                </div>

                {/* Storage text */}
                <span className="storage-text">
                    {storageLoading ? (
                        'Loading...'
                    ) : (
                        `${formatBytes(storageUsed)} of ${formatBytes(storageLimit)} used`
                    )}
                </span>
            </div>
        </button>
    );
}

export default StorageIndicator;
