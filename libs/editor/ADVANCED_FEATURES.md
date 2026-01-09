# Advanced Editor Features

This document outlines the advanced features implemented in the Tiptap editor to create a fully-featured, Notion-like editing experience.

## Overview

The editor now includes several advanced features that enhance the user experience:

1. **Enhanced Floating Menu** - Improved floating menu with search, categories, and better positioning
2. **Advanced Placeholder System** - Dynamic placeholders based on content type and context
3. **Enhanced Focus and Selection Management** - Better visual feedback and focus handling
4. **Comprehensive Keyboard Shortcuts** - Extended keyboard shortcuts for power users
5. **Mobile-Optimized Experience** - Touch-friendly toolbar and interactions
6. **Additional Tiptap v3 Extensions** - Integration of latest Tiptap features

## Features

### 1. Enhanced Floating Menu

**File**: `libs/editor/src/lib/components/menus/EnhancedFloatingMenu.tsx`

The enhanced floating menu provides:

- **Search functionality**: Filter blocks by name, description, or keywords
- **Category organization**: Blocks grouped into Basic, Headings, Lists, Media, and Advanced
- **Better positioning**: Improved placement and responsive design
- **Enhanced animations**: Smooth transitions and visual feedback
- **Keyboard navigation**: Arrow keys and Enter for selection

**Usage**:
```tsx
<Editor 
  useEnhancedFloatingMenu={true} // Enable enhanced floating menu
  content={content}
  onChange={onChange}
/>
```

**Features**:
- Appears on empty paragraphs, headings, and list items
- Search through 15+ block types
- Category filtering for quick access
- Mobile-responsive design
- Keyboard shortcuts support

### 2. Advanced Placeholder System

**File**: `libs/editor/src/lib/extensions/AdvancedPlaceholder.ts`

Dynamic placeholders that adapt to content type:

- **Contextual placeholders**: Different text based on node type
- **Smart suggestions**: Helpful hints for each content type
- **Visual styling**: Enhanced CSS for better UX

**Placeholder Examples**:
- Heading 1: "What's the main title?"
- Heading 2: "What's this section about?"
- Paragraph: "Type '/' for commands, or just start writing..."
- Task Item: "Add a task..."
- Code Block: "Write some code..." (with language detection)

**Configuration**:
```tsx
AdvancedPlaceholder.configure({
  emptyEditorClass: 'is-editor-empty',
  emptyNodeClass: 'is-empty',
  showOnlyWhenEditable: true,
  showOnlyCurrent: true,
  includeChildren: true,
})
```

### 3. Enhanced Focus and Selection Management

**File**: `libs/editor/src/lib/extensions/EnhancedFocus.ts`

Improved focus handling with:

- **Visual focus indicators**: Clear indication of focused elements
- **Selection highlighting**: Enhanced selection visibility
- **Focus ring**: Optional focus ring for accessibility
- **Smooth transitions**: Animated focus changes
- **Dim unfocused**: Option to dim non-focused content

**Configuration**:
```tsx
EnhancedFocus.configure({
  className: 'has-focus',
  mode: 'all',
  showFocusRing: true,
  highlightSelection: true,
  dimUnfocused: false,
  animateTransitions: true,
})
```

### 4. Comprehensive Keyboard Shortcuts

**File**: `libs/editor/src/lib/extensions/KeyboardShortcuts.ts`

Extended keyboard shortcuts for power users:

**Text Formatting**:
- `Ctrl/Cmd + Shift + X`: Strikethrough
- `Ctrl/Cmd + Shift + H`: Highlight
- `Ctrl/Cmd + Shift + C`: Inline code

**Headings**:
- `Ctrl/Cmd + Alt + 1-6`: Heading levels 1-6
- `Ctrl/Cmd + Alt + 0`: Paragraph

**Lists**:
- `Ctrl/Cmd + Shift + 8`: Bullet list
- `Ctrl/Cmd + Shift + 7`: Numbered list
- `Ctrl/Cmd + Shift + 9`: Task list

**Advanced**:
- `Ctrl/Cmd + K`: Insert link
- `Ctrl/Cmd + Shift + I`: Insert image
- `Ctrl/Cmd + Alt + T`: Insert table
- `Ctrl/Cmd + \`: Clear formatting

**Text Transformation**:
- `Ctrl/Cmd + Shift + U`: Transform to uppercase
- `Ctrl/Cmd + Shift + L`: Transform to lowercase
- `Ctrl/Cmd + Shift + P`: Transform to title case

**Configuration**:
```tsx
KeyboardShortcuts.configure({
  enableAdvancedShortcuts: true,
  enableCustomShortcuts: true,
  showShortcutHints: false,
})
```

### 5. Mobile-Optimized Experience

**File**: `libs/editor/src/lib/components/mobile/MobileToolbar.tsx`

Touch-friendly mobile toolbar with:

- **Responsive design**: Adapts to mobile screen sizes
- **Touch-optimized buttons**: Larger touch targets
- **Categorized tools**: Organized into Format, Blocks, Insert, and Align
- **Collapsible interface**: Expandable toolbar to save space
- **Safe area support**: Respects device safe areas

**Features**:
- Auto-detection of mobile devices
- Context-sensitive appearance
- Swipe-friendly interface
- Accessibility support

**Usage**:
```tsx
<Editor 
  showMobileToolbar={true} // Enable mobile toolbar
  content={content}
  onChange={onChange}
