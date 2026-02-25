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

  /**
   * Check permission for UI display
   * Returns: { disabled: boolean, tooltip: string }
   * 
   * This validates permissions for UI state only.
   * Server-side validation happens in InfoSidebar onChange handlers.
   */
  const checkActionPermission = (user, actionKey) => {
    const strength = { viewer: 1, editor: 2, owner: 3 };
    
    // 1. Check current user's role permissions
    if (currentUserRole === 'viewer') {
      return { 
        disabled: true, 
        tooltip: 'Viewers cannot manage permissions' 
      };
    }
    
    if (currentUserRole === 'editor' && actionKey === 'transfer') {
      return { 
        disabled: true, 
        tooltip: 'Only the owner can transfer ownership' 
      };
    }
    
    // 2. Check inheritance constraints
    if (user.isInherited) {
      // Cannot remove inherited permissions
      if (actionKey === 'remove') {
        return { 
          disabled: true, 
          tooltip: 'Cannot remove inherited permission' 
        };
      }
      
      // Cannot downgrade inherited permissions (but CAN upgrade)
      const currentStrength = strength[user.role];
      const targetStrength = strength[actionKey];
      
      if (actionKey !== 'transfer' && targetStrength < currentStrength) {
        return { 
          disabled: true, 
          tooltip: 'Cannot downgrade inherited permission' 
        };
      }
    }
    
    // 3. All checks passed - action is allowed
    return { disabled: false, tooltip: '' };
  };

  return (
    <div className="perm-container" ref={containerRef}>
      {users.map((user) => {
        const isOwnerRow = user.role === 'owner';
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
                        // SINGLE SOURCE OF TRUTH - one function decides everything
                        const permission = checkActionPermission(user, opt.key);
                        const classes = `perm-menu-item ${permission.disabled ? 'perm-disabled' : ''}`;
                        
                        // Show tooltip only for inherited permission restrictions (not other restrictions)
                        const isInheritedRestriction = permission.tooltip === 'Cannot remove inherited permission' || 
                                                      permission.tooltip === 'Cannot downgrade inherited permission';
                        const showTooltip = permission.disabled && isInheritedRestriction;
                        const tooltipText = showTooltip ? "Inherited permissions cannot be downgraded" : "";

                        const menuButton = (
                          <button
                            key={opt.key}
                            className={classes}
                            onClick={() => handleAction(user, opt.key)}
                            disabled={permission.disabled}
                            role="menuitem"
                          >
                            {permission.disabled && <span className="perm-lock" aria-hidden>🔒</span>}
                            <span>{opt.label}</span>
                          </button>
                        );

                        // Wrap disabled inherited items with tooltip
                        if (showTooltip) {
                          return (
                            <span
                              key={opt.key}
                              className="perm-tooltip-wrapper"
                              title={tooltipText}
                            >
                              {menuButton}
                            </span>
                          );
                        }

                        return menuButton;
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
