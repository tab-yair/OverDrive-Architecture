import React from 'react';
import './MainContent.css';

/**
 * MainContent Component
 * Wrapper for the main content area
 * Provides consistent padding and styling for page content
 */
function MainContent({ children }) {
    return (
        <main className="main-content">
            <div className="main-content-inner">
                {children}
            </div>
        </main>
    );
}

export default MainContent;
