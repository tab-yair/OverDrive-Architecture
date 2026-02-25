import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFilesContext } from '../context/FilesContext';
import { getFilterHeaders, getDefaultFilters } from '../utils/filterUtils';

/**
 * Hook for accessing files from the SSOT (FilesContext)
 * Provides scalable filtering architecture that works across all sidebar pages
 * 
 * This hook:
 * 1. Fetches data from centralized FilesContext (SSOT)
 * 2. Applies header-based filtering
 * 3. Returns synchronized data that updates across all components
 * 4. Distinguishes between metadata display and content interaction
 * 
 * @param {string} endpoint - API endpoint type: 'mydrive', 'shared', 'recent', 'trash', 'starred'
 * @param {Object} initialFilters - Optional initial filter state
 * @returns {Object} - { files, loading, error, refetch, filters, setFilters, clearFilters }
 */
export const useFiles = (endpoint, initialFilters = null) => {
    const { user } = useAuth();
    const {
        filesMap,
        loadedEndpoints,
        loading: ctxLoading,
        errors: ctxErrors,
        fetchFiles: ctxFetchFiles,
        getFilesFromStore,
        invalidateEndpoint,
    } = useFilesContext();
    const [files, setFiles] = useState([]);
    const [filters, setFilters] = useState(
        initialFilters || getDefaultFilters(endpoint)
    );

    const cacheKey = `${endpoint}:${JSON.stringify(filters)}`;
    const loading = ctxLoading[cacheKey] || false;
    const error = ctxErrors[cacheKey] || null;

    /**
     * Fetch files from context and update local state
     */
    const fetchFiles = useCallback(async () => {
        const filterHeaders = getFilterHeaders(filters);
        await ctxFetchFiles(endpoint, { headers: filterHeaders });
        const storeFiles = getFilesFromStore(endpoint);
        setFiles(storeFiles);
    }, [ctxFetchFiles, getFilesFromStore, endpoint, filters]);

    /**
     * Fetch on mount and when dependencies change
     * Force refetch when user changes or endpoint invalidated
     */
    useEffect(() => {
        if (!user?.id) {
            setFiles([]);
            return;
        }

        const isLoaded = loadedEndpoints.has(endpoint);
        if (!isLoaded) {
            fetchFiles();
        } else {
            setFiles(getFilesFromStore(endpoint));
        }
    // loadedEndpoints reference changes when an endpoint is added/removed (new Set)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, endpoint, loadedEndpoints]);

    /**
     * Subscribe to filesMap updates to get new data immediately
     */
    useEffect(() => {
        if (loadedEndpoints.has(endpoint)) {
            setFiles(getFilesFromStore(endpoint));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filesMap, endpoint]);

    /**
     * Update filters and trigger refetch
     */
    const updateFilters = useCallback((newFilters) => {
        setFilters(prevFilters => ({
            ...prevFilters,
            ...newFilters
        }));
        invalidateEndpoint(endpoint);
    }, [invalidateEndpoint, endpoint]);

    /**
     * Clear all filters to defaults
     */
    const resetFilters = useCallback(() => {
        setFilters(getDefaultFilters(endpoint));
        invalidateEndpoint(endpoint);
    }, [endpoint, invalidateEndpoint]);

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