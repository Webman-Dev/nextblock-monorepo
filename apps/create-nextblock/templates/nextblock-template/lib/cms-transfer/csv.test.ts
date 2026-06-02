import { describe, expect, it } from "vitest";

import {
  getCsvHeaders,
  getTemplateCsv,
  majorToMinor,
  makeUniqueSku,
  makeUniqueSlug,
  minorToMajor,
  normalizeBlocksFromFields,
  parseCsv,
  stringifyCsv,
} from "./csv";

describe("cms transfer csv helpers", () => {
  it("builds templates with the expected content columns", () => {
    expect(getCsvHeaders("pages")).toContain("blocks_json");
    expect(getCsvHeaders("products")).toContain("description_html");
    expect(getCsvHeaders("products")).toContain("description_blocks_json");
    expect(getTemplateCsv("products")).toContain("EXAMPLE-SKU");
  });

  it("round-trips JSON columns through CSV escaping", () => {
    const csv = stringifyCsv(
      [
        {
          language_code: "en",
          title: "Landing",
          blocks_json: JSON.stringify([
            { block_type: "text", content: { html_content: "<p>Hello, world</p>" }, order: 0 },
          ]),
        },
      ],
      ["language_code", "title", "blocks_json"]
    );

    const parsed = parseCsv(csv);

    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0].blocks_json).toContain("html_content");
    expect(JSON.parse(parsed.rows[0].blocks_json)).toHaveLength(1);
  });

  it("converts plain HTML into a text block fallback", () => {
    const errors: Array<{ row: number; message: string }> = [];
    const blocks = normalizeBlocksFromFields({
      html: "<p>Imported description</p>",
      languageId: 1,
      rowNumber: 2,
      errors,
    });

    expect(errors).toEqual([]);
    expect(blocks).toEqual([
      {
        language_id: 1,
        block_type: "text",
        content: { html_content: "<p>Imported description</p>" },
        order: 0,
      },
    ]);
  });

  it("generates unique slugs and SKUs for create-new imports", () => {
    expect(makeUniqueSlug("Example Page", new Set(["example-page"]))).toBe(
      "example-page-copy"
    );
    expect(makeUniqueSku("sku-1", new Set(["SKU-1", "SKU-1-COPY"]))).toBe(
      "SKU-1-COPY-2"
    );
  });

  it("converts product prices between major and minor units", () => {
    expect(majorToMinor(19.99)).toBe(1999);
    expect(minorToMajor(1999)).toBe(19.99);
  });
});
