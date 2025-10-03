

# **Enhanced AI Prompts for NextBlock Editor Refactoring**

This document provides a comprehensive, multi-part series of prompts designed to guide an expert AI assistant in refactoring the NextBlock CMS rich-text editor. The objective is to create a new, reusable, and feature-rich Notion-style editor library within the existing Nx monorepo. The process is broken down into discrete, sequential, and copy-pasteable prompts to ensure clarity, manage context, and guarantee a successful implementation. Each prompt builds upon the work of the previous one.

---

## **Prompt 1 of 8: Foundational Scaffolding, Dependency Installation, and Core Migration**

### **Your Persona**

You are an expert AI developer specializing in TypeScript, React, Next.js, and the Nx monorepo toolkit. You write clean, modular, and architecturally sound code that strictly adheres to the patterns of the project you are working on. Your work is precise, and you anticipate integration challenges by establishing a complete and correct foundation from the outset.

### **Primary Objective**

Your goal is to perform the initial setup for the new editor library. This includes scaffolding the library within the monorepo, installing a comprehensive list of all required dependencies for the entire project, establishing the correct internal directory structure, and migrating the existing custom widget code into the new library, refactoring it to align with monorepo best practices.

### **Project Context & Key Files**

The project is an Nx monorepo. The architectural principles are defined in the "Monorepo Architecture & Development Guide".1 Reusable functionality must be placed in

libs packages, and shared UI components are imported from @nextblock-cms/ui. Path aliases are defined in the root tsconfig.base.json.

### **Detailed Step-by-Step Instructions**

#### **Step 1.1: Generate the Publishable Editor Library**

Execute the following command in the monorepo root to scaffold the new, publishable React library. This structure is mandated by the project's development guide for all reusable functionality.1 The

\--publishable flag aligns with the long-term strategy of potentially distributing a developer SDK.1

Bash

nx g @nx/react:library editor \--directory=libs \--publishable \--importPath="@nextblock-cms/editor"

#### **Step 1.2: Comprehensive Dependency Installation**

To ensure all features can be implemented without interruption, install the complete set of required Tiptap packages and their dependencies. This includes the core libraries, all free open-source extensions, and utilities needed for a feature-rich editor experience.2 Execute the following command in the monorepo root:

Bash

npm install @tiptap/react @tiptap/core @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-bubble-menu @tiptap/extension-floating-menu @tiptap/extension-suggestion @tiptap/extension-code-block-lowlight @tiptap/extension-blockquote @tiptap/extension-bullet-list @tiptap/extension-hard-break @tiptap/extension-heading @tiptap/extension-horizontal-rule @tiptap/extension-image @tiptap/extension-list-item @tiptap/extension-ordered-list @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-bold @tiptap/extension-code @tiptap/extension-highlight @tiptap/extension-italic @tiptap/extension-link @tiptap/extension-strike @tiptap/extension-subscript @tiptap/extension-superscript @tiptap/extension-text-style @tiptap/extension-underline @tiptap/extension-character-count @tiptap/extension-color @tiptap/extension-dropcursor @tiptap/extension-focus @tiptap/extension-font-family @tiptap/extension-gapcursor @tiptap/extension-history @tiptap/extension-line-height @tiptap/extension-text-align @tiptap/extension-trailing-node @tiptap/extension-typography lowlight lucide-react

The table below summarizes the purpose of these dependencies, which cover the full spectrum of free Tiptap features available.3

| Category | Package Name | Purpose |
| :---- | :---- | :---- |
| **Core & React** | @tiptap/react, @tiptap/core | Essential packages for integrating Tiptap with React. |
| **Kit** | @tiptap/starter-kit | A bundle of the most common extensions for a quick start.2 |
| **Menus & UI** | @tiptap/extension-bubble-menu | For creating a contextual menu that floats over selected text. |
|  | @tiptap/extension-floating-menu | For creating a menu that appears on empty lines. |
|  | @tiptap/extension-suggestion | Utility for building slash commands and mention-style popups. |
| **Nodes** | @tiptap/extension-image | For adding images. |
|  | @tiptap/extension-table (and related) | For full-featured tables with headers, rows, and cells.5 |
|  | @tiptap/extension-task-list & item | For creating interactive checklists.6 |
|  | @tiptap/extension-code-block-lowlight | For code blocks with syntax highlighting via lowlight. |
| **Marks** | @tiptap/extension-link | For creating hyperlinks. |
|  | @tiptap/extension-highlight | For highlighting text, with multicolor support.7 |
|  | @tiptap/extension-text-style | A foundational mark for applying inline styles like color and font size.8 |
| **Functionality** | @tiptap/extension-placeholder | For showing placeholder text in an empty editor. |
|  | @tiptap/extension-character-count | For counting characters and words.9 |
|  | @tiptap/extension-typography | For smart text substitutions (e.g., \-\> to →).10 |
| **Dependencies** | lowlight | The syntax highlighting engine for CodeBlockLowlight. |
|  | lucide-react | Icon library that integrates well with shadcn/ui. |

#### **Step 1.3: Establish the Library's Internal Architecture**

Inside the newly created libs/editor/src/lib/ directory, create the following folder structure. This organization separates concerns and prepares the library for the components and logic that will be added in subsequent steps.

libs/editor/src/lib/  
├── components/  
│   ├── menus/  
│   └── widgets/  
├── extensions/  
├── hooks/  
└── NotionEditor.tsx

#### **Step 1.4: Migrate and Refactor Existing Custom Widgets**

To make the editor a self-contained, reusable product, the custom widgets currently in apps/nextblock must be migrated into the new library. This is not just a file-moving exercise; it is an essential architectural refactoring to enforce modularity and eliminate dependencies on application-specific code.1

1. **Move Node Definitions**:  
   * Move apps/nextblock/app/cms/blocks/components/tiptap-extensions/AlertWidgetNode.ts to libs/editor/src/lib/extensions/.  
   * Move apps/nextblock/app/cms/blocks/components/tiptap-extensions/CtaWidgetNode.ts to libs/editor/src/lib/extensions/.  
2. **Move React Components**:  
   * Move apps/nextblock/app/cms/blocks/components/tiptap-extensions/components/AlertWidgetComponent.tsx to libs/editor/src/lib/components/widgets/.  
   * Move apps/nextblock/app/cms/blocks/components/tiptap-extensions/components/CtaWidgetComponent.tsx to libs/editor/src/lib/components/widgets/.  
3. **Refactor Imports**:  
   * Open the four moved files (AlertWidgetNode.ts, CtaWidgetNode.ts, AlertWidgetComponent.tsx, CtaWidgetComponent.tsx).  
   * Carefully inspect all import statements.  
   * Update any relative paths (../../...) to use the monorepo's absolute path aliases defined in tsconfig.base.json.1  
   * **Crucially**, any component imported from the old UI path must now be imported from the shared UI library. For example:  
     * **Change this:** import { Button } from '../../../../../../../../libs/ui/src/lib/button';  
     * **To this:** import { Button } from '@nextblock-cms/ui';

