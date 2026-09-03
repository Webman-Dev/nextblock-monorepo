'use client';

import { useMemo, useState } from 'react';
import { ImageIcon, MessageCircle, Repeat2, Heart, ThumbsUp, Share2 } from 'lucide-react';
import { cn } from '@nextblock-cms/utils';

/**
 * A read-only rehearsal of the share card a page will produce.
 *
 * The value here is not decoration. Meta title and description are the two fields an
 * operator is most likely to get wrong in a way nothing else in the CMS will catch:
 * they are invisible on the page itself, and the consequence — a headline chopped
 * mid-word in someone's feed — only shows up after the link has already been shared.
 * Rendering the truncation locally turns that into a visible, immediate edit.
 *
 * The three tabs are genuinely different, not one box repainted, because the platforms
 * genuinely differ. Facebook shows a wide image above a grey caption bar with the domain
 * in small caps and a hard title clamp. X's summary_large_image card has no caption bar
 * and stamps the domain UNDER the text. LinkedIn keeps the image and gives the headline
 * more room but drops the description entirely — which is exactly the surprise worth
 * showing someone who has just spent five minutes wording a description. If all three
 * looked the same, the component would be teaching a falsehood.
 *
 * The numbers below approximate observed rendering rather than a published spec — every
 * platform reserves the right to reflow — so they are tuned to be slightly pessimistic.
 * A preview that clips a little early nudges toward safer copy; one that clips late gives
 * false confidence, which is the failure that actually costs something.
 */
interface SocialPreviewProps {
  description: string;
  imageUrl?: string | null;
  siteName?: string | null;
  title: string;
  url: string;
}

type SocialPlatform = 'facebook' | 'linkedin' | 'x';

const PLATFORM_TABS: ReadonlyArray<{ id: SocialPlatform; label: string }> = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'x', label: 'X' },
  { id: 'linkedin', label: 'LinkedIn' },
];

/**
 * Per-platform clamps, in characters. `description: 0` means the platform does not render
 * a description at all — a meaningfully different statement from "renders a short one",
 * and drawn differently below.
 */
const PLATFORM_LIMITS: Record<SocialPlatform, { description: number; title: number }> = {
  facebook: { description: 110, title: 65 },
  linkedin: { description: 0, title: 90 },
  x: { description: 125, title: 70 },
};

/**
 * Clip to a character budget the way a feed does — at a word boundary, with an ellipsis —
 * rather than mid-word, so the preview shows the shape of the real damage.
 */
