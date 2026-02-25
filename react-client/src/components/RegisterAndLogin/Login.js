import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import Logo from '../Logo/Logo';
import './Auth.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Eye icon state
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we arrived here after a successful registration
  const successMessage = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { token, userId } = await apiService.login(username, password);
      const userProfile = await apiService.getUserProfile(token, userId);
      
      login(token, userProfile);

      // Let AuthContext handle the redirect based on preferences
      console.log('Login successful. AuthContext will handle redirect.');
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  const loginContent = (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-logo-container">
          <Logo size="lg" />
        </div>
        <h2 className="auth-title">Sign in</h2>
        <p className="auth-subtitle">Use your OverDrive Account</p>
        
        {successMessage && <div className="success-alert">{successMessage}</div>}
        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>
          
          <div className="input-group password-group">
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            {/* Custom Eye Icon Button */}
            <button 
              type="button" 
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              <span className="material-symbols-outlined">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          
          <div className="auth-footer">
            <Link to="/signup" className="link-btn">Create account</Link>
            <button type="submit" className="next-btn">Next</button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(loginContent, document.body);
};

export default Login;