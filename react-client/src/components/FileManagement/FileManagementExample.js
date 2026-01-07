import React, { useState } from 'react';
import { FileManager } from '../FileManagement';
import InfoSidebar from './InfoSidebar';

/**
 * Example usage of FileManager component
 * This demonstrates how to use the file management components in your pages
 */
const FileManagementExample = () => {
  const [viewMode, setViewMode] = useState('list');
  const [sidebarFile, setSidebarFile] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Example file data - replace with your API data
  // Includes test cases for today, yesterday, last week, last month, and older
  const exampleFiles = [
    {
      id: 'pdf-folder',
      type: 'folder',
      name: 'PDF',
      owner: 'John Doe',
      lastModified: new Date('2026-01-07T14:30:00'),
      created: new Date('2025-06-15T10:00:00'),
      size: null,
      starred: false,
      location: { parentName: null, isRoot: true },
      currentUserRole: 'owner',
    },
    {
      id: 'images-folder',
      type: 'folder',
      name: 'Images',
      owner: 'John Doe',
      lastModified: new Date('2026-01-07T14:30:00'),
      created: new Date('2025-08-20T09:30:00'),
      size: null,
      starred: false,
      location: { parentName: null, isRoot: true },
      currentUserRole: 'editor',
    },
    {
      id: 'docs-folder',
      type: 'folder',
      name: 'Docs',
      owner: 'John Doe',
      lastModified: new Date('2026-01-07T14:30:00'),
      created: new Date('2025-05-10T14:15:00'),
      size: null,
      starred: false,
      currentUserRole: 'viewer',
      location: { parentName: null, isRoot: true },
    },
    {
      id: '1',
      type: 'folder',
      name: 'Projects',
      owner: 'John Doe',
      lastModified: new Date('2026-01-07T14:30:00'),
      created: new Date('2025-03-01T08:00:00'),
      size: null,
      starred: true,
      location: { parentName: null, isRoot: true },
    },
    {
      id: '2',
      type: 'pdf',
      name: 'Project Report Q4 2024.pdf',
      owner: 'Jane Smith',
      lastModified: new Date('2026-01-06T14:20:00'),
      created: new Date('2025-12-20T11:30:00'),
      lastOpened: new Date('2026-01-06T14:20:00'),
      size: 2048576, // 2MB
      starred: false,
      currentUserRole: 'owner',
      location: { parentName: 'Projects', isRoot: false },
    },
    {
      id: '3',
      type: 'docs',
      name: 'Meeting Notes - January.docx',
      owner: 'John Doe',
      lastModified: new Date('2026-01-02T09:15:00'),
      size: 45056,
      starred: false,
    },
    {
      id: '4',
      type: 'image',
      name: 'Screenshot 2026-01-07.png',
      owner: 'John Doe',
      lastModified: new Date('2026-01-07T11:45:00'),
      size: 1024000, // 1MB
      starred: true,
    },
    {
      id: '5',
      type: 'folder',
      name: 'Documents',
      owner: 'Jane Smith',
      lastModified: new Date('2025-12-24T16:00:00'),
      size: null,
      starred: false,
    },
    {
      id: '6',
      type: 'pdf',
      name: 'Invoice_2024_12.pdf',
      owner: 'Accounting Dept',
      lastModified: new Date('2025-12-15T23:59:00'),
      size: 512000,
      starred: false,
    },
    {
      id: '7',
      type: 'docs',
      name: 'Archive 2025.docx',
      owner: 'Records Dept',
      lastModified: new Date('2025-11-10T10:00:00'),
      size: 127890,
      starred: false,
    },
  ];

  // Example for Shared With Me page
  const sharedFiles = [
    {
      id: 'shared-pdf-folder',
      type: 'folder',
      name: 'PDF',
      owner: 'Finance Team',
      size: null,
      shareDate: new Date('2026-01-07T14:30:00'),
      sharer: {
        displayName: 'Jane Smith',
        avatarUrl: null,
      },
      starred: false,
    },
    {
      id: 'shared-images-folder',
      type: 'folder',
      name: 'Images',
      owner: 'Finance Team',
      size: null,
      shareDate: new Date('2026-01-07T14:30:00'),
      sharer: {
        displayName: 'Jane Smith',
        avatarUrl: null,
      },
      starred: false,
    },
    {
      id: 'shared-docs-folder',
      type: 'folder',
      name: 'Docs',
      owner: 'Finance Team',
      size: null,
      shareDate: new Date('2026-01-07T14:30:00'),
      sharer: {
        displayName: 'Jane Smith',
        avatarUrl: null,
      },
      starred: false,
    },
    {
      id: '10',
      type: 'pdf',
      name: 'Q4 Financial Report.pdf',
      owner: 'Finance Team',
      size: 3145728,
      shareDate: new Date('2026-01-07T10:00:00'),
      sharer: {
        displayName: 'Jane Smith',
        avatarUrl: null, // Optional
      },
      starred: false,
    },
    {
      id: '11',
      type: 'docs',
      name: 'Budget Plan 2026.docx',
      owner: 'Finance Team',
      size: 256000,
      shareDate: new Date('2026-01-06T14:30:00'),
      sharer: {
        displayName: 'Mike Johnson',
        avatarUrl: null,
      },
      starred: false,
    },
    {
      id: '12',
      type: 'pdf',
      name: 'Monthly Report Dec.pdf',
      owner: 'HR Department',
      size: 1024000,
      shareDate: new Date('2025-12-24T09:00:00'),
      sharer: {
        displayName: 'Sarah Connor',
        avatarUrl: null,
      },
      starred: false,
    },
  ];

  // Example for Recently Opened page
  const recentFiles = [
    {
      id: 'recent-pdf-folder',
      type: 'folder',
      name: 'PDF',
      owner: 'John Doe',
      size: null,
      lastActions: [
        { date: new Date('2026-01-07T14:30:00'), action: 'opened' },
      ],
      location: {
        parentName: null,
        isRoot: true,
      },
      starred: false,
    },
    {
      id: 'recent-images-folder',
      type: 'folder',
      name: 'Images',
      owner: 'John Doe',
      size: null,
      lastActions: [
        { date: new Date('2026-01-07T14:30:00'), action: 'opened' },
      ],
      location: {
        parentName: null,
        isRoot: true,
      },
      starred: false,
    },
    {
      id: 'recent-docs-folder',
      type: 'folder',
      name: 'Docs',
      owner: 'John Doe',
      size: null,
      lastActions: [
        { date: new Date('2026-01-06T10:30:00'), action: 'opened' },
      ],
      location: {
        parentName: null,
        isRoot: true,
      },
      starred: false,
    },
    {
      id: '20',
      type: 'docs',
      name: 'Project Plan 2026.docx',
      owner: 'John Doe',
      size: 67584,
      lastActions: [
        { date: new Date('2026-01-07T14:30:00'), action: 'opened' },
        { date: new Date('2026-01-06T10:30:00'), action: 'edited' },
      ],
      location: {
        parentName: 'Projects',
        isRoot: false,
      },
      starred: true,
    },
    {
      id: '21',
      type: 'pdf',
      name: 'Presentation.pdf',
      owner: 'Jane Smith',
      size: 2500000,
      lastActions: [
        { date: new Date('2026-01-06T09:00:00'), action: 'opened' },
        { date: new Date('2026-01-03T16:45:00'), action: 'edited' },
      ],
      location: {
        parentName: 'Work',
        isRoot: false,
      },
      starred: false,
    },
    {
      id: '22',
      type: 'docs',
      name: 'Quarterly Review.docx',
      owner: 'John Doe',
      size: 198765,
      lastActions: [
        { date: new Date('2025-12-28T11:20:00'), action: 'edited' },
        { date: new Date('2025-12-25T14:00:00'), action: 'opened' },
      ],
      location: {
        parentName: 'Performance',
        isRoot: false,
      },
      starred: false,
    },
    {
      id: '23',
      type: 'image',
      name: 'Team Photo.png',
      owner: 'HR Dept',
      size: 3200000,
      lastActions: [
        { date: new Date('2025-12-10T15:30:00'), action: 'opened' },
        { date: new Date('2025-12-05T10:00:00'), action: 'edited' },
      ],
      location: {
        parentName: 'Archives',
        isRoot: false,
      },
      starred: false,
    },
  ];

  // Example for Trash page
  const trashedFiles = [
    {
      id: 'trash-pdf-folder',
      type: 'folder',
      name: 'PDF',
      owner: 'John Doe',
      size: null,
      originalLocation: {
        parentName: null,
        isRoot: true,
      },
      starred: false,
    },
    {
      id: 'trash-images-folder',
      type: 'folder',
      name: 'Images',
      owner: 'John Doe',
      size: null,
      originalLocation: {
        parentName: null,
        isRoot: true,
      },
      starred: false,
    },
    {
      id: 'trash-docs-folder',
      type: 'folder',
      name: 'Docs',
      owner: 'John Doe',
      size: null,
      originalLocation: {
        parentName: null,
        isRoot: true,
      },
      starred: false,
    },
    {
      id: '30',
      type: 'image',
      name: 'Old Screenshot.png',
      owner: 'John Doe',
      size: 1024000,
      originalLocation: {
        parentName: 'Screenshots',
        isRoot: false,
      },
      starred: false,
    },
    {
      id: '31',
      type: 'docs',
      name: 'Draft Notes.docx',
      owner: 'Jane Smith',
      size: 45000,
      originalLocation: {
        parentName: 'Drafts',
        isRoot: false,
      },
      starred: false,
    },
  ];

  // Example for Starred page
  const starredFiles = [
    {
      id: 'starred-pdf-folder',
      type: 'folder',
      name: 'PDF',
      owner: 'John Doe',
      lastModified: new Date('2026-01-07T14:30:00'),
      size: null,
      location: {
        parentName: null,
        isRoot: true,
      },
      starred: true,
    },
    {
      id: 'starred-images-folder',
      type: 'folder',
      name: 'Images',
      owner: 'John Doe',
      lastModified: new Date('2026-01-07T14:30:00'),
      size: null,
      location: {
        parentName: null,
        isRoot: true,
      },
      starred: true,
    },
    {
      id: 'starred-docs-folder',
      type: 'folder',
      name: 'Docs',
      owner: 'John Doe',
      lastModified: new Date('2026-01-07T14:30:00'),
      size: null,
      location: {
        parentName: null,
        isRoot: true,
      },
      starred: true,
    },
    {
      id: '40',
      type: 'pdf',
      name: 'Important Document.pdf',
      owner: 'John Doe',
      lastModified: new Date('2026-01-07T15:30:00'),
      size: 512000,
      location: {
        parentName: 'Work',
        isRoot: false,
      },
      starred: true,
    },
    {
      id: '41',
      type: 'folder',
      name: 'Key Projects',
      owner: 'John Doe',
      lastModified: new Date('2026-01-04T12:00:00'),
      size: null,
      location: {
        parentName: 'Projects',
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
      case 'details':
        console.log('Viewing file details:', file.name);
        // Open file details panel
        setSidebarFile(file);
        setIsSidebarOpen(true);
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
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '24px',
    }}>
      <h1 style={{ marginBottom: '24px', color: 'var(--text-primary)' }}>
        File Management Component Examples
      </h1>

      {/* My Drive Example */}
      <section style={{ 
        marginBottom: '64px',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <h2 style={{ 
          margin: 0,
          padding: '16px 24px', 
          color: 'var(--text-primary)',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
        }}>
          My Drive
        </h2>
        <div style={{ 
          minHeight: '400px',
          backgroundColor: 'var(--bg-primary)',
        }}>
          <FileManager
            files={exampleFiles}
            pageContext="MyDrive"
            permissionLevel="owner"
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onAction={handleAction}
            onFileClick={handleFileClick}
          />
        </div>
      </section>

      {/* Shared With Me Example (Not Owner) */}
      <section style={{ 
        marginBottom: '64px',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <h2 style={{ 
          margin: 0,
          padding: '16px 24px', 
          color: 'var(--text-primary)',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
        }}>
          Shared with me
        </h2>
        <div style={{ 
          minHeight: '400px',
          backgroundColor: 'var(--bg-primary)',
        }}>
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
        </div>
      </section>

      {/* Recently Opened Example */}
      <section style={{ 
        marginBottom: '64px',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <h2 style={{ 
          margin: 0,
          padding: '16px 24px', 
          color: 'var(--text-primary)',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
        }}>
          Recent
        </h2>
        <div style={{ 
          minHeight: '400px',
          backgroundColor: 'var(--bg-primary)',
        }}>
          <FileManager
            files={recentFiles}
            pageContext="Recent"
            permissionLevel="editor"
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onAction={handleAction}
            onFileClick={handleFileClick}
          />
        </div>
      </section>

      {/* Trash Example */}
      <section style={{ 
        marginBottom: '64px',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <h2 style={{ 
          margin: 0,
          padding: '16px 24px', 
          color: 'var(--text-primary)',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
        }}>
          Trash
        </h2>
        <div style={{ 
          minHeight: '400px',
          backgroundColor: 'var(--bg-primary)',
        }}>
          <FileManager
            files={trashedFiles}
            pageContext="Trash"
            permissionLevel="owner"
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onAction={handleAction}
            onFileClick={handleFileClick}
          />
        </div>
      </section>

      {/* Starred Example */}
      <section style={{ 
        marginBottom: '64px',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <h2 style={{ 
          margin: 0,
          padding: '16px 24px', 
          color: 'var(--text-primary)',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
        }}>
          Starred
        </h2>
        <div style={{ 
          minHeight: '400px',
          backgroundColor: 'var(--bg-primary)',
        }}>
          <FileManager
            files={starredFiles}
            pageContext="Starred"
            permissionLevel="owner"
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onAction={handleAction}
            onFileClick={handleFileClick}
          />
        </div>
      </section>

      {/* Empty State Example */}
      <section style={{ 
        marginBottom: '64px',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <h2 style={{ 
          margin: 0,
          padding: '16px 24px', 
          color: 'var(--text-primary)',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
        }}>
          Empty State
        </h2>
        <div style={{ 
          minHeight: '400px',
          backgroundColor: 'var(--bg-primary)',
        }}>
          <FileManager
            files={[]}
            pageContext="MyDrive"
            permissionLevel="owner"
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onAction={handleAction}
            onFileClick={handleFileClick}
          />
        </div>
      </section>

      {/* Info Sidebar */}
      <InfoSidebar
        file={sidebarFile}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </div>
  );
};

export default FileManagementExample;
