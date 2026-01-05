import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { filesApi, formatBytes } from '../services/api';
import './Pages.css';
import './StoragePage.css';

/**
 * StoragePage Component
 * Shows storage usage and files sorted by size
 */
function StoragePage() {
    const { token } = useAuth();
    const { storageInfo, storageLoading } = useUserPreferences();

    const [files, setFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch files sorted by size
    useEffect(() => {
        async function fetchFiles() {
            if (!token) return;

            setFilesLoading(true);
            setError(null);

            try {
                const data = await filesApi.getFiles(token, {
                    sortBy: 'size',
                    sortOrder: 'desc'
                });
                // Handle both array response and object with files property
                const fileList = Array.isArray(data) ? data : (data.files || []);
                // Sort by size descending (largest first)
                const sortedFiles = fileList.sort((a, b) => (b.size || 0) - (a.size || 0));
                setFiles(sortedFiles);
            } catch (err) {
                console.error('Failed to fetch files:', err);
                setError(err.message);
            } finally {
                setFilesLoading(false);
            }
        }

        fetchFiles();
    }, [token]);

    // Get file icon based on type/mimetype
    const getFileIcon = (file) => {
        if (file.type === 'folder') return 'folder';
        const mimeType = file.mimeType || '';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'movie';
        if (mimeType.startsWith('audio/')) return 'audio_file';
        if (mimeType.includes('pdf')) return 'picture_as_pdf';
        if (mimeType.includes('document') || mimeType.includes('word')) return 'description';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table_chart';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'slideshow';
        if (mimeType.includes('zip') || mimeType.includes('archive')) return 'folder_zip';
        if (mimeType.includes('text')) return 'article';
        return 'insert_drive_file';
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
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
                <h2 className="storage-files-title">Files using storage</h2>

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
                    <div className="storage-files-list">
                        <div className="storage-files-header">
                            <span className="storage-file-name-header">Name</span>
                            <span className="storage-file-date-header">Modified</span>
                            <span className="storage-file-size-header">Size</span>
                        </div>
                        {files.map((file) => (
                            <div key={file.id || file._id} className="storage-file-row">
                                <div className="storage-file-name">
                                    <span className="material-symbols-outlined storage-file-icon">
                                        {getFileIcon(file)}
                                    </span>
                                    <span className="storage-file-name-text">{file.name}</span>
                                </div>
                                <span className="storage-file-date">
                                    {formatDate(file.updatedAt || file.createdAt)}
                                </span>
                                <span className="storage-file-size">
                                    {file.type === 'folder' ? '-' : formatBytes(file.size || 0)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default StoragePage;
