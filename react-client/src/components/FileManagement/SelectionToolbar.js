import React, { useState, useRef } from 'react';
import ActionButton from './ActionButton';
import FileActionMenu from './FileActionMenu';
import { getToolbarActions, getBulkMenuActions } from './fileUtils';
import './SelectionToolbar.css';

/**
 * ═══════════════════════════════════════════════════════════════════
 * SelectionToolbar - CONTEXT-AWARE GLOBAL TOOLBAR
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Implements "Default First" architecture with "Most Restrictive" logic:
 * 
 * STANDARD DEFAULT (All pages except Trash):
 * ──────────────────────────────────────────────────────────────────
 * Actions: [Share, Download, Move, Delete/Remove, More (⋮)]
 * - Share: Share with other users (owner only)
 * - Download: Download selected files/folders
 * - Move: Move to different folder (owner/editor only)
 * - Delete: "Move to Trash" (owner) or "Remove" (non-owner)
 * - More: Additional actions in dropdown
 * 
 * TRASH EXCEPTION:
 * ──────────────────────────────────────────────────────────────────
 * Actions: [Restore, Delete Permanently]
 * - Restore: Restore to original location
 * - Delete Permanently: Permanently delete (owner/editor only)
 * 
 * MIXED SELECTION HANDLING:
 * ──────────────────────────────────────────────────────────────────
 * INTERSECTION RULE:
 * - Actions appear only if ALL selected items support them
 * - Example: File + Folder → "Open" hidden (folders don't support)
 * 
 * RESTRICTIVE RULE:
 * - Actions enabled only if ALL items have permission
 * - Example: 1 read-only file → "Delete" disabled (opacity 0.3)
 * - Disabled buttons: No hover effect, pointer-events: none
 * 
 * DYNAMIC BEHAVIOR:
 * ──────────────────────────────────────────────────────────────────
 * - Toolbar appears when items are selected
 * - Per-file permission checking (each file can have different permissions)
 * - More (⋮) menu shows only actions valid for entire selection
 * - Toolbar automatically switches based on pageContext prop
 * 
 * FUTURE EXTENSIBILITY:
 * ──────────────────────────────────────────────────────────────────
 * - New pages: Automatically get Standard toolbar
 * - Custom toolbars: Add override in getToolbarActions() in fileUtils.js
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * SelectionToolbar Component - Appears when items are selected
 * Displays action buttons for bulk operations
 * 
 * @param {Object} props
 * @param {Array} props.selectedFiles - Array of selected file objects
 * @param {string} props.pageContext - Current page context ('MyDrive', 'Shared', 'Trash', etc.)
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

  // Get toolbar actions using centralized logic (with per-file permission handling)
  const toolbarActions = getToolbarActions(pageContext, selectedFiles, permissionLevel);
  
  // Get all available actions for the "More" menu using bulk intersection logic
  // Only shows actions that ALL selected items support
  const allActions = getBulkMenuActions(pageContext, selectedFiles, permissionLevel);

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
