import React from 'react';
import './Pages.css';

/**
 * MyDrivePage Component
 * Displays user's personal files and folders
 */
function MyDrivePage() {
    return (
        <div className="page mydrive-page">
            <h1 className="page-title">My Drive</h1>
            <p className="page-description">
                All your personal files and folders are stored here.
            </p>

            {/* TODO: Implement file/folder listing */}
            {/* TODO: Add file upload functionality */}
            {/* TODO: Add folder creation functionality */}
            {/* TODO: Add file/folder context menu */}

            <div className="page-placeholder">
                <span className="material-symbols-outlined page-placeholder-icon">
                    folder_open
                </span>
                <p>Your files and folders will appear here</p>
            </div>
        </div>
    );
}

export default MyDrivePage;
