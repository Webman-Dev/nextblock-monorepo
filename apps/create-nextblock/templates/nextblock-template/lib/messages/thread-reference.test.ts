import { describe, expect, it } from 'vitest';

import { threadReference } from './threads';

/**
 * A real install stopped receiving replies and nothing reported a fault: SMTP accepted
 * every message, Outlook accepted every message, and they went straight to Deleted Items.
 * The cause was the subject. Every conversation from one form produced a byte-identical
 * "Re: Contact form"; Exchange derives its ConversationTopic from the subject rather than
 * from References, so an Ignore Conversation applied once applied to every enquiry the
 * site would ever receive.
 *
 * A per-conversation reference is what stops one filtering decision swallowing the lot.
 */

const THREAD_A = 'f4c00aff-a458-40cb-8f6b-7ec66e98779c';
const THREAD_B = '34b62e11-8209-4beb-98e9-10b364bd2807';

describe('threadReference', () => {
  it('is stable for a given thread', () => {
    expect(threadReference(THREAD_A, 'New Roots Herbal')).toBe(
      threadReference(THREAD_A, 'New Roots Herbal')
    );
  });

  it('differs between threads, which is the entire point', () => {
    expect(threadReference(THREAD_A, 'New Roots Herbal')).not.toBe(
      threadReference(THREAD_B, 'New Roots Herbal')
    );
  });

  it('reads as a ticket number rather than a hex dump', () => {
    expect(threadReference(THREAD_A, 'New Roots Herbal')).toBe('NRH-VWQOLB');
    expect(threadReference(THREAD_A, 'New Roots Herbal')).toMatch(/^[A-Z]{2,4}-[0-9A-Z]{6}$/);
  });

  it('builds initials from a multi-word site name', () => {
    expect(threadReference(THREAD_A, 'New Roots Herbal')).toMatch(/^NRH-/);
    expect(threadReference(THREAD_A, 'The Corner  Shop')).toMatch(/^TCS-/);
  });

  it('falls back to the first three letters of a one-word name', () => {
    expect(threadReference(THREAD_A, 'NextBlock')).toMatch(/^NEX-/);
  });

  it('drops the prefix entirely when there is no usable site name', () => {
    expect(threadReference(THREAD_A, '')).toBe('VWQOLB');
    expect(threadReference(THREAD_A, '   ')).toBe('VWQOLB');
    expect(threadReference(THREAD_A)).toBe('VWQOLB');
  });

  it('ignores punctuation in the site name rather than emitting it', () => {
    expect(threadReference(THREAD_A, "Bob's Bikes & Co.")).toMatch(/^BBC-/);
  });

  it('survives a malformed id instead of throwing', () => {
    expect(threadReference('', 'New Roots Herbal')).toBe('NRH-000000');
    expect(threadReference('zzzzzzzz', 'New Roots Herbal')).toBe('NRH-000000');
  });

  it('keeps distinct conversations apart across a large sample', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i += 1) {
      seen.add(threadReference(crypto.randomUUID(), 'New Roots Herbal'));
    }
    // 2.2 billion references; a handful of collisions in 2000 draws would signal a bug
    // in the fold, not birthday-paradox noise.
    expect(seen.size).toBe(2000);
  });
});
