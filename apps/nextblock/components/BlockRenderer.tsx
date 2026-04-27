 // components/BlockRenderer.tsx
import React from "react";
import dynamic from "next/dynamic";
import type { Database } from "@nextblock-cms/db";
import type { SectionBlockContent } from "../lib/blocks/blockRegistry";
import { getPublicBlockRendererLoader } from "./blocks/publicRendererLoaders";

type Block = Database['public']['Tables']['blocks']['Row'];
import HeroBlockRenderer from "./blocks/renderers/HeroBlockRenderer"; // Static import for LCP
import ClientTextBlockRenderer from "./blocks/renderers/ClientTextBlockRenderer"; // Static import for client component

interface BlockRendererProps {
  blocks: Block[];
  languageId: number;
  excludeProductId?: string;
  excludeTranslationGroupId?: string | null;
}

interface DynamicBlockRendererProps {
  block: Block;
  languageId: number;
  excludeProductId?: string;
  excludeTranslationGroupId?: string | null;
}

// Dynamic renderer component that handles the dynamic import logic for non-LCP blocks
const DynamicBlockRenderer: React.FC<DynamicBlockRendererProps> = ({
  block,
  languageId,
  excludeProductId,
  excludeTranslationGroupId,
}) => {
  const rendererLoader = getPublicBlockRendererLoader(block.block_type);
  
  if (!rendererLoader) {
    return (
      <div
        key={block.id}
        className="my-4 p-4 border rounded bg-destructive/10 text-destructive"
      >
        <p>
          <strong>Unsupported block type:</strong> {block.block_type}
        </p>
        <pre className="text-xs whitespace-pre-wrap">
          {JSON.stringify(block.content, null, 2)}
        </pre>
      </div>
    );
  }

  // Handle the text block type by rendering the client component wrapper
  if (block.block_type === 'text') {
    return <ClientTextBlockRenderer content={block.content as any} languageId={languageId} />;
  }

  // Create dynamic component with proper SSR handling for other blocks
  const RendererComponent = dynamic(
    rendererLoader,
    {
      loading: () => (
        <div className="my-4 p-4 border rounded-lg">
          <div className="h-8 w-1/2 mb-4 bg-muted/40 animate-pulse rounded" />
          <div className="h-4 w-full mb-2 bg-muted/40 animate-pulse rounded" />
          <div className="h-4 w-full mb-2 bg-muted/40 animate-pulse rounded" />
          <div className="h-4 w-3/4 bg-muted/40 animate-pulse rounded" />
        </div>
      ),
      ssr: true,
    }
  ) as React.ComponentType<any>;

  // Handle different prop requirements for different renderers
  // PostsGridBlockRenderer needs the full block object
  if (block.block_type === 'posts_grid') {
    return (
      <RendererComponent
        content={block.content}
        languageId={languageId}
        block={block}
      />
    );
  }

  return (
    <RendererComponent
      content={block.content}
      languageId={languageId}
      excludeProductId={excludeProductId}
      excludeTranslationGroupId={excludeTranslationGroupId}
    />
  );
};

const BlockRenderer: React.FC<BlockRendererProps> = ({
  blocks,
  languageId,
  excludeProductId,
  excludeTranslationGroupId,
}) => {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <>
      {blocks.map((block) => {
        // Statically render the Hero block for LCP optimization
        if (block.block_type === 'hero') {
          return (
            <HeroBlockRenderer
              key={block.id}
              content={block.content as unknown as SectionBlockContent}
              languageId={languageId}
            />
          );
        }
        // Dynamically render all other blocks
        return (
          <DynamicBlockRenderer
            key={block.id}
            block={block}
            languageId={languageId}
            excludeProductId={excludeProductId}
            excludeTranslationGroupId={excludeTranslationGroupId}
          />
        );
      })}
    </>
  );
};

export default BlockRenderer;
