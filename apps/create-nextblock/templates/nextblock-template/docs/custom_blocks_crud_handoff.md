# NextBlock CMS - Custom Block CRUD & Layout Engine Handoff Prompt

This document serves as the comprehensive handoff specification and system prompt for the next engineering agent. It contains a detailed recap of everything implemented so far, the resolved database relations, language filtering, virtual image mapping, and a structured roadmap of future enhancements to make this Custom Block CRUD the best UI/UX experience.

---

## Agent Handoff Context & Prompt

**Role**: Principal Full-Stack Engineer and UX/UI Specialist  
**Objective**: Resume work on the Custom Block CRUD, Layout Engine, and Cortex AI Widget integration in the NextBlock CMS repository.

---

### Part 1: Recap of Completed Work

We have successfully implemented and verified the foundational custom block creator database, API, picker, editor, and playground architecture across the following milestones:

#### 1. Database Schema & Migration Primitives
- **Schema & Migration**: Created table `custom_block_definitions` (see migration file `00000000000023_setup_custom_block_definitions.sql`) containing:
  - `id` (UUID)
  - `slug` (text, unique)
  - `name` (text)
  - `description` (text, nullable)
  - `fields` (JSONB - Zod validated array of fields declarations)
  - `layout_schema` (JSONB - Zod validated layout tree)
  - `is_original` (boolean, defaults to `false`)
