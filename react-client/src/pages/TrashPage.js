import React from 'react';
import { FilePageWrapper } from '../components/FilePageWrapper';
import './Pages.css';

/**
 * TrashPage Component
 * Displays deleted files that can be restored or permanently deleted
 * Endpoint: GET /api/files/trash
 */
function TrashPage() {
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
