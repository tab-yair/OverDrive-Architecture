import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FilePageWrapper } from '../components/FilePageWrapper';
import { useNavigation } from '../context/NavigationContext';
import { useUserChange } from '../hooks/useUserChange';
import './Pages.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * SearchPage Component
 * Displays search results based on query and filters
 * Uses the same layout as Shared and Recent pages (flat list)
 */
function SearchPage() {
    const [searchParams] = useSearchParams();
    const { token } = useAuth();
    const { setCurrentFolderId } = useNavigation();
    
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Reset current folder when entering Search (root level)
    useEffect(() => {
        setCurrentFolderId(null);
    }, [setCurrentFolderId]);

    // Clear files when user changes
    useUserChange(() => {
        setFiles([]);
        setError(null);
    });

    /**
     * Perform search API call
     */
    const performSearch = useCallback(async () => {
        // Get query from URL params
        const query = searchParams.get('q');
        
        if (!query || !query.trim()) {
            // If no query, redirect to home or show empty state
            setFiles([]);
            setLoading(false);
            setSearchQuery('');
            return;
        }

        setSearchQuery(query);
        setLoading(true);
        setError(null);

        try {
            // Build headers from URL params
            const headers = {
                'Authorization': `Bearer ${token}`
            };

            // Map filter params to API headers
            const filterMappings = {
                'type': 'x-filter-type',
                'owner': 'x-filter-owner',
                'ownerEmail': 'x-filter-owner-email',
                'searchIn': 'x-search-in',
                'starred': 'x-filter-starred',
                'dateCategory': 'x-filter-date-category',
                'dateStart': 'x-filter-date-start',
                'dateEnd': 'x-filter-date-end',
                'sharedWith': 'x-filter-shared-with',
                'containsWords': 'x-filter-contains-words'
            };

            // Add filter headers if present in URL
            Object.entries(filterMappings).forEach(([paramName, headerName]) => {
                const value = searchParams.get(paramName);
                if (value) {
                    headers[headerName] = value;
                }
            });

            // Call search API
            const response = await fetch(`${API_BASE_URL}/api/search/${encodeURIComponent(query)}`, {
                headers
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();

            // Handle both array response and object with files property
            const resultsArray = Array.isArray(data) ? data : (data.files || []);

            // Transform data to match expected file format
            const transformedFiles = resultsArray.map(file => ({
                ...file,
                // Add location metadata for Recent-like display
                location: file.parentId ? {
                    parentId: file.parentId,
                    parentName: file.parentPath || 'Unknown',
                    isRoot: !file.parentId
                } : null
            }));

            setFiles(transformedFiles);
        } catch (err) {
            console.error('Search error:', err);
            setError(err.message);
            setFiles([]);
        } finally {
            setLoading(false);
        }
    }, [searchParams, token]);

    // Trigger search when URL params change
    useEffect(() => {
        performSearch();
    }, [performSearch]);

    // Handle case where there's no search query
    if (!searchQuery && !loading) {
        return (
            <div className="page search-page">
                <div className="page-placeholder">
                    <span className="material-symbols-outlined page-placeholder-icon">search</span>
                    <h2>Search OverDrive</h2>
                    <p>Enter a search query to find your files</p>
                </div>
            </div>
        );
    }

    // Handle errors
    if (error && !loading) {
        return (
            <div className="page search-page">
                <div className="page-header">
                    <h1 className="page-title">Search Results for "{searchQuery}"</h1>
                </div>
                <div className="page-placeholder">
                    <span className="material-symbols-outlined page-placeholder-icon" style={{ color: 'var(--error-color)' }}>
                        error
                    </span>
                    <h2>Search failed</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    // Custom header showing search query
    const SearchHeader = () => (
        <div className="search-page-header" style={{ 
            padding: '0 0 16px 0',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '16px'
        }}>
            <h1 className="page-title" style={{ fontSize: '20px', marginBottom: '4px' }}>
                Search Results for "{searchQuery}"
            </h1>
            <p className="page-description" style={{ marginBottom: 0 }}>
                {loading ? 'Searching...' : `${files.length} ${files.length === 1 ? 'result' : 'results'} found`}
            </p>
        </div>
    );

    // Show "No results" message if search completed with zero results
    if (!loading && searchQuery && files.length === 0) {
        return (
            <div className="page search-page">
                <SearchHeader />
                <div className="page-placeholder">
                    <span className="material-symbols-outlined page-placeholder-icon">search_off</span>
                    <h2>No results found</h2>
                    <p>Try different keywords or check your filters</p>
                </div>
            </div>
        );
    }

    return (
        <FilePageWrapper
            customFiles={files}
            customLoading={loading}
            customRefetch={performSearch}
            headerComponent={<SearchHeader />}
            pageContext="MyDrive"
            isOwner={false}
            permissionLevel="viewer"
            className="search-page"
            loadingMessage="Searching..."
        />
    );
}

export default SearchPage;
