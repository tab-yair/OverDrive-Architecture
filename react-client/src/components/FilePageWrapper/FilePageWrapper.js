import React, { useState, useMemo, useEffect } from 'react';
import useFiles from '../../hooks/useFiles';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { useFilesContext } from '../../context/FilesContext';
import { useDownload } from '../../hooks/useDownload';
import { useRename } from '../../hooks/useRename';
import { FileManager, InfoSidebar, MoveModal } from '../FileManagement';
import Breadcrumbs from '../Breadcrumbs/Breadcrumbs';
import PreviewModal from '../PreviewModal/PreviewModal';
import TextDocumentViewer from '../TextDocumentViewer/TextDocumentViewer';
import RenameModal from '../RenameModal/RenameModal';
import ShareModal from '../ShareModal/ShareModal';
import FileTypeFilter from '../FileTypeFilter';
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
 * @param {Function} props.customRefetch - Custom refetch function (optional, for FolderPage)
 * @param {React.Component} props.headerComponent - Custom header component (optional)
 * @param {string} props.pageContext - Display context for FileManager (e.g., 'MyDrive', 'Shared')
 * @param {boolean} props.isOwner - Whether user is the owner of displayed files
 * @param {string} props.permissionLevel - Permission level: 'owner', 'editor', 'viewer'
 * @param {string} props.className - Additional CSS class for the page container
 * @param {string} props.loadingMessage - Custom loading message (optional)
 * @param {Function} props.onFileClick - Custom file click handler (optional)
 * @param {Function} props.onAction - Custom action handler (optional)
 * @param {boolean} props.showFilter - Whether to show file type filter (default: true)
 */
