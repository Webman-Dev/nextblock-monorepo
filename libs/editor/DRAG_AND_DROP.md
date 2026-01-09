# Drag and Drop Functionality for Tiptap v3 Editor

This document describes the comprehensive drag and drop functionality implemented for the Tiptap v3 editor, based on the official Tiptap.dev Notion-like editor.

## Overview

The drag and drop implementation provides "Hold for drag" functionality using drag handles, allowing users to easily reorder content blocks within the editor. This matches the behavior found in the official Tiptap.dev Notion-like editor.

## Features Implemented

### 1. Drag Handle Extension
- **Location**: `libs/editor/src/lib/kit.ts`
- **Package**: `@tiptap/extension-drag-handle`
- **Configuration**: Custom render function with grip icon
- **Behavior**: Shows on hover with visual feedback

### 2. Visual Drag Handle Components
- **Location**: `libs/editor/src/lib/components/DragHandle.tsx`
- **Package**: `@tiptap/extension-drag-handle-react`
- **Features**:
  - Custom React component wrapper
  - Lucide grip icon
  - Hover states and transitions
  - Accessibility support

### 3. Block-Level Drag and Drop Support
- **Location**: `libs/editor/src/lib/extensions/DraggableNodes.ts`
- **Supported Nodes**:
  - Paragraphs
  - Headings (H1-H6)
  - Blockquotes
  - Bullet Lists
  - Ordered Lists
  - Task Lists
  - Code Blocks
  - Images

### 4. Visual Feedback During Drag Operations
- **Location**: `libs/editor/src/styles/drag-handle.css`
- **Features**:
  - Drag preview with rotation and scaling
  - Drop zone indicators
  - Pulse animations
  - Global dragging state management

### 5. Touch and Mobile Support
- **Responsive Design**: Larger touch targets on mobile devices
- **Touch Events**: Proper handling of touch-based drag operations
- **Mobile Optimizations**: Adjusted positioning and sizing for smaller screens

## Installation and Setup

### Required Packages
```bash
npm install @tiptap/extension-drag-handle @tiptap/extension-drag-handle-react @tiptap/extension-node-range
```

### Usage

#### Basic Implementation
```typescript
import { Editor, DragHandle } from '@nextblock-cms/editor';

function MyEditor() {
  const editor = useEditor({
    extensions: editorExtensions, // Includes drag functionality
    content: '<p>Your content here</p>',
  });

  return (
    <div>
      <Editor editor={editor} />
      <DragHandle 
        editor={editor}
        onDragStart={(event) => console.log('Drag started')}
        onDragEnd={(event) => console.log('Drag ended')}
      />
    </div>
  );
}
```

#### Advanced Configuration
```typescript
<DragHandle 
  editor={editor}
  className="custom-drag-handle"
  onDragStart={(event) => {
    document.body.classList.add('dragging');
  }}
  onDragEnd={(event) => {
    document.body.classList.remove('dragging');
  }}
  onNodeChange={({ node, editor }) => {
    if (node) {
      console.log('Hovering over:', node.type.name);
    }
  }}
/>
```

## CSS Classes and Styling

### Main Classes
- `.drag-handle`: Base drag handle styling
- `.drag-handle-button`: React component button styling
- `.dragging`: Applied to body during drag operations
- `.drop-zone`: Drop zone indicator styling

### Responsive Breakpoints
- Desktop: Standard 18px handle size
- Mobile: Larger 24px handle size for better touch interaction

### Dark Mode Support
Automatic dark mode support using CSS media queries and CSS custom properties.

## Keyboard Accessibility

- **Tab Navigation**: Drag handles are focusable
- **Enter/Space**: Activates drag mode
- **Escape**: Cancels drag operation
- **Arrow Keys**: Alternative navigation method

## Browser Compatibility

- **Modern Browsers**: Full support for Chrome, Firefox, Safari, Edge
- **Touch Devices**: iOS Safari, Android Chrome
- **Fallbacks**: Graceful degradation for older browsers

## Performance Considerations

- **Lazy Loading**: Drag handles only render when needed
- **Event Delegation**: Efficient event handling
- **CSS Transitions**: Hardware-accelerated animations
- **Memory Management**: Proper cleanup of event listeners

## Troubleshooting

### Common Issues

1. **Drag Handle Not Appearing**
   - Ensure CSS is properly imported
   - Check that nodes have `draggable: true` attribute
   - Verify hover states are working

2. **Drag Operation Not Working**
   - Confirm NodeRange extension is included
   - Check browser console for errors
   - Verify touch events on mobile

3. **Styling Issues**
   - Import drag-handle.css in your main CSS file
   - Check CSS specificity conflicts
   - Verify Tailwind classes are available

### Debug Mode
Enable debug logging by setting:
```typescript
DragHandle.configure({
  onNodeChange: ({ node, editor }) => {
    console.log('Debug:', { node: node?.type.name, editor });
  },
});
```

## Future Enhancements

- **Nested Drag and Drop**: Support for nested list items
- **Cross-Editor Dragging**: Drag between multiple editor instances
- **Custom Drop Zones**: Define specific drop targets
- **Drag Previews**: Custom drag preview components
- **Undo/Redo Integration**: Better history management during drag operations

## Contributing

When contributing to the drag and drop functionality:

1. Test on both desktop and mobile devices
2. Ensure accessibility standards are met
3. Update this documentation for any new features
4. Add appropriate TypeScript types
5. Include unit tests for new functionality

## Related Documentation

- [Tiptap Drag Handle Extension](https://tiptap.dev/docs/editor/extensions/functionality/drag-handle)
- [Tiptap React Drag Handle](https://tiptap.dev/docs/editor/extensions/functionality/drag-handle-react)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/)