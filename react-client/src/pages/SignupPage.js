import { Link } from 'react-router-dom';
import Logo from '../components/Logo/Logo';
import './Auth.css';

/**
 * SignupPage Component
 */
function SignupPage() {
    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo-container">
                    <Logo size="md" />
                </div>

                <h1 className="auth-title">Create account</h1>
                <p className="auth-subtitle">to start using OverDrive</p>

                <div className="input-group">
                    <input type="text" placeholder="Full Name" />
                </div>
                <div className="input-group">
                    <input type="text" placeholder="Username" />
                </div>
                <div className="input-group">
                    <input type="password" placeholder="Password" />
                </div>
                <div className="input-group">
                    <input type="password" placeholder="Confirm Password" />
                </div>

                <div className="auth-footer">
                    <Link to="/login" className="link-btn">Sign in instead</Link>
                    <button className="next-btn">Create</button>
                </div>
            </div>
        </div>
    );
}

export default SignupPage;