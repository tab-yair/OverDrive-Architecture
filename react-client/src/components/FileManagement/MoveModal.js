import React, { useState } from 'react';
import './MoveModal.css';
import { useAuth } from '../../context/AuthContext';
import { filesApi } from '../../services/api';
import { useFilesContext } from '../../context/FilesContext';
import { buildBreadcrumbPath } from '../../utils/breadcrumbsUtils';

function MoveModal({ isOpen, onClose, targets = [], initialParentId = null }) {
  const { token, user } = useAuth();
  const { moveFiles } = useFilesContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchExecuted, setSearchExecuted] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedBreadcrumbs, setSelectedBreadcrumbs] = useState([]);
  const [error, setError] = useState(null);

  // Handle search - triggered only on Enter key
  const handleSearch = async () => {
    const query = searchTerm.trim();
    if (query.length === 0) {
      setSearchResults([]);
      setSearchExecuted(false);
      return;
    }

    // Clear previous selection and breadcrumbs when starting new search
    setSelectedFolder(null);
    setSelectedBreadcrumbs([]);
    setSearchLoading(true);
    setSearchExecuted(true);
    setError(null);

    try {
      const results = await filesApi.searchFolders(token, query);
      const foldersOnly = (results || []).filter((f) => f.type === 'folder' && !f.isTrashed);
      setSearchResults(foldersOnly);
    } catch (err) {
      setError(err.message || 'Search failed');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle folder selection from search results
  const handleFolderSelect = async (folder) => {
    setSelectedFolder(folder);
    // Build breadcrumb path for selected folder using shared function
    const { path: folderPath, isShared } = await buildBreadcrumbPath(folder.id, token, user);
    
    // Set root context based on ownership (same logic as Breadcrumbs component)
    const rootContext = isShared 
      ? { id: null, name: 'Shared with me' }
      : { id: null, name: 'My Drive' };
    
    const breadcrumbs = [rootContext, ...folderPath];
    setSelectedBreadcrumbs(breadcrumbs);
  };

  const handleConfirm = async () => {
    if (!targets || targets.length === 0) return;
    if (!selectedFolder) {
      alert('Please select a destination folder');
      return;
    }

    const destination = selectedFolder.id;
    const idsToMove = targets
      .map((t) => t.id)
      .filter((id) => id !== undefined && id !== null);

    try {
      const result = await moveFiles(idsToMove, destination);
      if (!result.success) {
        const msg = (result.error || '').toLowerCase();
        const permissionBlocked = msg.includes('permission');
        const friendly = permissionBlocked
          ? 'You do not have permission to add files to this folder'
          : (result.error || 'Move failed');
        alert(friendly);
        return;
      }
      onClose();
    } catch (err) {
      const msg = (err?.message || '').toLowerCase();
      const permissionBlocked = msg.includes('permission');
      const friendly = permissionBlocked
        ? 'You do not have permission to add files to this folder'
        : (err?.message || 'Move failed');
      alert(friendly);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="move-modal-overlay" onClick={onClose}>
      <div className="move-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="move-modal__header">
          <h3>Select destination folder</h3>
          <button className="move-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Search Section */}
        <div className="move-modal__search">
          <input
            type="text"
            placeholder="Search for a folder..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
          {searchLoading && <span className="move-modal__loader">…</span>}
        </div>

        {/* Results List */}
        <div className="move-modal__list">
          {searchLoading ? (
            <div className="move-modal__empty">Searching folders...</div>
          ) : error ? (
            <div className="move-modal__empty error">{error}</div>
          ) : !searchExecuted ? (
            <div className="move-modal__empty">Type folder name and press Enter to search</div>
          ) : searchResults.length === 0 ? (
            <div className="move-modal__empty">No folder found matching "{searchTerm}"</div>
          ) : (
            searchResults.map((folder) => (
              <button
                key={folder.id}
                className={`move-modal__row ${selectedFolder?.id === folder.id ? 'selected' : ''}`}
                onClick={() => handleFolderSelect(folder)}
              >
                <span className="material-symbols-outlined">folder</span>
                <span className="move-modal__name">{folder.name}</span>
              </button>
            ))
          )}
        </div>

        {/* Breadcrumbs Footer - shown only when folder is selected */}
        {selectedFolder && selectedBreadcrumbs.length > 0 && (
          <div className="move-modal__breadcrumbs-footer">
            <div className="move-modal__breadcrumbs-label">Destination path:</div>
            <div className="move-modal__breadcrumbs">
              {selectedBreadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id ?? 'root'}>
                  <span className="crumb">{crumb.name}</span>
                  {idx < selectedBreadcrumbs.length - 1 && <span className="crumb-sep"> &gt; </span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="move-modal__actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            onClick={handleConfirm}
            disabled={!selectedFolder || targets.length === 0}
          >
            Move here
          </button>
        </div>
      </div>
    </div>
  );
}

export default MoveModal;
