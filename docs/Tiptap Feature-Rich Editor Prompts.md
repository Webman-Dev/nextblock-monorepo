

### **Comprehensive Tiptap Free Extension Checklist**

This table serves as a manifest for the entire implementation process. It lists every free, open-source Tiptap extension that will be integrated. This checklist validates that the full scope of your request—to include all great and free features—is met, while explicitly excluding any paid or "Pro" extensions.1

| Category | Extension Name | Description |
| :---- | :---- | :---- |
| **Core & Document Structure** | Document | The root node for every document. Part of StarterKit. |
|  | Paragraph | The default block-level node for text. Part of StarterKit. |
|  | Text | The basic inline node for text content. Part of StarterKit. |
|  | Heading | Adds heading levels 1 through 6\. Part of StarterKit. |
|  | Blockquote | Creates a blockquote for quoting text. Part of StarterKit. |
|  | HardBreak | Inserts a hard line break (\<br\>). Part of StarterKit. |
|  | HorizontalRule | Inserts a horizontal rule (\<hr\>). Part of StarterKit. |
| **Marks (Inline Formatting)** | Bold | Applies bold formatting (\<strong\>). Part of StarterKit. |
|  | Italic | Applies italic formatting (\<em\>). Part of StarterKit. |
|  | Strike | Applies strikethrough formatting (\<s\>). Part of StarterKit. |
|  | Code | Formats inline text as code (\<code\>). Part of StarterKit. |
|  | Link | Creates hyperlinks (\<a\>). |
|  | Highlight | Adds a background color highlight to text (\<mark\>). |
|  | Subscript | Formats text as subscript. |
|  | Superscript | Formats text as superscript. |
|  | TextStyle | A prerequisite for applying inline styles like color or font size. |
|  | Underline | Applies underline formatting. |
| **Nodes (Content Blocks)** | BulletList | Creates an unordered list (\<ul\>). Part of StarterKit. |
|  | OrderedList | Creates an ordered list (\<ol\>). Part of StarterKit. |
|  | ListItem | Represents an item within a list. Part of StarterKit. |
|  | CodeBlock | A block for multi-line code. Part of StarterKit. |
|  | CodeBlockLowlight | Extends CodeBlock with syntax highlighting via lowlight. |
|  | Image | Embeds images (\<img\>) with attributes for customization. |
|  | Table | Part of TableKit; enables full table functionality. |
|  | TableRow | Part of TableKit; represents a table row. |
|  | TableHeader | Part of TableKit; represents a table header cell. |
|  | TableCell | Part of TableKit; represents a standard table cell. |
|  | TaskList | Creates a list of interactive checklist items. |
|  | TaskItem | An individual item within a TaskList, with a checkbox. |
|  | YouTube | Embeds YouTube videos in an iframe. |
|  | Details | Creates a collapsible details element (\<details\>). |
|  | DetailsSummary | The summary/title for a details element. |
|  | DetailsContent | The content container for a details element. |
| **Functionality & UX** | History | Manages undo and redo functionality. Part of StarterKit. |
|  | Dropcursor | Shows a cursor where items will be dropped. Part of StarterKit. |
|  | Gapcursor | Provides cursor support for positions where a text cursor is not possible. Part of StarterKit. |
|  | BubbleMenu | A contextual menu that floats near a text selection. |
|  | FloatingMenu | A menu that appears on empty lines for quick block insertion. |
|  | Suggestion | The underlying utility for building mention/slash command menus. |
|  | CharacterCount | Counts characters or words in the document. |
|  | Color | Enables text color customization. |
|  | Focus | Adds CSS classes to the currently focused node. |
|  | FontFamily | Allows changing the font family of text. |
|  | FontSize | Allows changing the font size of text. |
|  | Placeholder | Displays placeholder text in an empty editor. |
|  | TrailingNode | Ensures there's always an editable node at the end of the document. |
|  | Typography | Applies smart text transformations (e.g., \-\> to →). |
|  | Mention | Provides the functionality for @ mentions. |
|  | Emoji | Renders text shortcuts like :joy: into emoji characters. |
|  | Mathematics | Renders LaTeX mathematical formulas. |
|  | DragHandleReact | Provides a React component for drag-and-drop functionality. |

---

### **Prompt 1: Foundational Editor Setup & Core Dependencies**

**Objective:** Establish the architectural bedrock for the Tiptap editor within the NextBlock monorepo. This involves installing all dependencies, creating the core editor components and configuration files, and integrating basic styling. This foundational step aligns with the monorepo's principle of centralized dependency management and shared libraries.3

**Instructions for AI:**

Please perform the following steps to set up the initial Tiptap editor foundation in the nextblock-monorepo project.

1. Install All Required Tiptap Dependencies:  
   Navigate to the monorepo root. Execute the following command to install all necessary free Tiptap extensions and libraries. This single command ensures all packages are added to the root package.json, maintaining version consistency across the workspace.3  
   Bash  
   npm install @tiptap/react @tiptap/core @tiptap/starter-kit @tiptap/extension-blockquote @tiptap/extension-bullet-list @tiptap/extension-code-block @tiptap/extension-document @tiptap/extension-dropcursor @tiptap/extension-gapcursor @tiptap/extension-hard-break @tiptap/extension-heading @tiptap/extension-history @tiptap/extension-horizontal-rule @tiptap/extension-list-item @tiptap/extension-ordered-list @tiptap/extension-paragraph @tiptap/extension-text @tiptap/extension-bold @tiptap/extension-code @tiptap/extension-italic @tiptap/extension-strike @tiptap/extension-link @tiptap/extension-highlight @tiptap/extension-subscript @tiptap/extension-superscript @tiptap/extension-text-style @tiptap/extension-underline @tiptap/extension-code-block-lowlight lowlight @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-youtube @tiptap/extension-details @tiptap/extension-details-summary @tiptap/extension-details-content @tiptap/extension-bubble-menu @tiptap/extension-floating-menu @tiptap/suggestion @tiptap/extension-character-count @tiptap/extension-color @tiptap/extension-focus @tiptap/extension-font-family @tiptap/extension-font-size @tiptap/extension-placeholder @tiptap/extension-trailing-node @tiptap/extension-typography @tiptap/extension-mention @tiptap/extension-emoji @tiptap/extension-mathematics @tiptap/extension-react-node-view-renderer @tiptap-pro/extension-drag-handle-react katex