/>
```

### 6. Additional Tiptap v3 Extensions

The editor integrates the latest Tiptap v3 extensions:

- **Enhanced Typography**: Smart quotes, em dashes, and more
- **Improved Tables**: Resizable columns and better navigation
- **Advanced Lists**: Nested task lists and better formatting
- **Focus Management**: Better cursor and selection handling
- **Character Count**: Advanced text statistics

## Styling

**File**: `libs/editor/src/styles/advanced-features.css`

Comprehensive CSS for all advanced features:

- **Placeholder styles**: Dynamic placeholder appearance
- **Focus indicators**: Visual focus feedback
- **Mobile optimizations**: Touch-friendly interfaces
- **Animations**: Smooth transitions and effects
- **Dark mode support**: Full dark theme compatibility
- **Accessibility**: High contrast and reduced motion support

## Usage Examples

### Basic Setup with All Features

```tsx
import { Editor } from '@nextblock-cms/editor';
import '@nextblock-cms/editor/styles/advanced-features.css';

function MyEditor() {
  const [content, setContent] = useState('<p>Start writing...</p>');

  return (
    <Editor
      content={content}
      onChange={setContent}
      useEnhancedFloatingMenu={true}
      showMobileToolbar={true}
      enableAdvancedPlaceholders={true}
      enableFocusMode={false}
      showKeyboardShortcuts={true}
    />
  );
}
```

### Focus Mode

```tsx
<Editor
  content={content}
  onChange={setContent}
  enableFocusMode={true} // Enables distraction-free writing
  className="focus-mode"
/>
```

### Mobile-First Setup

```tsx
<Editor
  content={content}
  onChange={setContent}
  showToolbar={false} // Hide desktop toolbar
  showMobileToolbar={true} // Show mobile toolbar
  useEnhancedFloatingMenu={true}
/>
```

## Configuration Options

### Editor Props

```tsx
interface EditorProps {
  // ... existing props
  
  // Advanced features
  useEnhancedFloatingMenu?: boolean; // Default: true
  showMobileToolbar?: boolean; // Default: true
  enableAdvancedPlaceholders?: boolean; // Default: true
  enableFocusMode?: boolean; // Default: false
  showKeyboardShortcuts?: boolean; // Default: false
}
```

### Extension Configuration

Each extension can be configured individually:

```tsx
import { 
  AdvancedPlaceholder, 
  EnhancedFocus, 
  KeyboardShortcuts 
} from '@nextblock-cms/editor';

// Custom configuration
const customExtensions = [
  AdvancedPlaceholder.configure({
    showOnlyCurrent: false, // Show placeholders in all empty nodes
  }),
  EnhancedFocus.configure({
    dimUnfocused: true, // Dim non-focused content
  }),
  KeyboardShortcuts.configure({
    showShortcutHints: true, // Show keyboard shortcut hints
  }),
];
```

## Accessibility

All advanced features include accessibility improvements:

- **Keyboard navigation**: Full keyboard support
- **Screen reader support**: Proper ARIA labels and descriptions
- **High contrast mode**: Enhanced visibility options
- **Reduced motion**: Respects user motion preferences
- **Focus management**: Clear focus indicators

## Browser Support

The advanced features support:

- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Touch devices**: Full touch interaction support
- **Responsive design**: Works on all screen sizes

## Performance

Optimizations included:

- **Lazy loading**: Components load only when needed
- **Efficient rendering**: Minimal re-renders
- **Memory management**: Proper cleanup of event listeners
- **Bundle optimization**: Tree-shakeable exports

## Migration Guide

To upgrade from the basic editor:

1. **Install dependencies**: Ensure you have the latest Tiptap v3 packages
2. **Import styles**: Add the advanced features CSS
3. **Update props**: Add new props to enable features
4. **Test thoroughly**: Verify all features work in your environment

```tsx
// Before
<Editor content={content} onChange={onChange} />

// After
<Editor 
  content={content} 
  onChange={onChange}
  useEnhancedFloatingMenu={true}
  showMobileToolbar={true}
  enableAdvancedPlaceholders={true}
/>
```

## Troubleshooting

Common issues and solutions:

1. **Styles not loading**: Ensure CSS is imported
2. **Mobile toolbar not showing**: Check device detection
3. **Keyboard shortcuts not working**: Verify focus state
4. **Performance issues**: Check for memory leaks in event listeners

## Contributing

To contribute to the advanced features:

1. Follow the existing code patterns
2. Add comprehensive TypeScript types
3. Include accessibility features
4. Write tests for new functionality
5. Update documentation

## Future Enhancements

Planned improvements:

- **AI-powered suggestions**: Smart content recommendations
- **Collaborative editing**: Real-time collaboration features
- **Advanced tables**: Spreadsheet-like functionality
- **Plugin system**: Extensible architecture for custom features
- **Performance monitoring**: Built-in performance metrics