import { describe, expect, it } from 'vitest';

// CommonJS CLI script. Requiring it is safe: `main()` is guarded by `require.main`,
// so importing here never opens a database connection.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getMigrationVersion, isHistoricalBaselineMigration, parseMigrationList } = require('./push-db-migrations.js');

/**
 * These cover the migration-status parser that replaced `link` + `db push --dry-run`
 * in the `--check` path. On 2026-08-10 that old probe applied migration
 * 00000000000017 to production while printing "DRY RUN: migrations will *not* be
 * pushed", so the check now runs only the read-only `supabase migration list` and
 * reports what it found. The parser is the part that can silently be wrong.
 */

// Real `supabase migration list` output, trailing spaces and all.
const REAL_OUTPUT = [
  '  ',
  '   Local          | Remote         | Time (UTC)     ',
  '  ----------------|----------------|----------------',
  '   00000000000000 | 00000000000000 | 00000000000000 ',
  '   00000000000001 | 00000000000001 | 00000000000001 ',
  '   00000000000016 | 00000000000016 | 00000000000016 ',
  '   00000000000017 | 00000000000017 | 00000000000017 ',
  '',
].join('\n');

describe('parseMigrationList', () => {
  it('reads a fully-applied history', () => {
    const status = parseMigrationList(REAL_OUTPUT);

    expect(status.applied).toEqual([
      '00000000000000',
      '00000000000001',
      '00000000000016',
      '00000000000017',
    ]);
    expect(status.pending).toEqual([]);
    expect(status.remoteOnly).toEqual([]);
  });

  it('treats a local-only row as pending', () => {
    const status = parseMigrationList(
      [
        '   Local          | Remote         | Time (UTC)     ',
        '  ----------------|----------------|----------------',
        '   00000000000017 | 00000000000017 | 00000000000017 ',
        '   00000000000018 |                |                ',
        '   00000000000019 |                |                ',
      ].join('\n')
    );

    expect(status.pending).toEqual(['00000000000018', '00000000000019']);
    expect(status.applied).toEqual(['00000000000017']);
  });

  it('treats a remote-only row as history with no file', () => {
    // This is the shape that makes a newly-written migration unrunnable: the version
    // is already recorded, so Supabase (which matches by version, never by content)
    // skips the file in silence.
    const status = parseMigrationList(
      [
        '   Local          | Remote         | Time (UTC)     ',
        '  ----------------|----------------|----------------',
        '   00000000000017 | 00000000000017 | 00000000000017 ',
        '                  | 00000000000044 | 00000000000044 ',
      ].join('\n')
    );

    expect(status.remoteOnly).toEqual(['00000000000044']);
    expect(status.pending).toEqual([]);
    expect(status.applied).toEqual(['00000000000017']);
  });

  it('ignores headers, separators, blank lines, and CLI chatter', () => {
    const status = parseMigrationList(
      [
        'Using workdir C:\\repo\\libs\\db\\src',
        'WARN: environment variable is unset: NEXT_PUBLIC_URL',
        'Connecting to remote database...',
        'A new version of Supabase CLI is available: v2.113.0 | currently v2.107.0',
        '   Local          | Remote         | Time (UTC)     ',
        '  ----------------|----------------|----------------',
        '   00000000000017 | 00000000000017 | 00000000000017 ',
      ].join('\n')
    );

    expect(status.applied).toEqual(['00000000000017']);
    expect(status.pending).toEqual([]);
    // The CLI-version line contains a pipe but no 14-digit version — it must not
    // become a phantom migration.
    expect(status.remoteOnly).toEqual([]);
  });

  it('returns empty sets for output with no table at all', () => {
    expect(parseMigrationList('Cannot connect to remote database')).toEqual({
      applied: [],
      pending: [],
      remoteOnly: [],
    });
  });
});

describe('baseline guard', () => {
  it('extracts the version from a migration filename', () => {
    expect(getMigrationVersion('00000000000017_cortex_ai_mcp_server.sql')).toBe('00000000000017');
    expect(getMigrationVersion('00000000000000_baseline_schema.sql')).toBe('00000000000000');
  });

  it('flags only the squashed 000-003 baseline as non-replayable', () => {
    expect(isHistoricalBaselineMigration('00000000000000_baseline_schema.sql')).toBe(true);
    expect(isHistoricalBaselineMigration('00000000000003_baseline_seed.sql')).toBe(true);
    expect(isHistoricalBaselineMigration('00000000000004_default_logo_email_safe.sql')).toBe(false);
    expect(isHistoricalBaselineMigration('00000000000017_cortex_ai_mcp_server.sql')).toBe(false);
  });
});
