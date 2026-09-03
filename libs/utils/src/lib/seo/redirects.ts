/**
 * Pure redirect helpers, shared by the Next.js proxy and the admin UI.
 *
 * This module has no imports at all, and that is a hard requirement rather than
 * a stylistic preference: the proxy evaluates `matchRedirect` on the hot path of
 * every incoming request, before any framework code runs, so anything dragged in
 * here would be dragged into the edge bundle of every page on the site.
 *
 * The other reason it is pure is agreement. The admin UI validates a rule when
 * an operator saves it, and the proxy resolves the same rule at request time. If
 * those two used different notions of what "/blog/" means, an operator would
 * save a rule that looks correct and then watch it never fire.
 *
 * This file used to claim that calling `normalizeRedirectPath` on both sides
 * made disagreement impossible "by construction". That was wrong, and it was
 * wrong in the way that hurts: calling the same function on two values does not
 * reconcile them unless the function actually maps them together. Two cases got
 * through it.
 *
 *  - Encoding. `request.nextUrl.pathname` is always percent-encoded, so a
 *    request for "/à-propos" arrives as "/%C3%A0-propos", while the admin stores
 *    the operator's decoded keystrokes. The function neither encoded nor
 *    decoded, so the two sides sat in different spaces and the lookup missed
 *    for ever while the rule showed as Active. It now decodes, which is the one
 *    direction that is always well defined.
 *  - Query strings. The function preserved "?ref=x", but a pathname by
 *    definition contains no "?", so any rule keyed with one was a dead key. The
 *    query is now dropped here and rejected outright by `validateRedirectRule`,
 *    rather than accepted and silently ignored.
 */

/** Only permanent and temporary redirects are offered; nothing else is useful here. */
export type RedirectStatusCode = 301 | 302;

export interface RedirectRule {
  destinationPath: string;
  id: string;
  isActive: boolean;
  sourcePath: string;
  statusCode: RedirectStatusCode;
}

/** How far a chain is followed before it is declared a loop. */
const MAXIMUM_REDIRECT_HOPS = 10;

/** An absolute http(s) URL, which is passed through with only its scheme lowercased. */
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

/**
 * The only off-site scheme the database will store.
 *
 * `cms_redirects_destination_path_check` is `destination_path ~ '^/'` OR
 * `destination_path ~ '^https://'`, and Postgres `~` is case-sensitive. This
 * pattern is deliberately the same rule, so that `validateRedirectRule` refuses
 * exactly what the constraint would refuse and an operator never has to read a
 * raw Postgres error to find out that plain http is not allowed.
 */
const HTTPS_URL_PATTERN = /^https:\/\//;

/** A protocol-relative URL, which points off-site just as surely as an absolute one. */
const PROTOCOL_RELATIVE_PATTERN = /^\/\//;

/** Anything carrying a scheme — `mailto:`, `tel:`, `javascript:` and friends. */
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

/**
 * True when a value points somewhere this site does not control.
 *
 * Protocol-relative values count as external even though they begin with a
 * slash, because a browser resolves `//example.com/x` against the current
 * scheme and lands on another host. `normalizeRedirectPath` deliberately does
 * *not* pass those through: it collapses them to `/example.com/x`, which is the
 * safe direction to be wrong in. The two behaviours are reconciled by
 * `validateRedirectRule`, which tests the raw value with this function and
 * rejects a protocol-relative source *and* a protocol-relative destination
 * outright, so no such rule ever reaches the proxy — where the destination
 * would have reached `new URL('//evil.com')` and thrown on every request.
 */
export function isExternalDestination(value: string): boolean {
  const trimmed = (value ?? '').trim();

  return ABSOLUTE_URL_PATTERN.test(trimmed) || PROTOCOL_RELATIVE_PATTERN.test(trimmed);
}

/**
 * Percent-decodes one path segment, or returns it untouched if it cannot be.
 *
 * The fallback is not politeness, it is a hard requirement: this function runs
 * inside the proxy, in front of every page on the site, and
 * `decodeURIComponent` throws a `URIError` on a truncated escape such as
 * "%E0%A4%A". A malformed path must produce a redirect miss, never a 500.
 *
 * A segment whose decoded form contains a slash is kept encoded, because "%2F"
 * is a literal slash *inside* a segment rather than a separator, and decoding it
 * would change the shape of the path and merge two genuinely distinct rules.
 */
function decodeSegment(segment: string): string {
  try {
    const decoded = decodeURIComponent(segment);

    return decoded.includes('/') ? segment : decoded;
  } catch {
    return segment;
  }
}