#### **Step 1.5: Create Initial Editor Component**

Create the initial content for the main editor file at libs/editor/src/lib/NotionEditor.tsx. This will serve as the entry point for the editor library. For now, it will be a basic placeholder.

TypeScript

// libs/editor/src/lib/NotionEditor.tsx  
'use client';

import { useEditor, EditorContent } from '@tiptap/react';  
import StarterKit from '@tiptap/starter-kit';  
import React from 'react';

interface NotionEditorProps {  
  content: string;  
  onChange: (content: string) \=\> void;  
}

export const NotionEditor: React.FC\<NotionEditorProps\> \= ({ content, onChange }) \=\> {  
  const editor \= useEditor({  
    extensions:,  
    content: content,  
    onUpdate: ({ editor }) \=\> {  
      onChange(editor.getHTML());  
    },  
    editorProps: {  
      attributes: {  
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none',  
      },  
    },  
  });

  return \<EditorContent editor\={editor} /\>;  
};

export default NotionEditor;

#### **Step 1.6: Create Library Export Barrel File**

Create an index.ts file at libs/editor/src/index.ts to export the NotionEditor component, making it available for import by other packages in the monorepo.

TypeScript

// libs/editor/src/index.ts  
export \* from './lib/NotionEditor';

### **Verification**

After completing these steps, run nx build editor from the monorepo root. The command should complete successfully, indicating that the new library is correctly scaffolded, dependencies are resolved, and the initial file structure is sound.

---

## **Prompt 2 of 8: Extension Integration \- Core Schema, Marks, and Structural Nodes**

### **Your Persona**

You are an expert AI developer specializing in TypeScript, React, Next.js, and the Nx monorepo toolkit. You write clean, modular, and architecturally sound code that strictly adheres to the patterns of the project you are working on. Your focus is on establishing a robust and extensible configuration for the Tiptap editor.

### **Primary Objective**

Your goal is to create the central configuration file for all Tiptap extensions and populate it with the core schema elements (document structure, text, paragraphs), foundational marks (bold, italic), and essential structural nodes (headings, blockquotes, code blocks, images). This will form the backbone of the editor's capabilities.

### **Project Context & Key Files**

This prompt builds directly upon the work completed in Prompt 1\. The primary file to be created and modified is libs/editor/src/lib/extensions/index.ts. The NotionEditor.tsx component will be updated to consume this new centralized configuration.

### **Detailed Step-by-Step Instructions**

#### **Step 2.1: Create the Central Extensions Configuration File**

Create a new file at libs/editor/src/lib/extensions/index.ts. This file will be the single source of truth for the editor's feature set. It will export an array containing all configured Tiptap extensions. This approach promotes modularity and makes it easy to manage the editor's capabilities.

TypeScript

// libs/editor/src/lib/extensions/index.ts  
import { type Extension } from '@tiptap/core';

export const editorExtensions: Extension \= \[  
  // All extensions will be added here  
\];

#### **Step 2.2: Configure Foundational Extensions**

Populate the editorExtensions array in libs/editor/src/lib/extensions/index.ts with the foundational extensions required for any rich text editor.

1. **Import necessary packages** at the top of the file.  
2. **Configure StarterKit**: Use StarterKit for its sensible defaults but disable its codeBlock and history extensions so we can configure them manually with more options later. This provides a balance of convenience and control.2  
3. **Configure CodeBlockLowlight**: Add the syntax highlighting extension. This requires importing lowlight and the necessary languages (e.g., css, js, ts, html).  
4. **Configure Image**: Add the image extension. Enable inline mode and allow base64 sources for flexibility when pasting images.  
5. **Configure Link**: Add the link extension and configure it with openOnClick: false to prevent navigation when clicking inside the editor, allowing for an edit-popover experience instead.  
6. **Add Other Structural Nodes**: Include Blockquote and HorizontalRule.  
7. **Add History**: Explicitly add the history extension for undo/redo functionality.

Update libs/editor/src/lib/extensions/index.ts to the following:

TypeScript

// libs/editor/src/lib/extensions/index.ts  
import { type Extension } from '@tiptap/core';  
import StarterKit from '@tiptap/starter-kit';  
import Blockquote from '@tiptap/extension-blockquote';  
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';  
import History from '@tiptap/extension-history';  
import Image from '@tiptap/extension-image';  
import Link from '@tiptap/extension-link';  
import HorizontalRule from '@tiptap/extension-horizontal-rule';

// Load syntax highlighting languages  
import { lowlight } from 'lowlight/lib/core';  
import css from 'highlight.js/lib/languages/css';  
import js from 'highlight.js/lib/languages/javascript';  
import ts from 'highlight.js/lib/languages/typescript';  
import html from 'highlight.js/lib/languages/xml';

lowlight.registerLanguage('html', html);  
lowlight.registerLanguage('css', css);  
lowlight.registerLanguage('js', js);  
lowlight.registerLanguage('ts', ts);

export const editorExtensions: Extension \=;

#### **Step 2.3: Update the Editor Component to Use the Central Configuration**

Modify libs/editor/src/lib/NotionEditor.tsx to import and use the editorExtensions array. This decouples the editor component from the specific extension configuration.

TypeScript

// libs/editor/src/lib/NotionEditor.tsx  
'use client';

import { useEditor, EditorContent } from '@tiptap/react';  
import React from 'react';  
import { editorExtensions } from './extensions'; // \<-- Import the central configuration

interface NotionEditorProps {  
  content: string;  
  onChange: (content: string) \=\> void;  
}

export const NotionEditor: React.FC\<NotionEditorProps\> \= ({ content, onChange }) \=\> {  
  const editor \= useEditor({  
    extensions: editorExtensions, // \<-- Use the imported extensions array  
    content: content,  
    onUpdate: ({ editor }) \=\> {  
      onChange(editor.getHTML());  
    },  
    editorProps: {  
      attributes: {  
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-\[300px\]',  
      },  
    },  
  });

  return \<EditorContent editor\={editor} /\>;  
};

export default NotionEditor;

### **Verification**

Run nx serve nextblock and navigate to the page containing the editor. Verify the following:

