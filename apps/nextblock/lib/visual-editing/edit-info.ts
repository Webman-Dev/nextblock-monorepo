import "server-only";

import type {
  NextblockVisualEditInfo,
  VisualEditAttributes,
  VisualEditingBlockTarget,
  VisualEditingDocumentContext,
} from "./types";

function getEditUrl(
  documentType: VisualEditingDocumentContext["documentType"],
  documentId: number | string,
  baseUrl: string
) {
  const path = documentType === "product"
    ? `/cms/products/${documentId}/edit`
    : documentType === "page"
      ? `/cms/pages/${documentId}/edit`
      : `/cms/posts/${documentId}/edit`;
  return `${baseUrl}${path}`;
}

export function buildVisualEditAttributes(
  context: VisualEditingDocumentContext | undefined,
  target: VisualEditingBlockTarget
): VisualEditAttributes | undefined {
  if (!context?.enabled) {
    return undefined;
  }

  const baseUrl = 
    process.env.NEXT_PUBLIC_URL || 
    process.env.TARGET_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") || 
    "http://localhost:3000";

  const pageOrigin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXT_PUBLIC_URL || process.env.TARGET_URL || "http://localhost:3000");

  const origin = pageOrigin.replace(/\/+$/, "");

  const payload: NextblockVisualEditInfo = {
    origin,
    baseUrl: baseUrl,
    editUrl: getEditUrl(context.documentType, context.documentId, baseUrl),
    data: {
      parentType: context.documentType,
      parentId: context.documentId,
      slug: context.slug,
      languageId: context.languageId,
      draftId: context.draftId ?? null,
      target,
    },
  };

  const projectId = process.env.NEXTBLOCK_VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID;
  if (projectId) {
    payload.projectId = projectId;
  }

  const workspaceId = process.env.NEXTBLOCK_VERCEL_WORKSPACE_ID || process.env.VERCEL_ORG_ID;
  if (workspaceId) {
    payload.workspaceId = workspaceId;
  }

  return {
    "data-vercel-edit-info": JSON.stringify(payload),
    "data-vercel-edit-target": JSON.stringify(target),
    "data-nextblock-visual-edit": `${target.kind}:${target.blockType}`,
  };
}
