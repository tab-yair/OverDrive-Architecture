import { useEffect, useRef } from 'react';
import { onEvent } from '../utils/eventManager';

/**
 * Custom React hook for listening to application events
 * Automatically handles cleanup on unmount
 * 
 * @param {string} eventName - Event name from AppEvents
 * @param {Function} handler - Event handler function that receives event data
 * @param {Array} deps - Optional dependencies array
 * 
 * @example
 * import { AppEvents } from '../utils/eventManager';
 * import useAppEvent from '../hooks/useAppEvent';
 * 
 * useAppEvent(AppEvents.FILES_UPDATED, () => {
 *   console.log('Files were updated!');
 *   refetchFiles();
 * });
 */
export function useAppEvent(eventName, handler, deps = []) {
    const handlerRef = useRef(handler);

    // Keep handler ref updated
    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        // Subscribe to event
        const cleanup = onEvent(eventName, (data) => {
            handlerRef.current(data);
        });

        // Cleanup on unmount
        return cleanup;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventName, ...deps]);
}

export default useAppEvent;
