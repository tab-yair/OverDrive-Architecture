import React from 'react';
import { useNavigation } from '../../context/NavigationContext';
import './Breadcrumbs.css';

/**
 * Breadcrumbs Component - Shows navigation path for folders
 * Example: My Drive > Projects > Assets > Photos
 * 
 * @param {Object} props
 * @param {Array} props.path - Array of {id, name} objects representing the path
 */
const Breadcrumbs = ({ path = [] }) => {
  const { navigateToFolder } = useNavigation();

  const handleCrumbClick = (crumb, index) => {
    // Don't navigate if clicking the last crumb (current location)
    if (index === path.length - 1) return;

    // Navigate to the clicked folder
    navigateToFolder(crumb.id);
  };

  // Root crumb (My Drive)
  const rootCrumb = { id: 'root', name: 'My Drive' };

  return (
    <div className="breadcrumbs">
      {/* Root crumb */}
      <span
        className={`breadcrumb-item ${path.length === 0 ? 'current' : 'clickable'}`}
        onClick={() => path.length > 0 && navigateToFolder('root')}
        role="button"
        tabIndex={0}
      >
        {rootCrumb.name}
      </span>

      {/* Path crumbs */}
      {path.map((crumb, index) => (
        <React.Fragment key={crumb.id}>
          <span className="breadcrumb-separator">/</span>
          <span
            className={`breadcrumb-item ${index === path.length - 1 ? 'current' : 'clickable'}`}
            onClick={() => handleCrumbClick(crumb, index)}
            role="button"
            tabIndex={0}
          >
            {crumb.name}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumbs;
