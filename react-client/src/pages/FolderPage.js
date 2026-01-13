import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { useFilesContext } from '../context/FilesContext';
import { FilePageWrapper } from '../components/FilePageWrapper';
import { useUserChange } from '../hooks/useUserChange';
import { useAppEvent } from '../hooks/useAppEvent';
import { AppEvents } from '../utils/eventManager';
import './FolderPage.css';

/**
 * FolderPage - Displays contents of a specific folder
 * Handles folder navigation and file display
 */
const FolderPage = () => {
  const { folderId } = useParams();
  const { token, user } = useAuth();
  const { handleOpen, setCurrentFolderId } = useNavigation();
  const filesContext = useFilesContext();
  const { updateFilesInStore, filesMap } = filesContext;
  
  const [folder, setFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clear state when user changes
  useUserChange(() => {
    setFolder(null);
    setError(null);
  });

  // Fetch folder data function
  const fetchFolderData = useCallback(async () => {
    if (!token || !folderId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch folder data from API
      const response = await fetch(`http://localhost:3000/api/files/${folderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch folder: ${response.status}`);
      }

      const data = await response.json();
      
      // Ensure it's a folder
      if (data.type !== 'folder') {
        throw new Error('Item is not a folder');
      }

      setFolder(data);
      
      // Update current folder ID in context
      setCurrentFolderId(folderId);
      
      // Extract children and store in FilesContext
      const children = data.children || [];
      
      // Update FilesContext store (parent + children) for InfoSidebar and other components
      const filesToStore = [data, ...children];
      updateFilesInStore(filesToStore);
      
      console.log(`📂 Loaded folder: ${data.name} with ${children.length} items`);

    } catch (err) {
      console.error('Failed to fetch folder data:', err);
      setError(err.message || 'Failed to load folder');
    } finally {
      setLoading(false);
    }
  }, [token, folderId, setCurrentFolderId, updateFilesInStore]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchFolderData();
  }, [fetchFolderData]);

  // Listen for file updates and refresh
  useAppEvent(AppEvents.FILES_UPDATED, () => {
    console.log('📥 FolderPage: Files updated event - refetching folder data');
    fetchFolderData();
  }, [fetchFolderData]);

  // Get files from FilesContext (always fresh, auto-updates on star/etc)
  // Filter children of current folder and compute location
  const files = React.useMemo(() => {
    console.log('🔄 FolderPage useMemo - recalculating files list', {
      folderId,
      filesMapSize: filesMap.size,
      timestamp: new Date().toISOString()
    });
    
    if (!folderId) return [];
    
    const allFiles = Array.from(filesMap.values());
    // Filter children of current folder AND exclude trashed items
    const children = allFiles.filter(f => 
      f.parentId === folderId && !f.isTrashed
    );
    
    console.log('📋 Filtered children:', {
      childrenCount: children.length,
      childrenIds: children.map(c => c.id)
    });
    
    // Get folder data from filesMap (not local state)
    const currentFolder = filesMap.get(folderId);
    if (!currentFolder) {
      console.warn('⚠️ Current folder not found in filesMap:', folderId);
      return [];
    }
    
    // Compute location for children
    return children.map(child => ({
      ...child,
      location: {
        parentId: folderId,
        parentName: currentFolder.name,
        isRoot: false
      }
    }));
  }, [filesMap, folderId]);

  if (error) {
    return (
      <div className="folder-page">
        <div className="folder-error">{error}</div>
      </div>
    );
  }

  return (
    <FilePageWrapper
      customFiles={files}
      customLoading={loading}
      customRefetch={fetchFolderData}
      pageContext="Folder"
      isOwner={true}
      permissionLevel="owner"
      loadingMessage="Loading folder..."
      className="folder-page"
    />
  );
};

export default FolderPage;
