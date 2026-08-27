import type { CSSProperties } from 'react';

/**
 * Text-colour model shared by the block renderers and the CMS previews.
 *
 * A colour is stored as EITHER a theme token keyword (`"primary"`) — which keeps
 * following the active theme and dark mode — OR a literal CSS colour emitted by
 * the colour picker (`"#FF8800"`, `"rgba(...)"`, `"hsl(...)"`). Tokens render as
 * a static Tailwind class; literals render as an inline style.
 *
 * Keep this the single source of truth: HeadingBlockRenderer, EditableBlock and
 * ColumnEditor previously each carried their own map and had drifted apart
 * (`muted` rendered as the near-invisible `text-muted` on the live site while
 * both previews used `text-muted-foreground`).
 */

export const TEXT_COLOR_TOKENS = [
  'foreground',
  'primary',
  'secondary',
  'accent',
  'muted',
  'destructive',
  'background',
] as const;

export type TextColorToken = (typeof TEXT_COLOR_TOKENS)[number];

/**
 * Token -> Tailwind class.
 *
 * These must be written as complete literals, never interpolated. Tailwind v4
 * ignores the `safelist` key in the legacy JS config (libs/ui/tailwind.config.js
 * still carries one, but v4 never reads it) — a class exists only if the scanner
 * finds the whole string in a source file. Listing them here is what guarantees
 * they are emitted.
 */
export const TEXT_COLOR_CLASSES: Record<TextColorToken, string> = {
  foreground: 'text-foreground',
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'text-accent',
  // `--muted` is a near-white surface colour; the readable pair is its foreground.
  muted: 'text-muted-foreground',
  destructive: 'text-destructive',
  background: 'text-background',
};

/** Token -> CSS colour, for painting swatches in the editor. */
export const TEXT_COLOR_SWATCHES: Record<TextColorToken, string> = {
  foreground: 'hsl(var(--foreground))',
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  muted: 'hsl(var(--muted-foreground))',
  destructive: 'hsl(var(--destructive))',
  background: 'hsl(var(--background))',
};

export const TEXT_COLOR_LABELS: Record<TextColorToken, string> = {
  foreground: 'Default text',
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  muted: 'Muted',
  destructive: 'Destructive',
  background: 'Background',
};

/** Token options in the shape `ColorField` expects. */
export const TEXT_COLOR_TOKEN_OPTIONS = TEXT_COLOR_TOKENS.map((token) => ({
  value: token,
  label: TEXT_COLOR_LABELS[token],
  cssColor: TEXT_COLOR_SWATCHES[token],
}));

/**
 * Accepts what the colour picker can emit. Deliberately permissive on the inner
 * grammar — the picker only produces well-formed values, and being strict here
 * would reject legitimate colours authored by hand or by Cortex AI.
 */
export const CSS_COLOR_PATTERN =
  /^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([^)]+\)|hsla?\([^)]+\))$/i;

/**
 * CSS named colours, which the picker never emits but hand-authored and AI-authored
 * content does.
 *
 * The seeded contact page sets `textColor: "white"` on its heading. That is perfectly
 * valid CSS, but it matched neither a theme token nor the literal pattern above, so
 * `resolveTextColor` returned `{}` and the heading quietly inherited the dark default —
 * a white-on-dark hero rendering dark-on-dark, with nothing anywhere reporting a problem.
 *
 * Spelled out as a set rather than folded into the pattern as `[a-z]+`, because
 * `isCustomCssColor` has to keep answering false for a theme token like `accent`: the
 * two are stored in the same field and told apart only by these predicates.
 */
const CSS_NAMED_COLORS = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue ' +
    'blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk ' +
    'crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki ' +
    'darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen ' +
    'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue ' +
    'dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite ' +
    'gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
    'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
    'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen ' +
    'lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen ' +
    'magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen ' +
    'mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream ' +
    'mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
    'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
    'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown ' +
    'seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen ' +
    'steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow ' +
    'yellowgreen transparent currentcolor'
  ).split(' ')
);

export function isCssNamedColor(value: unknown): value is string {
  return typeof value === 'string' && CSS_NAMED_COLORS.has(value.trim().toLowerCase());
}

export function isTextColorToken(value: unknown): value is TextColorToken {
  return typeof value === 'string' && (TEXT_COLOR_TOKENS as readonly string[]).includes(value);
}

export function isCustomCssColor(value: unknown): value is string {
  return (
    (typeof value === 'string' && CSS_COLOR_PATTERN.test(value.trim())) ||
    isCssNamedColor(value)
  );
}

export interface ResolvedTextColor {
  className?: string;
  style?: CSSProperties;
}

/**
 * Turn a stored colour into render props. Unknown values resolve to `{}` so a
 * stale or hand-edited value degrades to the inherited colour rather than
 * emitting a bogus Tailwind class.
 */
export function resolveTextColor(value: string | null | undefined): ResolvedTextColor {
  if (!value) return {};
  const trimmed = value.trim();
  if (isTextColorToken(trimmed)) {
    return { className: TEXT_COLOR_CLASSES[trimmed] };
  }
  if (isCustomCssColor(trimmed)) {
    return { style: { color: trimmed } };
  }
  return {};
}

/**
 * Text alignment, also as literals. `text-justify` currently only survives
 * because the string happens to appear in a regex in libs/editor/src/lib/kit.ts;
 * pinning it here removes that accidental dependency.
 */
export const TEXT_ALIGN_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
} as const;

export type TextAlign = keyof typeof TEXT_ALIGN_CLASSES;

export function resolveTextAlign(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return TEXT_ALIGN_CLASSES[value as TextAlign];
}
