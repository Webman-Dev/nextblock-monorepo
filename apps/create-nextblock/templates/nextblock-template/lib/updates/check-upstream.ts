import 'server-only';
// Track B — Decoupled application runtime update engine + Track-A conflict mirror.
//
// Two responsibilities, both writing into system_alerts via the service-role client
// (the key this install already has — no GitHub secrets required):
//   1. checkForUpstreamUpdate(): poll the public GitHub Releases API, compare the latest
//      release against this install's package.json version, and on a NON-git (standalone)
//      install record a 'runtime_update_available' alert with a tarball download link.
//   2. checkForSyncConflicts(): for git-backed installs, poll THIS fork's issues for the
//      'nextblock-sync-conflict' label the sync workflow opens, and mirror open ones into
//      'merge_conflict' alerts (clearing them when the issue closes). This is the "pull"
//      half of Track A: the GitHub Action signals with the auto-provided GITHUB_TOKEN, and
//      the app — which holds the Supabase key — owns the alert write. Zero GitHub secrets.
//
// Private forks: set NEXTBLOCK_GITHUB_TOKEN so the issue/run polling is authenticated.
// Public forks need nothing (the unauthenticated GitHub API is sufficient).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';
import { getSystemConfiguration, setSystemConfigurationServiceRole } from '../setup/system-config';
import { resolveSelfRepo } from './repo-identity';
import pkg from '../../package.json';

const UPSTREAM_REPO = 'nextblock-cms/nextblock';
const RELEASES_API = `https://api.github.com/repos/${UPSTREAM_REPO}/releases/latest`;
// The sync workflow tags its conflict issues with this hidden body marker. We match on it
// (not on a label) so a label that failed to create on GitHub can't hide a real conflict.
const CONFLICT_MARKER = '<!-- nextblock-sync-conflict -->';
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // throttle the background poll to every 6h

export type UpdateTrack = 'git' | 'standalone';

export interface UpstreamUpdateResult {
  ok: boolean;
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  track: UpdateTrack;
  htmlUrl?: string;
  tarballUrl?: string;
  zipballUrl?: string;
  publishedAt?: string;
  alertRecorded: boolean;
  error?: string;
}

export interface SyncConflictResult {
  ok: boolean;
  repo: string | null;
  openConflicts: number;
  actionsActive: boolean;
  alertsWritten: number;
  alertsResolved: number;
  error?: string;
}

