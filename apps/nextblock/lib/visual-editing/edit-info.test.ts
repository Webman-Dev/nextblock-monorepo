import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildVisualEditAttributes } from "./edit-info";

describe("buildVisualEditAttributes", () => {
  beforeEach(() => {
    delete process.env.NEXTBLOCK_VERCEL_PROJECT_ID;
    delete process.env.NEXTBLOCK_VERCEL_WORKSPACE_ID;
  });

  it("returns no attributes when visual editing is disabled", () => {
    expect(
      buildVisualEditAttributes(
        {
          enabled: false,
          documentType: "page",
          documentId: 12,
          slug: "about",
          languageId: 1,
        },
        {
          kind: "top-level",
          blockId: 99,
          blockIndex: 0,
          blockType: "text",
        }
      )
    ).toBeUndefined();
  });

  it("builds a stringified Vercel edit-info payload with document and block metadata", () => {
    process.env.NEXTBLOCK_VERCEL_PROJECT_ID = "prj_123";
    process.env.NEXTBLOCK_VERCEL_WORKSPACE_ID = "team_123";

    const attrs = buildVisualEditAttributes(
      {
        enabled: true,
        documentType: "post",
        documentId: 42,
        slug: "hello-world",
        languageId: 1,
        draftId: 7,
      },
      {
        kind: "top-level",
        blockId: 99,
        blockIndex: 0,
        blockType: "heading",
      }
    );

    expect(attrs).toBeDefined();
    const payload = JSON.parse(attrs?.["data-vercel-edit-info"] ?? "{}");
    const target = JSON.parse(attrs?.["data-vercel-edit-target"] ?? "{}");

    expect(payload).toMatchObject({
      origin: "https://nextblock-editor",
      projectId: "prj_123",
      workspaceId: "team_123",
      editUrl: "http://localhost:3000/cms/posts/42/edit",
      data: {
        parentType: "post",
        parentId: 42,
        slug: "hello-world",
        languageId: 1,
        draftId: 7,
      },
    });
    expect(target).toEqual({
      kind: "top-level",
      blockId: 99,
      blockIndex: 0,
      blockType: "heading",
    });
  });
});
