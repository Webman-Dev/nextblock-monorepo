/**
 * Block Registry System
 *
 * This module provides the central registry for all block types in the CMS.
 * It serves as the single source of truth for block definitions, including
 * their initial content, editor components, renderer components, and TypeScript
 * interface definitions. This eliminates the need to modify utils/supabase/types.ts
 * when adding new block types.
 */

/**
 * Content interface definitions for all block types
 * These provide proper TypeScript support with IDE IntelliSense and compile-time checking
 */

/**
 * Content interface for text blocks
 * Supports rich HTML content with WYSIWYG editing
 */
export interface TextBlockContent {
  /** Raw HTML content for the text block */
  html_content: string;
}

/**
 * Content interface for heading blocks
 * Provides semantic heading structure with configurable hierarchy levels
 */
export interface HeadingBlockContent {
  /** Heading level (1-6, corresponding to h1-h6 tags) */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** The text content of the heading */
  text_content: string;
  /** Text alignment of the heading */
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  /** Color of the heading text, based on theme colors */
  textColor?: 'primary' | 'secondary' | 'accent' | 'muted' | 'destructive' | 'background';
}

/**
 * Content interface for image blocks
 * Supports images with captions, alt text, and responsive sizing
 */
export interface ImageBlockContent {
  /** UUID of the media item from the 'media' table */
  media_id: string | null;
  /** The actual R2 object key (e.g., "uploads/image.png") */
  object_key?: string | null;
  /** Alternative text for accessibility */
  alt_text?: string;
  /** Optional caption displayed below the image */
  caption?: string;
  /** Image width in pixels */
  width?: number | null;
  /** Image height in pixels */
  height?: number | null;
}

/**
 * Content interface for button blocks
 * Customizable button/link component with multiple style variants
 */
export interface ButtonBlockContent {
  /** The text displayed on the button */
  text: string;
  /** The URL the button links to */
  url: string;
  /** Visual style variant of the button */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** Size of the button */
  size?: 'default' | 'sm' | 'lg';
}

/**
 * Content interface for posts grid blocks
 * Responsive grid layout for displaying blog posts with pagination
 */
export interface PostsGridBlockContent {
  /** Number of posts to display per page */
  postsPerPage: number;
  /** Number of columns in the grid layout */
  columns: number;
  /** Whether to show pagination controls */
  showPagination: boolean;
  /** Optional title displayed above the posts grid */
  title?: string;
}

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

/**
 * Content interface for section blocks
 * Provides flexible column layouts with responsive breakpoints and background options
 */
export interface Gradient {
  type: 'linear' | 'radial';
  direction?: string;
  stops: Array<{ color: string; position: number }>;
}

export interface SectionBlockContent {
  /** Container width type */
  container_type: 'full-width' | 'container' | 'container-sm' | 'container-lg' | 'container-xl';
  /** Background configuration */
  background: {
    type: 'none' | 'theme' | 'solid' | 'gradient' | 'image';
    theme?: 'primary' | 'secondary' | 'muted' | 'accent' | 'destructive';
    solid_color?: string;
    min_height?: string;
    gradient?: Gradient;
    image?: {
      media_id: string;
      object_key: string;
      alt_text?: string;
      width?: number;
      height?: number;
      blur_data_url?: string;
      size: 'cover' | 'contain';
      position: 'center' | 'top' | 'bottom' | 'left' | 'right';
      overlay?: {
        type: 'gradient';
        gradient: Gradient;
      };
    };
  };
  /** Responsive column configuration */
  responsive_columns: {
    mobile: 1 | 2;
    tablet: 1 | 2 | 3;
    desktop: 1 | 2 | 3 | 4;
  };
  /** Gap between columns */
  column_gap: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Section padding */
  padding: {
    top: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    bottom: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  };
  /** Array of blocks within columns - 2D array where each index represents a column */
  column_blocks: Array<Array<{
    block_type: BlockType;
    content: Record<string, any>;
    temp_id?: string; // For client-side management before save
  }>>;
}

/**
 * Content interface for hero blocks
 * A specialized version of the section block for page headers
 */
export type HeroBlockContent = SectionBlockContent;

/**
 * Represents a single option for select, radio, or checkbox group fields.
 */
export interface FormFieldOption {
  label: string;
  value: string;
}

/**
 * Represents a single field within the form block.
 */
