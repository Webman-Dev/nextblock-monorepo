/**
 * Mechanical review of author-supplied JavaScript before it ships to every visitor.
 *
 * WHY THIS EXISTS. A site script is written by whoever (or whatever) is driving the
 * CMS, and an AI agent can be steered by content it reads — a page fetched with
 * `fetch_url_content` may contain text engineered to make the model write an
 * exfiltration snippet. The model then writes its own summary of what it did, and a
 * steered model will happily describe a keylogger as "analytics helper".
 *
 * So the stated summary is NOT the control. This is: a static scan the model does not
 * author and cannot be argued out of. It reports what the code can actually reach —
 * cookies, network, storage, form values, dynamic evaluation — so the human approving
 * the change sees the capabilities regardless of how the change was described.
 *
 * DELIBERATELY NOT A SANDBOX. This is regex over source text. Obfuscated or
 * dynamically-assembled code can evade it, which is exactly why `eval`-style
 * construction is itself reported at the highest level rather than ignored. Treat a
 * clean result as "nothing obvious found", never as "this code is safe".
 */

export type ScriptRiskLevel = 'info' | 'notice' | 'warning';

export interface ScriptCapability {
  /** Stable identifier, e.g. 'cookies'. */
  id: string;
  /** One sentence a non-programmer can act on. */
  label: string;
  level: ScriptRiskLevel;
  /** Source fragments that triggered the match, for the reviewer to eyeball. */
  evidence: string[];
}

export interface ScriptReview {
  capabilities: ScriptCapability[];
  /** Hosts the script references, so an unexpected destination stands out. */
  externalHosts: string[];
  highestLevel: ScriptRiskLevel;
  /** True when nothing matched — "nothing obvious", not "safe". */
  clean: boolean;
  /** Fixed sentence to show a reviewer, so the caveat travels with the result. */
  disclaimer: string;
}

const DISCLAIMER =
  'Heuristic source scan, not a sandbox. Obfuscated code can hide from it — a clean result means nothing obvious was found, not that the script is safe. Read the code before enabling it.';

interface Rule {
  id: string;
  label: string;
  level: ScriptRiskLevel;
  pattern: RegExp;
}

/**
 * Ordered roughly by how much a reviewer should care. Patterns are intentionally
 * broad: a false positive costs a glance, a false negative ships a skimmer.
 */
const RULES: Rule[] = [
  {
    id: 'cookies',
    label: 'Reads or writes browser cookies, which can include session identifiers',
    level: 'warning',
    pattern: /document\s*\.\s*cookie|cookieStore\b/gi,
  },
  {
    id: 'dynamic-code',
    label: 'Builds and runs code at runtime, which hides what it actually does from this scan',
    level: 'warning',
    pattern: /\beval\s*\(|new\s+Function\s*\(|document\s*\.\s*write\s*\(|setTimeout\s*\(\s*['"`]/gi,
  },
  {
    id: 'form-capture',
    label: 'Reads form fields or listens to form submission — check this against checkout and login pages',
    level: 'warning',
    pattern:
      /addEventListener\s*\(\s*['"`](?:submit|change|keydown|keyup|keypress|input|paste)['"`]|input\[type\s*=\s*['"`]?password|\.\s*elements\b|new\s+FormData\s*\(/gi,
  },
  {
    id: 'network',
    label: 'Sends or receives data over the network',
    level: 'warning',
    pattern:
      /\bfetch\s*\(|XMLHttpRequest|sendBeacon\s*\(|new\s+WebSocket\s*\(|new\s+EventSource\s*\(|\bimport\s*\(/gi,
  },
  {
    id: 'navigation',
    label: 'Can redirect the visitor or open another window',
    level: 'warning',
    pattern:
      /location\s*\.\s*(?:href|replace|assign)\s*[=(]|window\s*\.\s*open\s*\(|location\s*=\s*['"`]/gi,
  },
  {
    id: 'storage',
    label: 'Reads or writes browser storage',
    level: 'notice',
    pattern: /localStorage|sessionStorage|indexedDB/gi,
  },
  {
    id: 'html-injection',
    label: 'Writes raw HTML into the page',
    level: 'notice',
    pattern: /innerHTML|outerHTML|insertAdjacentHTML/gi,
  },
  {
    id: 'observers',
    label: 'Watches the page for changes or scroll position',
    level: 'info',
    pattern: /IntersectionObserver|MutationObserver|ResizeObserver/gi,
  },
  {
    id: 'dom',
    label: 'Reads or modifies page elements',
    level: 'info',
    pattern: /querySelector|getElementById|getElementsBy|createElement|classList/gi,
  },
];

const LEVEL_ORDER: Record<ScriptRiskLevel, number> = { info: 0, notice: 1, warning: 2 };

/** Trim a match to something readable in a table cell. */
function snippet(source: string, index: number): string {
  const start = Math.max(0, index - 24);
  const raw = source.slice(start, index + 56).replace(/\s+/g, ' ').trim();

  return `${start > 0 ? '…' : ''}${raw}${index + 56 < source.length ? '…' : ''}`;
}

function collectHosts(source: string): string[] {
  const hosts = new Set<string>();
  const pattern = /https?:\/\/([a-z0-9.-]+\.[a-z]{2,})(?::\d+)?/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    const host = match[1];

    if (host) {
      hosts.add(host.toLowerCase());
    }
  }

  return [...hosts].sort();
}

/**
 * Scan a site script and report what it can reach.
 *
 * `src` counts as source: an external file is code this site executes, and its host
 * is the single most useful thing to show a reviewer even though its body is remote
 * and therefore completely unscannable.
 */
export function reviewScriptCode(input: { code?: string | null; src?: string | null }): ScriptReview {
  const code = input.code ?? '';
  const src = (input.src ?? '').trim();
  const capabilities: ScriptCapability[] = [];

  for (const rule of RULES) {
    const evidence: string[] = [];
    // Fresh regex per scan: the shared /g instances carry lastIndex between calls.
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(code)) !== null && evidence.length < 3) {
      evidence.push(snippet(code, match.index));

      // Zero-length matches would spin forever.
      if (match[0] === '') {
        pattern.lastIndex += 1;
      }
    }

    if (evidence.length > 0) {
      capabilities.push({ evidence, id: rule.id, label: rule.label, level: rule.level });
    }
  }

  if (src) {
    capabilities.unshift({
      evidence: [src],
      id: 'external-script',
      label:
        'Loads and runs a script file from another server. Its contents are not visible here and can change at any time without touching this CMS',
      level: 'warning',
    });
  }

  const externalHosts = collectHosts(`${code}\n${src}`);

  const highestLevel = capabilities.reduce<ScriptRiskLevel>(
    (worst, capability) => (LEVEL_ORDER[capability.level] > LEVEL_ORDER[worst] ? capability.level : worst),
    'info'
  );

  return {
    capabilities,
    clean: capabilities.length === 0,
    disclaimer: DISCLAIMER,
    externalHosts,
    highestLevel,
  };
}

/** Render a review as the one-line summary stored on the audit-log entry. */
export function formatScriptReview(review: ScriptReview): string {
  if (review.clean) {
    return 'No notable capabilities detected.';
  }

  const parts = review.capabilities
    .filter((capability) => capability.level !== 'info')
    .map((capability) => capability.id);
  const listed = parts.length > 0 ? parts.join(', ') : review.capabilities.map((c) => c.id).join(', ');
  const hosts =
    review.externalHosts.length > 0 ? ` — hosts: ${review.externalHosts.join(', ')}` : '';

  return `Detected: ${listed}${hosts}`;
}
