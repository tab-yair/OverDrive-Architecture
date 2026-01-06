/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FILE MANAGEMENT UTILITIES - "ACTION REGISTRY" PATTERN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * SINGLE SOURCE OF TRUTH ARCHITECTURE:
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * ALL actions (Open, Download, Share, Delete, etc.) are defined in ONE place:
 * → ACTION_REGISTRY (line ~350)
 * 
 * Each action contains:
 * - label: Display text
 * - iconSrc: Icon path
 * - isDanger: Red styling flag
 * - isVisible(file, pageContext): Should this action appear?
 * - isEnabled(file, pageContext): Can user click it?
 * 
 * ALL UI components use the SAME registry:
 * - FileRow quick buttons → evaluateAction()
 * - FileCard quick buttons → evaluateAction()
 * - More (⋮) context menu → getAvailableActions()
 * - Selection Toolbar → getBulkMenuActions() + getToolbarActions()
 * 
 * GUARANTEED CONSISTENCY:
 * - No duplicate logic
 * - No conflicts between components
 * - Permissions checked once in ACTION_REGISTRY
 * - Changes in one place affect entire app
 * 
 * ─────────────────────────────────────────────────────────────────────────────
 * GLOBAL DEFAULTS (Automatically inherited by all pages):
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * 1. VIEW MODE:
 *    ✓ Grid View (cards) is the default for ALL pages
 *    ✓ Pages can override by passing viewMode='list' prop
 * 
 * 2. METADATA COLUMNS:
 *    ✓ Owner (with avatar)
 *    ✓ Last Modified (smart date: "14:06" today, "21 Jan" older)
 *    ✓ Location (parent folder)
 *    ✓ File Size
 * 
 * 3. CONTEXT MENU (More ⋮):
 *    ✓ Files: Open, Download, Rename, Copy, Share, Move, Details, Delete
 *    ✓ Folders: Download, Rename, Share, Move, Details, Delete
 * 
 * 4. QUICK ACTIONS (Hover buttons):
 *    ✓ Star/Unstar, Rename, Download, Share
 *    ✓ Three dots (⋮) is permanently visible
 * 
 * 5. SELECTION TOOLBAR:
 *    ✓ Standard: Share, Download, Move, Delete/Remove, More (⋮)
 *    ✓ Actions follow "strictest" permission logic
 * 
 * 6. INTERACTION RULES:
 *    ✓ Enabled items: Grey circle hover background
 *    ✓ Disabled items: Opacity 0.3, pointer-events: none
 * 
 * 7. LAYOUT BEHAVIORS:
 *    ✓ Click empty space → Clear selection
 *    ✓ Selection state managed at layout level
 *    ✓ Google Drive-style clickable gaps (24px padding)
 * 
 * 8. MIXED SELECTION HANDLING:
 *    ✓ INTERSECTION RULE: Actions visible only if ALL items support them
 *    ✓ RESTRICTIVE RULE: Actions enabled only if ALL items have permission
 *    ✓ Example: File + Folder selected → "Open" hidden (folders don't support)
 *    ✓ Example: 1 read-only file → "Delete" disabled for entire selection
 *    ✓ SYNC GUARANTEE: Toolbar buttons are SUBSET of More menu (no conflicts)
 * 
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO ADD A NEW ACTION:
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * 1. Add icon to icons export below
 * 2. Add entry to ACTION_REGISTRY (around line 350)
 * 3. Add to menu configuration (DEFAULT_FILE_ACTIONS or CONTEXT_MENU_OVERRIDES)
 * 4. Done! ALL components automatically use it
 * 
 * Example:
 * ```javascript
 * // Step 1: Add icon
 * export const icons = {
 *   ...existing icons...,
 *   archive: getIconPath('archive.svg'),
 * };
 * 
 * // Step 2: Add to ACTION_REGISTRY
 * const ACTION_REGISTRY = {
 *   ...existing actions...,
 *   archive: {
 *     label: 'Archive',
 *     iconSrc: icons.archive,
 *     isDanger: false,
 *     isVisible: (file, pageContext) => pageContext !== 'Trash',
 *     isEnabled: (file, pageContext) => {
 *       const permissionLevel = file.permissionLevel || 'viewer';
 *       return permissionLevel === 'owner' || permissionLevel === 'editor';
 *     },
 *   },
 * };
 * 
 * // Step 3: Add to menu
 * const DEFAULT_FILE_ACTIONS = [
 *   'open', 'download', 'archive', ... // Add 'archive' here
 * ];
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
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
 * ═══════════════════════════════════════════════════════════════════
 * ARCHITECTURAL REFACTOR: "ACTION REGISTRY" PATTERN
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Philosophy:
 * - ONE centralized registry for ALL actions (ACTION_REGISTRY)
 * - Each action defines its own visibility and permission logic
 * - No duplication - all components use the same registry
 * - Easy to add new actions - just add to registry
 * - Guaranteed consistency across all UI components
 * 
 * ───────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH:
 * ───────────────────────────────────────────────────────────────────
 * 
 * ACTION_REGISTRY contains ALL actions with:
 *   - label: Display text
 *   - iconSrc: Icon path
 *   - isDanger: Red styling flag
 *   - isVisible: Function that determines if action should appear
 *   - isEnabled: Function that determines if action is clickable
 * 
 * All components (FileRow, SelectionToolbar, More menu) use:
 *   evaluateAction(actionId, file, pageContext) → Single file
 *   evaluateBulkAction(actionId, files, pageContext) → Multiple files
 * 
 * ───────────────────────────────────────────────────────────────────
 * HOW TO ADD A NEW ACTION:
 * ───────────────────────────────────────────────────────────────────
 * 
 * 1. Add icon to icons export (top of file)
 * 2. Add entry to ACTION_REGISTRY:
 *    ```
 *    newAction: {
 *      label: 'My Action',
 *      iconSrc: icons.myIcon,
 *      isDanger: false,
 *      isVisible: (file, pageContext) => {
 *        // Return true/false based on file type, context, etc.
 *      },
 *      isEnabled: (file, pageContext) => {
 *        // Return true/false based on permissions
 *      }
 *    }
 *    ```
 * 3. Add to context menu configuration (if needed)
 * 4. Done! All components will automatically use it
 * 
 * ───────────────────────────────────────────────────────────────────
 * CURRENT CONFIGURATION SUMMARY:
 * ───────────────────────────────────────────────────────────────────
 * 
 * DEFAULT (MyDrive, Starred, any new views):
 *   Metadata: [Owner, Last Modified, Location, Size]
 *   File Menu: [Open, Download, Rename, Copy, Share, Move, Details, Delete]
 *   Folder Menu: [Download, Rename, Share, Move, Details, Delete]
 *   Quick Actions: [Star, Rename, Download, Share]
 * 
 * OVERRIDES:
 *   Shared:
 *     Metadata: [Shared By, Share Date]
 *   
 *   Recently:
 *     Metadata: [Owner, Last Activity, Size, Location]
 *   
 *   Trash:
 *     Metadata: [Original Location, Owner, Date Deleted, Size]
 *     Menu: [Restore, Delete Permanently] (same for files & folders)
 *     Quick Actions: [Restore, Delete Permanently]
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * DEFAULT METADATA CONFIGURATION
 * Used by: MyDrive, Starred, and any future views unless overridden
 */
const DEFAULT_METADATA = [
  { key: 'owner', label: 'Owner', width: '15%' },
  { key: 'lastModified', label: 'Last Modified', width: '20%', formatter: formatSmartDate },
  { key: 'location', label: 'Location', width: '18%', isLocation: true },
  { key: 'size', label: 'Size', width: '15%' },
];

/**
 * METADATA OVERRIDES
 * Only specify what's different from the default
 */
const METADATA_OVERRIDES = {
  Shared: [
    { key: 'sharer', label: 'Shared By', width: '20%', isSharer: true },
    { key: 'shareDate', label: 'Share Date', width: '20%', formatter: formatSmartDate },
  ],
  Recently: [
    { key: 'owner', label: 'Owner', width: '15%' },
    { key: 'lastActions', label: 'Last Activity', width: '25%', isActions: true },
    { key: 'size', label: 'Size', width: '12%' },
    { key: 'location', label: 'Location', width: '18%', isLocation: true },
  ],
  Trash: [
    { key: 'originalLocation', label: 'Original Location', width: '18%', isLocation: true },
    { key: 'owner', label: 'Owner', width: '15%' },
    { key: 'deletionDate', label: 'Date Deleted', width: '20%', formatter: formatSmartDate },
    { key: 'size', label: 'Size', width: '12%' },
  ],
};

/**
 * Get metadata configuration based on page context
 * Falls back to DEFAULT if no override exists
 * 
 * @param {string} pageContext - Page context: 'MyDrive', 'Shared', 'Recently', 'Trash', 'Starred'
 * @returns {Array} Array of metadata field configurations
 */
export const getMetadataConfig = (pageContext) => {
  // Return override if it exists, otherwise return default
  return METADATA_OVERRIDES[pageContext] || DEFAULT_METADATA;
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ACTION REGISTRY - SINGLE SOURCE OF TRUTH FOR ALL ACTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This is THE definitive registry of all possible file/folder actions.
 * Every action's visibility and permission logic is defined HERE and ONLY here.
 * 
 * All UI components (FileRow, FileCard, SelectionToolbar, More menu) use this
 * registry through evaluateAction() and evaluateBulkAction().
 * 
 * NO DUPLICATION - guaranteed consistency across the entire application.
 */
const ACTION_REGISTRY = {
  open: {
    label: 'Open',
    iconSrc: icons.info,
    isDanger: false,
    /**
     * Visibility: Only files can be opened (folders cannot)
     * Available in: Standard pages only (not Trash)
     */
    isVisible: (file, pageContext) => {
      if (pageContext === 'Trash') return false;
      return file.type !== 'folder';
    },
    /**
     * Permission: Everyone can open files they have access to
     */
    isEnabled: (file, pageContext) => {
      return file.type !== 'folder';
    },
  },
  
  download: {
    label: 'Download',
    iconSrc: icons.download,
    isDanger: false,
    /**
     * Visibility: Both files and folders
     * Available in: Standard pages only (not Trash)
     */
    isVisible: (file, pageContext) => {
      return pageContext !== 'Trash';
    },
    /**
     * Permission: Everyone can download
     */
    isEnabled: (file, pageContext) => {
      return true;
    },
  },
  
  star: {
    label: 'Add to Starred',
    iconSrc: icons.starEmpty,
    isDanger: false,
    /**
     * Visibility: Only if NOT already starred
     * Available in: Standard pages only (not Trash)
     */
    isVisible: (file, pageContext) => {
      if (pageContext === 'Trash') return false;
      const isStarred = file.starred || pageContext === 'Starred';
      return !isStarred;
    },
    /**
     * Permission: Everyone can star
     */
    isEnabled: (file, pageContext) => {
      return true;
    },
  },
  
  unstar: {
    label: 'Remove from Starred',
    iconSrc: icons.starFilled,
    isDanger: false,
    /**
     * Visibility: Only if currently starred
     * Available in: Standard pages only (not Trash)
     */
    isVisible: (file, pageContext) => {
      if (pageContext === 'Trash') return false;
      const isStarred = file.starred || pageContext === 'Starred';
      return isStarred;
    },
    /**
     * Permission: Everyone can unstar
     */
    isEnabled: (file, pageContext) => {
      return true;
    },
  },
  
  rename: {
    label: 'Rename',
    iconSrc: icons.edit,
    isDanger: false,
    /**
     * Visibility: Both files and folders
     * Available in: Standard pages only (not Trash)
     */
    isVisible: (file, pageContext) => {
      return pageContext !== 'Trash';
    },
    /**
     * Permission: Owner or Editor only
     */
    isEnabled: (file, pageContext) => {
      const permissionLevel = file.permissionLevel || 'viewer';
      return permissionLevel === 'owner' || permissionLevel === 'editor';
    },
  },
  
  copy: {
    label: 'Make a Copy',
    iconSrc: icons.copy,
    isDanger: false,
    /**
     * Visibility: Only files (folders cannot be copied)
     * Available in: Standard pages only (not Trash)
     */
    isVisible: (file, pageContext) => {
      if (pageContext === 'Trash') return false;
      return file.type !== 'folder';
    },
    /**
     * Permission: Everyone can copy files they can access
     */
    isEnabled: (file, pageContext) => {
      return file.type !== 'folder';
    },
  },
  
  share: {
    label: 'Share',
    iconSrc: icons.share,
    isDanger: false,
    /**
     * Visibility: Both files and folders
     * Available in: Standard pages only (not Trash)
     */
    isVisible: (file, pageContext) => {
      return pageContext !== 'Trash';
    },
    /**
     * Permission: Owner only
     */
    isEnabled: (file, pageContext) => {
      const permissionLevel = file.permissionLevel || 'viewer';
      return permissionLevel === 'owner';
    },
  },
  
  move: {
    label: 'Move to',
    iconSrc: icons.move,
    isDanger: false,
    /**
     * Visibility: Both files and folders
     * Available in: Standard pages only (not Trash)
     */
    isVisible: (file, pageContext) => {
      return pageContext !== 'Trash';
    },
    /**
     * Permission: Owner or Editor only
     */
    isEnabled: (file, pageContext) => {
      const permissionLevel = file.permissionLevel || 'viewer';
      return permissionLevel === 'owner' || permissionLevel === 'editor';
    },
  },
  
  details: {
    label: 'Details',
    iconSrc: icons.info,
    isDanger: false,
    /**
     * Visibility: Both files and folders
     * Available in: Standard pages only (not Trash)
     */
    isVisible: (file, pageContext) => {
      return pageContext !== 'Trash';
    },
    /**
     * Permission: Everyone can view details
     */
    isEnabled: (file, pageContext) => {
      return true;
    },
  },
  
  trash: {
    label: (file) => {
      const isOwner = file.isOwner !== undefined ? file.isOwner : true;
      return isOwner ? 'Move to Trash' : 'Remove';
    },
    iconSrc: icons.delete,
    isDanger: true,
    /**
     * Visibility: Both files and folders
     * Available in: Standard pages only (not Trash)
     */
    isVisible: (file, pageContext) => {
      return pageContext !== 'Trash';
    },
    /**
     * Permission: Owner or Editor only
     */
    isEnabled: (file, pageContext) => {
      const permissionLevel = file.permissionLevel || 'viewer';
      return permissionLevel === 'owner' || permissionLevel === 'editor';
    },
  },
  
  restore: {
    label: 'Restore',
    iconSrc: icons.restore,
    isDanger: false,
    /**
     * Visibility: Trash page only
     */
    isVisible: (file, pageContext) => {
      return pageContext === 'Trash';
    },
    /**
     * Permission: Everyone can restore
     */
    isEnabled: (file, pageContext) => {
      return true;
    },
  },
  
  deletePermanently: {
    label: 'Delete Permanently',
    iconSrc: icons.deleteForever,
    isDanger: true,
    /**
     * Visibility: Trash page only
     */
    isVisible: (file, pageContext) => {
      return pageContext === 'Trash';
    },
    /**
     * Permission: Owner or Editor only
     */
    isEnabled: (file, pageContext) => {
      const permissionLevel = file.permissionLevel || 'viewer';
      return permissionLevel === 'owner' || permissionLevel === 'editor';
    },
  },
};

/**
 * Evaluate an action for a SINGLE file
 * This is the ONLY function that determines action availability
 * 
 * @param {string} actionId - Action identifier (e.g., 'share', 'download')
 * @param {Object} file - File object with type, permissionLevel, isOwner, starred
 * @param {string} pageContext - Page context ('MyDrive', 'Shared', 'Trash', etc.)
 * @returns {Object} { isVisible: boolean, isEnabled: boolean, label: string, iconSrc: string, isDanger: boolean }
 */
export const evaluateAction = (actionId, file, pageContext) => {
  const action = ACTION_REGISTRY[actionId];
  
  if (!action) {
    return { isVisible: false, isEnabled: false, label: '', iconSrc: '', isDanger: false };
  }
  
  const isVisible = action.isVisible(file, pageContext);
  const isEnabled = action.isEnabled(file, pageContext);
  const label = typeof action.label === 'function' ? action.label(file) : action.label;
  
  return {
    isVisible,
    isEnabled,
    label,
    iconSrc: action.iconSrc,
    isDanger: action.isDanger,
  };
};

/**
 * Evaluate an action for MULTIPLE files (bulk selection)
 * 
 * Implements "Most Restrictive" logic:
 * - INTERSECTION RULE: Visible only if visible for ALL files
 * - RESTRICTIVE RULE: Enabled only if enabled for ALL files
 * 
 * @param {string} actionId - Action identifier
 * @param {Array} files - Array of file objects
 * @param {string} pageContext - Page context
 * @returns {Object} { isVisible: boolean, isEnabled: boolean, label: string, iconSrc: string, isDanger: boolean }
 */
export const evaluateBulkAction = (actionId, files, pageContext) => {
  if (!files || files.length === 0) {
    return { isVisible: false, isEnabled: false, label: '', iconSrc: '', isDanger: false };
  }
  
  // Get the base properties from the first file
  const firstFile = files[0];
  const baseEval = evaluateAction(actionId, firstFile, pageContext);
  
  // Check if action is visible and enabled for ALL files
  let isVisibleForAll = baseEval.isVisible;
  let isEnabledForAll = baseEval.isEnabled;
  
  for (let i = 1; i < files.length; i++) {
    const fileEval = evaluateAction(actionId, files[i], pageContext);
    
    if (!fileEval.isVisible) {
      isVisibleForAll = false;
      break; // If not visible for any file, stop checking
    }
    
    if (!fileEval.isEnabled) {
      isEnabledForAll = false;
      // Continue checking visibility for remaining files
    }
  }
  
  return {
    isVisible: isVisibleForAll,
    isEnabled: isEnabledForAll,
    label: baseEval.label,
    iconSrc: baseEval.iconSrc,
    isDanger: baseEval.isDanger,
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════
 * MENU & ACTION CONFIGURATIONS
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * DEFAULT CONTEXT MENU (More ⋮) - Used unless overridden
 */
const DEFAULT_FILE_ACTIONS = ['open', 'download', 'rename', 'copy', 'share', 'move', 'details', 'trash'];
const DEFAULT_FOLDER_ACTIONS = ['download', 'rename', 'share', 'move', 'details', 'trash'];

/**
 * DEFAULT QUICK ACTIONS (Hover Icons) - Used unless overridden
 */
const DEFAULT_QUICK_ACTIONS = ['star', 'unstar', 'rename', 'download', 'share'];

/**
 * CONTEXT MENU OVERRIDES
 * Only Trash has a different menu - everything else uses default
 */
const CONTEXT_MENU_OVERRIDES = {
  Trash: {
    // In Trash, both files and folders get the same actions
    file: ['restore', 'deletePermanently'],
    folder: ['restore', 'deletePermanently'],
  },
};

/**
 * QUICK ACTIONS OVERRIDES
 * Only Trash has different quick actions
 */
const QUICK_ACTIONS_OVERRIDES = {
  Trash: ['restore', 'deletePermanently'],
};

/**
 * Get all visible actions for a single file (used by FileRow/FileCard More menu)
 * 
 * @param {string} pageContext - Page context
 * @param {Object} file - File object
 * @returns {Array} Array of action objects with complete status
 */
export const getAvailableActions = (pageContext, file) => {
  const isFolder = file.type === 'folder';
  
  // Check for context menu override (e.g., Trash)
  let actionOrder;
  
  if (CONTEXT_MENU_OVERRIDES[pageContext]) {
    // Use override for this specific context
    actionOrder = isFolder 
      ? CONTEXT_MENU_OVERRIDES[pageContext].folder
      : CONTEXT_MENU_OVERRIDES[pageContext].file;
  } else {
    // Use default menu based on file type
    actionOrder = isFolder ? DEFAULT_FOLDER_ACTIONS : DEFAULT_FILE_ACTIONS;
  }
  
  // Build the action list using ACTION_REGISTRY
  return actionOrder
    .map(actionId => {
      const status = evaluateAction(actionId, file, pageContext);
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
 * Get action buttons for FileRow (the inline quick actions, not the menu)
 * 
 * Standard pages: Star, Rename, Download, Share
 * Trash page: Restore, Delete Permanently
 * 
 * @param {string} pageContext - Page context
 * @param {Object} file - File object
 * @returns {Array} Array of button action objects
 */
export const getRowActionButtons = (pageContext, file) => {
  // Check for quick actions override (e.g., Trash)
  const buttonActions = QUICK_ACTIONS_OVERRIDES[pageContext] || DEFAULT_QUICK_ACTIONS;
  
  return buttonActions
    .map(actionId => {
      const status = evaluateAction(actionId, file, pageContext);
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
 * Get context menu actions for multi-selection (More ⋮ menu)
 * Handles mixed selection with Intersection Rule
 * 
 * When multiple items are selected:
 * - Only shows actions that ALL items support (Intersection Rule)
 * - Enables actions only if ALL items have permission (Restrictive Rule)
 * 
 * Example:
 * - Selection: 1 Folder + 1 File
 * - Result: "Open" is hidden (folders don't support it)
 *          "Download" is shown (both support it)
 * 
 * @param {string} pageContext - Page context
 * @param {Array} selectedFiles - Array of selected file objects
 * @returns {Array} Array of context menu action objects
 */
export const getBulkMenuActions = (pageContext, selectedFiles) => {
  if (!selectedFiles || selectedFiles.length === 0) {
    return [];
  }
  
  // Determine the full set of possible actions based on context
  let candidateActions;
  
  if (pageContext === 'Trash') {
    // Trash: Same actions for all items regardless of type
    candidateActions = ['restore', 'deletePermanently'];
  } else {
    // Standard contexts: Combine all possible actions
    // We'll filter based on what ALL items support
    candidateActions = [
      'open',
      'download',
      'rename',
      'copy',
      'share',
      'move',
      'details',
      'trash',
    ];
  }
  
  // Apply Intersection Rule: Only include actions that ALL files support
  return candidateActions
    .map(actionId => {
      const status = evaluateBulkAction(actionId, selectedFiles, pageContext);
      return {
        id: actionId,
        label: status.label,
        iconSrc: status.iconSrc,
        enabled: status.isEnabled,
        visible: status.isVisible,
        isDanger: status.isDanger,
      };
    })
    .filter(action => action.visible); // Only return actions visible for ALL items
};

/**
 * Get toolbar actions for multi-selection
 * Returns the action buttons that should appear in the SelectionToolbar
 * 
 * Implements "Most Restrictive" logic:
 * - Actions are only visible if they apply to ALL selected items (Intersection Rule)
 * - Actions are only enabled if ALL selected items have permission (Restrictive Rule)
 * 
 * NOTE: Toolbar actions are a SUBSET of menu actions (shown in More ⋮)
 * The full set is available in getBulkMenuActions()
 * 
 * @param {string} pageContext - Page context
 * @param {Array} selectedFiles - Array of selected file objects (each with type, permissionLevel, isOwner)
 * @returns {Array} Array of toolbar action objects with visibility and enabled status
 */
export const getToolbarActions = (pageContext, selectedFiles) => {
  if (!selectedFiles || selectedFiles.length === 0) {
    return [];
  }
  
  // Get ALL possible actions from the menu
  const allMenuActions = getBulkMenuActions(pageContext, selectedFiles);
  
  // Define which actions appear as quick buttons in the toolbar
  let priorityActionIds;
  
  if (pageContext === 'Trash') {
    // Trash: Only Restore and Delete Permanently as quick buttons
    priorityActionIds = ['restore', 'deletePermanently'];
  } else {
    // Standard pages: Most common actions as quick buttons
    // Others available via More (⋮) menu
    priorityActionIds = ['share', 'download', 'move', 'trash'];
  }
  
  // Return only the priority actions that are also available in the menu
  // This ensures toolbar is always a subset of menu (no sync issues)
  return allMenuActions.filter(action => priorityActionIds.includes(action.id));
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
