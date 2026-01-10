import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useNavigation } from '../../../context/NavigationContext';
import { filesApi } from '../../../services/api';
import { notifyFilesAndStorageUpdated } from '../../../utils/eventManager';
import './NewButton.css';

/**
 * NewButton Component
 * Dropdown menu for creating new files/folders and uploading
 * @param {string} parentId - Optional parent folder ID (null for root)
 */
function NewButton({ parentId = null }) {
    const { token } = useAuth();
    const { currentFolderId } = useNavigation();
    const location = useLocation();
    
    // Only use currentFolderId if we're actually in a folder page
    // Check if current route is /folders/:id
    const isInFolderPage = location.pathname.startsWith('/folders/');
    
    // Use currentFolderId from context ONLY if:
    // 1. No explicit parentId provided AND
    // 2. We're actually inside a folder page
    const effectiveParentId = parentId || (isInFolderPage ? currentFolderId : null);
    
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showNamePrompt, setShowNamePrompt] = useState(null); // 'folder' | 'file' | null
    const [newName, setNewName] = useState('');
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);
    const fileInputRef = useRef(null);
    const nameInputRef = useRef(null);

    // Close dropdown when clicking outside the button and dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            const clickedButton = buttonRef.current && buttonRef.current.contains(event.target);
            const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);

            // Close if clicked outside both the button and dropdown
            if (!clickedButton && !clickedDropdown) {
                setIsOpen(false);
                setShowNamePrompt(null);
                setNewName('');
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus name input when prompt opens
    useEffect(() => {
        if (showNamePrompt && nameInputRef.current) {
            nameInputRef.current.focus();
        }
    }, [showNamePrompt]);

    // Handle new folder click
    const handleNewFolderClick = () => {
        setShowNamePrompt('folder');
        setNewName('');
    };

    // Handle new text file click
    const handleNewFileClick = () => {
        setShowNamePrompt('file');
        setNewName('');
    };

    // Handle upload file click
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    // Handle file selection for upload
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !token) return;

        // Determine file type
        const isPdf = file.type === 'application/pdf';
        const isImage = file.type.startsWith('image/');
        const isTxt = file.name.endsWith('.txt') || file.type === 'text/plain';
        
        if (!isPdf && !isImage && !isTxt) {
            alert('Only PDF, image, or .txt files can be uploaded.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsLoading(true);
        try {
            let fileData;
            
            if (isTxt) {
                // For .txt files: Read as plain text and send as docs type
                const textContent = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsText(file); // Read as text (preserves \n)
                });
                
                fileData = {
                    name: file.name, // Keep original .txt extension
                    type: 'docs',
                    content: textContent // Plain text with newlines
                };
                
                // Add parentId if provided
                if (effectiveParentId) {
                    fileData.parentId = effectiveParentId;
                }
            } else {
                // For PDF/Image: Convert to Base64
                const base64Content = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                
                fileData = {
                    name: file.name, // Keep original extension (.pdf, .jpg, etc)
                    type: isPdf ? 'pdf' : 'image',
                    content: base64Content
                };
                
                // Add parentId if provided
                if (effectiveParentId) {
                    fileData.parentId = effectiveParentId;
                }
            }

            await filesApi.createFile(token, fileData);
            // Emit events so file lists and storage can refresh
            notifyFilesAndStorageUpdated();
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to upload file:', error);
            alert('Failed to upload file: ' + error.message);
        } finally {
            setIsLoading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Handle create folder/file
    const handleCreate = async () => {
        if (!newName.trim() || !token) return;

        setIsLoading(true);
        try {
            // Use name as-is - server uses type metadata, not extension
            const fileName = newName.trim();

            const data = {
                name: fileName,
                type: showNamePrompt === 'folder' ? 'folder' : 'docs'
            };

            // For docs files, include empty content
            if (showNamePrompt === 'file') {
                data.content = '';
            }
            
            // Add parentId if provided
            if (effectiveParentId) {
                data.parentId = effectiveParentId;
            }

            await filesApi.createFile(token, data);
            // Emit events so file lists and storage can refresh
            notifyFilesAndStorageUpdated();
            setIsOpen(false);
            setShowNamePrompt(null);
            setNewName('');
        } catch (error) {
            console.error('Failed to create:', error);
            alert('Failed to create: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Enter key in name input
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCreate();
        } else if (e.key === 'Escape') {
            setShowNamePrompt(null);
            setNewName('');
        }
    };

    return (
        <div className="new-button-container">
            <button
                ref={buttonRef}
                className="sidebar-new-btn"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Create new file or folder"
                aria-expanded={isOpen}
                disabled={isLoading}
            >
                {isLoading ? (
                    <span className="material-symbols-outlined spinning">progress_activity</span>
                ) : (
                    <span className="material-symbols-outlined">add</span>
                )}
                <span className="sidebar-new-btn-text">New</span>
            </button>

            {/* Hidden file input for uploads */}
            <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />

            {/* Dropdown menu */}
            {isOpen && (
                <div ref={dropdownRef} className="new-button-dropdown slide-in">
                    {showNamePrompt ? (
                        // Name prompt
                        <div className="new-button-prompt">
                            <label className="new-button-prompt-label">
                                {showNamePrompt === 'folder' ? 'Folder name' : 'File name'}
                            </label>
                            <input
                                ref={nameInputRef}
                                type="text"
                                className="new-button-prompt-input"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={showNamePrompt === 'folder' ? 'Untitled folder' : 'Untitled'}
                            />
                            <div className="new-button-prompt-actions">
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                        setShowNamePrompt(null);
                                        setNewName('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handleCreate}
                                    disabled={!newName.trim() || isLoading}
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Menu items
                        <>
                            <button className="new-button-item" onClick={handleNewFolderClick}>
                                <span className="material-symbols-outlined">create_new_folder</span>
                                <span>New folder</span>
                            </button>
                            <button className="new-button-item" onClick={handleNewFileClick}>
                                <span className="material-symbols-outlined">note_add</span>
                                <span>New text file</span>
                            </button>
                            <div className="new-button-divider" />
                            <button className="new-button-item" onClick={handleUploadClick}>
                                <span className="material-symbols-outlined">upload_file</span>
                                <span>Upload file</span>
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default NewButton;
