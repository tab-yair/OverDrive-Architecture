import React from 'react';
import { FilePageWrapper } from '../components/FilePageWrapper';
import './Pages.css';

/**
 * StarredPage Component
 * Displays files marked as starred/favorites
 * Endpoint: GET /api/files/starred
 */
function StarredPage() {
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