2. Create the "Extensions Hub" File:  
   To promote clean architecture and prepare for future extensibility (as envisioned by the Block SDK and Marketplace roadmap 3), create a centralized file for managing all Tiptap extensions.  
   * **File Path:** apps/nextblock/components/tiptap/extensions.ts  
   * **Content:**  
     TypeScript  
     import StarterKit from '@tiptap/starter-kit';

     /\*\*  
      \* A centralized list of all Tiptap extensions used in the editor.  
      \* This approach keeps the TiptapEditor component clean and makes it  
      \* easy to add, remove, or configure extensions in one place.  
      \*/  
     export const editorExtensions \=;

3. Create the Core Tiptap Editor Component:  
   This will be the main React component that initializes and renders the editor.  
   * **File Path:** apps/nextblock/components/tiptap/TiptapEditor.tsx  
   * **Content:**  
     TypeScript  
     'use client';

     import { useEditor, EditorContent } from '@tiptap/react';  
     import { editorExtensions } from './extensions';  
     import React from 'react';

     interface TiptapEditorProps {  
       content: string;  
       onChange: (richText: string) \=\> void;  
     }

     const TiptapEditor: React.FC\<TiptapEditorProps\> \= ({ content, onChange }) \=\> {  
       const editor \= useEditor({  
         extensions: editorExtensions,  
         content: content,  
         editorProps: {  
           attributes: {  
             class:  
               'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none',  
           },  
         },  
         onUpdate({ editor }) {  
           onChange(editor.getHTML());  
         },  
       });

       return (  
         \<div className\="w-full rounded-md border border-input bg-background px-3 py-2"\>  
           \<EditorContent editor\={editor} /\>  
         \</div\>  
       );  
     };

     export default TiptapEditor;

4. Create and Import Editor-Specific Styles:  
   Tiptap is headless and requires custom styling.4 Create a dedicated CSS file for all Tiptap-related styles.  
   * **File Path:** apps/nextblock/styles/tiptap.css  
   * **Content:**  
     CSS  
     /\* Basic Tiptap Editor Styling \*/

