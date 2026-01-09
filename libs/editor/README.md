# Tiptap v3 Rich Text Editor

A comprehensive, feature-rich text editor built with Tiptap v3, providing a modern editing experience with extensive formatting options, collaborative features, and a clean UI/UX.

## Features

### ✨ Core Features
- **Rich Text Formatting**: Bold, italic, underline, strikethrough, code, subscript, superscript
- **Headings**: Support for H1-H6 with proper styling
- **Lists**: Bullet lists, numbered lists, and task lists with checkboxes
- **Text Alignment**: Left, center, right, and justify alignment
- **Typography**: Smart quotes, em dashes, ellipsis, and other typographic enhancements
- **Links**: Enhanced link handling with validation and auto-linking
- **Tables**: Full table support with resizable columns and proper styling
- **Code Blocks**: Syntax highlighting for multiple languages (JavaScript, TypeScript, Python, CSS, HTML, JSON, Bash, SQL)
- **Images**: Inline and block image support with drag-and-drop
- **Blockquotes**: Styled quote blocks
- **Horizontal Rules**: Visual dividers

### 🎨 Styling & Customization
- **Font Sizes**: Multiple preset sizes with custom size support
- **Colors**: Text color and highlight color pickers
- **Font Families**: Support for different font families
- **Dark Mode**: Full dark mode support
- **Responsive Design**: Mobile-friendly interface
- **Custom CSS Classes**: Extensive styling hooks

### 🚀 Advanced Features
- **Slash Commands**: Quick insertion of content with `/` trigger
- **Bubble Menu**: Context-sensitive formatting toolbar
- **Floating Menu**: Insert menu for empty lines
- **Toolbar**: Comprehensive formatting toolbar
- **Search & Replace**: Find and replace text with regex support
- **Keyboard Shortcuts**: Extensive keyboard shortcuts for power users
- **Undo/Redo**: Full history management
- **Character Count**: Real-time character and word counting
- **Export/Import**: Export to HTML, JSON, and plain text
- **Drag & Drop**: File and content drag-and-drop support

### 🤝 Collaboration Features
- **Focus Mode**: Highlight active editing areas
- **Placeholders**: Context-aware placeholder text
- **Gap Cursor**: Better cursor positioning
- **Trailing Node**: Always have a place to type

## Installation

```bash
npm install @nextblock-cms/editor
```

## Basic Usage

```tsx
import { Editor } from '@nextblock-cms/editor';

function MyEditor() {
  const [content, setContent] = useState('<p>Hello world!</p>');

  return (
    <Editor
      content={content}
      onChange={setContent}
      placeholder="Start typing..."
      showToolbar={true}
      showCharacterCount={true}
    />
  );
}
```

## Advanced Usage

### Custom Configuration

```tsx
import { Editor, editorExtensions } from '@nextblock-cms/editor';
import { useEditor, EditorContent } from '@tiptap/react';

function CustomEditor() {
  const editor = useEditor({
    extensions: editorExtensions,
    content: '<p>Custom editor</p>',
    editorProps: {
      attributes: {
        class: 'custom-editor-class',
      },
    },
  });

  return <EditorContent editor={editor} />;
}
```

### Using Individual Components

```tsx
import { 
  EditorToolbar, 
  EditorBubbleMenu, 
  EditorFloatingMenu 
} from '@nextblock-cms/editor';

function ComponentEditor({ editor }) {
  return (
    <div>
      <EditorToolbar editor={editor} />
      <EditorBubbleMenu editor={editor} />
      <EditorFloatingMenu editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
```

## Props

### Editor Component

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | `''` | Initial HTML content |
| `onChange` | `(content: string) => void` | - | Callback when content changes |
| `placeholder` | `string` | - | Placeholder text |
| `editable` | `boolean` | `true` | Whether the editor is editable |
| `showToolbar` | `boolean` | `true` | Show the formatting toolbar |
| `showCharacterCount` | `boolean` | `true` | Show character/word count |
| `className` | `string` | - | Additional CSS classes |
| `onFocus` | `() => void` | - | Callback when editor gains focus |
| `onBlur` | `() => void` | - | Callback when editor loses focus |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + B` | Bold |
| `Ctrl/Cmd + I` | Italic |
| `Ctrl/Cmd + U` | Underline |
| `Ctrl/Cmd + Shift + S` | Strikethrough |
| `Ctrl/Cmd + E` | Code |
| `Ctrl/Cmd + Shift + E` | Code block |
| `Ctrl/Cmd + Alt + 1-6` | Headings |
| `Ctrl/Cmd + Shift + 7` | Bullet list |
| `Ctrl/Cmd + Shift + 8` | Numbered list |
| `Ctrl/Cmd + Shift + 9` | Task list |
| `Ctrl/Cmd + Shift + B` | Blockquote |
| `Ctrl/Cmd + K` | Link |
| `Ctrl/Cmd + F` | Search |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` | Redo |
| `/` | Slash commands |

## Slash Commands

Type `/` to open the command menu:

- `/text` - Plain text
- `/h1`, `/h2`, `/h3` - Headings
- `/bullet` - Bullet list
- `/number` - Numbered list
- `/task` - Task list
- `/quote` - Blockquote
- `/code` - Code block
- `/image` - Insert image
- `/table` - Insert table
- `/hr` - Horizontal rule
- `/left`, `/center`, `/right`, `/justify` - Text alignment

## Styling

The editor comes with comprehensive CSS classes for styling:

```css
/* Editor container */
.tiptap {
  /* Your custom styles */
}

/* Headings */
.tiptap h1, .tiptap h2, .tiptap h3 {
  /* Heading styles */
}

/* Lists */
.tiptap ul, .tiptap ol {
  /* List styles */
}

/* Code blocks */
.tiptap pre {
  /* Code block styles */
}

/* Tables */
.tiptap table {
  /* Table styles */
}
```

## Extensions Used

The editor includes these Tiptap extensions:

- **StarterKit**: Basic functionality
- **TextStyleKit**: Text styling (color, font size, font family)
- **CodeBlockLowlight**: Syntax highlighting
- **Image**: Image support
- **TaskList/TaskItem**: Task lists
- **Table**: Table support
- **Link**: Enhanced links
- **TextAlign**: Text alignment
- **Highlight**: Text highlighting
- **Subscript/Superscript**: Sub/superscript
- **Typography**: Smart typography
- **CharacterCount**: Character counting
- **Focus**: Focus highlighting
- **Placeholder**: Dynamic placeholders
- **Gapcursor**: Better cursor positioning
- **Underline**: Underline support

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Changelog

### v1.0.0
- Initial release with comprehensive Tiptap v3 features
- Full toolbar and menu system
- Search and replace functionality
- Export capabilities
- Mobile responsive design
- Extensive keyboard shortcuts
- Custom extensions and widgets