/**
 * Puts a path into the single canonical form both sides of the system compare.
 *
 * The rules, and why each one is there:
 *
 *  - An absolute http(s) URL keeps its path and only has its scheme lowercased,
 *    because destinations are allowed to leave the site and rewriting somebody's
 *    `https://` target would corrupt it — but the database CHECK matches
 *    `^https://` case-sensitively, so a pasted `HTTPS://` has to be folded or it
 *    is refused at insert time with a raw Postgres error.
 *  - A fragment is stripped. Browsers never send `#anchor` to the server, so a
 *    rule keyed on one could never match a real request.
 *  - A query string is stripped too, for the same reason. The proxy only ever
 *    has a pathname to offer, and a pathname contains no "?", so a rule keyed
 *    "/index.php?page=about" was a key nothing could ever look up.
 *    `validateRedirectRule` rejects such a source rather than quietly truncating
 *    it, so an operator finds out at save time instead of never.
 *  - Repeated slashes collapse and a trailing slash is removed (except at the
 *    root), so `/blog//post/` and `/blog/post` are the same rule.
 *  - Each segment is percent-decoded. This is the fix for the encoding split
 *    described in the file header: the proxy's pathname is always encoded and
 *    the admin's stored rule never is, and decoding is the direction that is
 *    total — every encoded path has one decoded form, while a decoded path has
 *    many valid encodings.
 *  - Case is otherwise preserved. URL paths are case-sensitive, and lowercasing
 *    here would silently merge two distinct pages into one rule.
 */
export function normalizeRedirectPath(value: string): string {
  const trimmed = (value ?? '').trim();
  if (trimmed === '') {
    return '/';
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmed)) {
    const schemeEnd = trimmed.indexOf('://');

    return trimmed.slice(0, schemeEnd).toLowerCase() + trimmed.slice(schemeEnd);
  }

  const rawPath = trimmed.split('#')[0].split('?')[0];

  // Prefixing unconditionally and then collapsing is simpler than branching on
  // whether a leading slash is already present, and it handles the pathological
  // '//' and '///' inputs in the same pass.
  let path = `/${rawPath}`.replace(/\/{2,}/g, '/');
  if (path.length > 1) {
    path = path.replace(/\/+$/, '');
  }

  if (path === '') {
    return '/';
  }

  // Decoding after the structural pass, so a decoded character can never change
  // the number of segments the path has.
  return path.split('/').map(decodeSegment).join('/');
}

/**
 * Builds the lookup the proxy uses, keyed by normalised source path.
 *
 * Inactive rules are kept in the index rather than filtered out. `matchRedirect`
 * is the place that decides whether a rule fires, and keeping the full set here
 * means `wouldCreateLoop` and the duplicate check in `validateRedirectRule` also
 * see the rules an operator has merely paused — so re-enabling one cannot
 * silently introduce a loop or a conflict that validation already approved.
 *
 * When two rules share a source, the first wins. `validateRedirectRule` rejects
 * duplicates before they can be stored, so this only decides the outcome for
 * data that predates validation, and "the oldest rule keeps working" is the less
 * surprising of the two possible answers.
 */
export function buildRedirectIndex(rules: RedirectRule[]): Map<string, RedirectRule> {
  const index = new Map<string, RedirectRule>();

  for (const rule of rules) {
    const key = normalizeRedirectPath(rule.sourcePath);
    if (!index.has(key)) {
      index.set(key, rule);
    }
  }

  return index;
}

/** Resolves an incoming request path to the rule that should fire, if any. */
export function matchRedirect(
  index: Map<string, RedirectRule>,
  pathname: string
): RedirectRule | null {
  const rule = index.get(normalizeRedirectPath(pathname));

  return rule !== undefined && rule.isActive ? rule : null;
}

/**
 * Walks a proposed redirect forward through the existing rules to see whether a
 * visitor would ever come back to where they started.
 *
 * The hop budget serves two purposes. It terminates on a cycle that does not
 * include `sourcePath` (which would otherwise spin forever), and it also rejects
 * a chain that is merely absurdly long: browsers give up after a handful of
 * redirects, so a twelve-hop chain is a broken configuration whether or not it
 * technically terminates. Exceeding the budget is therefore reported as a loop.
 *
 * A destination that leaves the site can never loop back, because nothing beyond
 * this site's rule table is under our control.
 */
export function wouldCreateLoop(
  rules: RedirectRule[],
  sourcePath: string,
  destinationPath: string
): boolean {
  if (isExternalDestination(destinationPath)) {
    return false;
  }

  const index = buildRedirectIndex(rules);
  const start = normalizeRedirectPath(sourcePath);
  let current = normalizeRedirectPath(destinationPath);

  for (let hop = 0; hop < MAXIMUM_REDIRECT_HOPS; hop += 1) {
    if (current === start) {
      return true;
    }

    const next = index.get(current);
    if (next === undefined) {
      return false;
    }

    if (isExternalDestination(next.destinationPath)) {
      return false;
    }

    current = normalizeRedirectPath(next.destinationPath);
  }

  return true;
}

