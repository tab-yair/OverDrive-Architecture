import React, { useState, useEffect, useRef } from 'react';
import FileRow from './FileRow';
import FileCard from './FileCard';
import ActionButton from './ActionButton';
import SelectionToolbar from './SelectionToolbar';
import { getMetadataConfig, applyColumnWidths, groupFilesByTime } from './fileUtils';
import './FileManager.css';

/**
 * ═══════════════════════════════════════════════════════════════════
 * FileManager - GLOBAL LAYOUT COMPONENT
 * ═══════════════════════════════════════════════════════════════════
 * 
 * This is the central layout component that implements "Default First"
 * architecture for the entire application.
 * 
 * GLOBAL DEFAULTS:
 * ──────────────────────────────────────────────────────────────────
 * 1. View Mode: Grid View (cards) - applies to ALL views unless overridden
 * 2. Selection: Unified selection logic works identically in List/Grid
 * 3. Toolbar: Context-aware SelectionToolbar (Standard vs Trash actions)
 * 4. Click-Away: Background clicks clear selection globally
 * 5. Hover: Grey circle on enabled items, disabled items have pointer-events: none
 * 
 * LAYOUT-LEVEL BEHAVIORS:
 * ──────────────────────────────────────────────────────────────────
 * - Clicking empty space → Clears selection (and closes Info Panel if present)
 * - Selection state is managed at this level, not in pages
 * - Toolbar dynamically changes based on pageContext (Standard/Trash)
 * - All new pages automatically inherit these behaviors
 * 
 * FUTURE EXTENSIBILITY:
 * ──────────────────────────────────────────────────────────────────
 * - New pages/folders: Automatically get Grid view + Standard toolbar
 * - Override view mode: Pass viewMode prop from parent if needed
 * - Custom toolbars: pageContext determines which toolbar actions appear
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * FileManager Container Component
 * Manages the display of files in either List or Grid view
 * @param {Object} props
 * @param {Array} props.files - Array of file objects
 * @param {string} props.pageContext - Current page context ('MyDrive', 'Shared', 'Trash', etc.)
 * @param {string} props.permissionLevel - User's permission level
 * @param {boolean} props.isOwner - Whether current user is the owner
 * @param {string} props.viewMode - 'list' or 'grid' (default: 'grid')
 * @param {Function} props.onViewModeChange - Callback when view mode changes
 * @param {Function} props.onAction - Callback for file actions
 * @param {Function} props.onFileClick - Callback when file is clicked
 * @param {Function} props.onFileDoubleClick - Callback when file is double-clicked
 * @param {Function} props.onSelectionChange - Callback when selection changes (receives count)
 */
