import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { filesApi } from '../../../services/api';
import './NewButton.css';

/**
 * NewButton Component
 * Dropdown menu for creating new files/folders and uploading
 */
function NewButton() {
    const { token } = useAuth();
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

        setIsLoading(true);
        try {
            await filesApi.uploadFile(token, file);
            // Emit event so file lists can refresh
            window.dispatchEvent(new CustomEvent('files-updated'));
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
            const data = {
                name: showNamePrompt === 'file' && !newName.includes('.')
                    ? `${newName.trim()}.txt`
                    : newName.trim(),
                type: showNamePrompt === 'folder' ? 'folder' : 'file'
            };

            if (showNamePrompt === 'file') {
                data.content = '';
            }

            await filesApi.createFile(token, data);
            // Emit event so file lists can refresh
            window.dispatchEvent(new CustomEvent('files-updated'));
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
                                placeholder={showNamePrompt === 'folder' ? 'Untitled folder' : 'Untitled.txt'}
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
