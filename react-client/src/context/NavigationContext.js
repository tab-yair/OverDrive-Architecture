import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useUserChange } from '../hooks/useUserChange';

const NavigationContext = createContext();

/**
 * NavigationProvider - Manages file/folder navigation and "open" actions
 * Single source of truth for opening files and folders
 */
export const NavigationProvider = ({ children }) => {
  const navigate = useNavigate();
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [currentFolderPermissionLevel, setCurrentFolderPermissionLevel] = useState('viewer');
  const { user } = useAuth();
  /**
   * Clear navigation state when user changes
   */
  useUserChange(() => {
    setCurrentFolderId(null);
    // Navigation is handled by App.js and Login.js, not here
  }, []);

  /**
   * Central handleOpen function - dispatches based on item type
   * @param {Object} item - File or folder object
   * @param {string} item.type - 'folder', 'file', 'pdf', 'image', 'docs'
   * @param {string} item.id - Unique identifier
   * @param {string} item.name - Display name
   */
  const handleOpen = useCallback((item) => {
    if (!item || !item.type) {
      console.error('Invalid item passed to handleOpen:', item);
      return;
    }

    if (item.type === 'folder') {
      // Navigate to folder view
      setCurrentFolderId(item.id);
      navigate(`/folders/${item.id}`);
    } else {
      // Handle file opening (images, PDFs, docs, etc.)
      // For now, just log - implement preview/download later
      
      // TODO: Implement file preview modal
      // - For images: show image viewer
      // - For PDFs: show PDF viewer
      // - For docs: download or open in new tab
    }
  }, [navigate]);

  /**
   * Navigate to a specific folder by ID
   * @param {string} folderId - Folder ID to navigate to
   */
  const navigateToFolder = useCallback((folderId) => {
    setCurrentFolderId(folderId);
    navigate(`/folders/${folderId}`);
  }, [navigate]);

  /**
   * Navigate back to parent folder or My Drive
   */
  // navigateUp removed

  /**
   * Set breadcrumbs path
   * @param {Array} crumbs - Array of {id, name} objects
   */
  // updateBreadcrumbs removed

  const value = {
    handleOpen,
    navigateToFolder,
    // breadcrumbs and updateBreadcrumbs removed
    currentFolderId,
    setCurrentFolderId,
    currentFolderPermissionLevel,
    setCurrentFolderPermissionLevel
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

/**
 * Hook to use navigation context
 */
export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export default NavigationContext;
