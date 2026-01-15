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
const getIconPath = (filename) => {
  const path = `${process.env.PUBLIC_URL}/assets/${filename}`;
  return path;
};

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
 * - Older: Display in "MMM D, YYYY" format (e.g., "Jan 6, 2025")
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
    // Older than today: Show "MMM D, YYYY" format
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
    const year = dateObj.getFullYear();
    return `${month} ${day}, ${year}`;
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
 * Format date to full format for details view
 * Always shows full date with year
 * Format: "D MMM YYYY" (e.g., "7 Jan 2026")
 * 
 * @param {string|Date|number} dateString - Date to format
 * @returns {string} Formatted date string with year
 */
export const formatFullDate = (dateString) => {
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
  
  // Always show full date with year
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
  const year = dateObj.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Helper: Check if two dates are on the same calendar day
 */
const isSameCalendarDay = (a, b) => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

/**
 * Helper: Normalize recent action label to "Open" or "Edit"
 */
const normalizeRecentActionLabel = (rawAction) => {
  const action = String(rawAction || '').trim().toLowerCase();
  if (!action) return 'Open';

  if (
    action === 'open' ||
    action === 'opened' ||
    action === 'view' ||
    action === 'viewed' ||
    action.includes('open') ||
    action.includes('view')
  ) {
    return 'Open';
  }

  return 'Edit';
};

/**
 * Format Recent Activity for display
 * - Today: "HH:mm · Open"
 * - Before today: "Jan 6, 2026 · Edit" (always includes year)
 */
export const formatRecentActivity = (actionObj) => {
  if (!actionObj || !actionObj.date) return '---';

  const dateObj = new Date(actionObj.date);
  if (isNaN(dateObj.getTime())) return '---';

  const now = new Date();
  const actionLabel = normalizeRecentActionLabel(actionObj.action);

  const datePart = isSameCalendarDay(dateObj, now)
    ? dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return `${datePart} · ${actionLabel}`;
};

/**
 * ═══════════════════════════════════════════════════════════════════
 * LOCATION DISPLAY - SINGLE SOURCE OF TRUTH (SSOT)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Unified function for calculating location display text.
 * Used by both FileRow and InfoSidebar to ensure consistency.
 * 
 * Rules:
 * 1. If file is at root (parentId = null): "My Drive"
 * 2. If user has no access to parent folder: "Shared with me"
 * 3. Otherwise: Show parent folder name
 * 
 * @param {Object} file - File object with location data and canAccessParent flag
 * @returns {string} Display text for location
 */
export const getLocationDisplayName = (file) => {
  // If file is at root level
  const locationData = file.location || file.originalLocation;
  if (!locationData || locationData.isRoot) {
    return 'My Drive';
  }

  // If no access to parent folder, show "Shared with me"
  if (file.parentId && !file.canAccessParent) {
    return 'Shared with me';
  }

  // Otherwise show parent folder name
  return locationData.parentName || 'Unknown Folder';
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
 *   Recent:
 *     Metadata: [Owner, RECENT Activity, Size, Location]
 *   
 *   Trash:
 *     Metadata: [Original Location, Owner, Size]
 *     Menu: [Restore, Delete Permanently] (same for files & folders)
 *     Quick Actions: [Restore, Delete Permanently]
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * DEFAULT METADATA CONFIGURATION
 * Used by: MyDrive, Starred, and any future views unless overridden
 * 
 * NOTE: Field keys MUST match the FilesContext schema (from backend API):
 * - modifiedAt (not lastModified)
 * - createdAt (not created)
 * - ownerId (not owner - but we display owner name)
 */
const DEFAULT_METADATA = [
  { key: 'owner', label: 'Owner', width: '12%', cssVar: '--col-width-1' },
  { key: 'modifiedAt', label: 'Last Modified', width: '18%', cssVar: '--col-width-2', formatter: formatSmartDate },
  { key: 'location', label: 'Location', width: '15%', cssVar: '--col-width-3', isLocation: true },
  { key: 'size', label: 'Size', width: '12%', cssVar: '--col-width-4' },
];

/**
 * METADATA OVERRIDES
 * Only specify what's different from the default
 * 
 * NOTE: All field keys aligned with FilesContext/API schema
 */
const METADATA_OVERRIDES = {
  Shared: [
    { key: 'sharer', label: 'Shared By', width: '18%', cssVar: '--col-width-1', isSharer: true },
    { key: 'shareDate', label: 'Share Date', width: '18%', cssVar: '--col-width-2', formatter: formatSmartDate },
  ],
  Recent: [
    { key: 'owner', label: 'Owner', width: '12%', cssVar: '--col-width-1' },
    { key: 'lastActions', label: 'Recent Activity', width: '22%', cssVar: '--col-width-2', isActions: true },
    { key: 'size', label: 'Size', width: '10%', cssVar: '--col-width-3' },
    { key: 'location', label: 'Location', width: '15%', cssVar: '--col-width-4', isLocation: true },
  ],
  Trash: [
    { key: 'owner', label: 'Owner', width: '12%', cssVar: '--col-width-2' },
    { key: 'size', label: 'Size', width: '10%', cssVar: '--col-width-4' },
    { key: 'originalLocation', label: 'Original Location', width: '15%', cssVar: '--col-width-1', isLocation: true },
  ],
  Storage: [
    { key: 'size', label: 'Size', width: '150px', cssVar: '--col-width-1' },
  ],
};

/**
 * Get metadata configuration based on page context
 * Falls back to DEFAULT if no override exists
 * 
 * @param {string} pageContext - Page context: 'MyDrive', 'Shared', 'Recent', 'Trash', 'Starred'
 * @returns {Array} Array of metadata field configurations
 */
export const getMetadataConfig = (pageContext) => {
  // Return override if it exists, otherwise return default
  return METADATA_OVERRIDES[pageContext] || DEFAULT_METADATA;
};

/**
 * Apply metadata column widths as CSS variables
 * This ensures perfect alignment between headers and rows
 * 
 * @param {string} pageContext - Page context to determine which metadata config to use
 */
export const applyColumnWidths = (pageContext, targetElement) => {
  const config = getMetadataConfig(pageContext);
  const root = (targetElement && targetElement.style) ? targetElement : document.documentElement;

  // Actions column must fit ALL row action buttons + the menu button.
  // ActionButton is 36px wide; gap is 4px.
  // Typical row: 4 quick actions + 1 menu => ~196px.
  // Use a stable width so alignment is identical across rows/pages.
  root.style.setProperty('--actions-col-width', '208px');

  // Build Grid Template Dynamically based on active columns
  // Structure: Name (Flexible) | Metadata (Fixed Range) | Actions (Fixed)
  // Name is flexible (1fr) so the Actions column always reaches the far right.
  let template = 'minmax(250px, 1fr)';
  config.forEach(() => {
    template += ' minmax(120px, 180px)';
  });
  template += ' var(--actions-col-width, 208px)';

  root.style.setProperty('--file-grid-template', template);

  // Still set individual widths (legacy/mobile usage)
  config.forEach((field, index) => {
    if (field.cssVar) {
      root.style.setProperty(field.cssVar, field.width);
    }
  });
};

/**
 * Get fallback value for missing metadata
 * 
 * NOTE: Keys aligned with FilesContext schema
 * 
 * @param {string} key - Metadata key
 * @returns {string} Fallback value
 */
export const getFallbackValue = (key) => {
  const fallbacks = {
    owner: 'Me',
    modifiedAt: '---',
    createdAt: '---',
    location: 'My Drive',
    size: '---',
    sharer: '---',
    shareDate: '---',
    lastActions: '---',
    deletionDate: '---',
    originalLocation: '---',
  };
  
  return fallbacks[key] || '---';
};

/**
 * Categorize files into time-based groups for Recent/Shared views
 * 
 * Groups:
 * - Today: Same calendar day
 * - Yesterday: Previous calendar day
 * - Earlier this week: 2-6 days ago
 * - Last week: 7-14 days ago
 * - Last month: 15-30 days ago
 * - Older: More than 30 days ago
 * 
 * @param {Array} files - Array of file objects
 * @param {string} dateField - Which date field to use ('lastModified', 'shareDate', 'lastActions', 'activity')
 * @returns {Object} Grouped files: { Today: [...], Yesterday: [...], ... }
 */
export const groupFilesByTime = (files, dateField = 'lastModified') => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const groups = {
    Today: [],
    Yesterday: [],
    'Earlier this week': [],
    'Last week': [],
    'Last month': [],
    Older: [],
  };

  files.forEach(file => {
    // Get the date to use for grouping
    let fileDate = null;
    if (dateField === 'activity') {
      // Use the MOST RECENT of lastEditedAt or lastViewedAt (no preference)
      const editDate = file.lastEditedAt ? new Date(file.lastEditedAt).getTime() : 0;
      const viewDate = file.lastViewedAt ? new Date(file.lastViewedAt).getTime() : 0;
      const mostRecent = Math.max(editDate, viewDate);
      fileDate = mostRecent > 0 ? new Date(mostRecent) : null;
    } else if (dateField === 'lastActions' && file.lastActions && file.lastActions.length > 0) {
      fileDate = new Date(file.lastActions[0].date);
    } else if (dateField === 'shareDate' && file.shareDate) {
      fileDate = new Date(file.shareDate);
    } else if (dateField === 'lastModified' && file.lastModified) {
      fileDate = new Date(file.lastModified);
    }

    if (!fileDate) {
      groups.Older.push(file);
      return;
    }

    const fileDateStart = new Date(fileDate.getFullYear(), fileDate.getMonth(), fileDate.getDate());

    if (fileDateStart.getTime() === today.getTime()) {
      groups.Today.push(file);
    } else if (fileDateStart.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(file);
    } else if (fileDateStart > oneWeekAgo && fileDateStart < today) {
      groups['Earlier this week'].push(file);
    } else if (fileDateStart > twoWeeksAgo && fileDateStart <= oneWeekAgo) {
      groups['Last week'].push(file);
    } else if (fileDateStart > thirtyDaysAgo && fileDateStart <= twoWeeksAgo) {
      groups['Last month'].push(file);
    } else {
      groups.Older.push(file);
    }
  });

  // Sort files within each group by date (most recent first)
  Object.keys(groups).forEach(groupKey => {
    groups[groupKey].sort((a, b) => {
      let dateA = null;
      let dateB = null;

      if (dateField === 'activity') {
        // Use the MOST RECENT of lastEditedAt or lastViewedAt (no preference)
        const aEdit = a.lastEditedAt ? new Date(a.lastEditedAt).getTime() : 0;
        const aView = a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0;
        dateA = new Date(Math.max(aEdit, aView) || 0);
        
        const bEdit = b.lastEditedAt ? new Date(b.lastEditedAt).getTime() : 0;
        const bView = b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0;
        dateB = new Date(Math.max(bEdit, bView) || 0);
      } else if (dateField === 'lastActions') {
        dateA = a.lastActions && a.lastActions.length > 0 ? new Date(a.lastActions[0].date) : new Date(0);
        dateB = b.lastActions && b.lastActions.length > 0 ? new Date(b.lastActions[0].date) : new Date(0);
      } else if (dateField === 'shareDate') {
        dateA = a.shareDate ? new Date(a.shareDate) : new Date(0);
        dateB = b.shareDate ? new Date(b.shareDate) : new Date(0);
      } else {
        dateA = a.lastModified ? new Date(a.lastModified) : new Date(0);
        dateB = b.lastModified ? new Date(b.lastModified) : new Date(0);
      }

      return dateB.getTime() - dateA.getTime(); // Newest first
    });
  });

  return groups;
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
     * Visibility: Only files (folders open via double-click only)
     * Available in: Standard pages only (not Trash)
     */
    isVisible: (file, pageContext, permissionLevel) => {
      if (pageContext === 'Trash') return false;
      return file.type !== 'folder';
    },
    /**
     * Permission: Everyone with READ access can open (all permission levels)
     * Disabled for multiple selection (can only open one file at a time)
     */
    isEnabled: (file, pageContext, selectedCount = 1, permissionLevel = 'VIEWER') => {
      if (selectedCount > 1) return false;
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
    isVisible: (file, pageContext, permissionLevel) => {
      return pageContext !== 'Trash';
    },
    /**
     * Permission: Everyone with READ access can download (all permission levels)
     */
    isEnabled: (file, pageContext, selectedCount = 1, permissionLevel = 'VIEWER') => {
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
    isVisible: (file, pageContext, permissionLevel) => {
      if (pageContext === 'Trash') return false;
      // Use isStarred (schema-aligned with FilesContext)
      const isStarred = file.isStarred || pageContext === 'Starred';
      return !isStarred;
    },
    /**
     * Permission: Everyone with READ access can star (all permission levels)
     * Starring is a user-specific action (README line 1789)
     */
    isEnabled: (file, pageContext, selectedCount = 1, permissionLevel = 'VIEWER') => {
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
    isVisible: (file, pageContext, permissionLevel) => {
      if (pageContext === 'Trash') return false;
      // Use isStarred (schema-aligned with FilesContext)
      const isStarred = file.isStarred || pageContext === 'Starred';
      return isStarred;
    },
    /**
     * Permission: Everyone with READ access can unstar (all permission levels)
     * Starring is a user-specific action (README line 1789)
     */
    isEnabled: (file, pageContext, selectedCount = 1, permissionLevel = 'VIEWER') => {
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
    isVisible: (file, pageContext, permissionLevel) => {
      return pageContext !== 'Trash';
    },
    /**
     * Permission: EDITOR or OWNER only (README Permission.js line 20: canWrite: true)
     * Disabled for multiple selection (can only rename one item at a time)
     * CRITICAL: Uses permissionLevel parameter (Single Source of Truth)
     */
    isEnabled: (file, pageContext, selectedCount = 1, permissionLevel = 'VIEWER') => {
      if (selectedCount > 1) return false;
      const level = permissionLevel?.toUpperCase();
      return level === 'OWNER' || level === 'EDITOR';
    },
  },
  
  copy: {
    label: 'Make a Copy',
    iconSrc: icons.copy,
    isDanger: false,
    /**
     * Visibility: Only files (folders cannot be copied per README line 1857)
     * Available in: Standard pages only (not Trash)
     */
    isVisible: (file, pageContext, permissionLevel) => {
      if (pageContext === 'Trash') return false;
      return file.type !== 'folder';
    },
    /**
     * Permission: Everyone with READ access can copy (README line 1863: "at least VIEWER")
     * README line 1867: "The user performing the copy becomes the OWNER of the new file"
     */
    isEnabled: (file, pageContext, selectedCount = 1, permissionLevel = 'VIEWER') => {
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
    isVisible: (file, pageContext, permissionLevel) => {
      return pageContext !== 'Trash';
    },
    /**
     * Permission: EDITOR or OWNER only (README Permission.js line 20: canShare: true for EDITOR)
     * README line 1743: EDITOR can share but only grant VIEWER/EDITOR, not OWNER
     * README line 1768: Only current OWNER can transfer ownership via PATCH permission
     */
    isEnabled: (file, pageContext, selectedCount = 1, permissionLevel = 'VIEWER') => {
      const level = permissionLevel?.toUpperCase();
      const canShare = level === 'OWNER' || level === 'EDITOR';
      
      return canShare;
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
    isVisible: (file, pageContext, permissionLevel) => {
      return pageContext !== 'Trash';
    },
    /**
     * Permission: EDITOR or OWNER only (README Permission.js line 20: canWrite: true)
     * Move is a PATCH operation changing parentId (README line 67)
     */
    isEnabled: (file, pageContext, selectedCount = 1, permissionLevel = 'VIEWER') => {
      const level = permissionLevel?.toUpperCase();
      return level === 'OWNER' || level === 'EDITOR';
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
    isVisible: (file, pageContext, permissionLevel) => {
      return pageContext !== 'Trash';
    },
    /**
     * Permission: Everyone with READ access can view details (all permission levels)
     * Disabled for multiple selection (can only view details of one item at a time)
     */
    isEnabled: (file, pageContext, selectedCount = 1, permissionLevel = 'VIEWER') => {
      // Enable when zero or one item is selected; disable only for multi-selection
      return selectedCount <= 1;
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
    isVisible: (file, pageContext, permissionLevel) => {
      return pageContext !== 'Trash';
    },
    /**
     * Permission: OWNER, EDITOR, or VIEWER - all can DELETE but with different effects:
     * - OWNER: Sets isTrashed=true globally (README line 70)
     * - EDITOR/VIEWER: Sets isHiddenForUser=true locally (README line 70)
     * All permission levels can remove files from their view
     */
    isEnabled: (file, pageContext, selectedCount = 1, permissionLevel = 'VIEWER') => {
      // Everyone with access can delete/remove from their view
      return true;
    },
  },
  
  restore: {
    label: 'Restore',
    iconSrc: icons.restore,
    isDanger: false,
    /**
     * Visibility: Trash page only
     */
    isVisible: (file, pageContext, permissionLevel) => {
      return pageContext === 'Trash';
    },
    /**
     * Permission: OWNER only (README line 71: "Owner only")
     * Restore from trash is a privileged operation that affects all users
     */
    isEnabled: (file, pageContext, selectedCount = 1, permissionLevel = 'VIEWER') => {
      const level = permissionLevel?.toUpperCase();
      return level === 'OWNER';
    },
  },
  
  deletePermanently: {
    label: 'Delete Permanently',
    iconSrc: icons.deleteForever,
    isDanger: true,
    /**
     * Visibility: Trash page only
     */
    isVisible: (file, pageContext, permissionLevel) => {
      return pageContext === 'Trash';
    },
    /**
     * Permission: OWNER only (README line 72: "Owner only")
     * Permanent deletion is irreversible and affects all users
     */
    isEnabled: (file, pageContext, selectedCount = 1, permissionLevel = 'VIEWER') => {
      const level = permissionLevel?.toUpperCase();
      return level === 'OWNER';
    },
  },
};

/**
 * Evaluate an action for a SINGLE file
 * This is the ONLY function that determines action availability
 * 
 * SINGLE SOURCE OF TRUTH: All UI components must pass permissionLevel here
 * 
 * @param {string} actionId - Action identifier (e.g., 'share', 'download')
 * @param {Object} file - File object with type, isOwner, starred
 * @param {string} pageContext - Page context ('MyDrive', 'Shared', 'Trash', etc.)
 * @param {number} selectedCount - Number of selected items (default: 1)
 * @param {string} permissionLevel - User's permission level ('OWNER', 'EDITOR', 'VIEWER')
 * @returns {Object} { isVisible: boolean, isEnabled: boolean, label: string, iconSrc: string, isDanger: boolean }
 */
export const evaluateAction = (actionId, file, pageContext, selectedCount = 1, permissionLevel = 'VIEWER') => {
  const action = ACTION_REGISTRY[actionId];
  
  if (!action) {
    return { isVisible: false, isEnabled: false, label: '', iconSrc: '', isDanger: false };
  }
  
  // Use explicit permissionLevel parameter as Single Source of Truth
  // Fallback: file.permissionLevel || permissionLevel || 'VIEWER'
  // Always normalize to uppercase
  const effectivePermissionLevel = (file.permissionLevel || permissionLevel || 'VIEWER').toUpperCase();
  
  const isVisible = action.isVisible(file, pageContext, effectivePermissionLevel);
  const isEnabled = action.isEnabled(file, pageContext, selectedCount, effectivePermissionLevel);
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
 * @param {string} permissionLevel - User's permission level ('owner', 'editor', 'viewer')
 * @returns {Object} { isVisible: boolean, isEnabled: boolean, label: string, iconSrc: string, isDanger: boolean }
 */
export const evaluateBulkAction = (actionId, files, pageContext, permissionLevel = 'viewer') => {
  if (!files || files.length === 0) {
    return { isVisible: false, isEnabled: false, label: '', iconSrc: '', isDanger: false };
  }
  
  // CRITICAL: Pass selectedCount AND permissionLevel to properly evaluate multi-selection rules
  const selectedCount = files.length;
  
  // Get the base properties from the first file
  const firstFile = files[0];
  // Use file-specific permission level (critical for Shared page where each file can have different permission)
  const firstFilePermission = firstFile.sharedPermissionLevel || firstFile.permissionLevel || permissionLevel;
  const baseEval = evaluateAction(actionId, firstFile, pageContext, selectedCount, firstFilePermission);
  
  // Check if action is visible and enabled for ALL files
  let isVisibleForAll = baseEval.isVisible;
  let isEnabledForAll = baseEval.isEnabled;
  
  for (let i = 1; i < files.length; i++) {
    // CRITICAL: Use each file's specific permission level
    const filePermission = files[i].sharedPermissionLevel || files[i].permissionLevel || permissionLevel;
    const fileEval = evaluateAction(actionId, files[i], pageContext, selectedCount, filePermission);
    
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
/**
 * Get available actions for a file based on page context
 * Returns actions for the More (⋮) menu
 * 
 * @param {string} pageContext - Page context
 * @param {Object} file - File object
 * @param {number} selectedCount - Number of selected items (default: 1)
 * @param {string} permissionLevel - User's permission level ('owner', 'editor', 'viewer')
 * @returns {Array} Array of action objects
 */
export const getAvailableActions = (pageContext, file, selectedCount = 1, permissionLevel = 'viewer') => {
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
      const status = evaluateAction(actionId, file, pageContext, selectedCount, permissionLevel);
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
 * @param {string} permissionLevel - User's permission level ('owner', 'editor', 'viewer')
 * @returns {Array} Array of button action objects
 */
export const getRowActionButtons = (pageContext, file, permissionLevel = 'viewer') => {
  // Check for quick actions override (e.g., Trash)
  const buttonActions = QUICK_ACTIONS_OVERRIDES[pageContext] || DEFAULT_QUICK_ACTIONS;
  
  return buttonActions
    .map(actionId => {
      const status = evaluateAction(actionId, file, pageContext, 1, permissionLevel);
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
 * @param {string} permissionLevel - User's permission level ('owner', 'editor', 'viewer')
 * @returns {Array} Array of context menu action objects
 */
export const getBulkMenuActions = (pageContext, selectedFiles, permissionLevel = 'viewer') => {
  if (!selectedFiles || selectedFiles.length === 0) {
    return [];
  }
  
  // Determine the full set of possible actions based on context
  let candidateActions;
  
  if (pageContext === 'Trash') {
    // Trash: Same actions for all items regardless of type
    candidateActions = ['restore', 'deletePermanently'];
  } else {
    // Standard contexts: All possible actions
    // Single-context actions (open, rename, details) will appear but be disabled when selectedCount > 1
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
      const status = evaluateBulkAction(actionId, selectedFiles, pageContext, permissionLevel);
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
 * @param {string} permissionLevel - User's permission level ('owner', 'editor', 'viewer')
 * @returns {Array} Array of toolbar action objects with visibility and enabled status
 */
export const getToolbarActions = (pageContext, selectedFiles, permissionLevel = 'viewer') => {
  if (!selectedFiles || selectedFiles.length === 0) {
    return [];
  }
  
  // Get ALL possible actions from the menu
  const allMenuActions = getBulkMenuActions(pageContext, selectedFiles, permissionLevel);
  
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
