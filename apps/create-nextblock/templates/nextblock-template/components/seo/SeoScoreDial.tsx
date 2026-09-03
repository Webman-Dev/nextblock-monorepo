'use client';

/**
 * The 0-100 SEO score, drawn as a ring.
 *
 * Built from inline SVG rather than the shared `Progress` primitive because the
 * primitive hard-codes `bg-primary` on its indicator, and the whole point of
 * this control is that its colour carries the verdict: emerald when the page is
 * in good shape, amber when it needs attention, red when it is failing. A bar
 * that is always brand-purple would force the reader to parse the number before
 * they learn anything, which defeats having a meter at all.
 *
 * Accessibility is the other reason for hand-drawing it. The ring is exposed as
 * an ARIA `meter` with a real name, a real value and a spoken `aria-valuetext`
 * that includes the band, so a screen reader announces "SEO score: 82 out of
 * 100, good" instead of reading an unlabelled graphic. The band is also printed
 * as text under the ring, so nothing here is communicated by colour alone.
 */

import * as React from 'react';

import { cn } from '@nextblock-cms/utils';
import type { SeoAuditScope, SeoScoreBand } from '@nextblock-cms/utils/seo';

/**
 * Band to colour, following the CMS convention set by `VisibilityControl`:
 * emerald reads as fine, amber as a caution, red as a failure.
 *
 * `excellent` and `good` deliberately share emerald. Splitting them across two
 * hues would introduce a fourth colour with no established meaning in this UI;
 * the difference between the two bands is carried by the label instead, which
 * is the part a reader can actually act on.
 */
const BAND_STROKE: Record<SeoScoreBand, string> = {
  excellent: 'text-emerald-500',
  fair: 'text-amber-500',
  good: 'text-emerald-500',
  poor: 'text-red-500',
};

const BAND_TEXT: Record<SeoScoreBand, string> = {
  excellent: 'text-emerald-700 dark:text-emerald-400',
  fair: 'text-amber-700 dark:text-amber-400',
  good: 'text-emerald-700 dark:text-emerald-400',
  poor: 'text-red-700 dark:text-red-400',
};

/** Reader-facing wording for each band; `poor` is phrased as work, not failure. */
const BAND_LABEL: Record<SeoScoreBand, string> = {
  excellent: 'Excellent',
  fair: 'Fair',
  good: 'Good',
  poor: 'Needs work',
};

/**
 * What the number under the ring is a score *of*.
 *
 * This caption is the one line that tells a reader whether they are looking at a
 * verdict on the whole page or on the paragraph in front of them, and confusing
 * the two is the exact bug the page-level audit was introduced to end. It is
 * therefore keyed off the scope rather than written once and left to drift.
 */
const SCOPE_CAPTION: Record<SeoAuditScope, string> = {
  block: 'Weighted across the checks a single block can pass or fail.',
  page: 'Weighted across every check that applies to this page.',
};

export interface SeoScoreDialProps {
  band: SeoScoreBand;
  className?: string;
  /** 0-100. Values outside that range are clamped rather than drawn wrong. */
  score: number;
  /** Defaults to `'page'`, matching the audit engine's own default scope. */
  scope?: SeoAuditScope;
}

/**
 * Geometry constants. The ring is drawn in a fixed 120x120 user-space viewBox
 * and scaled by CSS, so the stroke stays circular at any rendered size and the
 * dash maths below never has to know how big the element ended up on screen.
 */
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SeoScoreDial({ band, className, score, scope = 'page' }: SeoScoreDialProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number.isFinite(score) ? score : 0)));
  // A stroke-dashoffset of the full circumference is an empty ring and an
  // offset of zero is a full one, so the filled fraction is the complement.
  const dashOffset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div
        aria-label="SEO score"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={clamped}
        aria-valuetext={`${clamped} out of 100, ${BAND_LABEL[band].toLowerCase()}`}
        className="relative h-20 w-20 shrink-0"
        role="meter"
      >
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            className="text-muted"
            cx="60"
            cy="60"
            fill="none"
            r={RADIUS}
            stroke="currentColor"
            strokeWidth="10"
          />
          <circle
            className={cn('transition-[stroke-dashoffset] duration-500', BAND_STROKE[band])}
            cx="60"
            cy="60"
            fill="none"
            r={RADIUS}
            stroke="currentColor"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeWidth="10"
          />
        </svg>
        {/* The number inside the ring duplicates `aria-valuetext`, so it is
            hidden from assistive technology to avoid announcing it twice. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center text-xl font-semibold tabular-nums"
        >
          {clamped}
        </span>
      </div>

      <div className="min-w-0">
        <p className={cn('text-sm font-semibold', BAND_TEXT[band])}>{BAND_LABEL[band]}</p>
        <p className="text-xs text-muted-foreground">{SCOPE_CAPTION[scope]}</p>
      </div>
    </div>
  );
}

export default SeoScoreDial;