- **Duplication Action**: Implemented a deep copy helper function/service action that duplicates any custom block definition, appends `_copy` to the slug, resets `is_original = false`, and saves it.
- **Zod Schema Boundaries**: Coded validation schemas under [custom-blocks.ts](file:///d:/Websites/nextblock-sandbox/schemas/custom-blocks.ts) to enforce type validation for core field structures: `text`, `rich-text`, `image_r2`, and `db_relation`.

#### 2. Relations, Picker UI, and Language Filtering
- **Dynamic Relational Picker (`DBRelationSelect.tsx`)**: Upgraded the selector from a simple ID input to a production-grade relational combobox dropdown picker component.
  - **Inline Thumbnails**: Shows a media thumbnail preview on the left of each option and inside the selected item badges.
  - **Language Filtering**: Dynamically fetches active system languages on mount. Renders a language filter dropdown select next to the search input to filter target records by language (available for `pages`, `posts`, `products`, `product_variants`).
  - **Joined Inner Filters**: Performs strict inner joins (`products!inner(...)`) via PostgREST to filter parent tables correctly when querying children variants.
- **Relational Resolvers (`custom-block-relations.ts` & `resolve-block-relations.ts`)**:
  - **Fallback Image Resolution**: Automatically resolves parent product's primary media when a digital product or a product without variants has no custom variant image, showing correct thumbnails.
  - **Friendly Display Labels**: Converts raw UUID labels in option selections to human-readable strings, such as `Product Name (SKU)` for variations.
  - **Robust Join Handling**: Gracefully normalizes foreign relations returned from PostgREST as either a single object or an array of objects to prevent runtime crashes.
  - **Virtual Image Columns**: Exposes `main_image` and `object_key` as virtual columns for the `products` table, allowing them to be configured in Custom Block Display Column selectors without triggering PostgREST syntax errors.

#### 3. Interactive Mock Playground
- **Full Custom Picker Integration**: Updated the "Mock Values Playground" in [BlockComposer.tsx](file:///d:/Websites/nextblock-sandbox/apps/nextblock/app/cms/custom-blocks/components/BlockComposer.tsx) to render the native `ImageR2Picker` and `DBRelationSelect` components instead of generic text inputs. Users can upload test images, search database relations, filter by language, and verify block render output interactively.
- **UX Rebranding & Category Organization**:
  - Changed block action label from "Copy" to "Duplicate".
  - Created a new "Custom" block category inside block registry menus, allowing users to select and instantiate custom blocks.

---

### Part 2: File Guide

Key files to read before continuing:
- **Registry & Relational APIs**:
  - [custom-block-relation-registry.ts](file:///d:/Websites/nextblock-sandbox/apps/nextblock/lib/custom-block-relation-registry.ts) — Relational schema registry.
  - [custom-block-relations.ts](file:///d:/Websites/nextblock-sandbox/apps/nextblock/lib/custom-block-relations.ts) — Supabase PostgREST search queries and row mapping logic.
  - [resolve-block-relations.ts](file:///d:/Websites/nextblock-sandbox/apps/nextblock/lib/resolve-block-relations.ts) — Backend relationship hydration before RSC renders blocks.
- **UI Components**:
  - [BlockComposer.tsx](file:///d:/Websites/nextblock-sandbox/apps/nextblock/app/cms/custom-blocks/components/BlockComposer.tsx) — Main composer for creating/editing block schemas and layout trees.
  - [DBRelationSelect.tsx](file:///d:/Websites/nextblock-sandbox/apps/nextblock/app/cms/custom-blocks/components/DBRelationSelect.tsx) — Relational picker dropdown select.
  - [DynamicLayoutEngine.tsx](file:///d:/Websites/nextblock-sandbox/components/renderers/DynamicLayoutEngine.tsx) — RSC dynamic template layout compiler.
- **Test Specs**:
  - [custom-block-relations.test.ts](file:///d:/Websites/nextblock-sandbox/apps/nextblock/lib/custom-block-relations.test.ts) — Unit tests for PostgREST mappings and relation formats.

---

### Part 3: Future UX/UI Roadmap (What to do Next)

To make this Custom Block CRUD dashboard the best UI/UX experience, implement the following enhancements:

#### 1. Visual Drag-and-Drop Layout Editor
- **Goal**: Allow users to visually reorder and nest items in the block's `layout_schema` tree instead of editing the raw JSON or using basic list buttons.
- **Action**: Implement a visual hierarchy list using `@dnd-kit/core` and `@dnd-kit/sortable` inside [BlockComposer.tsx](file:///d:/Websites/nextblock-sandbox/apps/nextblock/app/cms/custom-blocks/components/BlockComposer.tsx). Render the layout tree as node boxes that can be dragged, nested, and collapsed.

#### 2. Live Interactive Preview Sidebar
- **Goal**: See block rendering updates instantly side-by-side with layout/field edits.
- **Action**: Render the block's live UI dynamically using [DynamicLayoutEngine.tsx](file:///d:/Websites/nextblock-sandbox/components/renderers/DynamicLayoutEngine.tsx) inside a split pane. Bind changes to fields or preview values directly so the output refreshes instantly.

#### 3. Tailwind CSS Visual Class Helper
- **Goal**: Make styling container elements easy for non-developers.
- **Action**: Instead of requiring users to type raw Tailwind utility classes (e.g., `flex flex-col gap-4 items-center justify-between p-6 bg-slate-500 rounded-xl`), build a style config panel. Provide friendly knobs for:
  - **Layout**: Flex vs Grid vs Block
  - **Padding/Margin**: Sliders mapping to Tailwind tokens (`p-1` through `p-12`)
  - **Typography**: Alignment, text sizes, weights, and color picker grids
  - **Borders & Corners**: Border widths, rounded corners, border colors
  - **Background & Effects**: Color grids, opacity, shadows

#### 4. Preset Layout Library Templates
- **Goal**: Speed up the block creation process.
- **Action**: Create a library of pre-configured block presets (e.g. Testimonial Card, Feature Grid, Product Showcase, Hero banner). When creating a block, let users start from one of these presets, pre-populating fields and layouts.

#### 5. Interactive Cortex AI Prompt Sidebar
- **Goal**: Allow Cortex AI to generate blocks based on text prompts directly inside the dashboard.
- **Action**: Add an input text box inside the sidebar "Generate Block with Cortex AI". Make an API request to `/api/ai/cortex/build-widget` and automatically load the returned layout schema and fields into the composer form for the user to edit and save.

---

### Part 4: Verification Rules

For every modification:
1. Ensure all template changes are synchronized using:
   ```bash
   npm run sync:create-nextblock
   ```
2. Verify that all automated tests pass:
   ```bash
   npx vitest run
   ```
3. Verify that the production application compiles successfully:
   ```bash
   npm run nx:build:nextblock
   ```
