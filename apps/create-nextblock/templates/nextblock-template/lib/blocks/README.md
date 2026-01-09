# Block Registry System

## Overview

The Block Registry System is a centralized, registry-based architecture for managing content blocks in the CMS. This system replaces the previous switch-statement approach with a more scalable, maintainable solution that uses dynamic imports and a single source of truth for block definitions.

### Key Benefits

- **Centralized Configuration**: All block types are defined in one place ([`blockRegistry.ts`](./blockRegistry.ts))
- **Dynamic Loading**: Components are loaded on-demand using Next.js dynamic imports
- **Type Safety**: Full TypeScript support with proper interface declarations
- **Scalability**: Easy to add new block types without modifying core systems
- **Maintainability**: Clear separation of concerns and consistent patterns
- **Performance**: Components are only loaded when needed
- **Better IDE Support**: Proper TypeScript interfaces with IntelliSense and compile-time checking

## Quick Start: Adding a New Block Type

Follow these steps to add a new block type (e.g., "Video Embed"). With the enhanced registry system, you only need to update the registry and create component files!

### Step 1: Define the Block Type with Proper TypeScript Interface

Add your new block type to the registry in [`lib/blocks/blockRegistry.ts`](./blockRegistry.ts):

```typescript
// 1. Add the TypeScript interface at the top of the file
/**
 * Content interface for video embed blocks
 * Embeds videos from popular platforms with customizable playback options
 */
export interface VideoEmbedBlockContent {
  /** The video URL (YouTube, Vimeo, etc.) */
  url: string;
  /** Optional title for the video */
  title?: string;
  /** Whether the video should autoplay */
  autoplay?: boolean;
  /** Whether to show video controls */
  controls?: boolean;
}

// 2. Add to availableBlockTypes array
export const availableBlockTypes = [
  "text",
  "heading",
  "image",
  "button",
  "posts_grid",
  "video_embed" // Add your new type
] as const;

// 3. Add to blockRegistry object with complete definition
export const blockRegistry: Record<BlockType, BlockDefinition> = {
  // ... existing blocks ...
  
  video_embed: {
    type: "video_embed",
    label: "Video Embed",
    initialContent: {
      url: "",
      title: "",
      autoplay: false,
      controls: true
    } as VideoEmbedBlockContent,
    editorComponentFilename: "VideoEmbedBlockEditor.tsx",
    rendererComponentFilename: "VideoEmbedBlockRenderer.tsx",
    contentSchema: {
      url: {
        type: 'string',
        required: true,
        description: 'The video URL (YouTube, Vimeo, etc.)',
        default: '',
      },
      title: {
        type: 'string',
        required: false,
        description: 'Optional title for the video',
        default: '',
      },
      autoplay: {
        type: 'boolean',
        required: false,
        description: 'Whether the video should autoplay',
        default: false,
      },
      controls: {
        type: 'boolean',
        required: false,
        description: 'Whether to show video controls',
        default: true,
      },
    },
    documentation: {
      description: 'Embeds videos from popular platforms with customizable playback options',
      examples: [
        '{ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Rick Roll", controls: true }',
        '{ url: "https://vimeo.com/123456789", autoplay: false, controls: true }',
      ],
      useCases: [
        'Tutorial and educational videos',
        'Product demonstrations',
        'Marketing and promotional content',
      ],
      notes: [
        'Supports YouTube, Vimeo, and other major video platforms',
        'Autoplay may be restricted by browser policies',
        'Videos are responsive and adapt to container width',
      ],
    },
  },
};
```

### Step 2: Create the Editor Component

Create [`app/cms/blocks/editors/VideoEmbedBlockEditor.tsx`](../../app/cms/blocks/editors/VideoEmbedBlockEditor.tsx):

