import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import './SettingsPage.css';

/**
 * AccountSettingsPage Component
 * Account settings: profile, password
 */
function AccountSettingsPage() {
    const { user, token, login } = useAuth();
    const fileInputRef = useRef(null);

    // Profile editing state
    const [isEditing, setIsEditing] = useState(false);
    const [firstName, setFirstName] = useState(user?.displayName?.split(' ')[0] || '');
    const [lastName, setLastName] = useState(user?.displayName?.split(' ').slice(1).join(' ') || '');
    const [profileImage, setProfileImage] = useState(user?.profileImage || null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Password change state
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState(null);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // Password visibility state
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Get user initials
    const getUserInitials = () => {
        if (!user?.displayName) return 'U';
        const names = user.displayName.split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase();
        }
        return names[0][0].toUpperCase();
    };

    // Handle photo change click
    const handleChangePhotoClick = () => {
        fileInputRef.current?.click();
    };

    // Handle file selection
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // For now, create a local URL - in production would upload to server
            const url = URL.createObjectURL(file);
            setProfileImage(url);
            // TODO: Upload to server when implementing file upload for profile images
        }
    };

    // Handle edit/save
    const handleEditClick = () => {
        if (isEditing) {
            // Cancel editing
            setFirstName(user?.displayName?.split(' ')[0] || '');
            setLastName(user?.displayName?.split(' ').slice(1).join(' ') || '');
            setProfileImage(user?.profileImage || null);
            setError(null);
        }
        setIsEditing(!isEditing);
    };

    // Handle save profile
    const handleSaveProfile = async () => {
        if (!token || !user?.id) return;

        setSaving(true);
        setError(null);

        try {
            const updates = {
                firstName: firstName.trim(),
                lastName: lastName.trim()
            };

            if (profileImage && profileImage !== user?.profileImage) {
                updates.profileImage = profileImage;
            }

            await userApi.updateUser(token, user.id, updates);

            // Update local user data
            const newDisplayName = lastName.trim()
                ? `${firstName.trim()} ${lastName.trim()}`
                : firstName.trim();

            const updatedUser = {
                ...user,
                displayName: newDisplayName,
                profileImage: profileImage
            };

            login(updatedUser, token);
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to update profile:', err);
            setError(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    // Handle password change
    const handlePasswordChange = async () => {
        setPasswordError(null);
        setPasswordSuccess(false);

        // Validation
        if (!currentPassword) {
            setPasswordError('Current password is required');
            return;
        }
        if (!newPassword) {
            setPasswordError('New password is required');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        setPasswordSaving(true);

        try {
            await userApi.updateUser(token, user.id, {
                password: newPassword
                // Note: Server should verify currentPassword before allowing change
            });

            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordFields(false);

            // Reset visibility states
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);

            // Clear success message after 3 seconds
            setTimeout(() => setPasswordSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to change password:', err);
            setPasswordError(err.message || 'Failed to change password');
        } finally {
            setPasswordSaving(false);
        }
    };

    return (
        <div className="account-settings">
            {/* Profile Section */}
            <section className="settings-section">
                <h2 className="settings-section-title">Profile</h2>
                <div className="settings-section-content">
                    <div className="profile-settings">
                        {/* Profile photo */}
                        <div className="profile-photo-section">
                            <div className="profile-photo-container">
                                {profileImage ? (
                                    <img
                                        src={profileImage}
                                        alt="Profile"
                                        className="profile-photo"
                                    />
                                ) : (
                                    <div className="profile-photo-initials">
                                        {getUserInitials()}
                                    </div>
                                )}
                                {isEditing && (
                                    <button
                                        className="profile-photo-badge"
                                        onClick={handleChangePhotoClick}
                                        aria-label="Change photo"
                                    >
                                        <span className="material-symbols-outlined">photo_camera</span>
                                    </button>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            {isEditing && (
                                <button
                                    className="btn btn-secondary profile-change-photo-btn"
                                    onClick={handleChangePhotoClick}
                                >
                                    Change photo
                                </button>
                            )}
                        </div>

                        {/* Profile fields */}
                        <div className="profile-fields">
                            <div className="profile-field">
                                <label className="profile-field-label">First name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="profile-field-input"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Enter first name"
                                    />
                                ) : (
                                    <span className="profile-field-value">
                                        {user?.displayName?.split(' ')[0] || '-'}
                                    </span>
                                )}
                            </div>

                            <div className="profile-field">
                                <label className="profile-field-label">Last name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="profile-field-input"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Enter last name (optional)"
                                    />
                                ) : (
                                    <span className="profile-field-value">
                                        {user?.displayName?.split(' ').slice(1).join(' ') || '-'}
                                    </span>
                                )}
                            </div>

                            <div className="profile-field">
                                <label className="profile-field-label">Username</label>
                                <span className="profile-field-value profile-field-disabled">
                                    {user?.username || '-'}
                                </span>
                            </div>

                            {error && (
                                <div className="profile-error">
                                    <span className="material-symbols-outlined">error</span>
                                    {error}
                                </div>
                            )}

                            <div className="profile-actions">
                                {isEditing ? (
                                    <>
                                        <button
                                            className="btn btn-secondary"
                                            onClick={handleEditClick}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleSaveProfile}
                                            disabled={saving || !firstName.trim()}
                                        >
                                            {saving ? 'Saving...' : 'Save'}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleEditClick}
                                    >
                                        Edit profile
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section className="settings-section">
                <h2 className="settings-section-title">Security</h2>
                <div className="settings-section-content">
                    {passwordSuccess && (
                        <div className="password-success">
                            <span className="material-symbols-outlined">check_circle</span>
                            Password changed successfully
                        </div>
                    )}

                    {!showPasswordFields ? (
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowPasswordFields(true)}
                        >
                            Change password
                        </button>
                    ) : (
                        <div className="password-change-form">
                            <div className="profile-field">
                                <label className="profile-field-label">Current password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        className="profile-field-input password-input"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                                    >
                                        <span className="material-symbols-outlined">
                                            {showCurrentPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="profile-field">
                                <label className="profile-field-label">New password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        className="profile-field-input password-input"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                                    >
                                        <span className="material-symbols-outlined">
                                            {showNewPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="profile-field">
                                <label className="profile-field-label">Confirm new password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className="profile-field-input password-input"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                    >
                                        <span className="material-symbols-outlined">
                                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {passwordError && (
                                <div className="profile-error">
                                    <span className="material-symbols-outlined">error</span>
                                    {passwordError}
                                </div>
                            )}

                            <div className="profile-actions">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowPasswordFields(false);
                                        setCurrentPassword('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                        setPasswordError(null);
                                        setShowCurrentPassword(false);
                                        setShowNewPassword(false);
                                        setShowConfirmPassword(false);
                                    }}
                                    disabled={passwordSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handlePasswordChange}
                                    disabled={passwordSaving}
                                >
                                    {passwordSaving ? 'Saving...' : 'Change password'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

export default AccountSettingsPage;
