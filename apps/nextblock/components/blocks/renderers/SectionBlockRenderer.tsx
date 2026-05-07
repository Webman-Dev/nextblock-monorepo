// components/blocks/renderers/SectionBlockRenderer.tsx
import React from "react";
import type { SectionBlockContent } from "../../../lib/blocks/blockRegistry";
import { getPublicBlockRendererLoader } from "../publicRendererLoaders";

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || "";
const ECOMMERCE_BLOCK_TYPES = new Set([
  "product_grid",
  "featured_product",
  "cart",
  "checkout",
  "product_details",
]);

function loadEcommerceBlockRenderer(blockType: string) {
  return import("../ecommerceRendererLoaders").then((module) =>
    module.loadEcommerceBlockRenderer(blockType)
  );
}

interface SectionBlockRendererProps {
  content: SectionBlockContent;
  languageId: number;
}

// Container class mapping
const containerClasses = {
  'full-width': 'w-full',
  'container': 'container mx-auto px-4',
  'container-sm': 'container mx-auto px-4 max-w-screen-sm',
  'container-lg': 'container mx-auto px-4 max-w-screen-lg',
  'container-xl': 'container mx-auto px-4 max-w-screen-xl'
};

// Column grid classes
const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
};

// Gap classes
const gapClasses = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8'
};

// Padding classes
const paddingClasses = {
  none: '',
  sm: 'py-2',
  md: 'py-4',
  lg: 'py-8',
  xl: 'py-12'
};

// Vertical alignment classes
const verticalAlignmentClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch'
};

// Background style generator
function generateBackgroundStyles(background: SectionBlockContent['background']) {
  const styles: React.CSSProperties = {};
  let className = '';

  switch (background.type) {
    case 'theme': {
      // Theme-based backgrounds using CSS classes
      const themeClasses = {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        muted: 'bg-muted text-muted-foreground',
        accent: 'bg-accent text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground'
      };
      className = background.theme ? themeClasses[background.theme] || '' : '';
      break;
    }
    
    case 'solid':
      styles.backgroundColor = background.solid_color;
      break;
    
    case 'gradient':
      if (background.gradient) {
        const { type, direction, stops } = background.gradient;
        const gradientStops = stops.map(stop => `${stop.color} ${stop.position}%`).join(', ');
        styles.background = `${type}-gradient(${direction || 'to right'}, ${gradientStops})`;
      }
      break;
    
    case 'image':
      if (background.image) {
        const imageUrl = `${R2_BASE_URL}/${background.image.object_key}`;
        styles.backgroundSize = background.image.size || 'cover';
        styles.backgroundPosition = background.image.position || 'center';

        let finalBackgroundImage = `url(${imageUrl})`;

        if (background.image.overlay && background.image.overlay.gradient) {
          const { type, direction, stops } = background.image.overlay.gradient;
          const gradientStops = stops.map(stop => `${stop.color} ${stop.position}%`).join(', ');
          const gradient = `${type}-gradient(${direction || 'to right'}, ${gradientStops})`;
          finalBackgroundImage = `${gradient}, ${finalBackgroundImage}`;
        }
        
        styles.backgroundImage = finalBackgroundImage;
      }
      break;
    
    default:
      // No background
      break;
  }

  return { styles, className };
}

interface NestedBlockRendererProps {
  block: SectionBlockContent['column_blocks'][0][0];
  languageId: number;
}

async function renderNestedBlock({ block, languageId }: NestedBlockRendererProps) {
  const rendererLoader = getPublicBlockRendererLoader(block.block_type);

  if (!rendererLoader) {
    if (ECOMMERCE_BLOCK_TYPES.has(block.block_type)) {
      const { default: EcommerceRendererComponent } = await loadEcommerceBlockRenderer(
        block.block_type
      );

      return (
        <EcommerceRendererComponent
          content={block.content}
          languageId={languageId}
        />
      );
    }

    return (
      <div className="p-2 border rounded bg-destructive/10 text-destructive text-sm">
        <strong>Unsupported block type:</strong> {block.block_type}
      </div>
    );
  }

  const { default: RendererComponent } = await rendererLoader();

  // Handle different prop requirements for different renderers
  if (block.block_type === 'posts_grid') {
    return (
      <RendererComponent
        content={block.content}
        languageId={languageId}
        block={{ ...block, id: 0, language_id: languageId, order: 0, created_at: '', updated_at: '' }}
      />
    );
  }

  return (
    <RendererComponent
      content={block.content}
      languageId={languageId}
    />
  );
}

export default async function SectionBlockRenderer({
  content,
  languageId,
}: SectionBlockRendererProps) {
  const { styles, className: backgroundClassName } = generateBackgroundStyles(content.background);

  // Build CSS classes
  const containerClass = containerClasses[content.container_type] || containerClasses.container;
  const gridClass = columnClasses[content.responsive_columns.desktop] || columnClasses[3];
  const gapClass = gapClasses[content.column_gap] || gapClasses.md;
  const paddingTopClass = paddingClasses[content.padding.top] || paddingClasses.md;
  const paddingBottomClass = paddingClasses[content.padding.bottom] || paddingClasses.md;
  const alignmentClass = content.vertical_alignment ? verticalAlignmentClasses[content.vertical_alignment] : 'items-start';

  const renderedColumns = await Promise.all(
    content.column_blocks.map(async (columnBlocks, columnIndex) => {
      const blocks = Array.isArray(columnBlocks) ? columnBlocks : [];
      const renderedBlocks = await Promise.all(
        blocks.map(async (block, blockIndex) => ({
          key: `${block.block_type}-${columnIndex}-${blockIndex}`,
          node: await renderNestedBlock({ block, languageId }),
        }))
      );

      return { columnIndex, renderedBlocks };
    })
  );

  return (
    <section
      className={`w-full ${paddingTopClass} ${paddingBottomClass} ${backgroundClassName}`.trim()}
      style={styles}
    >
      <div className={containerClass}>
        <div className={`grid ${gridClass} ${gapClass} ${alignmentClass}`}>
          {renderedColumns.map(({ columnIndex, renderedBlocks }) => (
            <div key={`column-${columnIndex}`} className="min-h-0 space-y-4">
              {renderedBlocks.map(({ key, node }) => (
                <React.Fragment key={key}>{node}</React.Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
