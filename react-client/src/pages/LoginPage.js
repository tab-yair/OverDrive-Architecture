import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo/Logo';
import './Auth.css';

/**
 * LoginPage Component
 */
function LoginPage() {
    const { mockLogin } = useAuth();

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo-container">
                    <Logo size="md" />
                </div>

                <h1 className="auth-title">Sign in</h1>
                <p className="auth-subtitle">to continue to OverDrive</p>

                <div className="input-group">
                    <input type="text" placeholder="Username" />
                </div>
                <div className="input-group">
                    <input type="password" placeholder="Password" />
                </div>

                <div className="auth-footer">
                    <Link to="/signup" className="link-btn">Create account</Link>
                    <button className="next-btn" onClick={mockLogin}>
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;