/**
 * Helpers for assembling a valid `POST /api/ai/seo/alt-text` body from what the CMS has
 * on hand. Both call sites — the image block editor and the media library edit form —
 * face the same two problems, so they are solved once here.
 */

/**
 * Turn whatever the CMS has for an image into a URL the AI vision call can actually fetch.
 *
 * Why this is not just "pass the src along": `/api/ai/seo/alt-text` does not receive the
 * image bytes, it receives a URL, and the AI SDK downloads that URL *server-side* before
 * handing the image to the model. A relative path is meaningless in that context — there
 * is no document base to resolve it against — so the route rejects anything that is not
 * absolute http(s).
 *
 * And relative is the common case, not the exotic one. `resolveMediaUrl()` returns
 * `/${objectKey}` whenever `NEXT_PUBLIC_R2_BASE_URL` is unset, which is exactly how the
 * native Supabase-storage backend runs. So on a default install every single image in
 * the library would otherwise fail the alt-text call. Resolving against
 * `window.location.origin` fixes that for any deployment the browser can reach, which is
 * the same origin the server is serving from.
 *
 * The remaining failure the caller must surface rather than swallow is a `blob:` or
 * `data:` src (an un-uploaded local preview): the server cannot fetch either, so we
 * return null and let the UI say so instead of firing a request that is certain to 400.
 */
export function toAbsoluteImageUrl(url: string | null | undefined): string | null {
  const candidate = (url ?? '').trim();
  if (!candidate) {
    return null;
  }

  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  // Only the browser knows the origin this CMS is being served from; on the server we
  // have no basis to invent one, so a relative path stays unusable and the caller warns.
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const absolute = new URL(candidate, window.location.origin);
    return absolute.protocol === 'http:' || absolute.protocol === 'https:'
      ? absolute.toString()
      : null;
  } catch {
    return null;
  }
}

/** Shared copy for the inline warning shown when {@link toAbsoluteImageUrl} returns null. */
export const UNRESOLVABLE_IMAGE_URL_MESSAGE =
  'This image has no public http(s) address yet, so Cortex AI cannot look at it. Save it to the media library first.';

/**
 * The route validates `context` with `z.string().max(2000)` inside a `z.strictObject`, so
 * an over-long value does not get trimmed server-side — it fails the whole request with a
 * 400. Captions are free-text inputs with no length limit of their own, which makes that
 * reachable: a long caption would break the alt-text button for reasons the operator could
 * never guess from the error. Trimming client-side keeps the request valid, and losing the
 * tail of a 2,000-character caption costs nothing, since context is a hint and the model
 * has the image itself.
 */
const ALT_TEXT_CONTEXT_MAX_LENGTH = 2000;

/**
 * Join the context fragments a caller has into one string the route will accept, or return
 * `undefined` when there is nothing worth sending — the field is optional, and an empty
 * string is a different (and less honest) thing to send than no field at all.
 */
export function buildAltTextContext(...fragments: Array<string | null | undefined>): string | undefined {
  const joined = fragments
    .map((fragment) => (fragment ?? '').trim())
    .filter(Boolean)
    .join(' ');

  if (!joined) {
    return undefined;
  }

  return joined.length > ALT_TEXT_CONTEXT_MAX_LENGTH
    ? joined.slice(0, ALT_TEXT_CONTEXT_MAX_LENGTH)
    : joined;
}