/** GitHub API headers, authenticated when a token is configured (needed for private forks). */
function githubHeaders(): Record<string, string> {
  const token =
    process.env.NEXTBLOCK_GITHUB_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'nextblock-update-checker',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Compare two semver-ish strings. >0 if a>b, <0 if a<b, 0 if equal. */
function compareSemver(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .trim()
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((n) => Number.parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * Classify how this install receives updates. Explicit NEXTBLOCK_UPDATE_TRACK wins;
 * otherwise Vercel / repos carrying the sync workflow or an upstream remote are 'git'
 * (Track A), everything else is 'standalone' (Track B).
 */
function detectTrack(): UpdateTrack {
  const override = process.env.NEXTBLOCK_UPDATE_TRACK?.trim().toLowerCase();
  if (override === 'git' || override === 'standalone') return override;

  if (process.env.VERCEL === '1') return 'git';
  if (resolveSelfRepo()) {
    // A resolvable GitHub repo identity means git-backed; double-check it's a NextBlock fork.
    const cwd = process.cwd();
    try {
      if (existsSync(path.join(cwd, '.github', 'workflows', 'nextblock-sync.yml'))) return 'git';
    } catch {
      /* ignore */
    }
    try {
      const gitConfig = path.join(cwd, '.git', 'config');
      if (existsSync(gitConfig) && /nextblock/i.test(readFileSync(gitConfig, 'utf8'))) return 'git';
    } catch {
      /* ignore */
    }
  }
  return 'standalone';
}

/**
 * Poll GitHub Releases and, on a standalone install with a newer release, record a
 * runtime_update_available alert (deduped by latest version). Never throws.
 */
export async function checkForUpstreamUpdate(): Promise<UpstreamUpdateResult> {
  const currentVersion = pkg.version;
  const track = detectTrack();
  const base: UpstreamUpdateResult = {
    ok: false,
    currentVersion,
    latestVersion: null,
    updateAvailable: false,
    track,
    alertRecorded: false,
  };

  let release: {
    tag_name?: string;
    html_url?: string;
    tarball_url?: string;
    zipball_url?: string;
    published_at?: string;
  };
  try {
    const res = await fetch(RELEASES_API, {
      headers: githubHeaders(),
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 3600 },
    });
    if (res.status === 404) return { ...base, ok: true }; // no releases yet
    if (!res.ok) return { ...base, error: `GitHub Releases API returned HTTP ${res.status}.` };
    release = await res.json();
  } catch (caught) {
    return {
      ...base,
      error:
        caught instanceof Error
          ? `Could not reach the GitHub Releases API: ${caught.message}`
          : 'Could not reach the GitHub Releases API.',
    };
  }

  const tag = release.tag_name?.trim();
  if (!tag) return { ...base, ok: true };

  const latestVersion = tag.replace(/^v/i, '');
  const tarballUrl =
    release.tarball_url || `https://github.com/${UPSTREAM_REPO}/archive/refs/tags/${tag}.tar.gz`;
  const zipballUrl =
    release.zipball_url || `https://github.com/${UPSTREAM_REPO}/archive/refs/tags/${tag}.zip`;
  const updateAvailable = compareSemver(latestVersion, currentVersion) > 0;

  const result: UpstreamUpdateResult = {
    ...base,
    ok: true,
    latestVersion,
    updateAvailable,
    htmlUrl: release.html_url,
    tarballUrl,
    zipballUrl,
    publishedAt: release.published_at,
  };

  // Git-backed installs auto-merge via Track A — no runtime update alert for them.
  if (!updateAvailable || track !== 'standalone') return result;

  try {
    const supabase = getServiceRoleSupabaseClient();
    const { data: existing } = await supabase
      .from('system_alerts')
      .select('id, metadata')
      .eq('alert_type', 'runtime_update_available')
      .eq('is_resolved', false)
      .limit(50);

    const alreadyAlerted = (existing ?? []).some(
      (row) =>
        (row.metadata as { latest_version?: string } | null)?.latest_version === latestVersion,
    );
    if (alreadyAlerted) return result;

    const { error } = await supabase.from('system_alerts').insert({
      alert_type: 'runtime_update_available',
      title: `NextBlock ${latestVersion} is available`,
      message: `A newer NextBlock release (${latestVersion}) is available — you are on ${currentVersion}. Download the release archive, replace your files, and update dependencies to upgrade.`,
      metadata: {
        latest_version: latestVersion,
        current_version: currentVersion,
        download_url: tarballUrl,
        zipball_url: zipballUrl,
        html_url: release.html_url ?? null,
      },
    });
    if (error) return { ...result, error: `Could not record the update alert: ${error.message}` };
    return { ...result, alertRecorded: true };
  } catch (caught) {
    return {
      ...result,
      error:
        caught instanceof Error
          ? `Could not record the update alert: ${caught.message}`
          : 'Could not record the update alert.',
    };
  }
}

/**
 * Mirror Track-A sync conflicts (open GitHub issues labeled nextblock-sync-conflict in
 * THIS fork) into merge_conflict alerts, and resolve alerts whose issue has closed.
 * Returns a soft result (never throws) so the caller can surface errors without 500ing.
 */
export async function checkForSyncConflicts(): Promise<SyncConflictResult> {
  const self = resolveSelfRepo();
  const base: SyncConflictResult = {
    ok: false,
    repo: self ? `${self.owner}/${self.repo}` : null,
    openConflicts: 0,
    actionsActive: false,
    alertsWritten: 0,
    alertsResolved: 0,
  };
  if (!self) return { ...base, ok: true }; // not git-backed / repo unknown — nothing to mirror

  // 1) Open conflict issues. The /issues endpoint also returns PRs — filter them out.
  // Only an AUTHORITATIVE res.ok read may drive the resolve loop below: a 404 (private
  // fork without NEXTBLOCK_GITHUB_TOKEN, or a transient error) must NOT be read as "zero
  // open conflicts", or live conflict alerts would be wrongly auto-resolved and hidden.
  let issues: Array<{ number: number; html_url: string; body?: string | null; pull_request?: unknown }> =
    [];
  let issuesFetched = false;
  let fetchError: string | undefined;
  try {
    const url = `https://api.github.com/repos/${self.owner}/${self.repo}/issues?state=open&per_page=50`;
    const res = await fetch(url, {
      headers: githubHeaders(),
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 600 },
    });
    if (res.ok) {
      issuesFetched = true;
      const data = await res.json();
      // Exclude PRs (the /issues endpoint returns them too) and keep only our marked issues.
      issues = (Array.isArray(data) ? data : [])
        .filter((i) => !i.pull_request)
        .filter((i) => typeof i.body === 'string' && i.body.includes(CONFLICT_MARKER));
    } else if (res.status === 404) {
      fetchError =
        'Could not read repository issues (HTTP 404). For a private fork, set NEXTBLOCK_GITHUB_TOKEN.';
    } else {
      fetchError = `GitHub issues API returned HTTP ${res.status}.`;
    }
  } catch (caught) {
    fetchError = caught instanceof Error ? caught.message : 'Could not reach the GitHub issues API.';
  }

  // 2) Is the sync workflow present AND enabled? (drives the onboarding "Actions" step)
  // We check the workflow's `state` rather than whether it has *run*: a healthy Vercel
  // deploy has Actions enabled by default, so the workflow is 'active' immediately — no
  // need to wait up to 24h for the first daily cron before the step completes.
  let actionsActive = false;
  try {
    const wfUrl = `https://api.github.com/repos/${self.owner}/${self.repo}/actions/workflows/nextblock-sync.yml`;
    const res = await fetch(wfUrl, {
      headers: githubHeaders(),
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 600 },
    });
    if (res.ok) {
      const data = await res.json();
      actionsActive = data?.state === 'active';
    }
  } catch {
    /* best-effort */
  }

  // 3) Mirror issues <-> system_alerts.
  let alertsWritten = 0;
  let alertsResolved = 0;
  try {
    const supabase = getServiceRoleSupabaseClient();
    const { data: existing } = await supabase
      .from('system_alerts')
      .select('id, metadata')
      .eq('alert_type', 'merge_conflict')
      .eq('is_resolved', false)
      .limit(50);

    const alertByIssue = new Map<number, string>();
    for (const row of existing ?? []) {
      const issueNumber = (row.metadata as { issue_number?: number } | null)?.issue_number;
      if (typeof issueNumber === 'number') alertByIssue.set(issueNumber, row.id);
    }
    const openIssueNumbers = new Set(issues.map((i) => i.number));

    for (const issue of issues) {
      if (alertByIssue.has(issue.number)) continue;
      const { error } = await supabase.from('system_alerts').insert({
        alert_type: 'merge_conflict',
        title: 'Upstream sync needs manual resolution',
        message: `An automated upstream sync hit conflicts and could not merge. Resolve it on GitHub (issue #${issue.number}), then close the issue to clear this alert.`,
        metadata: {
          issue_number: issue.number,
          action_url: issue.html_url,
          repo: `${self.owner}/${self.repo}`,
        },
      });
      if (!error) alertsWritten += 1;
    }

    // Only resolve when the open-issue list is authoritative (res.ok). On a 404/error we
    // can't tell which issues are still open, so we leave existing alerts untouched.
    if (issuesFetched) {
      for (const [issueNumber, alertId] of alertByIssue) {
        if (openIssueNumbers.has(issueNumber)) continue;
        const { error } = await supabase
          .from('system_alerts')
          .update({ is_resolved: true, resolved_at: new Date().toISOString() })
          .eq('id', alertId);
        if (!error) alertsResolved += 1;
      }
    }
  } catch (caught) {
    return {
      ...base,
      actionsActive,
      openConflicts: issues.length,
      error: caught instanceof Error ? caught.message : 'Could not mirror conflict alerts.',
    };
  }

  return {
    ok: !fetchError,
    repo: `${self.owner}/${self.repo}`,
    openConflicts: issues.length,
    actionsActive,
    alertsWritten,
    alertsResolved,
    error: fetchError,
  };
}

