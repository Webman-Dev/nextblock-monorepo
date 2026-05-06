// components/BlockRenderer.tsx
import React from "react";
import type { Database } from "@nextblock-cms/db";
import type { SectionBlockContent } from "../lib/blocks/blockRegistry";
import { getPublicBlockRendererLoader } from "./blocks/publicRendererLoaders";

type Block = Database['public']['Tables']['blocks']['Row'];
import HeroBlockRenderer from "./blocks/renderers/HeroBlockRenderer"; // Static import for LCP
import ClientTextBlockRenderer from "./blocks/renderers/ClientTextBlockRenderer"; // Static import for client component

const ECOMMERCE_BLOCK_TYPES = new Set([
  "product_grid",
  "featured_product",
  "cart",
  "checkout",
  "product_details",
]);

function loadEcommerceBlockRenderer(blockType: string) {
  return import("./blocks/ecommerceRendererLoaders").then((module) =>
    module.loadEcommerceBlockRenderer(blockType)
  );
}

interface BlockRendererProps {
  blocks: Block[];
  languageId: number;
  excludeProductId?: string;
  excludeTranslationGroupId?: string | null;
}

interface BlockRenderContext {
  block: Block;
  languageId: number;
  excludeProductId?: string;
  excludeTranslationGroupId?: string | null;
}

async function renderLoadedBlock({
  block,
  languageId,
  excludeProductId,
  excludeTranslationGroupId,
}: BlockRenderContext) {
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
          excludeProductId={excludeProductId}
          excludeTranslationGroupId={excludeTranslationGroupId}
        />
      );
    }

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

  // Keep common LCP-adjacent text blocks out of the dynamic renderer manifest.
  if (block.block_type === 'text') {
    return <ClientTextBlockRenderer content={block.content as any} languageId={languageId} />;
  }

  const { default: RendererComponent } = await rendererLoader();

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
}

async function renderBlock(context: BlockRenderContext) {
  const { block, languageId } = context;

  if (block.block_type === 'hero') {
    return (
      <HeroBlockRenderer
        content={block.content as unknown as SectionBlockContent}
        languageId={languageId}
      />
    );
  }

  return renderLoadedBlock(context);
}

export default async function BlockRenderer({
  blocks,
  languageId,
  excludeProductId,
  excludeTranslationGroupId,
}: BlockRendererProps) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  const renderedBlocks = await Promise.all(
    blocks.map(async (block) => ({
      id: block.id,
      node: await renderBlock({
        block,
        languageId,
        excludeProductId,
        excludeTranslationGroupId,
      }),
    }))
  );

  return (
    <>
      {renderedBlocks.map(({ id, node }) => (
        <React.Fragment key={id}>{node}</React.Fragment>
      ))}
    </>
  );
}
