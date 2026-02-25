import React from 'react';
import './PageTransition.css';

/**
 * PageTransition - Wrapper component that provides smooth fade-in transitions
 * for page content. Prevents flickering when navigating between routes.
 * 
 * Uses CSS-only animations triggered on mount for best performance.
 * No dependencies on external animation libraries.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content to render
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.transitionKey - Optional key to force re-transition (e.g., for same-page param changes)
 */
const PageTransition = ({ children, className = '', transitionKey }) => {
  return (
    <div 
      key={transitionKey} 
      className={`page-transition ${className}`.trim()}
    >
      {children}
    </div>
  );
};

export default PageTransition;