export interface UpstreamStatusSnapshot {
  checked_at: string;
  current_version: string;
  latest_version: string | null;
  update_available: boolean;
  track: UpdateTrack;
  repo: string | null;
  open_conflicts: number;
  actions_active: boolean;
}

/** Run both checks and persist a status snapshot (read by the onboarding checklist). */
export async function refreshUpstreamStatus(): Promise<{
  update: UpstreamUpdateResult;
  conflicts: SyncConflictResult;
  snapshot: UpstreamStatusSnapshot | null;
}> {
  const update = await checkForUpstreamUpdate();
  const conflicts = await checkForSyncConflicts();

  let snapshot: UpstreamStatusSnapshot | null = null;
  try {
    const config = await getSystemConfiguration();
    snapshot = {
      checked_at: new Date().toISOString(),
      current_version: update.currentVersion,
      latest_version: update.latestVersion,
      update_available: update.updateAvailable,
      track: update.track,
      repo: conflicts.repo,
      open_conflicts: conflicts.openConflicts,
      actions_active: conflicts.actionsActive,
    };
    await setSystemConfigurationServiceRole({
      settings: { ...config.settings, upstream_status: snapshot },
    });
  } catch {
    /* best-effort — the alerts themselves are already written */
  }

  return { update, conflicts, snapshot };
}

