// Pure language-detection helpers shared by proxy.ts (edge), app/layout.tsx and
// the CMS languages settings. Keep this module free of server-only / next/*
// imports so the proxy can use it.
import { COUNTRY_PRIMARY_LANGUAGES } from './country-languages';

/** site_settings key holding the detection config (non-sensitive, anon-readable). */
export const LANGUAGE_DETECTION_SETTING_KEY = 'language_detection_settings';

/** next/cache tag for the layout's cached read of the detection settings. */
export const LANGUAGE_DETECTION_CACHE_TAG = 'public-language-detection';

export const LANGUAGE_DETECTION_MODES = [
  'browser',
  'country',
  'browser_then_country',
  'default',
] as const;

export type LanguageDetectionMode = (typeof LANGUAGE_DETECTION_MODES)[number];

export interface LanguageDetectionSettings {
  /** How the first language served to a new visitor is chosen. */
  mode: LanguageDetectionMode;
  /** true = persist the visitor's language for a year; false = session-only cookie. */
  rememberVisitorChoice: boolean;
}

// "browser" matches the long-standing page-level Accept-Language fallback, so an
// absent row keeps today's intended behavior.
export const DEFAULT_LANGUAGE_DETECTION_SETTINGS: LanguageDetectionSettings = {
  mode: 'browser',
  rememberVisitorChoice: true,
};

/** Coerce an arbitrary site_settings jsonb value into valid settings. */
export function normalizeLanguageDetectionSettings(value: unknown): LanguageDetectionSettings {
  const fallback = DEFAULT_LANGUAGE_DETECTION_SETTINGS;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...fallback };
  }
  const record = value as Record<string, unknown>;
  const mode = LANGUAGE_DETECTION_MODES.includes(record.mode as LanguageDetectionMode)
    ? (record.mode as LanguageDetectionMode)
    : fallback.mode;
  const rememberVisitorChoice =
    typeof record.rememberVisitorChoice === 'boolean'
      ? record.rememberVisitorChoice
      : fallback.rememberVisitorChoice;
  return { mode, rememberVisitorChoice };
}

export interface AcceptLanguageEntry {
  /** Full lowercased tag, e.g. "fr-ca". */
  tag: string;
  /** Base language, e.g. "fr". */
  base: string;
  quality: number;
}

/** Parse an Accept-Language header into tags sorted by q-value (wildcards and q=0 dropped). */
export function parseAcceptLanguage(header: string | null | undefined): AcceptLanguageEntry[] {
  if (!header) return [];
  const entries: AcceptLanguageEntry[] = [];
  for (const part of header.split(',')) {
    const [rawTag, ...params] = part.trim().split(';');
    const tag = rawTag?.trim().toLowerCase();
    if (!tag || tag === '*' || !/^[a-z]{1,8}(-[a-z0-9]{1,8})*$/.test(tag)) continue;
    let quality = 1;
    for (const param of params) {
      const eq = param.indexOf('=');
      if (eq === -1) continue;
      if (param.slice(0, eq).trim() !== 'q') continue;
      const parsed = Number(param.slice(eq + 1).trim());
      if (!Number.isNaN(parsed)) quality = Math.min(Math.max(parsed, 0), 1);
    }
    if (quality <= 0) continue;
    entries.push({ tag, base: tag.split('-')[0] as string, quality });
  }
  // Stable sort: q descending, original order preserved among equals.
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.quality - a.entry.quality || a.index - b.index)
    .map(({ entry }) => entry);
}

/**
 * Match ordered candidate tags against the site's language codes.
 * Candidate priority wins: for each candidate (in order) try, exact tag
 * ("fr-ca" = "fr-CA"), then candidate base to site code ("fr-CA" -> "fr"),
 * then candidate base to site code base ("fr" -> "fr-CA") — so a visitor's
 * top language matched loosely beats a lower preference matched exactly.
 * Returns the site code as configured (original casing) or null.
 */
export function matchLocale(candidates: string[], availableCodes: string[]): string | null {
  if (candidates.length === 0 || availableCodes.length === 0) return null;
  const available = availableCodes.map((code) => ({
    code,
    lower: code.toLowerCase(),
    base: code.toLowerCase().split('-')[0] as string,
  }));

  for (const candidate of candidates) {
    const tag = candidate.toLowerCase();
    const base = tag.split('-')[0] as string;
    const match =
      available.find((lang) => lang.lower === tag) ??
      available.find((lang) => lang.lower === base) ??
      available.find((lang) => lang.base === base);
    if (match) return match.code;
  }
  return null;
}

// Geo country headers injected by the popular hosts/CDNs, in precedence order.
const COUNTRY_HEADER_NAMES = [
  'x-vercel-ip-country', // Vercel
  'cf-ipcountry', // Cloudflare
  'cloudfront-viewer-country', // AWS CloudFront
  'x-country-code', // generic reverse proxies
] as const;

/** Read the visitor's ISO 3166-1 alpha-2 country from host geo headers, if any. */
export function getCountryFromRequestHeaders(headers: {
  get(name: string): string | null;
}): string | null {
  for (const name of COUNTRY_HEADER_NAMES) {
    const value = headers.get(name)?.trim().toUpperCase();
    // Cloudflare uses XX/T1 for unknown/Tor; only accept real alpha-2 codes.
    if (value && /^[A-Z]{2}$/.test(value) && value !== 'XX' && value !== 'T1') {
      return value;
    }
  }
  return null;
}

export function detectLocaleFromBrowser(
  acceptLanguage: string | null | undefined,
  availableCodes: string[],
): string | null {
  return matchLocale(
    parseAcceptLanguage(acceptLanguage).map((entry) => entry.tag),
    availableCodes,
  );
}

export function detectLocaleFromCountry(
  countryCode: string | null | undefined,
  availableCodes: string[],
): string | null {
  if (!countryCode) return null;
  const candidates = COUNTRY_PRIMARY_LANGUAGES[countryCode.toUpperCase()];
  if (!candidates || candidates.length === 0) return null;
  return matchLocale(candidates, availableCodes);
}

export interface ResolveDetectedLocaleInput {
  mode: LanguageDetectionMode;
  acceptLanguage: string | null | undefined;
  countryCode: string | null | undefined;
  availableCodes: string[];
  defaultCode: string;
}

/**
 * Pick the first language for a visitor with no (valid) language cookie.
 * Always falls back to the site's default language when detection finds no match.
 */
export function resolveDetectedLocale({
  mode,
  acceptLanguage,
  countryCode,
  availableCodes,
  defaultCode,
}: ResolveDetectedLocaleInput): string {
  let detected: string | null = null;
  switch (mode) {
    case 'browser':
      detected = detectLocaleFromBrowser(acceptLanguage, availableCodes);
      break;
    case 'country':
      detected = detectLocaleFromCountry(countryCode, availableCodes);
      break;
    case 'browser_then_country':
      detected =
        detectLocaleFromBrowser(acceptLanguage, availableCodes) ??
        detectLocaleFromCountry(countryCode, availableCodes);
      break;
    case 'default':
      break;
  }
  return detected ?? defaultCode;
}
