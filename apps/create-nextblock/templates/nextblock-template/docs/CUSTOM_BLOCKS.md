# How to Create a Custom Block with the NextBlock SDK

Custom blocks allow you to extend the functionality of NextBlock CMS while ensuring type safety and seamless integration. The `@nextblock-cms/sdk` package provides the necessary tools and interfaces.

## Step 1: Define the Schema (Zod)

The schema defines the structure of your block's content. It is used for validation and to generate TypeScript types.

```typescript
import { z } from 'zod';

export const MyBlockSchema = z.object({
  title: z.string().min(1).describe('The main title'),
  description: z.string().optional().describe('Optional description'),
  isActive: z.boolean().default(true),
});

// Derive the content type from the schema
export type MyBlockContent = z.infer<typeof MyBlockSchema>;
```

## Step 2: Define the Components (React/TS)

Create the components that will render your block. Use the `BlockProps` interface to ensure your component receives the correct data.

```typescript
import React from 'react';
import { BlockProps } from '@nextblock-cms/sdk';

// The Renderer Component (Public View)
const MyBlockRenderer: React.FC<BlockProps<typeof MyBlockSchema>> = ({ content }) => {
  return (
    <div className="my-block">
      <h2>{content.title}</h2>
      {content.description && <p>{content.description}</p>}
    </div>
  );
};

// The Editor Component (CMS View)
// Currently, the CMS uses auto-generated forms based on the schema,
// but you can provide a custom preview or editor here.
const MyBlockEditor: React.FC<BlockProps<typeof MyBlockSchema>> = ({ content }) => {
  return (
    <div className="p-4 border">
      Preview: {content.title}
    </div>
  );
};
```

## Step 3: Create the Configuration

Combine everything into a `BlockConfig` object. This object tells the CMS how to handle your block.

```typescript
import { BlockConfig } from '@nextblock-cms/sdk';
import { Star } from 'lucide-react'; // Choose an icon

export const MyBlockConfig: BlockConfig<typeof MyBlockSchema> = {
  type: 'my_block', // Unique identifier
  label: 'My Custom Block',
  icon: Star,
  schema: MyBlockSchema,
  initialContent: {
    title: 'Default Title',
    isActive: true,
  },
  RendererComponent: MyBlockRenderer,
  EditorComponent: MyBlockEditor,
};
```

## Step 4: Building the Editor Component

The Editor Component is responsible for the editing experience within the CMS. It receives `BlockEditorProps`, which includes the current content and an `onChange` handler.

You should use the shared UI components from `@nextblock-cms/ui` (like `Input`, `Textarea`, `Button`, `Label`) to ensure a consistent look and feel with the rest of the Admin UI.

```typescript
import React from 'react';
import { BlockEditorProps } from '@nextblock-cms/sdk';
import { Input, Label, Textarea } from '@nextblock-cms/ui';

const MyBlockEditor: React.FC<BlockEditorProps<typeof MyBlockSchema>> = ({ content, onChange }) => {

  const handleChange = (key: keyof typeof content, value: any) => {
    onChange({
      ...content,
      [key]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={content.title}
          onChange={(e) => handleChange('title', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={content.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </div>
    </div>
  );
};
```

## Step 5: Register the Block

To make your block available in the CMS, import it into the main registry file: `apps/nextblock/lib/blocks/blockRegistry.ts`.

```typescript
// apps/nextblock/lib/blocks/blockRegistry.ts
import { MyBlockConfig } from '../../components/blocks/MyBlock';

export const blockRegistry: Record<BlockType, BlockDefinition> = {
  // ... existing blocks
  [MyBlockConfig.type]: {
    ...MyBlockConfig,
    // ... any additional internal config if needed
  } as BlockDefinition<MyBlockContent>,
};
```

Once registered, your block will appear in the CMS block picker and render on the frontend.

## Advanced Topic: Schema Evolution and Versioning

Modifying a Zod schema after a block is in production can be dangerous. If you change the shape of the data (e.g., rename a field, remove a required field), existing blocks in the database may fail to validate or render, causing runtime errors.

### Recommended Strategy: Versioning

Instead of modifying the existing schema, create a new version of the block.

1.  **Duplicate the Block**: Create a new block type, e.g., `my_block_v2`, with the updated schema and renderer.
2.  **Register the New Block**: Add it to the registry. You can hide the old `my_block` from the picker if you want to prevent new usage, but keep the definition so existing blocks continue to work.
3.  **Migration (Optional)**: You can write a utility to transform `my_block` data to `my_block_v2` format if you want to migrate content programmatically.

While V1 of the SDK does not enforce a strict versioning system, treating your block schemas as immutable contracts is a best practice for stability.