/**
 * Mark the sync workflow as installed/active immediately after a successful Connect
 * install — so the onboarding step flips to done right away rather than waiting for the
 * next throttled poll (and GitHub's brief workflow-registration lag). Never throws.
 */
export async function markSyncWorkflowInstalled(): Promise<void> {
  try {
    const config = await getSystemConfiguration();
    const prev = config.settings?.['upstream_status'] as Partial<UpstreamStatusSnapshot> | undefined;
    const self = resolveSelfRepo();
    const snapshot: UpstreamStatusSnapshot = {
      checked_at: new Date().toISOString(),
      current_version: prev?.current_version ?? pkg.version,
      latest_version: prev?.latest_version ?? null,
      update_available: prev?.update_available ?? false,
      track: prev?.track ?? 'git',
      repo: self ? `${self.owner}/${self.repo}` : prev?.repo ?? null,
      open_conflicts: prev?.open_conflicts ?? 0,
      actions_active: true,
    };
    await setSystemConfigurationServiceRole({
      settings: { ...config.settings, upstream_status: snapshot },
    });
  } catch {
    /* best-effort */
  }
}

/** Throttled background refresh for the CMS layout's after() hook. Never throws. */
export async function maybeRefreshUpstreamStatus(): Promise<void> {
  try {
    const config = await getSystemConfiguration();
    const status = config.settings?.['upstream_status'] as { checked_at?: string } | undefined;
    const last = status?.checked_at ? Date.parse(status.checked_at) : 0;
    if (Number.isFinite(last) && Date.now() - last < REFRESH_INTERVAL_MS) return;
    await refreshUpstreamStatus();
  } catch {
    /* best-effort */
  }
}
