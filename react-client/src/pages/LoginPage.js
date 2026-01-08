import Login from '../components/RegisterAndLogin/Login';
import './Pages.css';

/**
 * LoginPage Component
 * Wrapper for the Login component
 */
function LoginPage() {
    return (
        <div className="page login-page">
            <Login />
        </div>
    );
}

export default LoginPage;