```typescript
"use client";

import React from 'react';
import { Label } from "@nextblock-cms/ui";
import { Input } from "@nextblock-cms/ui";
import { Checkbox } from "@nextblock-cms/ui";
import { generateDefaultContent, VideoEmbedBlockContent } from "@/lib/blocks/blockRegistry";

interface VideoEmbedBlockEditorProps {
  content: Partial<VideoEmbedBlockContent>;
  onChange: (newContent: VideoEmbedBlockContent) => void;
}

export default function VideoEmbedBlockEditor({ content, onChange }: VideoEmbedBlockEditorProps) {
  // Get default content from registry
  const defaultContent = generateDefaultContent("video_embed") as VideoEmbedBlockContent;
  
  const handleChange = (field: keyof VideoEmbedBlockContent, value: any) => {
    onChange({
      ...defaultContent,
      ...content,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4 p-3 border-t mt-2">
      <div>
        <Label htmlFor="video-url">Video URL</Label>
        <Input
          id="video-url"
          type="url"
          value={content.url || ""}
          onChange={(e) => handleChange("url", e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </div>
      
      <div>
        <Label htmlFor="video-title">Title (Optional)</Label>
        <Input
          id="video-title"
          value={content.title || ""}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="Video title"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="autoplay"
          checked={content.autoplay || false}
          onCheckedChange={(checked) => handleChange("autoplay", checked)}
        />
        <Label htmlFor="autoplay">Autoplay</Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="controls"
          checked={content.controls !== false}
          onCheckedChange={(checked) => handleChange("controls", checked)}
        />
        <Label htmlFor="controls">Show Controls</Label>
      </div>
    </div>
  );
}
```

### Step 3: Create the Renderer Component

Create [`components/blocks/renderers/VideoEmbedBlockRenderer.tsx`](../../components/blocks/renderers/VideoEmbedBlockRenderer.tsx):

```typescript
import React from "react";
import { validateBlockContent, VideoEmbedBlockContent } from "@/lib/blocks/blockRegistry";

interface VideoEmbedBlockRendererProps {
  content: VideoEmbedBlockContent;
  languageId: number;
}

const VideoEmbedBlockRenderer: React.FC<VideoEmbedBlockRendererProps> = ({
  content,
  languageId,
}) => {
  // Optional: Validate content against registry schema
  const validation = validateBlockContent("video_embed", content);
  if (!validation.isValid) {
    console.warn("Invalid video embed content:", validation.errors);
  }

  if (!content.url) {
    return null;
  }

  // Convert YouTube URLs to embed format
  const getEmbedUrl = (url: string) => {
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(youtubeRegex);
    
    if (match) {
      const videoId = match[1];
      const params = new URLSearchParams();
      if (content.autoplay) params.set('autoplay', '1');
      if (!content.controls) params.set('controls', '0');
      
      return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    }
    
    return url; // Return original URL if not YouTube
  };

  return (
    <div className="my-4">
      {content.title && (
        <h3 className="text-lg font-semibold mb-2">{content.title}</h3>
      )}
      <div className="relative aspect-video">
        <iframe
          src={getEmbedUrl(content.url)}
          title={content.title || "Video"}
          className="w-full h-full rounded-lg"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default VideoEmbedBlockRenderer;
```

### Step 4: Test Your New Block

1. Restart your development server to ensure all changes are loaded
2. Navigate to a page or post editor in the CMS
3. Click "Add Block" and select "Video Embed"
4. Configure the video settings and save
5. View the page/post to see your rendered video block

**That's it!** The registry system handles all the TypeScript interface definitions and validation automatically.

## Architecture

### Enhanced Registry System

The new enhanced registry system provides:

- **Proper TypeScript Interfaces**: Each block has a real TypeScript interface declared at the top of the file
- **Better IDE Support**: Full IntelliSense, syntax highlighting, and compile-time checking
- **Runtime Validation**: Content can be validated against schema definitions
- **Auto-Generated Documentation**: Comprehensive documentation is built into each block definition
- **Utility Functions**: Helper functions for type generation, validation, and content management
- **Single Source of Truth**: All block information is centralized in the registry

