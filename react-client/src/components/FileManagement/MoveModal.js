import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './MoveModal.css';
import { useAuth } from '../../context/AuthContext';
import { filesApi } from '../../services/api';
import { useFilesContext } from '../../context/FilesContext';

function MoveModal({ isOpen, onClose, targets = [], initialParentId = null }) {
  const { token } = useAuth();
  const { moveFiles } = useFilesContext();

  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(initialParentId);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'My Drive' }]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [error, setError] = useState(null);

  const effectiveDestination = useMemo(() => {
    if (selectedDestination !== null && selectedDestination !== undefined) return selectedDestination;
    if (currentFolderId !== undefined) return currentFolderId || null;
    return null;
  }, [selectedDestination, currentFolderId]);

  const loadFolder = useCallback(async (folderId = null, path = [{ id: null, name: 'My Drive' }]) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await filesApi.getFiles(token, { parentId: folderId });
      const onlyFolders = (result || []).filter((f) => f.type === 'folder' && !f.isTrashed);
      setFolders(onlyFolders);
      setCurrentFolderId(folderId);
      setBreadcrumbs(path);
      setSearchResults([]);
      setSearchTerm('');
      setSelectedDestination(folderId);
    } catch (err) {
      setError(err.message || 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      loadFolder(initialParentId, [{ id: null, name: 'My Drive' }]);
    }
  }, [isOpen, initialParentId, loadFolder]);

  useEffect(() => {
    let timeout;
    if (searchTerm.trim().length > 0) {
      setSearchLoading(true);
      timeout = setTimeout(async () => {
        try {
          const res = await filesApi.searchFolders(token, searchTerm.trim());
          const foldersOnly = (res || []).filter((f) => f.type === 'folder' && !f.isTrashed);
          setSearchResults(foldersOnly);
        } catch (err) {
          setError(err.message || 'Failed to search folders');
        } finally {
          setSearchLoading(false);
        }
      }, 250);
    } else {
      setSearchResults([]);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchTerm, token]);

  const handleFolderClick = (folder) => {
    const newPath = [...breadcrumbs, { id: folder.id, name: folder.name }];
    loadFolder(folder.id, newPath);
  };

  const handleBreadcrumbClick = (index) => {
    const crumb = breadcrumbs[index];
    const newPath = breadcrumbs.slice(0, index + 1);
    loadFolder(crumb.id, newPath);
  };

  const handleConfirm = async () => {
    if (!targets || targets.length === 0) return;
    const destination = effectiveDestination;
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

  const listToRender = searchTerm.trim().length > 0 ? searchResults : folders;

  return (
    <div className="move-modal-overlay" onClick={onClose}>
      <div className="move-modal" onClick={(e) => e.stopPropagation()}>
        <div className="move-modal__header">
          <h3>Select destination folder</h3>
          <button className="move-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="move-modal__search">
          <input
            type="text"
            placeholder="Search folder"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchLoading && <span className="move-modal__loader">…</span>}
        </div>

        <div className="move-modal__list">
          {loading ? (
            <div className="move-modal__empty">Loading folders…</div>
          ) : error ? (
            <div className="move-modal__empty error">{error}</div>
          ) : listToRender.length === 0 ? (
            <div className="move-modal__empty">No folders found</div>
          ) : (
            listToRender.map((folder) => (
              <button
                key={folder.id}
                className={`move-modal__row ${effectiveDestination === folder.id ? 'selected' : ''}`}
                onClick={() => setSelectedDestination(folder.id)}
                onDoubleClick={() => handleFolderClick(folder)}
              >
                <span className="material-symbols-outlined">folder</span>
                <span className="move-modal__name">{folder.name}</span>
                <span className="move-modal__hint">Double-click to enter</span>
              </button>
            ))
          )}
        </div>

        <div className="move-modal__breadcrumbs">
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.id ?? 'root'}>
              <button className="crumb" onClick={() => handleBreadcrumbClick(idx)}>
                {crumb.name}
              </button>
              {idx < breadcrumbs.length - 1 && <span className="crumb-sep">/</span>}
            </span>
          ))}
        </div>

        <div className="move-modal__actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            onClick={handleConfirm}
            disabled={targets.length === 0 || loading}
          >
            Move here
          </button>
        </div>
      </div>
    </div>
  );
}

export default MoveModal;
