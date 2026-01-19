/**
 * fileItemHelpers.js
 * 
 * Shared helper functions for FileRow and FileCard components.
 * Single source of truth for determining CSS classes and status.
 */

import { FileStatus, isTempId } from './optimisticUpdates';

/**
 * Get the CSS status class for a file item based on its status
 * 
 * @param {Object} file - The file object
 * @returns {string} CSS class name(s) for the status
 */
export const getFileItemStatusClass = (file) => {
    if (!file) return '';
    
    // Check for _status property (new system)
    if (file._status) {
        return `file-item-status-${file._status}`;
    }
    
    // Legacy support: check for old property names
    if (file._isCopying) {
        return 'file-item-status-copying';
    }
    
    // Check if it's a temp item (optimistic)
    if (isTempId(file.id)) {
        // Infer status from temp ID prefix
        if (file.id.includes('copy')) return 'file-item-status-copying';
        if (file.id.includes('upload')) return 'file-item-status-uploading';
        if (file.id.includes('create')) return 'file-item-status-uploading';
        return 'file-item-status-copying'; // Default for temp items
    }
    
    return '';
};

/**
 * Get the combined CSS classes for a file item
 * Includes base class, entry animation, status class, and selection state
 * 
 * @param {Object} file - The file object
 * @param {boolean} isSelected - Whether the item is selected
 * @param {Object} options - Additional options
 * @param {boolean} options.isCard - Whether this is a card (vs row) for appropriate animation
 * @param {string} options.additionalClasses - Additional CSS classes to include
 * @returns {string} Combined CSS class string
 */
export const getFileItemClasses = (file, isSelected = false, options = {}) => {
    const { isCard = false, additionalClasses = '', isNew = false } = options;
    
    const classes = [
        'file-item-base',
    ];
    
    // Only add entry animation for NEW items (to avoid transform breaking dropdowns)
    // Transform creates a stacking context which clips position:absolute children
    if (isNew) {
        classes.push(isCard ? 'file-item-enter-scale' : 'file-item-enter');
    }
    
    // Add status class if applicable
    const statusClass = getFileItemStatusClass(file);
    if (statusClass) {
        classes.push(statusClass);
    }
    
    // Add selection state
    if (isSelected) {
        classes.push('selected');
    }
    
    // Add any additional classes
    if (additionalClasses) {
        classes.push(additionalClasses);
    }
    
    return classes.filter(Boolean).join(' ');
};

/**
 * Check if a file item is in a pending/optimistic state
 * 
 * @param {Object} file - The file object
 * @returns {boolean} Whether the file is pending
 */
export const isFileItemPending = (file) => {
    if (!file) return false;
    
    return !!(
        file._status ||
        file._isOptimistic ||
        file._isCopying ||
        isTempId(file.id)
    );
};

/**
 * Get status display text for a file item (for accessibility/tooltips)
 * 
 * @param {Object} file - The file object
 * @returns {string|null} Status text or null if no status
 */
export const getFileItemStatusText = (file) => {
    const status = file?._status;
    if (!status) return null;
    
    const statusTexts = {
        [FileStatus.COPYING]: 'Copying...',
        [FileStatus.UPLOADING]: 'Uploading...',
        [FileStatus.MOVING]: 'Moving...',
        [FileStatus.DELETING]: 'Deleting...',
        [FileStatus.RESTORING]: 'Restoring...',
        [FileStatus.RENAMING]: 'Renaming...',
    };
    
    return statusTexts[status] || null;
};

export default {
    getFileItemStatusClass,
    getFileItemClasses,
    isFileItemPending,
    getFileItemStatusText,
};
