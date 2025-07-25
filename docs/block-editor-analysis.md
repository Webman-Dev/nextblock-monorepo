# Technical Brief: NextBlock CMS Block Editor Analysis

This document provides a technical analysis of the existing block editor and layout system in the NextBlock CMS. The goal is to understand the current architecture to inform the future implementation of inline widgets and other UX improvements.

## 1. The Block Layout System

The layout system is foundational and built around the concept of "Section" blocks that act as containers for columns, which in turn hold all other block types. This is not a flat block structure; it's a hierarchical one.

### Block Definition and Registration

- **Single Source of Truth:** The entire system is defined in [`apps/nextblock/lib/blocks/blockRegistry.ts`](apps/nextblock/lib/blocks/blockRegistry.ts). This file is the central registry for all block types.
- **`blockRegistry` Object:** This exported constant contains the definition for every block. Each `BlockDefinition` includes:
    - `type`: A unique string identifier (e.g., "section", "text").
    - `label`: A user-friendly name.
    - `initialContent`: The default JSON structure for a new block of this type.
    - `editorComponentFilename`: The filename of the React component used to edit the block's content.
    - `rendererComponentFilename`: The filename of the React component used to render the block on the live site.
- **Content Interfaces:** For each block type, a corresponding TypeScript interface (e.g., `TextBlockContent`, `SectionBlockContent`) defines the shape of its data. This provides type safety and documents the data structure.

### How Layouts are Built

- **`SectionBlockContent`:** The core of the layout system is the `SectionBlockContent` interface. Its most important property is `column_blocks`, which is a 2D array (`Array<Array<Block>>`).
    - The outer array represents the columns in the section.
    - The inner array represents the stack of blocks within a specific column.
- **Hierarchical Structure:** This structure means a page's content is a list of top-level blocks. If a `section` block is used, it contains its own nested list of blocks organized into columns.

### Data Storage

- Block content is stored as a `JSONB` field in the `blocks` table of the database. The structure of this JSON directly matches the TypeScript interfaces defined in the `blockRegistry`.

## 2. The Tiptap Integration

The Tiptap editor is used exclusively for rich-text editing *within* specific blocks, primarily the "Rich Text Block". It is not used for the overall page layout.

- **`TextBlockEditor.tsx`:** This editor component is a simple wrapper around a custom component, `RoleAwareRichTextEditor`. It passes the `html_content` from the block's data to the Tiptap editor and uses an `onChange` handler to save the updated HTML string back to the block's state.
- **Custom Tiptap Extensions:** The editor's functionality is enhanced with several custom extensions found in `apps/nextblock/app/cms/blocks/components/tiptap-extensions/`:
    - **`DivNode.ts` & `PreserveAllAttributesExtension.ts`:** These work together to ensure that when complex HTML is pasted into the editor, structural tags (like `<div>`) and their attributes (`class`, `style`, `id`, `data-*`) are preserved. This is crucial for maintaining layout and styling from external sources.
    - **`StyleTagNode.ts`:** Allows the editor to recognize and preserve `<style>` blocks, preventing them from being stripped out. It cleverly renders a placeholder in the editor for better UX.
    - **`FontSizeMark.ts`:** A simple "mark" extension that allows applying font size classes to selected text.

## 3. Data Flow

The data flow from the database to the final rendered page is logical and follows modern React/Next.js patterns.

```mermaid
graph TD
    A[Database: `pages` and `blocks` tables] -->|1. Fetch Data| B[Edit Page: `getPageDataWithBlocks`]
    B -->|2. Pass to Editor| C[BlockEditorArea]
    C -->|3. Render Block Editors| D[SectionBlockEditor / TextBlockEditor etc.]
    D -->|4. User Edits| E{State Update via onChange}
    E -->|5. Save to DB| F[Server Action: `updatePage`]
    A -->|6. Fetch for Render| G[Live Page: `[slug]/page.tsx`]
    G -->|7. Pass to Renderers| H[SectionBlockRenderer]
    H -->|8. Render Nested Blocks| I[DynamicNestedBlockRenderer]
    I -->|9. Load Specific Renderer| J[TextBlockRenderer etc.]
    J -->|10. Render Final HTML| K[Browser View]
```

