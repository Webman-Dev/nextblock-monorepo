import { z } from 'zod';
import { TestimonialBlockConfig, TestimonialBlockContent } from '../../components/blocks/TestimonialBlock';

/**
 * Block Registry System
 *
 * This module provides the central registry for all block types in the CMS.
 * It serves as the single source of truth for block definitions, including
 * their initial content, editor components, renderer components, and Zod schemas.
 */

/**
 * Available block types - defined here as the source of truth
 */
export const availableBlockTypes = ["text", "heading", "image", "button", "posts_grid", "video_embed", "section", "hero", "form", "testimonial"] as const;
export type BlockType = (typeof availableBlockTypes)[number];

// --- Zod Schemas & Inferred Types ---

export const TextBlockSchema = z.object({
  html_content: z.string().describe('Raw HTML content for the text block'),
});
export type TextBlockContent = z.infer<typeof TextBlockSchema>;

export const HeadingBlockSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).describe('Heading level (1-6)'),
  text_content: z.string().describe('The text content of the heading'),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional().describe('Text alignment'),
  textColor: z.enum(['primary', 'secondary', 'accent', 'muted', 'destructive', 'background']).optional().describe('Color of the heading text'),
});
export type HeadingBlockContent = z.infer<typeof HeadingBlockSchema>;

export const ImageBlockSchema = z.object({
  media_id: z.string().nullable().describe('UUID of the media item'),
  object_key: z.string().nullable().optional().describe('The actual R2 object key'),
  alt_text: z.string().optional().describe('Alternative text'),
  caption: z.string().optional().describe('Optional caption'),
  width: z.number().nullable().optional().describe('Image width'),
  height: z.number().nullable().optional().describe('Image height'),
});
export type ImageBlockContent = z.infer<typeof ImageBlockSchema>;

export const ButtonBlockSchema = z.object({
  text: z.string().describe('The text displayed on the button'),
  url: z.string().describe('The URL the button links to'),
  variant: z.enum(['default', 'outline', 'secondary', 'ghost', 'link']).optional().describe('Visual style variant'),
  size: z.enum(['default', 'sm', 'lg', 'full']).optional().describe('Size of the button'),
  position: z.enum(['left', 'center', 'right']).optional().describe('Button alignment'),
});
export type ButtonBlockContent = z.infer<typeof ButtonBlockSchema>;

export const PostsGridBlockSchema = z.object({
  postsPerPage: z.number().min(1).max(50).describe('Number of posts per page'),
  columns: z.number().min(1).max(6).describe('Number of columns'),
  showPagination: z.boolean().describe('Whether to show pagination'),
  title: z.string().optional().describe('Optional title'),
});
export type PostsGridBlockContent = z.infer<typeof PostsGridBlockSchema>;

export const VideoEmbedBlockSchema = z.object({
  url: z.string().describe('The video URL'),
  title: z.string().optional().describe('Optional title'),
  autoplay: z.boolean().optional().describe('Autoplay'),
  controls: z.boolean().optional().describe('Show controls'),
});
export type VideoEmbedBlockContent = z.infer<typeof VideoEmbedBlockSchema>;

// Section helpers
const GradientSchema = z.object({
  type: z.enum(['linear', 'radial']),
  direction: z.string().optional(),
  stops: z.array(z.object({ color: z.string(), position: z.number() })),
});
export type Gradient = z.infer<typeof GradientSchema>;

const BackgroundSchema = z.object({
  type: z.enum(['none', 'theme', 'solid', 'gradient', 'image']),
  theme: z.enum(['primary', 'secondary', 'muted', 'accent', 'destructive']).optional(),
  solid_color: z.string().optional(),
  min_height: z.string().optional(),
  gradient: GradientSchema.optional(),
  image: z.object({
    media_id: z.string(),
    object_key: z.string(),
    alt_text: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    blur_data_url: z.string().optional(),
    size: z.enum(['cover', 'contain']),
    position: z.enum(['center', 'top', 'bottom', 'left', 'right']),
    quality: z.number().nullable().optional(),
    overlay: z.object({
      type: z.literal('gradient'),
      gradient: GradientSchema,
    }).optional(),
  }).optional(),
});

const BlockInColumnSchema = z.object({
  block_type: z.enum(availableBlockTypes),
  content: z.record(z.any()),
  temp_id: z.string().optional(),
});

