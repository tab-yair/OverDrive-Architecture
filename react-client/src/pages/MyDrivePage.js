import React from 'react';
import { FilePageWrapper } from '../components/FilePageWrapper';
import './Pages.css';

/**
 * MyDrivePage Component
 * Displays user's personal files and folders (owned items only)
 * Endpoint: GET /api/files with x-filter-ownership: owned
 */
function MyDrivePage() {
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
