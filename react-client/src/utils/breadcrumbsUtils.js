/**
 * Build breadcrumb path by traversing parent folders
 * Returns { path: [...], isShared: boolean }
 * Shared utility for Breadcrumbs component and MoveModal
 */
export const buildBreadcrumbPath = async (currentFolderId, token, user) => {
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
