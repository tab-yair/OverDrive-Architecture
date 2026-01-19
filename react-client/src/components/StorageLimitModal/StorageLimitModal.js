import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import './StorageLimitModal.css';

/**
 * StorageLimitModal Component
 * 
 * A modal that appears when a user exceeds their storage limit.
 * Shows the storage details and offers options to manage storage
 * or upgrade (placeholder for future functionality).
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {string} props.errorMessage - The storage limit error message from server
 * @param {string} props.operation - The operation that failed (e.g., 'upload', 'copy', 'create')
 */
const StorageLimitModal = ({ isOpen, onClose, errorMessage = '', operation = 'operation' }) => {
    const navigate = useNavigate();

    // Handle Escape key to close modal
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    // Parse storage details from error message
    // Format: "Storage limit exceeded. Available: X KB, Required: Y KB"
    const parseStorageDetails = (message) => {
        const availableMatch = message.match(/Available:\s*([\d.]+)\s*KB/i);
        const requiredMatch = message.match(/Required:\s*([\d.]+)\s*KB/i);
        
        return {
            available: availableMatch ? parseFloat(availableMatch[1]) : null,
            required: requiredMatch ? parseFloat(requiredMatch[1]) : null,
        };
    };

    const formatSize = (sizeInKB) => {
        if (sizeInKB === null) return 'Unknown';
        if (sizeInKB >= 1024) {
            return `${(sizeInKB / 1024).toFixed(2)} MB`;
        }
        return `${sizeInKB.toFixed(0)} KB`;
    };

    const storageDetails = parseStorageDetails(errorMessage);
    const shortfall = storageDetails.required !== null && storageDetails.available !== null
        ? storageDetails.required - storageDetails.available
        : null;

    const handleManageStorage = () => {
        onClose();
        navigate('/storage');
    };

    const handleOverlayClick = (e) => {
        // Only close if clicking directly on the overlay, not the modal content
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    // Render via portal to escape any parent transforms/stacking contexts
    return createPortal(
        <div className="storage-limit-modal-overlay" onClick={handleOverlayClick}>
            <div className="storage-limit-modal" role="dialog" aria-modal="true" aria-labelledby="storage-limit-title">
                {/* Header */}
                <div className="storage-limit-modal__header">
                    <div className="storage-limit-modal__icon-container">
                        <span className="material-symbols-outlined storage-limit-modal__icon">cloud_off</span>
                    </div>
                    <h2 id="storage-limit-title" className="storage-limit-modal__title">
                        Storage Limit Reached
                    </h2>
                    <button 
                        className="storage-limit-modal__close-btn"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Body */}
                <div className="storage-limit-modal__body">
                    <p className="storage-limit-modal__message">
                        Your {operation} couldn't be completed because you've reached your storage limit.
                    </p>

                    {/* Storage Details Card */}
                    {(storageDetails.available !== null || storageDetails.required !== null) && (
                        <div className="storage-limit-modal__details">
                            <div className="storage-detail-row">
                                <span className="storage-detail-label">Available Space:</span>
                                <span className="storage-detail-value available">
                                    {formatSize(storageDetails.available)}
                                </span>
                            </div>
                            <div className="storage-detail-row">
                                <span className="storage-detail-label">Space Required:</span>
                                <span className="storage-detail-value required">
                                    {formatSize(storageDetails.required)}
                                </span>
                            </div>
                            {shortfall !== null && shortfall > 0 && (
                                <div className="storage-detail-row shortfall">
                                    <span className="storage-detail-label">Need to Free:</span>
                                    <span className="storage-detail-value shortfall-value">
                                        {formatSize(shortfall)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <p className="storage-limit-modal__suggestion">
                        Free up space by deleting files from your Trash, or remove files you no longer need.
                    </p>
                </div>

                {/* Footer */}
                <div className="storage-limit-modal__footer">
                    <button 
                        className="storage-limit-modal__btn storage-limit-modal__btn--secondary"
                        onClick={onClose}
                    >
                        Close
                    </button>
                    <button 
                        className="storage-limit-modal__btn storage-limit-modal__btn--primary"
                        onClick={handleManageStorage}
                    >
                        <span className="material-symbols-outlined">storage</span>
                        Manage Storage
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default StorageLimitModal;
