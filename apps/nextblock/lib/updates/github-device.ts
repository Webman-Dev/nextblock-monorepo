import 'server-only';
// GitHub OAuth Device Flow — the one auth model that works across every NextBlock install
// domain without a per-site callback URL or a user-created PAT. Powers the onboarding
// "Connect GitHub" button, which installs the upstream-sync workflow into the user's repo
// (Vercel's 1-click clone strips .github/workflows because its token lacks the `workflow`
// scope, so the file must be added with a token that has it — which Connect obtains).
//
// The Client ID is PUBLIC (device flow uses no client secret), so it's baked in as the
// default for every install; NEXTBLOCK_GITHUB_CLIENT_ID overrides it for self-run forks.
import { resolveSelfRepo } from './repo-identity';

// Shared NextBlock OAuth App (org: nextblock-cms), Device Flow enabled. Public value.
const DEFAULT_GITHUB_CLIENT_ID = 'Ov23liVYp5Tpmq7CUnGf';
const UPSTREAM_REPO = 'nextblock-cms/nextblock';
const WORKFLOW_PATH = '.github/workflows/nextblock-sync.yml';
// Writing a workflow file requires `workflow`; `repo` covers contents on private repos.
const SCOPES = 'repo workflow';

const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';

export function getGithubClientId(): string {
  return process.env.NEXTBLOCK_GITHUB_CLIENT_ID?.trim() || DEFAULT_GITHUB_CLIENT_ID;
}

/** Connect is offered only when we know the repo and have a client id to authorize with. */
export function isGithubConnectAvailable(): boolean {
  return Boolean(getGithubClientId()) && resolveSelfRepo() !== null;
}

function apiHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'nextblock-update-checker',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export interface DeviceFlowStart {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  expiresIn: number;
}

/** Begin the device flow. Throws on a hard failure (the caller surfaces the message). */
export async function startDeviceFlow(): Promise<DeviceFlowStart> {
  const res = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: getGithubClientId(), scope: SCOPES }),
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`GitHub device-code request failed (HTTP ${res.status}).`);
  }
  const data = await res.json();
  if (data.error || !data.device_code) {
    throw new Error(
      data.error_description || data.error || 'GitHub did not return a device code.',
    );
  }
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    interval: typeof data.interval === 'number' ? data.interval : 5,
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : 900,
  };
}

export type DevicePollResult =
  | { status: 'authorized'; token: string }
  | { status: 'pending'; slowDown?: boolean }
  | { status: 'expired' }
  | { status: 'denied' }
  | { status: 'error'; error: string };

/** Poll once for the user's authorization. Never throws. */
export async function pollDeviceFlowOnce(deviceCode: string): Promise<DevicePollResult> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: getGithubClientId(),
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
    const data = await res.json();
    if (data.access_token) return { status: 'authorized', token: data.access_token };
    switch (data.error) {
      case 'authorization_pending':
        return { status: 'pending' };
      case 'slow_down':
        return { status: 'pending', slowDown: true };
      case 'expired_token':
        return { status: 'expired' };
      case 'access_denied':
        return { status: 'denied' };
      default:
        return { status: 'error', error: data.error_description || data.error || 'Unknown error.' };
    }
  } catch (caught) {
    return {
      status: 'error',
      error: caught instanceof Error ? caught.message : 'Could not reach GitHub.',
    };
  }
}

export interface InstallResult {
  ok: boolean;
  htmlUrl?: string;
  error?: string;
}

/**
 * Install (or update) the upstream-sync workflow in the connected repo, using the
 * canonical file from the upstream repo so it never drifts. Never throws.
 */
export async function installSyncWorkflow(token: string): Promise<InstallResult> {
  const self = resolveSelfRepo();
  if (!self) return { ok: false, error: 'Could not determine this deployment’s GitHub repository.' };

  try {
    // 1) Default branch of the target repo.
    const repoRes = await fetch(`https://api.github.com/repos/${self.owner}/${self.repo}`, {
      headers: apiHeaders(token),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
    if (!repoRes.ok) {
      return { ok: false, error: `Could not read the repository (HTTP ${repoRes.status}).` };
    }
    const repo = await repoRes.json();
    const branch: string = repo.default_branch || 'main';

    // 2) Canonical workflow content from upstream (base64), passed straight through.
    const upstreamRes = await fetch(
      `https://api.github.com/repos/${UPSTREAM_REPO}/contents/${WORKFLOW_PATH}`,
      { headers: apiHeaders(token), signal: AbortSignal.timeout(15_000), cache: 'no-store' },
    );
    if (!upstreamRes.ok) {
      return { ok: false, error: `Could not read the upstream workflow (HTTP ${upstreamRes.status}).` };
    }
    const upstream = await upstreamRes.json();
    const contentBase64 = typeof upstream.content === 'string' ? upstream.content.replace(/\s/g, '') : '';
    if (!contentBase64) return { ok: false, error: 'Upstream workflow content was empty.' };

    // 3) Existing file sha (if the path already exists on the target branch).
    let sha: string | undefined;
    const existingRes = await fetch(
      `https://api.github.com/repos/${self.owner}/${self.repo}/contents/${WORKFLOW_PATH}?ref=${encodeURIComponent(branch)}`,
      { headers: apiHeaders(token), signal: AbortSignal.timeout(15_000), cache: 'no-store' },
    );
    if (existingRes.ok) {
      const existing = await existingRes.json();
      if (existing && typeof existing.sha === 'string') sha = existing.sha;
    }

    // 4) Create/update the workflow file.
    const putRes = await fetch(
      `https://api.github.com/repos/${self.owner}/${self.repo}/contents/${WORKFLOW_PATH}`,
      {
        method: 'PUT',
        headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'ci: add NextBlock upstream-sync workflow',
          content: contentBase64,
          branch,
          ...(sha ? { sha } : {}),
        }),
        signal: AbortSignal.timeout(20_000),
        cache: 'no-store',
      },
    );
    if (!putRes.ok) {
      let detail = `HTTP ${putRes.status}`;
      try {
        const body = await putRes.json();
        if (body?.message) detail = body.message;
      } catch {
        /* ignore */
      }
      return { ok: false, error: `Could not install the workflow: ${detail}.` };
    }

    return {
      ok: true,
      htmlUrl: `https://github.com/${self.owner}/${self.repo}/actions`,
    };
  } catch (caught) {
    return {
      ok: false,
      error: caught instanceof Error ? caught.message : 'Could not install the workflow.',
    };
  }
}
