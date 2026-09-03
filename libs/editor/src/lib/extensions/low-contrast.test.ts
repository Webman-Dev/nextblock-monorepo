import { describe, expect, it } from 'vitest';

import {
  BODY_TEXT_CONTRAST_THRESHOLD,
  LARGE_TEXT_CONTRAST_THRESHOLD,
  LOW_CONTRAST_HINT_CLASS,
  buildLowContrastHintAttrs,
  contrastThresholdFor,
  extractStyleDeclaration,
  flattenBackgroundLayers,
  flattenColorOver,
  formatContrastRatio,
  inferSurfaceFromTextColor,
  isLargeTextRun,
  parseFontSizePx,
  pickBackdropColor,
  shouldFlagLowContrast,
} from './low-contrast';

const WHITE = '#FFFFFF';
const NEAR_BLACK = '#0A0A0A';

describe('shouldFlagLowContrast', () => {
  it('flags white text on the white editing surface', () => {
    const verdict = shouldFlagLowContrast(WHITE, WHITE, false);
    expect(verdict).toEqual({ flag: true, ratio: 1 });
  });

  it('leaves black text on the white editing surface alone', () => {
    const verdict = shouldFlagLowContrast('#000000', WHITE, false);
    expect(verdict).toEqual({ flag: false, ratio: 21 });
  });

  it('resolves the body threshold on the readable side of the 4.5:1 boundary', () => {
    // #767676 measures 4.54:1 on white, the last grey that still clears AA body.
    const verdict = shouldFlagLowContrast('#767676', WHITE, false);
    expect(verdict.ratio).toBe(4.54);
    expect(verdict.flag).toBe(false);
  });

  it('resolves the body threshold on the failing side of the 4.5:1 boundary', () => {
    // One channel step lighter, #777777, drops to 4.48:1 and must be flagged.
    const verdict = shouldFlagLowContrast('#777777', WHITE, false);
    expect(verdict.ratio).toBe(4.48);
    expect(verdict.flag).toBe(true);
  });

  it('holds large text to 3:1 instead of 4.5:1', () => {
    // The same grey that fails as body copy passes as a heading.
    expect(shouldFlagLowContrast('#777777', WHITE, true).flag).toBe(false);
    // #959595 lands exactly on 3.00:1, which clears the bar...
    expect(shouldFlagLowContrast('#959595', WHITE, true)).toEqual({ flag: false, ratio: 3 });
    // ...and one step lighter falls under it.
    expect(shouldFlagLowContrast('#969696', WHITE, true)).toEqual({ flag: true, ratio: 2.96 });
  });

  it('composites a translucent foreground over the surface before measuring', () => {
    // Opaque black passes easily; the same black at 10% opacity is a pale grey
    // in practice and has to be flagged.
    expect(shouldFlagLowContrast('rgba(0, 0, 0, 1)', WHITE, false).flag).toBe(false);
    const faded = shouldFlagLowContrast('rgba(0, 0, 0, 0.1)', WHITE, false);
    expect(faded.ratio).toBe(1.25);
    expect(faded.flag).toBe(true);
  });

  it('never flags or throws on a colour it cannot parse', () => {
    expect(() => shouldFlagLowContrast('var(--brand)', WHITE, false)).not.toThrow();
    expect(shouldFlagLowContrast('var(--brand)', WHITE, false)).toEqual({ flag: false, ratio: 0 });
    expect(shouldFlagLowContrast('linear-gradient(red, blue)', WHITE, false)).toEqual({
      flag: false,
      ratio: 0,
    });
    expect(shouldFlagLowContrast(WHITE, 'not-a-colour', false)).toEqual({ flag: false, ratio: 0 });
    expect(shouldFlagLowContrast('', '', false)).toEqual({ flag: false, ratio: 0 });
  });

  it('does not flag pale text once the surface is dark', () => {
    // The dark theme inverts which colours are in trouble: the pale text that
    // is invisible on white is perfectly readable here...
    expect(shouldFlagLowContrast('#E5E7EB', NEAR_BLACK, false)).toEqual({ flag: false, ratio: 15.99 });
    expect(shouldFlagLowContrast(WHITE, NEAR_BLACK, false).flag).toBe(false);
    // ...and it is the dark author colours that now need a backdrop.
    expect(shouldFlagLowContrast('#1F2937', NEAR_BLACK, false)).toEqual({ flag: true, ratio: 1.35 });
  });

  it('honours a caller-supplied threshold', () => {
    // #767676 clears AA body at 4.54:1 but not AAA at 7:1.
    expect(shouldFlagLowContrast('#767676', WHITE, false, 7).flag).toBe(true);
    expect(shouldFlagLowContrast('#767676', WHITE, false, 3).flag).toBe(false);
  });

  it('ignores alpha on the background, which the caller has already flattened', () => {
    expect(shouldFlagLowContrast(WHITE, 'rgba(255, 255, 255, 0.4)', false)).toEqual({
      flag: true,
      ratio: 1,
    });
  });
});

