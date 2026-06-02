import { describe, expect, it } from "vitest";
import {
  extractIntroExcerptFromBlocks,
  resolveMetaTitle,
  resolvePageMetaDescription,
  resolvePostMetaDescription,
  resolveProductMetaDescription,
  stringifyJsonLd,
} from "./seo";

describe("seo helpers", () => {
  it("uses manual title only when it contains text", () => {
    expect(resolveMetaTitle("  Custom SEO Title  ", "Fallback Title")).toBe("Custom SEO Title");
    expect(resolveMetaTitle("   ", "Fallback Title")).toBe("Fallback Title");
  });

  it("resolves page descriptions from the first meaningful paragraph", () => {
    const blocks = [
      {
        block_type: "text",
        content: {
          html_content: "<h1>Hero heading</h1>",
        },
      },
      {
        block_type: "text",
        content: {
          html_content:
            "<p>NextBlock gives teams a fast CMS foundation with editable content, commerce, and production-ready metadata.</p>",
        },
      },
    ];

    expect(extractIntroExcerptFromBlocks(blocks)).toBe(
      "NextBlock gives teams a fast CMS foundation with editable content, commerce, and production-ready metadata."
    );
    expect(resolvePageMetaDescription(null, blocks)).toBe(
      "NextBlock gives teams a fast CMS foundation with editable content, commerce, and production-ready metadata."
    );
  });

  it("uses type-specific description fallbacks", () => {
    expect(resolvePostMetaDescription(null, "Post subtitle")).toBe("Post subtitle");
    expect(resolveProductMetaDescription(null, "<p>Short product description.</p>")).toBe(
      "Short product description."
    );
  });

  it("escapes JSON-LD closing tags", () => {
    expect(stringifyJsonLd({ name: "</script>" })).toContain("\\u003c/script>");
  });
});
