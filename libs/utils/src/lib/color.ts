/**
 * Framework-agnostic colour maths shared by the block editors, the Tiptap
 * colour menu and the renderers.
 *
 * Everything here is pure and SSR-safe except {@link resolveCssColor}, which
 * falls back to the DOM only when it is available (named CSS colours and
 * `hsl(var(--token))` cannot be resolved without a computed style).
 */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Hsla {
  h: number;
  s: number;
  l: number;
  a: number;
}

const HEX_RE = /^#?([0-9a-f]{3,8})$/i;
const RGB_RE = /^rgba?\(\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)(?:\s*[,/]\s*([-\d.]+%?))?\s*\)$/i;
const HSL_RE = /^hsla?\(\s*([-\d.]+)(?:deg)?[\s,]+([-\d.]+)%[\s,]+([-\d.]+)%(?:\s*[,/]\s*([-\d.]+%?))?\s*\)$/i;

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function clampChannel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function clampAlpha(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value));
}

function parseAlpha(raw: string | undefined): number {
  if (raw === undefined) return 1;
  const trimmed = raw.trim();
  if (trimmed.endsWith('%')) {
    return clampAlpha(parseFloat(trimmed.slice(0, -1)) / 100);
  }
  return clampAlpha(parseFloat(trimmed));
}

/** `#abc` / `#abcd` / `#aabbcc` / `#aabbccdd` -> uppercase `#AABBCC[AA]`. */
export function normalizeHex(value: string): string | null {
  const match = HEX_RE.exec(value.trim());
  if (!match) return null;
  let raw = match[1];
  if (raw.length === 3 || raw.length === 4) {
    raw = raw
      .split('')
      .map((char) => char + char)
      .join('');
  }
  if (raw.length !== 6 && raw.length !== 8) return null;
  return `#${raw.toUpperCase()}`;
}

export function hexToRgba(hex: string): Rgba | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const raw = normalized.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
    a: raw.length === 8 ? round(parseInt(raw.slice(6, 8), 16) / 255, 3) : 1,
  };
}

export function rgbaToHex(rgba: Rgba, includeAlpha = false): string {
  const base = [rgba.r, rgba.g, rgba.b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, '0'))
    .join('');
  if (!includeAlpha || clampAlpha(rgba.a) >= 1) {
    return `#${base.toUpperCase()}`;
  }
  const alpha = clampChannel(clampAlpha(rgba.a) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${(base + alpha).toUpperCase()}`;
}

export function rgbaToHsla(rgba: Rgba): Hsla {
  const r = clampChannel(rgba.r) / 255;
  const g = clampChannel(rgba.g) / 255;
  const b = clampChannel(rgba.b) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) {
      hue = (g - b) / delta + (g < b ? 6 : 0);
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    hue /= 6;
  }

  return {
    h: Math.round(hue * 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
    a: clampAlpha(rgba.a),
  };
}

export function hslaToRgba(hsla: Hsla): Rgba {
  const h = ((hsla.h % 360) + 360) % 360 / 360;
  const s = Math.max(0, Math.min(1, hsla.s / 100));
  const l = Math.max(0, Math.min(1, hsla.l / 100));

  if (s === 0) {
    const grey = clampChannel(l * 255);
    return { r: grey, g: grey, b: grey, a: clampAlpha(hsla.a) };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const toChannel = (t: number): number => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  return {
    r: clampChannel(toChannel(h + 1 / 3) * 255),
    g: clampChannel(toChannel(h) * 255),
    b: clampChannel(toChannel(h - 1 / 3) * 255),
    a: clampAlpha(hsla.a),
  };
}

export function formatRgba(rgba: Rgba): string {
  const r = clampChannel(rgba.r);
  const g = clampChannel(rgba.g);
  const b = clampChannel(rgba.b);
  const a = clampAlpha(rgba.a);
  return a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${round(a, 3)})`;
}

export function formatHsla(hsla: Hsla): string {
  const a = clampAlpha(hsla.a);
  return a >= 1
    ? `hsl(${hsla.h}, ${hsla.s}%, ${hsla.l}%)`
    : `hsla(${hsla.h}, ${hsla.s}%, ${hsla.l}%, ${round(a, 3)})`;
}

