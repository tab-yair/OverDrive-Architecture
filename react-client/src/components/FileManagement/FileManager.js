import React, { useState } from 'react';
import FileRow from './FileRow';
import FileCard from './FileCard';
import ActionButton from './ActionButton';
import SelectionToolbar from './SelectionToolbar';
import { getMetadataConfig } from './fileUtils';
import './FileManager.css';

/**
 * FileManager Container Component
 * Manages the display of files in either List or Grid view
 * @param {Object} props
 * @param {Array} props.files - Array of file objects
 * @param {string} props.pageContext - Current page context
 * @param {string} props.permissionLevel - User's permission level
 * @param {boolean} props.isOwner - Whether current user is the owner
 * @param {string} props.viewMode - 'list' or 'grid'
 * @param {Function} props.onViewModeChange - Callback when view mode changes
 * @param {Function} props.onAction - Callback for file actions
 * @param {Function} props.onFileClick - Callback when file is clicked
 */
const FileManager = ({
  files = [],
  pageContext = 'MyDrive',
  permissionLevel = 'viewer',
  isOwner = true,
  viewMode = 'list',
  onViewModeChange,
  onAction,
  onFileClick,
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const metadataConfig = getMetadataConfig(pageContext);

  const handleViewToggle = (mode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  /**
   * UNIFIED SELECTION HANDLER
   * Single handler for both FileRow and FileCard
   * 
   * Logic:
   * - Normal Click: Clear previous selections, select only the clicked item
   * - Ctrl/Cmd + Click: Toggle the item's selection status without clearing others
   * 
   * @param {Object} file - The file object being clicked
   * @param {Event} event - The click event (to check for Ctrl/Cmd keys)
   */
  // Unified selection handler for both FileRow and FileCard
  const handleFileSelect = (file, event) => {
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + Click: Toggle selection without clearing others
      const isCurrentlySelected = selectedFiles.some(f => f.id === file.id);
      if (isCurrentlySelected) {
        setSelectedFiles(prev => prev.filter(f => f.id !== file.id));
      } else {
        setSelectedFiles(prev => [...prev, file]);
      }
    } else {
      // Normal Click: Clear previous selections and select only this item
      setSelectedFiles([file]);
    }
  };

  const handleFileClick = (file) => {
    // Open the file (selection is already cleared by handleFileSelect on normal click)
    if (onFileClick) {
      onFileClick(file);
    }
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
  };

  const handleBulkAction = (actionId, files) => {
    if (onAction) {
      // For bulk actions, call onAction for each file or handle as bulk
      files.forEach(file => onAction(actionId, file));
      
      // After action, might want to clear selection
      if (actionId === 'trash' || actionId === 'deletePermanently' || actionId === 'restore') {
        setSelectedFiles([]);
      }
    }
  };

  /**
   * CLICK-AWAY HANDLER
   * Clear selection when clicking on empty background areas
   * Works for both List View and Grid View
   */
  const handleBackgroundClick = (e) => {
    // Clear selection if clicking on the background (not on a specific file)
    const clickableBackgrounds = [
      'file-list',           // List view - file rows container
      'file-list-container', // List view - outer container
      'file-list-header',    // List view - header row
      'file-grid',           // Grid view - cards container
      'file-manager'         // Root container
    ];
    
    if (clickableBackgrounds.some(className => e.target.classList.contains(className))) {
      setSelectedFiles([]);
    }
  };

  const isFileSelected = (file) => {
    return selectedFiles.some(f => f.id === file.id);
  };

  if (files.length === 0) {
    return (
      <div className="file-manager-empty">
        <img src={`${process.env.PUBLIC_URL}/assets/folder.svg`} alt="" className="empty-icon" />
        <p className="empty-message">No files or folders</p>
        <p className="empty-submessage">Upload files or create folders to get started</p>
      </div>
    );
  }

  return (
    <div className="file-manager" onClick={handleBackgroundClick}>
      {/* Selection Toolbar */}
      {selectedFiles.length > 0 && (
        <SelectionToolbar
          selectedFiles={selectedFiles}
          pageContext={pageContext}
          permissionLevel={permissionLevel}
          isOwner={isOwner}
          onClearSelection={handleClearSelection}
          onAction={handleBulkAction}
        />
      )}

      {/* View Toggle */}
      <div className="file-manager-header">
        <div className="view-toggle">
          <button
            className={`view-toggle-button ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => handleViewToggle('list')}
            aria-label="List view"
          >
            <span className="material-symbols-outlined">view_list</span>
          </button>
          <button
            className={`view-toggle-button ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => handleViewToggle('grid')}
            aria-label="Grid view"
          >
            <span className="material-symbols-outlined">grid_view</span>
          </button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="file-list-container">
          {/* List Header */}
          <div className="file-list-header">
            <div className="file-list-header-name">Name</div>
            {metadataConfig.map((config) => (
              <div
                key={config.key}
                className="file-list-header-cell"
                style={{ width: config.width }}
              >
                {config.label}
              </div>
            ))}
            <div className="file-list-header-actions">Actions</div>
          </div>

          {/* File Rows */}
          <div className="file-list">
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                pageContext={pageContext}
                permissionLevel={permissionLevel}
                isOwner={isOwner}
                isSelected={isFileSelected(file)}
                onSelect={handleFileSelect}
                onAction={onAction}
                onClick={handleFileClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="file-grid">
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              pageContext={pageContext}
              permissionLevel={permissionLevel}
              isOwner={isOwner}
              isSelected={isFileSelected(file)}
              onSelect={handleFileSelect}
              onAction={onAction}
              onClick={handleFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileManager;
