import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Show simple confirmation dialog for multiple downloads
 * Appears BEFORE any API calls to prevent browser download popups
 * 
 * @returns {Promise<boolean>} - User's confirmation choice
 */
const showDownloadConfirmation = () => {
    return new Promise((resolve) => {
        const message = 'This download may contain multiple files.\n\nDo you want to continue?';
        const confirmed = window.confirm(message);
        resolve(confirmed);
    });
};

/**
 * Show detailed file list confirmation (after folders are expanded)
 * Only shown if user wants to see the complete list
 * 
 * @param {Array} files - Array of file objects to download
 * @returns {Promise<boolean>} - Always returns true (already confirmed)
 */
const showDetailedFileList = (files) => {
    // For now, just log to console. User already confirmed.
    console.log(`📋 Complete file list (${files.length} files):`);
    files.forEach(f => console.log(`  • ${f.displayPath || f.name} (${f.type})`));
    return Promise.resolve(true);
};

/**
 * Sanitize filename to prevent double extensions
 * Examples:
 * - sanitizeFilename('report.pdf', '.pdf') => 'report.pdf'
 * - sanitizeFilename('report', '.pdf') => 'report.pdf'
 * - sanitizeFilename('report.pdf.pdf', '.pdf') => 'report.pdf'
 * 
 * @param {string} logicalName - The logical name from file metadata
 * @param {string} extension - The expected extension (e.g., '.pdf', '.txt')
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(logicalName, extension) {
    if (!logicalName) return `file${extension}`;
    
    // Normalize extension to include dot
    const normalizedExt = extension.startsWith('.') ? extension : `.${extension}`;
    
    // Remove extension if it already exists at the end
    let baseName = logicalName;
    if (baseName.toLowerCase().endsWith(normalizedExt.toLowerCase())) {
        baseName = baseName.slice(0, -normalizedExt.length);
    }
    
    // Add the extension once
    return `${baseName}${normalizedExt}`;
}

/**
 * useDownload Hook
 * 
 * Provides a unified download utility for handling different file types:
 * - PDF & Images: Direct download with proper filename
 * - Text Files (.docs): Extract text content, create .txt blob
 * - Folders: Iterate through files and download each individually
 * 
 * Features:
 * - Prevents double extensions (e.g., report.pdf.pdf)
 * - Uses logical name from metadata
 * - Handles null/undefined content gracefully
 * - Supports folder downloads (loops through files)
 * - Shows single confirmation dialog for multiple downloads
 * 
 * @returns {Object} - { downloadFile, downloadMultiple, sanitizeFilename }
 */