export interface FormField {
  temp_id: string; // For client-side keying and reordering
  field_type: 'text' | 'email' | 'textarea' | 'select' | 'radio' | 'checkbox';
  label: string;
  placeholder?: string;
  is_required: boolean;
  options?: FormFieldOption[];
}

/**
 * Content interface for the main form block.
 */
export interface FormBlockContent {
  /** The email address where form submissions will be sent. */
  recipient_email: string;
  /** The text to display on the submit button. */
  submit_button_text: string;
  /** The message to show after a successful submission. */
  success_message: string;
  /** An array of form field configurations. */
  fields: FormField[];
}

/**
 * Available block types - defined here as the source of truth
 */
export const availableBlockTypes = ["text", "heading", "image", "button", "posts_grid", "video_embed", "section", "hero", "form"] as const;
export type BlockType = (typeof availableBlockTypes)[number];

/**
 * Property definition for content schema
 */
export interface ContentPropertyDefinition {
  /** The TypeScript type of the property */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'union';
  /** Whether this property is required */
  required?: boolean;
  /** Human-readable description of the property */
  description?: string;
  /** Default value for the property */
  default?: any;
  /** For union types, the possible values */
  unionValues?: readonly string[];
  /** For array types, the type of array elements */
  arrayElementType?: string;
  /** Additional constraints or validation info */
  constraints?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: readonly any[];
  };
}

/**
 * Enhanced block definition interface with generic type parameter
 * Links the TypeScript interface to the block definition for better type safety
 */
export interface BlockDefinition<T = any> {
  /** The unique identifier for the block type */
  type: BlockType;
  /** User-friendly display name for the block */
  label: string;
  /** Optional icon for the block, using lucide-react icon names */
  icon?: string;
  /** Default content structure for new blocks of this type */
  initialContent: T;
  /** Filename of the editor component (assumed to be in app/cms/blocks/editors/) */
  editorComponentFilename: string;
  /** Filename of the renderer component (assumed to be in components/blocks/renderers/) */
  rendererComponentFilename: string;
  /** Optional filename for specific preview components */
  previewComponentFilename?: string;
  /**
   * Structured schema defining the content properties, types, and constraints.
   * Used for validation, documentation, and potential runtime type checking.
   */
  contentSchema: Record<string, ContentPropertyDefinition>;
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
    initialContent: { html_content: "<p>New text block...</p>" } as TextBlockContent,
    editorComponentFilename: "TextBlockEditor.tsx",
    rendererComponentFilename: "TextBlockRenderer.tsx",
    contentSchema: {
      html_content: {
        type: 'string',
        required: true,
        description: 'Rich text content for the text block',
        default: '<p>New text block...</p>',
      },
    },
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
    contentSchema: {
      level: {
        type: 'union',
        required: true,
        description: 'Heading level (1-6, corresponding to h1-h6 tags)',
        default: 1,
        unionValues: ['1', '2', '3', '4', '5', '6'] as const,
        constraints: {
          min: 1,
          max: 6,
          enum: [1, 2, 3, 4, 5, 6] as const,
        },
      },
      text_content: {
        type: 'string',
        required: true,
        description: 'The text content of the heading',
        default: 'New Heading',
      },
      textAlign: {
        type: 'union',
        required: false,
        description: 'Text alignment of the heading',
        default: 'left',
        unionValues: ['left', 'center', 'right', 'justify'] as const,
        constraints: {
          enum: ['left', 'center', 'right', 'justify'] as const,
        },
      },
      textColor: {
        type: 'union',
        required: false,
        description: 'Color of the heading text, based on theme colors',
        default: undefined, // Or a specific default like 'primary' if desired
        unionValues: ['primary', 'secondary', 'accent', 'muted', 'destructive'] as const,
        constraints: {
          enum: ['primary', 'secondary', 'accent', 'muted', 'destructive'] as const,
        },
      },
    },
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
    contentSchema: {
      media_id: {
        type: 'string',
        required: false,
        description: 'UUID of the media item from the media table',
        default: null,
      },
      object_key: {
        type: 'string',
        required: false,
        description: 'The actual R2 object key (e.g., "uploads/image.png")',
        default: null,
      },
      alt_text: {
        type: 'string',
        required: false,
        description: 'Alternative text for accessibility',
        default: '',
      },
      caption: {
        type: 'string',
        required: false,
        description: 'Optional caption displayed below the image',
        default: '',
      },
      width: {
        type: 'number',
        required: false,
        description: 'Image width in pixels',
        default: null,
      },
      height: {
        type: 'number',
        required: false,
        description: 'Image height in pixels',
        default: null,
      },
    },
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
    initialContent: { text: "Click Me", url: "#", variant: "default", size: "default" } as ButtonBlockContent,
    editorComponentFilename: "ButtonBlockEditor.tsx",
    rendererComponentFilename: "ButtonBlockRenderer.tsx",
    contentSchema: {
      text: {
        type: 'string',
        required: true,
        description: 'The text displayed on the button',
        default: 'Click Me',
      },
      url: {
        type: 'string',
        required: true,
        description: 'The URL the button links to',
        default: '#',
      },
      variant: {
        type: 'union',
        required: false,
        description: 'Visual style variant of the button',
        default: 'default',
        unionValues: ['default', 'outline', 'secondary', 'ghost', 'link'] as const,
        constraints: {
          enum: ['default', 'outline', 'secondary', 'ghost', 'link'] as const,
        },
      },
      size: {
        type: 'union',
        required: false,
        description: 'Size of the button',
        default: 'default',
        unionValues: ['default', 'sm', 'lg'] as const,
        constraints: {
          enum: ['default', 'sm', 'lg'] as const,
        },
      },
    },
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
    contentSchema: {
      postsPerPage: {
        type: 'number',
        required: true,
        description: 'Number of posts to display per page',
        default: 12,
        constraints: {
          min: 1,
          max: 50,
        },
      },
      columns: {
        type: 'number',
        required: true,
        description: 'Number of columns in the grid layout',
        default: 3,
        constraints: {
          min: 1,
          max: 6,
        },
      },
      showPagination: {
        type: 'boolean',
        required: true,
        description: 'Whether to show pagination controls',
        default: true,
      },
      title: {
        type: 'string',
        required: false,
        description: 'Optional title displayed above the posts grid',
        default: 'Recent Posts',
      },
    },
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
  
