import React from 'react';
import { FilePageWrapper } from '../components/FilePageWrapper';
import './Pages.css';

/**
 * RecentPage Component
 * Displays recently accessed files (last 20)
 * Endpoint: GET /api/files/recent
 */
function RecentPage() {
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
