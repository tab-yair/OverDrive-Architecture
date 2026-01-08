import React, { useRef, useEffect, useState } from 'react';
import './InfoSidebar.css';
import { formatFileSize, formatSmartDate, icons } from './fileUtils';
import PermissionsManager from '../PermissionsManager/PermissionsManager';
import { useFilesContext } from '../../context/FilesContext';

/**
 * InfoSidebar - Google Drive style information sidebar
 * 
 * IMPORTANT: Connected to FilesContext (SSOT) for real-time synchronization
 * - Receives fileId instead of static file object
 * - Always displays fresh data from central store
 * - Automatically updates when file metadata changes (star, rename, etc.)
 * - Same data source as FileRow/FileCard - perfect synchronization
 * 
 * @param {Object} props
 * @param {string} props.fileId - The file ID to display info for
 * @param {boolean} props.isOpen - Whether the sidebar is open
 * @param {Function} props.onClose - Callback to close the sidebar
 */
const InfoSidebar = ({ fileId, isOpen, onClose }) => {
  const filesContext = useFilesContext();
  const sidebarRef = useRef(null);
  const [showManageAccess, setShowManageAccess] = useState(false);

  // Get file from SSOT - always fresh, synchronized data
  const file = fileId ? filesContext.getFile(fileId) : null;

  // Debug logging
  console.log('[InfoSidebar] Props:', { fileId, isOpen, hasFile: !!file });

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

  // Auto-update when file changes in store (star, rename, permissions, etc.)
  // This effect re-runs whenever filesMap updates, ensuring InfoSidebar always shows fresh data
  useEffect(() => {
    if (!isOpen || !fileId) return;
    // File is already fresh from filesContext.getFile(fileId) above
    // This effect just ensures re-render when filesMap changes
  }, [filesContext.filesMap, fileId, isOpen]);

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
        <h2 className="info-sidebar__title" title={file.name}>{file.name}</h2>
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
                  { 
                    id: 'owner', 
                    name: file.owner || 'Me', 
                    username: file.ownerId || '', // Schema-aligned: ownerId from FilesContext
                    role: 'owner', 
                    isInherited: false, 
                    avatarUrl: file.ownerAvatar || '' 
                  },
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
              <div className="info-sidebar__detail-value info-sidebar__location">
                <img 
                  src={icons.folder} 
                  alt="folder" 
                  className="info-sidebar__location-icon"
                />
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
                <div className="info-sidebar__owner-info">
                  {!file.owner ? (
                    <div>Me</div>
                  ) : (
                    <div title={file.ownerUsername}>{file.ownerUsername}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Modified (Schema-aligned: modifiedAt from FilesContext) */}
            <div className="info-sidebar__detail-row">
              <div className="info-sidebar__detail-label">Modified</div>
              <div className="info-sidebar__detail-value">
                {file.modifiedAt ? formatSmartDate(new Date(file.modifiedAt)) : 'Unknown'}
              </div>
            </div>

            {/* Opened/Viewed (Schema-aligned: lastViewedAt from FilesContext) */}
            {file.lastViewedAt && (
              <div className="info-sidebar__detail-row">
                <div className="info-sidebar__detail-label">Opened</div>
                <div className="info-sidebar__detail-value">
                  {formatSmartDate(new Date(file.lastViewedAt))}
                </div>
              </div>
            )}

            {/* Created (Schema-aligned: createdAt from FilesContext) */}
            <div className="info-sidebar__detail-row">
              <div className="info-sidebar__detail-label">Created</div>
              <div className="info-sidebar__detail-value">
                {file.createdAt ? formatSmartDate(new Date(file.createdAt)) : 'Unknown'}
              </div>
            </div>
            
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoSidebar;
