import Register from '../components/RegisterAndLogin/Register';
import './Pages.css';

/**
 * SignupPage Component
 * This page serves as a wrapper for the Register component.
 * The Register component handles the internal logic, portal rendering, 
 * and server synchronization.
 */
function SignupPage() {
    return (
        <div className="page signup-page">
            <Register />
        </div>
    );
}

export default SignupPage;