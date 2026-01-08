import React from 'react';
import { FilePageWrapper } from '../components/FilePageWrapper';
import './Pages.css';

/**
 * SharedPage Component
 * Displays files shared with the current user by others
 * Endpoint: GET /api/files/shared
 */
function SharedPage() {
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
