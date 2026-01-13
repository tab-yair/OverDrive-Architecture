import React, { useState, useRef, useEffect } from 'react';
import './PermissionsManager.css';

/**
 * PermissionsManager
 * 
 * Single Source of Truth (SSOT) for Permission Rules based on README.md:
 * 
 * 1. Role Hierarchy (README line 818-821):
 *    - OWNER (3): Full control - can manage all permissions and transfer ownership
 *    - EDITOR (2): Can modify files and manage permissions (except transfer ownership)
 *    - VIEWER (1): Read-only - CANNOT manage permissions at all
 * 
 * 2. Inheritance Rules (README line 841-875):
 *    - isInherited=true: Permission comes from parent folder
 *    - CANNOT remove inherited permissions (locked 🔒)
 *    - CANNOT downgrade inherited permissions (e.g., EDITOR → VIEWER)
 *    - CAN upgrade inherited permissions (e.g., VIEWER → EDITOR via direct permission)
 * 
 * 3. Ownership Transfer (README line 890-906):
 *    - Only OWNER can transfer ownership
 *    - Transfer is NON-recursive (folder ownership ≠ children ownership)
 * 
 * Props:
 * - currentUserRole: 'owner' | 'editor' | 'viewer' - Current user's role (SSOT for permission decisions)
 * - currentUserId?: string - ID of current user (to highlight with "(me)")
 * - users: Array<{ id, name, username?, role: 'owner'|'editor'|'viewer', isInherited: boolean, avatarUrl?: string }>
 * - onChange?: {
 *     setRole?: (userId, newRole) => void,
 *     removeAccess?: (userId) => void,
 *     transferOwnership?: (userId) => void,
 *   }
 */
