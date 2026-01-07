import React, { useState, useRef, useEffect } from 'react';
import './PermissionsManager.css';

/**
 * PermissionsManager
 * Props:
 * - currentUserRole: 'owner' | 'editor' | 'viewer'
 * - users: Array<{ id, name, username?, role: 'owner'|'editor'|'viewer', isInherited: boolean, avatarUrl?: string }>
 * - onChange?: {
 *     setRole?: (userId, newRole) => void,
 *     removeAccess?: (userId) => void,
 *     transferOwnership?: (userId) => void,
 *   }
 */
export default function PermissionsManager({ currentUserRole = 'owner', users = [], onChange = {} }) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuDirection, setMenuDirection] = useState('up'); // 'up' or 'down'
  const containerRef = useRef(null);
  const menuRefs = useRef({});

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
    if (openMenuId === userId) {
      setOpenMenuId(null);
      return;
    }

    setOpenMenuId(userId);

    // Calculate smart positioning after a brief delay for DOM update
    setTimeout(() => {
      const menuElement = menuRefs.current[userId];
      if (!menuElement) return;

      const rect = menuElement.getBoundingClientRect();
      const containerElement = containerRef.current;
      if (!containerElement) return;

      const containerRect = containerElement.getBoundingClientRect();
      
      // Check if menu would overflow bottom
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const menuHeight = 180; // Approximate menu height

      // Open downward if there's more space below or equal space
      const shouldOpenDown = spaceBelow >= spaceAbove;
      setMenuDirection(shouldOpenDown ? 'down' : 'up');
    }, 0);
  };

  const isOwnerViewer = currentUserRole === 'owner';

  const options = [
    { key: 'viewer', label: 'Viewer' },
    { key: 'editor', label: 'Editor' },
    { key: 'remove', label: 'Remove Access' },
    { key: 'transfer', label: 'Transfer Ownership' },
  ];

  const handleAction = (user, actionKey) => {
    if (actionKey === 'viewer' || actionKey === 'editor') {
      onChange.setRole && onChange.setRole(user.id, actionKey);
    } else if (actionKey === 'remove') {
      onChange.removeAccess && onChange.removeAccess(user.id);
    } else if (actionKey === 'transfer') {
      onChange.transferOwnership && onChange.transferOwnership(user.id);
    }
    setOpenMenuId(null);
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

  const tooltipText = 'Cannot reduce permission because it is inherited from the parent folder';

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
              <div className="perm-name">{user.name}</div>
              {user.username && <div className="perm-username">{user.username}</div>}
            </div>
            <div className="perm-actions">
              {isOwnerRow ? (
                <span className="perm-owner-pill">Owner</span>
              ) : (
                <div className="perm-dropdown">
                  <button
                    className="perm-dropdown-toggle"
                    onClick={() => toggleMenu(user.id)}
                    aria-haspopup="true"
                    aria-expanded={isMenuOpen}
                  >
                    {user.role === 'editor' ? 'Editor' : 'Viewer'}
                    <span className="perm-caret">▾</span>
                  </button>
                  {isMenuOpen && (
                    <div 
                      className={`perm-menu perm-menu--${menuDirection}`}
                      role="menu"
                      ref={(el) => {
                        if (el) menuRefs.current[user.id] = el;
                      }}
                    >
                      {options.map((opt) => {
                        let disabled = false;
                        let title = '';

                        // Transfer ownership only enabled for current owner viewer
                        if (opt.key === 'transfer' && !isOwnerViewer) {
                          disabled = true;
                          title = 'Only the owner can transfer ownership';
                        }

                        // Inheritance constraints
                        if (isDisabledByInheritance(user, opt.key)) {
                          disabled = true;
                          title = tooltipText;
                        }

                        // Owner row: fully disabled (handled above)

                        // Visual disabled state
                        const classes = `perm-menu-item ${disabled ? 'perm-disabled' : ''}`;

                        return (
                          <button
                            key={opt.key}
                            className={classes}
                            onClick={() => !disabled && handleAction(user, opt.key)}
                            title={disabled ? title : ''}
                            aria-disabled={disabled}
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
