// DB-first, env-fallback resolution for configuration values that are migrating
// out of environment variables into CMS-editable database settings.
//
// Precedence: a non-empty database value wins; otherwise the environment variable;
// otherwise null. When a value still comes from env, we warn once per key so the
// operator knows it hasn't been moved into the CMS yet. Mirrors the precedence in
// apps/nextblock/lib/privacy/contact-emails.ts, generalized for any key.

const warnedEnvKeys = new Set<string>();

export function resolveConfigValue(
  dbValue: string | null | undefined,
  envName: string,
  options?: { warnOnEnvFallback?: boolean }
): string | null {
  const fromDb = typeof dbValue === 'string' ? dbValue.trim() : '';
  if (fromDb) {
    return fromDb;
  }

  const rawEnv = process.env[envName];
  const fromEnv = typeof rawEnv === 'string' ? rawEnv.trim() : '';
  if (fromEnv) {
    if (options?.warnOnEnvFallback !== false && !warnedEnvKeys.has(envName)) {
      warnedEnvKeys.add(envName);
      console.warn(
        `[nextblock-config] "${envName}" is still resolved from an environment variable. ` +
          'Configure it in the CMS to move it into the database.'
      );
    }
    return fromEnv;
  }

  return null;
}

/** True when NEXT_PUBLIC_IS_SANDBOX is enabled — used to refuse persisting real secrets. */
export function isSandboxEnvironment(): boolean {
  return process.env['NEXT_PUBLIC_IS_SANDBOX'] === 'true';
}
