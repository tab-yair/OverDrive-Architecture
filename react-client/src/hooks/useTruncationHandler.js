import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook for handling double-click on truncated text elements
 * Displays full text content in a floating tooltip when an element with truncated text is double-clicked
 * The tooltip disappears when you move the mouse away from it
 * 
 * Usage: Add this hook at the root App level (in App.js or a root component)
 * - Automatically detects elements with title attribute (which contain full text)
 * - On double-click, shows the full text in a floating tooltip
 * - Tooltip disappears on mouseleave (non-intrusive, doesn't block other interactions)
 * - Works on any element with text-overflow: ellipsis
 */
export function useTruncationHandler() {
  const [fullText, setFullText] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef(null);

  useEffect(() => {
    const handleDoubleClick = (event) => {
      // Check if the target element has a title attribute (full text)
      const titleText = event.target.getAttribute('title');
      
      if (titleText) {
        // Calculate tooltip position relative to the clicked element
        const rect = event.target.getBoundingClientRect();
        
        setFullText(titleText);
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 8, // Position above the element
        });
      }
    };

    // Attach listener to document for event delegation
    // This covers all elements in the app
    document.addEventListener('dblclick', handleDoubleClick);

    return () => {
      document.removeEventListener('dblclick', handleDoubleClick);
    };
  }, []);

  // Handle mouse leave on tooltip to dismiss it
  const handleTooltipMouseLeave = () => {
    setFullText(null);
  };

  // Tooltip component to display full text
  const TruncationTooltip = () => {
    if (!fullText) return null;

    return (
      <div 
        ref={tooltipRef}
        className="truncation-tooltip"
        onMouseLeave={handleTooltipMouseLeave}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="truncation-tooltip-content">
          {fullText}
        </div>
        <div className="truncation-tooltip-arrow"></div>
      </div>
    );
  };

  return <TruncationTooltip />;
}

export default useTruncationHandler;
