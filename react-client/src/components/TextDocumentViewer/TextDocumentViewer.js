import React, { useState, useEffect } from 'react';
import { useFilesContext } from '../../context/FilesContext';
import { useDownload } from '../../hooks/useDownload';
import './TextDocumentViewer.css';

/**
 * TextDocumentViewer Component
 * 
 * Opens a modal for viewing and editing text documents (type === 'docs')
 * Supports:
 * - View-only mode for viewers (read-only textarea, disabled save button)
 * - Edit mode for editors/owners (editable textarea, active save button)
 * - Download as .txt file
 * - Global state updates via FilesContext
 * 
 * @param {Object} props
 * @param {string} props.fileId - ID of the document to view/edit
 * @param {string} props.fileName - Name of the file (for header and download)
 * @param {string} props.permissionLevel - User's permission: 'viewer', 'editor', 'owner'
 * @param {Function} props.onClose - Callback to close the modal
 */
const TextDocumentViewer = ({ fileId, fileName, permissionLevel = 'viewer', onClose }) => {
    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [wasSaved, setWasSaved] = useState(false); // Track if content was saved during this session
    
    const { fetchFileContent, updateFile, updateFilesInStore, filesMap } = useFilesContext();
    const { sanitizeFilename } = useDownload();
    
    // Determine if user can edit
    const canEdit = permissionLevel === 'owner' || permissionLevel === 'editor';

    // Fetch file content on mount
    useEffect(() => {
        const loadContent = async () => {
            setLoading(true);
            setError(null);

            try {
                // Use fetchFileContent to trigger VIEW interaction and update FilesContext
                const result = await fetchFileContent(fileId);
                
                if (result.error) {
                    throw new Error(result.error);
                }

                const fileContent = result.file?.content || '';
                setContent(fileContent);
                setOriginalContent(fileContent);
            } catch (err) {
                console.error('Failed to load document:', err);
                setError(err.message || 'Failed to load document');
            } finally {
                setLoading(false);
            }
        };

        if (fileId) {
            loadContent();
        }
    }, [fileId, fetchFileContent]);

    // Sync content from filesMap when file updates from server (after save)
    // CRITICAL FIX: Use filesMap.size as dependency instead of filesMap to prevent flickering
    // This prevents re-running when filesMap reference changes but size stays same
    const filesMapSize = filesMap.size;
    useEffect(() => {
        if (!hasUnsavedChanges && !loading && !saving) {
            const currentFile = filesMap.get(fileId);
            if (currentFile && currentFile.content !== undefined && currentFile.content !== originalContent) {
                console.log('[TextDocumentViewer] Syncing content from server:', currentFile.content);
                setContent(currentFile.content);
                setOriginalContent(currentFile.content);
            }
        }
    }, [filesMapSize, fileId, hasUnsavedChanges, loading, saving, originalContent, filesMap]);

    // Track changes
    useEffect(() => {
        setHasUnsavedChanges(content !== originalContent);
    }, [content, originalContent]);

    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (hasUnsavedChanges) {
                    const confirmClose = window.confirm(
                        'You have unsaved changes. Are you sure you want to close?'
                    );
                    if (confirmClose) {
                        handleClose();
                    }
                } else {
                    handleClose();
                }
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [hasUnsavedChanges]);

    // Handle save
    const handleSave = async () => {
        if (!canEdit || !hasUnsavedChanges) return;

        setSaving(true);
        setError(null);

        try {
            console.log('[TextDocumentViewer] Saving content...');
            // Update file content - this triggers EDIT interaction
            const result = await updateFile(fileId, { content });

            if (result.error) {
                throw new Error(result.error);
            }

            console.log('[TextDocumentViewer] Save successful');
            // Update originalContent to match saved content
            // This will set hasUnsavedChanges to false
            setOriginalContent(content);
            setWasSaved(true); // Mark that content was saved in this session

            // Note: FilesContext automatically updates global state
            // This will trigger re-renders in Recent and File List views
        } catch (err) {
            console.error('Failed to save document:', err);
            setError(err.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    // Handle download
    const handleDownload = () => {
        try {
            // Ensure content is a string (handle null/undefined as empty string)
            const textContent = (content === null || content === undefined) ? '' : String(content);
            // Create a blob from the current content
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            // Create temporary download link with sanitized filename
            const link = document.createElement('a');
            link.href = url;
            link.download = sanitizeFilename(fileName, '.txt');
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download document:', err);
            setError('Failed to download document');
        }
    };

    // Handle content change
    const handleContentChange = (e) => {
        if (canEdit) {
            setContent(e.target.value);
        }
    };

    // Handle overlay click (close modal)
    const handleOverlayClick = () => {
        if (hasUnsavedChanges) {
            const confirmClose = window.confirm(
                'You have unsaved changes. Are you sure you want to close?'
            );
            if (confirmClose) {
                handleClose();
            }
        } else {
            handleClose();
        }
    };

    // Handle close with optimistic update
    const handleClose = () => {
        console.log('[TextDocumentViewer] Closing with wasSaved:', wasSaved, 'hasUnsavedChanges:', hasUnsavedChanges);
        // Optimistic update: show the activity immediately
        const currentFile = filesMap.get(fileId);
        if (currentFile) {
            const now = new Date().toISOString();
            // If content was saved during this session, it's an EDIT
            // If there are unsaved changes, it's also an EDIT (but this shouldn't trigger close without confirmation)
            const isEdit = wasSaved || hasUnsavedChanges;
            const optimisticFile = {
                ...currentFile,
                lastViewedAt: now,
                lastInteractionType: isEdit ? 'EDIT' : 'VIEW',
                ...(isEdit && { lastEditedAt: now })
            };
            console.log('[TextDocumentViewer] Updating file with optimistic data:', {
                lastViewedAt: optimisticFile.lastViewedAt,
                lastInteractionType: optimisticFile.lastInteractionType,
                lastEditedAt: optimisticFile.lastEditedAt
            });
            updateFilesInStore([optimisticFile]);
        }
        
        onClose();
    };

    return (
        <div className="text-doc-overlay" onClick={handleOverlayClick}>
            <div className="text-doc-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="text-doc-header">
                    <h2 className="text-doc-title" title={fileName}>
                        {fileName}
                    </h2>
                    
                    <div className="text-doc-header-actions">
                        <button
                            className="text-doc-btn text-doc-btn-secondary"
                            onClick={handleDownload}
                            title="Download as .txt"
                        >
                            <span className="material-symbols-outlined">download</span>
                            Download
                        </button>
                        
                        <button
                            className="text-doc-close"
                            onClick={handleOverlayClick}
                            aria-label="Close"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="text-doc-content">
                    {loading && (
                        <div className="text-doc-loading">
                            <span className="material-symbols-outlined spinning">progress_activity</span>
                            <p>Loading document...</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-doc-error">
                            <span className="material-symbols-outlined">error</span>
                            <p>{error}</p>
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            <textarea
                                className="text-doc-textarea"
                                value={content}
                                onChange={handleContentChange}
                                readOnly={!canEdit}
                                placeholder={canEdit ? 'Start typing...' : 'This document is read-only'}
                            />
                            
                            {/* Footer with Save button */}
                            <div className="text-doc-footer">
                                <div className="text-doc-footer-info">
                                    {!canEdit && (
                                        <span className="text-doc-readonly-badge">
                                            <span className="material-symbols-outlined">visibility</span>
                                            View Only
                                        </span>
                                    )}
                                    {hasUnsavedChanges && canEdit && (
                                        <span className="text-doc-unsaved-indicator">
                                            Unsaved changes
                                        </span>
                                    )}
                                </div>
                                
                                <button
                                    className={`text-doc-btn text-doc-btn-primary ${!canEdit || !hasUnsavedChanges ? 'text-doc-btn-disabled' : ''}`}
                                    onClick={handleSave}
                                    disabled={!canEdit || !hasUnsavedChanges || saving}
                                >
                                    {saving ? (
                                        <>
                                            <span className="material-symbols-outlined spinning">progress_activity</span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined">save</span>
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TextDocumentViewer;
