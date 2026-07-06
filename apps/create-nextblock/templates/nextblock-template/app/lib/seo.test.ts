import { describe, expect, it } from "vitest";
import {
  buildCanonicalUrl,
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

describe("buildCanonicalUrl", () => {
  const siteUrl = "https://example.com";

  it("self-references when there is no override", () => {
    expect(buildCanonicalUrl(null, siteUrl, "/about")).toBe("https://example.com/about");
    expect(buildCanonicalUrl("", siteUrl, "/about")).toBe("https://example.com/about");
    expect(buildCanonicalUrl("   ", siteUrl, "/about")).toBe("https://example.com/about");
  });

  it("uses an absolute override verbatim (cross-domain allowed)", () => {
    expect(buildCanonicalUrl("https://other.com/x", siteUrl, "/about")).toBe("https://other.com/x");
    expect(buildCanonicalUrl("  http://other.com/y  ", siteUrl, "/about")).toBe("http://other.com/y");
  });

  it("resolves relative overrides against the site URL", () => {
    expect(buildCanonicalUrl("/canonical-path", siteUrl, "/about")).toBe(
      "https://example.com/canonical-path"
    );
    expect(buildCanonicalUrl("canonical-path", siteUrl, "/about")).toBe(
      "https://example.com/canonical-path"
    );
  });

  it("normalizes the path and a trailing slash on the site URL", () => {
    expect(buildCanonicalUrl(null, "https://example.com/", "about")).toBe(
      "https://example.com/about"
    );
  });

  it("returns a relative fallback when the site URL is unset (resolved by metadataBase)", () => {
    expect(buildCanonicalUrl(null, "", "/about")).toBe("/about");
    expect(buildCanonicalUrl("/override", "", "/about")).toBe("/override");
  });
});
