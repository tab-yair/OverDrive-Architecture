import React from 'react';
import './ActionButton.css';

/**
 * Reusable circular action button component
 * @param {Object} props
 * @param {string} props.iconSrc - Imported SVG source
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {string} props.ariaLabel - Accessibility label
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.iconClassName - Additional CSS classes for icon img
 */
const ActionButton = ({ iconSrc, onClick, disabled = false, ariaLabel, className = '', iconClassName = '' }) => {
  console.log('🔘 ActionButton render:', { 
    iconSrc, 
    disabled, 
    ariaLabel,
    hasIcon: !!iconSrc,
    iconExists: iconSrc && iconSrc.length > 0
  });

  return (
    <button
      className={`action-button ${className} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      type="button"
    >
      <img 
        src={iconSrc} 
        alt="" 
        className={`action-button-icon ${iconClassName}`}
        onError={(e) => console.error('❌ Icon failed to load:', iconSrc, e)}
        onLoad={() => console.log('✅ Icon loaded:', iconSrc)}
      />
    </button>
  );
};

export default ActionButton;
