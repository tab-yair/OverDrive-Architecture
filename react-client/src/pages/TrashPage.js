import React from 'react';
import './Pages.css';

/**
 * TrashPage Component
 * Displays deleted files that can be restored or permanently deleted
 */
function TrashPage() {
    return (
        <div className="page trash-page">
            <h1 className="page-title">Trash</h1>
            <p className="page-description">
                Items in trash will be automatically deleted after 30 days.
            </p>

            {/* TODO: Fetch and display trashed files */}
            {/* TODO: Add restore functionality */}
            {/* TODO: Add permanent delete functionality */}
            {/* TODO: Add "Empty trash" button */}

            <div className="page-placeholder">
                <span className="material-symbols-outlined page-placeholder-icon">
                    delete
                </span>
                <p>Deleted files will appear here</p>
            </div>
        </div>
    );
}

export default TrashPage;
