# 03 CMS and Editor

## Two Related Systems

NextBlock's content authoring experience is split across two real subsystems:

- `libs/editor`: a reusable Tiptap-based rich text package
- `apps/nextblock/lib/blocks`: the block registry and page-builder layer used
  by pages, posts, and some commerce surfaces

They work together, but they are not the same thing.

## Block Registry and Page Builder

The block registry lives in `apps/nextblock/lib/blocks/blockRegistry.ts`. It is
the current source of truth for:

- available block types
- Zod schemas
- default content
- editor component filenames
- renderer component filenames
- human-facing labels and block metadata

### Current registered block types

The registry currently includes:

- `text`
- `heading`
- `image`
- `button`
- `posts_grid`
- `video_embed`
- `section`
- `form`
- `testimonial`
- `product_grid`
- `featured_product`
- `cart`
- `checkout`
- `product_details`

The authoritative type list is `apps/nextblock/lib/blocks/blockTypes.ts`
(`availableBlockTypes`).

A `section` block can contain nested column block arrays, so the page builder
supports multi-column compositions instead of only flat block lists. Legacy
`hero` blocks were folded into `section` (carrying an `is_hero` flag) by
migration `00000000000021_migrate_hero_blocks_to_sections.sql`, so `hero` is no
longer a standalone registered block type.

### How the CMS uses the registry

The CMS block editor components under `app/cms/blocks` use the registry to:

- validate block types
- build new block payloads from default content
- dynamically load editor components
- dynamically load renderer components
- render block labels and picker entries

The registry also exposes helper functions such as:

- `getBlockDefinition()`
- `getInitialContent()`
- `getBlockSchema()`
- `validateBlockContent()`
- `generateDefaultContent()`

## Tiptap Editor Package

The reusable editor surface lives in `libs/editor`.

The main exports today are:

- `Editor`
- `NotionEditor`
- `EditorToolbar`
- `EditorBubbleMenu`
- `EditorFloatingMenu`
- `EnhancedFloatingMenu`
- `SlashCommandList`
- `DragHandle`
- `HtmlContent`
- `editorExtensions`

### Core editing capabilities

`libs/editor/src/lib/kit.ts` composes the editor from Tiptap extensions and
custom nodes. The shipped editing surface includes:

- StarterKit-based rich text
- syntax-highlighted code blocks via `CodeBlockLowlight`
- tables
- task lists
- link handling
- text styling through `TextStyleKit`
- highlight, subscript, superscript, and typography helpers
- character counting
- slash commands
- drag handles and draggable node movement
- image handling

### Custom HTML-preserving extensions

The editor intentionally preserves more HTML than a minimal rich text field.
Current custom nodes/extensions include support for:

- `div`
- `style`
- `script`
- `svg`
- `span`
- a catch-all attribute preservation layer

This matters because some CMS-authored content and seeded content store richer
HTML fragments than plain paragraph markup.

## Inline Widgets

The editor currently ships two inline widget node types:

- alert widget
- call-to-action widget

These appear in multiple places:

- Tiptap commands and slash-command actions
- editor node views in `libs/editor`
- runtime React renderers in `apps/nextblock/components/blocks/renderers/inline`

So the widgets are not just editor-only decorations; they have both editing and
front-end rendering paths.

## NotionEditor Integration Pattern

`NotionEditor` is the higher-level client component used by the app. It wraps:

- the extension kit
- toolbars and menus
- content synchronization through `onChange` and `onUpdate`
- media picker bridging through editor storage
- hydration-safe initialization with `immediatelyRender: false`
- a scrollable editing shell and character counts

The app currently mounts it in multiple places, including:

- text block editing
- product description editing

## Media Picker Integration

The editor integrates with a pluggable image picker bridge:

- `setOpenImagePicker()` stores a picker callback on the editor instance
- menus and extensions can open the media picker without knowing app details
- the CMS supplies the actual picker UI

This keeps the editor package reusable while still supporting CMS media
selection.

## Commerce-Aware Blocks

The block layer is not content-only. The app also ships block types that render
commerce primitives backed by `@nextblock-cms/ecommerce`, including:

- product grid
- featured product
- cart
- checkout
- product details

These bridge the CMS page builder to the premium commerce library without
copying storefront logic into the app.

## Custom Blocks (Data-Driven CRUD)

Beyond the code-defined built-ins above, editors can create their own block
types at runtime from the CMS, with no code deploy. These **custom block
definitions** are stored as rows in `custom_block_definitions` (typed fields
plus a recursive layout schema) and rendered on the public site by a dynamic
layout engine instead of a compiled React renderer.

The wiring is intentionally simple: a page/post block whose `block_type` equals
a custom definition's `slug` is resolved through
`getCachedCustomBlockDefinitionBySlug()` and rendered by
`CachedDynamicLayoutEngine`. Authoring, CRUD, duplicate, and JSON
import/export/backup all live under `app/cms/custom-blocks`.

Full details, including the field types, the layout schema, caching, and the
Cortex AI "build widget" path, are in
[10-CUSTOM-BLOCKS.md](./10-CUSTOM-BLOCKS.md).

## Relationship to the SDK

The registry is the current in-app block system. The formal external authoring
contract lives in `libs/sdk` and is documented in
[07-BLOCK-SDK-AND-EXTENSIBILITY.md](./07-BLOCK-SDK-AND-EXTENSIBILITY.md).

If you are changing how blocks work inside the CMS, start here. If you are
designing a reusable third-party block contract, start with the SDK doc.
