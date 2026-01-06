import React, { useState, useRef, useEffect } from 'react';
import './FileActionMenu.css';

/**
 * Dropdown menu with contextual file actions
 * @param {Object} props
 * @param {Array} props.actions - Available actions
 * @param {Object} props.position - Menu position { x, y }
 * @param {Function} props.onActionSelected - Callback when action is selected
 * @param {Function} props.onClose - Callback when menu should close
 */
const FileActionMenu = ({ actions, position, onActionSelected, onClose }) => {
  const menuRef = useRef(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    // Adjust position to keep menu on screen
    if (menuRef.current && position) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let { x, y } = position;

      // Adjust horizontal position
      if (x + menuRect.width > viewportWidth) {
        x = viewportWidth - menuRect.width - 10;
      }

      // Adjust vertical position
      if (y + menuRect.height > viewportHeight) {
        y = viewportHeight - menuRect.height - 10;
      }

      setAdjustedPosition({ x, y });
    }
  }, [position]);

  useEffect(() => {
    // Close menu on click outside
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    // Close menu on escape key
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleActionClick = (action) => {
    if (action.enabled) {
      onActionSelected(action.id);
      onClose();
    }
  };

  if (!actions || actions.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="file-action-menu"
      style={{
        top: `${adjustedPosition.y}px`,
        left: `${adjustedPosition.x}px`,
      }}
      role="menu"
    >
      {actions.map((action) => (
        <button
          key={action.id}
          className={`file-action-menu-item ${!action.enabled ? 'disabled' : ''} ${action.isDanger ? 'danger' : ''}`}
          onClick={() => handleActionClick(action)}
          disabled={!action.enabled}
          role="menuitem"
        >
          <img
            src={action.iconSrc}
            alt=""
            className={`file-action-menu-icon ${action.id === 'star' || action.id === 'unstar' ? 'star-icon' : ''} ${action.id === 'share' ? 'share-icon' : ''}`}
          />
          <span className="file-action-menu-label">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

export default FileActionMenu;