describe('contrastThresholdFor', () => {
  it('reproduces the WCAG AA pair exactly', () => {
    expect(contrastThresholdFor(false)).toBe(BODY_TEXT_CONTRAST_THRESHOLD);
    expect(contrastThresholdFor(true)).toBe(LARGE_TEXT_CONTRAST_THRESHOLD);
  });

  it('scales an overridden body threshold proportionally', () => {
    expect(contrastThresholdFor(false, 7)).toBe(7);
    expect(contrastThresholdFor(true, 7)).toBe(4.67);
  });

  it('never produces a threshold below the 1:1 floor', () => {
    expect(contrastThresholdFor(true, 0.5)).toBe(1);
  });
});

describe('pickBackdropColor', () => {
  it('gives pale text a dark chip and dark text a light chip', () => {
    expect(pickBackdropColor({ r: 255, g: 255, b: 255, a: 1 })).toBe('#000000');
    expect(pickBackdropColor({ r: 250, g: 245, b: 235, a: 1 })).toBe('#000000');
    expect(pickBackdropColor({ r: 0, g: 0, b: 0, a: 1 })).toBe('#FFFFFF');
    expect(pickBackdropColor({ r: 31, g: 41, b: 55, a: 1 })).toBe('#FFFFFF');
  });

  it('follows the flattened colour, not the raw one, for translucent text', () => {
    const raw = { r: 0, g: 0, b: 0, a: 0.1 };
    // Raw black would ask for a white chip, which would be invisible behind
    // text that actually renders as a pale grey.
    const flattened = flattenColorOver(raw, { r: 255, g: 255, b: 255, a: 1 });
    expect(flattened).toEqual({ r: 230, g: 230, b: 230, a: 1 });
    expect(pickBackdropColor(flattened)).toBe('#000000');
  });
});

describe('flattenColorOver', () => {
  it('passes opaque colours through unchanged', () => {
    expect(flattenColorOver({ r: 12, g: 34, b: 56, a: 1 }, { r: 255, g: 255, b: 255, a: 1 })).toEqual({
      r: 12,
      g: 34,
      b: 56,
      a: 1,
    });
  });
});

