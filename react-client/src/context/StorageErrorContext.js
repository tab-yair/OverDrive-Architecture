import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * StorageErrorContext - Global context for handling storage limit errors
 * 
 * This context allows any component in the app to trigger the storage limit modal
 * when a storage-related error occurs (e.g., during file upload, copy, or create).
 */

const StorageErrorContext = createContext();

export function StorageErrorProvider({ children }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [errorDetails, setErrorDetails] = useState({
        message: '',
        operation: ''
    });

    /**
     * Show the storage limit modal with error details
     * @param {string} message - The error message from the server
     * @param {string} operation - The operation that failed (e.g., 'upload', 'copy', 'create file')
     */
    const showStorageLimitError = useCallback((message, operation = 'operation') => {
        setErrorDetails({
            message: message || 'Storage limit exceeded',
            operation
        });
        setIsModalOpen(true);
    }, []);

    /**
     * Close the storage limit modal
     */
    const hideStorageLimitError = useCallback(() => {
        setIsModalOpen(false);
        // Clear details after animation completes
        setTimeout(() => {
            setErrorDetails({ message: '', operation: '' });
        }, 300);
    }, []);

    /**
     * Check if an error response indicates a storage limit issue
     * @param {Object} response - The API response or error object
     * @returns {boolean} - Whether it's a storage limit error
     */
    const isStorageLimitError = useCallback((response) => {
        if (!response) return false;
        
        // Check for explicit flag from server
        if (response.isStorageLimitError) return true;
        
        // Check for 507 status code
        if (response.status === 507) return true;
        
        // Check error type
        if (response.errorType === 'STORAGE_LIMIT_EXCEEDED') return true;
        
        // Check error message
        const message = response.error || response.message || '';
        return message.toLowerCase().includes('storage limit');
    }, []);

    /**
     * Handle an API error - shows storage modal if it's a storage limit error
     * @param {Object} error - The error object
     * @param {string} operation - The operation that was attempted
     * @returns {boolean} - Whether the error was a storage limit error (and was handled)
     */
    const handleApiError = useCallback((error, operation = 'operation') => {
        const errorData = error.response?.data || error;
        
        if (isStorageLimitError(errorData)) {
            const message = errorData.error || errorData.message || 'Storage limit exceeded';
            showStorageLimitError(message, operation);
            return true; // Indicates error was handled
        }
        
        return false; // Indicates error was not a storage limit error
    }, [isStorageLimitError, showStorageLimitError]);

    const value = {
        isModalOpen,
        errorDetails,
        showStorageLimitError,
        hideStorageLimitError,
        isStorageLimitError,
        handleApiError
    };

    return (
        <StorageErrorContext.Provider value={value}>
            {children}
        </StorageErrorContext.Provider>
    );
}

/**
 * Hook to access storage error context
 */
export function useStorageError() {
    const context = useContext(StorageErrorContext);
    if (!context) {
        throw new Error('useStorageError must be used within a StorageErrorProvider');
    }
    return context;
}

export default StorageErrorContext;
