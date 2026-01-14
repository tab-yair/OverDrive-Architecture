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
  // Breadcrumbs state removed
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [currentFolderPermissionLevel, setCurrentFolderPermissionLevel] = useState('viewer');

  /**
   * Clear navigation state when user changes
   */
  useUserChange(() => {
    console.log('🧹 NavigationContext: Clearing navigation state due to user change');
    setCurrentFolderId(null);
    navigate('/mydrive');
  }, [navigate]);

  /**
   * Central handleOpen function - dispatches based on item type
   * @param {Object} item - File or folder object
   * @param {string} item.type - 'folder', 'file', 'pdf', 'image', 'docs'
   * @param {string} item.id - Unique identifier
   * @param {string} item.name - Display name
   */
  const handleOpen = useCallback((item) => {
    console.log('🧭 NavigationContext.handleOpen called:', { 
      item, 
      currentPath: window.location.pathname,
      timestamp: new Date().toISOString() 
    });

    if (!item || !item.type) {
      console.error('❌ Invalid item passed to handleOpen:', item);
      return;
    }

    if (item.type === 'folder') {
      // Navigate to folder view
      console.log(`📂 Navigating to folder: ${item.name} (${item.id})`);
      console.log(`   From: ${window.location.pathname} → To: /folders/${item.id}`);
      setCurrentFolderId(item.id);
      navigate(`/folders/${item.id}`);
      
      console.log(`✅ Folder navigation completed: ${item.name}`);
    } else {
      // Handle file opening (images, PDFs, docs, etc.)
      // For now, just log - implement preview/download later
      console.log(`📄 Opening file: ${item.name} (${item.type})`);
      console.log('⚠️ File preview not implemented yet');
      
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
