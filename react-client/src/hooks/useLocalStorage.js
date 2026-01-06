import { useState, useEffect } from 'react';

/**
 * Custom hook for persisting state to localStorage
 *
 * @param {string} key - The localStorage key to use
 * @param {any} initialValue - The initial value if no stored value exists
 * @returns {[any, Function]} - Returns [storedValue, setValue] like useState
 */
function useLocalStorage(key, initialValue) {
    // Get initial value from localStorage or use the provided initialValue
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            // Parse stored JSON or return initialValue if nothing stored
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            // If error reading from localStorage, return initialValue
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Update localStorage whenever the stored value changes
    useEffect(() => {
        try {
            // Allow value to be a function for same API as useState
            const valueToStore = storedValue instanceof Function
                ? storedValue(storedValue)
                : storedValue;

            // Save to localStorage
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    // Return the same API as useState
    return [storedValue, setStoredValue];
}

export default useLocalStorage;
