import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@nextblock-cms/db/server", () => ({
  createClient: vi.fn(),
  getServiceRoleSupabaseClient: vi.fn(),
  getSsgSupabaseClient: vi.fn(),
}));

import {
  applyProductDraftToProductRecord,
  assertValidProductFieldRequest,
} from "./product-drafts";
import type { VisualEditingProductFieldRequest } from "./types";

const productId = "123e4567-e89b-12d3-a456-426614174000";

describe("product visual editing drafts", () => {
  it("validates product field draft targets", () => {
    const request: VisualEditingProductFieldRequest = {
      parentType: "product",
      parentId: productId,
      target: {
        kind: "product-field",
        field: "description_json",
        input: "tiptap",
        label: "Product description",
      },
    };

    expect(() => assertValidProductFieldRequest(request)).not.toThrow();
  });

  it("rejects product title targets that use the wrong editor input", () => {
    const request: VisualEditingProductFieldRequest = {
      parentType: "product",
      parentId: productId,
      target: {
        kind: "product-field",
        field: "title",
        input: "tiptap",
        label: "Product title",
      },
    };

    expect(() => assertValidProductFieldRequest(request)).toThrow(
      "Invalid product field editor."
    );
  });

  it("overlays visible storefront product fields from a draft snapshot", () => {
    const product = {
      id: productId,
      title: "Published title",
      slug: "published-product",
      short_description: "Published short copy",
      description_json: { type: "doc", content: [] },
      price: 100,
    };
    const draft = {
      id: 1,
      product_id: productId,
      author_id: "user-1",
      meta: {
        title: "Draft title",
        short_description: "Draft short copy",
      },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    expect(applyProductDraftToProductRecord(product, draft)).toMatchObject({
      title: "Draft title",
      short_description: "Draft short copy",
      price: 100,
    });
  });
});