describe('flattenBackgroundLayers', () => {
  const fallback = { r: 255, g: 255, b: 255, a: 1 };

  it('falls back when there is nothing to composite', () => {
    expect(flattenBackgroundLayers([], fallback)).toEqual(fallback);
    expect(flattenBackgroundLayers([{ r: 0, g: 0, b: 0, a: 0 }], fallback)).toEqual(fallback);
  });

  it('stops at the first opaque layer and ignores everything behind it', () => {
    const layers = [
      { r: 0, g: 0, b: 0, a: 1 },
      { r: 255, g: 0, b: 0, a: 1 },
    ];
    expect(flattenBackgroundLayers(layers, fallback)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it('composites nearer translucent layers over the opaque one', () => {
    const layers = [
      { r: 255, g: 255, b: 255, a: 0.5 },
      { r: 0, g: 0, b: 0, a: 1 },
    ];
    expect(flattenBackgroundLayers(layers, fallback)).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });

  it('composites over the fallback when no layer is opaque', () => {
    const layers = [{ r: 0, g: 0, b: 0, a: 0.5 }];
    expect(flattenBackgroundLayers(layers, fallback)).toEqual({ r: 128, g: 128, b: 128, a: 1 });
  });
});

describe('inferSurfaceFromTextColor', () => {
  it('reads a dark page from light default text and vice versa', () => {
    expect(inferSurfaceFromTextColor({ r: 240, g: 240, b: 240, a: 1 })).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 1,
    });
    expect(inferSurfaceFromTextColor({ r: 10, g: 10, b: 10, a: 1 })).toEqual({
      r: 255,
      g: 255,
      b: 255,
      a: 1,
    });
  });
});

describe('extractStyleDeclaration', () => {
  it('finds a declaration regardless of spacing and case', () => {
    expect(extractStyleDeclaration('COLOR:  #FFF ;font-weight:700', 'color')).toBe('#FFF');
    expect(extractStyleDeclaration('background-color: rgba(0, 0, 0, 0.5)', 'background-color')).toBe(
      'rgba(0, 0, 0, 0.5)',
    );
  });

  it('lets the last declaration win, matching the cascade', () => {
    expect(extractStyleDeclaration('color:#111;color:#222', 'color')).toBe('#222');
  });

  it('does not confuse a longhand property with its prefix', () => {
    expect(extractStyleDeclaration('background-color:#111', 'color')).toBeNull();
  });

  it('returns null for absent, empty and malformed input', () => {
    expect(extractStyleDeclaration(null, 'color')).toBeNull();
    expect(extractStyleDeclaration('', 'color')).toBeNull();
    expect(extractStyleDeclaration('color', 'color')).toBeNull();
    expect(extractStyleDeclaration('color:;', 'color')).toBeNull();
  });

  it('keeps colons inside the value', () => {
    expect(extractStyleDeclaration('background-image:url(http://x/y.png)', 'background-image')).toBe(
      'url(http://x/y.png)',
    );
  });
});

describe('parseFontSizePx', () => {
  it('converts the units the editor actually emits', () => {
    expect(parseFontSizePx('24px')).toBe(24);
    expect(parseFontSizePx('  32  ')).toBe(32);
    expect(parseFontSizePx('18pt')).toBe(24);
    expect(parseFontSizePx('1.5rem')).toBe(24);
    expect(parseFontSizePx('200%')).toBe(32);
  });

  it('returns null for values it cannot resolve', () => {
    expect(parseFontSizePx(null)).toBeNull();
    expect(parseFontSizePx('')).toBeNull();
    expect(parseFontSizePx('larger')).toBeNull();
    expect(parseFontSizePx('calc(1rem + 2px)')).toBeNull();
  });
});

describe('isLargeTextRun', () => {
  it('prefers an explicit font size over the heading guess', () => {
    expect(isLargeTextRun({ bold: false, fontSize: '24px', headingLevel: null })).toBe(true);
    expect(isLargeTextRun({ bold: false, fontSize: '23px', headingLevel: null })).toBe(false);
    // An explicit small size beats being inside an h1.
    expect(isLargeTextRun({ bold: false, fontSize: '12px', headingLevel: 1 })).toBe(false);
  });

  it('applies WCAG’s lower floor to bold text', () => {
    expect(isLargeTextRun({ bold: true, fontSize: '19px', headingLevel: null })).toBe(true);
    expect(isLargeTextRun({ bold: false, fontSize: '19px', headingLevel: null })).toBe(false);
  });

  it('treats h1-h3 as large text and everything else as body copy', () => {
    expect(isLargeTextRun({ bold: false, fontSize: null, headingLevel: 1 })).toBe(true);
    expect(isLargeTextRun({ bold: false, fontSize: null, headingLevel: 3 })).toBe(true);
    expect(isLargeTextRun({ bold: false, fontSize: null, headingLevel: 4 })).toBe(false);
    expect(isLargeTextRun({ bold: false, fontSize: null, headingLevel: null })).toBe(false);
  });
});

describe('formatContrastRatio', () => {
  it('trims trailing zeros without mangling whole numbers', () => {
    expect(formatContrastRatio(3)).toBe('3');
    expect(formatContrastRatio(4.5)).toBe('4.5');
    expect(formatContrastRatio(4.48)).toBe('4.48');
    expect(formatContrastRatio(21)).toBe('21');
  });
});

describe('buildLowContrastHintAttrs', () => {
  const attrs = buildLowContrastHintAttrs({
    backdrop: '#000000',
    foreground: 'rgb(255, 255, 255)',
    ratio: 1,
    threshold: 4.5,
  });

  it('quotes the measured ratio and the bar it missed', () => {
    expect(attrs.title).toContain('1:1');
    expect(attrs.title).toContain('4.5:1');
    expect(attrs['aria-label']).toBe(attrs.title);
  });

  it('says the backdrop is an editing aid that is not saved', () => {
    expect(attrs.title).toContain('is not saved');
  });

  it('paints the chip and rings it in the author’s own colour, never overriding it', () => {
    expect(attrs.class).toBe(LOW_CONTRAST_HINT_CLASS);
    expect(attrs.style).toContain('background-color:#000000');
    expect(attrs.style).toContain('outline:1px dashed rgb(255, 255, 255)');
    // Setting `color` here would replace the author's choice rather than make
    // it legible, which is the one thing this feature must never do.
    expect(attrs.style).not.toMatch(/(^|;)\s*color:/);
  });
});