### File Structure

```
lib/blocks/
├── blockRegistry.ts          # Enhanced central registry with proper TypeScript interfaces
└── README.md                 # This documentation

app/cms/blocks/editors/       # Editor components for CMS
├── TextBlockEditor.tsx
├── HeadingBlockEditor.tsx
├── ImageBlockEditor.tsx
├── ButtonBlockEditor.tsx
├── PostsGridBlockEditor.tsx
└── [YourNewBlock]Editor.tsx

components/blocks/renderers/  # Renderer components for frontend
├── TextBlockRenderer.tsx
├── HeadingBlockRenderer.tsx
├── ImageBlockRenderer.tsx
├── ButtonBlockRenderer.tsx
├── PostsGridBlockRenderer.tsx
└── [YourNewBlock]Renderer.tsx

utils/supabase/types.ts       # Core database types (block content types no longer needed here)
```

### Core Components

#### 1. Enhanced Block Registry ([`blockRegistry.ts`](./blockRegistry.ts))

The central registry now contains:
- **Proper TypeScript Interfaces**: Real interface declarations at the top of the file
- **Block Type Definitions**: Available block types as a const array
- **Complete Block Definitions**: Configuration and schemas for each block type
- **Content Schemas**: Structured property definitions with validation rules
- **Documentation**: Built-in examples, use cases, and implementation notes
- **Utility Functions**: Comprehensive helper functions for validation and content management

#### 2. Dynamic Block Renderer ([`components/BlockRenderer.tsx`](../../components/BlockRenderer.tsx))

Handles dynamic loading and rendering of blocks:
- Uses Next.js `dynamic()` for code splitting
- Provides loading states and error handling
- Supports SSR (Server-Side Rendering)

#### 3. Block Actions ([`app/cms/blocks/actions.ts`](../../app/cms/blocks/actions.ts))

Server actions for block CRUD operations:
- Uses registry for validation and initial content
- Handles authorization and database operations
- Provides revalidation for updated content

## API Reference

### TypeScript Interfaces

All block content interfaces are now properly declared at the top of [`blockRegistry.ts`](./blockRegistry.ts):

```typescript
export interface TextBlockContent {
  html_content: string;
}

export interface HeadingBlockContent {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text_content: string;
}

export interface ImageBlockContent {
  media_id: string | null;
  object_key?: string | null;
  alt_text?: string;
  caption?: string;
  width?: number | null;
  height?: number | null;
}

export interface ButtonBlockContent {
  text: string;
  url: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
}

export interface PostsGridBlockContent {
  postsPerPage: number;
  columns: number;
  showPagination: boolean;
  title?: string;
}
```

### Enhanced BlockDefinition Interface

```typescript
interface BlockDefinition<T = any> {
  type: BlockType;                        // Unique identifier
  label: string;                          // Display name in CMS
  initialContent: T;                      // Default content structure (properly typed)
  editorComponentFilename: string;        // Editor component filename
  rendererComponentFilename: string;      // Renderer component filename
  previewComponentFilename?: string;      // Optional preview component
  contentSchema: Record<string, ContentPropertyDefinition>; // Structured schema
  documentation?: {                       // Optional documentation
    description?: string;
    examples?: string[];
    useCases?: string[];
    notes?: string[];
  };
}
```

### Registry Functions

#### Core Registry Functions

#### `getBlockDefinition(blockType: BlockType)`
Returns the complete block definition for a given type.

```typescript
const definition = getBlockDefinition("text");
// Returns: { type: "text", label: "HTML Block", initialContent: {...}, ... }
```

#### `getInitialContent(blockType: BlockType)`
Returns the initial content structure for a new block.

```typescript
const content = getInitialContent("heading");
// Returns: { level: 1, text_content: "New Heading" }
```

#### `getBlockLabel(blockType: BlockType)`
Returns the user-friendly label for a block type.

