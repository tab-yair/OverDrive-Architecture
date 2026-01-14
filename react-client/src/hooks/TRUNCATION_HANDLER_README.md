# Truncation Handler - Double-Click to View Full Text

## Overview

A global, code-level solution for viewing full text content when truncated text is double-clicked. Works automatically on any element with a `title` attribute (which contains the full text).

## How It Works

### 1. **Automatic Detection**
   - The hook uses event delegation with a global `dblclick` listener on `document`
   - Detects any element with a `title` attribute (the full text)
   - No per-element configuration needed

### 2. **Double-Click Behavior**
   - User double-clicks on any truncated text element
   - A modal overlay appears centered near the click location
   - Modal displays the full text from the `title` attribute
   - Click outside modal or the × button to close

### 3. **Implementation Details**

**Hook Location:** `react-client/src/hooks/useTruncationHandler.js`
- `useTruncationHandler()`: Main hook that manages modal state
- Returns a `<TruncationModal />` component to render in your app

**Styling:** `react-client/src/hooks/useTruncationHandler.css`
- Smooth animations
- Dark theme support
- Responsive positioning

**Integration:** Already integrated in `App.js`
- Imported hook and CSS
- Renders modal component at app root level

## Current Elements with Title Attributes

The following components already have `title` attributes set on truncated text:

### FileRow.js
- File name (`.file-name-text`)
- Metadata sharer (`.metadata-sharer`)
- Metadata location (`.metadata-location`)
- Metadata owner (`.metadata-owner`)

### InfoSidebar.js
- Owner name (`.info-sidebar__owner-name`)
- Owner username (`.info-sidebar__owner-username`)
- Location name (`.info-sidebar__location-name`)

### PermissionsManager.js
- User name (`.perm-name`)
- User username (`.perm-username`)

## Adding to New Components

To enable this feature on any truncated text element:

```jsx
// Simply add a title attribute with the full text
<div 
  className="my-truncated-text"
  title={fullTextContent}
>
  {truncatedText}
</div>
```

The hook automatically:
- ✅ Detects double-click on elements with `title` attribute
- ✅ Shows modal with full text
- ✅ Handles positioning and animations
- ✅ Supports light/dark themes
- ✅ No additional component code needed

## Technical Architecture

```
App.js (root)
  ├── useTruncationHandler() hook
  │   ├── Manages modal state (fullText, position)
  │   ├── Listens for dblclick globally
  │   └── Renders TruncationModal component
  │
  └── All child components
      ├── FileRow (elements with title attrs)
      ├── InfoSidebar (elements with title attrs)
      └── PermissionsManager (elements with title attrs)
```

## Styling Customization

Modify `useTruncationHandler.css` to adjust:
- **Modal width/height**: Update `max-width`, `max-height` in `.truncation-modal`
- **Animation**: Modify `truncationModalSlideIn` keyframes
- **Colors**: Change values in dark/light theme sections
- **Position**: Adjust modal position logic in the hook

## Browser Compatibility

- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- CSS animations degrade gracefully in older browsers

## Performance

- **Event Delegation**: Single listener on document (not one per element)
- **Zero Impact**: Only activates on double-click
- **Memory Efficient**: No DOM manipulation until modal is shown
- **Auto-cleanup**: Event listener removed on component unmount

## Example Usage Scenarios

1. **File names that are too long** → Double-click to see full name
2. **Email addresses** → See full email address
3. **Folder paths** → View complete file path
4. **User names** → Display full user name
5. **Any truncated metadata** → View full content

---

**No more manual title attribute juggling!** This solution works globally for any element with truncated text.
