import type { NextRequest } from "next/server";
import type { NextblockDocumentType } from "./types";

export type DraftPathDocumentType = NextblockDocumentType | "product";

export interface DraftPathTarget {
  parentType: DraftPathDocumentType;
  slug: string;
  path: string;
}

export function normalizeDraftRedirectPath(rawPath: string | null): string | null {
  const value = rawPath?.trim();

  if (!value) {
    return null;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) {
    return null;
  }

  const normalized = value.startsWith("/") ? value : `/${value}`;

  if (normalized.includes("\\") || normalized.includes("\0")) {
    return null;
  }

  return normalized.replace(/\/{2,}/g, "/");
}

export function resolveDraftPathTarget(path: string): DraftPathTarget | null {
  const trimmed = path.replace(/\/+$/, "") || "/";

  if (trimmed === "/") {
    return {
      parentType: "page",
      slug: "home",
      path: "/",
    };
  }

  const articlePrefix = "/article/";
  if (trimmed.startsWith(articlePrefix)) {
    const slug = decodeURIComponent(trimmed.slice(articlePrefix.length));

    if (!slug || slug.includes("/")) {
      return null;
    }

    return {
      parentType: "post",
      slug,
      path: `/article/${encodeURIComponent(slug)}`,
    };
  }

  const productPrefix = "/product/";
  if (trimmed.startsWith(productPrefix)) {
    const slug = decodeURIComponent(trimmed.slice(productPrefix.length));

    if (!slug || slug.includes("/")) {
      return null;
    }

    return {
      parentType: "product",
      slug,
      path: `/product/${encodeURIComponent(slug)}`,
    };
  }

  const slug = decodeURIComponent(trimmed.slice(1));
  if (!slug || slug.includes("/")) {
    return null;
  }

  return {
    parentType: "page",
    slug,
    path: `/${encodeURIComponent(slug)}`,
  };
}

/**
 * Browser-facing origin for a redirect. In the self-hosted Docker standalone server (binds to
 * HOSTNAME=0.0.0.0), `request.url` / `request.nextUrl.origin` carry `http://0.0.0.0:3000` — an
 * unroutable address that the browser rejects (ERR_ADDRESS_INVALID). The incoming `Host` header
 * reflects what the user actually requested (e.g. localhost:3000), so prefer it (honoring
 * `x-forwarded-proto` behind a proxy). Falls back to the request origin when no Host is present.
 */
export function resolveRequestOrigin(request: NextRequest): string {
  const host = request.headers.get("host");
  if (host) {
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProto || request.nextUrl.protocol.replace(/:$/, "") || "http";
    return `${protocol}://${host}`;
  }
  return request.nextUrl.origin;
}
