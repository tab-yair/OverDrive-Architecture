import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userApi, filesApi } from '../../services/api';
import './ShareModal.css';

/**
 * ShareModal Component
 * 
 * Modal dialog for sharing files/folders with other users
 * - User enters email address
 * - System resolves email to user ID
 * - User selects permission level (Viewer, Editor, Owner)
 * - For Owner: Creates permission via POST then transfers via PATCH
 * - For Viewer/Editor: Creates permission via POST
 * 
 * @param {Object} props
 * @param {Object} props.file - File object { id, name, type }
 * @param {Function} props.onShare - Callback when share is successful: (fileId, userId, permissionLevel) => void
 * @param {Function} props.onClose - Callback to close the modal
 */
const ShareModal = ({ file, onShare, onClose }) => {
    const { token, user: currentUser } = useAuth();
    const [email, setEmail] = useState('');
    const [permissionLevel, setPermissionLevel] = useState('VIEWER');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const inputRef = useRef(null);

    // Auto-focus email input on mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
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

    // Validate email format (Gmail only)
    const validateEmail = (email) => {
        const trimmed = email.trim().toLowerCase();
        
        // Check if it's a valid email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            return { valid: false, error: 'Invalid email format' };
        }

        // Check if it's Gmail (per system requirements)
        if (!trimmed.endsWith('@gmail.com')) {
            return { valid: false, error: 'Only Gmail addresses are supported' };
        }

        return { valid: true, normalizedEmail: trimmed };
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        const validation = validateEmail(email);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        // Don't allow sharing with self
        if (currentUser && validation.normalizedEmail === currentUser.username?.toLowerCase()) {
            setError('Cannot share with yourself');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Step 1: Resolve email to user ID
            const targetUser = await userApi.searchUserByEmail(token, validation.normalizedEmail);
            
            if (!targetUser || !targetUser.id) {
                setError('User not found');
                setIsSubmitting(false);
                return;
            }

            // Step 2: Handle permission based on level
            if (permissionLevel === 'OWNER') {
                // OWNER cannot be granted via POST - we need to:
                // 1. First create a permission (EDITOR or VIEWER)
                // 2. Then transfer ownership via PATCH
                
                // Create initial permission as EDITOR
                const permissionResult = await filesApi.grantPermission(
                    token,
                    file.id,
                    targetUser.id,
                    'EDITOR'
                );

                if (!permissionResult.success || !permissionResult.id) {
                    throw new Error('Failed to create permission for ownership transfer');
                }

                // Transfer ownership via PATCH
                await filesApi.updatePermission(
                    token,
                    file.id,
                    permissionResult.id,
                    'OWNER'
                );

                setSuccessMessage(`Ownership transferred to ${targetUser.firstName} ${targetUser.lastName || ''}`);
            } else {
                // VIEWER or EDITOR: Create permission via POST
                await filesApi.grantPermission(
                    token,
                    file.id,
                    targetUser.id,
                    permissionLevel
                );

                const levelText = permissionLevel === 'EDITOR' ? 'Editor' : 'Viewer';
                setSuccessMessage(`Shared with ${targetUser.firstName} ${targetUser.lastName || ''} as ${levelText}`);
            }

            // Notify parent component
            if (onShare) {
                onShare(file.id, targetUser.id, permissionLevel);
            }

            // Clear form
            setEmail('');
            setPermissionLevel('VIEWER');

            // Close modal after short delay to show success message
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (err) {
            console.error('Share error:', err);
            setError(err.message || 'Failed to share file');
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
        <div className="share-modal-overlay" onClick={handleOverlayClick}>
            <div className="share-modal" onClick={(e) => e.stopPropagation()}>
                <div className="share-modal__header">
                    <h3 className="share-modal__title">
                        Share "{file.name}"
                    </h3>
                    <button
                        className="share-modal__close-btn"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="share-modal__form">
                    <div className="share-modal__input-group">
                        <label htmlFor="email-input" className="share-modal__label">
                            Email Address
                        </label>
                        <input
                            ref={inputRef}
                            id="email-input"
                            type="email"
                            className="share-modal__input"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setError(null);
                            }}
                            disabled={isSubmitting}
                            placeholder="user@gmail.com"
                        />
                    </div>

                    <div className="share-modal__input-group">
                        <label htmlFor="permission-select" className="share-modal__label">
                            Permission Level
                        </label>
                        <select
                            id="permission-select"
                            className="share-modal__select"
                            value={permissionLevel}
                            onChange={(e) => setPermissionLevel(e.target.value)}
                            disabled={isSubmitting}
                        >
                            <option value="VIEWER">Viewer (Can view only)</option>
                            <option value="EDITOR">Editor (Can edit and share)</option>
                        </select>
                    </div>

                    {error && (
                        <div className="share-modal__error">
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="share-modal__success">
                            ✓ {successMessage}
                        </div>
                    )}

                    <div className="share-modal__actions">
                        <button
                            type="button"
                            className="share-modal__btn share-modal__btn--cancel"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="share-modal__btn share-modal__btn--share"
                            disabled={isSubmitting || !email.trim()}
                        >
                            {isSubmitting ? 'Sharing...' : 'Share'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ShareModal;
