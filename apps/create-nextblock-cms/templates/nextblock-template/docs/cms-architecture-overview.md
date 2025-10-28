# CMS Block Editor: Architecture Overview

This document provides a comprehensive overview of the block-based content editor's architecture, serving as a technical reference for development.

## 1. Core Concepts

### Database Schema
The entire system is powered by a single `blocks` table in Supabase. The key field is `content` (a `JSONB` type), which stores a flexible JSON object containing all data for a specific block. This approach allows for adding new block types and modifying existing ones without requiring database schema migrations.

### Block Registry
The file [`lib/blocks/blockRegistry.ts`](/lib/blocks/blockRegistry.ts) is the **single source of truth** for all block types. It's a central configuration object that maps a block's `block_type` string to its:
-   User-facing `label`.
-   `initialContent` structure.
-   The filename of its corresponding `editorComponent` and `rendererComponent`.

Any new block must be defined here first.

## 2. Key Architectural Patterns

### Editor/Renderer Split
The architecture maintains a strict separation between the editing interface and the final public-facing output.
-   **Editors** (`app/cms/blocks/editors/*.tsx`): React components that render the forms and controls for modifying a block's `content`.
-   **Renderers** (`components/blocks/renderers/*.tsx`): React components that take a block's `content` and render the final, styled HTML for the public website.

### Optimistic UI & Debounced Saves
To provide a fast and smooth user experience, the editor uses an optimistic UI pattern.
-   All state is centralized in [`app/cms/blocks/components/BlockEditorArea.tsx`](/app/cms/blocks/components/BlockEditorArea.tsx) and managed with React's `useOptimistic` hook.
-   When a user makes a change, the UI updates instantly.
-   The actual save operation is handled by a debounced call to the `updateBlock` server action in [`app/cms/blocks/actions.ts`](/app/cms/blocks/actions.ts).
-   Crucially, `updateBlock` **does not** call `revalidatePath`, preventing disruptive page reloads during editing sessions.

## 3. Component Breakdown & Data Flow

The editor is a hierarchy of components, each with a specific responsibility.

#### `BlockEditorArea.tsx`
-   **Location:** [`app/cms/blocks/components/BlockEditorArea.tsx`](/app/cms/blocks/components/BlockEditorArea.tsx)
-   **Role:** The root component for the editor. It fetches the initial blocks, manages the master `blocks` state (including the optimistic state), and provides the main `DndContext` for top-level drag-and-drop functionality.

#### `SortableBlockItem.tsx`
-   **Location:** [`app/cms/blocks/components/SortableBlockItem.tsx`](/app/cms/blocks/components/SortableBlockItem.tsx)
-   **Role:** A wrapper for each individual block that provides the `useSortable` context from `dnd-kit`, making each block draggable. It passes `dragHandleProps` down to its child.

#### `EditableBlock.tsx`
-   **Location:** [`app/cms/blocks/components/EditableBlock.tsx`](/app/cms/blocks/components/EditableBlock.tsx)
-   **Role:** The primary controller for a single block. It renders the block's header, including the drag handle and edit/delete buttons.
-   **Core Logic:** This component contains the critical conditional logic for the editing experience:
    -   If the `block.block_type` is `section` or `hero`, clicking the edit icon toggles an `isConfigPanelOpen` state, which shows/hides the inline configuration panel.
    -   For **all other block types**, clicking the edit icon lazy-loads the appropriate editor component and opens the `BlockEditorModal`.

#### `BlockEditorModal.tsx`
-   **Location:** [`app/cms/blocks/components/BlockEditorModal.tsx`](/app/cms/blocks/components/BlockEditorModal.tsx)
-   **Role:** A reusable modal dialog for editing standard blocks.
-   **Functionality:** It receives a lazy-loaded editor component and wraps it in `<React.Suspense>`, showing a loading state *inside* the modal. It manages a temporary state for the block's content and calls the `onContentChange` callback on save. For the Rich Text block, it is styled to be extra tall (`h-[90vh]`).

---

### Section & Column Components

The "Section" block type enables complex multi-column layouts.

#### `SectionBlockEditor.tsx`
-   **Location:** [`app/cms/blocks/editors/SectionBlockEditor.tsx`](/app/cms/blocks/editors/SectionBlockEditor.tsx)
-   **Role:** The editor for the `section` block. It conditionally renders the `SectionConfigPanel` based on the `isConfigPanelOpen` prop and contains the `ColumnEditor`s.

#### `SectionConfigPanel.tsx` & `BackgroundSelector.tsx`
-   **Location:** [`app/cms/blocks/components/SectionConfigPanel.tsx`](/app/cms/blocks/components/SectionConfigPanel.tsx), [`app/cms/blocks/components/BackgroundSelector.tsx`](/app/cms/blocks/components/BackgroundSelector.tsx)
-   **Role:** These components render the forms for section-level settings (layout, columns, background).
-   **UI Pattern:** The custom inputs (`Minimum Height`, `Image Position`, etc.) use a "disabled save button" pattern. The save icon is disabled by default and only becomes active and green when the user has made a change.

#### `ColumnEditor.tsx`
-   **Location:** [`app/cms/blocks/components/ColumnEditor.tsx`](/app/cms/blocks/components/ColumnEditor.tsx)
-   **Role:** Manages the content *within a single column* of a section. It has its own `DndContext` for nested drag-and-drop and uses the same `BlockEditorModal` to edit the blocks it contains.