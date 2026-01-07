import React, { useRef, useEffect, useState } from 'react';
import './InfoSidebar.css';
import { formatFileSize, formatSmartDate, icons } from './fileUtils';
import PermissionsManager from '../PermissionsManager/PermissionsManager';

/**
 * InfoSidebar - Google Drive style information sidebar
 * 
 * @param {Object} props
 * @param {Object} props.file - The file object to display info for
 * @param {boolean} props.isOpen - Whether the sidebar is open
 * @param {Function} props.onClose - Callback to close the sidebar
 */
const InfoSidebar = ({ file, isOpen, onClose }) => {
  const sidebarRef = useRef(null);
  const [showManageAccess, setShowManageAccess] = useState(false);

  // Add body class when sidebar is open to adjust page layout
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('info-sidebar-open');
    } else {
      document.body.classList.remove('info-sidebar-open');
      // Close manage access modal when sidebar closes
      setShowManageAccess(false);
    }

    return () => {
      document.body.classList.remove('info-sidebar-open');
    };
  }, [isOpen]);

  // Close sidebar when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        onClose();
      }
    };

    // Add event listener with a small delay to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !file) return null;

  // Get the appropriate icon for the file type
  const getFileIconSrc = (type) => {
    return icons[type] || icons.docs;
  };

  // Determine user's role for this file
  const currentUserRole = file.currentUserRole || file.permissionLevel || 'viewer';

  return (
    <div 
      ref={sidebarRef}
      className={`info-sidebar ${isOpen ? 'info-sidebar--open' : ''}`}
      role="complementary"
      aria-label="File information"
    >
      {/* Header */}
      <div className="info-sidebar__header">
        <h2 className="info-sidebar__title">{file.name}</h2>
        <button
          className="info-sidebar__close-btn"
          onClick={onClose}
          aria-label="Close sidebar"
          title="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content Area */}
      <div className="info-sidebar__content">
        {/* File Icon */}
        <div className="info-sidebar__icon-container">
          <img 
            src={getFileIconSrc(file.type)} 
            alt={file.type}
            className="info-sidebar__file-icon"
          />
        </div>

        {/* Who Has Access Section */}
        <div className="info-sidebar__section info-sidebar__access-section">
          <h3 className="info-sidebar__access-title">Who has access</h3>
          
          {currentUserRole === 'viewer' ? (
            <p className="info-sidebar__access-message">
              You don't have permission to view the sharing details of this item
            </p>
          ) : (
            <button 
              className="info-sidebar__manage-access-btn"
              onClick={() => setShowManageAccess(true)}
            >
              Manage Access
            </button>
          )}
        </div>

        {showManageAccess && (
          <div className="info-sidebar__modal-overlay" role="dialog" aria-label="Manage access">
            <div className="info-sidebar__modal-header">
              <h3 className="info-sidebar__modal-title">Manage Access</h3>
              <button
                className="info-sidebar__modal-close-btn"
                onClick={() => setShowManageAccess(false)}
                aria-label="Close manage access"
                title="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="info-sidebar__modal-content">
              <PermissionsManager
                currentUserRole={currentUserRole}
                users={[
                  { id: 'owner', name: file.owner || 'Me', username: 'your.email@gmail.com', role: 'owner', isInherited: false, avatarUrl: file.ownerAvatar || '' },
                  ...((file.sharedWith && Array.isArray(file.sharedWith)) ? file.sharedWith : [])
                ]}
                onChange={{
                  setRole: (userId, role) => {
                    console.log('✅ Permission changed:', userId, 'to', role);
                    alert(`Updated permissions for user ${userId} to ${role}`);
                  },
                  removeAccess: (userId) => {
                    console.log('✅ Access removed:', userId);
                    alert(`Removed access for user ${userId}`);
                  },
                  transferOwnership: (userId) => {
                    console.log('✅ Ownership transferred to:', userId);
                    alert(`Transferred ownership to user ${userId}`);
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* File Details */}
        <div className="info-sidebar__section">
          <h3 className="info-sidebar__section-title">Details</h3>
          <div className="info-sidebar__details-list">
            {/* Type */}
            <div className="info-sidebar__detail-row">
              <div className="info-sidebar__detail-label">Type</div>
              <div className="info-sidebar__detail-value">
                {file.type === 'folder' ? 'Folder' : file.type.toUpperCase()}
              </div>
            </div>

            {/* Size - Only show for files, not folders */}
            {file.type !== 'folder' && (
              <div className="info-sidebar__detail-row">
                <div className="info-sidebar__detail-label">Size</div>
                <div className="info-sidebar__detail-value">
                  {formatFileSize(file.size)}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="info-sidebar__detail-row">
              <div className="info-sidebar__detail-label">Location</div>
              <div className="info-sidebar__detail-value">
                {file.location ? (file.location.isRoot ? 'My Drive' : file.location.parentName) : 'My Drive'}
              </div>
            </div>

            {/* Owner */}
            <div className="info-sidebar__detail-row">
              <div className="info-sidebar__detail-label">Owner</div>
              <div className="info-sidebar__detail-value info-sidebar__owner">
                <div className="info-sidebar__avatar">
                  {file.ownerAvatar ? (
                    <img src={file.ownerAvatar} alt={file.owner} />
                  ) : (
                    <span>{(file.owner || 'Me').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span>{file.owner || 'Me'}</span>
              </div>
            </div>

            {/* Last Opened */}
            <div className="info-sidebar__detail-row">
              <div className="info-sidebar__detail-label">Opened</div>
              <div className="info-sidebar__detail-value">
                {file.lastOpened ? formatSmartDate(file.lastOpened) : '-'}
              </div>
            </div>

            {/* Last Modified */}
            <div className="info-sidebar__detail-row">
              <div className="info-sidebar__detail-label">Modified</div>
              <div className="info-sidebar__detail-value">
                {file.lastModified ? formatSmartDate(file.lastModified) : '-'}
              </div>
            </div>

            {/* Created */}
            <div className="info-sidebar__detail-row">
              <div className="info-sidebar__detail-label">Created</div>
              <div className="info-sidebar__detail-value">
                {file.created ? formatSmartDate(file.created) : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoSidebar;
