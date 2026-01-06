# File Management UI Components

A comprehensive set of modular, reusable React components for building a Google Drive-style file management interface with both List and Grid views, supporting dark/light themes.

## Components Overview

### 1. FileManager
Main container component that handles view switching and file display.

### 2. FileRow
List view component displaying files as rows with metadata columns.

### 3. FileCard
Grid view component displaying files as cards.

### 4. ActionButton
Reusable circular button with hover effects.

### 5. FileActionMenu
Context menu with file actions.

## Installation

All components are located in `/react-client/src/components/FileManagement/`.

Import components:
```javascript
import { FileManager, FileRow, FileCard, ActionButton } from './components/FileManagement';
```

## Usage Examples

### Basic FileManager Usage

```javascript
import React, { useState } from 'react';
import { FileManager } from './components/FileManagement';

function MyDrivePage() {
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  
  const files = [
    {
      id: '1',
      type: 'folder',
      name: 'Documents',
      owner: 'John Doe',
      lastModified: new Date('2025-01-05'),
      size: null, // folders don't have size
      starred: false,
    },
    {
      id: '2',
      type: 'pdf',
      name: 'Report.pdf',
      owner: 'Jane Smith',
      lastModified: new Date('2025-01-06'),
      size: 2048576, // 2MB in bytes
      starred: true,
    },
    {
      id: '3',
      type: 'docs',
      name: 'Meeting Notes.docx',
      owner: 'John Doe',
      lastModified: new Date('2025-01-04'),
      size: 45056,
      starred: false,
    },
  ];

  const handleAction = (actionId, file) => {
    console.log(`Action: ${actionId}, File:`, file);
    
    switch (actionId) {
      case 'download':
        // Handle download
        break;
      case 'star':
      case 'unstar':
        // Handle star toggle
        break;
      case 'share':
        // Open share dialog
        break;
      case 'trash':
        // Move to trash
        break;
      // ... handle other actions
    }
  };

  const handleFileClick = (file) => {
    if (file.type === 'folder') {
      // Navigate into folder
      console.log('Opening folder:', file.name);
    } else {
      // Open file preview
      console.log('Opening file:', file.name);
    }
  };

  return (
    <FileManager
      files={files}
      pageContext="MyDrive"
      permissionLevel="owner"
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onAction={handleAction}
      onFileClick={handleFileClick}
    />
  );
}
```

### Shared With Me Page Example

```javascript
function SharedWithMePage() {
  const files = [
    {
      id: '1',
      type: 'pdf',
      name: 'Q4 Report.pdf',
      owner: 'Jane Smith',
      size: 3145728,
      shareDate: new Date('2025-01-03'),
      sharer: {
        displayName: 'Jane Smith',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      starred: false,
    },
  ];

  return (
    <FileManager
      files={files}
      pageContext="Shared"
      permissionLevel="viewer"
      viewMode="list"
      onAction={handleAction}
      onFileClick={handleFileClick}
    />
  );
}
```

### Recently Opened Page Example

```javascript
function RecentlyPage() {
  const files = [
    {
      id: '1',
      type: 'docs',
      name: 'Project Plan.docx',
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

  return (
    <FileManager
      files={files}
      pageContext="Recently"
      permissionLevel="editor"
      viewMode="list"
      onAction={handleAction}
      onFileClick={handleFileClick}
    />
  );
}
```

### Trash Page Example

```javascript
function TrashPage() {
  const files = [
    {
      id: '1',
      type: 'image',
      name: 'Screenshot.png',
      owner: 'John Doe',
      size: 1024000,
      deletionDate: new Date('2025-01-05'),
      originalLocation: {
        parentName: 'Screenshots',
        isRoot: false,
      },
      starred: false,
    },
  ];

  return (
    <FileManager
      files={files}
      pageContext="Trash"
      permissionLevel="owner"
      viewMode="list"
      onAction={handleAction}
      onFileClick={handleFileClick}
    />
  );
}
```

### Starred Page Example

```javascript
function StarredPage() {
  const files = [
    {
      id: '1',
      type: 'pdf',
      name: 'Important Document.pdf',
      owner: 'John Doe',
      lastModified: new Date('2025-01-04'),
      size: 512000,
      location: {
        parentName: 'Work',
        isRoot: false,
      },
      starred: true,
    },
  ];

  return (
    <FileManager
      files={files}
      pageContext="Starred"
      permissionLevel="owner"
      viewMode="grid"
      onAction={handleAction}
      onFileClick={handleFileClick}
    />
  );
}
```

## File Object Structure

