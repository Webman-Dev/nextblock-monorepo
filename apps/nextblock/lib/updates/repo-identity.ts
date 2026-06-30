import 'server-only';
// Resolve THIS install's own GitHub repo (the fork), so the runtime engine can poll the
// fork's issues/workflow runs and the onboarding checklist can deep-link its Actions tab.
// Order: Vercel's injected git vars -> explicit override -> parsed .git/config origin.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface SelfRepo {
  owner: string;
  repo: string;
}

export function resolveSelfRepo(): SelfRepo | null {
  // Vercel auto-injects these for git-connected projects (incl. 1-click forks).
  const vercelOwner = process.env.VERCEL_GIT_REPO_OWNER?.trim();
  const vercelSlug = process.env.VERCEL_GIT_REPO_SLUG?.trim();
  if (vercelOwner && vercelSlug) return { owner: vercelOwner, repo: vercelSlug };

  // Explicit override for self-hosted git installs: NEXTBLOCK_REPO=owner/repo.
  const explicit = process.env.NEXTBLOCK_REPO?.trim();
  if (explicit && explicit.includes('/')) {
    const [owner, repo] = explicit.split('/');
    if (owner && repo) return { owner, repo: repo.replace(/\.git$/i, '') };
  }

  // Local / self-hosted clone: parse the origin remote from .git/config.
  try {
    const cfg = path.join(process.cwd(), '.git', 'config');
    if (existsSync(cfg)) {
      const match = readFileSync(cfg, 'utf8').match(
        /github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?(?:\s|$)/i,
      );
      if (match) return { owner: match[1], repo: match[2] };
    }
  } catch {
    /* ignore */
  }

  return null;
}

/** The repo's GitHub Actions tab (shows the sync workflow + a "Run workflow" button). */
export function selfActionsUrl(): string | null {
  const self = resolveSelfRepo();
  return self ? `https://github.com/${self.owner}/${self.repo}/actions` : null;
}

/**
 * Settings -> Actions -> General. The authoritative enable/permissions page — always
 * renders a clear UI (unlike /actions, which redirects to the confusing "choose a
 * workflow" chooser when no workflow has run yet). Used by the onboarding reminder.
 */
export function selfActionsSettingsUrl(): string | null {
  const self = resolveSelfRepo();
  return self ? `https://github.com/${self.owner}/${self.repo}/settings/actions` : null;
}
