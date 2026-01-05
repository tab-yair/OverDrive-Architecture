import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './StorageIndicator.css';

/**
 * StorageIndicator Component
 * Displays storage usage with progress bar
 * Currently shows hardcoded values - will be integrated with server later
 */
function StorageIndicator() {
    // eslint-disable-next-line no-unused-vars
    const { token } = useAuth(); // Token ready for future API integration

    // TODO: Fetch actual storage usage from server
    // useEffect(() => {
    //     async function fetchStorage() {
    //         const response = await fetch('/api/storage', {
    //             headers: { 'Authorization': `Bearer ${token}` }
    //         });
    //         const data = await response.json();
    //         setUsedStorage(data.used);
    //         setTotalStorage(data.total);
    //     }
    //     if (token) fetchStorage();
    // }, [token]);

    // Hardcoded storage values for now
    const usedGB = 2.4;
    const totalGB = 15;
    const usagePercent = (usedGB / totalGB) * 100;

    // Determine color based on usage
    const getProgressColor = () => {
        if (usagePercent >= 90) return 'var(--danger-color)';
        if (usagePercent >= 70) return 'var(--warning-color)';
        return 'var(--accent-color)';
    };

    return (
        <div className="storage-indicator">
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
                            width: `${usagePercent}%`,
                            backgroundColor: getProgressColor()
                        }}
                    />
                </div>

                {/* Storage text */}
                <span className="storage-text">
                    {usedGB} GB of {totalGB} GB used
                </span>
            </div>
        </div>
    );
}

export default StorageIndicator;
