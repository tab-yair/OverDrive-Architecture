import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { buildBreadcrumbPath } from '../../utils/breadcrumbsUtils';
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
    if (pathname.startsWith('/search')) return { name: 'Search', path: '/search', icon: 'search' };
    if (pathname.startsWith('/folders')) return null; // Will be determined dynamically
    return null;
  };

  /**
   * Update breadcrumbs when location or folderId changes
   */
  useEffect(() => {
    const updateBreadcrumbs = async () => {
      let rootContext = getRootContext(location.pathname);
      
      // If we're in a folder, determine root context based on ownership
      if (location.pathname.startsWith('/folders') && folderId) {
        const { path: folderPath, isShared } = await buildBreadcrumbPath(folderId, token, user);
        
        // Set root context based on ownership
        rootContext = isShared 
          ? { name: 'Shared with me', path: '/shared', icon: 'people' }
          : { name: 'My Drive', path: '/mydrive', icon: 'folder' };
        
        const crumbs = [rootContext, ...folderPath];
        setBreadcrumbs(crumbs);
        return;
      }
      
      if (!rootContext) {
        setBreadcrumbs([]);
        return;
      }

      // Start with root context
      const crumbs = [rootContext];

      // If we're in a folder (non-/folders route), build the full path
      if (folderId && !location.pathname.startsWith('/folders')) {
        const { path: folderPath } = await buildBreadcrumbPath(folderId, token, user);
        crumbs.push(...folderPath);
      }

      setBreadcrumbs(crumbs);
    };

    updateBreadcrumbs();
  }, [location.pathname, folderId, token, user]);

  /**
   * Handle breadcrumb click navigation
   */
  const handleCrumbClick = (crumb) => {
    navigate(crumb.path);
  };

  /**
   * Toggle overflow dropdown
   */
  const toggleOverflow = (e) => {
    e.stopPropagation();
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
      if (!containerRef.current || breadcrumbs.length <= 3) {
        setOverflowItems([]);
        return;
      }

      // For long paths: show [Root] > [...] > [Parent] > [Current]
      if (breadcrumbs.length > 4) {
        const hiddenItems = breadcrumbs.slice(1, -2);
        setOverflowItems(hiddenItems);
      } else {
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
