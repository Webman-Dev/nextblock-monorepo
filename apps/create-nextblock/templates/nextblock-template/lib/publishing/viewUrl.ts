/**
 * Build a link to the `/api/view` entry point used by the CMS "Preview" and
 * "View Live" buttons.
 *
 * Always pass the content's own language. The public site resolves language from
 * a cookie, not the URL, so a link without `lang` renders in whatever language
 * the editor happens to be browsing in — which is how opening a French page
 * landed you on the English one. See `app/api/view/route.ts`.
 */
export function buildViewUrl(options: {
  /** Root-relative public path, e.g. "/about" or "/article/hello". */
  path: string;
  /** The content row's language code, e.g. "fr". */
  languageCode?: string | null;
  /** True to enter Live Draft Mode (preview unpublished content). */
  draft?: boolean;
}): string {
  const params = new URLSearchParams({ path: options.path });
  if (options.languageCode) {
    params.set("lang", options.languageCode);
  }
  if (options.draft) {
    params.set("draft", "1");
  }
  return `/api/view?${params.toString()}`;
}
