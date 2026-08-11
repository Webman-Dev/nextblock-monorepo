import type { SiteScript } from './types';

export type SiteScriptRevisionType = 'create' | 'update' | 'delete' | 'revert';
export type SiteScriptRevisionSource = 'cms' | 'mcp';

export interface SiteScriptRevision {
  id: string;
  script_id: string | null;
  script_name: string;
  revision_type: SiteScriptRevisionType;
  actor_user_id: string | null;
  source: SiteScriptRevisionSource;
  summary: string | null;
  snapshot: SiteScriptSnapshot;
  created_at: string;
}

/**
 * The restorable state of a script.
 *
 * Deliberately excludes `id`, `created_at`, and `updated_at`: restoring a revision
 * writes these fields onto the live row (or recreates it), and carrying identity or
 * timestamps across would either clash with the existing row or fake its history.
 */
export interface SiteScriptSnapshot {
  name: string;
  description: string | null;
  code: string;
  src: string | null;
  placement: string;
  load_strategy: string;
  is_active: boolean;
  sort_order: number;
}

export const SITE_SCRIPT_REVISION_COLUMNS =
  'id, script_id, script_name, revision_type, actor_user_id, source, summary, snapshot, created_at';

/** Normalise a script row, a partial payload, or an existing snapshot into a snapshot. */
export function buildSiteScriptSnapshot(
  row: Partial<SiteScript> | SiteScriptSnapshot | Record<string, unknown>
): SiteScriptSnapshot {
  const value = row as Record<string, unknown>;

  return {
    code: typeof value['code'] === 'string' ? value['code'] : '',
    description: typeof value['description'] === 'string' ? value['description'] : null,
    is_active: Boolean(value['is_active']),
    load_strategy: typeof value['load_strategy'] === 'string' ? value['load_strategy'] : 'default',
    name: typeof value['name'] === 'string' ? value['name'] : '',
    placement: typeof value['placement'] === 'string' ? value['placement'] : 'body_end',
    sort_order: Number.isFinite(value['sort_order']) ? Number(value['sort_order']) : 0,
    src: typeof value['src'] === 'string' && value['src'] ? (value['src'] as string) : null,
  };
}

/** One-line human description of what a revision did, shown in the history list. */
export function describeSiteScriptRevision(revision: SiteScriptRevision): string {
  if (revision.summary) return revision.summary;

  switch (revision.revision_type) {
    case 'create':
      return `Created “${revision.script_name}”`;
    case 'delete':
      return `Deleted “${revision.script_name}”`;
    case 'revert':
      return `Restored “${revision.script_name}”`;
    default:
      return `Updated “${revision.script_name}”`;
  }
}
