import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFilesContext } from '../context/FilesContext';

/**
 * Custom hook for renaming files and folders
 * Handles PATCH /api/files/:id with { name: newName }
 * Updates both server and local FilesContext state
 * 
 * @returns {Object} - { renameFile }
 */
export const useRename = () => {
    const { token } = useAuth();
    const { updateFile } = useFilesContext();

    /**
     * Rename a file or folder
     * @param {string} fileId - ID of file/folder to rename
     * @param {string} newName - New logical name
     * @returns {Promise<Object>} - { success: boolean, error?: string }
     */
    const renameFile = useCallback(async (fileId, newName) => {
        if (!fileId || !newName || newName.trim() === '') {
            return { success: false, error: 'Invalid file ID or name' };
        }

        try {
            // Use FilesContext's updateFile which handles both API call and state update
            const result = await updateFile(fileId, { name: newName.trim() });

            if (result.error) {
                console.error('[useRename] Rename failed:', result.error);
                return { success: false, error: result.error };
            }

            return { success: true };
        } catch (error) {
            console.error('[useRename] Rename error:', error);
            return { success: false, error: error.message || 'Failed to rename file' };
        }
    }, [token, updateFile]);

    return { renameFile };
};

export default useRename;