/**
 * Validates a rule an operator is about to save.
 *
 * Every `error` is written to be shown verbatim in the admin UI, so the strings
 * name the offending value and say what to do about it rather than describing
 * the rule that failed. Checks run cheapest-and-most-obvious first, so an
 * operator who typed a full URL into the source box is told exactly that instead
 * of being told about a loop.
 *
 * `input.id` is how editing works: a rule is allowed to keep its own source path
 * when it is being edited in place, so the rule with that id is excluded from
 * both the duplicate check and the loop walk. Omitting `id` means "this is a new
 * rule", and then nothing is excluded.
 *
 * The destination checks exist to enforce, in prose an operator can act on,
 * exactly what `cms_redirects_destination_path_check` enforces in SQL: a path
 * starting with "/" or an absolute "https://" URL. They were previously weaker
 * than the constraint in two directions at once. A protocol-relative
 * "//evil.com" passed, because it starts with a slash — and then `new URL()`
 * threw "Invalid URL" in the proxy on every single request to that source. And
 * an "http://" destination passed here only to be rejected by the constraint,
 * surfacing a raw Postgres message in the admin UI. An engine that disagrees
 * with its own database is worse than no validation at all, because it teaches
 * the operator that the green tick means nothing.
 */
export function validateRedirectRule(
  input: { destinationPath: string; id?: string; sourcePath: string },
  existingRules: RedirectRule[]
): { error: string; ok: false } | { ok: true } {
  const rawSource = (input.sourcePath ?? '').trim();
  const rawDestination = (input.destinationPath ?? '').trim();

  if (rawSource === '') {
    return { error: 'Enter the path this rule should redirect from, such as /old-page.', ok: false };
  }

  // Checked before the leading-slash test because a protocol-relative source
  // ("//example.com/x") passes that test while still pointing off-site, and
  // because "you pasted a full URL" is a more useful message than "add a slash".
  if (isExternalDestination(rawSource) || SCHEME_PATTERN.test(rawSource)) {
    return {
      error: 'The source must be a path on this site, such as /old-page, not a full URL.',
      ok: false,
    };
  }

  if (!rawSource.startsWith('/')) {
    return { error: 'The source path must start with a slash, such as /old-page.', ok: false };
  }

  // Refused rather than truncated. The proxy matches on a pathname, which never
  // contains a query string, so a source carrying one is a rule that can never
  // fire — and it would sit in the admin table marked Active, looking correct.
  if (rawSource.includes('?')) {
    const pathOnly = rawSource.split('?')[0];

    return {
      error: `Query strings cannot be matched, only paths. Use ${pathOnly} on its own as the source.`,
      ok: false,
    };
  }

  if (rawDestination === '') {
    return {
      error: 'Enter the path or URL this rule should redirect to, such as /new-page.',
      ok: false,
    };
  }

  // "//evil.com" begins with a slash, so the database CHECK accepts it as a site
  // path, and then `new URL('//evil.com')` throws in the proxy on every request.
  if (PROTOCOL_RELATIVE_PATTERN.test(rawDestination)) {
    return {
      error: 'Use a full https:// URL to send visitors off this site.',
      ok: false,
    };
  }

  // Anything carrying a scheme is off-site, and off-site means https. The scheme
  // is lowercased first so a pasted "HTTPS://" is accepted here and canonicalised
  // by `normalizeRedirectPath` into the form the case-sensitive CHECK expects.
  if (
    SCHEME_PATTERN.test(rawDestination) &&
    !HTTPS_URL_PATTERN.test(normalizeRedirectPath(rawDestination))
  ) {
    return {
      error: 'Off-site destinations must use https://, not http:// or any other scheme.',
      ok: false,
    };
  }

  // The remaining half of the CHECK: with no scheme, the stored value has to
  // start with a slash. Accepting "new-page" here and letting the insert fail is
  // the same disagreement as the http:// case, one step further along.
  if (!isExternalDestination(rawDestination) && !rawDestination.startsWith('/')) {
    return {
      error:
        'The destination must be a path starting with a slash, such as /new-page, or a full https:// URL.',
      ok: false,
    };
  }

  const source = normalizeRedirectPath(rawSource);
  const destination = isExternalDestination(rawDestination)
    ? rawDestination
    : normalizeRedirectPath(rawDestination);

  if (source === destination) {
    return {
      error: `${source} already points at itself, so this rule would send visitors in circles.`,
      ok: false,
    };
  }

  const duplicate = existingRules.find(
    (rule) => rule.id !== input.id && normalizeRedirectPath(rule.sourcePath) === source
  );
  if (duplicate !== undefined) {
    return {
      error: `Another redirect already handles ${source}. Edit that rule instead of adding a second one.`,
      ok: false,
    };
  }

  const otherRules = existingRules.filter((rule) => rule.id !== input.id);
  if (wouldCreateLoop(otherRules, source, destination)) {
    return {
      error: `Redirecting ${source} to ${destination} would send visitors round in a loop.`,
      ok: false,
    };
  }

  return { ok: true };
}
