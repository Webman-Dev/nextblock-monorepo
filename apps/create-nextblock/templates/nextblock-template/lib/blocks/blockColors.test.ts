import { describe, expect, it } from 'vitest';
import {
  TEXT_COLOR_CLASSES,
  TEXT_COLOR_TOKENS,
  TEXT_COLOR_TOKEN_OPTIONS,
  isCustomCssColor,
  isTextColorToken,
  resolveTextAlign,
  resolveTextColor,
} from './blockColors';
import { HeadingBlockSchema } from './blockRegistry';

describe('resolveTextColor', () => {
  it('maps theme tokens to a static class and no inline style', () => {
    expect(resolveTextColor('primary')).toEqual({ className: 'text-primary' });
    expect(resolveTextColor('foreground')).toEqual({ className: 'text-foreground' });
  });

  it('maps "muted" to the readable foreground pair, not the surface colour', () => {
    // Regression: the renderer used to emit `text-muted` (hsl(var(--muted)),
    // a near-white surface) while both CMS previews used muted-foreground.
    expect(resolveTextColor('muted')).toEqual({ className: 'text-muted-foreground' });
  });

  it('renders custom colours as an inline style', () => {
    expect(resolveTextColor('#FF8800')).toEqual({ style: { color: '#FF8800' } });
    expect(resolveTextColor('rgba(255, 136, 0, 0.8)')).toEqual({ style: { color: 'rgba(255, 136, 0, 0.8)' } });
    expect(resolveTextColor('hsl(28, 100%, 50%)')).toEqual({ style: { color: 'hsl(28, 100%, 50%)' } });
    expect(resolveTextColor('#f80')).toEqual({ style: { color: '#f80' } });
    expect(resolveTextColor('#FF880080')).toEqual({ style: { color: '#FF880080' } });
  });

  it('trims incidental whitespace', () => {
    expect(resolveTextColor('  primary  ')).toEqual({ className: 'text-primary' });
    expect(resolveTextColor('  #FF8800 ')).toEqual({ style: { color: '#FF8800' } });
  });

  it('degrades to inherited colour rather than emitting a bogus class', () => {
    expect(resolveTextColor(undefined)).toEqual({});
    expect(resolveTextColor(null)).toEqual({});
    expect(resolveTextColor('')).toEqual({});
    expect(resolveTextColor('notacolour')).toEqual({});
    expect(resolveTextColor('javascript:alert(1)')).toEqual({});
    expect(resolveTextColor('url(https://evil.test/x.png)')).toEqual({});
    // A valid name with anything appended is not a name — this is the injection case,
    // and it must stay rejected even though `red` on its own is now accepted.
    expect(resolveTextColor('red; background: url(x)')).toEqual({});
  });

  it('accepts CSS named colours, which seeded and AI-authored content actually uses', () => {
    // The seeded contact-page heading is `textColor: "white"`. It matched neither a
    // token nor the hex/rgb/hsl pattern, so it resolved to {} and the white-on-dark hero
    // rendered dark-on-dark with nothing reporting a problem.
    expect(resolveTextColor('white')).toEqual({ style: { color: 'white' } });
    expect(resolveTextColor('Black')).toEqual({ style: { color: 'Black' } });
    expect(resolveTextColor('  transparent ')).toEqual({ style: { color: 'transparent' } });

    // Still distinguishable from a theme token, which resolves to a class instead.
    expect(resolveTextColor('accent')).toEqual({ className: 'text-accent' });
  });

  it('never emits an interpolated class name', () => {
    for (const token of TEXT_COLOR_TOKENS) {
      const { className } = resolveTextColor(token);
      expect(className).toBe(TEXT_COLOR_CLASSES[token]);
      expect(className?.startsWith('text-')).toBe(true);
    }
  });
});

describe('resolveTextAlign', () => {
  it('covers every alignment the schema allows', () => {
    expect(resolveTextAlign('left')).toBe('text-left');
    expect(resolveTextAlign('center')).toBe('text-center');
    expect(resolveTextAlign('right')).toBe('text-right');
    expect(resolveTextAlign('justify')).toBe('text-justify');
  });

  it('ignores unknown values', () => {
    expect(resolveTextAlign(undefined)).toBeUndefined();
    expect(resolveTextAlign('sideways')).toBeUndefined();
  });
});

describe('guards', () => {
  it('distinguishes tokens from custom colours', () => {
    expect(isTextColorToken('accent')).toBe(true);
    expect(isTextColorToken('#FFF')).toBe(false);
    expect(isCustomCssColor('#FFF')).toBe(true);
    expect(isCustomCssColor('white')).toBe(true);
    // A theme token is not a literal colour: the two share one field and are told apart
    // only here, so this must keep answering false.
    expect(isCustomCssColor('accent')).toBe(false);
    expect(isCustomCssColor('notacolour')).toBe(false);
  });
});

describe('token options', () => {
  it('exposes a label and swatch for every token', () => {
    expect(TEXT_COLOR_TOKEN_OPTIONS).toHaveLength(TEXT_COLOR_TOKENS.length);
    for (const option of TEXT_COLOR_TOKEN_OPTIONS) {
      expect(option.label).toBeTruthy();
      expect(option.cssColor).toMatch(/^hsl\(var\(--[a-z-]+\)\)$/);
    }
  });
});

describe('HeadingBlockSchema.textColor', () => {
  const base = { level: 2 as const, text_content: 'Hello' };

  it('still accepts every previously stored token', () => {
    for (const token of ['primary', 'secondary', 'accent', 'muted', 'destructive', 'background']) {
      expect(HeadingBlockSchema.safeParse({ ...base, textColor: token }).success).toBe(true);
    }
  });

  it('accepts custom colours from the picker', () => {
    for (const color of ['#FF8800', '#f80', '#FF880080', 'rgb(1,2,3)', 'rgba(1,2,3,0.5)', 'hsl(28, 100%, 50%)']) {
      expect(HeadingBlockSchema.safeParse({ ...base, textColor: color }).success).toBe(true);
    }
  });

  it('rejects values that are neither a token nor a colour', () => {
    // 'red' was in this list only because named colours used to be rejected wholesale.
    // It is a real colour and is now accepted; the genuinely invalid values stay here.
    for (const bad of ['nonsense', 'url(x)', 'red; background: url(x)', '']) {
      expect(HeadingBlockSchema.safeParse({ ...base, textColor: bad }).success).toBe(false);
    }
  });

  it('stays optional', () => {
    expect(HeadingBlockSchema.safeParse(base).success).toBe(true);
  });
});
