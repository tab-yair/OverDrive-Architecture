import React, { useEffect } from 'react';
import { FilePageWrapper } from '../components/FilePageWrapper';
import { useNavigation } from '../context/NavigationContext';
import './Pages.css';

/**
 * MyDrivePage Component
 * Displays user's personal files and folders (owned items only)
 * Endpoint: GET /api/files with x-filter-ownership: owned
 */
function MyDrivePage() {
    const { setCurrentFolderId } = useNavigation();
    
    // Reset current folder when entering MyDrive (root level)
    useEffect(() => {
        setCurrentFolderId(null);
    }, [setCurrentFolderId]);
    
    return (
        <FilePageWrapper
            endpoint="mydrive"
            pageContext="MyDrive"
            isOwner={true}
            permissionLevel="owner"
            className="mydrive-page"
            loadingMessage="Loading your files..."
        />
    );
}

export default MyDrivePage;
