import React, { useState } from 'react';
import useFiles from '../../hooks/useFiles';
import { FileManager } from '../FileManagement';
import './FilePageWrapper.css';

/**
 * FilePageWrapper Component
 * Reusable wrapper for all file-based pages (MyDrive, Shared, Recent, Starred, Trash)
 * Eliminates code duplication across sidebar pages
 * 
 * @param {Object} props
 * @param {string} props.endpoint - API endpoint type: 'mydrive', 'shared', 'recent', 'trash', 'starred'
 * @param {string} props.pageContext - Display context for FileManager (e.g., 'MyDrive', 'Shared')
 * @param {boolean} props.isOwner - Whether user is the owner of displayed files
 * @param {string} props.permissionLevel - Permission level: 'owner', 'editor', 'viewer'
 * @param {string} props.className - Additional CSS class for the page container
 * @param {string} props.loadingMessage - Custom loading message (optional)
 * @param {Function} props.onFileClick - Custom file click handler (optional)
 * @param {Function} props.onAction - Custom action handler (optional)
 */
function FilePageWrapper({
    endpoint,
    pageContext,
    isOwner = false,
    permissionLevel = 'viewer',
    className = '',
    loadingMessage = 'Loading files...',
    onFileClick,
    onAction
}) {
    const { files, loading, refetch } = useFiles(endpoint);
    const [viewMode, setViewMode] = useState('grid');

    const defaultFileClick = (file) => {
        console.log(`${pageContext} file clicked:`, file);
        // TODO: Navigate to file details or open file
    };

    const defaultAction = (action, fileIds) => {
        console.log(`${pageContext} action:`, action, 'Files:', fileIds);
        // Refetch after actions that modify data
        const refetchActions = ['delete', 'restore', 'star', 'unstar', 'move', 'rename'];
        if (refetchActions.includes(action)) {
            setTimeout(() => refetch(), 300);
        }
    };

    if (loading) {
        return (
            <div className={`file-page ${className}`}>
                <div className="file-page-loading">
                    <span className="material-symbols-outlined spinning">progress_activity</span>
                    <p>{loadingMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`file-page ${className}`}>
            <FileManager
                files={files}
                pageContext={pageContext}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onFileClick={onFileClick || defaultFileClick}
                onAction={onAction || defaultAction}
                isOwner={isOwner}
                permissionLevel={permissionLevel}
            />
        </div>
    );
}

export default FilePageWrapper;