/**
 * Parse `#hex`, `rgb()/rgba()` and `hsl()/hsla()` without touching the DOM.
 * Returns `null` for anything else (named colours, `var()`, gradients).
 */
export function parseCssColor(value: string): Rgba | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('#')) {
    return hexToRgba(trimmed);
  }

  const rgbMatch = RGB_RE.exec(trimmed);
  if (rgbMatch) {
    return {
      r: clampChannel(parseFloat(rgbMatch[1])),
      g: clampChannel(parseFloat(rgbMatch[2])),
      b: clampChannel(parseFloat(rgbMatch[3])),
      a: parseAlpha(rgbMatch[4]),
    };
  }

  const hslMatch = HSL_RE.exec(trimmed);
  if (hslMatch) {
    return hslaToRgba({
      h: parseFloat(hslMatch[1]),
      s: parseFloat(hslMatch[2]),
      l: parseFloat(hslMatch[3]),
      a: parseAlpha(hslMatch[4]),
    });
  }

  return null;
}

/**
 * Like {@link parseCssColor}, but falls back to the browser for values only the
 * engine can resolve — named colours, `color-mix()`, `hsl(var(--primary))`.
 * Always returns `null` during SSR for those cases, so callers must tolerate it.
 */
export function resolveCssColor(value: string, element?: Element | null): Rgba | null {
  const direct = parseCssColor(value);
  if (direct) return direct;

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return null;
  }

  const probe = document.createElement('span');
  probe.style.color = '';
  probe.style.color = value;
  // An invalid colour leaves the property untouched.
  if (!probe.style.color) return null;

  probe.style.position = 'absolute';
  probe.style.opacity = '0';
  probe.style.pointerEvents = 'none';

  // Mount inside the requesting element so CSS custom properties resolve
  // against the correct cascade (light vs dark theme scope).
  const host = element ?? document.body;
  host.appendChild(probe);
  const computed = window.getComputedStyle(probe).color;
  host.removeChild(probe);

  return parseCssColor(computed);
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(rgba: Rgba): number {
  const toLinear = (channel: number): number => {
    const c = clampChannel(channel) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(rgba.r) + 0.7152 * toLinear(rgba.g) + 0.0722 * toLinear(rgba.b);
}

/** Flatten a translucent colour over an opaque backdrop. */
export function compositeOver(foreground: Rgba, background: Rgba): Rgba {
  const alpha = clampAlpha(foreground.a);
  return {
    r: clampChannel(foreground.r * alpha + background.r * (1 - alpha)),
    g: clampChannel(foreground.g * alpha + background.g * (1 - alpha)),
    b: clampChannel(foreground.b * alpha + background.b * (1 - alpha)),
    a: 1,
  };
}

/** WCAG contrast ratio between 1 and 21. Alpha is composited over `background`. */
export function contrastRatio(foreground: Rgba, background: Rgba): number {
  const flattened = clampAlpha(foreground.a) >= 1 ? foreground : compositeOver(foreground, background);
  const l1 = relativeLuminance(flattened);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return round((lighter + 0.05) / (darker + 0.05), 2);
}

export type ContrastRating = 'AAA' | 'AA' | 'AA Large' | 'Fail';

/**
 * Rate a contrast ratio. `largeText` follows WCAG's definition (>=24px, or
 * >=18.66px bold) — headings usually qualify, body copy does not.
 */
export function rateContrast(ratio: number, largeText = false): ContrastRating {
  if (largeText) {
    if (ratio >= 4.5) return 'AAA';
    if (ratio >= 3) return 'AA';
    return 'Fail';
  }
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fail';
}

/** True when white text would be harder to read than black text on this colour. */
export function isLightColor(rgba: Rgba): boolean {
  return relativeLuminance(rgba) > 0.179;
}

/** A readable foreground (`#000` / `#FFF`) for an arbitrary backdrop. */
export function readableTextColor(rgba: Rgba): string {
  return isLightColor(rgba) ? '#000000' : '#FFFFFF';
}
