/**
 * The snake_case ↔ camelCase boundary for managed redirects.
 *
 * The database speaks `source_path` / `is_active`; the pure SEO engine in
 * `@nextblock-cms/utils/seo` speaks `sourcePath` / `isActive`. Exactly one place is
 * allowed to know both vocabularies, and this is it — every other module on this
 * screen sees one shape or the other and never has to guess which.
 *
 * These helpers are pure and live outside `actions.ts` deliberately: that file is
 * `'use server'`, where every export must be an async server action, so a synchronous
 * mapper cannot be exported from there. Keeping them here also means the client
 * components can use the identical mapping the actions use, which is what lets the
 * browser run the real `validateRedirectRule` against the real rule set before a
 * request is ever made.
 */

import type { RedirectRule, RedirectStatusCode } from '@nextblock-cms/utils/seo';

import { mapRedirectRow, type CmsRedirectRow } from '../../../../lib/seo/redirect-store';

/**
 * A row of `public.cms_redirects` as this screen sees it.
 *
 * WHY IT IS AN ALIAS AND NOT A SECOND HAND-WRITTEN INTERFACE. The row shape was
 * already transcribed from migration 00000000000030's DDL in `lib/seo/redirect-store.ts`,
 * for the proxy's benefit, and for the same reason it had to be hand-written there:
 * `libs/db`'s generated `Database` type comes from `npm run db:types` against a live
 * project, that migration has not been applied yet, and so
 * `Database['public']['Tables']['cms_redirects']` does not compile today. Restating
 * the seven columns here would give the repo two hand-written descriptions of one
 * table that could drift apart in a rename; aliasing gives it one. When the migration
 * lands and the types are regenerated, there is a single interface to delete.
 */
export type CmsRedirect = CmsRedirectRow;

/**
 * What the add/edit form collects, in the engine's vocabulary.
 *
 * `statusCode` is `RedirectStatusCode` rather than `number` so a widened value cannot
 * reach the database and trip the table's CHECK constraint as an opaque Postgres
 * error; the server re-validates it with Zod regardless, because a type says nothing
 * about what actually arrived over the wire.
 */
export interface RedirectInput {
  destinationPath: string;
  isActive: boolean;
  sourcePath: string;
  statusCode: RedirectStatusCode;
}

/**
 * Maps stored rows onto the engine's rule shape, dropping any row too malformed to
 * be a rule at all.
 *
 * Reuses `mapRedirectRow`, the proxy's mapper, so the admin screen's idea of the
 * current rule set is byte-for-byte the proxy's idea of it. That agreement is what
 * makes client-side validation trustworthy: a duplicate or a loop the admin screen
 * refuses is a duplicate or a loop the proxy would actually have hit.
 *
 * Unlike the proxy's query this one is given inactive rows too, and that is
 * intentional — `validateRedirectRule` counts a paused rule when checking for
 * duplicates and loops, so re-enabling one cannot introduce a conflict that
 * validation already waved through.
 */
export function toRedirectRules(rows: CmsRedirect[]): RedirectRule[] {
  const rules: RedirectRule[] = [];

  for (const row of rows) {
    const rule = mapRedirectRow(row);
    if (rule !== null) {
      rules.push(rule);
    }
  }

  return rules;
}

/**
 * Maps one stored row onto the form's input shape, for the inline editor.
 *
 * Falls back to 301 for an out-of-range `status_code` for the same reason
 * `mapRedirectRow` does: the column is constrained to 301/302, so the fallback never
 * fires in practice, and defaulting to permanent keeps a rule the operator can see in
 * the list from silently becoming un-editable.
 */
export function toRedirectInput(row: CmsRedirect): RedirectInput {
  return {
    destinationPath: row.destination_path,
    isActive: row.is_active,
    sourcePath: row.source_path,
    statusCode: row.status_code === 302 ? 302 : 301,
  };
}
