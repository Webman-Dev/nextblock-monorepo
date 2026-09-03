/**
 * A canonical, order-independent fingerprint of a `RobotsSettings` value.
 *
 * `RobotsCard` needs the same question answered twice, and both answers have to be about
 * VALUES rather than object identity. It asks "has the operator changed anything?" to gate
 * the Save button, and "did the settings the server sent actually change?" to decide
 * whether to re-seed its local state from the prop. The second question is the one that
 * used to go unasked: the card seeded its state once and never looked at the prop again,
 * so after a save the server's normalised row — blank paths dropped, leading slashes added
 * — arrived and was ignored, leaving the dirty indicator lit forever and the preview
 * showing rules that had already been tidied away.
 *
 * The naive fix, an effect keyed on the `settings` object, is wrong in the other
 * direction, and for a reason worth writing down: a server component hands down a fresh
 * object on every render, so `settings` changes identity on every `router.refresh()` even
 * when nothing about it changed. Keying on identity would therefore blow away whatever the
 * operator was typing whenever anything else on the page revalidated. Comparing
 * fingerprints reduces "the prop changed" to "the prop's content changed", which is the
 * only version of the question that is safe to act on.
 *
 * Serialising an explicit array rather than `JSON.stringify(settings)` removes the last
 * hidden assumption in the old dirty check: `JSON.stringify` preserves insertion order, so
 * that comparison silently relied on the form's object literal and
 * `normalizeRobotsSettings`' object literal listing their keys identically. They do today
 * — the house convention is alphabetical — but a future reorder would have turned a clean
 * form permanently dirty, and nothing would have pointed at the cause.
 */

import type { RobotsSettings } from '@nextblock-cms/utils/seo';

export function robotsSettingsSignature(settings: RobotsSettings): string {
  return JSON.stringify([
    settings.customRules,
    settings.isIndexingEnabled,
    settings.sitemapEnabled,
    // Rule ORDER is deliberately significant: robots.txt groups are matched in order, so
    // two settings differing only in how their user-agent blocks are sequenced are two
    // different files and must not fingerprint the same.
    settings.userAgentRules.map((rule) => [rule.userAgent, rule.allow, rule.disallow]),
  ]);
}
