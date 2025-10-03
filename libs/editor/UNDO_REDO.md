# Enhanced Undo/Redo Functionality

This document describes the comprehensive undo/redo implementation for the Tiptap v3 editor, including visual controls, enhanced history management, and compatibility with all editor features.

## Features Implemented

### 1. Visual Undo/Redo Buttons
- **Location**: Integrated into the main toolbar (`libs/editor/src/lib/components/menus/Toolbar.tsx`)
- **Component**: Dedicated `UndoRedoButtons` component (`libs/editor/src/lib/components/ui/UndoRedoButtons.tsx`)
- **Visual Feedback**: 
  - Buttons are disabled when actions aren't available
  - Icons change opacity based on state
  - Hover effects with scale animations
  - Active state indicators

### 2. Enhanced History Management
- **Configuration**: Updated `kit.ts` with optimized history settings
  - History depth: 100 operations (configurable)
  - Group delay: 500ms between changes
- **Real-time State Tracking**: Custom hook `useEditorHistory` provides live updates
- **Error Handling**: Safe execution with fallback mechanisms

### 3. Keyboard Shortcuts
- **Undo**: `Ctrl+Z` (Windows/Linux) / `Cmd+Z` (macOS)
- **Redo**: `Ctrl+Y` (Windows/Linux) / `Cmd+Shift+Z` (macOS)
- **Platform Detection**: Automatic detection of operating system for correct shortcuts
- **Tooltips**: Display keyboard shortcuts in button tooltips

### 4. Accessibility Features
- **ARIA Labels**: Proper accessibility labels for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Visual Indicators**: Clear disabled/enabled states
- **Focus Management**: Maintains editor focus after operations

### 5. Compatibility with Existing Features

#### Drag and Drop Integration
- **Seamless Operation**: Undo/redo works with all drag operations
- **Transaction Tracking**: Drag operations are properly tracked in history
- **Node Movement**: Moving content via drag handles creates undo points
- **No Conflicts**: History and drag systems work independently

#### Content Type Support
The undo/redo system works with all editor content types:
- **Text Formatting**: Bold, italic, underline, strikethrough, code
- **Headings**: All heading levels (H1-H6)
- **Lists**: Bullet lists, ordered lists, task lists
- **Tables**: Table creation, editing, and deletion
- **Images**: Image insertion and manipulation
- **Code Blocks**: Syntax-highlighted code blocks
- **Custom Widgets**: Alert widgets, CTA widgets
- **Block Elements**: Blockquotes, horizontal rules

## API Reference

### UndoRedoButtons Component

```tsx
import { UndoRedoButtons } from '@nextblock-cms/editor';

<UndoRedoButtons 
  editor={editor}
  size="sm" | "md" | "lg"
  showLabels={boolean}
  className={string}
/>
```

**Props:**
- `editor`: Tiptap editor instance
- `size`: Button size variant
- `showLabels`: Whether to show text labels
- `className`: Additional CSS classes

### useEditorHistory Hook

```tsx
import { useEditorHistory } from '@nextblock-cms/editor';

const {
  canUndo,
  canRedo,
  historyDepth,
  isHistoryEmpty,
  undo,
  redo,
  clearHistory,
  getHistoryState
} = useEditorHistory(editor);
```

**Returns:**
- `canUndo`: Boolean indicating if undo is available
- `canRedo`: Boolean indicating if redo is available
- `historyDepth`: Number of available history steps
- `isHistoryEmpty`: Boolean indicating if history is empty
- `undo()`: Function to execute undo operation
- `redo()`: Function to execute redo operation
- `clearHistory()`: Function to clear all history
- `getHistoryState()`: Function to get current history state

### Utility Functions

```tsx
import { 
  canExecuteHistoryAction, 
  executeHistoryAction, 
  getHistoryShortcut 
} from '@nextblock-cms/editor';

// Check if action is available
const canUndo = canExecuteHistoryAction(editor, 'undo');

// Execute action safely
const success = executeHistoryAction(editor, 'redo');

// Get platform-specific shortcut
const undoShortcut = getHistoryShortcut('undo'); // "Ctrl+Z" or "Cmd+Z"
```

## Configuration

### History Extension Settings

The history extension is configured in `kit.ts`:

```typescript
StarterKit.configure({
  history: {
    depth: 100,           // Maximum history events
    newGroupDelay: 500,   // Delay between groups (ms)
  },
  // ... other settings
})
```

### Customization Options

#### Button Styling
The UndoRedoButtons component supports full customization:

```tsx
<UndoRedoButtons 
  editor={editor}
  className="custom-undo-redo"
  size="lg"
  showLabels={true}
/>
```

#### History Behavior
Modify history settings in the kit configuration:

```typescript
// Increase history depth
history: {
  depth: 200,
  newGroupDelay: 1000,
}

// Disable history (not recommended)
history: false,
```

## Testing

### Manual Testing
1. Use the test component: `UndoRedoTest` (development only)
2. Test with various content types
3. Verify keyboard shortcuts work
4. Test drag and drop compatibility
5. Check accessibility with screen readers

### Automated Testing
The implementation includes comprehensive error handling and safe execution patterns to prevent issues in production.

## Best Practices

### Performance
- History operations are optimized for performance
- Real-time state updates use efficient event listeners
- Memory usage is controlled by history depth limits

### User Experience
- Visual feedback provides clear action availability
- Keyboard shortcuts follow platform conventions
- Tooltips include helpful shortcut information
- Disabled states prevent user confusion

### Accessibility
- All buttons have proper ARIA labels
- Keyboard navigation is fully supported
- Visual indicators work with high contrast modes
- Screen reader compatibility is maintained

## Troubleshooting

### Common Issues

1. **Undo/Redo not working**
   - Ensure editor instance is properly passed
   - Check that history extension is enabled
   - Verify no conflicting extensions

2. **Keyboard shortcuts not responding**
   - Check if editor has focus
   - Verify no other elements are capturing events
   - Ensure proper event listener setup

3. **Visual state not updating**
   - Confirm useEditorHistory hook is used correctly
   - Check editor event listeners are properly attached
   - Verify component re-rendering

### Debug Information

Enable debug logging by checking the browser console for:
- History state changes
- Transaction events
- Error messages from safe execution

## Migration Notes

### From Basic Implementation
If upgrading from a basic undo/redo implementation:

1. Replace basic buttons with `UndoRedoButtons` component
2. Use `useEditorHistory` hook for state management
3. Update imports to include new utilities
4. Test all functionality thoroughly

### Compatibility
- Works with Tiptap v3.x
- Compatible with all existing extensions
- No breaking changes to existing editor functionality
- Maintains backward compatibility with previous implementations