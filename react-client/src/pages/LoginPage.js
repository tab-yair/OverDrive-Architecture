import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Pages.css';

/**
 * LoginPage Component
 * Placeholder login page - teammate will implement full functionality
 */
function LoginPage() {
    const { mockLogin } = useAuth();

    return (
        <div className="page login-page">
            <div className="auth-container">
                <div className="auth-logo">
                    <span className="material-symbols-outlined">cloud</span>
                    <span>OverDrive</span>
                </div>

                <h1 className="auth-title">Sign in</h1>
                <p className="auth-subtitle">to continue to OverDrive</p>

                {/* Placeholder form - teammate will implement */}
                <div className="auth-placeholder">
                    <p>Login form will be implemented by teammate</p>

                    {/* Temporary mock login for development */}
                    <button
                        className="btn btn-primary auth-btn"
                        onClick={mockLogin}
                    >
                        Mock Login (Development)
                    </button>
                </div>

                <div className="auth-footer">
                    <span>Don't have an account?</span>
                    <Link to="/signup">Create account</Link>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