```javascript
{
  // Required fields
  id: string,              // Unique identifier
  type: 'folder' | 'pdf' | 'image' | 'docs',
  name: string,            // File/folder name
  
  // Common fields
  owner: string,           // Owner's name
  size: number | null,     // Size in bytes (null for folders)
  lastModified: Date,      // Last modification date
  starred: boolean,        // Is file starred
  
  // Shared context
  shareDate: Date,         // When file was shared
  sharer: {
    displayName: string,
    avatarUrl: string,     // Optional avatar
  },
  
  // Recently context
  lastActions: [
    {
      date: Date,
      action: 'opened' | 'edited' | 'shared',
    }
  ],
  
  // Trash context
  deletionDate: Date,      // When file was deleted
  
  // Location info (for Recently, Starred, Trash)
  location: {
    parentName: string,    // Parent folder name
    isRoot: boolean,       // Is in root "My Drive"
  },
  originalLocation: {      // For Trash only
    parentName: string,
    isRoot: boolean,
  },
}
```

## Props Reference

### FileManager Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| files | Array | [] | Array of file objects |
| pageContext | string | 'MyDrive' | 'MyDrive', 'Shared', 'Recently', 'Trash', or 'Starred' |
| permissionLevel | string | 'viewer' | 'owner', 'editor', or 'viewer' |
| viewMode | string | 'list' | 'list' or 'grid' |
| onViewModeChange | Function | - | Callback when view mode changes |
| onAction | Function | - | Callback for file actions |
| onFileClick | Function | - | Callback when file is clicked |

### FileRow / FileCard Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| file | Object | Yes | File object |
| pageContext | string | No | Current page context |
| permissionLevel | string | No | User's permission level |
| onAction | Function | No | Action callback |
| onClick | Function | No | Click callback |

### ActionButton Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| icon | string | Yes | Icon filename from assets |
| onClick | Function | Yes | Click handler |
| disabled | boolean | No | Whether button is disabled |
| ariaLabel | string | No | Accessibility label |
| className | string | No | Additional CSS classes |

### FileActionMenu Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| actions | Array | Yes | Available actions |
| position | Object | Yes | Menu position {x, y} |
| onActionSelected | Function | Yes | Action selected callback |
| onClose | Function | Yes | Close menu callback |

## Available Actions

Actions are automatically filtered based on `pageContext` and `permissionLevel`:

- **view**: View file details
- **download**: Download file (not for folders)
- **star/unstar**: Toggle starred status
- **move**: Move file (requires editor/owner)
- **share**: Share file (requires owner)
- **rename**: Rename file (requires editor/owner)
- **copy**: Make a copy
- **trash**: Move to trash (requires editor/owner)
- **restore**: Restore from trash (Trash only)
- **delete**: Delete permanently (Trash only, requires editor/owner)

## Metadata by Page Context

### My Drive
- Owner
- Last Modified
- Size

### Shared With Me
- Sharer's Display Name (with avatar)
- Share Date

### Recently
- Owner
- Last Actions (date + action)
- Size
- Location (folder icon + parent folder)

### Trash
- Owner
- Deletion Date
- Size
- Original Location

### Starred
- Owner
- Last Modified
- Size
- Location

## Styling & Theming

All components use CSS variables from the main application:

```css
/* Light theme variables */
--bg-primary
--bg-secondary
--bg-hover
--text-primary
--text-secondary
--border-color
--accent-color
--shadow

/* Dark theme: [data-theme="dark"] */
```

Components automatically adapt to dark/light mode through CSS variables.

## Assets Required

All icons should be placed in `/react-client/assets/`:

- folder.svg
- pdf.svg
- image.svg
- Docs.svg
- star.svg
- star with fill.svg
- download.svg
- edit.svg
- person_add (share).svg
- info_outline.svg
- delete.svg
- delete_forever.svg
- restore.svg
- drive_file_move_outline.svg
- file_copy.svg

## Responsive Behavior

- **Desktop (>1024px)**: Full metadata columns visible
- **Tablet (768px-1024px)**: Reduced metadata columns
- **Mobile (<768px)**: Single metadata column, grid adjusts, action buttons always visible

## Accessibility

- All buttons have `aria-label` attributes
- Keyboard navigation supported
- Focus visible states
- ARIA roles for menus
- Screen reader friendly

## Advanced Customization

### Custom Action Handlers

```javascript
const handleAction = (actionId, file) => {
  switch (actionId) {
    case 'download':
      downloadFile(file.id);
      break;
    case 'share':
      openShareDialog(file);
      break;
    case 'trash':
      moveToTrash(file.id);
      break;
    case 'restore':
      restoreFromTrash(file.id);
      break;
    default:
      console.log('Unhandled action:', actionId);
  }
};
```

### Standalone Component Usage

Use individual components without FileManager:

```javascript
import { FileRow } from './components/FileManagement';

<FileRow
  file={fileObject}
  pageContext="MyDrive"
  permissionLevel="owner"
  onAction={handleAction}
  onClick={handleClick}
/>
```

## Performance Tips

1. Use `React.memo()` for FileRow/FileCard if rendering many files
2. Implement virtual scrolling for large lists (react-window)
3. Lazy load file thumbnails
4. Debounce search/filter operations

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

## License

Part of the OverDrive project.
