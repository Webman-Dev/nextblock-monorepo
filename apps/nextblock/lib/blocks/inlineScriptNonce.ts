/**
 * Stamp the request's CSP nonce onto inline <script> tags inside block HTML.
 *
 * Rich-text blocks may legitimately carry an inline <script> (an editor or Cortex AI
 * adding a small animation or widget). The site's CSP lists a nonce in `script-src`,
 * and per CSP Level 2 a browser IGNORES `'unsafe-inline'` once a nonce or hash is
 * present — so an un-nonced inline script is silently blocked, with no server-side
 * symptom. Adding the nonce is what makes authored JS actually run.
 *
 * Only inline scripts are touched: a `src=` script loads a remote file and is
 * governed by the host allowlist instead, and re-stamping one that already carries a
 * nonce would corrupt it.
 */
export function addNonceToInlineScripts(html: string, nonce: string): string {
  if (!html || !nonce) return html || '';

  return html.replace(/<script(?![^>]*\bsrc=)([^>]*)(?<!nonce=["'][^"']*["'])>/gi, (_match, attrs) => {
    return `<script nonce="${nonce}"${attrs}>`;
  });
}
