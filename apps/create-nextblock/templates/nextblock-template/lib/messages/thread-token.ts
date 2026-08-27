import 'server-only';

import { sha256Hex, randomToken } from '../auth/crypto';

/**
 * The visitor's credential for a private conversation.
 *
 * A visitor who sends a product enquiry or a contact-form message has no account, so
 * there is nothing to authenticate them with. This token is that credential — and it is
 * the only one in the repo issued to an anonymous person, so its handling is
 * deliberately conservative:
 *
 *  - 32 bytes (256 bits) of `crypto.randomBytes`. Guessing is infeasible by keyspace,
 *    not by rate limiting, which matters because a GET has no throttle here.
 *  - Only the SHA-256 hash is stored. The plaintext lives long enough to be placed in
 *    one outbound email and is never written down.
 *  - Minted on the FIRST ADMIN REPLY, never at submission. A store that receives a
 *    hundred enquiries and answers three has three live credentials, not a hundred.
 *  - Rolling 90-day expiry, extended by each reply, revocable from the CMS.
 *
 * The token reaches the site once, in a URL. `/thread/[token]` immediately exchanges it
 * for an HttpOnly cookie and redirects to a token-less `/thread`, because this app sends
 * `Referrer-Policy: strict-origin-when-cross-origin` — which means the FULL url travels
 * in the Referer header on same-origin navigations. A token left in the address bar
 * would leak to every internal link, into history, and into any shared screenshot.
 */

export const THREAD_TOKEN_PREFIX = 'nbt_';
export const THREAD_COOKIE = 'nb_thread';

const THREAD_TOKEN_BYTES = 32;
const THREAD_TTL_DAYS = 90;

/** Shortest thing worth a database probe. Mirrors the MCP token guard. */
const MIN_TOKEN_LENGTH = 16;

export interface MintedThreadToken {
  /** Plaintext. Goes in exactly one email and is never persisted. */
  token: string;
  tokenHash: string;
  expiresAt: string;
}

export function mintThreadToken(now: Date = new Date()): MintedThreadToken {
  const token = `${THREAD_TOKEN_PREFIX}${randomToken(THREAD_TOKEN_BYTES)}`;
  const expiresAt = new Date(now.getTime() + THREAD_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenHash: hashThreadToken(token), expiresAt: expiresAt.toISOString() };
}

export function hashThreadToken(token: string): string {
  return sha256Hex(token);
}

/**
 * Normalise a token from a URL segment or a cookie. Returns null for anything that
 * could not be one, so a malformed value never reaches the database.
 *
 * Pure and dependency-free on purpose — this half is what the unit tests exercise,
 * following the draft-route convention.
 */
export function parseThreadToken(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;

  const token = raw.trim();
  if (!token.startsWith(THREAD_TOKEN_PREFIX)) return null;
  if (token.length < MIN_TOKEN_LENGTH) return null;
  // base64url alphabet plus the prefix; anything else is not one of ours.
  if (!/^nbt_[A-Za-z0-9_-]+$/.test(token)) return null;

  return token;
}

/** How long a cookie should live for a token expiring at `expiresAt`. */
export function secondsUntilExpiry(expiresAt: string | null, now: Date = new Date()): number {
  if (!expiresAt) return 0;
  const seconds = Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 1000);
  return seconds > 0 ? seconds : 0;
}

/** A fresh expiry, used to extend the window each time the admin replies. */
export function nextExpiry(now: Date = new Date()): string {
  return new Date(now.getTime() + THREAD_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export type ThreadTokenFailure = 'malformed' | 'unknown' | 'expired' | 'revoked';

export interface ThreadRow {
  id: string;
  source: string;
  /** Which contact form this conversation began on, so a reply keeps its routing. */
  form_key: string | null;
  subject_label: string;
  sender_name: string | null;
  sender_email: string | null;
  status: string;
  token_expires_at: string | null;
  token_revoked_at: string | null;
  unread_for_visitor: boolean;
}

export type ThreadTokenVerification =
  | { valid: false; reason: ThreadTokenFailure }
  | { valid: true; thread: ThreadRow };

interface SupabaseLike {
  from: (table: string) => any;
}

/**
 * Resolve a token to its thread. One indexed equality probe on the hash — there is no
 * scan-and-compare and therefore no timing oracle to defend against.
 *
 * Every failure mode is reported to the caller but NOT to the visitor: the page renders
 * one generic "this link is no longer valid" message either way, so a probe cannot
 * distinguish a revoked thread from one that never existed.
 */
export async function verifyThreadToken(
  supabase: SupabaseLike,
  rawToken: string | null | undefined,
  now: Date = new Date()
): Promise<ThreadTokenVerification> {
  const token = parseThreadToken(rawToken);
  if (!token) return { valid: false, reason: 'malformed' };

  const { data, error } = await supabase
    .from('message_threads')
    .select(
      'id, source, form_key, subject_label, sender_name, sender_email, status, token_expires_at, token_revoked_at, unread_for_visitor'
    )
    .eq('token_hash', hashThreadToken(token))
    .maybeSingle();

  if (error || !data) return { valid: false, reason: 'unknown' };

  const thread = data as ThreadRow;
  if (thread.token_revoked_at) return { valid: false, reason: 'revoked' };
  if (thread.token_expires_at && new Date(thread.token_expires_at).getTime() <= now.getTime()) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, thread };
}

/**
 * Stamp `token_last_used_at`. Fire-and-forget: failed bookkeeping must never fail a
 * request that already authenticated.
 */
export async function touchThreadToken(supabase: SupabaseLike, threadId: string): Promise<void> {
  try {
    await supabase
      .from('message_threads')
      .update({ token_last_used_at: new Date().toISOString() })
      .eq('id', threadId);
  } catch {
    /* ignore */
  }
}
