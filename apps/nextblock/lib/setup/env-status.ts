// Dependency-free environment / provisioning detection.
//
// This module is imported from places that run in very different runtimes — the
// `proxy.ts` middleware (Edge), server components, server actions, and even
// `next.config.js` (Node, at build time). It therefore MUST stay free of
// `server-only`, of any Node-only imports (`node:fs`, etc.), and of any Supabase
// client so it is safe to evaluate anywhere.
//
// "Configured" here means the Supabase connection vars exist — there is no
// `DATABASE_URL` in NextBlock; the database is reached through
// `NEXT_PUBLIC_SUPABASE_URL` + the anon / service-role keys.

export type DeployChannel = 'docker' | 'vercel' | 'local';

/**
 * True when the public Supabase connection vars are present — enough to create an
 * anon client and reach the database. This is the single predicate the boot path,
 * the middleware gate, and the wizard all use to decide "is this instance wired up?".
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * True when service-role work is also possible (creating the first admin, applying
 * schema). The wizard's first-admin step and schema-apply step require this.
 */
export function isFullyConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Which of the four deploy channels we appear to be running in. Drives the wizard's
 * channel-aware prefills (Docker -> MinIO storage, Vercel -> Supabase Storage S3,
 * local -> the user's own Cloudflare R2).
 */
export function detectChannel(): DeployChannel {
  if (process.env.VERCEL === '1') return 'vercel';

  // Docker is identified by the internal Supabase gateway URL (Kong :8000) or the MinIO
  // storage marker the docker setup writes — NOT by NEXT_PUBLIC_IS_SANDBOX, which the
  // managed cloud sandbox also sets.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (
    url.includes('localhost:8000') ||
    url.includes('127.0.0.1:8000') ||
    url.includes('kong:8000') ||
    process.env.R2_ACCOUNT_ID === 'minio'
  ) {
    return 'docker';
  }

  return 'local';
}

/**
 * True only where the wizard may safely write `.env.local` to the working directory:
 * local dev. NOT on Vercel (read-only FS, env is injected by the platform) and NOT
 * inside the baked standalone Docker runner (env is set by compose, FS is read-only).
 */
export function isLocalWritableEnv(): boolean {
  // Require NODE_ENV === 'development' explicitly (not `!== 'production'`): an UNSET
  // NODE_ENV must NOT count as local. `next dev` / `nx serve` set it to 'development';
  // `next build`/`next start`, Vercel, and the Docker runner set it to 'production'.
  // The remaining checks are belt-and-suspenders. This is a SAFETY boundary (it gates
  // destructive setup actions), so it must fail closed.
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.VERCEL !== '1' &&
    process.env.DOCKER_BUILD !== 'true' &&
    process.env.NEXTBLOCK_RUNTIME !== 'standalone'
  );
}

/**
 * Records the unconfigured state on `process.env.NEXTBLOCK_UNCONFIGURED` so other
 * call sites (CSP construction, middleware) can read it without recomputing.
 * Idempotent; returns the boolean it set.
 */
export function markUnconfiguredFlag(): boolean {
  const unconfigured = !isSupabaseConfigured();
  process.env.NEXTBLOCK_UNCONFIGURED = unconfigured ? 'true' : 'false';
  return unconfigured;
}
