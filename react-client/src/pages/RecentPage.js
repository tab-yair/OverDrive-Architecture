import React, { useEffect } from 'react';
import { FilePageWrapper } from '../components/FilePageWrapper';
import { useNavigation } from '../context/NavigationContext';
import './Pages.css';

/**
 * RecentPage Component
 * Displays recently accessed files (no folders, sorted by last interaction)
 * Endpoint: GET /api/files/recent
 */
function RecentPage() {
    const { setCurrentFolderId } = useNavigation();
    
    // Reset current folder when entering Recent (root level)
    useEffect(() => {
        setCurrentFolderId(null);
    }, [setCurrentFolderId]);
    
    return (
        <FilePageWrapper
            endpoint="recent"
            pageContext="Recent"
            isOwner={false}
            permissionLevel="viewer"
            className="recent-page"
            loadingMessage="Loading recent files..."
        />
    );
}

export default RecentPage;
