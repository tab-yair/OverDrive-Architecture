/**
 * Utility functions for file management components
 */

// Helper function to get icon path
const getIconPath = (filename) => `${process.env.PUBLIC_URL}/assets/${filename}`;

// Export icon paths
export const icons = {
  folder: getIconPath('folder.svg'),
  pdf: getIconPath('pdf.svg'),
  image: getIconPath('image.svg'),
  docs: getIconPath('Docs.svg'),
  starEmpty: getIconPath('star.svg'),
  starFilled: getIconPath('filled_star.svg'),
  download: getIconPath('download.svg'),
  share: getIconPath('share.svg'),
  info: getIconPath('info_outline.svg'),
  more: getIconPath('more_vert.svg'),
  move: getIconPath('drive_file_move_outline.svg'),
  edit: getIconPath('edit.svg'),
  copy: getIconPath('file_copy.svg'),
  delete: getIconPath('delete.svg'),
  restore: getIconPath('restore.svg'),
  deleteForever: getIconPath('delete_forever.svg'),
};

/**
 * Get icon filename based on file type
 * @param {string} type - File type: 'folder', 'pdf', 'image', 'docs'
 * @returns {string} Icon filename
 */
export const getFileIcon = (type) => {
  const iconMap = {
    folder: 'folder.svg',
    pdf: 'pdf.svg',
    image: 'image.svg',
    docs: 'Docs.svg',
  };
  return iconMap[type] || 'Docs.svg';
};

/**
 * Format file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '-';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
};

/**
 * GLOBAL SMART DATE FORMATTER
 * Centralized date formatting used throughout the entire application
 * Provides consistent date display similar to Google Drive
 * 
 * Logic:
 * - Today: Display time only in HH:mm format (e.g., "14:06")
 * - Older: Display in "D MMM" format (e.g., "21 Jan", "6 Jan")
 * 
 * @param {string|Date|number} dateString - Date to format (ISO string, Date object, or timestamp)
 * @returns {string} Formatted date string
 */
export const formatSmartDate = (dateString) => {
  if (!dateString) return '-';
  
  // Handle different input formats
  let dateObj;
  try {
    if (dateString instanceof Date) {
      dateObj = dateString;
    } else if (typeof dateString === 'number') {
      dateObj = new Date(dateString);
    } else {
      dateObj = new Date(dateString);
    }
    
    // Validate the date
    if (isNaN(dateObj.getTime())) {
      return '-';
    }
  } catch (error) {
    return '-';
  }
  
  const now = new Date();
  
  // Check if it's today by comparing year, month, and day
  const isToday = 
    dateObj.getFullYear() === now.getFullYear() &&
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getDate() === now.getDate();
  
  if (isToday) {
    // Today: Show time in HH:mm format
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } else {
    // Older than today: Show "D MMM" format
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
    return `${day} ${month}`;
  }
};

/**
 * Format date to human-readable format (LEGACY - prefer formatSmartDate)
 * @deprecated Use formatSmartDate instead for consistent date formatting
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
export const formatDate = (date) => {
  if (!date) return '-';
  
  const dateObj = new Date(date);
  const now = new Date();
  const diffMs = now - dateObj;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diffMs / (1000 * 60));
      return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
    }
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: dateObj.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
};

/**
 * Get metadata configuration based on page context
 * @param {string} pageContext - Page context: 'MyDrive', 'Shared', 'Recently', 'Trash', 'Starred'
 * @returns {Array} Array of metadata field configurations
 */
