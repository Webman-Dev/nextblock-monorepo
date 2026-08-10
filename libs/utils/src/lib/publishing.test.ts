import { describe, expect, it } from 'vitest';
import {
  buildPublishedAtOrFilter,
  isFutureSchedule,
  isPubliclyVisible,
  resolveVisibilityState,
} from './publishing';

const NOW = Date.UTC(2026, 7, 10, 12, 0, 0);
const PAST = new Date(NOW - 60_000).toISOString();
const FUTURE = new Date(NOW + 60_000).toISOString();

describe('resolveVisibilityState', () => {
  it('treats a live status with no date as published', () => {
    expect(resolveVisibilityState({ status: 'published', publishedAt: null }, NOW)).toBe('published');
  });

  it('treats a past date as published', () => {
    expect(resolveVisibilityState({ status: 'published', publishedAt: PAST }, NOW)).toBe('published');
  });

  it('treats a future date as scheduled', () => {
    expect(resolveVisibilityState({ status: 'published', publishedAt: FUTURE }, NOW)).toBe('scheduled');
  });

  it('never reports scheduled for a row that is not live-status', () => {
    // A draft with a future date is still just a draft — publishing it is a
    // separate decision, and the date alone must not imply it will go live.
    expect(resolveVisibilityState({ status: 'draft', publishedAt: FUTURE }, NOW)).toBe('draft');
  });

  it('reports archived regardless of date', () => {
    expect(resolveVisibilityState({ status: 'archived', publishedAt: PAST }, NOW)).toBe('archived');
  });

  it('uses the product live status when told to', () => {
    expect(
      resolveVisibilityState({ status: 'active', publishedAt: null, liveStatus: 'active' }, NOW)
    ).toBe('published');
    // 'published' is not a product status, so it must NOT read as live.
    expect(
      resolveVisibilityState({ status: 'published', publishedAt: null, liveStatus: 'active' }, NOW)
    ).toBe('draft');
  });

  it('ignores an unparseable date rather than hiding the row', () => {
    expect(resolveVisibilityState({ status: 'published', publishedAt: 'not-a-date' }, NOW)).toBe(
      'published'
    );
  });
});

describe('isPubliclyVisible', () => {
  it('is true only for the published state', () => {
    expect(isPubliclyVisible({ status: 'published', publishedAt: PAST }, NOW)).toBe(true);
    expect(isPubliclyVisible({ status: 'published', publishedAt: FUTURE }, NOW)).toBe(false);
    expect(isPubliclyVisible({ status: 'draft', publishedAt: null }, NOW)).toBe(false);
    expect(isPubliclyVisible({ status: 'archived', publishedAt: null }, NOW)).toBe(false);
  });
});

describe('buildPublishedAtOrFilter', () => {
  it('emits a PostgREST or-clause covering null and past dates', () => {
    const at = new Date(NOW);
    expect(buildPublishedAtOrFilter('published_at', at)).toBe(
      `published_at.is.null,published_at.lte.${at.toISOString()}`
    );
  });
});

describe('isFutureSchedule', () => {
  it('only accepts a date that has not passed', () => {
    expect(isFutureSchedule(FUTURE, NOW)).toBe(true);
    expect(isFutureSchedule(PAST, NOW)).toBe(false);
    expect(isFutureSchedule(null, NOW)).toBe(false);
    expect(isFutureSchedule('nonsense', NOW)).toBe(false);
  });
});
