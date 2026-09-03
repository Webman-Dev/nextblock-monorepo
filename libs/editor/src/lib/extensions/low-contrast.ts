/**
 * Pure decision logic behind the editor's low-contrast text hint.
 *
 * An author who is writing copy for a dark hero section legitimately sets a
 * pale text colour, but the Tiptap editing surface is the CMS chrome — white in
 * the light theme, near-black in the dark theme — not the section's real
 * background. The result is white-on-white (or, in dark mode, near-black on
 * near-black) text that is simply invisible while it is being written. We cannot
 * reuse the section's real background image inside the editor because it will
 * not line up with the text, so instead we measure the contrast the author is
 * actually looking at and give the failing runs a readable backdrop.
 *
 * Everything in this module is pure and DOM-free so it can be unit tested
 * without a browser: the ProseMirror plugin in `LowContrastTextHint.ts` reads
 * the DOM, hands the resulting colour strings to these functions, and turns the
 * verdicts into decorations. All of the colour and WCAG maths is delegated to
 * `@nextblock-cms/utils` (`libs/utils/src/lib/color.ts`) so there is exactly one
 * implementation of relative luminance and contrast ratio in the workspace.
 */

import {
  compositeOver,
  contrastRatio,
  isLightColor,
  parseCssColor,
  readableTextColor,
  type Rgba,
} from '@nextblock-cms/utils';

/** WCAG 2.1 AA minimum contrast for body copy. */
export const BODY_TEXT_CONTRAST_THRESHOLD = 4.5;

/** WCAG 2.1 AA minimum contrast for large text. */
export const LARGE_TEXT_CONTRAST_THRESHOLD = 3;

/** WCAG's "large text" floor for regular weights: 18pt === 24px. */
export const LARGE_TEXT_MIN_PX = 24;

/** WCAG's "large text" floor for bold weights: 14pt === 18.66px. */
export const LARGE_TEXT_BOLD_MIN_PX = 18.66;

/**
 * Heading levels we are willing to treat as large text when the document does
 * not carry an explicit font size.
 *
 * This is a deliberate approximation and we would rather say so than pretend
 * otherwise: the only way to know a run's *rendered* size is to measure it in
 * the DOM, which would force a layout for every coloured run on every rebuild.
 * So an explicit `font-size` on the run wins when it exists, and otherwise we
 * assume h1-h3 clear 24px in the editor's typography while h4-h6 do not and are
 * held to the stricter body threshold.
 */
export const LARGE_TEXT_MAX_HEADING_LEVEL = 3;

/** Stable class name on the hint decoration, so integrators can restyle it. */
export const LOW_CONTRAST_HINT_CLASS = 'nb-low-contrast-hint';

const OPAQUE_BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };
const OPAQUE_WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };

export interface LowContrastVerdict {
  flag: boolean;
  ratio: number;
}

export interface LargeTextInput {
  bold: boolean;
  fontSize: string | null;
  headingLevel: number | null;
}

export interface LowContrastHintAttrsInput {
  backdrop: string;
  foreground: string;
  ratio: number;
  threshold: number;
}

/**
 * The index signature is what makes this structurally assignable to
 * ProseMirror's `DecorationAttrs`, which is an open bag of DOM attributes.
 */
export interface LowContrastHintAttrs {
  [attribute: string]: string;
  'aria-label': string;
  class: string;
  style: string;
  title: string;
}

