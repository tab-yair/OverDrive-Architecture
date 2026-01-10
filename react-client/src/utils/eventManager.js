/**
 * Central Event Manager
 * Single source of truth for all custom events in the application
 * Prevents typos and makes event management easier
 */

// Event names registry
export const AppEvents = {
    FILES_UPDATED: 'files-updated',
    STORAGE_UPDATED: 'storage-updated',
    USER_UPDATED: 'user-updated',
};

/**
 * Emit an event with optional data
 * @param {string} eventName - Event name from AppEvents
 * @param {*} data - Optional data to pass with event
 */
export function emitEvent(eventName, data = null) {
    const event = new CustomEvent(eventName, { detail: data });
    window.dispatchEvent(event);
    console.log(`📢 Event emitted: ${eventName}`, data ? `with data:` : '', data || '');
}

/**
 * Listen to an event
 * @param {string} eventName - Event name from AppEvents
 * @param {Function} handler - Event handler function
 * @returns {Function} Cleanup function to remove listener
 */
export function onEvent(eventName, handler) {
    const wrappedHandler = (event) => handler(event.detail);
    window.addEventListener(eventName, wrappedHandler);
    
    // Return cleanup function
    return () => window.removeEventListener(eventName, wrappedHandler);
}

/**
 * Emit files updated event
 * Triggers refetch of file lists across the app
 */
export function notifyFilesUpdated() {
    emitEvent(AppEvents.FILES_UPDATED);
}

/**
 * Emit storage updated event
 * Triggers refresh of storage info
 */
export function notifyStorageUpdated() {
    emitEvent(AppEvents.STORAGE_UPDATED);
}

/**
 * Emit both files and storage updated
 * Common case when uploading/deleting files
 */
export function notifyFilesAndStorageUpdated() {
    notifyFilesUpdated();
    notifyStorageUpdated();
}

/**
 * Custom hook for listening to events
 * @param {string} eventName - Event name from AppEvents
 * @param {Function} handler - Event handler
 * @param {Array} deps - Dependencies array
 */
export function useAppEvent(eventName, handler, deps = []) {
    // This is meant to be used with React.useEffect
    // Import useEffect in the component that uses this
    throw new Error('useAppEvent should be implemented in a separate hook file');
}

export default {
    AppEvents,
    emitEvent,
    onEvent,
    notifyFilesUpdated,
    notifyStorageUpdated,
    notifyFilesAndStorageUpdated,
};
