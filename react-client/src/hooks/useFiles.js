import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { filesApi } from '../services/api';
import { getFilterHeaders, getDefaultFilters } from '../utils/filterUtils';

/**
 * Unified hook for fetching files from different OverDrive endpoints
 * Provides scalable filtering architecture that works across all sidebar pages
 * 
 * @param {string} endpoint - API endpoint type: 'mydrive', 'shared', 'recent', 'trash', 'starred'
 * @param {Object} initialFilters - Optional initial filter state
 * @returns {Object} - { files, loading, error, refetch, filters, setFilters, clearFilters }
 */
export const useFiles = (endpoint, initialFilters = null) => {
    const { token } = useAuth();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState(
        initialFilters || getDefaultFilters(endpoint)
    );

    /**
     * Fetches files from the appropriate API endpoint with current filters
     */
    const fetchFiles = useCallback(async () => {
        if (!token) {
            setFiles([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let result;
            const filterHeaders = getFilterHeaders(filters);

            switch (endpoint) {
                case 'mydrive':
                    result = await filesApi.getFiles(token, { headers: filterHeaders });
                    break;

                case 'shared':
                    result = await filesApi.getSharedFiles(token, { headers: filterHeaders });
                    break;

                case 'recent':
                    result = await filesApi.getRecentFiles(token, { headers: filterHeaders });
                    break;

                case 'trash':
                    result = await filesApi.getTrashFiles(token, { headers: filterHeaders });
                    break;

                case 'starred':
                    result = await filesApi.getStarredFiles(token, { headers: filterHeaders });
                    break;

                default:
                    throw new Error(`Unknown endpoint: ${endpoint}`);
            }

            setFiles(result || []);
        } catch (err) {
            console.error(`Failed to fetch ${endpoint} files:`, err);
            setError(err.message || `Failed to load ${endpoint} files`);
            setFiles([]);
        } finally {
            setLoading(false);
        }
    }, [token, endpoint, filters]);

    /**
     * Fetch files on mount and when dependencies change
     */
    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    /**
     * Listen for file updates from other components (e.g., NewButton, file operations)
     */
    useEffect(() => {
        const handleFilesUpdated = () => {
            fetchFiles();
        };

        window.addEventListener('files-updated', handleFilesUpdated);
        return () => window.removeEventListener('files-updated', handleFilesUpdated);
    }, [fetchFiles]);

    /**
     * Update filters and trigger refetch
     */
    const updateFilters = useCallback((newFilters) => {
        setFilters(prevFilters => ({
            ...prevFilters,
            ...newFilters
        }));
    }, []);

    /**
     * Clear all filters to defaults
     */
    const resetFilters = useCallback(() => {
        setFilters(getDefaultFilters(endpoint));
    }, [endpoint]);

    return {
        files,
        loading,
        error,
        refetch: fetchFiles,
        filters,
        setFilters: updateFilters,
        clearFilters: resetFilters
    };
};

export default useFiles;
