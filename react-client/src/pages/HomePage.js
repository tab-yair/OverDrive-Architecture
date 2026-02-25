import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Pages.css';
import './HomePage.css';

/**
 * HomePage Component
 * Displays a welcome message and quick access links to key sections of the application.
 */
function HomePage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const firstName = user?.firstName || (user?.displayName ? user.displayName.split(' ')[0] : 'to OverDrive');

    return (
        <div className="page home-page">
            <header className="home-header-section">
                <h1 className="page-title">
                    Welcome, {firstName}
                </h1>
                <p className="page-description">
                    <h2>
                        Your unified workspace for every file.
                    </h2>
                    OverDrive provides a secure and intuitive environment to store, organize, and access your digital life. From personal documents to shared projects, everything you need is synchronized and ready when you are.
                </p>
            </header>

            {/* Quick Access Cards */}
            <div className="home-quick-actions">
                <div className="action-card" onClick={() => navigate('/mydrive')}>
                    <span className="material-symbols-outlined action-icon">folder_open</span>
                    <div className="action-info">
                        <h3>My Drive</h3>
                        <p>Go to your personal storage</p>
                    </div>
                </div>

                <div className="action-card" onClick={() => navigate('/recent')}>
                    <span className="material-symbols-outlined action-icon">schedule</span>
                    <div className="action-info">
                        <h3>Recent</h3>
                        <p>Resume your latest work</p>
                    </div>
                </div>

                <div className="action-card" onClick={() => navigate('/starred')}>
                    <span className="material-symbols-outlined action-icon">star</span>
                    <div className="action-info">
                        <h3>Starred</h3>
                        <p>Access important items</p>
                    </div>
                </div>
            </div>

            {/* Platform Features Section */}
            <div className="home-content-showcase">
                <div className="showcase-item">
                    <div className="showcase-text">
                        <h3>Organize with Ease</h3>
                        <p>
                            Create complex folder hierarchies and manage your files efficiently. 
                            Use the <strong>"New"</strong> button in the sidebar to upload documents, images, or PDFs and keep everything organized in one place.
                        </p>
                    </div>
                </div>

                <div className="showcase-divider"></div>

                <div className="showcase-item">
                    <div className="showcase-text">
                        <h3>Seamless Collaboration</h3>
                        <p>
                            Share folders and files with teammates instantly. Use the <strong>"Shared with me"</strong> section 
                            to access content others have contributed to your drive, ensuring smooth teamwork on every project.
                        </p>
                    </div>
                </div>

                <div className="showcase-divider"></div>

                <div className="showcase-item">
                    <div className="showcase-text">
                        <h3>Quick Access & Smart Search</h3>
                        <p>
                            Never lose a file again. Star your most important documents for instant retrieval, 
                            jump back into your flow with the <strong>"Recent"</strong> view, or use our global search to find exactly what you need.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HomePage;