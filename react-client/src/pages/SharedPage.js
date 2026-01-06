import React from 'react';
import './Pages.css';

/**
 * SharedPage Component
 * Displays files shared with the current user by others
 */
function SharedPage() {
    return (
        <div className="page shared-page">
            <h1 className="page-title">Shared with me</h1>
            <p className="page-description">
                Files and folders that others have shared with you.
            </p>

            {/* TODO: Fetch and display shared files from /api/files/shared */}
            {/* TODO: Show who shared each file */}
            {/* TODO: Show share date */}

            <div className="page-placeholder">
                <span className="material-symbols-outlined page-placeholder-icon">
                    people
                </span>
                <p>Files shared with you will appear here</p>
            </div>
        </div>
    );
}

export default SharedPage;
