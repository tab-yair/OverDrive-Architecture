import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Breadcrumbs.css';

/**
 * Breadcrumbs Component - Google Drive-style navigation
 * 
 * Features:
 * - Dynamic path based on current page context (My Drive, Starred, etc.)
 * - Expands as user navigates into subfolders
 * - Smart overflow with "..." dropdown for long paths
 * - All segments are clickable
 * - Updates automatically on URL changes
 */
const Breadcrumbs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { folderId } = useParams();
  const { token, user } = useAuth();
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [showOverflow, setShowOverflow] = useState(false);
  const [overflowItems, setOverflowItems] = useState([]);
  const containerRef = useRef(null);

  // Map route paths to root context names
  const getRootContext = (pathname) => {
    if (pathname.startsWith('/mydrive')) return { name: 'My Drive', path: '/mydrive', icon: 'folder' };
    if (pathname.startsWith('/starred')) return { name: 'Starred', path: '/starred', icon: 'star' };
    if (pathname.startsWith('/recent')) return { name: 'Recent', path: '/recent', icon: 'schedule' };
    if (pathname.startsWith('/trash')) return { name: 'Trash', path: '/trash', icon: 'delete' };
    if (pathname.startsWith('/shared')) return { name: 'Shared with me', path: '/shared', icon: 'people' };
    if (pathname.startsWith('/folders')) return null; // Will be determined dynamically
    return null;
  };

  /**
   * Build breadcrumb path by traversing parent folders
   * Returns { path: [...], isShared: boolean }
   */
  const buildBreadcrumbPath = async (currentFolderId) => {
    if (!token || !currentFolderId || !user) return { path: [], isShared: false };

    const path = [];
    let folderId = currentFolderId;
    let isShared = false;

    try {
      // Traverse up the folder hierarchy
      while (folderId) {
        const response = await fetch(`http://localhost:3000/api/files/${folderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) break;

        const folder = await response.json();
        
        // Check if this folder is shared (not owned by current user)
        if (folder.ownerId !== user.id || folder.sharedPermissionLevel) {
          isShared = true;
        }
        
        // Add folder to path (we'll reverse it later)
        path.unshift({
          id: folder.id,
          name: folder.name,
          path: `/folders/${folder.id}`
        });

        // Move to parent
        folderId = folder.parentId;
      }
    } catch (error) {
      console.error('Failed to build breadcrumb path:', error);
    }

    return { path, isShared };
  };

  /**
   * Update breadcrumbs when location or folderId changes
   */
  useEffect(() => {
    const updateBreadcrumbs = async () => {
      console.log('🍞 Breadcrumbs update triggered:', { 
        pathname: location.pathname, 
        folderId,
        timestamp: new Date().toISOString()
      });

      let rootContext = getRootContext(location.pathname);
      
      // If we're in a folder, determine root context based on ownership
      if (location.pathname.startsWith('/folders') && folderId) {
        console.log('📂 Building breadcrumb path for folder:', folderId);
        const { path: folderPath, isShared } = await buildBreadcrumbPath(folderId);
        console.log('📂 Folder path built:', { folderPath, isShared });
        
        // Set root context based on ownership
        rootContext = isShared 
          ? { name: 'Shared with me', path: '/shared', icon: 'people' }
          : { name: 'My Drive', path: '/mydrive', icon: 'folder' };
        
        const crumbs = [rootContext, ...folderPath];
        console.log('✅ Breadcrumbs set:', crumbs);
        setBreadcrumbs(crumbs);
        return;
      }
      
      if (!rootContext) {
        console.log('⚠️ No root context found for path:', location.pathname);
        setBreadcrumbs([]);
        return;
      }

      // Start with root context
      const crumbs = [rootContext];
      console.log('📍 Root context:', rootContext);

      // If we're in a folder (non-/folders route), build the full path
      if (folderId && !location.pathname.startsWith('/folders')) {
        console.log('📂 Building breadcrumb path for folder:', folderId);
        const { path: folderPath } = await buildBreadcrumbPath(folderId);
        console.log('📂 Folder path built:', folderPath);
        crumbs.push(...folderPath);
      }

      console.log('✅ Breadcrumbs set:', crumbs);
      setBreadcrumbs(crumbs);
    };

    updateBreadcrumbs();
  }, [location.pathname, folderId, token, user]);

  /**
   * Handle breadcrumb click navigation
   */
  const handleCrumbClick = (crumb) => {
    console.log('🧭 Breadcrumb click:', { 
      from: location.pathname, 
      to: crumb.path, 
      crumbName: crumb.name 
    });
    navigate(crumb.path);
  };

  /**
   * Toggle overflow dropdown
   */
  const toggleOverflow = (e) => {
    e.stopPropagation();
    console.log('Toggle overflow clicked, current state:', showOverflow);
    console.log('Overflow items:', overflowItems);
    setShowOverflow(!showOverflow);
  };

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    if (!showOverflow) return;

    const handleClickOutside = (e) => {
      // Close if clicking outside the breadcrumbs container
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowOverflow(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showOverflow]);

  /**
   * Calculate which items to show/hide based on available width
   * Implement smart truncation for long paths
   */
  useEffect(() => {
    const calculateOverflow = () => {
      console.log('Calculating overflow, breadcrumbs.length:', breadcrumbs.length);
      
      if (!containerRef.current || breadcrumbs.length <= 3) {
        console.log('No overflow needed');
        setOverflowItems([]);
        return;
      }

      // For long paths: show [Root] > [...] > [Parent] > [Current]
      if (breadcrumbs.length > 4) {
        const hiddenItems = breadcrumbs.slice(1, -2);
        console.log('Setting overflow items:', hiddenItems);
        setOverflowItems(hiddenItems);
      } else {
        console.log('Not enough breadcrumbs for overflow');
        setOverflowItems([]);
      }
    };

    calculateOverflow();
    window.addEventListener('resize', calculateOverflow);
    return () => window.removeEventListener('resize', calculateOverflow);
  }, [breadcrumbs]);

  if (breadcrumbs.length === 0) return null;

  const visibleCrumbs = overflowItems.length > 0
    ? [breadcrumbs[0], ...breadcrumbs.slice(-2)] // Root + last 2
    : breadcrumbs;

  console.log('Rendering breadcrumbs:', {
    totalBreadcrumbs: breadcrumbs.length,
    overflowItemsCount: overflowItems.length,
    visibleCrumbsCount: visibleCrumbs.length,
    showOverflow
  });

  return (
    <div className="breadcrumbs" ref={containerRef}>
      <div className="breadcrumbs-path">
        {visibleCrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path + index}>
            {/* Overflow dropdown trigger */}
            {index === 1 && overflowItems.length > 0 && (
              <>
                <div style={{ position: 'relative' }}>
                  <button
                    className="breadcrumb-overflow"
                    onClick={toggleOverflow}
                    title="Show hidden folders"
                  >
                    <span className="material-symbols-outlined">more_horiz</span>
                  </button>
                  
                  {/* Overflow dropdown menu */}
                  {showOverflow && (
                    <div className="breadcrumb-overflow-menu">
                      {overflowItems.map((item) => (
                        <button
                          key={item.id}
                          className="breadcrumb-overflow-item"
                          onClick={() => {
                            handleCrumbClick(item);
                            setShowOverflow(false);
                          }}
                        >
                          <span className="material-symbols-outlined">folder</span>
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="breadcrumb-separator">
                  <span className="material-symbols-outlined">chevron_right</span>
                </span>
              </>
            )}

            {/* Regular breadcrumb item */}
            <button
              className={`breadcrumb-item ${index === visibleCrumbs.length - 1 ? 'active' : ''}`}
              onClick={() => handleCrumbClick(crumb)}
              disabled={index === visibleCrumbs.length - 1}
            >
              {crumb.icon && (
                <span className="material-symbols-outlined breadcrumb-icon">
                  {crumb.icon}
                </span>
              )}
              <span className="breadcrumb-name">{crumb.name}</span>
            </button>

            {/* Separator (except for last item) */}
            {index < visibleCrumbs.length - 1 && (
              <span className="breadcrumb-separator">
                <span className="material-symbols-outlined">chevron_right</span>
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Breadcrumbs;
