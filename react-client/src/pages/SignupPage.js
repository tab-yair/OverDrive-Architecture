import React from 'react';
import { Link } from 'react-router-dom';
import './Pages.css';

/**
 * SignupPage Component
 * Placeholder signup page - teammate will implement full functionality
 */
function SignupPage() {
    return (
        <div className="page signup-page">
            <div className="auth-container">
                <div className="auth-logo">
                    <span className="material-symbols-outlined">cloud</span>
                    <span>OverDrive</span>
                </div>

                <h1 className="auth-title">Create account</h1>
                <p className="auth-subtitle">to start using OverDrive</p>

                {/* Placeholder form - teammate will implement */}
                <div className="auth-placeholder">
                    <p>Signup form will be implemented by teammate</p>

                    {/* TODO: Add signup form with fields:
                        - Email
                        - Display name
                        - Password
                        - Confirm password
                    */}
                </div>

                <div className="auth-footer">
                    <span>Already have an account?</span>
                    <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}

export default SignupPage;
