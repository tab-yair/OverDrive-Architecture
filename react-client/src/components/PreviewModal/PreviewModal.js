import React, { useState, useEffect, useRef } from 'react';
import './PreviewModal.css';

const PreviewModal = ({ fileId, fileName, fileType, onClose }) => {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const iframeRef = useRef(null);

    useEffect(() => {
        const fetchFile = async () => {
            setLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem('token');
                console.log('[DEBUG PreviewModal] Fetching file:', fileId);
                
                const response = await fetch(`http://localhost:3000/api/files/${fileId}/download`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                console.log('[DEBUG PreviewModal] Response:', {
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    contentType: response.headers.get('Content-Type'),
                    contentLength: response.headers.get('Content-Length')
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[DEBUG PreviewModal] Error response:', errorText);
                    throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
                }

                const blob = await response.blob();
                console.log('[DEBUG PreviewModal] Blob created:', {
                    size: blob.size,
                    type: blob.type
                });
                
                const url = URL.createObjectURL(blob);
                console.log('[DEBUG PreviewModal] Blob URL:', url);
                setBlobUrl(url);
            } catch (err) {
                console.error('[DEBUG PreviewModal] Error:', err);
                setError(err.message || 'Failed to load file');
            } finally {
                setLoading(false);
            }
        };

        if (fileId) {
            fetchFile();
        }

        // Cleanup blob URL on unmount
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [fileId]);

    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div className="preview-modal-overlay" onClick={onClose}>
            <div className="preview-modal-header" onClick={(e) => e.stopPropagation()}>
                <h2 className="preview-modal-title" title={fileName}>{fileName}</h2>
                <button 
                    className="preview-modal-close" 
                    onClick={onClose}
                    aria-label="Close preview"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
                {loading && (
                    <div className="preview-modal-loading">
                        <span className="material-symbols-outlined">progress_activity</span>
                        <p>Loading preview...</p>
                    </div>
                )}
                {error && (
                    <div className="preview-modal-error">
                        <span className="material-symbols-outlined">error</span>
                        <p>{error}</p>
                        <button className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                )}
                {!loading && !error && blobUrl && (
                    <iframe
                        ref={iframeRef}
                        src={blobUrl}
                        className="preview-modal-iframe"
                        title={fileName}
                    />
                )}
            </div>
        </div>
    );
};

export default PreviewModal;
