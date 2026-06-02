import type { Json } from "@nextblock-cms/db";

export type NextblockDocumentType = "page" | "post";
export type NextblockVisualDocumentType = NextblockDocumentType | "product";

export interface TiptapJsonNode {
  type: string;
  attrs?: Record<string, Json>;
  content?: TiptapJsonNode[];
  marks?: Array<{
    type: string;
    attrs?: Record<string, Json>;
  }>;
  text?: string;
}

export interface DraftBlockSnapshot {
  id?: number;
  page_id?: number | null;
  post_id?: number | null;
  product_id?: string | null;
  language_id: number;
  block_type: string;
  content: Json;
  order: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ContentDraftSnapshot {
  meta: Record<string, Json>;
  blocks: DraftBlockSnapshot[];
}

export interface ContentDraftRow extends ContentDraftSnapshot {
  id: number;
  parent_type: NextblockDocumentType;
  parent_id: number;
  author_id: string | null;
  base_version: number;
  created_at: string;
  updated_at: string;
}

export type VisualEditingBlockTarget =
  | {
      kind: "top-level";
      blockId: number;
      blockIndex: number;
      blockType: string;
    }
  | {
      kind: "nested";
      parentBlockId: number;
      parentBlockIndex: number;
      parentBlockType: "section";
      columnIndex: number;
      blockIndex: number;
      blockType: string;
    };

export type ProductVisualEditingField =
  | "title"
  | "short_description"
  | "description_json";

export type ProductVisualEditingInput = "plain-text" | "html" | "tiptap";

export interface VisualEditingProductFieldTarget {
  kind: "product-field";
  field: ProductVisualEditingField;
  input: ProductVisualEditingInput;
  label: string;
}

export type VisualEditingTarget =
  | VisualEditingBlockTarget
  | VisualEditingProductFieldTarget;

export interface NextblockVisualEditInfo {
  origin: string;
  baseUrl?: string;
  projectId?: string;
  workspaceId?: string;
  editUrl: string;
  data: {
    parentType: NextblockVisualDocumentType;
    parentId: number | string;
    slug: string;
    languageId: number;
    draftId?: number | null;
    target: VisualEditingTarget;
  };
}

export interface VisualEditingDocumentContext {
  enabled: boolean;
  documentType: NextblockVisualDocumentType;
  documentId: number | string;
  slug: string;
  languageId: number;
  draftId?: number | null;
  pageOrigin?: string;
}

export type VisualEditAttributes = {
  "data-vercel-edit-info"?: string;
  "data-vercel-edit-target"?: string;
  "data-nextblock-visual-edit"?: string;
};

export interface VisualEditingBlockRequest {
  parentType: NextblockVisualDocumentType;
  parentId: number | string;
  target: VisualEditingBlockTarget;
}

export interface VisualEditingProductFieldRequest {
  parentType: "product";
  parentId: string;
  target: VisualEditingProductFieldTarget;
}
