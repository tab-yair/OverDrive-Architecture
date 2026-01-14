import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useUserChange } from '../hooks/useUserChange';
import { useAppEvent } from '../hooks/useAppEvent';
import { AppEvents } from '../utils/eventManager';
import { formatBytes } from '../services/api';
import { FileManager } from '../components/FileManagement';
import { useNavigation } from '../context/NavigationContext';
import { useDownload } from '../hooks/useDownload';
import './Pages.css';
import './StoragePage.css';

/**
 * StoragePage Component
 * Shows storage usage and files sorted by size
 */
function StoragePage() {
    const { token } = useAuth();
    const { storageInfo, storageLoading } = useUserPreferences();
    const { handleOpen } = useNavigation();
    const { downloadFile } = useDownload();

    const [files, setFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = largest first, 'asc' = smallest first

    // Clear files when user changes
    useUserChange(() => {
        setFiles([]);
        setError(null);
    });

    // Fetch files sorted by size using new /api/files/owned endpoint
    const fetchFiles = useCallback(async () => {
        if (!token) return;

        setFilesLoading(true);
        setError(null);

        try {
            const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
            const response = await fetch(`${API_BASE_URL}/api/files/owned?sortOrder=${sortOrder}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch files: ${response.status}`);
            }

            const data = await response.json();

            setFiles(data);
        } catch (err) {
            console.error('Failed to fetch files:', err);
            setError(err.message);
        } finally {
            setFilesLoading(false);
        }
    }, [token, sortOrder]);

    // Fetch on mount and when token/user changes
    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // Listen for files updated events (file upload, delete, rename, etc.)
    useAppEvent(AppEvents.FILES_UPDATED, () => {
        fetchFiles();
    }, [fetchFiles]);

    // Listen for storage updated events (file upload/delete that affects storage)
    useAppEvent(AppEvents.STORAGE_UPDATED, () => {
        fetchFiles();
    }, [fetchFiles]);

    // Toggle sort order
    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    // Handle file actions
    const handleFileAction = (action, fileOrFiles) => {
        if (action === 'open') {
            const item = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
            if (item) {
                if (item.type === 'folder') {
                    handleOpen(item);
                } else {
                    downloadFile(item.id, item.name);
                }
            }
        }
    };

    // Handle double-click - open file/folder
    const handleFileDoubleClick = (file) => {
        if (file.type === 'folder') {
            handleOpen(file);
        } else {
            downloadFile(file.id, file.name);
        }
    };


    // Calculate storage values
    const storageUsed = storageInfo?.storageUsed || 0;
    const storageLimit = storageInfo?.storageLimit || (15 * 1024 * 1024 * 1024);
    const usagePercent = storageInfo?.usagePercentage || (storageUsed / storageLimit * 100);

    return (
        <div className="page storage-page">
            <h1 className="page-title">Storage</h1>

            {/* Storage overview */}
            <div className="storage-overview">
                <div className="storage-overview-header">
                    <span className="material-symbols-outlined storage-overview-icon">cloud</span>
                    <div className="storage-overview-text">
                        <span className="storage-overview-used">
                            {formatBytes(storageUsed)} of {formatBytes(storageLimit)} used
                        </span>
                        <span className="storage-overview-percent">
                            {usagePercent.toFixed(1)}% full
                        </span>
                    </div>
                </div>
                <div className="storage-overview-bar">
                    <div
                        className="storage-overview-bar-fill"
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                </div>
                {storageLoading && (
                    <span className="storage-loading">Updating...</span>
                )}
            </div>

            {/* Files list */}
            <div className="storage-files-section">
                <div className="storage-files-header-wrapper">
                    <div className="storage-files-header-text">
                        <h2 className="storage-files-title">Files using storage</h2>
                    </div>
                    <button 
                        className="storage-sort-toggle"
                        onClick={toggleSortOrder}
                        title={sortOrder === 'desc' ? 'Sort smallest first' : 'Sort largest first'}
                    >
                        <span className="material-symbols-outlined">
                            {sortOrder === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                        <span className="storage-sort-label">
                            {sortOrder === 'desc' ? 'Largest first' : 'Smallest first'}
                        </span>
                    </button>
                </div>

                {filesLoading ? (
                    <div className="storage-files-loading">
                        <span className="material-symbols-outlined spinning">progress_activity</span>
                        <span>Loading files...</span>
                    </div>
                ) : error ? (
                    <div className="storage-files-error">
                        <span className="material-symbols-outlined">error</span>
                        <span>{error}</span>
                    </div>
                ) : files.length === 0 ? (
                    <div className="storage-files-empty">
                        <span className="material-symbols-outlined">folder_off</span>
                        <p>No files in storage</p>
                        <p className="storage-files-empty-hint">Upload files to see them here</p>
                    </div>
                ) : (
                    <FileManager
                        files={files}
                        pageContext="Storage"
                        viewMode="list"
                        onViewModeChange={() => {}}
                        onFileDoubleClick={handleFileDoubleClick}
                        onAction={handleFileAction}
                        isOwner={true}
                        permissionLevel="owner"
                    />
                )}
            </div>
        </div>
    );
}

export default StoragePage;
