import React, { useState } from 'react';
import useFiles from '../../hooks/useFiles';
import { useNavigation } from '../../context/NavigationContext';
import { FileManager, InfoSidebar } from '../FileManagement';
import Breadcrumbs from '../Breadcrumbs/Breadcrumbs';
import './FilePageWrapper.css';

/**
 * FilePageWrapper Component
 * Reusable wrapper for all file-based pages (MyDrive, Shared, Recent, Starred, Trash, Folders)
 * Eliminates code duplication across sidebar pages
 * 
 * @param {Object} props
 * @param {string} props.endpoint - API endpoint type: 'mydrive', 'shared', 'recent', 'trash', 'starred' (optional if customFiles provided)
 * @param {Array} props.customFiles - Custom files array (optional, overrides endpoint)
 * @param {boolean} props.customLoading - Custom loading state (optional, overrides endpoint loading)
// ...existing code...
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
    customFiles,
    customLoading,
    headerComponent,
    pageContext,
    isOwner = false,
    permissionLevel = 'viewer',
    className = '',
    loadingMessage = 'Loading files...',
    onFileClick,
    onAction
}) {
    // Always call hooks unconditionally (React rule)
    const hookResult = useFiles(endpoint || 'mydrive'); // Provide default to avoid conditional hook call
    const { handleOpen } = useNavigation();
    
    // Use custom files/loading if provided, otherwise use hook result
    const files = customFiles !== undefined ? customFiles : hookResult.files;
    const loading = customLoading !== undefined ? customLoading : hookResult.loading;
    const refetch = hookResult.refetch;
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
     * @param {string} action - The action type (e.g., 'open', 'details', 'delete', 'share', etc.)
     * @param {Object|Array} fileOrFiles - Single file object or array of file objects
     * 
     * Uses selectedCount (from FileManager's onSelectionChange) to determine:
     * - Open: Navigate folders, open PDFs/images in new tab via download endpoint
     * - Details: Only open sidebar if selectedCount <= 1
     * - Future: Permission checks based on all selected files (most restrictive)
     */
    const defaultAction = (action, fileOrFiles) => {
        console.log(`[FilePageWrapper] ${pageContext} action:`, action, 'Files:', fileOrFiles, 'Selected count:', selectedCount);
        
        // Handle open action - folders navigate, files open in new tab
        if (action === 'open') {
            const item = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
            if (item) {
                if (item.type === 'folder') {
                    // Navigate to folder
                    handleOpen(item);
                } else {
                    // For all file types (PDF, image, docs), download and open in new tab
                    const token = localStorage.getItem('token');
                    const downloadUrl = `http://localhost:3000/api/files/${item.id}/download`;
                    
                    // Fetch with auth, then open blob URL in new tab
                    fetch(downloadUrl, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    .then(response => {
                        if (!response.ok) throw new Error('Download failed');
                        return response.blob();
                    })
                    .then(blob => {
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                        // Clean up after a delay
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                    })
                    .catch(err => {
                        console.error('Failed to open file:', err);
                        alert(`Failed to open ${item.name}`);
                    });
                }
            }
            return;
        }
        
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
            {/* Breadcrumbs Navigation - First element, aligned with content */}
            <div className="file-page-breadcrumbs">
                <Breadcrumbs />
            </div>

            {/* Custom header component removed */}
            {headerComponent}
            
            <FileManager
                files={files}
                pageContext={pageContext}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onFileClick={onFileClick || defaultFileClick}
                onFileDoubleClick={handleOpen}
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
