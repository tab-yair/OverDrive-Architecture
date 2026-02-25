import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useFilesContext } from '../context/FilesContext';
import { useStorageError } from '../context/StorageErrorContext';
import { useUserChange } from '../hooks/useUserChange';
import { useAppEvent } from '../hooks/useAppEvent';
import { AppEvents } from '../utils/eventManager';
import { formatBytes } from '../services/api';
import { FileManager, InfoSidebar, MoveModal } from '../components/FileManagement';
import { useNavigation } from '../context/NavigationContext';
import { useDownload } from '../hooks/useDownload';
import { useRename } from '../hooks/useRename';
import PreviewModal from '../components/PreviewModal/PreviewModal';
import TextDocumentViewer from '../components/TextDocumentViewer/TextDocumentViewer';
import RenameModal from '../components/RenameModal/RenameModal';
import ShareModal from '../components/ShareModal/ShareModal';
import './Pages.css';
import './StoragePage.css';

/**
 * StoragePage Component
 * Shows storage usage and files sorted by size
 */
function StoragePage() {
    const { token, user } = useAuth();
    const { storageInfo, storageLoading } = useUserPreferences();
    const filesContext = useFilesContext();
    const { showStorageLimitError } = useStorageError();
    const { handleOpen } = useNavigation();
    const { downloadFile, downloadMultiple } = useDownload();
    const { renameFile } = useRename();

    const [files, setFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false); // Background refetch indicator
    const [error, setError] = useState(null);
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' = largest first, 'asc' = smallest first
    
    // Modal states
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const [renameFile_modal, setRenameFile_modal] = useState(null);
    const [shareFile_modal, setShareFile_modal] = useState(null);
    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [moveTargets, setMoveTargets] = useState([]);

    // Clear files when user changes
    useUserChange(() => {
        setFiles([]);
        setError(null);
    });

    // Fetch files sorted by size using new /api/files/owned endpoint
    // isBackgroundRefresh: if true, don't show loading spinner (stale-while-revalidate)
    const fetchFiles = useCallback(async (isBackgroundRefresh = false) => {
        if (!token) return;

        // Only show loading spinner on initial load, not background refreshes
        if (!isBackgroundRefresh || files.length === 0) {
            setFilesLoading(true);
        } else {
            setIsRefreshing(true);
        }
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
            setIsRefreshing(false);
        }
    }, [token, sortOrder, files.length]);

    // Fetch on mount and when token/user changes
    useEffect(() => {
        fetchFiles(false); // Initial load - show loading spinner
    }, [fetchFiles]);

    // Listen for files updated events (file upload, delete, rename, etc.)
    useAppEvent(AppEvents.FILES_UPDATED, () => {
        fetchFiles(true); // Background refresh - keep existing data visible
    }, [fetchFiles]);

    // Listen for storage updated events (file upload/delete that affects storage)
    useAppEvent(AppEvents.STORAGE_UPDATED, () => {
        fetchFiles(true); // Background refresh - keep existing data visible
    }, [fetchFiles]);

    // Toggle sort order
    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    // Handle file actions - comprehensive handler like FilePageWrapper
    const handleFileAction = (action, fileOrFiles) => {
        // Handle open action - folders navigate, files open in preview
        if (action === 'open') {
            const item = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
            if (item) {
                if (item.type === 'folder') {
                    handleOpen(item);
                } else {
                    // Open in preview modal
                    setPreviewFile(item);
                }
            }
            return;
        }
        
        // Handle details action - open InfoSidebar
        if (action === 'details') {
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
            if (Array.isArray(fileOrFiles)) {
                if (fileOrFiles.length > 0) {
                    downloadMultiple(fileOrFiles).catch(err => {
                        console.error('Download failed:', err);
                    });
                }
            } else if (fileOrFiles) {
                downloadFile(fileOrFiles).catch(err => {
                    console.error('Download failed:', err);
                });
            }
            return;
        }

        // Handle copy action (files only)
        if (action === 'copy') {
            const filesToCopy = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
            const validFiles = filesToCopy.filter(item => item && item.type !== 'folder');

            if (validFiles.length === 0) {
                console.warn('No valid files to copy');
                return;
            }

            Promise.all(
                validFiles.map(item => 
                    filesContext.copyFile(item.id, { parentId: item.parentId || null })
                )
            ).then((results) => {
                const failures = results.filter(r => !r.success);
                if (failures.length > 0) {
                    const storageLimitError = failures.find(r => r.isStorageLimitError);
                    if (storageLimitError) {
                        showStorageLimitError(storageLimitError.error, 'copy');
                        return;
                    }
                    alert(failures[0].error || 'Copy failed');
                }
            }).catch((err) => {
                if (err?.isStorageLimitError) {
                    showStorageLimitError(err?.message, 'copy');
                    return;
                }
                alert(err?.message || 'Copy failed');
            });
            return;
        }
        
        // Handle rename action - only for single file
        if (action === 'rename') {
            const file = Array.isArray(fileOrFiles) 
                ? (fileOrFiles.length === 1 ? fileOrFiles[0] : null)
                : fileOrFiles;
            
            if (file) {
                setRenameFile_modal(file);
            }
            return;
        }
        
        // Handle share action
        if (action === 'share') {
            const filesToShare = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
            if (filesToShare.length > 0) {
                setShareFile_modal(filesToShare[0]);
            }
            return;
        }
        
        // Handle star/unstar action
        if (action === 'star' || action === 'unstar') {
            const filesToToggle = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
            Promise.all(
                filesToToggle.map(file => filesContext.toggleStar(file.id))
            ).catch(err => {
                console.error('Star toggle failed:', err);
            });
            return;
        }
        
        // Handle trash action
        if (action === 'trash') {
            const filesToTrash = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
            Promise.all(
                filesToTrash.map(file => filesContext.deleteFile(file.id))
            ).catch(err => {
                console.error('Trash operation failed:', err);
            });
            return;
        }

        // Handle move action
        if (action === 'move') {
            const filesToMove = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
            const validTargets = filesToMove.filter(Boolean);
            if (validTargets.length === 0) return;
            setMoveTargets(validTargets);
            setMoveModalOpen(true);
            return;
        }
    };

    // Handle double-click - open file/folder
    const handleFileDoubleClick = (file) => {
        if (file.type === 'folder') {
            handleOpen(file);
        } else {
            setPreviewFile(file);
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
            
            {/* InfoSidebar */}
            <InfoSidebar
                fileId={selectedFileId}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Move Modal */}
            <MoveModal
                isOpen={moveModalOpen}
                onClose={() => setMoveModalOpen(false)}
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
                    permissionLevel={previewFile.ownerId === user?.id ? 'owner' : 'viewer'}
                    onClose={() => setPreviewFile(null)}
                />
            )}
            
            {/* Rename Modal */}
            {renameFile_modal && (
                <RenameModal
                    file={renameFile_modal}
                    onRename={renameFile}
                    onClose={() => setRenameFile_modal(null)}
                />
            )}
            
            {/* Share Modal */}
            {shareFile_modal && (
                <ShareModal
                    file={shareFile_modal}
                    onClose={() => setShareFile_modal(null)}
                />
            )}
        </div>
    );
}

export default StoragePage;
