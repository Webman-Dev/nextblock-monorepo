// components/BlockRenderer.tsx
import React from "react";
import type { Database } from "@nextblock-cms/db";
import type { SectionBlockContent } from "../lib/blocks/blockRegistry";
import { buildVisualEditAttributes } from "../lib/visual-editing/edit-info";
import type {
  VisualEditAttributes,
  VisualEditingDocumentContext,
} from "../lib/visual-editing/types";
import { getPublicBlockRendererLoader } from "./blocks/publicRendererLoaders";
import { createClient as createSupabaseServerClient } from "@nextblock-cms/db/server";
import { headers } from "next/headers";

type Block = Database['public']['Tables']['blocks']['Row'];
import SectionBlockRenderer from "./blocks/renderers/SectionBlockRenderer"; // Static import for LCP
import ClientTextBlockRenderer from "./blocks/renderers/ClientTextBlockRenderer"; // Static import for client component
import { getCachedCustomBlockDefinitionBySlug } from "../lib/custom-block-definitions";
import { CachedDynamicLayoutEngine } from "./renderers/CachedDynamicLayoutEngine";
import { resolveBlockRelations } from "../lib/resolve-block-relations";
import { substitutePrivacyMergeTags } from "../lib/privacy/contact-emails";

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
  visualEditing?: VisualEditingDocumentContext;
  productVisualEditingEnabled?: boolean;
}

interface BlockRenderContext {
  block: Block;
  blockIndex: number;
  languageId: number;
  excludeProductId?: string;
  excludeTranslationGroupId?: string | null;
  visualEditing?: VisualEditingDocumentContext;
  productVisualEditingEnabled?: boolean;
  visualEditAttributes?: VisualEditAttributes;
  botProtectionPublic?: {
    provider: 'none' | 'turnstile' | 'recaptcha';
    siteKey: string;
  };
  scriptNonce?: string;
}

async function renderLoadedBlock({
  block,
  blockIndex,
  languageId,
  excludeProductId,
  excludeTranslationGroupId,
  visualEditing,
  productVisualEditingEnabled,
  visualEditAttributes,
  botProtectionPublic,
  scriptNonce,
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
          visualEditAttributes={visualEditAttributes}
          productVisualEditingEnabled={productVisualEditingEnabled}
          visualEditing={visualEditing}
        />
      );
    }

    const definition = await getCachedCustomBlockDefinitionBySlug(block.block_type);
    if (definition) {
      const resolvedBlock = (await resolveBlockRelations({
        data: block.content as Record<string, any>,
        fields: definition.fields,
      })) as any;

      return (
        <div key={block.id} {...visualEditAttributes}>
          <CachedDynamicLayoutEngine
            definition={definition}
            layoutSchema={definition.layout_schema}
            fields={definition.fields}
            data={{
              ...(resolvedBlock.data || {}),
              resolved_relations: resolvedBlock.resolved_relations || {},
            }}
          />
        </div>
      );
    }

    // No renderer and no matching custom block definition. Public visitors
    // should never see a raw error/JSON dump, so only surface the diagnostic
    // when visual editing is actually enabled (the page always passes a
    // visualEditing object, so check the enabled flag); otherwise render nothing.
    if (!visualEditing?.enabled) {
      return null;
    }

    return (
      <div
        key={block.id}
        className="my-4 p-4 border rounded bg-destructive/10 text-destructive"
        {...visualEditAttributes}
      >
        <p>
          <strong>Unsupported block type:</strong> {block.block_type}
        </p>
        <p className="text-xs mt-1">
          No custom block definition was found for the slug{' '}
          <code>{block.block_type}</code>. Save a custom block with this exact slug,
          or re-add the block from the picker.
        </p>
        <pre className="text-xs whitespace-pre-wrap mt-2">
          {JSON.stringify(block.content, null, 2)}
        </pre>
      </div>
    );
  }

  // Keep common LCP-adjacent text blocks out of the dynamic renderer manifest.
  if (block.block_type === 'text') {
    // Top-level text blocks bypass the server TextBlockRenderer, so resolve any
    // merge tags (e.g. {{privacy_email}} on the Privacy/Terms pages) here.
    const textContent = block.content as { html_content?: string } | null;
    const rawHtml = typeof textContent?.html_content === 'string' ? textContent.html_content : '';
    const html = rawHtml.includes('{{')
      ? await substitutePrivacyMergeTags(rawHtml)
      : rawHtml;
    return (
      <ClientTextBlockRenderer
        content={{ ...(textContent as any), html_content: html }}
        languageId={languageId}
        visualEditAttributes={visualEditAttributes}
      />
    );
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
        visualEditAttributes={visualEditAttributes}
      />
    );
  }

  return (
    <RendererComponent
      content={block.content}
      languageId={languageId}
      excludeProductId={excludeProductId}
      excludeTranslationGroupId={excludeTranslationGroupId}
      visualEditAttributes={visualEditAttributes}
      productVisualEditingEnabled={productVisualEditingEnabled}
      visualEditing={visualEditing}
      parentBlockId={block.id}
      parentBlockIndex={blockIndex}
      botProtectionPublic={botProtectionPublic}
      scriptNonce={scriptNonce}
    />
  );
}

async function renderBlock(context: BlockRenderContext) {
  const { block, blockIndex, languageId, visualEditAttributes, visualEditing } = context;

  if (block.block_type === 'section') {
    return (
      <SectionBlockRenderer
        content={block.content as unknown as SectionBlockContent}
        languageId={languageId}
        visualEditAttributes={visualEditAttributes}
        visualEditing={visualEditing}
        parentBlockId={block.id}
        parentBlockIndex={blockIndex}
        blockType={block.block_type}
        botProtectionPublic={context.botProtectionPublic}
        scriptNonce={context.scriptNonce}
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
  visualEditing,
  productVisualEditingEnabled,
}: BlockRendererProps) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  let botProtectionPublic: { provider: 'none' | 'turnstile' | 'recaptcha'; siteKey: string } | undefined;
  let scriptNonce = '';

  try {
    scriptNonce = (await headers()).get('x-nonce') || '';
  } catch (e) {
    console.error("[Bot Protection] Error loading CSP nonce in BlockRenderer:", e);
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: publicSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'bot_protection_public')
      .maybeSingle();
    if (publicSetting?.value) {
      const publicVal = publicSetting.value as Record<string, any>;
      botProtectionPublic = {
        provider: publicVal.provider || 'none',
        siteKey: publicVal.siteKey || '',
      };
    }
  } catch (e) {
    console.error("[Bot Protection] Error loading settings in BlockRenderer:", e);
  }

  const renderedBlocks = await Promise.all(
    blocks.map(async (block, blockIndex) => ({
      id: block.id,
      node: await renderBlock({
        block,
        blockIndex,
        languageId,
        excludeProductId,
        excludeTranslationGroupId,
        visualEditing,
        productVisualEditingEnabled,
        botProtectionPublic,
        scriptNonce,
        visualEditAttributes: buildVisualEditAttributes(visualEditing, {
          kind: "top-level",
          blockId: block.id,
          blockIndex,
          blockType: block.block_type,
        }),
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
