/**
 * The pure core of the "Generate with AI" alt-text write-back in `ImageBlockEditor`.
 *
 * A vision call takes seconds, and the block editor stays fully interactive while one is
 * in flight: the author can remove the image, pick a different one from the library, or
 * paste an external URL before the description ever arrives. The original handler assumed
 * the block it started on would still be the block it finished on — it captured `content`
 * at click time and wrote `{ ...capturedContent, alt_text: generated }` back on completion
 * — and that assumption is wrong in exactly the cases that matter. Writing the captured
 * copy back resurrects an image the author had deleted, or pairs a freshly chosen image
 * with a description of the previous one. The second failure is worse than having no alt
 * text at all: it is confidently wrong, and the screen-reader user it exists for has no
 * way to detect that it describes a different picture.
 *
 * The fix is to capture the image's IDENTITY rather than a snapshot of the content, and to
 * discard the response when the block no longer holds that image. This decision lives here
 * rather than inline in the component because the component cannot be unit-tested in this
 * workspace — there is no DOM environment — and a rule about what may overwrite an
 * accessibility field deserves a test.
 */

/**
 * The part of an image block's content that says which image is loaded.
 *
 * Deliberately structural and snake_case: these are the JSONB attribute names the block
 * actually stores, so a caller passes its content object straight in without translating.
 */
export interface AltTextImageSource {
  external_url?: string | null;
  object_key?: string | null;
}

/**
 * Shown when a generated description is thrown away because the image moved on. It is
 * phrased as a fact plus the next step rather than as a failure, because nothing failed —
 * the model answered, the answer is simply about an image that is no longer here.
 */
export const STALE_ALT_TEXT_MESSAGE =
  'The image changed while Cortex AI was describing it, so that description was discarded. Generate again for the current image.';

/**
 * A stable string naming the image a block is currently showing, or `''` for no image.
 *
 * The external URL wins over the stored object key because that is the order the editor
 * itself renders and sends in: a block with an `external_url` shows the external image
 * regardless of any stale `object_key` left beside it. `fallbackObjectKey` mirrors the
 * editor's `content.object_key || selectedMediaObjectKey` display rule, which exists
 * because a just-picked image lives in component state for a beat before the parent
 * echoes it back through `content`.
 *
 * The `external:` / `stored:` prefixes keep the two namespaces from ever colliding, so a
 * URL that happens to equal an object key cannot be mistaken for the same image.
 */
export function altTextImageIdentity(
  source: AltTextImageSource,
  fallbackObjectKey?: string | null
): string {
  const externalUrl = source.external_url?.trim();
  if (externalUrl) {
    return `external:${externalUrl}`;
  }

  const objectKey = (source.object_key || fallbackObjectKey || '').trim();
  if (objectKey) {
    return `stored:${objectKey}`;
  }

  return '';
}

export interface AltTextWriteBackParams<TContent extends AltTextImageSource> {
  /** The identity taken at click time, i.e. the image that was actually sent to the model. */
  capturedIdentity: string;
  /** The block's content as of right now — never the copy captured at click time. */
  currentContent: TContent;
  /** The identity of the image the block holds right now. */
  currentIdentity: string;
  generatedAltText: string;
  /** The editor's `selectedMediaObjectKey`, written through unchanged (see below). */
  objectKey: string | null | undefined;
}

/**
 * Decide what — if anything — the generated description should write back.
 *
 * Returns `null` when the response must be dropped: either the image has been replaced or
 * removed since the request went out, or there was no identifiable image to begin with (an
 * empty captured identity, which the disabled button should already prevent, is treated as
 * a mismatch rather than as a match against another empty).
 *
 * When it does write, it merges into the CURRENT content and reproduces the exact shape
 * `handleAltTextChange` uses — the same key set, including `object_key` taken from the
 * editor's selection state. Making the AI path indistinguishable from typing is what
 * guarantees the value lands in the block's JSONB attributes through the one save path,
 * instead of creating a second write shape to keep in sync forever.
 */
export function resolveAltTextWriteBack<TContent extends AltTextImageSource>(
  params: AltTextWriteBackParams<TContent>
): (TContent & { alt_text: string; object_key: string | null | undefined }) | null {
  if (!params.capturedIdentity || params.capturedIdentity !== params.currentIdentity) {
    return null;
  }

  return {
    ...params.currentContent,
    alt_text: params.generatedAltText,
    object_key: params.objectKey,
  };
}
