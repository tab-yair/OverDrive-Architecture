import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import './Auth.css';

/**
 * Login Component
 * Handles user authentication, validates input, and persists the JWT.
 */
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // 1. Get token and the extracted userId
      const { token, userId } = await apiService.login(username, password);
      
      // 2. Now call getUserProfile with the CORRECT ID (the one from the token)
      const userProfile = await apiService.getUserProfile(userId, token);
      
      // 3. Save to global state
      login(token, userProfile);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };
  
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="google-logo">
           <span className="blue">O</span><span className="red">v</span><span className="yellow">e</span><span className="blue">r</span><span className="green">D</span><span className="red">rive</span>
        </div>
        <h2>Sign in</h2>
        <p>Use your OverDrive Account</p>
        
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
          <div className="input-group">
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <div className="auth-footer">
            <Link to="/register" className="link-btn">Create account</Link>
            <button type="submit" className="next-btn">Next</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;