const FileManager = ({
  files = [],
  pageContext = 'MyDrive',
  permissionLevel = 'viewer',
  isOwner = true,
  viewMode = 'grid', // GLOBAL DEFAULT: Grid View for all new pages
  onViewModeChange,
  onAction,
  onFileClick,
  onFileDoubleClick,
  onSelectionChange,
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const containerRef = useRef(null);
  const metadataConfig = getMetadataConfig(pageContext);

  // Apply column widths as CSS variables when pageContext changes
  useEffect(() => {
    applyColumnWidths(pageContext, containerRef.current);
  }, [pageContext]);

  // Notify parent component when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedFiles.length);
    }
  }, [selectedFiles, onSelectionChange]);

  /**
   * ═══════════════════════════════════════════════════════════════
   * FILE SORTING AND GROUPING LOGIC
   * ═══════════════════════════════════════════════════════════════
   * 
   * DEFAULT: Folders and files always separate
   * - Folders appear first
   * - Files appear after folders
   * - In Grid view: folders and files never share the same row
   * 
   * EXCEPTIONS - Recent/Shared Views:
   * - Mixed layout: folders and files intermixed based on time grouping
   * ═══════════════════════════════════════════════════════════════
   */
  
  // Default: separate folders and files (except in Recent/Shared where they're mixed)
  const shouldGroupFolders = pageContext !== 'Recent' && pageContext !== 'Shared';
  
  // Sort and group files
  let sortedFiles = [...files];
  let folders = [];
  let regularFiles = [];
  
  if (shouldGroupFolders) {
    // Separate folders and files
    folders = sortedFiles.filter(f => f.type === 'folder');
    regularFiles = sortedFiles.filter(f => f.type !== 'folder');
  } else {
    // Keep mixed for Recent/Shared views
    regularFiles = sortedFiles;
  }

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
   * ═══════════════════════════════════════════════════════════════
   * GLOBAL CLICK-AWAY DESELECTION HANDLER
   * ═══════════════════════════════════════════════════════════════
   * 
   * This is a LAYOUT-LEVEL behavior that applies to ALL views.
   * Clicking on empty space triggers a "neutral state" reset:
   * 
   * 1. Clears all file selections
   * 2. Should close Info Panel (Details pane) if implemented
   * 3. Resets UI to neutral state
   * 
   * Why at this level?
   * - Ensures consistent behavior across ALL pages
   * - New pages automatically inherit this behavior
   * - No need to reimplement per page
   * 
   * Clickable Areas (trigger deselection):
   * - .file-manager (root container + 24px padding gaps)
   * - .file-list-container (list view outer container)
   * - .file-list-header (header row with column names)
   * - .file-list (empty space below rows)
   * - .file-grid (empty space between cards)
   * 
   * NOT Clickable (FileRow/FileCard stop propagation):
   * - Individual file rows
   * - Individual file cards
   * - Action buttons
   * - Context menus
   * 
   * ═══════════════════════════════════════════════════════════════
   */
  const handleBackgroundClick = (e) => {
    // Clear selection if clicking on the background (not on a specific file)
    const clickableBackgrounds = [
      'file-list',           // List view - file rows container
      'file-list-container', // List view - outer container
      'file-list-header',    // List view - header row
      'file-grid',           // Grid view - cards container
      'file-grid-container', // Grid view - wrapper container
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
    <div ref={containerRef} className="file-manager" onClick={handleBackgroundClick}>
      {/* Reserved Toolbar Slot - Prevents layout shift */}
      <div className="selection-toolbar-slot">
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
      </div>

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
              >
                {config.label}
              </div>
            ))}
            <div className="file-list-header-actions"></div>
          </div>

          {/* File Rows */}
          <div className="file-list">
            {shouldGroupFolders ? (
              <>
                {/* Folders Section */}
                {folders.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    pageContext={pageContext}
                    permissionLevel={permissionLevel}
                    isOwner={isOwner}
                    isSelected={isFileSelected(file)}
                    selectedCount={selectedFiles.length}
                    onSelect={handleFileSelect}
                    onAction={onAction}
                    onClick={handleFileClick}
                    onDoubleClick={onFileDoubleClick}
                  />
                ))}
                
                {/* Files Section */}
                {regularFiles.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    pageContext={pageContext}
                    permissionLevel={permissionLevel}
                    isOwner={isOwner}
                    isSelected={isFileSelected(file)}
                    selectedCount={selectedFiles.length}
                    onSelect={handleFileSelect}
                    onAction={onAction}
                    onClick={handleFileClick}
                    onDoubleClick={onFileDoubleClick}
                  />
                ))}
              </>
            ) : (
              /* Mixed layout for Recent/Shared - with time grouping */
              (() => {
                if (pageContext === 'Recent' || pageContext === 'Shared') {
                  const dateField = pageContext === 'Recent' ? 'activity' : 'shareDate';
                  const timeGroups = groupFilesByTime(regularFiles, dateField);
                  
                  return Object.entries(timeGroups).map(([groupName, groupFiles]) =>
                    groupFiles.length > 0 ? (
                      <div key={groupName} className="time-group-section">
                        <div className="time-group-header">{groupName}</div>
                        {groupFiles.map((file) => (
                          <FileRow
                            key={file.id}
                            file={file}
                            pageContext={pageContext}
                            permissionLevel={permissionLevel}
                            isOwner={isOwner}
                            isSelected={isFileSelected(file)}
                            selectedCount={selectedFiles.length}
                            onSelect={handleFileSelect}
                            onAction={onAction}
                            onClick={handleFileClick}
                            onDoubleClick={onFileDoubleClick}
                          />
                        ))}
                      </div>
                    ) : null
                  );
                } else {
                  // Default mixed layout for other pages
                  return regularFiles.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      pageContext={pageContext}
                      permissionLevel={permissionLevel}
                      isOwner={isOwner}
                      isSelected={isFileSelected(file)}
                      selectedCount={selectedFiles.length}
                      onSelect={handleFileSelect}
                      onAction={onAction}
                      onClick={handleFileClick}
                      onDoubleClick={onFileDoubleClick}
                    />
                  ));
                }
              })()
            )}
          </div>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="file-grid-container" onClick={handleBackgroundClick}>
          {shouldGroupFolders ? (
            <>
              {/* Folders Grid - Separate container */}
              {folders.length > 0 && (
                <div className="file-grid">
                  {folders.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      pageContext={pageContext}
                      permissionLevel={permissionLevel}
                      isOwner={isOwner}
                      isSelected={isFileSelected(file)}
                      selectedCount={selectedFiles.length}
                      onSelect={handleFileSelect}
                      onAction={onAction}
                      onClick={handleFileClick}
                      onDoubleClick={onFileDoubleClick}
                    />
                  ))}
                </div>
              )}
              
              {/* Files Grid - Separate container (starts on new row) */}
              {regularFiles.length > 0 && (
                <div className="file-grid">
                  {regularFiles.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      pageContext={pageContext}
                      permissionLevel={permissionLevel}
                      isOwner={isOwner}
                      isSelected={isFileSelected(file)}
                      selectedCount={selectedFiles.length}
                      onSelect={handleFileSelect}
                      onAction={onAction}
                      onClick={handleFileClick}
                      onDoubleClick={onFileDoubleClick}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Mixed layout for Recent/Shared - with time grouping in grid */
            (() => {
              if (pageContext === 'Recent' || pageContext === 'Shared') {
                const dateField = pageContext === 'Recent' ? 'activity' : 'shareDate';
                const timeGroups = groupFilesByTime(regularFiles, dateField);
                
                return Object.entries(timeGroups).map(([groupName, groupFiles]) =>
                  groupFiles.length > 0 ? (
                    <div key={groupName} className="time-group-section">
                      <div className="time-group-header">{groupName}</div>
                      <div className="file-grid">
                        {groupFiles.map((file) => (
                          <FileCard
                            key={file.id}
                            file={file}
                            pageContext={pageContext}
                            permissionLevel={permissionLevel}
                            isOwner={isOwner}
                            isSelected={isFileSelected(file)}
                            selectedCount={selectedFiles.length}
                            onSelect={handleFileSelect}
                            onAction={onAction}
                            onClick={handleFileClick}
                            onDoubleClick={onFileDoubleClick}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null
                );
              } else {
                // Default mixed layout for other pages
                return (
                  <div className="file-grid">
                    {regularFiles.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        pageContext={pageContext}
                        permissionLevel={permissionLevel}
                        isOwner={isOwner}
                        isSelected={isFileSelected(file)}
                        selectedCount={selectedFiles.length}
                        onSelect={handleFileSelect}
                        onAction={onAction}
                        onClick={handleFileClick}
                        onDoubleClick={onFileDoubleClick}
                      />
                    ))}
                  </div>
                );
              }
            })()
          )}
        </div>
      )}
    </div>
  );
};

export default FileManager;