export const getMetadataConfig = (pageContext) => {
  const configs = {
    MyDrive: [
      { key: 'owner', label: 'Owner', width: '15%' },
      { key: 'lastModified', label: 'Last Modified', width: '20%', formatter: formatSmartDate },
      { key: 'size', label: 'Size', width: '15%' },
    ],
    Shared: [
      { key: 'sharer', label: 'Shared By', width: '20%', isSharer: true },
      { key: 'shareDate', label: 'Share Date', width: '20%', formatter: formatSmartDate },
    ],
    Recently: [
      { key: 'owner', label: 'Owner', width: '15%' },
      { key: 'lastActions', label: 'Last Actions', width: '25%', isActions: true },
      { key: 'size', label: 'Size', width: '12%' },
      { key: 'location', label: 'Location', width: '18%', isLocation: true },
    ],
    Trash: [
      { key: 'owner', label: 'Owner', width: '15%' },
      { key: 'deletionDate', label: 'Deleted', width: '20%', formatter: formatSmartDate },
      { key: 'size', label: 'Size', width: '12%' },
      { key: 'originalLocation', label: 'Original Location', width: '18%', isLocation: true },
    ],
    Starred: [
      { key: 'owner', label: 'Owner', width: '15%' },
      { key: 'lastModified', label: 'Last Modified', width: '20%', formatter: formatSmartDate },
      { key: 'size', label: 'Size', width: '12%' },
      { key: 'location', label: 'Location', width: '18%', isLocation: true },
    ],
  };
  
  return configs[pageContext] || configs.MyDrive;
};

/**
 * SINGLE SOURCE OF TRUTH for all action logic
 * This function determines the complete state of any action for any context
 * 
 * @param {string} actionId - The action identifier
 * @param {string} fileType - 'folder', 'pdf', 'image', 'docs'
 * @param {string} pageContext - 'MyDrive', 'Shared', 'Recently', 'Trash', 'Starred'
 * @param {string} permissionLevel - 'owner', 'editor', 'viewer'
 * @param {boolean} isOwner - Whether current user owns the file
 * @param {boolean} isStarred - Whether file is currently starred
 * @returns {Object} { isEnabled: boolean, label: string, isVisible: boolean, iconSrc: string, isDanger: boolean }
 */
export const getActionStatus = (actionId, fileType, pageContext, permissionLevel, isOwner = true, isStarred = false) => {
  const isFolder = fileType === 'folder';
  const canEdit = permissionLevel === 'owner' || permissionLevel === 'editor';
  const canShare = permissionLevel === 'owner';
  
  // Action definitions with their base properties
  const actionDefinitions = {
    open: {
      label: 'Open',
      iconSrc: icons.info,
      isDanger: false,
    },
    download: {
      label: 'Download',
      iconSrc: icons.download,
      isDanger: false,
    },
    star: {
      label: 'Add to Starred',
      iconSrc: icons.starEmpty,
      isDanger: false,
    },
    unstar: {
      label: 'Remove from Starred',
      iconSrc: icons.starFilled,
      isDanger: false,
    },
    move: {
      label: 'Move to',
      iconSrc: icons.move,
      isDanger: false,
    },
    share: {
      label: 'Share',
      iconSrc: icons.share,
      isDanger: false,
    },
    rename: {
      label: 'Rename',
      iconSrc: icons.edit,
      isDanger: false,
    },
    copy: {
      label: 'Make a Copy',
      iconSrc: icons.copy,
      isDanger: false,
    },
    details: {
      label: 'Details',
      iconSrc: icons.info,
      isDanger: false,
    },
    trash: {
      label: isOwner ? 'Move to Trash' : 'Remove',
      iconSrc: icons.delete,
      isDanger: true,
    },
    restore: {
      label: 'Restore',
      iconSrc: icons.restore,
      isDanger: false,
    },
    deletePermanently: {
      label: 'Delete Permanently',
      iconSrc: icons.deleteForever,
      isDanger: true,
    },
  };
  
  const action = actionDefinitions[actionId];
  if (!action) {
    return { isEnabled: false, isVisible: false, label: '', iconSrc: '', isDanger: false };
  }
  
  // Trash context: ONLY restore and deletePermanently are visible
  if (pageContext === 'Trash') {
    if (actionId === 'restore') {
      return { ...action, isEnabled: true, isVisible: true };
    }
    if (actionId === 'deletePermanently') {
      return { ...action, isEnabled: canEdit, isVisible: true };
    }
    return { ...action, isEnabled: false, isVisible: false };
  }
  
  // Standard contexts (MyDrive, Shared, Recently, Starred)
  // Apply visibility rules based on file type and action
  let isVisible = true;
  let isEnabled = true;
  
  switch (actionId) {
    case 'open':
      isVisible = !isFolder; // Only files can be opened
      isEnabled = !isFolder;
      break;
      
    case 'download':
      isVisible = true; // Both files and folders
      isEnabled = true;
      break;
      
    case 'star':
      isVisible = !isStarred; // Only show if not already starred
      isEnabled = true;
      break;
      
    case 'unstar':
      isVisible = isStarred; // Only show if currently starred
      isEnabled = true;
      break;
      
    case 'rename':
      isVisible = true; // Both files and folders
      isEnabled = canEdit;
      break;
      
    case 'copy':
      isVisible = !isFolder; // Only files can be copied
      isEnabled = !isFolder;
      break;
      
    case 'share':
      isVisible = true; // Both files and folders
      isEnabled = canShare;
      break;
      
    case 'move':
      isVisible = true; // Both files and folders
      isEnabled = canEdit;
      break;
      
    case 'details':
      isVisible = true; // Both files and folders
      isEnabled = true;
      break;
      
    case 'trash':
      isVisible = true; // Both files and folders
      isEnabled = canEdit;
      break;
      
    default:
      isVisible = false;
      isEnabled = false;
  }
  
  return {
    ...action,
    isEnabled,
    isVisible,
  };
};

