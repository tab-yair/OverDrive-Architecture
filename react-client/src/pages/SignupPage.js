import Register from '../components/RegisterAndLogin/Register';
import './Pages.css';

/**
 * SignupPage Component
 * Wrapper for the Register component
 */
function SignupPage() {
    return (
        <div className="page signup-page">
            <Register />
        </div>
    );
}

export default SignupPage;