function clampToLength(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (maxLength <= 0 || normalized.length <= maxLength) {
    return normalized;
  }

  const sliced = normalized.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  const kept = lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${kept.trimEnd()}…`;
}

/**
 * The domain each platform stamps on the card. Falls back to the raw string when the URL
 * is not parseable — while a slug is being typed, `url` is briefly not a valid URL.
 */
function toDisplayDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//i, '').split('/')[0] || url;
  }
}

/**
 * Remote share images render through a plain `<img>`, deliberately.
 *
 * `next/image` would require every host an operator might point a feature image at to be
 * pre-declared in `next.config` `images.remotePatterns`, and an undeclared host does not
 * degrade — it throws. The CMS already makes this call the same way: the external-URL
 * branch of `ImageBlockEditor` drops to a plain `<img>` for precisely this reason. A
 * preview thumbnail gains nothing from the optimizer in exchange for that fragility.
 */
function PreviewImage({
  aspectClassName,
  imageUrl,
  title,
}: {
  aspectClassName: string;
  imageUrl?: string | null;
  title: string;
}) {
  if (!imageUrl) {
    return (
      <div
        className={cn(
          'flex w-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground',
          aspectClassName
        )}
      >
        <ImageIcon aria-hidden="true" className="h-6 w-6" />
        <span className="text-[10px] font-medium uppercase tracking-wide">No share image</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={`Share preview for ${title}`}
      className={cn('w-full bg-muted object-cover', aspectClassName)}
      loading="lazy"
      src={imageUrl}
    />
  );
}

export default function SocialPreview({
  description,
  imageUrl,
  siteName,
  title,
  url,
}: SocialPreviewProps) {
  const [platform, setPlatform] = useState<SocialPlatform>('facebook');

  const domain = useMemo(() => toDisplayDomain(url), [url]);
  const limits = PLATFORM_LIMITS[platform];
  const clampedTitle = clampToLength(title || 'Untitled', limits.title);
  const clampedDescription = clampToLength(description, limits.description);
  // LinkedIn labels the card with the publisher name when one is known and quietly falls
  // back to the bare domain when it is not; Facebook and X only ever show the domain.
  const publisher = (siteName ?? '').trim() || domain;

  return (
    <div className="space-y-2">
      {/* Hand-rolled tabs: this design system ships no Tabs primitive, and the house
          pattern for a small switcher is buttons plus useState. The ARIA roles restore
          the semantics a real tab component would have provided for free. */}
      <div
        aria-label="Social platform preview"
        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 p-0.5"
        role="tablist"
      >
        {PLATFORM_TABS.map((tab) => (
          <button
            aria-selected={platform === tab.id}
            className={cn(
              'rounded px-2.5 py-1 text-[11px] font-medium transition-colors',
              platform === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            key={tab.id}
            onClick={() => setPlatform(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {platform === 'facebook' && (
        <div className="max-w-[500px] overflow-hidden rounded-lg border border-border bg-card">
          <PreviewImage aspectClassName="aspect-[1.91/1]" imageUrl={imageUrl} title={title} />
          {/* Facebook's grey caption bar: domain in small caps above a bold headline. */}
          <div className="space-y-0.5 bg-muted/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{domain}</p>
            <p className="text-sm font-semibold leading-snug text-foreground">{clampedTitle}</p>
            {clampedDescription && (
              <p className="text-xs leading-snug text-muted-foreground">{clampedDescription}</p>
            )}
          </div>
          <div className="flex items-center gap-4 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ThumbsUp aria-hidden="true" className="h-3 w-3" /> Like
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle aria-hidden="true" className="h-3 w-3" /> Comment
            </span>
            <span className="flex items-center gap-1">
              <Share2 aria-hidden="true" className="h-3 w-3" /> Share
            </span>
          </div>
        </div>
      )}

      {platform === 'x' && (
        // X rounds the card hard, drops the caption bar, and puts the domain BELOW the
        // text instead of above the headline.
        <div className="max-w-[500px] overflow-hidden rounded-2xl border border-border bg-card">
          <PreviewImage aspectClassName="aspect-[1.91/1]" imageUrl={imageUrl} title={title} />
          <div className="space-y-0.5 px-3 py-2">
            <p className="text-sm font-medium leading-snug text-foreground">{clampedTitle}</p>
            {clampedDescription && (
              <p className="text-xs leading-snug text-muted-foreground">{clampedDescription}</p>
            )}
            <p className="text-xs text-muted-foreground">{domain}</p>
          </div>
          <div className="flex items-center gap-5 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <MessageCircle aria-hidden="true" className="h-3 w-3" /> Reply
            </span>
            <span className="flex items-center gap-1">
              <Repeat2 aria-hidden="true" className="h-3 w-3" /> Repost
            </span>
            <span className="flex items-center gap-1">
              <Heart aria-hidden="true" className="h-3 w-3" /> Like
            </span>
          </div>
        </div>
      )}

      {platform === 'linkedin' && (
        // LinkedIn is the outlier worth showing: square-ish chrome, a roomier headline,
        // and NO description at all — the meta description simply never appears here.
        <div className="max-w-[520px] overflow-hidden rounded-sm border border-border bg-card">
          <PreviewImage aspectClassName="aspect-[1.91/1]" imageUrl={imageUrl} title={title} />
          <div className="space-y-1 bg-muted/40 px-3 py-2.5">
            <p className="text-sm font-semibold leading-snug text-foreground">{clampedTitle}</p>
            <p className="text-[11px] text-muted-foreground">
              {publisher}
              {publisher === domain ? '' : ` • ${domain}`}
            </p>
            <p className="text-[10px] italic text-muted-foreground/70">
              LinkedIn does not display the meta description on link previews.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