```typescript
const label = getBlockLabel("image");
// Returns: "Image"
```

#### `isValidBlockType(blockType: string)`
Type guard to check if a string is a valid block type.

```typescript
if (isValidBlockType(userInput)) {
  // userInput is now typed as BlockType
  const definition = getBlockDefinition(userInput);
}
```

#### Enhanced Registry Functions

#### `getContentSchema(blockType: BlockType)`
Returns the structured content schema for validation and documentation.

```typescript
const schema = getContentSchema("heading");
// Returns: { level: { type: 'union', required: true, ... }, text_content: { ... } }
```

#### `getBlockDocumentation(blockType: BlockType)`
Returns documentation including description, examples, and use cases.

```typescript
const docs = getBlockDocumentation("image");
// Returns: { description: "...", examples: [...], useCases: [...], notes: [...] }
```

#### Validation and Utility Functions

#### `validateBlockContent(blockType: BlockType, content: Record<string, any>)`
Validates block content against its schema definition.

```typescript
const validation = validateBlockContent("button", { text: "Click me" });
// Returns: { isValid: false, errors: ["Required property 'url' is missing"], warnings: [] }
```

#### `getPropertyDefinition(blockType: BlockType, propertyName: string)`
Returns the definition for a specific property of a block type.

```typescript
const propDef = getPropertyDefinition("heading", "level");
// Returns: { type: 'union', required: true, description: "...", constraints: { ... } }
```

#### `getPropertyNames(blockType: BlockType)`
Returns all property names for a block type.

```typescript
const props = getPropertyNames("image");
// Returns: ["media_id", "object_key", "alt_text", "caption", "width", "height"]
```

#### `getRequiredProperties(blockType: BlockType)`
Returns only the required property names for a block type.

```typescript
const required = getRequiredProperties("text");
// Returns: ["html_content"]
```

#### `generateDefaultContent(blockType: BlockType)`
Generates complete default content including all properties with defaults.

```typescript
const defaults = generateDefaultContent("button");
// Returns: { text: "Click Me", url: "#", variant: "default", size: "default" }
```

### Component Interfaces

#### Editor Component Props
```typescript
interface BlockEditorProps<T> {
  content: Partial<T>;
  onChange: (newContent: T) => void;
}
```

#### Renderer Component Props
```typescript
interface BlockRendererProps<T> {
  content: T;
  languageId: number;
  block?: Block; // Optional, for blocks that need full block data
}
```

## Migration Guide

### What Changed

The system has evolved to use proper TypeScript interfaces:

**Before (String-based interfaces):**
```typescript
contentInterface: `interface TextBlockContent {
  /** Raw HTML content for the text block */
  html_content: string;
}`,
```

**After (Proper TypeScript interfaces):**
```typescript
// At the top of blockRegistry.ts
export interface TextBlockContent {
  /** Raw HTML content for the text block */
  html_content: string;
}

// In the registry
text: {
  type: "text",
  label: "HTML Block",
  initialContent: { html_content: "<p>New text block...</p>" } as TextBlockContent,
  // ... rest of definition (no contentInterface property)
}
```

### Benefits of the New System

1. **Better IDE Support**: Full IntelliSense, syntax highlighting, and error checking
2. **Compile-time Type Safety**: TypeScript can catch type errors at build time
3. **Cleaner Code**: No more string-based interface definitions
4. **Standard TypeScript Patterns**: Uses conventional TypeScript interface declarations
5. **Better Refactoring Support**: IDEs can properly rename and refactor interface properties
6. **Import/Export Support**: Interfaces can be imported and used across files

### Key Improvements

- **Proper Interface Declarations**: TypeScript interfaces are declared at the top of the file
- **Type-safe Initial Content**: Initial content is properly typed with `as InterfaceName`
- **Removed contentInterface Property**: No longer needed since we have real interfaces
- **Enhanced Type Union**: `AllBlockContent` provides a discriminated union of all block types
- **Better Component Typing**: Components can import and use the actual interfaces

