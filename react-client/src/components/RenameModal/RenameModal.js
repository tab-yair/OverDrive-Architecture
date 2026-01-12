import React, { useState, useEffect, useRef } from 'react';
import './RenameModal.css';

/**
 * RenameModal Component
 * 
 * Modal dialog for renaming files and folders
 * Pre-fills input with current name, validates empty names
 * Supports Enter to submit, Escape to cancel
 * 
 * @param {Object} props
 * @param {Object} props.file - File object { id, name, type }
 * @param {Function} props.onRename - Callback when rename is submitted: (fileId, newName) => Promise
 * @param {Function} props.onClose - Callback to close the modal
 */
const RenameModal = ({ file, onRename, onClose }) => {
    const [newName, setNewName] = useState(file?.name || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    // Auto-focus input on mount and select all text
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && !isSubmitting) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isSubmitting, onClose]);

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const trimmedName = newName.trim();
        
        // Validation
        if (!trimmedName) {
            setError('Name cannot be empty');
            return;
        }

        if (trimmedName === file.name) {
            // No change, just close
            onClose();
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const result = await onRename(file.id, trimmedName);
            
            if (result.success) {
                onClose();
            } else {
                setError(result.error || 'Failed to rename');
            }
        } catch (err) {
            setError(err.message || 'Failed to rename');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
            onClose();
        }
    };

    if (!file) return null;

    return (
        <div className="rename-modal-overlay" onClick={handleOverlayClick}>
            <div className="rename-modal" onClick={(e) => e.stopPropagation()}>
                <div className="rename-modal__header">
                    <h3 className="rename-modal__title">
                        Rename {file.type === 'folder' ? 'Folder' : 'File'}
                    </h3>
                    <button
                        className="rename-modal__close-btn"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="rename-modal__form">
                    <div className="rename-modal__input-group">
                        <label htmlFor="rename-input" className="rename-modal__label">
                            New Name
                        </label>
                        <input
                            ref={inputRef}
                            id="rename-input"
                            type="text"
                            className="rename-modal__input"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            disabled={isSubmitting}
                            placeholder="Enter new name"
                        />
                    </div>

                    {error && (
                        <div className="rename-modal__error">
                            {error}
                        </div>
                    )}

                    <div className="rename-modal__actions">
                        <button
                            type="button"
                            className="rename-modal__btn rename-modal__btn--cancel"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rename-modal__btn rename-modal__btn--save"
                            disabled={isSubmitting || !newName.trim()}
                        >
                            {isSubmitting ? 'Renaming...' : 'Rename'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RenameModal;
