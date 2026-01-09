import React, { useEffect } from 'react';
import { FilePageWrapper } from '../components/FilePageWrapper';
import { useNavigation } from '../context/NavigationContext';
import './Pages.css';

/**
 * TrashPage Component
 * Displays deleted files that can be restored or permanently deleted
 * Endpoint: GET /api/files/trash
 */
function TrashPage() {
    const { setCurrentFolderId } = useNavigation();
    
    // Reset current folder when entering Trash (root level)
    useEffect(() => {
        setCurrentFolderId(null);
    }, [setCurrentFolderId]);
    
    return (
        <FilePageWrapper
            endpoint="trash"
            pageContext="Trash"
            isOwner={true}
            permissionLevel="owner"
            className="trash-page"
            loadingMessage="Loading trash..."
        />
    );
}

export default TrashPage;
