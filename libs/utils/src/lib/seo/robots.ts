/**
 * Pure helpers for the robots.txt settings stored in a jsonb column.
 *
 * `normalizeRobotsSettings` is the load-bearing function here. The settings row
 * is read on a public, uncached-by-default request path — every hit to
 * /robots.txt — and the value it reads is jsonb, which means the database will
 * happily hand back `null`, a string, an array, a partially-migrated object from
 * an older release, or whatever an operator's fat-fingered API call left there.
 * A throw on that path returns a 500 for robots.txt, and a crawler that gets a
 * 500 for robots.txt may treat the entire site as disallowed. So nothing in this
 * file throws, and every path returns a complete, valid object.
 *
 * Like `redirects.ts`, this module imports nothing.
 */

export interface RobotsUserAgentRule {
  allow: string[];
  disallow: string[];
  userAgent: string;
}

export interface RobotsSettings {
  /** Free-form lines appended verbatim to the generated file. */
  customRules: string;
  /**
   * The site-wide switch. When this is false the caller is expected to emit a
   * blanket `Disallow: /` (and usually a `noindex` header) *instead of* the
   * per-user-agent rules below. That decision is deliberately left to the
   * caller rather than baked into the normalised object: the robots.txt route
   * and the admin preview both need to show the operator the rules they
   * configured even while indexing is switched off, and rewriting the rules
   * here would erase them from the UI the moment the switch was flipped.
   */
  isIndexingEnabled: boolean;
  sitemapEnabled: boolean;
  userAgentRules: RobotsUserAgentRule[];
}

/**
 * What a site gets before anybody configures anything: fully crawlable, sitemap
 * advertised, one wildcard rule. Treat this as read-only — every function that
 * returns it returns a deep copy, so mutating the shared constant would corrupt
 * defaults for the rest of the process.
 */
export const DEFAULT_ROBOTS_SETTINGS: RobotsSettings = {
  customRules: '',
  isIndexingEnabled: true,
  sitemapEnabled: true,
  userAgentRules: [{ allow: ['/'], disallow: [], userAgent: '*' }],
};

function cloneUserAgentRules(rules: RobotsUserAgentRule[]): RobotsUserAgentRule[] {
  return rules.map((rule) => ({
    allow: [...rule.allow],
    disallow: [...rule.disallow],
    userAgent: rule.userAgent,
  }));
}

function cloneDefaults(): RobotsSettings {
  return {
    customRules: DEFAULT_ROBOTS_SETTINGS.customRules,
    isIndexingEnabled: DEFAULT_ROBOTS_SETTINGS.isIndexingEnabled,
    sitemapEnabled: DEFAULT_ROBOTS_SETTINGS.sitemapEnabled,
    userAgentRules: cloneUserAgentRules(DEFAULT_ROBOTS_SETTINGS.userAgentRules),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Puts one robots.txt path pattern into canonical form.
 *
 * A leading slash is added when it is missing, because `Disallow: cms` is not
 * valid robots.txt syntax and crawlers vary in how they recover from it. A
 * pattern already starting with `/` or with a `*` wildcard is left alone —
 * prefixing a slash onto `*.pdf$` would change what it matches.
 */
function normalizeRobotsPath(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') {
    return '';
  }

  return trimmed.startsWith('/') || trimmed.startsWith('*') ? trimmed : `/${trimmed}`;
}

function normalizePathArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map(normalizeRobotsPath)
    .filter((entry) => entry !== '');
}

function normalizeUserAgentRules(value: unknown): RobotsUserAgentRule[] {
  if (!Array.isArray(value)) {
    return cloneUserAgentRules(DEFAULT_ROBOTS_SETTINGS.userAgentRules);
  }

  const rules: RobotsUserAgentRule[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }

    const userAgent = typeof entry['userAgent'] === 'string' ? entry['userAgent'].trim() : '';
    // A rule with no user agent cannot be rendered as a `User-agent:` line, and
    // emitting a blank one would make every rule under it apply to nobody.
    if (userAgent === '') {
      continue;
    }

    rules.push({
      allow: normalizePathArray(entry['allow']),
      disallow: normalizePathArray(entry['disallow']),
      userAgent,
    });
  }

  // A robots.txt with no user-agent block at all is not a stricter file, it is a
  // meaningless one, so a settings row whose rules were all garbage falls back
  // to the permissive default rather than to nothing.
  return rules.length > 0 ? rules : cloneUserAgentRules(DEFAULT_ROBOTS_SETTINGS.userAgentRules);
}

/**
 * Coerces whatever came out of the jsonb column into a complete `RobotsSettings`.
 * Missing fields take their default, wrongly-typed fields take their default,
 * and a value that is not an object at all yields the defaults wholesale.
 */
export function normalizeRobotsSettings(value: unknown): RobotsSettings {
  if (!isRecord(value)) {
    return cloneDefaults();
  }

  return {
    customRules: typeof value['customRules'] === 'string' ? value['customRules'] : '',
    isIndexingEnabled: readBoolean(
      value['isIndexingEnabled'],
      DEFAULT_ROBOTS_SETTINGS.isIndexingEnabled
    ),
    sitemapEnabled: readBoolean(value['sitemapEnabled'], DEFAULT_ROBOTS_SETTINGS.sitemapEnabled),
    userAgentRules: normalizeUserAgentRules(value['userAgentRules']),
  };
}

/**
 * Reads the path list an operator typed into a textarea.
 *
 * Both newlines and commas separate entries, because operators paste lists in
 * both shapes and the distinction carries no meaning. Duplicates are preserved:
 * a repeated `Disallow:` line is harmless in robots.txt, and silently deleting a
 * line an operator can see in their textarea is more alarming than leaving it.
 */
export function parsePathList(value: string): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(/[\n,]+/)
    .map(normalizeRobotsPath)
    .filter((entry) => entry !== '');
}

/**
 * Renders a path list back into textarea content, one entry per line. Blank and
 * non-string entries are dropped so that a round trip through `parsePathList` is
 * stable rather than accumulating empty lines each time a form is saved.
 */
export function formatPathList(paths: string[]): string {
  if (!Array.isArray(paths)) {
    return '';
  }

  return paths
    .filter((path): path is string => typeof path === 'string')
    .map((path) => path.trim())
    .filter((path) => path !== '')
    .join('\n');
}
