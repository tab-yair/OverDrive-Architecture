import React, { useEffect } from 'react';
import { FilePageWrapper } from '../components/FilePageWrapper';
import { useNavigation } from '../context/NavigationContext';
import './Pages.css';

/**
 * SharedPage Component
 * Displays files/folders shared with the current user
 * Endpoint: GET /api/files/shared
 */
function SharedPage() {
    const { setCurrentFolderId } = useNavigation();
    
    // Reset current folder when entering Shared (root level)
    useEffect(() => {
        setCurrentFolderId(null);
    }, [setCurrentFolderId]);
    
    return (
        <FilePageWrapper
            endpoint="shared"
            pageContext="Shared"
            isOwner={false}
            permissionLevel="viewer"
            className="shared-page"
            loadingMessage="Loading shared files..."
        />
    );
}

export default SharedPage;
