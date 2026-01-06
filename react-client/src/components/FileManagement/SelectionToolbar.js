import React, { useState, useRef } from 'react';
import ActionButton from './ActionButton';
import FileActionMenu from './FileActionMenu';
import { getToolbarActions, getAvailableActions } from './fileUtils';
import './SelectionToolbar.css';

/**
 * SelectionToolbar Component - Appears when items are selected
 * Displays action buttons for bulk operations
 * 
 * @param {Object} props
 * @param {Array} props.selectedFiles - Array of selected file objects
 * @param {string} props.pageContext - Current page context
 * @param {string} props.permissionLevel - User's permission level
 * @param {boolean} props.isOwner - Whether current user is the owner
 * @param {Function} props.onClearSelection - Callback to clear selection
 * @param {Function} props.onAction - Callback for bulk actions
 */
const SelectionToolbar = ({
  selectedFiles = [],
  pageContext = 'MyDrive',
  permissionLevel = 'viewer',
  isOwner = true,
  onClearSelection,
  onAction,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuButtonRef = useRef(null);

  if (selectedFiles.length === 0) {
    return null;
  }

  // Get toolbar actions using centralized logic
  const toolbarActions = getToolbarActions(pageContext, selectedFiles, permissionLevel, isOwner);
  
  // Get all available actions for the "More" menu
  // For bulk actions, we use the first file as reference but getBulkActionStatus will validate all
  const allActions = selectedFiles.length > 0 
    ? getAvailableActions(pageContext, selectedFiles[0], permissionLevel, isOwner)
    : [];

  const handleActionClick = (actionId) => {
    if (onAction) {
      onAction(actionId, selectedFiles);
    }
  };

  const handleMoreClick = (event) => {
    event.stopPropagation();
    const rect = menuButtonRef.current.getBoundingClientRect();
    setMenuPosition({
      x: rect.right - 200,
      y: rect.bottom + 5,
    });
    setShowMenu(!showMenu);
  };

  const handleMenuActionSelected = (actionId) => {
    if (onAction) {
      onAction(actionId, selectedFiles);
    }
    setShowMenu(false);
  };

  return (
    <>
      <div className="selection-toolbar">
        {/* Left Section: Close button and counter */}
        <div className="selection-toolbar-left">
          <button
            className="selection-toolbar-close"
            onClick={onClearSelection}
            aria-label="Clear selection"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <span className="selection-toolbar-counter">
            {selectedFiles.length} selected
          </span>
        </div>

        {/* Right Section: Action buttons */}
        <div className="selection-toolbar-actions">
          {toolbarActions.map((action) => (
            <ActionButton
              key={action.id}
              iconSrc={action.iconSrc}
              onClick={() => handleActionClick(action.id)}
              disabled={!action.enabled}
              ariaLabel={action.label}
              className={action.isDanger ? 'danger-button' : ''}
            />
          ))}

          {/* More Options Button */}
          <div ref={menuButtonRef}>
            <ActionButton
              iconSrc={`${process.env.PUBLIC_URL}/assets/more_vert.svg`}
              onClick={handleMoreClick}
              ariaLabel="More options"
              className="more-button"
            />
          </div>
        </div>
      </div>

      {showMenu && (
        <FileActionMenu
          actions={allActions}
          position={menuPosition}
          onActionSelected={handleMenuActionSelected}
          onClose={() => setShowMenu(false)}
        />
      )}
    </>
  );
};

export default SelectionToolbar;