function FilePageWrapper({
    endpoint,
    customFiles,
    customLoading,
    customRefetch,
    headerComponent,
    pageContext,
    isOwner = false,
    permissionLevel = 'viewer',
    className = '',
    loadingMessage = 'Loading files...',
    onFileClick,
    onAction,
    showFilter = true
}) {
    // Always call hooks unconditionally (React rule)
    const hookResult = useFiles(endpoint || 'mydrive'); // Provide default to avoid conditional hook call
    const { handleOpen } = useNavigation();
    const { user } = useAuth();
    const filesContext = useFilesContext();
    const { downloadFile, downloadMultiple } = useDownload();
    const { renameFile } = useRename();
    
    // Use custom files/loading/refetch if provided, otherwise use hook result
    const files = customFiles !== undefined ? customFiles : hookResult.files;
    const loading = customLoading !== undefined ? customLoading : hookResult.loading;
    const refetch = customRefetch || hookResult.refetch;
    
    // Load view mode from localStorage, default to 'grid'
    const [viewMode, setViewMode] = useState(() => {
        const saved = localStorage.getItem('fileViewMode');
        return saved === 'list' || saved === 'grid' ? saved : 'grid';
    });
    
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const [renameFile_modal, setRenameFile_modal] = useState(null);
    const [shareFile_modal, setShareFile_modal] = useState(null);
    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [moveTargets, setMoveTargets] = useState([]);
    const [fileTypeFilter, setFileTypeFilter] = useState('all');

    // Save view mode to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('fileViewMode', viewMode);
    }, [viewMode]);

    // Filter files by type
    const filteredFiles = useMemo(() => {
        if (!files || fileTypeFilter === 'all') return files;
        return files.filter(file => {
            // If filtering by folders only, show only folders
            if (fileTypeFilter === 'folder') {
                return file.type === 'folder';
            }
            // For file type filters (image, pdf, docs), show ONLY matching files (no folders)
            return file.type === fileTypeFilter;
        });
    }, [files, fileTypeFilter]);

    const defaultFileClick = (file) => {
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
            // Extract file ID from either object or array
            const fileId = Array.isArray(fileOrFiles) 
                ? (fileOrFiles.length > 0 ? fileOrFiles[0].id : null)
                : (fileOrFiles ? fileOrFiles.id : null);
            
            if (fileId) {
                setSelectedFileId(fileId);
                setIsSidebarOpen(true);
            }
            return;
        }
        
        // Handle download action
        if (action === 'download') {
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

        // Handle copy action (files only, same folder)
        if (action === 'copy') {
            const item = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
            if (!item) return;
            if (item.type === 'folder') {
                console.warn('Copy is available for files only');
                return;
            }

            // Server defaults to "Copy of {name}" if newName not provided
            filesContext.copyFile(item.id, {
                parentId: item.parentId || null
            }).then((result) => {
                if (!result.success) {
                    const msg = (result.error || '').toLowerCase();
                    const permissionBlocked = msg.includes('permission');
                    const friendly = permissionBlocked
                        ? 'You do not have permission to add files to this folder'
                        : (result.error || 'Copy failed');
                    alert(friendly);
                }
            }).catch((err) => {
                const msg = (err?.message || '').toLowerCase();
                const permissionBlocked = msg.includes('permission');
                const friendly = permissionBlocked
                    ? 'You do not have permission to add files to this folder'
                    : (err?.message || 'Copy failed');
                alert(friendly);
            });
            return;
        }
        
        // Handle rename action - only for single file selection
        if (action === 'rename') {
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
        
        // Handle share action - supports single or multiple files
        if (action === 'share') {
            // Get files to share (single or multiple)
            const filesToShare = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
            
            if (filesToShare.length === 0) {
                console.warn('[FilePageWrapper] No files to share');
                return;
            }
            
            // For bulk sharing: share each file separately
            // The ShareModal handles one file at a time
            // We'll process them sequentially
            if (filesToShare.length === 1) {
                setShareFile_modal(filesToShare[0]);
            } else {
                // Bulk share: open modal for first file
                // Store remaining files for sequential processing
                setShareFile_modal({ ...filesToShare[0], bulkFiles: filesToShare });
            }
            return;
        }
        
        // Handle star/unstar action - works for both single and multiple files
        if (action === 'star' || action === 'unstar') {
            // Handle both single file and multiple files
            const filesToToggle = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
            
            // Toggle star for each file
            // Note: FilesContext handles optimistic updates and server sync automatically
            // No need to refetch - that would overwrite the optimistic update!
            Promise.all(
                filesToToggle.map(file => filesContext.toggleStar(file.id))
            ).then(results => {
                const failures = results.filter(r => !r.success);
                if (failures.length > 0) {
                    console.error('[FilePageWrapper] Some files failed to toggle star:', failures);
                }
            }).catch(err => {
                console.error('[FilePageWrapper] Star toggle operation failed:', err);
            });
            
            return;
        }
        
        // Handle trash action (delete/remove) - works for both single and multiple files
        if (action === 'trash') {
            // Handle both single file and multiple files
            const filesToTrash = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
            
            // Delete each file
            Promise.all(
                filesToTrash.map(file => filesContext.deleteFile(file.id))
            ).then(results => {
                const failures = results.filter(r => !r.success);
                if (failures.length > 0) {
                    console.error('[FilePageWrapper] Some files failed to trash:', failures);
                }
                // Refetch to update the view
                setTimeout(() => refetch(), 300);
            }).catch(err => {
                console.error('[FilePageWrapper] Trash operation failed:', err);
            });
            
            return;
        }

        // Handle move action - open destination modal with current selection
        if (action === 'move') {
            const filesToMove = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
            const validTargets = filesToMove.filter(Boolean);
            if (validTargets.length === 0) return;
            setMoveTargets(validTargets);
            setMoveModalOpen(true);
            return;
        }
        
        // Handle restore action - works for both single and multiple files
        if (action === 'restore') {
            // Handle both single file and multiple files
            const filesToRestore = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
            
            // Restore each file
            Promise.all(
                filesToRestore.map(file => filesContext.restoreFile(file.id))
            ).then(results => {
                const failures = results.filter(r => !r.success);
                if (failures.length > 0) {
                    console.error('[FilePageWrapper] Some files failed to restore:', failures);
                }
                // Refetch to update the view
                setTimeout(() => refetch(), 300);
            }).catch(err => {
                console.error('[FilePageWrapper] Restore operation failed:', err);
            });
            
            return;
        }
        
        // Handle deletePermanently action - works for both single and multiple files
        if (action === 'deletePermanently') {
            // Handle both single file and multiple files
            const filesToDelete = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
            
            // Permanently delete each file
            Promise.all(
                filesToDelete.map(file => filesContext.permanentlyDeleteFile(file.id))
            ).then(results => {
                const failures = results.filter(r => !r.success);
                if (failures.length > 0) {
                    console.error('[FilePageWrapper] Some files failed to permanently delete:', failures);
                }
                // Refetch to update the view
                setTimeout(() => refetch(), 300);
            }).catch(err => {
                console.error('[FilePageWrapper] Permanent delete operation failed:', err);
            });
            
            return;
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
            
            {/* File Type Filter - Show if enabled */}
            {showFilter && (
                <FileTypeFilter
                    selectedType={fileTypeFilter}
                    onFilterChange={setFileTypeFilter}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />
            )}
            
            <FileManager
                files={filteredFiles}
                pageContext={pageContext}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onFileClick={onFileClick || defaultFileClick}
                // Double-click should mirror the default open action (folders navigate, files preview)
                onFileDoubleClick={(file) => defaultAction('open', file)}
                onAction={onAction || defaultAction}
                isOwner={isOwner}
                permissionLevel={permissionLevel}
            />
            
            {/* InfoSidebar - Connected to FilesContext (SSOT) */}
            <InfoSidebar
                fileId={selectedFileId}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Move Modal */}
            <MoveModal
                isOpen={moveModalOpen}
                onClose={() => {
                    setMoveModalOpen(false);
                    // Refetch after move to update the view
                    setTimeout(() => refetch(), 300);
                }}
                targets={moveTargets}
                initialParentId={moveTargets[0]?.parentId || null}
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
                    key={previewFile.id}
                    fileId={previewFile.id}
                    fileName={previewFile.name}
                    permissionLevel={(() => {
                        // Determine permission level from file
                        let level;
                        if (previewFile.ownerId === user?.id) {
                            level = 'owner';
                        } else {
                            // For shared files, use sharedPermissionLevel or permissionLevel
                            level = previewFile.sharedPermissionLevel?.toLowerCase() 
                                || previewFile.permissionLevel?.toLowerCase() 
                                || permissionLevel?.toLowerCase() 
                                || 'viewer';
                        }
                        
                        return level;
                    })()}
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
            
            {/* Share Modal */}
            {shareFile_modal && (
                <ShareModal
                    file={shareFile_modal}
                    onShare={(fileId, userId, permissionLevel) => {
                        // Optionally refetch to show updated permissions
                        // Note: We don't refetch here as the modal shows success message
                    }}
                    onClose={() => {
                        setShareFile_modal(null);
                    }}
                />
            )}
        </div>
    );
}

export default FilePageWrapper;