function roundTo(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/**
 * The contrast bar a run has to clear.
 *
 * WCAG does not define a formula linking the body and large-text minimums — it
 * just publishes the pairs (4.5, 3) for AA and (7, 4.5) for AAA. Rather than
 * hardcode a table we scale a caller-supplied body threshold by the AA ratio,
 * which reproduces 3 exactly for the default 4.5 and stays proportional if an
 * integrator raises the bar.
 */
export function contrastThresholdFor(
  isLargeText: boolean,
  bodyThreshold: number = BODY_TEXT_CONTRAST_THRESHOLD,
): number {
  if (!isLargeText) return bodyThreshold;
  const scaled = bodyThreshold * (LARGE_TEXT_CONTRAST_THRESHOLD / BODY_TEXT_CONTRAST_THRESHOLD);
  // A contrast ratio can never fall below 1:1, so a nonsensically low override
  // must not produce a threshold that nothing could ever fail.
  return Math.max(1, roundTo(scaled, 2));
}

/**
 * Decide whether a run of text is unreadable against the editing surface.
 *
 * `background` is expected to be opaque because the caller has already
 * flattened the DOM's background stack; any alpha on it is ignored rather than
 * guessed at. A colour we cannot parse is never flagged — a false positive on a
 * value we do not understand would put a black chip behind perfectly readable
 * text — and this function never throws, because it runs inside a ProseMirror
 * transaction handler where an exception would break editing entirely.
 */
export function shouldFlagLowContrast(
  foreground: string,
  background: string,
  isLargeText: boolean,
  bodyThreshold: number = BODY_TEXT_CONTRAST_THRESHOLD,
): LowContrastVerdict {
  const parsedForeground = parseCssColor(foreground);
  const parsedBackground = parseCssColor(background);

  if (!parsedForeground || !parsedBackground) {
    return { flag: false, ratio: 0 };
  }

  const surface: Rgba = { ...parsedBackground, a: 1 };
  const ratio = contrastRatio(parsedForeground, surface);

  return { flag: ratio < contrastThresholdFor(isLargeText, bodyThreshold), ratio };
}

/**
 * Flatten a translucent colour onto the surface it is painted over.
 *
 * Contrast is a property of what the eye actually receives, so a 10%-opacity
 * black on white is effectively a pale grey and needs a *dark* chip, not the
 * light one its raw RGB would suggest.
 */
export function flattenColorOver(color: Rgba, background: Rgba): Rgba {
  return color.a >= 1 ? { ...color, a: 1 } : compositeOver(color, background);
}

/**
 * Pick the chip colour to paint behind an unreadable run.
 *
 * Contrast is symmetric, so the colour that would be readable *on* this text is
 * also the colour this text is readable *on*: `readableTextColor` therefore
 * doubles as a backdrop picker, giving pale text a black chip and dark text a
 * white one. Pass the flattened colour from {@link flattenColorOver} — the raw
 * value would mis-classify translucent text.
 *
 * The chip is fully opaque on purpose. Softening it with alpha would blend it
 * back towards the surface and re-introduce exactly the contrast loss we are
 * fixing; the rounded shape and dashed outline are what mark it as an
 * affordance, not transparency.
 */
export function pickBackdropColor(foreground: Rgba): string {
  return readableTextColor(foreground);
}

/**
 * Flatten a stack of background layers, nearest-to-the-text first, onto a
 * fallback surface.
 *
 * The DOM walk collects `background-color` from the text's element and its
 * ancestors; the first opaque layer terminates the stack and everything nearer
 * is composited over it. When nothing opaque is found the caller's fallback
 * stands in.
 */
export function flattenBackgroundLayers(layers: readonly Rgba[], fallback: Rgba): Rgba {
  const visible = layers.filter((layer) => layer.a > 0);
  const opaqueIndex = visible.findIndex((layer) => layer.a >= 1);
  const translucent = opaqueIndex >= 0 ? visible.slice(0, opaqueIndex) : visible;

  let base: Rgba = opaqueIndex >= 0 ? { ...visible[opaqueIndex], a: 1 } : { ...fallback, a: 1 };
  for (let index = translucent.length - 1; index >= 0; index -= 1) {
    base = compositeOver(translucent[index], base);
  }

  return base;
}

/**
 * Last-resort guess at the editing surface when every ancestor is transparent
 * all the way up (which happens inside portals and some print stylesheets).
 *
 * Hardcoding white here would break the dark and 'vibrant' CMS themes, where
 * the *dark* author colours are the invisible ones. The default text colour is
 * a reliable proxy for the theme: light default text means a dark page.
 */
export function inferSurfaceFromTextColor(textColor: Rgba): Rgba {
  return isLightColor(textColor) ? OPAQUE_BLACK : OPAQUE_WHITE;
}

/**
 * Pull one declaration out of an inline `style` attribute.
 *
 * The editor's `PreserveAllAttributesExtension` and `SpanNode` keep raw `style`
 * strings on nodes and on the `textStyle` mark, so pasted markup can carry a
 * colour that never reaches a typed Tiptap attribute. Later declarations win,
 * matching the cascade. This is a pragmatic split rather than a real CSS parser:
 * a value containing a semicolon (a `url(data:...;base64,...)` background, say)
 * will not be extracted, which for our purposes means "no colour found" and is
 * safely ignored.
 */
export function extractStyleDeclaration(
  style: string | null | undefined,
  property: string,
): string | null {
  if (!style) return null;

  const wanted = property.trim().toLowerCase();
  let found: string | null = null;

  for (const declaration of style.split(';')) {
    const separator = declaration.indexOf(':');
    if (separator === -1) continue;

    const name = declaration.slice(0, separator).trim().toLowerCase();
    if (name !== wanted) continue;

    const value = declaration.slice(separator + 1).trim();
    if (value) found = value;
  }

  return found;
}

/**
 * Convert a CSS font size to pixels.
 *
 * `rem` and `em` are resolved against a 16px root, which is the browser default
 * and what this workspace's Tailwind config assumes; we accept that this is an
 * approximation rather than measuring the cascade, because it only ever moves a
 * run between the 4.5:1 and 3:1 bars.
 */
export function parseFontSizePx(value: string | null | undefined): number | null {
  if (!value) return null;

  const match = /^(-?\d*\.?\d+)\s*(px|pt|rem|em|%)?$/i.exec(value.trim().toLowerCase());
  if (!match) return null;

  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return null;

  switch (match[2]) {
    case 'pt':
      return amount * (4 / 3);
    case 'rem':
    case 'em':
      return amount * 16;
    case '%':
      return (amount / 100) * 16;
    default:
      return amount;
  }
}

/** Whether a run qualifies for WCAG's relaxed large-text threshold. */
export function isLargeTextRun(input: LargeTextInput): boolean {
  const pixels = parseFontSizePx(input.fontSize);

  if (pixels !== null) {
    return pixels >= (input.bold ? LARGE_TEXT_BOLD_MIN_PX : LARGE_TEXT_MIN_PX);
  }

  return input.headingLevel !== null && input.headingLevel <= LARGE_TEXT_MAX_HEADING_LEVEL;
}

/** Trim a contrast ratio to the shortest exact decimal, for display. */
export function formatContrastRatio(ratio: number): string {
  const fixed = ratio.toFixed(2);
  return fixed.replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * Build the DOM attributes for a hint decoration.
 *
 * The chip deliberately keeps the author's real colour on top: we are making
 * their text legible, not overriding their choice, and an author who cannot see
 * the text also cannot guess why it suddenly looks different — hence the
 * `title`/`aria-label` quoting the measured ratio and saying, in as many words,
 * that this is an editing aid and is not saved.
 */
export function buildLowContrastHintAttrs(input: LowContrastHintAttrsInput): LowContrastHintAttrs {
  const message =
    `Low contrast in the editor: this text measures ${formatContrastRatio(input.ratio)}:1 ` +
    `against the editing surface and needs ${formatContrastRatio(input.threshold)}:1 to be readable. ` +
    'The backdrop is an editing aid shown only here - it is not part of your content and is not saved.';

  return {
    'aria-label': message,
    class: LOW_CONTRAST_HINT_CLASS,
    style: [
      `background-color:${input.backdrop}`,
      'border-radius:0.2em',
      // A run that wraps across lines should get the chip on every line rather
      // than one box stretched behind the whole paragraph.
      'box-decoration-break:clone',
      '-webkit-box-decoration-break:clone',
      // The dashed ring is what tells the author "the editor added this", and
      // drawing it in their own colour keeps it legible against the chip, which
      // was chosen for maximum contrast with that colour.
      `outline:1px dashed ${input.foreground}`,
      'outline-offset:1px',
      'padding:0 0.15em',
    ].join(';'),
    title: message,
  };
}
