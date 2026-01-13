import React, { useState, useRef } from 'react';
import ActionButton from './ActionButton';
import FileActionMenu from './FileActionMenu';
import { getAvailableActions } from './fileUtils';
import './FileCard.css';

/**
 * FileCard Component - Displays a file/folder as a card in grid view
 * @param {Object} props
 * @param {Object} props.file - File data object
 * @param {string} props.pageContext - Current page context
 * @param {string} props.permissionLevel - User's permission level
 * @param {boolean} props.isOwner - Whether current user is the owner
 * @param {boolean} props.isSelected - Whether this file is selected
 * @param {number} props.selectedCount - Number of selected files
 * @param {Function} props.onSelect - Callback when selection changes
 * @param {Function} props.onAction - Callback for action events
 * @param {Function} props.onClick - Callback when card is clicked
 */
const FileCard = ({ 
  file, 
  pageContext = 'MyDrive', 
  permissionLevel = 'viewer', 
  isOwner = true, 
  isSelected = false,
  selectedCount = 0,
  onSelect,
  onAction, 
  onClick,
  onDoubleClick
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuButtonRef = useRef(null);

  // Helper to get file icon
  const getFileIconSrc = (type) => {
    const iconMap = {
      folder: 'folder.svg',
      pdf: 'pdf.svg',
      image: 'image.svg',
      docs: 'Docs.svg',
    };
    const iconFile = iconMap[type] || 'Docs.svg';
    const iconPath = `${process.env.PUBLIC_URL}/assets/${iconFile}`;
    
    console.log(`🖼️ FileCard icon request:`, { 
      fileName: file.name, 
      fileType: type, 
      iconFile, 
      iconPath,
      PUBLIC_URL: process.env.PUBLIC_URL 
    });
    
    return iconPath;
  };

  // CRITICAL: Row/Card context menu is ALWAYS evaluated for single item (selectedCount=1)
  // It represents actions for THIS specific file, independent of global selection state
  // Only SelectionToolbar should use actual selectedCount for bulk operations
  const availableActions = getAvailableActions(pageContext, file, 1, permissionLevel);

  const handleMenuClick = (event) => {
    event.stopPropagation();
    const rect = menuButtonRef.current.getBoundingClientRect();
    setMenuPosition({
      x: rect.right - 200, // Align menu to the right
      y: rect.bottom + 5,
    });
    setShowMenu(!showMenu);
  };

  const handleActionSelected = (actionId) => {
    // No local state update needed - FilesContext will update and trigger re-render
    if (onAction) {
      onAction(actionId, file);
    }
  };

  const handleCardClick = (event) => {
    event.stopPropagation();
    
    // Always call selection handler first (it handles both normal and Ctrl/Cmd clicks)
    if (onSelect) {
      onSelect(file, event);
    }
    
    // If it's a normal click (not Ctrl/Cmd), also call onClick if provided
    if (!event.ctrlKey && !event.metaKey && onClick) {
      onClick(file);
    }
  };

  const handleCardDoubleClick = (event) => {
    event.stopPropagation();
    
    // Double-click opens the file/folder
    if (onDoubleClick) {
      onDoubleClick(file);
    }
  };

  // Remove handleCheckboxClick - no longer needed

  return (
    <>
      <div
        className={`file-card ${file.type === 'folder' ? 'folder-card' : ''} ${pageContext === 'Recent' || pageContext === 'Shared' ? 'uniform-square' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={handleCardClick}
        onDoubleClick={handleCardDoubleClick}
        role="button"
        tabIndex={0}
      >
        {/* Card Header with Menu Button - For regular files and uniform-square folders */}
        {(file.type !== 'folder' || pageContext === 'Recent' || pageContext === 'Shared') && (
          <div className="file-card-header" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <div ref={menuButtonRef}>
              <ActionButton
                iconSrc={`${process.env.PUBLIC_URL}/assets/more_vert.svg`}
                onClick={handleMenuClick}
                ariaLabel="More actions"
                className="card-menu-button"
              />
            </div>
          </div>
        )}

        {/* File Icon/Thumbnail */}
        <div className="file-card-icon-container">
          <img
            src={getFileIconSrc(file.type)}
            alt=""
            className={`file-card-icon ${file.type === 'folder' ? 'folder-icon' : ''}`}
          />
        </div>

        {/* File Name */}
        <div className="file-card-name">
          <span className="file-card-name-text" title={file.name}>
            {file.name}
          </span>
        </div>

        {/* Folder Menu Button (on right side of banner) - Only for banner-style folders */}
        {file.type === 'folder' && pageContext !== 'Recent' && pageContext !== 'Shared' && (
          <div className="folder-menu-button" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <div ref={menuButtonRef}>
              <ActionButton
                iconSrc={`${process.env.PUBLIC_URL}/assets/more_vert.svg`}
                onClick={handleMenuClick}
                ariaLabel="More actions"
                className="card-menu-button"
              />
            </div>
          </div>
        )}
      </div>

      {showMenu && (
        <FileActionMenu
          actions={availableActions}
          position={menuPosition}
          onActionSelected={handleActionSelected}
          onClose={() => setShowMenu(false)}
        />
      )}
    </>
  );
};

export default FileCard;
