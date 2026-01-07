import React, { useState, useRef } from 'react';
import ActionButton from './ActionButton';
import FileActionMenu from './FileActionMenu';
import { getMetadataConfig, getAvailableActions, getRowActionButtons, formatFileSize, formatSmartDate, getFallbackValue } from './fileUtils';
import './FileRow.css';

/**
 * FileRow Component - Displays a file/folder as a row in list view
 * @param {Object} props
 * @param {Object} props.file - File data object
 * @param {string} props.pageContext - Current page context
 * @param {string} props.permissionLevel - User's permission level
 * @param {boolean} props.isOwner - Whether current user is the owner
 * @param {boolean} props.isSelected - Whether this file is selected
 * @param {Function} props.onSelect - Callback when selection changes
 * @param {Function} props.onAction - Callback for action events
 * @param {Function} props.onClick - Callback when row is clicked
 */
const FileRow = ({ 
  file, 
  pageContext = 'MyDrive', 
  permissionLevel = 'viewer', 
  isOwner = true, 
  isSelected = false,
  onSelect,
  onAction, 
  onClick 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isStarred, setIsStarred] = useState(file.starred || false);
  const menuButtonRef = useRef(null);

  // Helper to get file icon
  const getFileIconSrc = (type) => {
    const iconMap = {
      folder: 'folder.svg',
      pdf: 'pdf.svg',
      image: 'image.svg',
      docs: 'Docs.svg',
    };
    return `${process.env.PUBLIC_URL}/assets/${iconMap[type] || 'Docs.svg'}`;
  };

  const metadataConfig = getMetadataConfig(pageContext);
  
  // Get actions using the single source of truth (ACTION_REGISTRY)
  const availableActions = getAvailableActions(pageContext, { ...file, starred: isStarred });
  
  // Get row buttons using the ACTION_REGISTRY
  const rowButtons = getRowActionButtons(pageContext, { ...file, starred: isStarred });

  const handleMenuClick = (event) => {
    event.stopPropagation();
    const rect = menuButtonRef.current.getBoundingClientRect();
    setMenuPosition({
      x: rect.right - 200, // Align menu to the right of the button
      y: rect.bottom + 5,
    });
    setShowMenu(!showMenu);
  };

  const handleActionClick = (actionId) => (event) => {
    event.stopPropagation();
    
    // Handle star/unstar locally for immediate UI feedback
    if (actionId === 'star' || actionId === 'unstar') {
      setIsStarred(actionId === 'star');
    }
    
    if (onAction) {
      onAction(actionId, file);
    }
  };

  const handleActionSelected = (actionId) => {
    // Handle star/unstar locally for immediate UI feedback
    if (actionId === 'star' || actionId === 'unstar') {
      setIsStarred(actionId === 'star');
    }
    
    if (onAction) {
      onAction(actionId, file);
    }
  };

  const handleRowClick = (event) => {
    event.stopPropagation();
    
    // Always call selection handler first (it handles both normal and Ctrl/Cmd clicks)
    if (onSelect) {
      onSelect(file, event);
    }
    
    // If it's a normal click (not Ctrl/Cmd), also open the file
    if (!event.ctrlKey && !event.metaKey && onClick) {
      onClick(file);
    }
  };

  // Remove handleCheckboxClick - no longer needed

  const renderMetadataValue = (config) => {
    const { key, formatter, isSharer, isActions, isLocation } = config;

    // Handle sharer metadata
    if (isSharer) {
      if (file.sharer) {
        return (
          <div className="metadata-sharer">
            {file.sharer.avatarUrl ? (
              <img src={file.sharer.avatarUrl} alt="" className="sharer-avatar" />
            ) : (
              <div className="sharer-avatar-placeholder">
                {file.sharer.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span>{file.sharer.displayName}</span>
          </div>
        );
      }
      return getFallbackValue('sharer');
    }

    // Handle actions metadata
    if (isActions) {
      if (file.lastActions && file.lastActions.length > 0) {
        const action = file.lastActions[0]; // Show most recent action
        const dateFormatted = formatSmartDate(action.date);
        return `${action.action} • ${dateFormatted}`;
      }
      return getFallbackValue('lastActions');
    }

    // Handle location metadata
    if (isLocation) {
      const locationData = file.location || file.originalLocation;
      if (locationData) {
        return (
          <div className="metadata-location">
            <img src={`${process.env.PUBLIC_URL}/assets/folder.svg`} alt="" className="location-icon" />
            <span>{locationData.isRoot ? 'My Drive' : locationData.parentName}</span>
          </div>
        );
      }
      return getFallbackValue('location');
    }

    // Handle regular metadata
    const value = file[key];
    
    // Use fallback if value is missing
    if (!value && value !== 0) {
      return getFallbackValue(key);
    }
    
    // Handle size formatting (folders show "---")
    if (key === 'size') {
      if (file.type === 'folder') return '---';
      if (typeof value === 'number') return formatFileSize(value);
      return getFallbackValue(key);
    }
    
    // Handle owner with avatar
    if (key === 'owner' && value) {
      return (
        <div className="metadata-owner">
          <div className="owner-avatar-placeholder">
            {value.charAt(0).toUpperCase()}
          </div>
          <span>{value}</span>
        </div>
      );
    }
    
    // Handle objects (shouldn't happen, but safety check)
    if (typeof value === 'object') {
      return getFallbackValue(key);
    }
    
    return formatter ? formatter(value) : value;
  };

  return (
    <>
      <div className={`file-row ${isSelected ? 'selected' : ''}`} onClick={handleRowClick} role="button" tabIndex={0}>
        {/* File Icon and Name */}
        <div className="file-row-name">
          <img
            src={getFileIconSrc(file.type)}
            alt=""
            className={`file-row-icon ${file.type === 'folder' ? 'folder-icon' : ''}`}
          />
          <span className="file-name-text">{file.name}</span>
        </div>

        {/* Dynamic Metadata Columns */}
        {metadataConfig.map((config) => (
          <div
            key={config.key}
            className="file-row-metadata"
          >
            {renderMetadataValue(config)}
          </div>
        ))}

        {/* Action Buttons - Driven by single source of truth */}
        <div className="file-row-actions" onClick={(e) => e.stopPropagation()}>
          {rowButtons.map((action) => (
            <ActionButton
              key={action.id}
              iconSrc={action.iconSrc}
              onClick={handleActionClick(action.id)}
              disabled={!action.enabled}
              ariaLabel={action.label}
              className={action.id.includes('star') ? 'star-button' : ''}
              iconClassName={action.id === 'star' || action.id === 'unstar' ? 'star-icon' : action.id === 'share' ? 'share-icon' : ''}
            />
          ))}
          
          <div ref={menuButtonRef}>
            <ActionButton
              iconSrc={`${process.env.PUBLIC_URL}/assets/more_vert.svg`}
              onClick={handleMenuClick}
              ariaLabel="More actions"
              className="menu-button"
            />
          </div>
        </div>
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

export default FileRow;