  section: {
    type: "section",
    label: "Section Layout",
    icon: "Columns3",
    initialContent: {
      container_type: "container",
      background: { type: "none" },
      responsive_columns: { mobile: 1, tablet: 2, desktop: 3 },
      column_gap: "md",
      padding: { top: "md", bottom: "md" },
      column_blocks: [
        [{ block_type: "text", content: { html_content: "<p>Column 1</p>" } }],
        [{ block_type: "text", content: { html_content: "<p>Column 2</p>" } }],
        [{ block_type: "text", content: { html_content: "<p>Column 3</p>" } }]
      ]
    } as SectionBlockContent,
    editorComponentFilename: "SectionBlockEditor.tsx",
    rendererComponentFilename: "SectionBlockRenderer.tsx",
    contentSchema: {
      container_type: {
        type: 'union',
        required: true,
        description: 'Container width type',
        default: 'container',
        unionValues: ['full-width', 'container', 'container-sm', 'container-lg', 'container-xl'] as const,
        constraints: {
          enum: ['full-width', 'container', 'container-sm', 'container-lg', 'container-xl'] as const,
        },
      },
      background: {
        type: 'object',
        required: true,
        description: 'Background configuration',
        default: { type: 'none' },
      },
      responsive_columns: {
        type: 'object',
        required: true,
        description: 'Responsive column configuration',
        default: { mobile: 1, tablet: 2, desktop: 3 },
      },
      column_gap: {
        type: 'union',
        required: true,
        description: 'Gap between columns',
        default: 'md',
        unionValues: ['none', 'sm', 'md', 'lg', 'xl'] as const,
        constraints: {
          enum: ['none', 'sm', 'md', 'lg', 'xl'] as const,
        },
      },
      padding: {
        type: 'object',
        required: true,
        description: 'Section padding configuration',
        default: { top: 'md', bottom: 'md' },
      },
      column_blocks: {
        type: 'array',
        required: true,
        description: 'Array of blocks within columns',
        default: [],
        arrayElementType: 'object',
      },
    },
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
    contentSchema: {
      // The content schema is inherited from SectionBlockContent, so we don't need to redefine it here.
      // We could add specific validation for the hero block if needed in the future.
    },
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
    contentSchema: {
      recipient_email: {
        type: 'string',
        required: true,
        description: 'The email address where form submissions will be sent.',
        default: 'your-email@example.com',
      },
      submit_button_text: {
          type: 'string',
          required: true,
          description: 'The text to display on the submit button.',
          default: 'Submit',
      },
      success_message: {
          type: 'string',
          required: true,
          description: 'The message shown to the user after successful submission.',
          default: 'Thank you for your submission!',
      },
      fields: {
        type: 'array',
        required: true,
        description: 'The fields that make up the form.',
        default: [],
        arrayElementType: 'object',
      },
    },
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
 * Get the content schema for a specific block type
 * 
 * @param blockType - The type of block to get the schema for
 * @returns The content schema object or undefined if not found
 */
export function getContentSchema(blockType: BlockType): Record<string, ContentPropertyDefinition> | undefined {
  return blockRegistry[blockType]?.contentSchema;
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
  | ({ type: "form" } & FormBlockContent);

/**
* Validate block content against its schema
 * Performs runtime validation based on the content schema definitions
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
  const schema = getContentSchema(blockType);
  if (!schema) {
    return { isValid: false, errors: ['Block type not found in registry'], warnings: [] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required properties
  for (const [propertyName, propertyDef] of Object.entries(schema)) {
    if (propertyDef.required && (content[propertyName] === undefined || content[propertyName] === null)) {
      errors.push(`Required property '${propertyName}' is missing`);
    }
  }

  // Check property types and constraints
  for (const [propertyName, value] of Object.entries(content)) {
    const propertyDef = schema[propertyName];
    if (!propertyDef) {
      warnings.push(`Property '${propertyName}' is not defined in schema`);
      continue;
    }

    // Type checking
    const actualType = typeof value;
    if (propertyDef.type === 'string' && actualType !== 'string') {
      errors.push(`Property '${propertyName}' should be a string, got ${actualType}`);
    } else if (propertyDef.type === 'number' && actualType !== 'number') {
      errors.push(`Property '${propertyName}' should be a number, got ${actualType}`);
    } else if (propertyDef.type === 'boolean' && actualType !== 'boolean') {
      errors.push(`Property '${propertyName}' should be a boolean, got ${actualType}`);
    }

    // Constraint checking
    if (propertyDef.constraints) {
      const constraints = propertyDef.constraints;
      
      if (typeof value === 'number') {
        if (constraints.min !== undefined && value < constraints.min) {
          errors.push(`Property '${propertyName}' should be at least ${constraints.min}, got ${value}`);
        }
        if (constraints.max !== undefined && value > constraints.max) {
          errors.push(`Property '${propertyName}' should be at most ${constraints.max}, got ${value}`);
        }
      }

      if (constraints.enum && !constraints.enum.includes(value)) {
        errors.push(`Property '${propertyName}' should be one of [${constraints.enum.join(', ')}], got ${value}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get property information for a specific block type and property
 * Useful for building dynamic forms or documentation
 * 
 * @param blockType - The type of block
 * @param propertyName - The name of the property
 * @returns Property definition or undefined if not found
 */
export function getPropertyDefinition(
  blockType: BlockType, 
  propertyName: string
): ContentPropertyDefinition | undefined {
  const schema = getContentSchema(blockType);
  return schema?.[propertyName];
}

/**
 * Get all property names for a specific block type
 * 
 * @param blockType - The type of block
 * @returns Array of property names
 */
export function getPropertyNames(blockType: BlockType): string[] {
  const schema = getContentSchema(blockType);
  return schema ? Object.keys(schema) : [];
}

/**
 * Get required property names for a specific block type
 * 
 * @param blockType - The type of block
 * @returns Array of required property names
 */
export function getRequiredProperties(blockType: BlockType): string[] {
  const schema = getContentSchema(blockType);
  if (!schema) return [];
  
  return Object.entries(schema)
    .filter(([_, def]) => def.required)
    .map(([name, _]) => name);
}

/**
 * Generate default content for a block type based on its schema
 * This is more comprehensive than initialContent as it includes all properties with defaults
 * 
 * @param blockType - The type of block
 * @returns Complete default content object
 */
export function generateDefaultContent(blockType: BlockType): Record<string, any> {
  const schema = getContentSchema(blockType);
  const initialContent = getInitialContent(blockType) || {};
  
  if (!schema) return initialContent;

  const defaultContent: Record<string, any> = { ...initialContent };

  for (const [propertyName, propertyDef] of Object.entries(schema)) {
    if (defaultContent[propertyName] === undefined && propertyDef.default !== undefined) {
      defaultContent[propertyName] = propertyDef.default;
    }
  }

  return defaultContent;
}