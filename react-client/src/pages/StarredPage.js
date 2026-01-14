import React, { useEffect } from 'react';
import { FilePageWrapper } from '../components/FilePageWrapper';
import { useNavigation } from '../context/NavigationContext';
import './Pages.css';

/**
 * StarredPage Component
 * Displays files starred by the current user
 * Endpoint: GET /api/files/starred
 */
function StarredPage() {
    const { setCurrentFolderId } = useNavigation();
    
    // Reset current folder when entering Starred (root level)
    useEffect(() => {
        setCurrentFolderId(null);
    }, [setCurrentFolderId]);
    
    return (
        <FilePageWrapper
            endpoint="starred"
            pageContext="Starred"
            isOwner={false}
            permissionLevel="viewer"
            className="starred-page"
            loadingMessage="Loading starred files..."
        />
    );
}

export default StarredPage;
