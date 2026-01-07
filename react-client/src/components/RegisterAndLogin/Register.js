import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { validatePassword, convertToBase64, DEFAULT_IMAGE } from '../../utils/authUtils';
import apiService from '../../services/api';
import './Auth.css';

/**
 * Register Component
 * Handles user sign-up, input validation, and automatic profile image handling.
 */
const Register = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // State for all required fields
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    profileImage: DEFAULT_IMAGE // Default image is pre-filled to satisfy "all fields required"
  });

  const [error, setError] = useState('');

  // Updates text fields in the state
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handles image selection and converts to Base64
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const base64 = await convertToBase64(file);
        setFormData({ ...formData, profileImage: base64 });
      } catch (err) {
        setError("Failed to process image.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Validate that all fields are filled
    if (!formData.username || !formData.password || !formData.firstName || !formData.lastName) {
      setError("All fields are mandatory.");
      return;
    }

    // 2. Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // 3. Validate password strength (minimum 8 chars, letters and numbers)
    if (!validatePassword(formData.password)) {
      setError("Password must be at least 8 characters long and include both letters and numbers.");
      return;
    }

    try {
      // Remove confirmPassword before sending to server
      const { confirmPassword, ...dataToSend } = formData;
      
      // 4. Send request to server (POST /api/users)
      await apiService.register(dataToSend);
      
      // 5. Success: Redirect to login page
      navigate('/login');
    } catch (err) {
      // Capture server-side errors (e.g., "User already exists")
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="google-logo">
           <span className="blue">O</span><span className="red">v</span><span className="yellow">e</span><span className="blue">r</span><span className="green">D</span><span className="red">rive</span>
        </div>
        <h2>Create account</h2>
        <p>Enter your details to join OverDrive</p>

        {/* Error message display */}
        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input name="firstName" placeholder="First Name" onChange={handleChange} required />
          </div>
          <div className="input-group">
            <input name="lastName" placeholder="Last Name" onChange={handleChange} required />
          </div>
          <div className="input-group">
            <input name="username" placeholder="Username" onChange={handleChange} required />
          </div>
          <div className="input-group">
            <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
          </div>
          <div className="input-group">
            <input name="confirmPassword" type="password" placeholder="Confirm Password" onChange={handleChange} required />
          </div>

          <div className="image-preview-container">
            <label>Profile Picture (Optional)</label>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" />
            <img src={formData.profileImage} alt="Preview" className="profile-preview" />
          </div>

          <div className="auth-footer">
            <button type="button" onClick={() => navigate('/login')} className="link-btn">Sign in instead</button>
            <button type="submit" className="next-btn">Next</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;