export const SectionBlockSchema = z.object({
  container_type: z.enum(['full-width', 'container', 'container-sm', 'container-lg', 'container-xl']),
  background: BackgroundSchema,
  responsive_columns: z.object({
    mobile: z.union([z.literal(1), z.literal(2)]),
    tablet: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    desktop: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  }),
  column_gap: z.enum(['none', 'sm', 'md', 'lg', 'xl']),
  padding: z.object({
    top: z.enum(['none', 'sm', 'md', 'lg', 'xl']),
    bottom: z.enum(['none', 'sm', 'md', 'lg', 'xl']),
  }),
  vertical_alignment: z.enum(['start', 'center', 'end', 'stretch']).optional(),
  column_blocks: z.array(z.array(BlockInColumnSchema)),
});
export type SectionBlockContent = z.infer<typeof SectionBlockSchema>;

export const HeroBlockSchema = SectionBlockSchema;
export type HeroBlockContent = z.infer<typeof HeroBlockSchema>;

// Form helpers
export const FormFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type FormFieldOption = z.infer<typeof FormFieldOptionSchema>;

export const FormFieldSchema = z.object({
  temp_id: z.string(),
  field_type: z.enum(['text', 'email', 'textarea', 'select', 'radio', 'checkbox']),
  label: z.string(),
  placeholder: z.string().optional(),
  is_required: z.boolean(),
  options: z.array(FormFieldOptionSchema).optional(),
});
export type FormField = z.infer<typeof FormFieldSchema>;

export const FormBlockSchema = z.object({
  recipient_email: z.string().email(),
  submit_button_text: z.string(),
  success_message: z.string(),
  fields: z.array(FormFieldSchema),
});
export type FormBlockContent = z.infer<typeof FormBlockSchema>;

/**
 * Enhanced block definition interface with generic type parameter
 * Links the TypeScript interface to the block definition for better type safety
 */
export interface BlockDefinition<T = any> {
  /** The unique identifier for the block type */
  type: BlockType;
  /** User-friendly display name for the block */
  label: string;
  /** Optional icon for the block, using lucide-react icon names or component */
  icon?: string | any;
  /** Default content structure for new blocks of this type */
  initialContent: T;
  /** Filename of the editor component (assumed to be in app/cms/blocks/editors/) */
  editorComponentFilename?: string;
  /** Filename of the renderer component (assumed to be in components/blocks/renderers/) */
  rendererComponentFilename?: string;
  /** Direct React component for rendering (overrides filename if present) */
  RendererComponent?: React.ComponentType<any>;
  /** Direct React component for editing (overrides filename if present) */
  EditorComponent?: React.ComponentType<any>;
  /** Optional filename for specific preview components */
  previewComponentFilename?: string;
  /**
   * Zod schema defining the content properties, types, and constraints.
   * Used for validation, documentation, and potential runtime type checking.
   */
  schema: z.ZodType<T>;
  /**
   * JSDoc-style comments providing additional context about the block type,
   * its use cases, and any special considerations.
   */
  documentation?: {
    description?: string;
    examples?: string[];
    useCases?: string[];
    notes?: string[];
  };
}

/**
 * Central registry of all available block types and their configurations
 *
 * This registry contains the complete definition for each block type,
 * including their initial content values and structured content schemas.
 * This serves as the single source of truth for all block-related information,
 * eliminating the need to modify utils/supabase/types.ts when adding new block types.
 */
