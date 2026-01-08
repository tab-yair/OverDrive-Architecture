import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo/Logo';
import './Pages.css';

/**
 * GuestLandingPage Component
 * Landing page shown to non-authenticated users
 */
function GuestLandingPage() {
    return (
        <div className="page guest-landing-page">
            <div className="landing-hero">
                <div className="landing-icon">
                    <Logo size="xl" showText={false} />
                </div>

                <h1 className="landing-title">
                    Welcome to <Logo size="lg" />
                </h1>
                <p className="landing-subtitle">
                    Secure cloud storage for all your files. Access them anywhere, anytime.
                </p>

                <div className="landing-actions">
                    <Link to="/login" className="btn btn-primary btn-large">
                        <span className="material-symbols-outlined">login</span>
                        Sign In
                    </Link>
                    <Link to="/signup" className="btn btn-secondary btn-large">
                        <span className="material-symbols-outlined">person_add</span>
                        Create Account
                    </Link>
                </div>

                <div className="landing-features">
                    <div className="landing-feature">
                        <span className="material-symbols-outlined">security</span>
                        <h3>Secure</h3>
                        <p>Your files are protected with enterprise-grade security</p>
                    </div>
                    <div className="landing-feature">
                        <span className="material-symbols-outlined">share</span>
                        <h3>Share</h3>
                        <p>Easily share files and collaborate with others</p>
                    </div>
                    <div className="landing-feature">
                        <span className="material-symbols-outlined">devices</span>
                        <h3>Access Anywhere</h3>
                        <p>Access your files from any device, anywhere</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GuestLandingPage;
