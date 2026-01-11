import React, { useState, useEffect } from 'react';
import './PreviewModal.css';

// Base URL for API - same as in api.js
const API_BASE_URL = 'http://localhost:3000';

const PreviewModal = ({ item, onClose }) => {
    const [fileUrl, setFileUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!item) return;

        const loadFile = async () => {
            setLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Not authenticated');
                }

                // Use the existing /download endpoint which returns binary data
                const response = await fetch(`${API_BASE_URL}/api/files/${item.id}/download`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to load file: ${response.statusText}`);
                }

                // Get the file as a Blob
                const blob = await response.blob();
                
                // Create a URL for the blob
                const url = URL.createObjectURL(blob);
                setFileUrl(url);
                setLoading(false);
            } catch (err) {
                console.error('Failed to load file:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        loadFile();

        // Cleanup: revoke the object URL when component unmounts
        return () => {
            if (fileUrl) {
                URL.revokeObjectURL(fileUrl);
            }
        };
    }, [item]);

    // Close on ESC key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!item) return null;

    const handleDownload = () => {
        if (fileUrl) {
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = item.name;
            link.click();
        }
    };

    return (
        <div className="preview-modal-overlay" onClick={onClose}>
            <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="preview-modal-header">
                    <h2>{item.name}</h2>
                    <div className="preview-modal-actions">
                        {fileUrl && (
                            <button 
                                className="preview-download-btn"
                                onClick={handleDownload}
                                title="Download"
                            >
                                <i className="fas fa-download"></i>
                            </button>
                        )}
                        <button 
                            className="preview-close-btn"
                            onClick={onClose}
                            title="Close (ESC)"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div className="preview-modal-body">
                    {loading && (
                        <div className="preview-loading">
                            <div className="preview-spinner"></div>
                            <p>Loading preview...</p>
                        </div>
                    )}

                    {error && (
                        <div className="preview-error">
                            <i className="fas fa-exclamation-triangle"></i>
                            <p>Failed to load preview</p>
                            <small>{error}</small>
                        </div>
                    )}

                    {fileUrl && !loading && !error && (
                        <>
                            {item.type === 'pdf' && (
                                <iframe
                                    src={fileUrl}
                                    className="preview-iframe"
                                    title={item.name}
                                />
                            )}
                            {item.type === 'image' && (
                                <img
                                    src={fileUrl}
                                    alt={item.name}
                                    className="preview-image"
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;
