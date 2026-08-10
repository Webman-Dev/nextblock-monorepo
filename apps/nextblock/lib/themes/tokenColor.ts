import { parseCssColor, rgbaToHex, rgbaToHsla, type Rgba } from '@nextblock-cms/utils';

/**
 * Bridge between how theme colours are STORED and how the colour picker speaks.
 *
 * Stored: a bare HSL triplet (`"222 47% 11%"`), because the Tailwind config wraps
 * it as `hsl(var(--token))` and appends alpha as `hsl(var(--primary) / 0.5)` —
 * that composition only works with a bare triplet.
 * Picker: any CSS colour string, normally a hex.
 */

export function tokenValueToCss(triplet: string): string {
  return `hsl(${triplet.trim()})`;
}

/** Triplet -> hex, for seeding the colour picker. Returns null if unparseable. */
export function tokenValueToHex(triplet: string): string | null {
  const rgba = parseCssColor(tokenValueToCss(triplet));
  return rgba ? rgbaToHex(rgba) : null;
}

/**
 * Any CSS colour -> the stored triplet. Alpha is dropped: these tokens are
 * composed with an alpha at use time, so baking one in would double-apply it.
 */
export function cssColorToTokenValue(color: string): string | null {
  const rgba: Rgba | null = parseCssColor(color);
  if (!rgba) return null;
  const { h, s, l } = rgbaToHsla(rgba);
  return `${h} ${s}% ${l}%`;
}