export function useDownload() {
    const { token } = useAuth();

    /**
     * Fetch folder contents recursively and flatten into file list
     * 
     * @param {string} folderId - Folder ID
     * @param {string} folderPath - Current path for display
     * @returns {Promise<Array>} - Flattened array of files
     */
    const fetchFolderContentsRecursive = useCallback(async (folderId, folderPath = '') => {
        if (!token) return [];

        try {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
            const downloadUrl = `${apiUrl}/api/files/${folderId}/download`;

            const response = await fetch(downloadUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch folder: ${response.statusText}`);
            }

            const files = await response.json();
            
            if (!Array.isArray(files)) {
                return [];
            }

            // Add folder path to each file for display
            return files.map(file => ({
                ...file,
                displayPath: folderPath ? `${folderPath}/${file.name}` : file.name
            }));

        } catch (error) {
            console.error('Failed to fetch folder contents:', error);
            return [];
        }
    }, [token]);

    /**
     * Download a single file by type
     * 
     * @param {Object} file - File object with { id, name, type }
     * @param {number} delay - Optional delay before download (for multiple downloads)
     */
    const downloadSingleFile = useCallback(async (file, delay = 0) => {
        if (!token) {
            console.error('Download failed: Not authenticated');
            return;
        }

        // Add delay if specified (for folder downloads)
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        try {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
            const downloadUrl = `${apiUrl}/api/files/${file.id}/download`;

            // Handle based on file type
            if (file.type === 'docs') {
                // For text files: Fetch content and create .txt blob
                const response = await fetch(downloadUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`Download failed: ${response.statusText}`);
                }

                // Get the text content (server returns plain text for docs)
                const textContent = await response.text();
                
                // Handle null/undefined content - default to empty string
                const safeContent = (textContent === null || textContent === undefined || textContent === 'null') 
                    ? '' 
                    : textContent;

                // Create a blob from the text content
                const blob = new Blob([safeContent], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);

                // Create temporary download link with sanitized filename
                const link = document.createElement('a');
                link.href = url;
                link.download = sanitizeFilename(file.name, '.txt');
                document.body.appendChild(link);
                link.click();

                // Cleanup
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

            } else if (file.type === 'pdf' || file.type === 'image') {
                // For PDF & Images: Direct download
                // Server handles binary decoding and sets proper Content-Type
                
                // Create a temporary link to trigger download
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.target = '_blank'; // Open in new tab to avoid navigation
                
                // Set Authorization header via fetch, then create object URL
                const response = await fetch(downloadUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`Download failed: ${response.statusText}`);
                }

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                
                link.href = url;
                
                // Sanitize filename based on type
                const extension = file.type === 'pdf' ? '.pdf' : getImageExtension(file.name);
                link.download = sanitizeFilename(file.name, extension);
                
                document.body.appendChild(link);
                link.click();
                
                // Cleanup
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 100);

            } else {
                console.warn(`Unknown file type: ${file.type}`);
            }

        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }, [token]);

    /**
     * Bulk download - UNIFIED DOWNLOAD SYSTEM (Single Source of Truth)
     * 
     * ═══════════════════════════════════════════════════════════════════
     * ALL downloads (single file, folder, or multiple) go through here
     * ═══════════════════════════════════════════════════════════════════
     * 
     * Process Flow:
     * 1. SHOW CONFIRMATION: Simple warning for multiple files (if >1 item or folder)
     * 2. FLATTEN & BUILD LIST: Expand folders, collect all file IDs
     * 3. DEDUPLICATE: Remove duplicate IDs (same name = OK, same ID = NO)
     * 4. SMART EMPTY HANDLING: Ignore empty folders if other files exist
     * 5. EXECUTE DOWNLOAD: Sequential download with type-specific logic
     * 
     * Handles:
     * - Single file: No confirmation, direct download
     * - Single folder: Confirmation → flatten → download all
     * - Mixed selection: Confirmation → flatten all → download all
     * - Empty folders: Silently skip if other files exist
     * - Recursive folders: No duplicate confirmations
     * 
     * @param {Array} items - Array of file/folder objects
     */
    const downloadMultiple = useCallback(async (items) => {
        if (!Array.isArray(items) || items.length === 0) {
            console.warn('No items to download');
            return;
        }

        try {
            // ═══ STEP 0: SMART CONFIRMATION ═══
            // Only show if: multiple items OR any folder exists
            const hasFolder = items.some(item => item.type === 'folder');
            const needsConfirmation = items.length > 1 || hasFolder;
            
            if (needsConfirmation) {
                const confirmed = await showDownloadConfirmation();
                if (!confirmed) {
                    console.log('❌ Download cancelled by user');
                    return;
                }
            }
            
            console.log(`📦 Preparing download for ${items.length} selected item(s)...`);
            
            // ═══ STEP 1: FLATTEN & BUILD UNIFIED FILE LIST ═══
            const allFiles = [];
            const seenIds = new Set(); // Track file IDs ONLY (not names) to prevent duplicate IDs
                                       // NOTE: Multiple files with same name but different IDs are allowed!
            
            for (const item of items) {
                if (item.type === 'folder') {
                    // Recursively fetch folder contents (API returns flattened list)
                    console.log(`📁 Expanding folder: ${item.name}`);
                    const folderFiles = await fetchFolderContentsRecursive(item.id, item.name);
                    
                    // Add only files with unique IDs (same name with different ID is OK)
                    for (const file of folderFiles) {
                        if (!seenIds.has(file.id)) {
                            seenIds.add(file.id);
                            allFiles.push(file);
                        }
                    }
                    
                    // Log if folder was empty (but don't block - continue with other files)
                    if (folderFiles.length === 0) {
                        console.warn(`⚠️  Folder "${item.name}" is empty - skipping`);
                    }
                } else {
                    // Regular file - add if ID not already in list
                    if (!seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        allFiles.push({
                            ...item,
                            displayPath: item.name
                        });
                    }
                }
            }

            // ═══ STEP 2: SMART EMPTY HANDLING ═══
            if (allFiles.length === 0) {
                // Only show error if EVERYTHING is empty
                alert('No files to download (all folders are empty).');
                return;
            }
            // If some files exist, silently skip empty folders and continue

            console.log(`✅ Prepared ${allFiles.length} unique file(s) for download`);

            // ═══ STEP 3: EXECUTE SEQUENTIAL DOWNLOAD ═══
            console.log(`⬇️  Starting download of ${allFiles.length} file(s)...`);

            for (let i = 0; i < allFiles.length; i++) {
                const file = allFiles[i];
                
                try {
                    // Add delay between downloads to avoid browser blocking
                    if (i > 0) {
                        await new Promise(resolve => setTimeout(resolve, 400));
                    }
                    
                    // Use type-specific download logic (PDF/Image/Text)
                    await downloadSingleFile(file);
                    console.log(`  ✓ Downloaded ${i + 1}/${allFiles.length}: ${file.name}`);
                } catch (error) {
                    console.error(`  ✗ Failed to download: ${file.name}`, error);
                    // Continue with remaining files (don't stop on error)
                }
            }

            console.log(`🎉 Completed downloading ${allFiles.length} file(s)`);

        } catch (error) {
            console.error('❌ Download process failed:', error);
            alert('Failed to download files. Please try again.');
        }
    }, [fetchFolderContentsRecursive, downloadSingleFile]);

    /**
     * Main download function - handles both files and folders
     * Routes EVERYTHING through downloadMultiple for unified logic
     * 
     * @param {Object} file - File or folder object with { id, name, type }
     * @returns {Promise<void>}
     */
    const downloadFile = useCallback(async (file) => {
        if (!file || !file.id) {
            console.error('Invalid file object');
            return;
        }

        // Route all downloads through unified downloadMultiple logic
        await downloadMultiple([file]);
    }, [downloadMultiple]);

    return {
        downloadFile,
        downloadMultiple,
        sanitizeFilename,
    };
}

/**
 * Helper: Extract image extension from filename
 * 
 * @param {string} filename - Original filename
 * @returns {string} - Extension (e.g., '.jpg', '.png')
 */
function getImageExtension(filename) {
    if (!filename) return '.jpg';
    
    const match = filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
    if (match) {
        return `.${match[1].toLowerCase()}`;
    }
    
    return '.jpg'; // Default fallback
}

export default useDownload;
