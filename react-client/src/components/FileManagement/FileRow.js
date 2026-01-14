import React, { useState, useRef } from 'react';
import ActionButton from './ActionButton';
import FileActionMenu from './FileActionMenu';
import { getMetadataConfig, getAvailableActions, getRowActionButtons, formatFileSize, formatSmartDate, formatRecentActivity, getFallbackValue } from './fileUtils';
import { useAuth } from '../../context/AuthContext';
import './FileRow.css';

/**
 * FileRow Component - Displays a file/folder as a row in list view
 * @param {Object} props
 * @param {Object} props.file - File data object
 * @param {string} props.pageContext - Current page context
 * @param {string} props.permissionLevel - User's permission level
 * @param {boolean} props.isOwner - Whether current user is the owner
 * @param {boolean} props.isSelected - Whether this file is selected
 * @param {number} props.selectedCount - Number of selected files
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
  selectedCount = 0,
  onSelect,
  onAction, 
  onClick,
  onDoubleClick
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuButtonRef = useRef(null);
  const { user } = useAuth();

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
    
    return iconPath;
  };

  const metadataConfig = getMetadataConfig(pageContext);
  
  // CRITICAL: Use file-specific permission level, not global prop
  // For Shared page: file.sharedPermissionLevel or file.permissionLevel
  // For other pages: file.permissionLevel or fallback to prop
  const effectivePermissionLevel = file.sharedPermissionLevel || file.permissionLevel || permissionLevel;
  
  // CRITICAL: Row/Card context menu is ALWAYS evaluated for single item (selectedCount=1)
  // It represents actions for THIS specific file, independent of global selection state
  // Only SelectionToolbar should use actual selectedCount for bulk operations
  // Always include permissionLevel to ensure correct permission evaluation (especially for owners)
  const availableActions = getAvailableActions(pageContext, file, 1, effectivePermissionLevel);
  
  // Get row buttons using the ACTION_REGISTRY
  const rowButtons = getRowActionButtons(pageContext, file, effectivePermissionLevel);

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
    
    // No local state update needed - FilesContext will update and trigger re-render
    if (onAction) {
      onAction(actionId, file);
    } else {
      console.warn('⚠️ FileRow: onAction handler is missing!');
    }
  };

  const handleActionSelected = (actionId) => {
    // No local state update needed - FilesContext will update and trigger re-render
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
    
    // If it's a normal click (not Ctrl/Cmd), also call onClick if provided
    if (!event.ctrlKey && !event.metaKey && onClick) {
      onClick(file);
    }
  };

  const handleRowDoubleClick = (event) => {
    event.stopPropagation();
    
    // Double-click opens the file/folder
    if (onDoubleClick) {
      onDoubleClick(file);
    }
  };

  // Remove handleCheckboxClick - no longer needed

  const renderMetadataValue = (config) => {
    const { key, formatter, isSharer, isActions, isLocation } = config;

    // Handle sharer metadata
    if (isSharer) {
      if (file.sharer) {
        return (
          <div className="metadata-sharer" title={file.sharer.username}>
            {file.sharer.avatarUrl ? (
              <img src={file.sharer.avatarUrl} alt="" className="sharer-avatar" />
            ) : (
              <div className="sharer-avatar-placeholder">
                {file.sharer.username.charAt(0).toUpperCase()}
              </div>
            )}
            <span>{file.sharer.username}</span>
          </div>
        );
      }
      return getFallbackValue('sharer');
    }

    // Handle actions metadata
    if (isActions) {
      if (file.lastActions && file.lastActions.length > 0) {
        const action = file.lastActions[0]; // Show most recent action
        return formatRecentActivity(action);
      }

      // Fallback: use lastEditedAt / lastViewedAt if lastActions not provided by server
      // Use the MOST RECENT action, not preference for Edit
      if (file.lastEditedAt || file.lastViewedAt) {
        const editDate = file.lastEditedAt ? new Date(file.lastEditedAt).getTime() : 0;
        const viewDate = file.lastViewedAt ? new Date(file.lastViewedAt).getTime() : 0;
        const mostRecentIsEdit = editDate >= viewDate && editDate > 0;
        
        const derivedAction = {
          date: mostRecentIsEdit ? file.lastEditedAt : file.lastViewedAt,
          action: mostRecentIsEdit ? 'Edit' : 'Open',
        };
        return formatRecentActivity(derivedAction);
      }

      return getFallbackValue('lastActions');
    }

    // Handle location metadata
    if (isLocation) {
      const locationData = file.location || file.originalLocation;
      if (locationData) {
        const locationName = locationData.isRoot ? 'My Drive' : locationData.parentName;
        return (
          <div className="metadata-location" title={locationName}>
            <img src={`${process.env.PUBLIC_URL}/assets/folder.svg`} alt="" className="location-icon" />
            <span>{locationName}</span>
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

    // Handle date formatting with custom formatter
    if (formatter && value) {
      return formatter(value);
    }
    
    // Handle owner with avatar (using owner object from API, same as sharer)
    if (key === 'owner') {
      // Check if current user is owner
      const isCurrentUserOwner = file.ownerId === user?.id;
      
      // Get display name and avatar
      const displayName = isCurrentUserOwner 
        ? 'Me' 
        : (file.owner?.username || 'Unknown');
      
      const avatarUrl = isCurrentUserOwner 
        ? user?.profileImage 
        : file.owner?.avatarUrl;
      
      return (
        <div className="metadata-owner" title={displayName}>
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={displayName}
              className="owner-avatar"
            />
          ) : (
            <div className="owner-avatar-placeholder">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span>{displayName}</span>
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
      <div 
        className={`file-row ${isSelected ? 'selected' : ''}`} 
        onClick={handleRowClick}
        onDoubleClick={handleRowDoubleClick}
        role="button" 
        tabIndex={0}
      >
        {/* File Icon and Name */}
        <div className="file-row-name">
          <img
            src={getFileIconSrc(file.type)}
            alt=""
            className={`file-row-icon ${file.type === 'folder' ? 'folder-icon' : ''}`}
          />
          <span className="file-name-text" title={file.name}>{file.name}</span>
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
        <div className="file-row-actions" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
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