* Basic text formatting (bold, italic, from StarterKit) works.  
* You can create headings, blockquotes, and horizontal rules.  
* Typing \`\`\` and pressing space creates a code block.  
* Undo and redo functionality works (Ctrl+Z, Ctrl+Y).

---

## **Prompt 3 of 8: Extension Integration \- Advanced Nodes (Lists, Tables, Custom Widgets)**

### **Your Persona**

You are an expert AI developer specializing in TypeScript, React, Next.js, and the Nx monorepo toolkit. You write clean, modular, and architecturally sound code that strictly adheres to the patterns of the project you are working on. Your expertise lies in composing complex features from smaller, well-configured parts.

### **Primary Objective**

Your goal is to enhance the editor's capabilities by integrating advanced, multi-part node structures. This includes comprehensive support for all list types (bulleted, ordered, and tasks) and full-featured tables. You will also formally integrate the previously migrated custom widget nodes (AlertWidgetNode, CtaWidgetNode) into the editor's schema.

### **Project Context & Key Files**

This prompt continues to build upon the central configuration file: libs/editor/src/lib/extensions/index.ts. You will also need to import the custom widget nodes from their new location within the libs/editor library.

### **Detailed Step-by-Step Instructions**

#### **Step 3.1: Integrate Comprehensive List Functionality**

A Notion-style editor requires robust list support, including nested task lists. Add the necessary extensions to libs/editor/src/lib/extensions/index.ts.

1. **Import List Extensions**: Add ListItem, BulletList, OrderedList, TaskList, and TaskItem to your imports.  
2. **Configure Lists**:  
   * OrderedList: Configure it to ensure a consistent class for styling.  
   * BulletList: Configure it to ensure a consistent class for styling.  
   * TaskList: The container for task items.  
   * TaskItem: The individual checklist item. Critically, set nested: true to allow for Notion-like indented sub-tasks.11

Add the following imports and configurations to libs/editor/src/lib/extensions/index.ts. Place them within the editorExtensions array.

TypeScript

// Add to imports at the top of libs/editor/src/lib/extensions/index.ts  
import ListItem from '@tiptap/extension-list-item';  
import BulletList from '@tiptap/extension-bullet-list';  
import OrderedList from '@tiptap/extension-ordered-list';  
import TaskList from '@tiptap/extension-task-list';  
import TaskItem from '@tiptap/extension-task-item';

// Add these to the editorExtensions array  
//... inside the array  
  ListItem,  
  BulletList.configure({  
    HTMLAttributes: {  
      class: 'list-disc pl-4',  
    },  
  }),  
  OrderedList.configure({  
    HTMLAttributes: {  
      class: 'list-decimal pl-4',  
    },  
  }),  
  TaskList.configure({  
    HTMLAttributes: {  
      class: 'list-none pl-0',  
    },  
  }),  
  TaskItem.configure({  
    nested: true, // Allow nested task lists  
    HTMLAttributes: {  
      class: 'flex items-start my-1',  
    },  
  }),  
//...

#### **Step 3.2: Integrate Full Table Support**

Tables are a cornerstone of structured content. Integrating them requires a suite of extensions working in concert.12 Add the full set of table extensions to the configuration.

1. **Import Table Extensions**: Import Table, TableRow, TableHeader, and TableCell.  
2. **Configure Tables**: Add the extensions to the array. Configure Table with resizable: true to enable column resizing, a key usability feature for modern editors.

Add the following to libs/editor/src/lib/extensions/index.ts:

TypeScript

// Add to imports at the top of libs/editor/src/lib/extensions/index.ts  
import Table from '@tiptap/extension-table';  
import TableRow from '@tiptap/extension-table-row';  
import TableHeader from '@tiptap/extension-table-header';  
import TableCell from '@tiptap/extension-table-cell';

// Add these to the editorExtensions array  
//... inside the array  
  Table.configure({  
    resizable: true,  
    HTMLAttributes: {  
      class: 'w-full border-collapse border border-gray-300 dark:border-gray-700',  
    },  
  }),  
  TableRow,  
  TableHeader.configure({  
    HTMLAttributes: {  
      class: 'bg-gray-100 dark:bg-gray-800 font-bold p-2 border border-gray-300 dark:border-gray-700',  
    },  
  }),  
  TableCell.configure({  
    HTMLAttributes: {  
      class: 'p-2 border border-gray-300 dark:border-gray-700',  
    },  
  }),  
//...

#### **Step 3.3: Integrate Custom Widget Nodes**

Finally, formally add the migrated custom widget nodes to the editor's schema. This makes them known to Tiptap and allows them to be inserted via commands.

1. **Import Custom Nodes**: Import AlertWidgetNode and CtaWidgetNode from their new locations in the extensions directory.  
2. **Add to Extensions Array**: Add the imported nodes to the editorExtensions array.

Add the following to libs/editor/src/lib/extensions/index.ts:

TypeScript

// Add to imports at the top of libs/editor/src/lib/extensions/index.ts  
import { AlertWidgetNode } from './AlertWidgetNode';  
import { CtaWidgetNode } from './CtaWidgetNode';

// Add these to the editorExtensions array (preferably at the end)  
//... inside the array  
  AlertWidgetNode,  
  CtaWidgetNode,  
//...

### **Verification**

Run nx serve nextblock. Since there is no UI yet to insert these new nodes, verification will be done by programmatically setting the editor content.

1. In NotionEditor.tsx, temporarily modify the useEditor hook to include test content for lists, tables, and your custom nodes.  
2. Confirm that the editor renders the bulleted list, ordered list, task list (with checkboxes), a full table, and the React components for your Alert and CTA widgets correctly.

Example test content to use:

HTML

\<h2\>Lists\</h2\>  
\<ul\>\<li\>Bullet 1\</li\>\<li\>Bullet 2\</li\>\</ul\>  
\<ol\>\<li\>Ordered 1\</li\>\<li\>Ordered 2\</li\>\</ol\>  
\<ul data-type\="taskList"\>\<li data-checked\="true"\>Task 1 (done)\</li\>\<li data-checked\="false"\>Task 2\</li\>\</ul\>  
\<h2\>Table\</h2\>  
\<table\>\<tbody\>\<tr\>\<th\>Name\</th\>\<th\>Role\</th\>\</tr\>\<tr\>\<td\>John Doe\</td\>\<td\>Developer\</td\>\</tr\>\<tr\>\<td\>Jane Smith\</td\>\<td\>Designer\</td\>\</tr\>\</tbody\>\</table\>  
\<h2\>Custom Widgets\</h2\>  
\<div data-type\="alert-widget"\>\</div\>  
\<div data-type\="cta-widget"\>\</div\>

---

## **Prompt 4 of 8: Extension Integration \- Stylistic and Functional Enhancements**

### **Your Persona**

You are an expert AI developer specializing in TypeScript, React, Next.js, and the Nx monorepo toolkit. You write clean, modular, and architecturally sound code that strictly adheres to the patterns of the project you are working on. You have a keen eye for user experience and understand that a great editor is defined by its subtle, helpful features.

### **Primary Objective**

Your goal is to round out the editor's feature set by integrating a wide array of stylistic and functional extensions. This includes text styling (highlighting, alignment, colors, fonts), usability improvements (placeholders, cursors), and smart typography.

### **Project Context & Key Files**

This prompt continues to add configurations to the central libs/editor/src/lib/extensions/index.ts file. Many of the stylistic extensions depend on @tiptap/extension-text-style, which was installed in Prompt 1\.

### **Detailed Step-by-Step Instructions**

#### **Step 4.1: Integrate Advanced Stylistic Marks**

Add extensions that give users fine-grained control over the appearance of their text.

1. **Import Extensions**: Import Highlight, Subscript, Superscript, TextStyle, Underline, Color, FontFamily, and TextAlign.  
2. **Configure Extensions**:  
   * Highlight: Enable multicolor: true to allow for various highlight colors, not just the default yellow.7  
   * TextStyle: This is a foundational extension that enables others; it must be included.8  
   * Color: This extends TextStyle to add text color support.  
   * FontFamily: This extends TextStyle to add font family support.  
   * TextAlign: Configure this to apply to block-level elements like heading and paragraph.13  
   * Underline, Subscript, Superscript: Add these standard formatting marks.

Add the following to libs/editor/src/lib/extensions/index.ts:

TypeScript

// Add to imports at the top of libs/editor/src/lib/extensions/index.ts  
import Highlight from '@tiptap/extension-highlight';  
import Subscript from '@tiptap/extension-subscript';  
import Superscript from '@tiptap/extension-superscript';  
import TextAlign from '@tiptap/extension-text-align';  
import TextStyle from '@tiptap/extension-text-style';  
import Underline from '@tiptap/extension-underline';  
import { Color } from '@tiptap/extension-color';  
import FontFamily from '@tiptap/extension-font-family';  
// Note: FontSize and LineHeight are often used but are part of TextStyle, not separate extensions.  
// We will add UI for them later.

// Add these to the editorExtensions array  
//... inside the array  
  Highlight.configure({  
    multicolor: true,  
  }),  
  Subscript,  
  Superscript,  
  TextAlign.configure({  
    types: \['heading', 'paragraph'\],  
  }),  
  TextStyle,  
  Color,  
  FontFamily,  
  Underline,  
//...

#### **Step 4.2: Integrate Core Functional and UX Extensions**

These extensions don't add new content types but significantly improve the editor's usability and "feel."

1. **Import Extensions**: Import Placeholder, CharacterCount, Dropcursor, Gapcursor, Focus, TrailingNode, and Typography.  
2. **Configure Extensions**:  
   * Placeholder: Configure it with helpful text that guides the user, such as suggesting the slash command.  
   * CharacterCount: Set a limit if desired, or use it just for display purposes.  
   * Focus: Add a class to the focused editor for styling hooks.  
   * TrailingNode: Ensure this is enabled to always have a clickable area at the end of the document, which is a major UX win.  
   * Typography: Enable this for "smart" text replacements.10  
   * Dropcursor and Gapcursor: These are essential for a smooth drag-and-drop experience, providing visual feedback when moving nodes.

Add the following to libs/editor/src/lib/extensions/index.ts:

TypeScript

// Add to imports at the top of libs/editor/src/lib/extensions/index.ts  
import CharacterCount from '@tiptap/extension-character-count';  
import Dropcursor from '@tiptap/extension-dropcursor';  
import Focus from '@tiptap/extension-focus';  
import Gapcursor from '@tiptap/extension-gapcursor';  
import Placeholder from '@tiptap/extension-placeholder';  
import TrailingNode from '@tiptap/extension-trailing-node';  
import Typography from '@tiptap/extension-typography';

// Add these to the editorExtensions array  
//... inside the array  
  CharacterCount.configure({  
    limit: 20000,  
  }),  
  Dropcursor.configure({  
    color: '\#60A5FA',  
    width: 2,  
  }),  
  Focus.configure({  
    className: 'has-focus',  
  }),  
  Gapcursor,  
  Placeholder.configure({  
    placeholder: ({ node }) \=\> {  
      if (node.type.name \=== 'heading' && node.attrs.level \=== 1) {  
        return 'What’s the title?';  
      }  
      if (node.type.name \=== 'paragraph' && node.content.size \=== 0) {  
        return "Press '/' for commands...";  
      }  
      return '';  
    },  
  }),  
  TrailingNode,  
  Typography,  
//...

### **Verification**

Run nx serve nextblock.

1. Verify the placeholder text appears in an empty editor.  
2. Verify that typing (c) automatically converts to ©, and \-\> converts to →.  
3. Although there is no UI yet, the editor is now fully configured with every free extension. The next steps will focus on building the interface to expose this functionality to the user. The editorExtensions array in libs/editor/src/lib/extensions/index.ts is now complete.

---

## **Prompt 5 of 8: Building the Contextual Bubble Menu**

### **Your Persona**

You are an expert AI developer specializing in TypeScript, React, Next.js, and the Nx monorepo toolkit. You excel at creating intuitive and context-aware user interfaces that seamlessly integrate with complex application logic. You build components that are both functional and visually consistent with the project's design system.

### **Primary Objective**

Your goal is to implement a Notion-style Bubble Menu for the editor. This menu must appear whenever a user selects text and provide contextual controls for inline formatting, linking, styling, and inserting custom widgets. The menu's UI must be built using the shared components from the @nextblock-cms/ui library to ensure visual consistency.

### **Project Context & Key Files**

This prompt focuses on creating new React components within the libs/editor library.

* **Create:** libs/editor/src/lib/components/menus/BubbleMenu.tsx  
* **Modify:** libs/editor/src/lib/NotionEditor.tsx to include the new BubbleMenu component.  
* **Leverage:** UI components from @nextblock-cms/ui (e.g., Button, Popover, Toolbar).

### **Detailed Step-by-Step Instructions**

#### **Step 5.1: Create the Bubble Menu Component**

Create a new file at libs/editor/src/lib/components/menus/BubbleMenu.tsx. This component will use Tiptap's BubbleMenu and isEditable property to render a floating toolbar.

The menu will contain:

* Buttons for toggling **Bold**, **Italic**, **Underline**, and **Strike**.  
* A button for toggling **Inline Code**.  
* A popover for setting and editing **Links**.  
* A popover for selecting **Text Color** and **Highlight Color**.  
* Buttons for inserting the custom **Alert** and **CTA** widgets.

Use lucide-react for icons and components from @nextblock-cms/ui for the structure.

TypeScript

// libs/editor/src/lib/components/menus/BubbleMenu.tsx  
'use client';

import { BubbleMenu, Editor } from '@tiptap/react';  
import {  
  Bold,  
  Italic,  
  Underline,  
  Strikethrough,  
  Code,  
  Link2,  
  Palette,  
  AlertTriangle,  
  Megaphone,  
} from 'lucide-react';  
import { FC, useState } from 'react';  
import { Popover, PopoverContent, PopoverTrigger } from '@nextblock-cms/ui/popover';  
import { Button } from '@nextblock-cms/ui/button';  
import { Toolbar, ToolbarGroup, ToolbarButton, ToolbarSeparator } from '@nextblock-cms/ui/toolbar';

interface BubbleMenuComponentProps {  
  editor: Editor;  
}

const LinkEditor: FC\<{ editor: Editor }\> \= ({ editor }) \=\> {  
  const \[url, setUrl\] \= useState(editor.getAttributes('link').href |

| '');

  const handleSetLink \= () \=\> {  
    if (url) {  
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();  
    } else {  
      editor.chain().focus().extendMarkRange('link').unsetLink().run();  
    }  
  };

  return (  
    \<div className\="p-2 flex items-center gap-2"\>  
      \<input  
        type\="url"  
        value\={url}  
        onChange\={(e) \=\> setUrl(e.target.value)}  
        placeholder="Enter URL"  
        className="bg-background p-1 rounded border border-input text-sm"  
        onKeyDown={(e) \=\> {  
          if (e.key \=== 'Enter') {  
            handleSetLink();  
          }  
        }}  
      /\>  
      \<Button size\="sm" onClick\={handleSetLink}\>  
        Set Link  
      \</Button\>  
    \</div\>  
  );  
};

const ColorSelector: FC\<{ editor: Editor }\> \= ({ editor }) \=\> {  
    const colors \= \['\#000000', '\#ff0000', '\#00ff00', '\#0000ff', '\#ffff00', '\#ff00ff', '\#00ffff'\];  
    const highlights \= \['\#ffff00', '\#ffc0cb', '\#add8e6', '\#90ee90', '\#ffa07a'\];  
    
    return (  
      \<div className\="p-2"\>  
        \<div className\="mb-2"\>  
          \<p className\="text-xs font-semibold mb-1"\>Text Color\</p\>  
          \<div className\="flex gap-1"\>  
            {colors.map((color) \=\> (  
              \<button  
                key\={color}  
                onClick\={() \=\> editor.chain().focus().setColor(color).run()}  
                className={\`w-6 h-6 rounded-full border-2 ${editor.isActive('textStyle', { color })? 'border-primary' : 'border-transparent'}\`}  
                style={{ backgroundColor: color }}  
              /\>  
            ))}  
            \<Button size\="icon" variant\="ghost" onClick\={() \=\> editor.chain().focus().unsetColor().run()}\>X\</Button\>  
          \</div\>  
        \</div\>  
        \<div\>  
          \<p className\="text-xs font-semibold mb-1"\>Highlight\</p\>  
          \<div className\="flex gap-1"\>  
            {highlights.map((color) \=\> (  
              \<button  
                key\={color}  
                onClick\={() \=\> editor.chain().focus().setHighlight({ color }).run()}  
                className={\`w-6 h-6 rounded-full border-2 ${editor.isActive('highlight', { color })? 'border-primary' : 'border-transparent'}\`}  
                style={{ backgroundColor: color }}  
              /\>  
            ))}  
            \<Button size\="icon" variant\="ghost" onClick\={() \=\> editor.chain().focus().unsetHighlight().run()}\>X\</Button\>  
          \</div\>  
        \</div\>  
      \</div\>  
    );  
};

export const EditorBubbleMenu: FC\<BubbleMenuComponentProps\> \= ({ editor }) \=\> {  
  return (  
    \<BubbleMenu  
      editor\={editor}  
      tippyOptions\={{ duration: 100 }}  
      shouldShow\={({ editor, view, state, from, to }) \=\> {  
        // Don't show for widgets or code blocks  
        const { selection } \= state;  
        const isWidgetSelected \= selection.empty && (editor.isActive('alert-widget') |

| editor.isActive('cta-widget'));  
        return from\!== to && editor.isEditable &&\!editor.isActive('codeBlock') &&\!isWidgetSelected;  
      }}  
    \>  
      \<Toolbar\>  
        \<ToolbarGroup\>  
          \<ToolbarButton onClick\={() \=\> editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}\>  
            \<Bold className\="h-4 w-4" /\>  
          \</ToolbarButton\>  
          \<ToolbarButton onClick\={() \=\> editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}\>  
            \<Italic className\="h-4 w-4" /\>  
          \</ToolbarButton\>  
          \<ToolbarButton onClick\={() \=\> editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')}\>  
            \<Underline className\="h-4 w-4" /\>  
          \</ToolbarButton\>  
          \<ToolbarButton onClick\={() \=\> editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')}\>  
            \<Strikethrough className\="h-4 w-4" /\>  
          \</ToolbarButton\>  
          \<ToolbarButton onClick\={() \=\> editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')}\>  
            \<Code className\="h-4 w-4" /\>  
          \</ToolbarButton\>  
        \</ToolbarGroup\>  
        \<ToolbarSeparator /\>  
        \<ToolbarGroup\>  
          \<Popover\>  
            \<PopoverTrigger asChild\>  
              \<ToolbarButton isActive\={editor.isActive('link')}\>  
                \<Link2 className\="h-4 w-4" /\>  
              \</ToolbarButton\>  
            \</PopoverTrigger\>  
            \<PopoverContent className\="w-auto p-0" side\="top" align\="start"\>  
              \<LinkEditor editor\={editor} /\>  
            \</PopoverContent\>  
          \</Popover\>  
          \<Popover\>  
            \<PopoverTrigger asChild\>  
              \<ToolbarButton isActive\={editor.isActive('textStyle') |

| editor.isActive('highlight')}\>  
                \<Palette className\="h-4 w-4" /\>  
              \</ToolbarButton\>  
            \</PopoverTrigger\>  
            \<PopoverContent className\="w-auto p-0" side\="top" align\="start"\>  
              \<ColorSelector editor\={editor} /\>  
            \</PopoverContent\>  
          \</Popover\>  
        \</ToolbarGroup\>  
        \<ToolbarSeparator /\>  
        \<ToolbarGroup\>  
          \<ToolbarButton onClick\={() \=\> editor.chain().focus().setAlertWidget().run()}\>  
            \<AlertTriangle className\="h-4 w-4" /\>  
          \</ToolbarButton\>  
          \<ToolbarButton onClick\={() \=\> editor.chain().focus().setCtaWidget().run()}\>  
            \<Megaphone className\="h-4 w-4" /\>  
          \</ToolbarButton\>  
        \</ToolbarGroup\>  
      \</Toolbar\>  
    \</BubbleMenu\>  
  );  
};

*Note: This assumes you have corresponding Toolbar components in your @nextblock-cms/ui library. If not, replace them with simple div elements with flexbox styling.*

#### **Step 5.2: Integrate the Bubble Menu into the Main Editor**

Modify libs/editor/src/lib/NotionEditor.tsx to render the EditorBubbleMenu component. The editor instance must be passed to it.

TypeScript

// libs/editor/src/lib/NotionEditor.tsx  
'use client';

import { useEditor, EditorContent } from '@tiptap/react';  
import React from 'react';  
import { editorExtensions } from './extensions';  
import { EditorBubbleMenu } from './components/menus/BubbleMenu'; // \<-- Import the new menu

interface NotionEditorProps {  
  content: string;  
  onChange: (content: string) \=\> void;  
}

export const NotionEditor: React.FC\<NotionEditorProps\> \= ({ content, onChange }) \=\> {  
  const editor \= useEditor({  
    extensions: editorExtensions,  
    content: content,  
    onUpdate: ({ editor }) \=\> {  
      onChange(editor.getHTML());  
    },  
    editorProps: {  
      attributes: {  
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-\[300px\]',  
      },  
    },  
  });

  return (  
    \<div className\="relative"\>  
      {editor && \<EditorBubbleMenu editor\={editor} /\>}  
      \<EditorContent editor\={editor} /\>  
    \</div\>  
  );  
};

export default NotionEditor;

### **Verification**

Run nx serve nextblock.

1. Navigate to the editor page.  
2. Type some text and select it. The bubble menu should appear above the selection.  
3. Test each button: Bold, Italic, Underline, Strike, and Code should apply the correct formatting.  
4. Test the Link popover: Select text, click the link icon, enter a URL, and click "Set Link." The text should become a link. Click the link again to edit or remove it.  
5. Test the Color popover: Select text and apply different text and highlight colors.  
6. Test the custom widget buttons: Clicking the Alert or CTA button should insert the respective widget into the document.

---

## **Prompt 6 of 8: Implementing the Powerful Slash Command System**

### **Your Persona**

You are an expert AI developer specializing in TypeScript, React, Next.js, and the Nx monorepo toolkit. You are adept at implementing complex, suggestion-based UI patterns that provide a fast and intuitive user experience, mirroring best-in-class applications like Notion and Slack.

### **Primary Objective**

Your goal is to implement a comprehensive slash command menu. This feature should be triggered when a user types / in the editor, presenting a filterable, keyboard-navigable list of commands in a popup. Each command, when selected, will insert a specific block-level element into the document, from basic headings and lists to complex tables and your custom widgets.

### **Project Context & Key Files**

This implementation relies heavily on the @tiptap/extension-suggestion utility. You will create several new files:

* **Create:** libs/editor/src/lib/extensions/slash-command.ts: The core logic for the suggestion utility.  
* **Create:** libs/editor/src/lib/components/menus/SlashCommandList.tsx: The React component that renders the list of commands.  
* **Modify:** libs/editor/src/lib/extensions/index.ts: To add the new slash command extension to the editor configuration.  
* **Modify:** libs/editor/src/lib/NotionEditor.tsx: To render the command list.

### **Detailed Step-by-Step Instructions**

#### **Step 6.1: Define the Slash Command Items and Logic**

Create a new file at libs/editor/src/lib/extensions/slash-command.ts. This file will contain the configuration for the suggestion utility, including the list of all available commands and the action each command performs.

TypeScript

// libs/editor/src/lib/extensions/slash-command.ts  
import { Editor, Extension, Range } from '@tiptap/core';  
import { ReactRenderer } from '@tiptap/react';  
import Suggestion, { SuggestionOptions } from '@tiptap/extension-suggestion';  
import {  
  Heading1, Heading2, Heading3, List, ListOrdered, TextQuote, Code, Image as ImageIcon, Table2, Minus, AlertTriangle, Megaphone  
} from 'lucide-react';  
import tippy, { Instance } from 'tippy.js';  
import { SlashCommandList, CommandListRef } from '../components/menus/SlashCommandList';

export interface CommandItemProps {  
  title: string;  
  description: string;  
  icon: React.ReactNode;  
  command: ({ editor, range }: { editor: Editor; range: Range }) \=\> void;  
}

const commandItems: CommandItemProps \=;

export const SlashCommand \= Extension.create({  
  name: 'slash-command',  
  addProseMirrorPlugins() {  
    return;

          return {  
            onStart: props \=\> {  
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
            onUpdate(props) {  
              component.updateProps(props);  
              popup.setProps({  
                getReferenceClientRect: props.clientRect,  
              });  
            },  
            onKeyDown(props) {  
              if (props.event.key \=== 'Escape') {  
                popup.hide();  
                return true;  
              }  
              return component.ref?.onKeyDown(props) |

| false;  
            },  
            onExit() {  
              popup.destroy();  
              component.destroy();  
            },  
          };  
        },  
      } as SuggestionOptions),  
    \];  
  },  
});

#### **Step 6.2: Create the Slash Command List Component**

Create the React component that will render the suggestions at libs/editor/src/lib/components/menus/SlashCommandList.tsx. This component must be keyboard-navigable.

TypeScript

// libs/editor/src/lib/components/menus/SlashCommandList.tsx  
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';  
import { CommandItemProps } from '../../extensions/slash-command';  
import { cn } from '@nextblock-cms/utils'; // Assuming you have a cn utility

interface SlashCommandListProps {  
  items: CommandItemProps;  
  command: (item: CommandItemProps) \=\> void;  
}

export interface CommandListRef {  
  onKeyDown: ({ event }: { event: React.KeyboardEvent }) \=\> boolean;  
}

export const SlashCommandList \= forwardRef\<CommandListRef, SlashCommandListProps\>((props, ref) \=\> {  
  const \= useState(0);

  const selectItem \= (index: number) \=\> {  
    const item \= props.items\[index\];  
    if (item) {  
      props.command(item);  
    }  
  };

  useEffect(() \=\> setSelectedIndex(0), \[props.items\]);

  useImperativeHandle(ref, () \=\> ({  
    onKeyDown: ({ event }) \=\> {  
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
    \<div className\="z-50 w-72 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"\>  
      {props.items.length \> 0? (  
        props.items.map((item, index) \=\> (  
          \<button  
            key\={index}  
            className\={cn(  
              'flex w-full items-center space-x-2 rounded-sm p-2 text-left text-sm',  
              index \=== selectedIndex? 'bg-accent text-accent-foreground' : ''  
            )}  
            onClick\={() \=\> selectItem(index)}  
          \>  
            \<div className\="flex h-10 w-10 items-center justify-center rounded-md border bg-background"\>  
              {item.icon}  
            \</div\>  
            \<div\>  
              \<p className\="font-medium"\>{item.title}\</p\>  
              \<p className\="text-xs text-muted-foreground"\>{item.description}\</p\>  
            \</div\>  
          \</button\>  
        ))  
      ) : (  
        \<div className\="p-2 text-sm text-muted-foreground"\>No results\</div\>  
      )}  
    \</div\>  
  );  
});

SlashCommandList.displayName \= 'SlashCommandList';

#### **Step 6.3: Add the Slash Command Extension to the Editor**

Finally, import and add the SlashCommand extension to the main configuration file libs/editor/src/lib/extensions/index.ts.

TypeScript

// Add to imports at the top of libs/editor/src/lib/extensions/index.ts  
import { SlashCommand } from './slash-command';

// Add to the editorExtensions array  
//... inside the array  
  SlashCommand,  
//...

### **Verification**

Run nx serve nextblock.

1. In the editor, on a new line, type /. The command popover should appear.  
2. Type a few letters (e.g., /h) to see the list filter in real-time.  
3. Use the arrow keys (Up/Down) to navigate the list. The selected item should be highlighted.  
4. Press Enter or click on an item (e.g., "Heading 1"). The /h1 text should be replaced with an actual H1 block.  
5. Test inserting various elements: lists, blockquotes, tables, and your custom Alert and CTA widgets.

---

## **Prompt 7 of 8: Implementing the Floating Menu and Final Editor Assembly**

### **Your Persona**

You are an expert AI developer specializing in TypeScript, React, Next.js, and the Nx monorepo toolkit. You have a meticulous approach to UI/UX development, ensuring that all user-facing features are polished, intuitive, and provide a cohesive experience.

### **Primary Objective**

Your goal is to complete the editor's core UI by implementing a Floating Menu. This menu, represented by a \+ icon, should appear next to empty lines, offering users a quick way to insert new block-level content. You will also assemble all the menu components within the main NotionEditor.tsx file, creating the final, complete editor structure.

### **Project Context & Key Files**

This prompt involves creating a new menu component and finalizing the main editor component.

* **Create:** libs/editor/src/lib/components/menus/FloatingMenu.tsx  
* **Modify:** libs/editor/src/lib/NotionEditor.tsx to integrate the new FloatingMenu and structure the final layout.

### **Detailed Step-by-Step Instructions**

#### **Step 7.1: Create the Floating Menu Component**

Create a new file at libs/editor/src/lib/components/menus/FloatingMenu.tsx. This component will use Tiptap's FloatingMenu extension to render a button that, when clicked, opens a popover with a list of common block-insertion commands. This provides an alternative to the slash command for discoverability.

TypeScript

// libs/editor/src/lib/components/menus/FloatingMenu.tsx  
'use client';

import { FloatingMenu, Editor } from '@tiptap/react';  
import {  
  Heading1, Heading2, List, ListOrdered, TextQuote, Code, ImageIcon, Table2, Minus  
} from 'lucide-react';  
import { FC } from 'react';  
import { Popover, PopoverContent, PopoverTrigger } from '@nextblock-cms/ui/popover';  
import { Button } from '@nextblock-cms/ui/button';

interface FloatingMenuComponentProps {  
  editor: Editor;  
}

const menuItems \=;

export const EditorFloatingMenu: FC\<FloatingMenuComponentProps\> \= ({ editor }) \=\> {  
  const runCommand \= (command: () \=\> boolean) \=\> {  
    command();  
  };

  return (  
    \<FloatingMenu  
      editor\={editor}  
      shouldShow\={({ state }) \=\> {  
        const { $from } \= state.selection;  
        const isRootNode \= $from.depth \=== 1;  
        const isEmpty \= $from.parent.nodeSize \<= 2;  
        return isRootNode && isEmpty && editor.isEditable;  
      }}  
      tippyOptions={{  
        duration: 100,  
        placement: 'left-start',  
        offset: ,  
      }}  
    \>  
      \<Popover\>  
        \<PopoverTrigger asChild\>  
          \<Button variant\="ghost" size\="icon" className\="rounded-full h-8 w-8"\>  
            \+  
          \</Button\>  
        \</PopoverTrigger\>  
        \<PopoverContent className\="w-48 p-1"\>  
          \<div className\="flex flex-col"\>  
            {menuItems.map((item) \=\> (  
              \<Button  
                key\={item.title}  
                variant\="ghost"  
                className\="justify-start"  
                onClick\={() \=\> runCommand(item.command)}  
              \>  
                {item.icon}  
                \<span className\="ml-2"\>{item.title}\</span\>  
              \</Button\>  
            ))}  
          \</div\>  
        \</PopoverContent\>  
      \</Popover\>  
    \</FloatingMenu\>  
  );  
};

#### **Step 7.2: Finalize the Main Editor Component**

Now, assemble all the UI pieces in libs/editor/src/lib/NotionEditor.tsx. This includes the Bubble Menu, the new Floating Menu, and a CharacterCount display.

Modify libs/editor/src/lib/NotionEditor.tsx to its final form:

TypeScript

// libs/editor/src/lib/NotionEditor.tsx  
'use client';

import { useEditor, EditorContent, FloatingMenu, BubbleMenu } from '@tiptap/react';  
import React from 'react';  
import { editorExtensions } from './extensions';  
import { EditorBubbleMenu } from './components/menus/BubbleMenu';  
import { EditorFloatingMenu } from './components/menus/FloatingMenu';  
import CharacterCount from '@tiptap/extension-character-count';

interface NotionEditorProps {  
  content: string;  
  onChange: (content: string) \=\> void;  
}

export const NotionEditor: React.FC\<NotionEditorProps\> \= ({ content, onChange }) \=\> {  
  const editor \= useEditor({  
    extensions: \[...editorExtensions, CharacterCount\], // Add CharacterCount here if not already global  
    content: content,  
    onUpdate: ({ editor }) \=\> {  
      onChange(editor.getHTML());  
    },  
    editorProps: {  
      attributes: {  
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none p-4 min-h-\[500px\] w-full',  
      },  
    },  
  });

  if (\!editor) {  
    return null;  
  }

  return (  
    \<div className\="relative w-full rounded-lg border bg-background shadow-sm"\>  
      \<EditorBubbleMenu editor\={editor} /\>  
      \<EditorFloatingMenu editor\={editor} /\>  
      \<EditorContent editor\={editor} /\>  
      \<div className\="absolute bottom-2 right-2 text-xs text-muted-foreground"\>  
        {editor.storage.characterCount.characters()} characters / {editor.storage.characterCount.words()} words  
      \</div\>  
    \</div\>  
  );  
};

export default NotionEditor;

### **Verification**

Run nx serve nextblock.

1. Hover your cursor over an empty line in the editor. A \+ button should appear to the left.  
2. Click the \+ button. A popover menu with block insertion options should appear.  
3. Test inserting a few items from this menu to confirm it works.  
4. Verify that the Bubble Menu and Slash Commands still function as expected.  
5. Verify that the character and word count is displayed at the bottom right of the editor and updates as you type. The editor component is now feature-complete.

---

## **Prompt 8 of 8: Final Integration, Cleanup, and Verification**

### **Your Persona**

You are an expert AI developer specializing in TypeScript, React, Next.js, and the Nx monorepo toolkit. You are a meticulous finisher, ensuring that any refactoring project concludes with a clean, maintainable, and fully verified codebase, leaving no trace of legacy code behind.

### **Primary Objective**

Your goal is to complete the editor refactoring project by performing three final critical tasks:

1. **Integrate** the new @nextblock-cms/editor library into the main nextblock application, replacing the old editor.  
2. **Cleanup** the project by systematically deleting all old, now-redundant editor-related files and directories from the apps/nextblock codebase.  
3. **Verify** the entire system through linting and live testing to confirm that the new editor is functioning perfectly in its production environment.

### **Project Context & Key Files**

This prompt involves modifying files within the apps/nextblock application to consume the new library, followed by the deletion of old files from apps/nextblock/app/cms/blocks/components/.

### **Detailed Step-by-Step Instructions**

#### **Step 8.1: Export from the Library**

Ensure the main NotionEditor component and any related types are properly exported from the library's entry point.

Verify that libs/editor/src/index.ts contains the following export:

TypeScript

// libs/editor/src/index.ts  
export \* from './lib/NotionEditor';

#### **Step 8.2: Integrate the New Editor into the Application**

Navigate to the file(s) within the apps/nextblock application that currently use the old RichTextEditor.tsx. This is likely a component within the CMS that renders a form field.

1. **Remove Old Imports**: Delete any import statements related to the old RichTextEditor and MenuBar.  
2. **Import the New Editor**: Add the following import statement to bring in the newly created library component. This demonstrates the success of the monorepo architecture.1  
   TypeScript  
   import { NotionEditor } from '@nextblock-cms/editor';

3. **Replace the Component**: In the JSX, replace the usage of \<RichTextEditor... /\> with \<NotionEditor... /\>.  
4. **Wire up Props**: Ensure you pass the necessary props. The NotionEditor component expects content (the HTML string to display) and an onChange handler (a function that receives the updated HTML string). This will likely involve connecting to your form state management logic (e.g., React Hook Form, Zustand, etc.).

**Example of what the final integration might look like in a parent component:**

TypeScript

// Example file in: apps/nextblock/app/cms/some-page-editor.tsx

'use client';

import { useState } from 'react';  
import { NotionEditor } from '@nextblock-cms/editor';  
import { Button } from '@nextblock-cms/ui';

const PageEditor \= () \=\> {  
  // Example state management  
  const \[editorContent, setEditorContent\] \= useState('\<p\>Hello World\!\</p\>');

  const handleSave \= () \=\> {  
    console.log('Saving content:', editorContent);  
    // Add logic to save to your database  
  };

  return (  
    \<div className\="p-8"\>  
      \<h1 className\="text-2xl font-bold mb-4"\>Edit Your Page\</h1\>  
      \<NotionEditor  
        content\={editorContent}  
        onChange\={(newContent) \=\> {  
          setEditorContent(newContent);  
        }}  
      /\>  
      \<div className\="mt-4"\>  
        \<Button onClick\={handleSave}\>Save Content\</Button\>  
      \</div\>  
    \</div\>  
  );  
};

export default PageEditor;

#### **Step 8.3: Aggressive Code Sanitation and Final Cleanup**

A refactor is only complete when the old code is removed. Deleting the legacy files prevents technical debt and confusion.1 Once you have confirmed the new editor is working correctly in the application (after completing Step 8.2), proceed with the following deletions:

1. **Delete the entire old extensions directory**:  
   * rm \-rf apps/nextblock/app/cms/blocks/components/tiptap-extensions/  
2. **Delete the old editor components**:  
   * rm apps/nextblock/app/cms/blocks/components/RichTextEditor.tsx  
   * rm apps/nextblock/app/cms/blocks/components/MenuBar.tsx

#### **Step 8.4: Full System Verification**

Perform a final series of checks to ensure the project is in a clean, stable, and functional state.

1. **Run Linters**: Execute the following commands from the monorepo root to check for code quality and adherence to project rules.  
   Bash  
   nx lint editor  
   nx lint nextblock

   Fix any errors that arise.  
2. **Run the Application**: Start the development server.  
   Bash  
   nx serve nextblock

3. **Conduct Full User Acceptance Testing (UAT)**:  
   * Open the application in your browser and navigate to the editor.  
   * Systematically test **every single feature** that was implemented.  
   * **Marks**: Bold, Italic, Underline, Strike, Code, Highlight (multicolor), Sub/Superscript, Link, Text Color.  
   * **Nodes**: Headings, Lists (all types, including nested tasks), Blockquotes, Code Blocks (with syntax highlighting), Horizontal Rules, Images, Tables (including column resizing).  
   * **Custom Widgets**: Insert and interact with the Alert and CTA widgets.  
   * **Menus**:  
     * Confirm the **Bubble Menu** appears on selection and all its buttons work.  
     * Confirm the **Slash Command** menu appears on /, is filterable, keyboard navigable, and correctly inserts all node types.  
     * Confirm the **Floating Menu** appears on empty lines and its buttons work.  
   * **Functionality**: Test undo/redo, placeholder text, and character count.

### **Final Deliverable**

Upon successful completion of all verification steps, the refactoring is complete. The project now contains a powerful, reusable, and feature-complete Notion-style editor library, built and integrated according to the highest architectural standards of the monorepo.

#### **Works cited**

1. Monorepo, Open Source, and Monetization  
2. Get started | Tiptap Editor Docs, accessed July 29, 2025, [https://tiptap.dev/docs/editor/getting-started/overview](https://tiptap.dev/docs/editor/getting-started/overview)  
3. Extensions | Tiptap Editor Docs, accessed July 29, 2025, [https://tiptap.dev/docs/editor/extensions/overview](https://tiptap.dev/docs/editor/extensions/overview)  
4. Functionality extensions | Tiptap Editor Docs, accessed July 29, 2025, [https://tiptap.dev/docs/editor/extensions/functionality](https://tiptap.dev/docs/editor/extensions/functionality)  
5. @tiptap/extension-table \- npm, accessed July 29, 2025, [https://www.npmjs.com/package/@tiptap/extension-table](https://www.npmjs.com/package/@tiptap/extension-table)  
6. @tiptap/extension-task-list \- npm, accessed July 29, 2025, [https://www.npmjs.com/package/@tiptap/extension-task-list](https://www.npmjs.com/package/@tiptap/extension-task-list)  
7. Highlight extension | Tiptap Editor Docs, accessed July 29, 2025, [https://tiptap.dev/docs/editor/extensions/marks/highlight](https://tiptap.dev/docs/editor/extensions/marks/highlight)  
8. Color extension | Tiptap Editor Docs, accessed July 29, 2025, [https://tiptap.dev/docs/editor/extensions/functionality/color](https://tiptap.dev/docs/editor/extensions/functionality/color)  
9. @tiptap/extension-character-count \- npm, accessed July 29, 2025, [https://www.npmjs.com/package/@tiptap/extension-character-count](https://www.npmjs.com/package/@tiptap/extension-character-count)  
10. @tiptap/extension-typography \- npm, accessed July 29, 2025, [https://www.npmjs.com/package/@tiptap/extension-typography](https://www.npmjs.com/package/@tiptap/extension-typography)  
11. TaskItem extension | Tiptap Editor Docs, accessed July 29, 2025, [https://tiptap.dev/docs/editor/extensions/nodes/task-item](https://tiptap.dev/docs/editor/extensions/nodes/task-item)  
12. @tiptap/extension-table \- npm, accessed July 29, 2025, [https://www.npmjs.com/package/@tiptap/extension-table?activeTab=code](https://www.npmjs.com/package/@tiptap/extension-table?activeTab=code)  
13. Text align button \- UI Components \- Tiptap, accessed July 29, 2025, [https://tiptap.dev/docs/ui-components/components/text-align-button](https://tiptap.dev/docs/ui-components/components/text-align-button)