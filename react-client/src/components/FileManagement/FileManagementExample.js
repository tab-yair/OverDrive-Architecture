import React, { useState } from 'react';
import { FileManager } from '../FileManagement';

/**
 * Example usage of FileManager component
 * This demonstrates how to use the file management components in your pages
 */
const FileManagementExample = () => {
  const [viewMode, setViewMode] = useState('list');

  // Example file data - replace with your API data
  const exampleFiles = [
    {
      id: '1',
      type: 'folder',
      name: 'Projects',
      owner: 'John Doe',
      lastModified: new Date('2025-01-05T10:30:00'),
      size: null,
      starred: true,
    },
    {
      id: '2',
      type: 'pdf',
      name: 'Project Report Q4 2024.pdf',
      owner: 'Jane Smith',
      lastModified: new Date('2025-01-06T14:20:00'),
      size: 2048576, // 2MB
      starred: false,
    },
    {
      id: '3',
      type: 'docs',
      name: 'Meeting Notes - January.docx',
      owner: 'John Doe',
      lastModified: new Date('2025-01-04T09:15:00'),
      size: 45056,
      starred: false,
    },
    {
      id: '4',
      type: 'image',
      name: 'Screenshot 2025-01-06.png',
      owner: 'John Doe',
      lastModified: new Date('2025-01-06T11:45:00'),
      size: 1024000, // 1MB
      starred: true,
    },
    {
      id: '5',
      type: 'folder',
      name: 'Documents',
      owner: 'Jane Smith',
      lastModified: new Date('2025-01-03T16:00:00'),
      size: null,
      starred: false,
    },
    {
      id: '6',
      type: 'pdf',
      name: 'Invoice_2024_12.pdf',
      owner: 'Accounting Dept',
      lastModified: new Date('2024-12-31T23:59:00'),
      size: 512000,
      starred: false,
    },
  ];

  // Example for Shared With Me page
  const sharedFiles = [
    {
      id: '10',
      type: 'pdf',
      name: 'Q4 Financial Report.pdf',
      owner: 'Finance Team',
      size: 3145728,
      shareDate: new Date('2025-01-03T10:00:00'),
      sharer: {
        displayName: 'Jane Smith',
        avatarUrl: null, // Optional
      },
      starred: false,
    },
  ];

  // Example for Recently Opened page
  const recentFiles = [
    {
      id: '20',
      type: 'docs',
      name: 'Project Plan 2025.docx',
      owner: 'John Doe',
      size: 67584,
      lastActions: [
        { date: new Date('2025-01-06T10:30:00'), action: 'opened' },
        { date: new Date('2025-01-05T14:20:00'), action: 'edited' },
      ],
      location: {
        parentName: 'Projects',
        isRoot: false,
      },
      starred: true,
    },
  ];

  // Example for Trash page
  const trashedFiles = [
    {
      id: '30',
      type: 'image',
      name: 'Old Screenshot.png',
      owner: 'John Doe',
      size: 1024000,
      deletionDate: new Date('2025-01-05T12:00:00'),
      originalLocation: {
        parentName: 'Screenshots',
        isRoot: false,
      },
      starred: false,
    },
  ];

  // Example for Starred page
  const starredFiles = [
    {
      id: '40',
      type: 'pdf',
      name: 'Important Document.pdf',
      owner: 'John Doe',
      lastModified: new Date('2025-01-04T15:30:00'),
      size: 512000,
      location: {
        parentName: 'Work',
        isRoot: false,
      },
      starred: true,
    },
  ];

  // Handle file actions
  const handleAction = (actionId, file) => {
    console.log(`Action triggered: ${actionId}`, file);
    
    // Implement your action handlers here
    switch (actionId) {
      case 'download':
        console.log('Downloading file:', file.name);
        // Implement download logic
        // e.g., window.open(`/api/files/${file.id}/download`)
        break;
        
      case 'star':
        console.log('Starring file:', file.name);
        // Implement star logic
        // e.g., api.starFile(file.id)
        break;
        
      case 'unstar':
        console.log('Unstarring file:', file.name);
        // Implement unstar logic
        break;
        
      case 'share':
        console.log('Opening share dialog for:', file.name);
        // Open share dialog
        break;
        
      case 'move':
        console.log('Opening move dialog for:', file.name);
        // Open move dialog
        break;
        
      case 'rename':
        console.log('Opening rename dialog for:', file.name);
        // Open rename dialog
        break;
        
      case 'trash':
        console.log('Moving to trash:', file.name);
        // Implement trash logic
        break;
        
      case 'restore':
        console.log('Restoring from trash:', file.name);
        // Implement restore logic
        break;
        
      case 'delete':
        console.log('Permanently deleting:', file.name);
        // Implement permanent delete (with confirmation)
        break;
        
      case 'view':
        console.log('Viewing file details:', file.name);
        // Open file details panel
        break;
        
      case 'copy':
        console.log('Making a copy of:', file.name);
        // Implement copy logic
        break;
        
      default:
        console.log('Unknown action:', actionId);
    }
  };

  // Handle file/folder click
  const handleFileClick = (file) => {
    if (file.type === 'folder') {
      console.log('Opening folder:', file.name);
      // Navigate into the folder
      // e.g., navigate(`/drive/folder/${file.id}`)
    } else {
      console.log('Opening file preview:', file.name);
      // Open file preview/viewer
      // e.g., navigate(`/drive/file/${file.id}`)
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px', color: 'var(--text-primary)' }}>
        File Management Component Examples
      </h1>

      {/* My Drive Example */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
          My Drive
        </h2>
        <FileManager
          files={exampleFiles}
          pageContext="MyDrive"
          permissionLevel="owner"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAction={handleAction}
          onFileClick={handleFileClick}
        />
      </section>

      {/* Shared With Me Example (Not Owner) */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
          Shared With Me (Not Owner - Shows "Remove" instead of "Move to Trash")
        </h2>
        <FileManager
          files={sharedFiles}
          pageContext="Shared"
          permissionLevel="viewer"
          isOwner={false}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAction={handleAction}
          onFileClick={handleFileClick}
        />
      </section>

      {/* Recently Opened Example */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
          Recently Opened
        </h2>
        <FileManager
          files={recentFiles}
          pageContext="Recently"
          permissionLevel="editor"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAction={handleAction}
          onFileClick={handleFileClick}
        />
      </section>

      {/* Trash Example */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
          Trash
        </h2>
        <FileManager
          files={trashedFiles}
          pageContext="Trash"
          permissionLevel="owner"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAction={handleAction}
          onFileClick={handleFileClick}
        />
      </section>

      {/* Starred Example */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
          Starred
        </h2>
        <FileManager
          files={starredFiles}
          pageContext="Starred"
          permissionLevel="owner"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAction={handleAction}
          onFileClick={handleFileClick}
        />
      </section>

      {/* Empty State Example */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
          Empty State
        </h2>
        <FileManager
          files={[]}
          pageContext="MyDrive"
          permissionLevel="owner"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAction={handleAction}
          onFileClick={handleFileClick}
        />
      </section>
    </div>
  );
};

export default FileManagementExample;
