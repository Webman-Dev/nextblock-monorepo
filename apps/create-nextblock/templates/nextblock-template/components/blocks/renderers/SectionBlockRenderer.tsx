// components/blocks/renderers/SectionBlockRenderer.tsx
import React from "react";
import type { SectionBlockContent } from "../../../lib/blocks/blockRegistry";
import { getBlockDefinition } from "../../../lib/blocks/blockRegistry";
import dynamic from "next/dynamic";

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || "";

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

// Dynamic block renderer component
const DynamicNestedBlockRenderer: React.FC<{
  block: SectionBlockContent['column_blocks'][0][0];
  languageId: number;
}> = ({ block, languageId }) => {
  const blockDefinition = getBlockDefinition(block.block_type);
  
  if (!blockDefinition) {
    return (
      <div className="p-2 border rounded bg-destructive/10 text-destructive text-sm">
        <strong>Unsupported block type:</strong> {block.block_type}
      </div>
    );
  }

  // Create dynamic component with proper SSR handling
  const RendererComponent = dynamic(
    () => import(`./${blockDefinition.rendererComponentFilename}`),
    {
      loading: () => (
        <div className="animate-pulse bg-muted rounded h-8"></div>
      ),
      ssr: true,
    }
  ) as React.ComponentType<any>;

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
};

const SectionBlockRenderer: React.FC<SectionBlockRendererProps> = ({
  content,
  languageId,
}) => {
  const { styles, className: backgroundClassName } = generateBackgroundStyles(content.background);
  
  // Build CSS classes
  const containerClass = containerClasses[content.container_type] || containerClasses.container;
  const gridClass = columnClasses[content.responsive_columns.desktop] || columnClasses[3];
  const gapClass = gapClasses[content.column_gap] || gapClasses.md;
  const paddingTopClass = paddingClasses[content.padding.top] || paddingClasses.md;
  const paddingBottomClass = paddingClasses[content.padding.bottom] || paddingClasses.md;
  const alignmentClass = content.vertical_alignment ? verticalAlignmentClasses[content.vertical_alignment] : 'items-start';

  return (
    <section
      className={`w-full ${paddingTopClass} ${paddingBottomClass} ${backgroundClassName}`.trim()}
      style={styles}
    >
      <div className={containerClass}>
        <div className={`grid ${gridClass} ${gapClass} ${alignmentClass}`}>
          {content.column_blocks.map((columnBlocks, columnIndex) => (
            <div key={`column-${columnIndex}`} className="min-h-0 space-y-4">
              {(Array.isArray(columnBlocks) ? columnBlocks : []).map((block, blockIndex) => (
                <DynamicNestedBlockRenderer
                  key={`${block.block_type}-${columnIndex}-${blockIndex}`}
                  block={block}
                  languageId={languageId}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SectionBlockRenderer;