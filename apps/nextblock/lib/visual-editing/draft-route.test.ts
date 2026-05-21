import { describe, expect, it } from "vitest";
import {
  normalizeDraftRedirectPath,
  resolveDraftPathTarget,
} from "./draft-route";

describe("draft-route helpers", () => {
  it("normalizes relative draft redirect paths", () => {
    expect(normalizeDraftRedirectPath("about")).toBe("/about");
    expect(normalizeDraftRedirectPath("/article/post-one")).toBe("/article/post-one");
    expect(normalizeDraftRedirectPath("/product/sku-one")).toBe("/product/sku-one");
    expect(normalizeDraftRedirectPath("//evil.example/path")).toBeNull();
    expect(normalizeDraftRedirectPath("https://evil.example/path")).toBeNull();
    expect(normalizeDraftRedirectPath("/admin\\settings")).toBeNull();
  });

  it("resolves page and post targets without allowing nested open-ended paths", () => {
    expect(resolveDraftPathTarget("/")).toEqual({
      parentType: "page",
      slug: "home",
      path: "/",
    });
    expect(resolveDraftPathTarget("/about")).toEqual({
      parentType: "page",
      slug: "about",
      path: "/about",
    });
    expect(resolveDraftPathTarget("/article/hello-world")).toEqual({
      parentType: "post",
      slug: "hello-world",
      path: "/article/hello-world",
    });
    expect(resolveDraftPathTarget("/product/commerce-license")).toEqual({
      parentType: "product",
      slug: "commerce-license",
      path: "/product/commerce-license",
    });
    expect(resolveDraftPathTarget("/nested/page")).toBeNull();
    expect(resolveDraftPathTarget("/article/nested/post")).toBeNull();
    expect(resolveDraftPathTarget("/product/nested/product")).toBeNull();
  });
});