export default function PermissionsManager({ currentUserRole = 'owner', currentUserId, users = [], onChange = {} }) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const containerRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenuId) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const toggleMenu = (userId) => {
    setOpenMenuId(openMenuId === userId ? null : userId);
  };

  /**
   * Check if current user has permission to perform action (SSOT: README line 818-821)
   * 
   * Permission Matrix:
   * ┌─────────────┬─────────┬────────┬─────────┬──────────┐
   * │ Action      │ VIEWER  │ EDITOR │ OWNER   │ Notes    │
   * ├─────────────┼─────────┼────────┼─────────┼──────────┤
   * │ Set Role    │ ❌      │ ✅     │ ✅      │          │
   * │ Remove      │ ❌      │ ✅     │ ✅      │          │
   * │ Transfer    │ ❌      │ ❌     │ ✅      │ Owner only│
   * └─────────────┴─────────┴────────┴─────────┴──────────┘
   * 
   * Additional constraints from isDisabledByInheritance():
   * - Cannot remove inherited permissions (🔒)
   * - Cannot downgrade inherited permissions (🔒)
   */
  const isActionAllowed = (actionKey) => {
    // VIEWER: Cannot manage any permissions
    if (currentUserRole === 'viewer') return false;
    
    // EDITOR: Can manage permissions (setRole, removeAccess) but not transfer ownership
    if (currentUserRole === 'editor') {
      return actionKey !== 'transfer';
    }
    
    // OWNER: Can do everything
    return true;
  };

  const isOwnerViewer = currentUserRole === 'owner';

  const options = [
    { key: 'viewer', label: 'Viewer' },
    { key: 'editor', label: 'Editor' },
    { key: 'remove', label: 'Remove Access' },
    { key: 'transfer', label: 'Transfer Ownership' },
  ];

  const handleAction = async (user, actionKey) => {
    // Don't close menu immediately - let the async operation complete
    try {
      if (actionKey === 'viewer' || actionKey === 'editor') {
        onChange.setRole && await onChange.setRole(user.id, actionKey);
      } else if (actionKey === 'remove') {
        onChange.removeAccess && await onChange.removeAccess(user.id);
      } else if (actionKey === 'transfer') {
        onChange.transferOwnership && await onChange.transferOwnership(user.id);
      }
      // Close menu only after successful completion
      setOpenMenuId(null);
    } catch (error) {
      console.error('❌ Permission action failed:', error);
      // Keep menu open on error so user can retry
    }
  };

  const isDisabledByInheritance = (user, actionKey) => {
    if (!user.isInherited) return false;
    // Inheritance rule: cannot reduce permission level or remove access.
    // "remove" is always disabled; roles lower than current are disabled.
    if (actionKey === 'remove') return true;
    if (actionKey === 'transfer') return false; // transfer isn't a reduction; ownership change allowed only by current owner rule
    // Disallow any role lower than current role
    const strength = { viewer: 1, editor: 2, owner: 3 };
    const currentStrength = strength[user.role];
    const targetStrength = strength[actionKey];
    if (targetStrength < currentStrength) return true;
    return false;
  };

  // Helper to get tooltip text based on disabled reason
  const getDisabledTooltip = (user, actionKey) => {
    if (user.isInherited) {
      if (actionKey === 'remove') return 'Cannot remove - permission inherited from parent folder';
      return 'Cannot modify - permission inherited from parent folder';
    }
    if (currentUserRole !== 'owner' && actionKey === 'transfer') {
      return 'Only the owner can transfer ownership';
    }
    if (currentUserRole === 'viewer') {
      return 'Viewers cannot manage permissions';
    }
    return 'Insufficient permissions';
  };

  return (
    <div className="perm-container" ref={containerRef}>
      {users.map((user) => {
        const isOwnerRow = user.role === 'owner';
        const showDropdown = !isOwnerRow;
        const isMenuOpen = openMenuId === user.id;

        return (
          <div className="perm-row" key={user.id}>
            <div className="perm-avatar">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} />
              ) : (
                <div className="perm-avatar-fallback">{(user.name || '?').charAt(0).toUpperCase()}</div>
              )}
            </div>
            <div className="perm-user-info">
              <div className="perm-name" title={user.name}>{user.name}</div>
              {user.username && <div className="perm-username" title={user.username}>{user.username}</div>}
            </div>
            <div className="perm-actions">
              {isOwnerRow ? (
                <span className="perm-owner-pill">Owner</span>
              ) : (
                <div className="perm-dropdown">
                  <button
                    className={`perm-dropdown-toggle ${user.isInherited ? 'perm-inherited' : ''}`}
                    onClick={() => toggleMenu(user.id)}
                    aria-haspopup="true"
                    aria-expanded={isMenuOpen}
                    title={user.isInherited ? '🔒 Inherited from parent folder - limited actions available' : ''}
                  >
                    {user.isInherited && <span className="perm-inherited-icon" aria-hidden="true">🔒</span>}
                    {user.role === 'editor' ? 'Editor' : 'Viewer'}
                    <span className="perm-caret">▾</span>
                  </button>
                  {isMenuOpen && (
                    <div className="perm-menu" role="menu">
                      {options.map((opt) => {
                        let disabled = false;
                        let title = '';

                        // Check if current user role allows this action (SSOT based on README)
                        if (!isActionAllowed(opt.key)) {
                          disabled = true;
                          title = getDisabledTooltip(user, opt.key);
                        }

                        // Inheritance constraints (SSOT: cannot downgrade inherited permissions)
                        if (!disabled && isDisabledByInheritance(user, opt.key)) {
                          disabled = true;
                          title = getDisabledTooltip(user, opt.key);
                        }

                        // Visual disabled state
                        const classes = `perm-menu-item ${disabled ? 'perm-disabled' : ''}`;

                        return (
                          <button
                            key={opt.key}
                            className={classes}
                            onClick={() => handleAction(user, opt.key)}
                            disabled={disabled}
                            title={disabled ? title : ''}
                            role="menuitem"
                          >
                            {disabled && <span className="perm-lock" aria-hidden>🔒</span>}
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
