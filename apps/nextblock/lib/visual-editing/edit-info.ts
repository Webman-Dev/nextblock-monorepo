import "server-only";

import type {
  NextblockVisualEditInfo,
  VisualEditAttributes,
  VisualEditingBlockTarget,
  VisualEditingDocumentContext,
} from "./types";

function getEditUrl(documentType: VisualEditingDocumentContext["documentType"], documentId: number | string) {
  if (documentType === "product") {
    return `/cms/products/${documentId}/edit`;
  }
  return documentType === "page"
    ? `/cms/pages/${documentId}/edit`
    : `/cms/posts/${documentId}/edit`;
}

export function buildVisualEditAttributes(
  context: VisualEditingDocumentContext | undefined,
  target: VisualEditingBlockTarget
): VisualEditAttributes | undefined {
  if (!context?.enabled) {
    return undefined;
  }

  const deploymentUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : (process.env.NEXT_PUBLIC_URL || "http://localhost:3000");

  const payload: NextblockVisualEditInfo = {
    origin: deploymentUrl,
    editUrl: getEditUrl(context.documentType, context.documentId),
    data: {
      parentType: context.documentType,
      parentId: context.documentId,
      slug: context.slug,
      languageId: context.languageId,
      draftId: context.draftId ?? null,
      target,
    },
  };

  if (process.env.NEXTBLOCK_VERCEL_PROJECT_ID) {
    payload.projectId = process.env.NEXTBLOCK_VERCEL_PROJECT_ID;
  }

  if (process.env.NEXTBLOCK_VERCEL_WORKSPACE_ID) {
    payload.workspaceId = process.env.NEXTBLOCK_VERCEL_WORKSPACE_ID;
  }

  return {
    "data-vercel-edit-info": JSON.stringify(payload),
    "data-vercel-edit-target": JSON.stringify(target),
    "data-nextblock-visual-edit": `${target.kind}:${target.blockType}`,
  };
}
