import React from 'react';
import './Pages.css';

/**
 * RecentPage Component
 * Displays recently accessed files
 */
function RecentPage() {
    return (
        <div className="page recent-page">
            <h1 className="page-title">Recent</h1>
            <p className="page-description">
                Files you've recently opened or modified.
            </p>

            {/* TODO: Fetch and display recent files from /api/files/recent */}
            {/* TODO: Show last accessed time */}
            {/* TODO: Group by date (Today, Yesterday, This week, etc.) */}

            <div className="page-placeholder">
                <span className="material-symbols-outlined page-placeholder-icon">
                    schedule
                </span>
                <p>Your recently accessed files will appear here</p>
            </div>
        </div>
    );
}

export default RecentPage;
