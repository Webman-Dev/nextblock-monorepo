import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildVisualEditAttributes } from "./edit-info";

describe("buildVisualEditAttributes", () => {
  beforeEach(() => {
    delete process.env.NEXTBLOCK_VERCEL_PROJECT_ID;
    delete process.env.NEXTBLOCK_VERCEL_WORKSPACE_ID;
    delete process.env.NEXT_PUBLIC_URL;
    delete process.env.TARGET_URL;
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
      origin: "localhost",
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

  it("dynamically overrides origin with NEXT_PUBLIC_URL and TARGET_URL", () => {
    process.env.NEXT_PUBLIC_URL = "https://custom-domain.com/";
    const attrs = buildVisualEditAttributes(
      {
        enabled: true,
        documentType: "page",
        documentId: 10,
        slug: "home",
        languageId: 1,
      },
      {
        kind: "top-level",
        blockId: 1,
        blockIndex: 0,
        blockType: "text",
      }
    );
    const payload = JSON.parse(attrs?.["data-vercel-edit-info"] ?? "{}");
    expect(payload.origin).toBe("custom-domain.com");

    // Test TARGET_URL fallback if NEXT_PUBLIC_URL is empty
    delete process.env.NEXT_PUBLIC_URL;
    process.env.TARGET_URL = "https://another-domain.xyz/subpath/";
    const attrsTarget = buildVisualEditAttributes(
      {
        enabled: true,
        documentType: "page",
        documentId: 10,
        slug: "home",
        languageId: 1,
      },
      {
        kind: "top-level",
        blockId: 1,
        blockIndex: 0,
        blockType: "text",
      }
    );
    const payloadTarget = JSON.parse(attrsTarget?.["data-vercel-edit-info"] ?? "{}");
    expect(payloadTarget.origin).toBe("another-domain.xyz");
  });

  it("uses pageOrigin from context if provided", () => {
    const attrs = buildVisualEditAttributes(
      {
        enabled: true,
        documentType: "page",
        documentId: 10,
        slug: "home",
        languageId: 1,
        pageOrigin: "https://my-custom-origin.dev/",
      },
      {
        kind: "top-level",
        blockId: 1,
        blockIndex: 0,
        blockType: "text",
      }
    );
    const payload = JSON.parse(attrs?.["data-vercel-edit-info"] ?? "{}");
    expect(payload.origin).toBe("my-custom-origin.dev");
  });
});
