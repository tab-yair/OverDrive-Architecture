import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { FilePageWrapper } from '../components/FilePageWrapper';
import Breadcrumbs from '../components/Breadcrumbs/Breadcrumbs';
import './FolderPage.css';

/**
 * FolderPage - Displays contents of a specific folder
 * Handles folder navigation, breadcrumbs, and file display
 */
const FolderPage = () => {
  const { folderId } = useParams();
  const { token } = useAuth();
  const { updateBreadcrumbs, handleOpen, setCurrentFolderId } = useNavigation();
  
  const [folder, setFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFolderData = async () => {
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
        
        // Extract children from folder metadata
        // API returns children in the folder object
        setFiles(data.children || []);
        
        // Build breadcrumbs from folder path
        // For now, simple breadcrumb with folder name
        // TODO: Build full path from parent hierarchy
        const breadcrumbs = [
          { id: folderId, name: data.name }
        ];
        updateBreadcrumbs(breadcrumbs);

      } catch (err) {
        console.error('Failed to fetch folder data:', err);
        setError(err.message || 'Failed to load folder');
      } finally {
        setLoading(false);
      }
    };

    fetchFolderData();
    
    // Listen for file creation events to refresh folder
    const handleFilesUpdated = () => {
      console.log('Files updated, refreshing folder...');
      fetchFolderData();
    };
    
    window.addEventListener('files-updated', handleFilesUpdated);
    return () => window.removeEventListener('files-updated', handleFilesUpdated);
  }, [folderId, token, updateBreadcrumbs]);

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
      headerComponent={<Breadcrumbs path={folder?.breadcrumbs || []} />}
      pageContext="MyDrive"
      loadingMessage="Loading folder..."
      className="folder-page"
    />
  );
};

export default FolderPage;
