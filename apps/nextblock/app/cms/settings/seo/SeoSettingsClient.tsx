'use client';

import React from 'react';
import type { RobotsSettings } from '@nextblock-cms/utils/seo';

import type { CmsRedirect } from './mappers';
import { RedirectsCard } from './RedirectsCard';
import { RobotsCard } from './RobotsCard';

type SeoSettingsClientProps = {
  initialRedirects: CmsRedirect[];
  initialRobotsSettings: RobotsSettings;
  /** The shared demo deployment, where robots output is fixed regardless of settings. */
  isSandbox: boolean;
  /**
   * False when `resolveSiteUrl()` fell back to http://localhost:3000 — i.e. neither
   * NEXT_PUBLIC_URL nor a Vercel production URL is available. The robots preview says
   * so, because a `Sitemap:` line pointing at localhost is the kind of thing that
   * looks configured and does nothing.
   */
  isSiteUrlConfigured: boolean;
  sitemapUrl: string;
};

/**
 * The client shell for /cms/settings/seo.
 *
 * It holds no state of its own and exists only to give the two cards a single mount
 * point on the client side of the boundary. That is worth a file because both cards
 * are interactive — they call server actions from `onSubmit` handlers rather than
 * through `<form action={…}>` — and a Server Component cannot pass those handlers
 * down. Keeping the composition here also means the page stays a plain async
 * component whose whole job is the admin gate and the two reads.
 *
 * The cards are deliberately independent: redirects and robots directives share a
 * screen because an operator thinks of them together ("this URL moved", "do not crawl
 * that"), not because they share data. Nothing one card saves invalidates the other.
 */
export function SeoSettingsClient({
  initialRedirects,
  initialRobotsSettings,
  isSandbox,
  isSiteUrlConfigured,
  sitemapUrl,
}: SeoSettingsClientProps) {
  return (
    <>
      <RedirectsCard redirects={initialRedirects} />
      <RobotsCard
        isSandbox={isSandbox}
        isSiteUrlConfigured={isSiteUrlConfigured}
        settings={initialRobotsSettings}
        sitemapUrl={sitemapUrl}
      />
    </>
  );
}
