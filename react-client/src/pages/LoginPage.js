import Login from '../components/RegisterAndLogin/Login';
import './Pages.css';

/**
 * LoginPage Component
 * This page serves as a wrapper for the Login component.
 * The Login component handles the authentication logic, portal rendering,
 * and the toggleable password visibility icon.
 */
function LoginPage() {
    return (
        <div className="page login-page">
            <Login />
        </div>
    );
}

export default LoginPage;