### Breaking Changes

- The `contentInterface` property has been removed from `BlockDefinition`
- The `getContentInterface()` function has been removed
- The `getAllContentInterfaces()` and `generateSpecificBlockContentUnion()` functions have been removed
- Components should now import interfaces directly from the registry

### Migration Benefits

**Before (Required changes to add a new block):**
1. Update `availableBlockTypes` in `blockRegistry.ts`
2. Add block definition with string-based interface to `blockRegistry`
3. Create editor component with manually defined types
4. Create renderer component with manually defined types

**After (Required changes to add a new block):**
1. Add proper TypeScript interface at the top of `blockRegistry.ts`
2. Update `availableBlockTypes` in `blockRegistry.ts`
3. Add block definition with typed initial content to `blockRegistry`
4. Create editor component importing the interface
5. Create renderer component importing the interface

**Benefits:**
- Better type safety and IDE support
- Standard TypeScript patterns
- Easier refactoring and maintenance
- Compile-time error checking

## TypeScript Best Practices

### 1. Import Interfaces from Registry
```typescript
// Always import interfaces from the registry
import { VideoEmbedBlockContent } from "@/lib/blocks/blockRegistry";

// Don't redefine interfaces in components
type VideoEmbedBlockContent = {  // ❌ Don't do this
  url: string;
  // ...
};
```

### 2. Use Type Assertions for Generated Content
```typescript
// Use type assertions when getting generated content
const defaults = generateDefaultContent("video_embed") as VideoEmbedBlockContent;
const initialContent = getInitialContent("button") as ButtonBlockContent;
```

### 3. Leverage Runtime Validation
```typescript
// Validate content in development
if (process.env.NODE_ENV === 'development') {
  const validation = validateBlockContent(blockType, content);
  if (!validation.isValid) {
    console.warn(`Invalid ${blockType} content:`, validation.errors);
  }
}
```

### 4. Use Property Definitions for Dynamic UIs
```typescript
// Build forms dynamically from registry schema
const schema = getContentSchema(blockType);
const formFields = Object.entries(schema).map(([name, def]) => ({
  name,
  type: def.type,
  required: def.required,
  description: def.description,
  default: def.default,
}));
```

## Best Practices

### 1. Naming Conventions
- Use PascalCase for component filenames: `VideoEmbedBlockEditor.tsx`
- Use snake_case for block types: `video_embed`
- Use descriptive labels: "Video Embed" instead of "Video"
- Use PascalCase for interface names: `VideoEmbedBlockContent`

### 2. Interface Design
- Keep interfaces focused and minimal
- Use optional properties appropriately
- Include JSDoc comments for better documentation
- Use union types for constrained values

### 3. Content Structure
- Keep initial content simple and minimal
- Use sensible defaults for optional properties
- Ensure content structure matches TypeScript interfaces
- Type initial content with `as InterfaceName`

### 4. Component Design
- Import interfaces from the registry
- Keep editor components focused on editing functionality
- Keep renderer components focused on display
- Use consistent prop interfaces across similar components

### 5. Error Handling
- Provide fallbacks for missing or invalid content
- Show helpful error messages in development
- Gracefully handle dynamic import failures
- Use runtime validation in development mode

## Summary

The enhanced block registry system with proper TypeScript interfaces transforms the development experience by:

- **Proper Type Safety**: Real TypeScript interfaces with compile-time checking
- **Better IDE Support**: Full IntelliSense, syntax highlighting, and refactoring support
- **Cleaner Code**: Standard TypeScript patterns instead of string-based interfaces
- **Centralized Everything**: All block information in one place
- **Runtime Validation**: Content validation against schema definitions
- **Developer Experience**: Clear patterns and comprehensive tooling

This system achieves the "one registry file + component folder" ideal while providing superior TypeScript support and maintaining all existing functionality for validation, documentation, and tooling.