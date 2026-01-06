import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Pages.css';

/**
 * HomePage Component
 * Main landing page shown after login
 * Will display recent files and quick access items
 */
function HomePage() {
    const { user } = useAuth();

    return (
        <div className="page home-page">
            <h1 className="page-title">
                Welcome{user?.displayName ? `, ${user.displayName}` : ' to OverDrive'}
            </h1>
            <p className="page-description">
                Your files will appear here. Use the sidebar to navigate to your Drive,
                view shared files, or access recent and starred items.
            </p>

            {/* TODO: Add recent files section */}
            {/* TODO: Add quick access section */}
            {/* TODO: Add suggested files section */}

            <div className="page-placeholder">
                <span className="material-symbols-outlined page-placeholder-icon">
                    cloud_upload
                </span>
                <p>Drop files here or use the "New" button to get started</p>
            </div>
        </div>
    );
}

export default HomePage;