export const blockRegistry: Record<BlockType, BlockDefinition> = {
  text: {
    type: "text",
    label: "Rich Text Block",
    icon: "FileText",
    initialContent: { html_content: "" } as TextBlockContent,
    editorComponentFilename: "TextBlockEditor.tsx",
    rendererComponentFilename: "TextBlockRenderer.tsx",
    schema: TextBlockSchema,
    documentation: {
      description: 'A rich text block that supports HTML content with WYSIWYG editing',
      examples: [
        '<p>Simple paragraph text</p>',
        '<h2>Heading with <strong>bold text</strong></h2>',
        '<ul><li>List item 1</li><li>List item 2</li></ul>',
      ],
      useCases: [
        'Article content and body text',
        'Rich formatted content with links and styling',
        'Lists, quotes, and other structured text',
      ],
      notes: [
        'Content is sanitized before rendering to prevent XSS attacks',
        'Supports most HTML tags commonly used in content',
      ],
    },
  },
  
  heading: {
    type: "heading",
    label: "Heading",
    icon: "Heading",
    initialContent: { level: 1, text_content: "New Heading", textAlign: 'left', textColor: undefined } as HeadingBlockContent,
    editorComponentFilename: "HeadingBlockEditor.tsx",
    rendererComponentFilename: "HeadingBlockRenderer.tsx",
    schema: HeadingBlockSchema,
    documentation: {
      description: 'A semantic heading block with configurable hierarchy levels',
      examples: [
        '{ level: 1, text_content: "Main Page Title" }',
        '{ level: 2, text_content: "Section Heading" }',
        '{ level: 3, text_content: "Subsection Title" }',
      ],
      useCases: [
        'Page and section titles',
        'Content hierarchy and structure',
        'SEO-friendly heading organization',
      ],
      notes: [
        'Choose heading levels based on content hierarchy, not visual appearance',
        'Avoid skipping heading levels (e.g., h1 to h3 without h2)',
      ],
    },
  },
  
  image: {
    type: "image",
    label: "Image",
    icon: "Image",
    initialContent: { media_id: null, alt_text: "", caption: "" } as ImageBlockContent,
    editorComponentFilename: "ImageBlockEditor.tsx",
    rendererComponentFilename: "ImageBlockRenderer.tsx",
    schema: ImageBlockSchema,
    documentation: {
      description: 'An image block with support for captions, alt text, and responsive sizing',
      examples: [
        '{ media_id: "uuid-123", alt_text: "Product photo", caption: "Our latest product" }',
        '{ media_id: "uuid-456", alt_text: "Team photo", width: 800, height: 600 }',
      ],
      useCases: [
        'Article illustrations and photos',
        'Product images and galleries',
        'Decorative and informational graphics',
      ],
      notes: [
        'Always provide alt_text for accessibility compliance',
        'Images are automatically optimized and served from CDN',
        'Dimensions are used for layout optimization and preventing content shifts',
      ],
    },
  },
  
  button: {
    type: "button",
    label: "Button",
    icon: "SquareMousePointer",
    initialContent: { text: "Click Me", url: "#", variant: "default", size: "default", position: "left" } as ButtonBlockContent,
    editorComponentFilename: "ButtonBlockEditor.tsx",
    rendererComponentFilename: "ButtonBlockRenderer.tsx",
    schema: ButtonBlockSchema,
    documentation: {
      description: 'A customizable button/link component with multiple style variants',
      examples: [
        '{ text: "Learn More", url: "/about", variant: "default", size: "lg" }',
        '{ text: "Contact Us", url: "/contact", variant: "outline" }',
        '{ text: "Download", url: "/files/doc.pdf", variant: "secondary" }',
      ],
      useCases: [
        'Call-to-action buttons',
        'Navigation links with button styling',
        'Download and external links',
      ],
      notes: [
        'External URLs automatically open in new tabs',
        'Button styles follow the design system theme',
        'Use appropriate variants based on button importance and context',
      ],
    },
  },
  
  posts_grid: {
    type: "posts_grid",
    label: "Posts Grid",
    icon: "LayoutGrid",
    initialContent: { postsPerPage: 12, columns: 3, showPagination: true, title: "Recent Posts" } as PostsGridBlockContent,
    editorComponentFilename: "PostsGridBlockEditor.tsx",
    rendererComponentFilename: "PostsGridBlockRenderer.tsx",
    schema: PostsGridBlockSchema,
    documentation: {
      description: 'A responsive grid layout for displaying blog posts with pagination',
      examples: [
        '{ postsPerPage: 6, columns: 2, showPagination: true, title: "Latest News" }',
        '{ postsPerPage: 9, columns: 3, showPagination: false, title: "Featured Articles" }',
      ],
      useCases: [
        'Blog post listings and archives',
        'Featured content sections',
        'News and article showcases',
      ],
      notes: [
        'Grid automatically adapts to smaller screens',
        'Posts are filtered by current language',
        'Pagination improves performance for large post collections',
      ],
    },
  },
  
  video_embed: {
    type: "video_embed",
    label: "Video Embed",
    icon: "SquarePlay",
    initialContent: {
      url: "",
      title: "",
      autoplay: false,
      controls: true
    } as VideoEmbedBlockContent,
    editorComponentFilename: "VideoEmbedBlockEditor.tsx",
    rendererComponentFilename: "VideoEmbedBlockRenderer.tsx",
    schema: VideoEmbedBlockSchema,
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
  
  section: {
    type: "section",
    label: "Section Layout",
    icon: "Columns3",
    initialContent: {
      container_type: "container",
      background: { type: "none" },
      responsive_columns: { mobile: 1, tablet: 2, desktop: 3 },
      column_gap: "md",
      vertical_alignment: "start",
      padding: { top: "md", bottom: "md" },
      column_blocks: [
        [{ block_type: "text", content: { html_content: "<p>Column 1</p>" } }],
        [{ block_type: "text", content: { html_content: "<p>Column 2</p>" } }],
        [{ block_type: "text", content: { html_content: "<p>Column 3</p>" } }]
      ]
    } as SectionBlockContent,
    editorComponentFilename: "SectionBlockEditor.tsx",
    rendererComponentFilename: "SectionBlockRenderer.tsx",
    schema: SectionBlockSchema,
    documentation: {
      description: 'A flexible section layout with responsive columns and background options',
      examples: [
        '{ container_type: "container", responsive_columns: { mobile: 1, tablet: 2, desktop: 3 } }',
        '{ background: { type: "gradient" }, column_blocks: [...] }',
        '{ container_type: "full-width", background: { type: "image" } }',
      ],
      useCases: [
        'Feature sections with multiple content blocks',
        'Comparison layouts and product showcases',
        'Hero sections with structured content',
        'Multi-column article layouts',
      ],
      notes: [
        'Blocks within sections can be edited inline',
        'Supports full drag-and-drop between columns and sections',
        'Background images are managed through existing media system',
        'Responsive breakpoints follow Tailwind CSS conventions',
      ],
    },
  },

  hero: {
    type: "hero",
    label: "Hero Section",
    icon: "LayoutTemplate",
    initialContent: {
      container_type: 'container',
      background: { type: "none" },
      responsive_columns: { mobile: 1, tablet: 1, desktop: 2 },
      column_gap: 'lg',
      padding: { top: 'xl', bottom: 'xl' },
      column_blocks: [
        [
          { block_type: "heading", content: { level: 1, text_content: "Hero Title" }, temp_id: `block-${Date.now()}-1` },
          { block_type: "text", content: { html_content: "<p>Hero description goes here. Explain the value proposition.</p>" }, temp_id: `block-${Date.now()}-2` },
          { block_type: "button", content: { text: "Call to Action", url: "#" }, temp_id: `block-${Date.now()}-3` },
        ],
        [],
      ],
    } as HeroBlockContent,
    editorComponentFilename: "SectionBlockEditor.tsx", // Reusing section editor
    rendererComponentFilename: "HeroBlockRenderer.tsx", // Specific renderer for hero
    schema: HeroBlockSchema,
    documentation: {
      description: 'A specialized hero section for the top of a page, with prioritized images and pre-populated content.',
      useCases: ['Main page hero/banner', 'Introductory section with a strong call to action'],
      notes: ['This block reuses the Section editor but has a different renderer for optimized image loading.'],
    },
  },
  
  form: {
    type: "form",
    label: "Form",
    icon: "NotebookPen",
    initialContent: {
      recipient_email: "your-email@example.com",
      submit_button_text: "Submit",
      success_message: "Thank you for your submission!",
      fields: [],
    } as FormBlockContent,
    editorComponentFilename: "FormBlockEditor.tsx",
    rendererComponentFilename: "FormBlockRenderer.tsx",
    schema: FormBlockSchema,
    documentation: {
      description: 'Creates an interactive form that can be submitted to a specified email address.',
      useCases: [
        'Contact forms',
        'Lead generation forms',
        'Simple surveys',
      ],
      notes: [
        'The actual email sending functionality depends on a separate server action.',
        'Form submissions are not stored in the database by this block.',
      ],
    },
  },
  
  "testimonial": {
    ...TestimonialBlockConfig,
    // Adapt SDK config to BlockDefinition requirements
    editorComponentFilename: 'TestimonialBlockEditor', // Placeholder, not used if EditorComponent is present
    rendererComponentFilename: 'TestimonialBlockRenderer', // Placeholder
    documentation: {
      description: 'Display a user testimonial with a quote, author, and optional image.',
      useCases: ['Social proof', 'Customer reviews'],
    }
  } as BlockDefinition<TestimonialBlockContent>,
};


/**
 * Get the block definition for a specific block type
 * 
 * @param blockType - The type of block to get the definition for
 * @returns The block definition or undefined if not found
 */
export function getBlockDefinition(blockType: BlockType): BlockDefinition | undefined {
  return blockRegistry[blockType];
}

/**
 * Get the initial content for a specific block type
 * 
 * @param blockType - The type of block to get initial content for
 * @returns The initial content object or undefined if block type not found
 */
export function getInitialContent(blockType: BlockType): object | undefined {
  return blockRegistry[blockType]?.initialContent;
}

/**
 * Get the label for a specific block type
 * 
 * @param blockType - The type of block to get the label for
 * @returns The user-friendly label or undefined if block type not found
 */
export function getBlockLabel(blockType: BlockType): string | undefined {
  return blockRegistry[blockType]?.label;
}

/**
 * Check if a block type is valid/registered
 * 
 * @param blockType - The block type to validate
 * @returns True if the block type exists in the registry
 */
export function isValidBlockType(blockType: string): blockType is BlockType {
  return blockType in blockRegistry;
}

/**
 * Get the Zod schema for a specific block type
 * 
 * @param blockType - The type of block to get the schema for
 * @returns The Zod schema object or undefined if not found
 */
export function getBlockSchema(blockType: BlockType): z.ZodType<any> | undefined {
  return blockRegistry[blockType]?.schema;
}

/**
 * Get documentation for a specific block type
 * 
 * @param blockType - The type of block to get documentation for
 * @returns The documentation object or undefined if not found
 */
export function getBlockDocumentation(blockType: BlockType): BlockDefinition['documentation'] | undefined {
  return blockRegistry[blockType]?.documentation;
}

/**
 * Generate a union type for all block content types
 * This creates a discriminated union based on block type
 * 
 * @returns A TypeScript union type for all block content
 */
export type AllBlockContent =
  | ({ type: "text" } & TextBlockContent)
  | ({ type: "heading" } & HeadingBlockContent)
  | ({ type: "image" } & ImageBlockContent)
  | ({ type: "button" } & ButtonBlockContent)
  | ({ type: "posts_grid" } & PostsGridBlockContent)
  | ({ type: "section" } & SectionBlockContent)
  | ({ type: "hero" } & HeroBlockContent)
  | ({ type: "video_embed" } & VideoEmbedBlockContent)
  | ({ type: "form" } & FormBlockContent)
  | ({ type: "testimonial" } & TestimonialBlockContent);

/**
* Validate block content against its schema
 * Performs runtime validation based on the Zod schema definitions
 * 
 * @param blockType - The type of block to validate
 * @param content - The content to validate
 * @returns An object with validation results
 */
export function validateBlockContent(
  blockType: BlockType, 
  content: Record<string, any>
): { 
  isValid: boolean; 
  errors: string[]; 
  warnings: string[]; 
} {
  const schema = getBlockSchema(blockType);
  if (!schema) {
    return { isValid: false, errors: ['Block type not found in registry'], warnings: [] };
  }

  const result = schema.safeParse(content);

  if (result.success) {
    return { isValid: true, errors: [], warnings: [] };
  } else {
    // Format Zod errors
    const errors = result.error.errors.map(e => {
      const path = e.path.join('.');
      return path ? `${path}: ${e.message}` : e.message;
    });
    return { isValid: false, errors, warnings: [] };
  }
}

/**
 * Generate default content for a block type based on its schema
 * This is more comprehensive than initialContent as it includes all properties with defaults
 * 
 * @param blockType - The type of block
 * @returns Complete default content object
 */
export function generateDefaultContent(blockType: BlockType): Record<string, any> {
  // For Zod, initialContent is the best source of defaults as defined in the registry.
  // Zod schemas don't easily expose default values without parsing.
  // We return initialContent which is required to be valid against the schema.
  return getInitialContent(blockType) as Record<string, any> || {};
}





