import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook that executes a callback when the user changes (login/logout/user switch)
 * 
 * @param {Function} callback - Function to execute when user changes
 * @param {Array} deps - Additional dependencies for the callback (optional)
 * 
 * @example
 * useUserChange(() => {
 *   console.log('User changed, clearing state');
 *   clearMyState();
 * });
 */
export function useUserChange(callback, deps = []) {
    const { user } = useAuth();
    const prevUserIdRef = useRef(user?.id);
    const callbackRef = useRef(callback);

    // Keep callback ref updated
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        const currentUserId = user?.id || null;
        const prevUserId = prevUserIdRef.current;

        // ONLY trigger if ID changed AND we have preference data (if logged in)
        const isLoggingIn = !prevUserId && currentUserId;
        const hasPrefs = user?.preferences !== undefined;

        if (prevUserId !== currentUserId) {
            if (isLoggingIn && !hasPrefs) return; // Wait for prefs
            
            // Update ref for next comparison
            prevUserIdRef.current = currentUserId;
            
            // Execute callback
            callbackRef.current();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, JSON.stringify(user?.preferences), ...deps]);
}

export default useUserChange;
