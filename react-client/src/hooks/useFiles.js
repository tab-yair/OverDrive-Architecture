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
    const filesContext = useFilesContext();
    const [files, setFiles] = useState([]);
    const [filters, setFilters] = useState(
        initialFilters || getDefaultFilters(endpoint)
    );

    const cacheKey = `${endpoint}:${JSON.stringify(filters)}`;
    const loading = filesContext.loading[cacheKey] || false;
    const error = filesContext.errors[cacheKey] || null;

    /**
     * Fetch files from context and update local state
     */
    const fetchFiles = useCallback(async () => {
        const filterHeaders = getFilterHeaders(filters);
        const { files: fetchedFiles } = await filesContext.fetchFiles(endpoint, { headers: filterHeaders });
        
        // Get files from store (synchronized with all components)
        const storeFiles = filesContext.getFilesFromStore(endpoint);
        setFiles(storeFiles);
    }, [filesContext, endpoint, filters]);

    /**
     * Fetch on mount and when dependencies change
     * Force refetch when user changes or endpoint invalidated
     */
    useEffect(() => {
        if (!user?.id) {
            // No user - clear files
            setFiles([]);
            return;
        }

        // Check if endpoint is loaded
        const isLoaded = filesContext.loadedEndpoints.has(endpoint);
        
        if (!isLoaded) {
            // Endpoint not loaded - fetch from server
            fetchFiles();
        } else {
            // Endpoint loaded - get from store
            const storeFiles = filesContext.getFilesFromStore(endpoint);
            setFiles(storeFiles);
        }
    }, [user?.id, endpoint, filesContext.loadedEndpoints, fetchFiles, filesContext]);

    /**
     * Subscribe to filesMap updates to get new data immediately
     * CRITICAL: Use filesMap.size as dependency to detect ANY changes to the Map
     */
    const filesMapSize = filesContext.filesMap.size;
    
    useEffect(() => {
        // Update files whenever filesMap changes
        if (filesContext.loadedEndpoints.has(endpoint)) {
            const storeFiles = filesContext.getFilesFromStore(endpoint);
            setFiles(storeFiles);
        }
    }, [filesMapSize, endpoint, filesContext]);

    /**
     * Update filters and trigger refetch
     */
    const updateFilters = useCallback((newFilters) => {
        setFilters(prevFilters => ({
            ...prevFilters,
            ...newFilters
        }));
        filesContext.invalidateEndpoint(endpoint);
    }, [filesContext, endpoint]);

    /**
     * Clear all filters to defaults
     */
    const resetFilters = useCallback(() => {
        setFilters(getDefaultFilters(endpoint));
        filesContext.invalidateEndpoint(endpoint);
    }, [endpoint, filesContext]);

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
