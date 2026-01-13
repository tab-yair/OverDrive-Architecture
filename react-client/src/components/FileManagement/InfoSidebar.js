import React, { useRef, useEffect, useState } from 'react';
import './InfoSidebar.css';
import { formatFileSize, formatSmartDate, icons } from './fileUtils';
import PermissionsManager from '../PermissionsManager/PermissionsManager';
import { useFilesContext } from '../../context/FilesContext';
import { useAuth } from '../../context/AuthContext';
import { filesApi } from '../../services/api';
import { notifyFilesUpdated } from '../../utils/eventManager';

/**
 * InfoSidebar - Google Drive style information sidebar
 * 
 * IMPORTANT: Connected to FilesContext (SSOT) for real-time synchronization
 * - Receives fileId instead of static file object
 * - Always displays fresh data from central store
 * - Automatically updates when file metadata changes (star, rename, etc.)
 * - Same data source as FileRow/FileCard - perfect synchronization
 * 
 * Permission Management (SSOT based on README.md):
 * - OWNER: Full access to manage permissions and transfer ownership
 * - EDITOR: Can manage permissions but cannot transfer ownership
 * - VIEWER: Cannot view or manage permissions ("You don't have permission..." message)
 * 
 * Permission checks follow README line 818-821 hierarchy
 * 
 * @param {Object} props
 * @param {string} props.fileId - The file ID to display info for
 * @param {boolean} props.isOpen - Whether the sidebar is open
 * @param {Function} props.onClose - Callback to close the sidebar
 */
const InfoSidebar = ({ fileId, isOpen, onClose }) => {
  const filesContext = useFilesContext();
  const { token, user } = useAuth();
  const sidebarRef = useRef(null);
  const [showManageAccess, setShowManageAccess] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Get file from SSOT - always fresh, synchronized data
  const file = fileId ? filesContext.getFile(fileId) : null;

  // Debug logging
  console.log('[InfoSidebar] Props:', { fileId, isOpen, hasFile: !!file });

  // Load permissions when manage access modal opens
  useEffect(() => {
    const loadPermissions = async () => {
      if (!showManageAccess || !fileId || !token) return;
      
      setPermissionsLoading(true);
      try {
        const perms = await filesApi.getPermissions(token, fileId);
        setPermissions(perms);
      } catch (err) {
        console.error('Failed to load permissions:', err);
        setPermissions([]);
      } finally {
        setPermissionsLoading(false);
      }
    };

    loadPermissions();
  }, [showManageAccess, fileId, token]);

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

  // Determine user's role for this file (SSOT: README line 818-821)
  // Priority: 1) Check if owner 2) sharedPermissionLevel 3) permissionLevel 4) default to viewer
  const currentUserRole = file.isOwner 
    ? 'owner' 
    : (file.sharedPermissionLevel?.toLowerCase() || file.permissionLevel?.toLowerCase() || 'viewer');

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
              {(() => {
                console.log('🔍 Modal content render:', { permissionsLoading, permissionsCount: permissions.length, currentUserRole, showManageAccess });
                return permissionsLoading ? (
                  <div className="info-sidebar__loading">Loading permissions...</div>
                ) : permissions.length === 0 ? (
                  <div className="info-sidebar__empty">No permissions found</div>
                ) : (
                  <>
                    {console.log('✅ Rendering PermissionsManager with:', { permissionsCount: permissions.length, currentUserRole })}
                    <PermissionsManager
                      currentUserRole={currentUserRole}
                      currentUserId={user?.id}
                      users={permissions
                        .map(p => {
                          const isCurrentUser = p.userId === user?.id;
                          const fullName = p.user ? `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() : '';
                          const displayName = isCurrentUser ? `${fullName} (me)` : fullName || p.user?.username || p.userId;
                          
                          return {
                            id: p.userId,
                            name: displayName,
                            username: p.user?.username || '', // Display email/username under name
                            role: p.level?.toLowerCase() || 'viewer',
                            isInherited: p.isInherited || false,
                            avatarUrl: p.user?.profileImage,
                            isCurrentUser, // For sorting
                            isOwner: p.level?.toLowerCase() === 'owner' // For sorting
                          };
                        })
                        .sort((a, b) => {
                          // Sort order: 1) Current user (me) 2) Owner 3) Others
                          if (a.isCurrentUser) return -1;
                          if (b.isCurrentUser) return 1;
                          if (a.isOwner && !b.isOwner) return -1;
                          if (b.isOwner && !a.isOwner) return 1;
                          return 0;
                        })
                      }
                      onChange={{
                        setRole: async (userId, newRole) => {
                          const perm = permissions.find(p => p.userId === userId);
                          if (perm) {
                            try {
                              await filesApi.updatePermission(token, fileId, perm.pid, newRole.toUpperCase());
                              // Reload permissions
                              const perms = await filesApi.getPermissions(token, fileId);
                              setPermissions(perms);
                              // Trigger file refresh in context
                              notifyFilesUpdated();
                            } catch (err) {
                              console.error('Failed to update permission:', err);
                              alert('Failed to update permission');
                            }
                          }
                        },
                        removeAccess: async (userId) => {
                          const perm = permissions.find(p => p.userId === userId);
                          if (!perm) return;
                          
                          try {
                            await filesApi.revokePermission(token, fileId, perm.pid);
                            // Reload permissions
                            const perms = await filesApi.getPermissions(token, fileId);
                            setPermissions(perms);
                            // Trigger file refresh in context
                            notifyFilesUpdated();
                          } catch (err) {
                            console.error('Failed to revoke permission:', err);
                            alert('Failed to remove access');
                          }
                        },
                        transferOwnership: async (userId) => {
                          const perm = permissions.find(p => p.userId === userId);
                          if (!perm) return;
                          
                          try {
                            await filesApi.updatePermission(token, fileId, perm.pid, 'OWNER');
                            // Reload permissions
                            const perms = await filesApi.getPermissions(token, fileId);
                            setPermissions(perms);
                            // Trigger file refresh in context
                            notifyFilesUpdated();
                            // Close modal after transfer
                            setShowManageAccess(false);
                          } catch (err) {
                            console.error('Failed to transfer ownership:', err);
                            alert('Failed to transfer ownership');
                          }
                        },
                      }}
                    />
                  </>
                );
              })()}
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
  );
};

export default InfoSidebar;
