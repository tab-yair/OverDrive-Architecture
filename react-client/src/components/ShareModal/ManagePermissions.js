import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { permissionsApi } from '../../services/api';
import PermissionsManager from '../PermissionsManager/PermissionsManager';
import './ManagePermissions.css';

/**
 * ManagePermissions - Wrapper that loads permissions and uses PermissionsManager
 */
export default function ManagePermissions({ file, onClose, onUpdate }) {
  const { token, user } = useAuth();
  const userId = user?.id;
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPermissions();
  }, [file.id]);

  const loadPermissions = async () => {
    try {
      const perms = await permissionsApi.getPermissions(token, file.id);
      setPermissions(perms);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load permissions:', err);
      setError('Failed to load permissions');
      setLoading(false);
    }
  };

  const handleSetRole = async (userId, newRole) => {
    try {
      const perm = permissions.find(p => p.userId === userId);
      if (perm) {
        await permissionsApi.updatePermission(token, file.id, perm.pid, newRole.toUpperCase());
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error('Failed to update permission:', err);
    }
  };

  const handleRemoveAccess = async (userId) => {
    const perm = permissions.find(p => p.userId === userId);
    if (!perm) return;
    
    try {
      await permissionsApi.revokePermission(token, file.id, perm.pid);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to revoke permission:', err);
    }
  };

  const handleTransferOwnership = async (userId) => {
    // Find the permission to update
    const perm = permissions.find(p => p.userId === userId);
    if (!perm) return;

    try {
      await permissionsApi.updatePermission(token, file.id, perm.pid, 'OWNER');
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      console.error('Failed to transfer ownership:', err);
    }
  };

  // Convert API permissions to PermissionsManager format
  const users = permissions.map(p => {
    const isCurrentUser = p.userId === userId;
    const fullName = p.user ? `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() : '';
    
    return {
      id: p.userId,
      name: fullName || p.user?.username || p.userId,
      username: !isCurrentUser && p.user?.username ? p.user.username : undefined,
      role: p.level?.toLowerCase() || 'viewer',
      isInherited: p.isInherited || false,
      avatarUrl: p.user?.profileImage
    };
  });

  // Find current user's role (SSOT: README line 818-821)
  // Priority: 1) Permission level from API 2) Check if owner 3) Default to viewer
  const currentUserPerm = permissions.find(p => p.userId === userId);
  const currentUserRole = currentUserPerm?.level?.toLowerCase() || (file.isOwner ? 'owner' : 'viewer');

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-dialog manage-perms-dialog" onClick={e => e.stopPropagation()}>
        <div className="share-modal-header">
          <h3>Manage Permissions for "{file.name}"</h3>
          <button onClick={onClose} className="share-modal-close">×</button>
        </div>
        
        <div className="share-modal-body">
          {loading ? (
            <div>Loading permissions...</div>
          ) : error ? (
            <div className="share-error">{error}</div>
          ) : permissions.length === 0 ? (
            <div>No permissions yet. Use Share to add collaborators.</div>
          ) : (
            <PermissionsManager
              currentUserRole={currentUserRole}
              currentUserId={userId}
              users={users}
              onChange={{
                setRole: handleSetRole,
                removeAccess: handleRemoveAccess,
                transferOwnership: handleTransferOwnership
              }}
            />
          )}
          
          <div className="manage-perms-actions">
            <button onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
