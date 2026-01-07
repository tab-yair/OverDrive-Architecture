import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SettingsPage.css';
import './GetMoreStoragePage.css';

/**
 * GetMoreStoragePage Component
 * Humorous page for "upgrading" storage - a joke for the graders
 */
function GetMoreStoragePage() {
    const navigate = useNavigate();
    const [showToast, setShowToast] = useState(false);
    const [requestSent, setRequestSent] = useState(false);

    const handleRequestUpgrade = () => {
        setShowToast(true);
        setRequestSent(true);

        // Hide toast after 4 seconds
        setTimeout(() => setShowToast(false), 4000);
    };

    return (
        <div className="get-more-storage-page">
            {/* Header */}
            <div className="settings-header">
                <button
                    className="settings-back-btn"
                    onClick={() => navigate('/settings/general')}
                    aria-label="Go back"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="settings-title">Get More Storage</h1>
            </div>

            {/* Content */}
            <div className="get-more-storage-content">
                <div className="get-more-storage-card">
                    <div className="get-more-storage-icon">
                        <span className="material-symbols-outlined">cloud_upload</span>
                    </div>

                    <h2 className="get-more-storage-heading">Want More Storage?</h2>

                    <p className="get-more-storage-joke">
                        Give us <strong>100</strong> on this assignment and we'll upgrade you to
                        <span className="unlimited-badge">UNLIMITED</span> storage!
                    </p>

                    <div className="get-more-storage-features">
                        <div className="feature-item">
                            <span className="material-symbols-outlined">check_circle</span>
                            <span>Unlimited cloud storage</span>
                        </div>
                        <div className="feature-item">
                            <span className="material-symbols-outlined">check_circle</span>
                            <span>Priority support from the dev team</span>
                        </div>
                        <div className="feature-item">
                            <span className="material-symbols-outlined">check_circle</span>
                            <span>Eternal gratitude</span>
                        </div>
                    </div>

                    <button
                        className={`btn btn-primary btn-large get-more-storage-btn ${requestSent ? 'sent' : ''}`}
                        onClick={handleRequestUpgrade}
                        disabled={requestSent}
                    >
                        {requestSent ? (
                            <>
                                <span className="material-symbols-outlined">check</span>
                                Request Sent!
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">send</span>
                                Request Upgrade
                            </>
                        )}
                    </button>

                    <p className="get-more-storage-disclaimer">
                        * Offer valid only for graders who appreciate good code and even better jokes.
                    </p>
                </div>
            </div>

            {/* Toast notification */}
            {showToast && (
                <div className="toast-notification slide-in">
                    <span className="material-symbols-outlined">mail</span>
                    <span>Request sent to graders@university.edu!</span>
                </div>
            )}
        </div>
    );
}

export default GetMoreStoragePage;
