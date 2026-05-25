import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@nextblock-cms/db/server", () => ({
  createClient: vi.fn(),
  getServiceRoleSupabaseClient: vi.fn(),
  getSsgSupabaseClient: vi.fn(),
}));

import {
  findDraftBlock,
  updateDraftBlockContent,
} from "./draft-content";
import type { ContentDraftSnapshot } from "./types";

describe("draft content merge helpers", () => {
  it("updates top-level draft block content without mutating the original snapshot", () => {
    const snapshot: ContentDraftSnapshot = {
      meta: {},
      blocks: [
        {
          id: 10,
          page_id: 1,
          post_id: null,
          language_id: 1,
          block_type: "text",
          content: { html_content: "<p>Old</p>" },
          order: 0,
        },
      ],
    };

    const next = updateDraftBlockContent(
      snapshot,
      {
        parentType: "page",
        parentId: 1,
        target: {
          kind: "top-level",
          blockId: 10,
          blockIndex: 0,
          blockType: "text",
        },
      },
      { html_content: "<p>New</p>" }
    );

    expect(snapshot.blocks[0].content).toEqual({ html_content: "<p>Old</p>" });
    expect(next.blocks[0].content).toEqual({ html_content: "<p>New</p>" });
  });

  it("finds and updates nested draft block content", () => {
    const snapshot: ContentDraftSnapshot = {
      meta: {},
      blocks: [
        {
          id: 20,
          page_id: 1,
          post_id: null,
          language_id: 1,
          block_type: "section",
          content: {
            column_blocks: [
              [
                {
                  block_type: "heading",
                  content: { text_content: "Old heading", level: 2 },
                },
              ],
            ],
          },
          order: 0,
        },
      ],
    };
    const request = {
      parentType: "page" as const,
      parentId: 1,
      target: {
        kind: "nested" as const,
        parentBlockId: 20,
        parentBlockIndex: 0,
        parentBlockType: "section" as const,
        columnIndex: 0,
        blockIndex: 0,
        blockType: "heading",
      },
    };

    expect(findDraftBlock(snapshot, request)).toMatchObject({
      block_type: "heading",
      content: { text_content: "Old heading", level: 2 },
    });

    const next = updateDraftBlockContent(snapshot, request, {
      text_content: "New heading",
      level: 2,
    });

    expect((next.blocks[0].content as any).column_blocks[0][0].content).toEqual({
      text_content: "New heading",
      level: 2,
    });
  });
});
