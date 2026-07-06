import { beforeEach, describe, expect, it, vi } from "vitest";

const draftContentMocks = vi.hoisted(() => ({
  findDraftBlock: vi.fn(),
  getCurrentUserCanEdit: vi.fn(),
  getOrCreateContentDraft: vi.fn(),
  getPublicPath: vi.fn((parentType: string, slug: string) =>
    parentType === "page" ? `/${slug}` : `/article/${slug}`
  ),
  normalizeContentDraftRow: vi.fn((row) => row),
  readPublishedSnapshot: vi.fn(),
  updateDraftBlockContent: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => cacheMocks);
vi.mock("server-only", () => ({}));
vi.mock("../cms/revisions/utils", () => ({
  getFullPageContent: vi.fn(),
  getFullPostContent: vi.fn(),
}));
vi.mock("../cms/revisions/service", () => ({
  createPageRevision: vi.fn(),
  createPostRevision: vi.fn(),
}));
vi.mock("../../lib/visual-editing/draft-content", () => draftContentMocks);
vi.mock("../../lib/visual-editing/product-drafts", () => ({
  discardProductVisualEditingDraft: vi.fn(),
  loadProductVisualEditingField: vi.fn(),
  publishProductVisualEditingDraft: vi.fn(),
}));

import {
  discardVisualEditingDraft,
  publishVisualEditingDraft,
  saveVisualEditingBlockDraft,
} from "./visualEditingActions";

const baseDraft = {
  id: 1,
  parent_type: "page",
  parent_id: 2,
  author_id: "user-1",
  base_version: 1,
  meta: { slug: "about" },
  blocks: [
    {
      id: 10,
      page_id: 2,
      post_id: null,
      language_id: 1,
      block_type: "text",
      content: { html_content: "<p>Old</p>" },
      order: 0,
    },
  ],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const request = {
  parentType: "page" as const,
  parentId: 2,
  target: {
    kind: "top-level" as const,
    blockId: 10,
    blockIndex: 0,
    blockType: "text",
  },
};

describe("visual editing server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves block edits to content_drafts and revalidates the draft path", async () => {
    const savedDraft = {
      ...baseDraft,
      blocks: [
        {
          ...baseDraft.blocks[0],
          content: { html_content: "<p>New</p>" },
        },
      ],
    };
    const single = vi.fn().mockResolvedValue({ data: savedDraft, error: null });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));

    draftContentMocks.getCurrentUserCanEdit.mockResolvedValue({
      user: { id: "user-1" },
      canEdit: true,
      supabase: { from },
    });
    draftContentMocks.getOrCreateContentDraft.mockResolvedValue(baseDraft);
    draftContentMocks.updateDraftBlockContent.mockReturnValue(savedDraft);

    const result = await saveVisualEditingBlockDraft(request, {
      html_content: "<p>New</p>",
    });

    expect(result).toMatchObject({ success: true });
    expect(from).toHaveBeenCalledWith("content_drafts");
    expect(update).toHaveBeenCalledWith({
      author_id: "user-1",
      blocks: savedDraft.blocks,
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/about");
  });

  it("returns setup guidance when draft storage is missing", async () => {
    draftContentMocks.getCurrentUserCanEdit.mockResolvedValue({
      user: { id: "user-1" },
      canEdit: true,
      supabase: {},
    });
    draftContentMocks.getOrCreateContentDraft.mockRejectedValue(
      new Error(
        "Failed to read content draft: Could not find the table 'public.content_drafts' in the schema cache"
      )
    );

    const result = await saveVisualEditingBlockDraft(request, {
      html_content: "<p>New</p>",
    });

    expect(result).toEqual({
      error:
        "Draft storage is not set up in this database. Apply the schema (npm run db:migrate or the /setup wizard); content_drafts is created by the baseline schema migration.",
    });
  });

  it("discards a draft snapshot", async () => {
    const deleteChain: any = {
      error: null,
      eq: vi.fn(() => deleteChain),
    };
    const from = vi.fn(() => ({
      delete: vi.fn(() => deleteChain),
    }));
    draftContentMocks.getCurrentUserCanEdit.mockResolvedValue({
      user: { id: "user-1" },
      canEdit: true,
      supabase: { from },
    });

    const result = await discardVisualEditingDraft("page", 2);

    expect(result).toEqual({ success: true });
    expect(from).toHaveBeenCalledWith("content_drafts");
    expect(deleteChain.eq).toHaveBeenCalledWith("parent_type", "page");
    expect(deleteChain.eq).toHaveBeenCalledWith("parent_id", 2);
  });

  it("returns an error when publishing without an existing draft", async () => {
    const readChain: any = {
      select: vi.fn(() => readChain),
      eq: vi.fn(() => readChain),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const from = vi.fn(() => readChain);
    draftContentMocks.getCurrentUserCanEdit.mockResolvedValue({
      user: { id: "user-1" },
      canEdit: true,
      supabase: { from },
    });

    const result = await publishVisualEditingDraft("page", 2);

    expect(result).toEqual({ error: "No draft exists for this content." });
    expect(from).toHaveBeenCalledWith("content_drafts");
  });
});
