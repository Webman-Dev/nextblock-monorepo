/**
 * Shared visibility model for pages, posts and products.
 *
 * Visibility is derived from the (status, published_at) PAIR rather than stored,
 * so there is no "scheduled" enum value to keep in sync across three tables:
 *
 *   status is not the live value        -> 'draft' | 'archived'
 *   live status, published_at NULL      -> 'published'
 *   live status, published_at <= now    -> 'published'
 *   live status, published_at >  now    -> 'scheduled'
 *
 * Pages and posts call the live status "published"; products call it "active".
 * Everything else about the model is identical, which is why one helper covers
 * all three.
 */

export type VisibilityState = 'draft' | 'scheduled' | 'published' | 'archived';

/** The status value that means "publicly reachable", per content type. */
export const LIVE_STATUS = {
  page: 'published',
  post: 'published',
  product: 'active',
} as const;

export type PublishableType = keyof typeof LIVE_STATUS;

export interface VisibilityInput {
  status: string | null | undefined;
  publishedAt?: string | null;
  /** Defaults to 'published'; pass 'active' for products. */
  liveStatus?: string;
}

/** Parse a go-live timestamp, treating an absent or unparseable value as "no schedule". */
function scheduledFor(publishedAt: string | null | undefined): number | null {
  if (!publishedAt) return null;
  const time = new Date(publishedAt).getTime();
  return Number.isNaN(time) ? null : time;
}

/** Derive the state the CMS should display for a row. */
export function resolveVisibilityState(
  { status, publishedAt, liveStatus = 'published' }: VisibilityInput,
  now: number = Date.now(),
): VisibilityState {
  if (status === 'archived') return 'archived';
  if (status !== liveStatus) return 'draft';

  const goLive = scheduledFor(publishedAt);
  return goLive !== null && goLive > now ? 'scheduled' : 'published';
}

/** True when the public site should serve this row right now. */
export function isPubliclyVisible(input: VisibilityInput, now: number = Date.now()): boolean {
  return resolveVisibilityState(input, now) === 'published';
}

/**
 * PostgREST `.or()` clause withholding rows whose go-live moment hasn't passed.
 * Mirrors the filter posts have always used, e.g.
 *
 *   query.eq('status', 'published').or(buildPublishedAtOrFilter())
 *
 * Pass a column name for tables that spell it differently.
 */
export function buildPublishedAtOrFilter(column = 'published_at', at: Date = new Date()): string {
  return `${column}.is.null,${column}.lte.${at.toISOString()}`;
}

/**
 * Whether a go-live moment is far enough in the future to count as a schedule.
 * A date in the past means "publish now" — the caller should clear it rather
 * than store a stale timestamp that reads as a schedule in the UI.
 */
export function isFutureSchedule(publishedAt: string | null | undefined, now: number = Date.now()): boolean {
  const goLive = scheduledFor(publishedAt);
  return goLive !== null && goLive > now;
}