/**
 * Get all visible actions for a given context with their complete status
 * This is the ONLY function that should be called to get actions
 * 
 * @param {string} pageContext - Page context
 * @param {Object} file - File object
 * @param {string} permissionLevel - User's permission level
 * @param {boolean} isOwner - Whether current user is the owner
 * @returns {Array} Array of action objects with complete status
 */
export const getAvailableActions = (pageContext, file, permissionLevel, isOwner = true) => {
  const fileType = file.type;
  const isStarred = file.starred || pageContext === 'Starred';
  const isFolder = fileType === 'folder';
  
  // Define the action order for each context
  let actionOrder;
  
  if (pageContext === 'Trash') {
    actionOrder = ['restore', 'deletePermanently'];
  } else if (isFolder) {
    // Folder actions in standard contexts
    actionOrder = ['download', 'rename', 'share', 'move', 'details', 'trash'];
  } else {
    // File actions in standard contexts
    actionOrder = ['open', 'download', 'rename', 'copy', 'share', 'move', 'details', 'trash'];
  }
  
  // Build the action list using the single source of truth
  return actionOrder
    .map(actionId => {
      const status = getActionStatus(actionId, fileType, pageContext, permissionLevel, isOwner, isStarred);
      return {
        id: actionId,
        label: status.label,
        iconSrc: status.iconSrc,
        enabled: status.isEnabled,
        isDanger: status.isDanger,
        isVisible: status.isVisible,
      };
    })
    .filter(action => action.isVisible); // Only return visible actions
};

/**
 * Get action buttons for FileRow (the inline buttons, not the menu)
 * Standard pages: Star, Rename, Download, Share
 * Trash page: Restore, Delete Permanently
 * 
 * @param {string} pageContext - Page context
 * @param {Object} file - File object
 * @param {string} permissionLevel - User's permission level
 * @param {boolean} isOwner - Whether current user is the owner
 * @returns {Array} Array of button action objects
 */
