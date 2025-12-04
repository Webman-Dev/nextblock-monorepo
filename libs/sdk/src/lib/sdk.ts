import { z } from 'zod';
import { LucideIcon } from 'lucide-react';

// 1. The Core Schema Type
export type BlockContentSchema = z.ZodObject<any>; // Use a generic `any` for simplified external definition

// 2. The Runtime Data Type (Derived from Schema)
export type BlockData<TSchema extends BlockContentSchema> = z.infer<TSchema>;

// 3. The React Component Props Contract
export interface BlockProps<TSchema extends BlockContentSchema> {
  /** The strongly-typed content data for this block instance. */
  content: BlockData<TSchema>;
  /** Standard HTML class names for styling. */
  className?: string;
  /** Utility prop to determine if the block is being rendered inside the CMS editor iframe. */
  isInEditor: boolean;
  /** The language key (e.g., 'en', 'fr') of the content being displayed. */
  languageKey: string;
  // Future props can be added here (e.g., custom hooks for event handlers)
}

// 3.5 The Block Editor Props Contract
export interface BlockEditorProps<TSchema extends BlockContentSchema> {
  /** The strongly-typed content data for this block instance. */
  content: BlockData<TSchema>;
  /** The block instance itself (metadata like ID, type, etc.) */
  block: { type: string; [key: string]: any };
  /** Callback to update the block's content. */
  onChange: (newContent: BlockData<TSchema>) => void;
}

// 4. The Block Definition/Config for Registration
// This is the object the developer exports to register their block.
export interface BlockConfig<TSchema extends BlockContentSchema> {
    /** The unique, lowercase, snake_case identifier for the block type (e.g., 'testimonial_block'). */
    type: string;
    /** The user-friendly name displayed in the CMS editor. */
    label: string;
    /** The Lucide icon for the block picker. */
    icon?: LucideIcon;
    /** The Zod schema defining the structure and validation rules of the block's content. */
    schema: TSchema;
    /** The default content to use when a new block is added. Must conform to the schema. */
    initialContent: BlockData<TSchema>;
    /** The React component used to render the block in the public site. */
    RendererComponent: React.ComponentType<BlockProps<TSchema>>;
    /** The React component used for editing the block in the CMS sidebar. */
    EditorComponent: React.ComponentType<BlockEditorProps<TSchema>>; 
    // Note: The CMS will handle the `initialContent` and the runtime content data derivation.
}

// Re-export Lucide for convenience
export type { LucideIcon };

