import React, { useState } from 'react';
import useFiles from '../../hooks/useFiles';
import { FileManager, InfoSidebar } from '../FileManagement';
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
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);

    const defaultFileClick = (file) => {
        console.log(`${pageContext} file clicked:`, file);
        // TODO: Navigate to file details or open file
    };

    /**
     * Default action handler
     * @param {string} action - The action type (e.g., 'details', 'delete', 'share', etc.)
     * @param {Object|Array} fileOrFiles - Single file object or array of file objects
     * 
     * Uses selectedCount (from FileManager's onSelectionChange) to determine:
     * - Details: Only open sidebar if selectedCount <= 1
     * - Future: Permission checks based on all selected files (most restrictive)
     */
    const defaultAction = (action, fileOrFiles) => {
        console.log(`[FilePageWrapper] ${pageContext} action:`, action, 'Files:', fileOrFiles, 'Selected count:', selectedCount);
        
        // Handle details action - open InfoSidebar
        // Rule: Only allow details sidebar when 0 or 1 files are selected
        if (action === 'details') {
            console.log('[FilePageWrapper] Details action - selectedCount:', selectedCount);
            
            if (selectedCount <= 1) {
                console.log('[FilePageWrapper] Opening InfoSidebar for file:', fileOrFiles);
                // Extract file ID from either object or array
                const fileId = Array.isArray(fileOrFiles) 
                    ? (fileOrFiles.length > 0 ? fileOrFiles[0].id : null)
                    : (fileOrFiles ? fileOrFiles.id : null);
                
                if (fileId) {
                    setSelectedFileId(fileId);
                    setIsSidebarOpen(true);
                    console.log('[FilePageWrapper] Sidebar opened - fileId:', fileId);
                }
            } else {
                console.log('[FilePageWrapper] Details blocked - multiple files selected:', selectedCount);
            }
            return;
        }
        
        // TODO: Future - Handle permission checks for multi-selection
        // When selectedCount > 1:
        // - Check permissions for ALL selected files
        // - Allow action only if ALL files permit it (most restrictive approach)
        // Example:
        // if (selectedCount > 1 && ['delete', 'share', 'move'].includes(action)) {
        //     const allFiles = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
        //     const canPerformAction = allFiles.every(file => hasPermission(file, action));
        //     if (!canPerformAction) {
        //         console.log('Action blocked - insufficient permissions on some files');
        //         return;
        //     }
        // }
        
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
                onSelectionChange={setSelectedCount}
            />
            
            {/* InfoSidebar - Connected to FilesContext (SSOT) */}
            <InfoSidebar
                fileId={selectedFileId}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
        </div>
    );
}

export default FilePageWrapper;
