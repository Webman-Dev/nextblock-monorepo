import { describe, expect, it } from 'vitest';
import {
  compositeOver,
  contrastRatio,
  formatHsla,
  formatRgba,
  hexToRgba,
  hslaToRgba,
  isLightColor,
  normalizeHex,
  parseCssColor,
  rateContrast,
  readableTextColor,
  rgbaToHex,
  rgbaToHsla,
} from './color';

describe('normalizeHex', () => {
  it('expands shorthand and uppercases', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(normalizeHex('abc')).toBe('#AABBCC');
    expect(normalizeHex('#abcd')).toBe('#AABBCCDD');
    expect(normalizeHex('#a1b2c3')).toBe('#A1B2C3');
  });

  it('rejects malformed input', () => {
    expect(normalizeHex('#ab')).toBeNull();
    expect(normalizeHex('#abcde')).toBeNull();
    expect(normalizeHex('nope')).toBeNull();
    expect(normalizeHex('')).toBeNull();
  });
});

describe('hexToRgba / rgbaToHex', () => {
  it('round-trips opaque colours', () => {
    expect(hexToRgba('#FF8800')).toEqual({ r: 255, g: 136, b: 0, a: 1 });
    expect(rgbaToHex({ r: 255, g: 136, b: 0, a: 1 })).toBe('#FF8800');
  });

  it('handles the alpha channel', () => {
    const rgba = hexToRgba('#00000080');
    expect(rgba?.a).toBeCloseTo(0.502, 2);
    expect(rgbaToHex({ r: 0, g: 0, b: 0, a: 0.5 }, true)).toBe('#00000080');
  });

  it('drops alpha from the hex when it is opaque or not requested', () => {
    expect(rgbaToHex({ r: 0, g: 0, b: 0, a: 0.5 })).toBe('#000000');
    expect(rgbaToHex({ r: 0, g: 0, b: 0, a: 1 }, true)).toBe('#000000');
  });
});

describe('parseCssColor', () => {
  it('parses rgb and rgba in comma and space syntax', () => {
    expect(parseCssColor('rgb(18, 52, 86)')).toEqual({ r: 18, g: 52, b: 86, a: 1 });
    expect(parseCssColor('rgba(18, 52, 86, 0.5)')).toEqual({ r: 18, g: 52, b: 86, a: 0.5 });
    expect(parseCssColor('rgb(18 52 86 / 50%)')).toEqual({ r: 18, g: 52, b: 86, a: 0.5 });
  });

  it('parses hsl and hsla', () => {
    expect(parseCssColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseCssColor('hsl(120, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
    expect(parseCssColor('hsla(240, 100%, 50%, 0.25)')).toEqual({ r: 0, g: 0, b: 255, a: 0.25 });
  });

  it('parses hex', () => {
    expect(parseCssColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('returns null for values that need the DOM', () => {
    expect(parseCssColor('rebeccapurple')).toBeNull();
    expect(parseCssColor('hsl(var(--primary))')).toBeNull();
    expect(parseCssColor('')).toBeNull();
  });
});

describe('hsl conversion', () => {
  it('round-trips through hsl', () => {
    const original = { r: 34, g: 139, b: 34, a: 1 };
    const back = hslaToRgba(rgbaToHsla(original));
    expect(back.r).toBeCloseTo(original.r, -1);
    expect(back.g).toBeCloseTo(original.g, -1);
    expect(back.b).toBeCloseTo(original.b, -1);
  });

  it('handles achromatic colours', () => {
    expect(rgbaToHsla({ r: 128, g: 128, b: 128, a: 1 })).toEqual({ h: 0, s: 0, l: 50, a: 1 });
    expect(hslaToRgba({ h: 0, s: 0, l: 50, a: 1 })).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('normalises hue outside 0-360', () => {
    expect(hslaToRgba({ h: 480, s: 100, l: 50, a: 1 })).toEqual(hslaToRgba({ h: 120, s: 100, l: 50, a: 1 }));
    expect(hslaToRgba({ h: -120, s: 100, l: 50, a: 1 })).toEqual(hslaToRgba({ h: 240, s: 100, l: 50, a: 1 }));
  });
});

describe('formatting', () => {
  it('omits the alpha component when opaque', () => {
    expect(formatRgba({ r: 1, g: 2, b: 3, a: 1 })).toBe('rgb(1, 2, 3)');
    expect(formatRgba({ r: 1, g: 2, b: 3, a: 0.5 })).toBe('rgba(1, 2, 3, 0.5)');
    expect(formatHsla({ h: 10, s: 20, l: 30, a: 1 })).toBe('hsl(10, 20%, 30%)');
    expect(formatHsla({ h: 10, s: 20, l: 30, a: 0.4 })).toBe('hsla(10, 20%, 30%, 0.4)');
  });
});

describe('contrast', () => {
  const white = { r: 255, g: 255, b: 255, a: 1 };
  const black = { r: 0, g: 0, b: 0, a: 1 };

  it('matches the WCAG reference values', () => {
    expect(contrastRatio(black, white)).toBe(21);
    expect(contrastRatio(white, white)).toBe(1);
    // #767676 on white is the canonical 4.5:1 boundary colour.
    expect(contrastRatio({ r: 118, g: 118, b: 118, a: 1 }, white)).toBeGreaterThanOrEqual(4.5);
  });

  it('composites translucent foregrounds before measuring', () => {
    const halfBlackOnWhite = contrastRatio({ r: 0, g: 0, b: 0, a: 0.5 }, white);
    expect(halfBlackOnWhite).toBeLessThan(21);
    expect(halfBlackOnWhite).toBeGreaterThan(1);
    expect(compositeOver({ r: 0, g: 0, b: 0, a: 0.5 }, white)).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('rates against the right threshold for large text', () => {
    expect(rateContrast(21)).toBe('AAA');
    expect(rateContrast(5)).toBe('AA');
    expect(rateContrast(3.2)).toBe('AA Large');
    expect(rateContrast(2)).toBe('Fail');
    expect(rateContrast(3.2, true)).toBe('AA');
    expect(rateContrast(2, true)).toBe('Fail');
  });
});

describe('readability helpers', () => {
  it('picks a legible foreground', () => {
    expect(isLightColor({ r: 255, g: 255, b: 0, a: 1 })).toBe(true);
    expect(isLightColor({ r: 20, g: 20, b: 60, a: 1 })).toBe(false);
    expect(readableTextColor({ r: 255, g: 255, b: 255, a: 1 })).toBe('#000000');
    expect(readableTextColor({ r: 0, g: 0, b: 0, a: 1 })).toBe('#FFFFFF');
  });
});