1.  **Data Fetching (Edit):** When a user edits a page, the `getPageDataWithBlocks` function in `apps/nextblock/app/cms/pages/[id]/edit/page.tsx` queries the database, fetching the page and its associated blocks (with their `JSONB` content).
2.  **Editor UI:** The fetched block data is passed to the `BlockEditorArea` component. This component maps over the blocks and dynamically renders the correct editor component for each one (e.g., `SectionBlockEditor`, `TextBlockEditor`) based on the `editorComponentFilename` in the `blockRegistry`.
3.  **Editing:** As the user interacts with an editor (e.g., typing in a `TextBlockEditor`), the component's state is updated.
4.  **State Management:** Changes are propagated up via `onChange` handlers, ultimately updating the state of the entire page's block structure within the `BlockEditorArea`.
5.  **Saving:** When the user saves, a server action (`updatePage`) is called, which takes the updated block data and saves it back to the `JSONB` field in the database.
6.  **Rendering (Live Site):** For a live page view, the process is similar. Data is fetched from the database.
7.  **Dynamic Rendering:** The `SectionBlockRenderer` (and other top-level renderers) iterates through the block data. The key component is `DynamicNestedBlockRenderer`, which uses Next.js's `dynamic` import feature to lazy-load the correct renderer for each block based on the `rendererComponentFilename` from the registry.
8.  **Final HTML:** The renderer components take the `content` from the JSON and output the final HTML. For a `TextBlockRenderer`, this involves using `dangerouslySetInnerHTML` to render the stored HTML.

## 4. Key Files & Components

-   **`apps/nextblock/lib/blocks/blockRegistry.ts`**: The central configuration and single source of truth for all block types.
-   **`apps/nextblock/app/cms/blocks/editors/`**: Contains the React components for *editing* each block type.
    -   `SectionBlockEditor.tsx`: Manages the layout of columns and the blocks within them. Uses `dnd-kit` for drag-and-drop functionality.
    -   `TextBlockEditor.tsx`: A wrapper that hosts the Tiptap rich-text editor.
-   **`apps/nextblock/components/blocks/renderers/`**: Contains the React components for *displaying* the final output of each block on the live website.
    -   `SectionBlockRenderer.tsx`: Renders the section and its columns, and dynamically renders the nested blocks.
    -   `TextBlockRenderer.tsx`: Renders the sanitized HTML from a text block.
-   **`apps/nextblock/app/cms/blocks/components/tiptap-extensions/`**: Custom extensions to enhance the Tiptap editor with features like preserving attributes and handling custom tags.
-   **`apps/nextblock/app/cms/pages/[id]/edit/page.tsx`**: The main page editing UI. It fetches data and renders the `BlockEditorArea`, which orchestrates the entire block editing experience.
-   **`apps/nextblock/app/cms/blocks/components/BlockEditorArea.tsx`**: The top-level component on the edit page that manages the state of all blocks, handles adding/deleting/reordering, and renders the individual block editors.

## 5. Integration Points & UX Improvements

### Inline Content Widgets

The most robust method for adding new inline widgets (e.g., an inline "call to action" or a product embed) is by creating a **custom Tiptap Node Extension**.

1.  **Create a New Node:** Add a new file in the `tiptap-extensions` directory.
2.  **Define Schema:** Define the node's name, attributes, and parsing rules.
3.  **Create a Node View:** Use a React Node View to render the widget's UI *inside* the editor. This provides a much better user experience than a simple placeholder.
4.  **Add Toolbar Button:** Add a button to the Tiptap toolbar (within `RoleAwareRichTextEditor`) to trigger a command that inserts the new node.

### UX/UI Improvements

-   **Block Selection:** The current method for adding new blocks could be improved. A modal or pop-over (`BlockSelector`) with a searchable list of available blocks, including icons and descriptions from the `blockRegistry`, would be more user-friendly. This would likely be integrated into `BlockEditorArea.tsx`.
-   **Section Configuration:** The `SectionConfigPanel.tsx` could be enhanced with more visual controls, such as sliders for padding/gaps and a visual representation of the column layout.
-   **Inline Editing for Simple Content:** For blocks with very simple content (like the `HeadingBlock`), consider implementing direct inline editing on the block preview itself, rather than opening a modal for every small change.