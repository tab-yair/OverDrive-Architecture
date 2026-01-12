import React, { useState } from 'react';
import useFiles from '../../hooks/useFiles';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { useDownload } from '../../hooks/useDownload';
import { useRename } from '../../hooks/useRename';
import { FileManager, InfoSidebar } from '../FileManagement';
import Breadcrumbs from '../Breadcrumbs/Breadcrumbs';
import PreviewModal from '../PreviewModal/PreviewModal';
import TextDocumentViewer from '../TextDocumentViewer/TextDocumentViewer';
import RenameModal from '../RenameModal/RenameModal';
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
 * @param {React.Component} props.headerComponent - Custom header component (optional)
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
    const { user } = useAuth();
    const { downloadFile, downloadMultiple } = useDownload();
    const { renameFile } = useRename();
    
    // Use custom files/loading if provided, otherwise use hook result
    const files = customFiles !== undefined ? customFiles : hookResult.files;
    const loading = customLoading !== undefined ? customLoading : hookResult.loading;
    const refetch = hookResult.refetch;
    const [viewMode, setViewMode] = useState('grid');
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const [previewFile, setPreviewFile] = useState(null);
    const [renameFile_modal, setRenameFile_modal] = useState(null);

    console.log('🔄 FilePageWrapper render:', { 
      pageContext,
      filesCount: files?.length || 0,
      loading,
      endpoint,
      timestamp: new Date().toISOString()
    });

    const defaultFileClick = (file) => {
        console.log(`📝 ${pageContext} file clicked:`, file);
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
                    // For files (PDF, image, docs), open in preview modal
                    setPreviewFile(item);
                }
            }
            return;
        }
        
        // Handle details action - open InfoSidebar
        if (action === 'details') {
            console.log('[FilePageWrapper] Details action - selectedCount:', selectedCount);
            
            // Extract file ID from either object or array
            const fileId = Array.isArray(fileOrFiles) 
                ? (fileOrFiles.length > 0 ? fileOrFiles[0].id : null)
                : (fileOrFiles ? fileOrFiles.id : null);
            
            if (fileId) {
                setSelectedFileId(fileId);
                setIsSidebarOpen(true);
                console.log('[FilePageWrapper] Sidebar opened - fileId:', fileId);
            }
            return;
        }
        
        // Handle download action
        if (action === 'download') {
            console.log('[FilePageWrapper] Download action triggered');
            
            // Handle both single file and multiple files
            if (Array.isArray(fileOrFiles)) {
                if (fileOrFiles.length > 0) {
                    // Multiple files selected
                    downloadMultiple(fileOrFiles).catch(err => {
                        console.error('Download failed:', err);
                    });
                }
            } else if (fileOrFiles) {
                // Single file
                downloadFile(fileOrFiles).catch(err => {
                    console.error('Download failed:', err);
                });
            }
            return;
        }
        
        // Handle rename action - only for single file selection
        if (action === 'rename') {
            console.log('[FilePageWrapper] Rename action triggered');
            
            // Only allow rename when exactly 1 item is selected
            const file = Array.isArray(fileOrFiles) 
                ? (fileOrFiles.length === 1 ? fileOrFiles[0] : null)
                : fileOrFiles;
            
            if (file) {
                setRenameFile_modal(file);
            } else {
                console.warn('[FilePageWrapper] Rename requires exactly 1 file selected');
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
                // Double-click should mirror the default open action (folders navigate, files preview)
                onFileDoubleClick={(file) => defaultAction('open', file)}
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
            {/* Preview Modal for images and PDFs */}
            {previewFile && (previewFile.type === 'image' || previewFile.type === 'pdf') && (
                <PreviewModal
                    fileId={previewFile.id}
                    fileName={previewFile.name}
                    fileType={previewFile.type}
                    onClose={() => setPreviewFile(null)}
                />
            )}
            
            {/* Text Document Viewer for docs */}
            {previewFile && previewFile.type === 'docs' && (
                <TextDocumentViewer
                    fileId={previewFile.id}
                    fileName={previewFile.name}
                    permissionLevel={
                        // Determine permission level from file
                        previewFile.ownerId === user?.id 
                            ? 'owner' 
                            : (previewFile.sharedPermissionLevel?.toLowerCase() || permissionLevel)
                    }
                    onClose={() => setPreviewFile(null)}
                />
            )}
            
            {/* Rename Modal */}
            {renameFile_modal && (
                <RenameModal
                    file={renameFile_modal}
                    onRename={renameFile}
                    onClose={() => {
                        setRenameFile_modal(null);
                        // Refetch after rename to update file list
                        setTimeout(() => refetch(), 300);
                    }}
                />
            )}
        </div>
    );
}

export default FilePageWrapper;