.tiptap {\> \* \+ \* {margin-top: 0.75em;}  ul,  
  ol {  
    padding: 0 1rem;  
  }

  h1, h2, h3, h4, h5, h6 {  
    line-height: 1.1;  
  }

  code {  
    background-color: rgba(97, 97, 97, 0.1);  
    color: \#616161;  
    padding: 0.25rem;  
    border-radius: 0.25rem;  
  }

  pre {  
    background: \#0D0D0D;  
    color: \#FFF;  
    font-family: 'JetBrainsMono', monospace;  
    padding: 0.75rem 1rem;  
    border-radius: 0.5rem;

    code {  
      color: inherit;  
      padding: 0;  
      background: none;  
      font-size: 0.8rem;  
    }  
  }

  img {  
    max-width: 100%;  
    height: auto;  
  }

  blockquote {  
    padding-left: 1rem;  
    border-left: 2px solid rgba(13, 13, 13, 0.1);  
  }

  hr {  
    border: none;  
    border-top: 2px solid rgba(13, 13, 13, 0.1);  
    margin: 2rem 0;  
  }  
}  
\`\`\`

5. Import the Styles into the Application:  
   Open the main layout file and import the new tiptap.css file to apply the styles globally.  
   * **File Path:** apps/nextblock/app/layout.tsx  
   * **Action:** Add the following import statement at the top of the file, after the existing globals.css import.  
     TypeScript  
     import '../styles/tiptap.css';

This completes the foundational setup. The editor is now integrated into the monorepo, uses a centralized extension management system, and has baseline styling.

---

### **Prompt 2: Essential Content Nodes & Marks**

**Objective:** To expand the editor's capabilities by adding essential content types beyond basic text. This series of prompts will integrate extensions for visual media, structured data like tables, developer-focused code blocks, and advanced text formatting. Each feature will be accompanied by styling that aligns with the project's shadcn/ui and Tailwind CSS design system to ensure a polished and consistent user experience from the outset.3

#### **Prompt 2.1: Visual Content \- Images, Videos, and Rules**

**Instructions for AI:**

Modify the Tiptap configuration to include support for images, YouTube videos, and horizontal rules.

1. Update the Extensions Hub:  
   Modify apps/nextblock/components/tiptap/extensions.ts to import and configure the new extensions.  
   TypeScript  
   import StarterKit from '@tiptap/starter-kit';  
   import Image from '@tiptap/extension-image';  
   import YouTube from '@tiptap/extension-youtube';  
   import HorizontalRule from '@tiptap/extension-horizontal-rule';

   export const editorExtensions \=;

2. Enhance the Stylesheet:  
   Add styling for embedded YouTube videos in apps/nextblock/styles/tiptap.css.  
   CSS  
   /\* at the end of the file \*/

.tiptap.yt-embed {  
aspect-ratio: 16 / 9;  
width: 100%;  
height: auto;  
border-radius: 0.5rem;  
}  
\`\`\`

#### **Prompt 2.2: Structured Content \- Tables & Task Lists**

**Instructions for AI:**

Integrate full-featured tables and interactive task lists into the editor.

1. Update the Extensions Hub:  
   Modify apps/nextblock/components/tiptap/extensions.ts to include the Table and TaskList extensions. We will use the full TableKit for a complete experience.5  
   TypeScript  
   // Add these imports at the top  
   import Table from '@tiptap/extension-table';  
   import TableCell from '@tiptap/extension-table-cell';  
   import TableHeader from '@tiptap/extension-table-header';  
   import TableRow from '@tiptap/extension-table-row';  
   import TaskList from '@tiptap/extension-task-list';  
   import TaskItem from '@tiptap/extension-task-item';

   // In the editorExtensions array, add the new extensions  
   //... after HorizontalRule  
   Table.configure({  
     resizable: true,  
   }),  
   TableRow,  
   TableHeader,  
   TableCell,  
   TaskList,  
   TaskItem.configure({  
     nested: true,  
   }),

2. Enhance the Stylesheet:  
   Add comprehensive styling for tables and task lists to apps/nextblock/styles/tiptap.css. These styles are designed to mimic the appearance of shadcn/ui components for visual consistency.3  
   CSS  
   /\* at the end of the file \*/

   /\* Table Styles \*/

.tiptap table {  
width: 100%;  
border-collapse: collapse;  
margin: 1rem 0;  
overflow: hidden;  
}  
.tiptap th,.tiptap td {  
border: 1px solid hsl(var(--border));  
padding: 0.5rem 0.75rem;  
vertical-align: top;  
box-sizing: border-box;  
position: relative;  
}  
.tiptap th {  
font-weight: bold;  
text-align: left;  
background-color: hsl(var(--muted));  
}  
.tiptap.column-resizer {  
position: absolute;  
right: \-2px;  
top: 0;  
width: 4px;  
height: 100%;  
cursor: col-resize;  
background-color: hsl(var(--primary));  
user-select: none;  
}  
.tiptap.tableWrapper {  
overflow-x: auto;  
}

/\* Task List Styles \*/

.tiptap ul\[data-type="taskList"\] {  
list-style: none;  
padding: 0;  
}  
.tiptap li\[data-type="taskItem"\] {  
display: flex;  
align-items: center;  
gap: 0.5rem;  
}  
.tiptap li\[data-type="taskItem"\] \> label {  
flex: 0 0 auto;  
margin-right: 0.5rem;  
user-select: none;  
}  
.tiptap li\[data-type="taskItem"\] \> div {  
flex: 1 1 auto;  
}  
.tiptap li\[data-type="taskItem"\] input\[type="checkbox"\] {  
cursor: pointer;  
}  
.tiptap li\[data-checked="true"\] \> div \> p {  
text-decoration: line-through;  
color: hsl(var(--muted-foreground));  
}  
\`\`\`

#### **Prompt 2.3: Developer-Focused Content \- Code Blocks with Syntax Highlighting**

**Instructions for AI:**

Enhance the editor for developers by adding code blocks with syntax highlighting.

1. Update the Extensions Hub:  
   Modify apps/nextblock/components/tiptap/extensions.ts. We will replace the default CodeBlock from StarterKit with CodeBlockLowlight and configure it with lowlight and common programming languages.5  
   TypeScript  
   // Add these imports at the top  
   import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';  
   import { lowlight } from 'lowlight/lib/core';  
   import css from 'highlight.js/lib/languages/css';  
   import js from 'highlight.js/lib/languages/javascript';  
   import ts from 'highlight.js/lib/languages/typescript';  
   import html from 'highlight.js/lib/languages/xml'; // for HTML

   // Register languages with lowlight  
   lowlight.registerLanguage('html', html);  
   lowlight.registerLanguage('css', css);  
   lowlight.registerLanguage('js', js);  
   lowlight.registerLanguage('ts', ts);

   // In the editorExtensions array, find StarterKit and configure it  
   StarterKit.configure({  
     //... existing configs  
     codeBlock: false, // Disable the default to use our lowlight version  
   }),

   // Add the new CodeBlockLowlight extension  
   CodeBlockLowlight.configure({  
     lowlight,  
   }),

2. Enhance the Stylesheet:  
   Add styles for syntax highlighting to apps/nextblock/styles/tiptap.css. Import a theme from highlight.js or define custom styles. We will use a custom theme that respects dark mode.  
   CSS  
   /\* at the end of the file \*/

   /\* Syntax Highlighting Styles (adapts to prose dark mode) \*/

.tiptap pre.hljs-comment,  
.tiptap pre.hljs-quote {  
color: \#6c757d;  
}  
.tiptap pre.hljs-variable,  
.tiptap pre.hljs-template-variable,  
.tiptap pre.hljs-tag,  
.tiptap pre.hljs-name,  
.tiptap pre.hljs-selector-id,  
.tiptap pre.hljs-selector-class,  
.tiptap pre.hljs-regexp,  
.tiptap pre.hljs-deletion {  
color: \#e06c75;  
}  
.dark.tiptap pre.hljs-variable,  
.dark.tiptap pre.hljs-template-variable,  
.dark.tiptap pre.hljs-tag,  
.dark.tiptap pre.hljs-name,  
.dark.tiptap pre.hljs-selector-id,  
.dark.tiptap pre.hljs-selector-class,  
.dark.tiptap pre.hljs-regexp,  
.dark.tiptap pre.hljs-deletion {  
color: \#fca5a5;  
}  
.tiptap pre.hljs-number,  
.tiptap pre.hljs-built\_in,  
.tiptap pre.hljs-literal,  
.tiptap pre.hljs-type,  
.tiptap pre.hljs-params,  
.tiptap pre.hljs-meta,  
.tiptap pre.hljs-link {  
color: \#d19a66;  
}  
.dark.tiptap pre.hljs-number,  
.dark.tiptap pre.hljs-built\_in,  
.dark.tiptap pre.hljs-literal,  
.dark.tiptap pre.hljs-type,  
.dark.tiptap pre.hljs-params,  
.dark.tiptap pre.hljs-meta,  
.dark.tiptap pre.hljs-link {  
color: \#fcd34d;  
}  
.tiptap pre.hljs-attribute {  
color: \#e6c07b;  
}  
.tiptap pre.hljs-string,  
.tiptap pre.hljs-symbol,  
.tiptap pre.hljs-bullet,  
.tiptap pre.hljs-addition {  
color: \#98c379;  
}  
.dark.tiptap pre.hljs-string,  
.dark.tiptap pre.hljs-symbol,  
.dark.tiptap pre.hljs-bullet,  
.dark.tiptap pre.hljs-addition {  
color: \#a7f3d0;  
}  
.tiptap pre.hljs-title,  
.tiptap pre.hljs-section {  
color: \#61afef;  
}  
.dark.tiptap pre.hljs-title,  
.dark.tiptap pre.hljs-section {  
color: \#93c5fd;  
}  
.tiptap pre.hljs-keyword,  
.tiptap pre.hljs-selector-tag {  
color: \#c678dd;  
}  
.dark.tiptap pre.hljs-keyword,  
.dark.tiptap pre.hljs-selector-tag {  
color: \#d8b4fe;  
}  
.tiptap pre.hljs-emphasis {  
font-style: italic;  
}  
.tiptap pre.hljs-strong {  
font-weight: bold;  
}  
\`\`\`

#### **Prompt 2.4: Advanced Text & Linking**

**Instructions for AI:**

Integrate advanced text formatting capabilities, including secure links, text highlighting, and color customization.

1. Update the Extensions Hub:  
   Modify apps/nextblock/components/tiptap/extensions.ts to add and configure the Link, Highlight, TextStyle, and Color extensions.  
   TypeScript  
   // Add these imports at the top  
   import Link from '@tiptap/extension-link';  
   import Highlight from '@tiptap/extension-highlight';  
   import TextStyle from '@tiptap/extension-text-style';  
   import { Color } from '@tiptap/extension-color';

   // In the editorExtensions array, find StarterKit and configure it  
   StarterKit.configure({  
     //... existing configs  
     link: false, // Disable the default to use our custom configured one  
   }),

   // Add the new extensions  
   Link.configure({  
     openOnClick: false, // Recommended for security and better UX  
     autolink: true,  
     HTMLAttributes: {  
       rel: 'noopener noreferrer nofollow',  
       target: '\_blank',  
       class: 'text-primary underline',  
     },  
   }),  
   Highlight.configure({  
     multicolor: true,  
     HTMLAttributes: {  
       class: 'bg-yellow-200 dark:bg-yellow-800 rounded-sm px-1',  
     },  
   }),  
   TextStyle,  
   Color,

This completes the integration of essential content nodes and marks, significantly enhancing the editor's creative and functional range.

---

### **Prompt 3: Crafting the Editor UI \- Contextual Menus**

**Objective:** To build the interactive UI layers that allow users to easily access the editor's formatting capabilities. This involves creating a BubbleMenu for inline text formatting and a FloatingMenu for quick block insertion. The implementation will be modular, creating separate React components for each menu and constructing them with shared UI components from @nextblock-monorepo/ui to ensure a consistent and professional look and feel, a practice that aligns with the monorepo's architectural principles.3

#### **Prompt 3.1: Implementing the Bubble Menu**

**Instructions for AI:**

Create a contextual BubbleMenu that appears when a user selects text.

1. Create the Bubble Menu Component:  
   This component will contain the UI and logic for the inline formatting toolbar. It will consume the shared Button component from the UI library.  
   * **File Path:** apps/nextblock/components/tiptap/ui/BubbleMenu.tsx  
   * **Content:**  
     TypeScript  
     'use client';

     import { BubbleMenu, Editor } from '@tiptap/react';  
     import { Bold, Italic, Strikethrough, Code, Link as LinkIcon } from 'lucide-react';  
     import { Button } from '@nextblock-monorepo/ui';  
     import { useCallback } from 'react';

     interface EditorBubbleMenuProps {  
       editor: Editor;  
     }

     export const EditorBubbleMenu: React.FC\<EditorBubbleMenuProps\> \= ({ editor }) \=\> {  
       const setLink \= useCallback(() \=\> {  
         const previousUrl \= editor.getAttributes('link').href;  
         const url \= window.prompt('URL', previousUrl);

         if (url \=== null) {  
           return;  
         }

         if (url \=== '') {  
           editor.chain().focus().extendMarkRange('link').unsetLink().run();  
           return;  
         }

         editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();  
       }, \[editor\]);

       if (\!editor) {  
         return null;  
       }

       return (  
         \<BubbleMenu  
           editor\={editor}  
           tippyOptions\={{ duration: 100 }}  
           className\="flex items-center gap-1 rounded-md border border-input bg-background p-1"  
         \>  
           \<Button  
             variant\={editor.isActive('bold')? 'default' : 'ghost'}  
             size\="icon"  
             onClick\={() \=\> editor.chain().focus().toggleBold().run()}  
           \>  
             \<Bold className\="h-4 w-4" /\>  
           \</Button\>  
           \<Button  
             variant\={editor.isActive('italic')? 'default' : 'ghost'}  
             size\="icon"  
             onClick\={() \=\> editor.chain().focus().toggleItalic().run()}  
           \>  
             \<Italic className\="h-4 w-4" /\>  
           \</Button\>  
           \<Button  
             variant\={editor.isActive('strike')? 'default' : 'ghost'}  
             size\="icon"  
             onClick\={() \=\> editor.chain().focus().toggleStrike().run()}  
           \>  
             \<Strikethrough className\="h-4 w-4" /\>  
           \</Button\>  
           \<Button  
             variant\={editor.isActive('code')? 'default' : 'ghost'}  
             size\="icon"  
             onClick\={() \=\> editor.chain().focus().toggleCode().run()}  
           \>  
             \<Code className\="h-4 w-4" /\>  
           \</Button\>  
           \<Button  
             variant\={editor.isActive('link')? 'default' : 'ghost'}  
             size\="icon"  
             onClick\={setLink}  
           \>  
             \<LinkIcon className\="h-4 w-4" /\>  
           \</Button\>  
         \</BubbleMenu\>  
       );  
     };

2. Integrate the Bubble Menu into the Editor:  
   Modify the main TiptapEditor.tsx component to include the new EditorBubbleMenu.  
   * **File Path:** apps/nextblock/components/tiptap/TiptapEditor.tsx  
   * **Action:** Import EditorBubbleMenu and render it within the component.  
     TypeScript  
     //... imports  
     import { EditorBubbleMenu } from './ui/BubbleMenu';

     //... inside TiptapEditor component  
     const editor \= useEditor({ /\*... \*/ });

     return (  
       \<div className\="relative w-full rounded-md border border-input bg-background px-3 py-2"\>  
         {editor && \<EditorBubbleMenu editor\={editor} /\>}  
         \<EditorContent editor\={editor} /\>  
       \</div\>  
     );

#### **Prompt 3.2: Implementing the Floating Menu**

**Instructions for AI:**

Create a FloatingMenu that appears on empty lines to provide quick-insert actions for common blocks.

1. Create the Floating Menu Component:  
   This component will offer buttons to insert headings, lists, and other block-level elements.  
   * **File Path:** apps/nextblock/components/tiptap/ui/FloatingMenu.tsx  
   * **Content:**  
     TypeScript  
     'use client';

     import { FloatingMenu, Editor } from '@tiptap/react';  
     import { Heading1, Heading2, Pilcrow, List, ListOrdered, Quote, Code2 } from 'lucide-react';  
     import { Button } from '@nextblock-monorepo/ui';

     interface EditorFloatingMenuProps {  
       editor: Editor;  
     }

     export const EditorFloatingMenu: React.FC\<EditorFloatingMenuProps\> \= ({ editor }) \=\> {  
       if (\!editor) {  
         return null;  
       }

       return (  
         \<FloatingMenu  
           editor\={editor}  
           tippyOptions\={{ duration: 100 }}  
           className\="flex items-center gap-1 rounded-md border border-input bg-background p-1"  
         \>  
           \<Button  
             variant\={editor.isActive('heading', { level: 1 })? 'default' : 'ghost'}  
             size\="icon"  
             onClick\={() \=\> editor.chain().focus().toggleHeading({ level: 1 }).run()}  
           \>  
             \<Heading1 className\="h-4 w-4" /\>  
           \</Button\>  
           \<Button  
             variant\={editor.isActive('heading', { level: 2 })? 'default' : 'ghost'}  
             size\="icon"  
             onClick\={() \=\> editor.chain().focus().toggleHeading({ level: 2 }).run()}  
           \>  
             \<Heading2 className\="h-4 w-4" /\>  
           \</Button\>  
           \<Button  
             variant\={editor.isActive('bulletList')? 'default' : 'ghost'}  
             size\="icon"  
             onClick\={() \=\> editor.chain().focus().toggleBulletList().run()}  
           \>  
             \<List className\="h-4 w-4" /\>  
           \</Button\>  
           \<Button  
             variant\={editor.isActive('orderedList')? 'default' : 'ghost'}  
             size\="icon"  
             onClick\={() \=\> editor.chain().focus().toggleOrderedList().run()}  
           \>  
             \<ListOrdered className\="h-4 w-4" /\>  
           \</Button\>  
           \<Button  
             variant\={editor.isActive('blockquote')? 'default' : 'ghost'}  
             size\="icon"  
             onClick\={() \=\> editor.chain().focus().toggleBlockquote().run()}  
           \>  
             \<Quote className\="h-4 w-4" /\>  
           \</Button\>  
           \<Button  
             variant\={editor.isActive('codeBlock')? 'default' : 'ghost'}  
             size\="icon"  
             onClick\={() \=\> editor.chain().focus().toggleCodeBlock().run()}  
           \>  
             \<Code2 className\="h-4 w-4" /\>  
           \</Button\>  
         \</FloatingMenu\>  
       );  
     };

2. Integrate the Floating Menu into the Editor:  
   Modify TiptapEditor.tsx again to include the new EditorFloatingMenu.  
   * **File Path:** apps/nextblock/components/tiptap/TiptapEditor.tsx  
   * **Action:** Import EditorFloatingMenu and render it alongside the BubbleMenu.  
     TypeScript  
     //... imports  
     import { EditorBubbleMenu } from './ui/BubbleMenu';  
     import { EditorFloatingMenu } from './ui/FloatingMenu';

     //... inside TiptapEditor component  
     const editor \= useEditor({ /\*... \*/ });

     return (  
       \<div className\="relative w-full rounded-md border border-input bg-background px-3 py-2"\>  
         {editor && \<EditorBubbleMenu editor\={editor} /\>}  
         {editor && \<EditorFloatingMenu editor\={editor} /\>}  
         \<EditorContent editor\={editor} /\>  
       \</div\>  
     );

This completes the implementation of the core editor UI, providing users with intuitive, contextual controls for a fluid writing experience.

---

### **Prompt 4: The Notion-Style Experience \- Slash Commands & Custom Interactive Nodes**

**Objective:** To deliver on the project's promise of "Notion/Gutenberg-like flexibility".3 This section is the most critical, transforming the editor from a standard rich-text field into a true block-based content builder. It involves implementing a slash command menu from scratch using Tiptap's free utilities and architecting a system for custom, interactive React nodes that recycle your existing widget concepts.7

#### **Prompt 4.1: Implementing the Slash Command Menu**

**Instructions for AI:**

Implement a Notion-style slash command menu. This will be built using the free @tiptap/suggestion utility, not a paid component, to adhere to the project's open-source ethos.8

1. Create the Slash Command Configuration:  
   This file will define the suggestion trigger, the items available in the menu, and the logic for rendering the command list.  
   * **File Path:** apps/nextblock/components/tiptap/ui/slash-command.ts  
   * **Content:**  
     TypeScript  
     import { Editor, Range } from '@tiptap/core';  
     import { ReactRenderer } from '@tiptap/react';  
     import { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';  
     import {  
       Heading1, Heading2, Heading3, List, ListOrdered, TextQuote, Code, Image as ImageIcon, Youtube  
     } from 'lucide-react';  
     import tippy from 'tippy.js';  
     import { SlashCommandList } from './SlashCommandList';

     interface CommandProps {  
       editor: Editor;  
       range: Range;  
     }

     const commandItems \=;

     export const suggestion \= {  
       items: ({ query }: { query: string }) \=\> {  
         return commandItems.filter(item \=\> item.title.toLowerCase().startsWith(query.toLowerCase())).slice(0, 10);  
       },  
       render: () \=\> {  
         let component: ReactRenderer;  
         let popup: any;

         return {  
           onStart: (props: SuggestionProps) \=\> {  
             component \= new ReactRenderer(SlashCommandList, {  
               props,  
               editor: props.editor,  
             });

             popup \= tippy('body', {  
               getReferenceClientRect: props.clientRect,  
               appendTo: () \=\> document.body,  
               content: component.element,  
               showOnCreate: true,  
               interactive: true,  
               trigger: 'manual',  
               placement: 'bottom-start',  
             });  
           },  
           onUpdate(props: SuggestionProps) {  
             component.updateProps(props);  
             popup.setProps({  
               getReferenceClientRect: props.clientRect,  
             });  
           },  
           onKeyDown(props: SuggestionKeyDownProps) {  
             if (props.event.key \=== 'Escape') {  
               popup.hide();  
               return true;  
             }  
             return component.ref?.onKeyDown(props);  
           },  
           onExit() {  
             popup.destroy();  
             component.destroy();  
           },  
         };  
       },  
     };

2. Create the Slash Command List Component:  
   This is the React component that renders the actual dropdown menu.  
   * **File Path:** apps/nextblock/components/tiptap/ui/SlashCommandList.tsx  
   * **Content:**  
     TypeScript  
     import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

     interface SlashCommandListProps {  
       items: { title: string; icon: React.ElementType; command: (props: any) \=\> void };  
       command: (item: any) \=\> void;  
     }

     export const SlashCommandList \= forwardRef((props: SlashCommandListProps, ref) \=\> {  
       const \= useState(0);

       const selectItem \= (index: number) \=\> {  
         const item \= props.items\[index\];  
         if (item) {  
           props.command(item);  
         }  
       };

       useEffect(() \=\> setSelectedIndex(0), \[props.items\]);

       useImperativeHandle(ref, () \=\> ({  
         onKeyDown: ({ event }: { event: React.KeyboardEvent }) \=\> {  
           if (event.key \=== 'ArrowUp') {  
             setSelectedIndex((selectedIndex \+ props.items.length \- 1) % props.items.length);  
             return true;  
           }  
           if (event.key \=== 'ArrowDown') {  
             setSelectedIndex((selectedIndex \+ 1) % props.items.length);  
             return true;  
           }  
           if (event.key \=== 'Enter') {  
             selectItem(selectedIndex);  
             return true;  
           }  
           return false;  
         },  
       }));

       return (  
         \<div className\="z-50 max-h-80 w-72 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"\>  
           {props.items.length? (  
             props.items.map((item, index) \=\> (  
               \<button  
                 key\={index}  
                 className\={\`flex w-full items-center gap-2 rounded p-2 text-left text-sm ${  
                   index \=== selectedIndex? 'bg-accent text-accent-foreground' : ''  
                 }\`}  
                 onClick\={() \=\> selectItem(index)}  
               \>  
                 \<item.icon className\="h-5 w-5" /\>  
                 \<span\>{item.title}\</span\>  
               \</button\>  
             ))  
           ) : (  
             \<div className\="p-2 text-sm"\>No results\</div\>  
           )}  
         \</div\>  
       );  
     });

     SlashCommandList.displayName \= 'SlashCommandList';

3. Integrate the Slash Command into the Editor:  
   Finally, update the extensions hub to include the suggestion utility.  
   * **File Path:** apps/nextblock/components/tiptap/extensions.ts  
   * **Action:** Import Suggestion and the suggestion config, then add it to the extensions array.  
     TypeScript  
     // Add these imports at the top  
     import Suggestion from '@tiptap/suggestion';  
     import { suggestion } from './ui/slash-command';

     // In the editorExtensions array, add the new extension  
     //... after the last extension  
     Suggestion.configure({  
       char: '/',  
      ...suggestion,  
     }),

#### **Prompt 4.2: Architecting Custom Interactive Block Nodes**

**Instructions for AI:**

Establish the architecture for custom, interactive block nodes using React components. You will create a Tiptap extension and a corresponding ReactNodeView for an "Alert" widget, recycling the concept from the project's documentation.7 This pattern will be the blueprint for all future custom blocks.

1. Create the Custom Node Directory:  
   Organize all custom node files in a dedicated directory.  
   * **Action:** Create the directory apps/nextblock/components/tiptap/nodes/.  
2. Create the Tiptap Extension for the Alert Node:  
   This file defines the node's schema, attributes, and rendering logic.  
   * **File Path:** apps/nextblock/components/tiptap/nodes/AlertNode.ts  
   * **Content:**  
     TypeScript  
     import { Node, mergeAttributes } from '@tiptap/core';  
     import { ReactNodeViewRenderer } from '@tiptap/react';  
     import { AlertNodeView } from './AlertNodeView';

     export default Node.create({  
       name: 'alert',  
       group: 'block',  
       content: 'block+',  
       defining: true,

       addAttributes() {  
         return {  
           variant: {  
             default: 'info',  
           },  
         };  
       },

       parseHTML() {  
         return \[{ tag: 'div\[data-type="alert"\]' }\];  
       },

       renderHTML({ HTMLAttributes }) {  
         return;  
       },

       addNodeView() {  
         return ReactNodeViewRenderer(AlertNodeView);  
       },  
     });

3. Create the React Node View Component:  
   This is the interactive React component that users will see and interact with in the editor.  
   * **File Path:** apps/nextblock/components/tiptap/nodes/AlertNodeView.tsx  
   * **Content:**  
     TypeScript  
     import React from 'react';  
     import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';  
     import { Alert, AlertDescription, AlertTitle } from '@nextblock-monorepo/ui';  
     import { AlertCircle, Info, TriangleAlert } from 'lucide-react';

     export const AlertNodeView \= ({ node, updateAttributes }: any) \=\> {  
       const { variant } \= node.attrs;

       const icons \= {  
         info: \<Info className\="h-4 w-4" /\>,  
         warning: \<TriangleAlert className\="h-4 w-4" /\>,  
         destructive: \<AlertCircle className\="h-4 w-4" /\>,  
       };

       return (  
         \<NodeViewWrapper className\="alert-node-view"\>  
           \<Alert variant\={variant} className\="relative"\>  
             \<div className\="absolute \-top-2 \-right-2"\>  
               \<select  
                 value\={variant}  
                 onChange\={(e) \=\> updateAttributes({ variant: e.target.value })}  
                 className="rounded border bg-background px-1 text-xs"  
                 contentEditable={false}  
               \>  
                 \<option value\="info"\>Info\</option\>  
                 \<option value\="warning"\>Warning\</option\>  
                 \<option value\="destructive"\>Destructive\</option\>  
               \</select\>  
             \</div\>  
             {icons\[variant as keyof typeof icons\]}  
             \<AlertTitle\>Heads up\!\</AlertTitle\>  
             \<AlertDescription\>  
               \<NodeViewContent className\="content" /\>  
             \</AlertDescription\>  
           \</Alert\>  
         \</NodeViewWrapper\>  
       );  
     };

4. **Integrate the Custom Node into the Editor:**  
   * **File Path:** apps/nextblock/components/tiptap/extensions.ts  
   * **Action:** Import and add AlertNode to the editorExtensions array.  
     TypeScript  
     // Add import at top  
     import AlertNode from './nodes/AlertNode';

     // Add to extensions array  
     AlertNode,

5. Update Slash Commands:  
   Add a new command to the slash command menu to insert the custom alert block.  
   * **File Path:** apps/nextblock/components/tiptap/ui/slash-command.ts  
   * **Action:** Add a new item to the commandItems array.  
     TypeScript  
     // Import an icon for it, e.g., MessageSquareWarning  
     import { /\*...,\*/ MessageSquareWarning } from 'lucide-react';

     // Add to commandItems array  
     { title: 'Alert', icon: MessageSquareWarning, command: ({ editor, range }: CommandProps) \=\> { editor.chain().focus().deleteRange(range).setNode('alert').run(); } },

#### **Custom Block Node Implementation Map**

This table formalizes the architecture for creating custom blocks, serving as a blueprint for future development and aligning with the "Block SDK" objective.3

| Widget Name | Tiptap Extension File Path | React NodeView Component Path | Key Attributes |
| :---- | :---- | :---- | :---- |
| **Alert** | .../nodes/AlertNode.ts | .../nodes/AlertNodeView.tsx | variant: 'info' | 'warning' | 'destructive' |
| **CTA** | .../nodes/CtaNode.ts | .../nodes/CtaNodeView.tsx | buttonText: string, buttonUrl: string |

#### **Prompt 4.3: Implementing Drag and Drop for Blocks**

**Instructions for AI:**

Add drag-and-drop functionality to the custom Alert node, allowing users to reorder blocks.

1. Update the Alert Node View Component:  
   Modify the AlertNodeView.tsx to include a drag handle element.  
   * **File Path:** apps/nextblock/components/tiptap/nodes/AlertNodeView.tsx  
   * **Action:** Wrap the Alert component with a div and add a drag handle element. The handle must have data-drag-handle attribute.  
     TypeScript  
     //... imports  
     import { GripVertical } from 'lucide-react';

     //... inside AlertNodeView component  
     return (  
       \<NodeViewWrapper className\="alert-node-view relative group"\>  
         \<div  
           className\="absolute \-left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"  
           contentEditable\={false}  
           draggable  
           data-drag-handle  
         \>  
           \<GripVertical className\="h-5 w-5 text-muted-foreground" /\>  
         \</div\>  
         \<Alert variant\={variant} className\="relative"\>  
           {/\*... rest of the component \*/}  
         \</Alert\>  
       \</NodeViewWrapper\>  
     );

2. Update the Extensions Hub:  
   Add the DragHandleReact extension to the editor configuration.  
   * **File Path:** apps/nextblock/components/tiptap/extensions.ts  
   * **Action:** Import and configure the extension.  
     TypeScript  
     // Add import at top  
     import { DragHandleReact } from 'tiptap-extension-drag-handle-react';

     // Add to extensions array  
     DragHandleReact,

This completes the implementation of the Notion-style block editor, providing users with powerful and intuitive content creation tools.

---

### **Prompt 5: Final Polish & Utility Extensions**

**Objective:** To add the final layer of polish that elevates the editor's user experience from functional to exceptional. These utility extensions address common points of friction and add "smart" features that align with the project's goal of being the "best-UX CMS".3 The cumulative effect of these small additions has a significant impact on the perceived quality and usability of the editor.

#### **Prompt 5.1: Enhancing the User Experience**

**Instructions for AI:**

Integrate extensions that improve the core writing and interaction flow.

1. Update the Extensions Hub:  
   Modify apps/nextblock/components/tiptap/extensions.ts to add and configure Placeholder, Focus, and TrailingNode.  
   TypeScript  
   // Add imports at the top  
   import Placeholder from '@tiptap/extension-placeholder';  
   import Focus from '@tiptap/extension-focus';  
   import TrailingNode from '@tiptap/extension-trailing-node';

   // Add to extensions array  
   Placeholder.configure({  
     placeholder: ({ node }) \=\> {  
       if (node.type.name \=== 'heading') {  
         return \`Heading ${node.attrs.level}\`;  
       }  
       return "Start writing or type '/' for commands...";  
     },  
   }),  
   Focus.configure({  
     className: 'has-focus',  
     mode: 'all',  
   }),  
   TrailingNode,

2. Enhance the Stylesheet:  
   Add styling for the focus state in apps/nextblock/styles/tiptap.css.  
   CSS  
   /\* at the end of the file \*/

   /\* Focus Styles \*/

.tiptap.has-focus {  
border-radius: 3px;  
box-shadow: 0 0 0 2px hsl(var(--primary));  
}  
\`\`\`

#### **Prompt 5.2: Adding Content Intelligence & Utilities**

**Instructions for AI:**

Integrate utility extensions for content analysis and automated typography.

1. Update the Extensions Hub:  
   Modify apps/nextblock/components/tiptap/extensions.ts to add CharacterCount, Typography, and other miscellaneous extensions.  
   TypeScript  
   // Add imports at the top  
   import CharacterCount from '@tiptap/extension-character-count';  
   import Typography from '@tiptap/extension-typography';  
   import Subscript from '@tiptap/extension-subscript';  
   import Superscript from '@tiptap/extension-superscript';  
   import Underline from '@tiptap/extension-underline';  
   import { Mathematics } from 'tiptap-extension-mathematics';

   // Add to extensions array  
   CharacterCount.configure({  
     limit: 20000,  
   }),  
   Typography,  
   Subscript,  
   Superscript,  
   Underline,  
   Mathematics,

2. Display Character Count in the UI:  
   Modify TiptapEditor.tsx to display the character count below the editor.  
   * **File Path:** apps/nextblock/components/tiptap/TiptapEditor.tsx  
   * **Action:** Add the display logic.  
     TypeScript  
     //... inside TiptapEditor component  
     return (  
       \<div className\="relative w-full"\>  
         \<div className\="rounded-md border border-input bg-background px-3 py-2"\>  
           {editor && \<EditorBubbleMenu editor\={editor} /\>}  
           {editor && \<EditorFloatingMenu editor\={editor} /\>}  
           \<EditorContent editor\={editor} /\>  
         \</div\>  
         {editor && (  
           \<div className\="mt-1 text-right text-xs text-muted-foreground"\>  
             {editor.storage.characterCount.characters()} characters  
           \</div\>  
         )}  
       \</div\>  
     );

#### **Prompt 5.3: Final Code Review and Refinement**

**Instructions for AI:**

This is the final step. Please perform a comprehensive review of all the Tiptap-related code you have generated in the previous steps.

* **Files to Review:**  
  * apps/nextblock/components/tiptap/TiptapEditor.tsx  
  * apps/nextblock/components/tiptap/extensions.ts  
  * apps/nextblock/components/tiptap/ui/BubbleMenu.tsx  
  * apps/nextblock/components/tiptap/ui/FloatingMenu.tsx  
  * apps/nextblock/components/tiptap/ui/slash-command.ts  
  * apps/nextblock/components/tiptap/ui/SlashCommandList.tsx  
  * apps/nextblock/components/tiptap/nodes/AlertNode.ts  
  * apps/nextblock/components/tiptap/nodes/AlertNodeView.tsx  
  * apps/nextblock/styles/tiptap.css  
* **Review Criteria:**  
  1. **Consistency:** Ensure all imports from @nextblock-monorepo/ui are correct and that the styling in tiptap.css consistently uses the project's design tokens (e.g., hsl(var(--...))).  
  2. **Correctness:** Verify that all Tiptap extensions are correctly configured and that all editor commands (editor.chain()...) are valid.  
  3. **Completeness:** Cross-reference the final extensions.ts file with the "Comprehensive Tiptap Free Extension Checklist" to ensure no free extensions were missed.  
  4. **Refactoring:** Identify any opportunities to simplify code, improve readability, or enhance performance. For example, check for redundant code or opportunities to create helper functions.

Provide a summary of your findings and apply any necessary corrections to the codebase.

### **Conclusion**

By executing this series of prompts, the NextBlock CMS will be equipped with a state-of-the-art, block-based rich text editor. This implementation successfully integrates the full suite of Tiptap's free, open-source extensions, delivering a user experience that is both powerful for content creators and extensible for developers. The resulting editor is not merely a feature but a core asset that directly supports the platform's strategic goals of achieving market leadership through superior UX and fostering a vibrant developer ecosystem. The modular architecture established here provides a robust and scalable foundation for all future enhancements, including the development of a formal Block SDK and a third-party marketplace.

#### **Works cited**

1. Pro Extensions | Tiptap Editor Docs, accessed July 29, 2025, [https://tiptap.dev/docs/guides/pro-extensions](https://tiptap.dev/docs/guides/pro-extensions)  
2. Best rich text editor? : r/nextjs \- Reddit, accessed July 29, 2025, [https://www.reddit.com/r/nextjs/comments/1g2x2rm/best\_rich\_text\_editor/](https://www.reddit.com/r/nextjs/comments/1g2x2rm/best_rich_text_editor/)  
3. Monorepo Architecture & Development Guide  
4. Style your editor | Tiptap Editor Docs, accessed July 29, 2025, [https://tiptap.dev/docs/editor/getting-started/style-editor](https://tiptap.dev/docs/editor/getting-started/style-editor)  
5. Extensions | Tiptap Editor Docs, accessed July 29, 2025, [https://tiptap.dev/docs/editor/extensions/overview](https://tiptap.dev/docs/editor/extensions/overview)  
6. Examples | Tiptap Editor Docs, accessed July 29, 2025, [https://tiptap.dev/docs/examples](https://tiptap.dev/docs/examples)  
7. Webman-Dev/nextblock \- GitHub, accessed July 29, 2025, [https://github.com/Webman-Dev/nextblock](https://github.com/Webman-Dev/nextblock)  
8. Slash Commands Extension | Tiptap Editor Docs, accessed July 29, 2025, [https://tiptap.dev/docs/examples/experiments/slash-commands](https://tiptap.dev/docs/examples/experiments/slash-commands)