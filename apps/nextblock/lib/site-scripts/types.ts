/** Where a site script's tag is emitted in the document. */
export type SiteScriptPlacement = 'head' | 'body_start' | 'body_end';

/** Loading hint for external (`src`) scripts. Inline code ignores it. */
export type SiteScriptLoadStrategy = 'default' | 'defer' | 'async';

export interface SiteScript {
  id: string;
  name: string;
  description: string | null;
  /** Raw JS without the surrounding <script> tag. Ignored when `src` is set. */
  code: string;
  /** External script URL. Takes precedence over `code`. */
  src: string | null;
  placement: SiteScriptPlacement;
  load_strategy: SiteScriptLoadStrategy;
  is_active: boolean;
  sort_order: number;
}

export const SITE_SCRIPT_PLACEMENTS: SiteScriptPlacement[] = ['head', 'body_start', 'body_end'];
export const SITE_SCRIPT_LOAD_STRATEGIES: SiteScriptLoadStrategy[] = ['default', 'defer', 'async'];

export const SITE_SCRIPT_COLUMNS =
  'id, name, description, code, src, placement, load_strategy, is_active, sort_order';

export function isSiteScriptPlacement(value: unknown): value is SiteScriptPlacement {
  return typeof value === 'string' && (SITE_SCRIPT_PLACEMENTS as string[]).includes(value);
}

export function isSiteScriptLoadStrategy(value: unknown): value is SiteScriptLoadStrategy {
  return typeof value === 'string' && (SITE_SCRIPT_LOAD_STRATEGIES as string[]).includes(value);
}

/**
 * Guard against a script closing its own tag and escaping into markup.
 *
 * The code is emitted inside a <script> element, where the HTML parser ends the
 * element at the first literal `</script`, regardless of JavaScript syntax — so a
 * string containing it would terminate the script early and let whatever follows be
 * parsed as HTML. Escaping the slash keeps the sequence inert to the parser while
 * remaining the same string to JavaScript.
 */
export function escapeInlineScript(code: string): string {
  return code.replace(/<\/(script)/gi, '<\\/$1');
}
