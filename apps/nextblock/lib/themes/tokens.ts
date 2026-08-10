/**
 * The design tokens a theme can set.
 *
 * These mirror the CSS custom properties consumed by libs/ui/tailwind.config.js.
 * Anything not listed here is rejected when a theme is saved, so a stored theme
 * can never introduce an unknown custom property (or a CSS injection) into the
 * stylesheet the root layout renders.
 */

export type ThemeTokenKind = 'color' | 'length';

export interface ThemeTokenDef {
  /** Custom property name without the leading `--`. */
  key: string;
  label: string;
  kind: ThemeTokenKind;
  /** Token whose value is a sensible backdrop for contrast-checking this one. */
  pairedWith?: string;
  hint?: string;
}

export interface ThemeTokenGroup {
  id: string;
  label: string;
  description: string;
  tokens: ThemeTokenDef[];
}

export const THEME_TOKEN_GROUPS: ThemeTokenGroup[] = [
  {
    id: 'surfaces',
    label: 'Surfaces',
    description: 'Page and container backgrounds, and the text that sits on them.',
    tokens: [
      { key: 'background', label: 'Page background', kind: 'color' },
      { key: 'foreground', label: 'Body text', kind: 'color', pairedWith: 'background' },
      { key: 'card', label: 'Card background', kind: 'color' },
      { key: 'card-foreground', label: 'Card text', kind: 'color', pairedWith: 'card' },
      { key: 'popover', label: 'Popover background', kind: 'color' },
      { key: 'popover-foreground', label: 'Popover text', kind: 'color', pairedWith: 'popover' },
    ],
  },
  {
    id: 'brand',
    label: 'Brand',
    description: 'Primary actions and supporting brand tints.',
    tokens: [
      { key: 'primary', label: 'Primary', kind: 'color' },
      { key: 'primary-foreground', label: 'On primary', kind: 'color', pairedWith: 'primary' },
      { key: 'secondary', label: 'Secondary', kind: 'color' },
      { key: 'secondary-foreground', label: 'On secondary', kind: 'color', pairedWith: 'secondary' },
      { key: 'accent', label: 'Accent', kind: 'color' },
      { key: 'accent-foreground', label: 'On accent', kind: 'color', pairedWith: 'accent' },
    ],
  },
  {
    id: 'states',
    label: 'States',
    description: 'Feedback colours and de-emphasised content.',
    tokens: [
      { key: 'muted', label: 'Muted surface', kind: 'color' },
      { key: 'muted-foreground', label: 'Muted text', kind: 'color', pairedWith: 'background' },
      { key: 'destructive', label: 'Destructive', kind: 'color' },
      { key: 'destructive-foreground', label: 'On destructive', kind: 'color', pairedWith: 'destructive' },
      { key: 'warning', label: 'Warning', kind: 'color' },
      { key: 'warning-foreground', label: 'On warning', kind: 'color', pairedWith: 'warning' },
    ],
  },
  {
    id: 'controls',
    label: 'Controls',
    description: 'Borders, form inputs and focus rings.',
    tokens: [
      { key: 'border', label: 'Border', kind: 'color' },
      { key: 'input', label: 'Input border', kind: 'color' },
      { key: 'ring', label: 'Focus ring', kind: 'color' },
    ],
  },
  {
    id: 'charts',
    label: 'Charts',
    description: 'Categorical series colours for data visualisations.',
    tokens: [
      { key: 'chart-1', label: 'Series 1', kind: 'color' },
      { key: 'chart-2', label: 'Series 2', kind: 'color' },
      { key: 'chart-3', label: 'Series 3', kind: 'color' },
      { key: 'chart-4', label: 'Series 4', kind: 'color' },
      { key: 'chart-5', label: 'Series 5', kind: 'color' },
    ],
  },
  {
    id: 'shape',
    label: 'Shape',
    description: 'Global geometry.',
    tokens: [
      {
        key: 'radius',
        label: 'Corner radius',
        kind: 'length',
        hint: 'A CSS length, e.g. 0.75rem. Use 0px for square corners.',
      },
    ],
  },
];

export const THEME_TOKENS: ThemeTokenDef[] = THEME_TOKEN_GROUPS.flatMap((group) => group.tokens);

export const THEME_TOKEN_KEYS: string[] = THEME_TOKENS.map((token) => token.key);

const TOKEN_BY_KEY = new Map(THEME_TOKENS.map((token) => [token.key, token]));

export function getThemeToken(key: string): ThemeTokenDef | undefined {
  return TOKEN_BY_KEY.get(key);
}

export function isThemeTokenKey(key: string): boolean {
  return TOKEN_BY_KEY.has(key);
}

/**
 * Colour tokens are stored as bare HSL triplets (`"222 47% 11%"`) because the
 * Tailwind config wraps them in `hsl(var(--token))` and relies on being able to
 * append an alpha, as in `hsl(var(--primary) / 0.5)`.
 */
export const HSL_TRIPLET_PATTERN = /^-?\d{1,3}(?:\.\d+)?(?:deg)?[\s,]+\d{1,3}(?:\.\d+)?%[\s,]+\d{1,3}(?:\.\d+)?%$/;

export const LENGTH_PATTERN = /^(?:0|-?\d{1,4}(?:\.\d+)?(?:px|rem|em|%|vh|vw))$/;

/**
 * Reject anything that could terminate the declaration and start a new rule.
 * Values are interpolated into a <style> tag, so this is a security boundary,
 * not a nicety.
 */
const UNSAFE_VALUE_CHARS = /[;{}<>@\\()]/;

export function isValidTokenValue(key: string, value: string): boolean {
  const token = getThemeToken(key);
  if (!token) return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64) return false;
  if (UNSAFE_VALUE_CHARS.test(trimmed)) return false;
  return token.kind === 'color' ? HSL_TRIPLET_PATTERN.test(trimmed) : LENGTH_PATTERN.test(trimmed);
}
