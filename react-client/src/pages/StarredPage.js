import React from 'react';
import './Pages.css';

/**
 * StarredPage Component
 * Displays files marked as starred/favorites
 */
function StarredPage() {
    return (
        <div className="page starred-page">
            <h1 className="page-title">Starred</h1>
            <p className="page-description">
                Files and folders you've marked as important.
            </p>

            {/* TODO: Fetch and display starred files from /api/files/starred */}
            {/* TODO: Allow unstarring from this view */}

            <div className="page-placeholder">
                <span className="material-symbols-outlined page-placeholder-icon">
                    star
                </span>
                <p>Starred files will appear here</p>
            </div>
        </div>
    );
}

export default StarredPage;