export const getRowActionButtons = (pageContext, file, permissionLevel, isOwner = true) => {
  const fileType = file.type;
  const isStarred = file.starred || pageContext === 'Starred';
  
  let buttonActions;
  
  if (pageContext === 'Trash') {
    // Trash context: Show Restore and Delete Permanently buttons
    buttonActions = ['restore', 'deletePermanently'];
  } else {
    // Standard contexts: Star/Unstar, Rename, Download, Share buttons
    buttonActions = ['star', 'unstar', 'rename', 'download', 'share'];
  }
  
  return buttonActions
    .map(actionId => {
      const status = getActionStatus(actionId, fileType, pageContext, permissionLevel, isOwner, isStarred);
      return {
        id: actionId,
        label: status.label,
        iconSrc: status.iconSrc,
        enabled: status.isEnabled,
        isVisible: status.isVisible,
      };
    })
    .filter(action => action.isVisible);
};

/**
 * BULK ACTIONS: "Most Restrictive" Logic
 * Determines if a bulk action is enabled for a selection of files
 * A button is enabled ONLY if the action is allowed for EVERY item
 * 
 * @param {string} actionId - The action identifier
 * @param {Array} selectedFiles - Array of selected file objects
 * @param {string} pageContext - Page context
 * @param {string} permissionLevel - User's permission level
 * @param {boolean} isOwner - Whether current user owns the files
 * @returns {Object} { isEnabled: boolean, label: string, iconSrc: string, isDanger: boolean }
 */
export const getBulkActionStatus = (actionId, selectedFiles, pageContext, permissionLevel, isOwner = true) => {
  if (!selectedFiles || selectedFiles.length === 0) {
    return { isEnabled: false, label: '', iconSrc: '', isDanger: false };
  }
  
  // Get the base action definition
  const firstFile = selectedFiles[0];
  const baseStatus = getActionStatus(actionId, firstFile.type, pageContext, permissionLevel, isOwner, firstFile.starred);
  
  // Check if action is enabled for ALL selected files (most restrictive logic)
  const isEnabledForAll = selectedFiles.every(file => {
    const fileStatus = getActionStatus(actionId, file.type, pageContext, permissionLevel, isOwner, file.starred);
    return fileStatus.isEnabled && fileStatus.isVisible;
  });
  
  return {
    isEnabled: isEnabledForAll,
    label: baseStatus.label,
    iconSrc: baseStatus.iconSrc,
    isDanger: baseStatus.isDanger,
  };
};

/**
 * Get toolbar actions for multi-selection
 * Returns the action buttons that should appear in the SelectionToolbar
 * 
 * @param {string} pageContext - Page context
 * @param {Array} selectedFiles - Array of selected file objects
 * @param {string} permissionLevel - User's permission level
 * @param {boolean} isOwner - Whether current user owns the files
 * @returns {Array} Array of toolbar action objects
 */
export const getToolbarActions = (pageContext, selectedFiles, permissionLevel, isOwner = true) => {
  if (!selectedFiles || selectedFiles.length === 0) {
    return [];
  }
  
  let actionOrder;
  
  if (pageContext === 'Trash') {
    // Trash: Only Restore and Delete Permanently
    actionOrder = ['restore', 'deletePermanently'];
  } else {
    // Standard pages: Share, Download, Move, Delete/Remove
    actionOrder = ['share', 'download', 'move', 'trash'];
  }
  
  return actionOrder.map(actionId => {
    const status = getBulkActionStatus(actionId, selectedFiles, pageContext, permissionLevel, isOwner);
    return {
      id: actionId,
      label: status.label,
      iconSrc: status.iconSrc,
      enabled: status.isEnabled,
      isDanger: status.isDanger,
    };
  });
};

/**
 * Check if user has permission for an action
 * @param {string} action - Action ID
 * @param {string} permissionLevel - User's permission level
 * @returns {boolean} Whether action is permitted
 */
export const hasPermission = (action, permissionLevel) => {
  const editActions = ['move', 'rename', 'trash', 'delete'];
  const shareActions = ['share'];
  
  if (editActions.includes(action)) {
    return permissionLevel === 'owner' || permissionLevel === 'editor';
  }
  
  if (shareActions.includes(action)) {
    return permissionLevel === 'owner';
  }
  
  return true;
};
