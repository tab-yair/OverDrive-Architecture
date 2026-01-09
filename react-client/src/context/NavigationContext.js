import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const NavigationContext = createContext();

/**
 * NavigationProvider - Manages file/folder navigation and "open" actions
 * Single source of truth for opening files and folders
 */
export const NavigationProvider = ({ children }) => {
  const navigate = useNavigate();
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);

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
      
      // Update breadcrumbs (will be fully managed by FolderPage)
      console.log(`📂 Opening folder: ${item.name} (${item.id})`);
    } else {
      // Handle file opening (images, PDFs, docs, etc.)
      // For now, just log - implement preview/download later
      console.log(`📄 Opening file: ${item.name} (${item.type})`);
      console.log('File preview not implemented yet');
      
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
  const navigateUp = useCallback(() => {
    if (breadcrumbs.length > 0) {
      const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
      if (parentCrumb) {
        navigateToFolder(parentCrumb.id);
      } else {
        navigate('/mydrive');
      }
    } else {
      navigate('/mydrive');
    }
  }, [breadcrumbs, navigate, navigateToFolder]);

  /**
   * Set breadcrumbs path
   * @param {Array} crumbs - Array of {id, name} objects
   */
  const updateBreadcrumbs = useCallback((crumbs) => {
    setBreadcrumbs(crumbs);
  }, []);

  const value = {
    handleOpen,
    navigateToFolder,
    navigateUp,
    breadcrumbs,
    updateBreadcrumbs,
    currentFolderId,
    setCurrentFolderId
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
