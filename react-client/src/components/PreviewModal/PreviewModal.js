import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFilesContext } from '../../context/FilesContext';
import './PreviewModal.css';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const PreviewModal = ({ fileId, fileName, fileType, onClose }) => {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [zoom, setZoom] = useState(100);
    const iframeRef = useRef(null);
    const imageContainerRef = useRef(null);
    
    const { fetchFileContent } = useFilesContext();
    
    const isImage = fileType === 'image';

    useEffect(() => {
        const fetchFile = async () => {
            setLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem('token');
                
                // IMPORTANT: Trigger VIEW interaction and update FilesContext
                // This updates lastViewedAt on server AND in local store
                await fetchFileContent(fileId);
                
                // Then download the file content for preview
                const response = await fetch(`http://localhost:3000/api/files/${fileId}/download`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
                }
                
                // Check file size
                const contentLength = response.headers.get('Content-Length');
                if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
                    throw new Error(`File is too large (${Math.round(parseInt(contentLength) / 1024 / 1024)}MB). We currently support files up to 50MB.`);
                }

                const blob = await response.blob();
                
                // Double-check blob size
                if (blob.size > MAX_FILE_SIZE) {
                    throw new Error(`File is too large (${Math.round(blob.size / 1024 / 1024)}MB). We currently support files up to 50MB.`);
                }
                
                const url = URL.createObjectURL(blob);
                setBlobUrl(url);
            } catch (err) {
                console.error('Failed to load file for preview:', err);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileId, fetchFileContent]);

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

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 25, 200));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 25, 50));
    };

    const handleZoomReset = () => {
        setZoom(100);
    };

    // Render via portal to escape any parent transforms/stacking contexts
    return createPortal(
        <div className="preview-modal-overlay" onClick={onClose}>
            <div className="preview-modal-header" onClick={(e) => e.stopPropagation()}>
                <h2 className="preview-modal-title" title={fileName}>{fileName}</h2>
                
                {/* Zoom controls for images */}
                {isImage && !loading && !error && (
                    <div className="preview-modal-zoom-controls">
                        <button 
                            className="preview-modal-zoom-btn" 
                            onClick={handleZoomOut}
                            disabled={zoom <= 50}
                            title="Zoom out"
                        >
                            <span className="material-symbols-outlined">zoom_out</span>
                        </button>
                        <span className="preview-modal-zoom-level">{zoom}%</span>
                        <button 
                            className="preview-modal-zoom-btn" 
                            onClick={handleZoomReset}
                            title="Reset zoom"
                        >
                            <span className="material-symbols-outlined">fit_screen</span>
                        </button>
                        <button 
                            className="preview-modal-zoom-btn" 
                            onClick={handleZoomIn}
                            disabled={zoom >= 200}
                            title="Zoom in"
                        >
                            <span className="material-symbols-outlined">zoom_in</span>
                        </button>
                    </div>
                )}
                
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
                    isImage ? (
                        <div 
                            ref={imageContainerRef}
                            className="preview-modal-image-container"
                            style={{ 
                                overflow: zoom > 100 ? 'auto' : 'hidden',
                                cursor: zoom > 100 ? 'grab' : 'default'
                            }}
                        >
                            <img 
                                src={blobUrl}
                                alt={fileName}
                                className="preview-modal-image"
                                style={{ 
                                    transform: `scale(${zoom / 100})`,
                                    transformOrigin: 'center center'
                                }}
                            />
                        </div>
                    ) : (
                        <iframe
                            ref={iframeRef}
                            src={blobUrl}
                            className="preview-modal-iframe"
                            title={fileName}
                        />
                    )
                )}
            </div>
        </div>,
        document.body
    );
};

export default PreviewModal;
