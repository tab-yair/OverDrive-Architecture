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

        // Detect user change (including logout: user -> null, login: null -> user, or switch: user1 -> user2)
        if (prevUserId !== currentUserId) {
            console.log(`👤 useUserChange: User changed from ${prevUserId} to ${currentUserId}`);
            
            // Update ref for next comparison
            prevUserIdRef.current = currentUserId;
            
            // Execute callback
            callbackRef.current();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, ...deps]);
}

export default useUserChange;
