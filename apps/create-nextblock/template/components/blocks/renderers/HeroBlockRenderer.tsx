// components/blocks/renderers/HeroBlockRenderer.tsx
import React from "react";
import type { SectionBlockContent, Gradient } from "../../../lib/blocks/blockRegistry";
import Image from 'next/image';

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || "";
const HERO_BACKGROUND_DEFAULT_QUALITY = 60;

function resolveImageQuality(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const numeric =
    typeof value === 'number'
      ? value
      : Number.parseInt(String(value), 10);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const rounded = Math.round(numeric);
  if (rounded < 1 || rounded > 100) {
    return fallback;
  }

  return rounded;
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

  if (!background) {
    return { styles, className };
  }

  if (background.min_height) {
    styles.minHeight = background.min_height;
  }

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

function generateGradientString(gradient: Gradient) {
  const { type, direction, stops } = gradient;
  const gradientStops = stops.map((stop: { color: string; position: number }) => `${stop.color} ${stop.position}%`).join(', ');
  return `${type}-gradient(${direction || 'to right'}, ${gradientStops})`;
}

// Static imports for critical hero block components
import TextBlockRenderer from './TextBlockRenderer';
import ImageBlockRenderer from './ImageBlockRenderer';
import ButtonBlockRenderer from './ButtonBlockRenderer';
import HeadingBlockRenderer from './HeadingBlockRenderer';

// Static nested block renderer component for hero blocks (no dynamic imports)
const StaticNestedBlockRenderer: React.FC<{
  block: SectionBlockContent['column_blocks'][0][0];
  languageId: number;
}> = ({ block, languageId }) => {
  // Use static imports for common hero block components to eliminate loading delays
  switch (block.block_type) {
    case 'text':
      return (
        <TextBlockRenderer
          content={block.content as any}
          languageId={languageId}
        />
      );
    case 'heading':
      return (
        <HeadingBlockRenderer
          content={block.content as any}
          languageId={languageId}
        />
      );
    case 'image':
      return (
        <ImageBlockRenderer
          content={block.content as any}
          languageId={languageId}
          priority={true}
        />
      );
    case 'button':
      return (
        <ButtonBlockRenderer
          content={block.content as any}
          languageId={languageId}
        />
      );
    default:
      // Fallback for unsupported block types in hero
      return (
        <div className="p-2 border rounded bg-destructive/10 text-destructive text-sm">
          <strong>Unsupported hero block type:</strong> {block.block_type}
        </div>
      );
  }
};

const HeroBlockRenderer: React.FC<SectionBlockRendererProps> = ({
  content,
  languageId,
}) => {
  const { styles, className: backgroundClassName } = generateBackgroundStyles(content.background);
  
  const backgroundImage = content.background.type === 'image' ? content.background.image : undefined;
  
  if (backgroundImage) {
    delete styles.backgroundImage;
  }
  const heroImageQuality = resolveImageQuality(backgroundImage?.quality, HERO_BACKGROUND_DEFAULT_QUALITY);

  // Build CSS classes
  const containerClass = containerClasses[content.container_type] || containerClasses.container;
  const gridClass = columnClasses[content.responsive_columns?.desktop] || columnClasses[3];
  const gapClass = gapClasses[content.column_gap] || gapClasses.md;
  const paddingTopClass = paddingClasses[content.padding.top] || paddingClasses.md;
  const paddingBottomClass = paddingClasses[content.padding.bottom] || paddingClasses.md;
  const alignmentClass = content.vertical_alignment ? verticalAlignmentClasses[content.vertical_alignment] : 'items-start';

  const imageProps = backgroundImage?.blur_data_url
    ? {
        placeholder: 'blur' as const,
        blurDataURL: backgroundImage.blur_data_url,
      }
    : {};

  return (
    <section
      className={`relative w-full flex items-center ${paddingTopClass} ${paddingBottomClass} ${backgroundClassName}`.trim()}
      style={styles}
    >
      {backgroundImage && (
        <Image
          src={`${R2_BASE_URL}/${backgroundImage.object_key}`}
          alt={backgroundImage.alt_text || 'Hero background image'}
          fill
          style={{
            objectFit: backgroundImage.size || 'cover',
            objectPosition: backgroundImage.position || 'center'
          }}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
          priority={true}
          fetchPriority="high"
          quality={heroImageQuality}
          {...imageProps}
        />
      )}
      {backgroundImage?.overlay?.gradient && (
        <div
          className="absolute inset-0"
          style={{ background: generateGradientString(backgroundImage.overlay.gradient) }}
        />
      )}
      <div className={`${containerClass} relative`}>
        <div className={`grid ${gridClass} ${gapClass} ${alignmentClass}`}>
          {content.column_blocks.map((columnBlocks, columnIndex) => (
            <div key={`column-${columnIndex}`} className="min-h-0 space-y-4">
              {(Array.isArray(columnBlocks) ? columnBlocks : []).map((block, blockIndex) => (
                <StaticNestedBlockRenderer
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

export default HeroBlockRenderer;
