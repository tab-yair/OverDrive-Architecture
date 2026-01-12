import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../Logo/Logo';
import apiService from '../../services/api';
// Importing the original default image from your utils
import { DEFAULT_IMAGE } from '../../utils/authUtils';
import './Auth.css';

/**
 * Register Component - Complete with Password Toggle and Image Logic
 */
function Register() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        password: '',
        confirmPassword: ''
    });
    
    // Password visibility states
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [error, setError] = useState('');
    // Initialize with the original Base64 default image
    const [previewUrl, setPreviewUrl] = useState(DEFAULT_IMAGE);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError(''); 
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // 1. Password Match Validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // 2. Password Length Validation - Aligned with Server (8 chars)
        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        try {
            const registrationData = {
                username: formData.username,
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName || null,
                profileImage: previewUrl || DEFAULT_IMAGE 
            };

            await apiService.register(registrationData);

            // Navigate to login with a success message in state
            navigate('/login', { state: { message: 'Account created! Please sign in.' } });
        } catch (err) {
            setError(err.message || 'Registration failed.');
        }
    };

    const registerContent = (
        <div className="auth-overlay">
            <div className="auth-card">
                <div className="auth-logo-container">
                    <Logo size="md" />
                </div>

                <h1 className="auth-title">Create account</h1>
                <p className="auth-subtitle">Enter your details to join OverDrive</p>

                {error && <div className="error-alert">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <input name="firstName" type="text" placeholder="First Name" value={formData.firstName} onChange={handleChange} required />
                    </div>
                    <div className="input-group">
                        <input name="lastName" type="text" placeholder="Last Name (Optional)" value={formData.lastName} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <input name="username" type="text" placeholder="Username" value={formData.username} onChange={handleChange} required />
                    </div>
                    
                    <div className="input-group password-group">
                        <input 
                            name="password" 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Password" 
                            value={formData.password} 
                            onChange={handleChange} 
                            required 
                        />
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

                    <div className="input-group password-group">
                        <input 
                            name="confirmPassword" 
                            type={showConfirmPassword ? "text" : "password"} 
                            placeholder="Confirm Password" 
                            value={formData.confirmPassword} 
                            onChange={handleChange} 
                            required 
                        />
                        <button 
                            type="button" 
                            className="password-toggle"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            <span className="material-symbols-outlined">
                                {showConfirmPassword ? 'visibility_off' : 'visibility'}
                            </span>
                        </button>
                    </div>

                    <div className="image-preview-container">
                        <label htmlFor="profile-upload" className="link-btn">
                            {previewUrl !== DEFAULT_IMAGE ? 'Change Photo' : 'Upload Profile Picture (Optional)'}
                        </label>
                        <input id="profile-upload" type="file" accept="image/*" onChange={handleImageChange} style={{display: 'none'}} />
                        
                        <img 
                            src={previewUrl} 
                            alt="Profile Preview" 
                            className="profile-preview" 
                        />
                    </div>

                    <div className="auth-footer">
                        <Link to="/login" className="link-btn">Sign in instead</Link>
                        <button type="submit" className="next-btn">Create</button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(registerContent, document.body);
}

export default Register;