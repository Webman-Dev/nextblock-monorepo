import { describe, expect, it } from 'vitest';

import { isPlaceholderEmail, usableEmail } from './placeholder-address';

/**
 * The starter content ships a contact page addressed to `contact@example.com`, and an
 * install ran that way without knowing: the visitor was thanked, the relay accepted the
 * message, and it went to a domain RFC 2606 reserves so it can never exist. No error
 * anywhere. Treating these as unset is what lets the recipient ladder reach something
 * real — and lets the CMS say so.
 */

describe('isPlaceholderEmail', () => {
  it.each([
    'contact@example.com',
    'CONTACT@EXAMPLE.COM',
    '  hello@example.com  ',
    'privacy@example.org',
    'support@example.net',
    'someone@example.edu',
    'a@host.example',
    'a@something.invalid',
    'a@my.test',
    'a@dev.localhost',
    'a@printer.local',
  ])('treats %s as a placeholder', (email) => {
    expect(isPlaceholderEmail(email)).toBe(true);
    expect(usableEmail(email)).toBeNull();
  });

  it.each([
    'hosts@newrootsherbal.com',
    'sales@nextblock.dev',
    // A real domain that merely contains the word, and a real TLD lookalike.
    'hi@example-company.com',
    'hi@myexample.com',
    'hi@shop.exampleshop.co.uk',
  ])('leaves the real address %s alone', (email) => {
    expect(isPlaceholderEmail(email)).toBe(false);
    expect(usableEmail(email)).toBe(email);
  });

  it('does not treat an empty or malformed value as a placeholder', () => {
    // Empty means "unset", which callers already handle; malformed is not our call.
    for (const value of ['', '   ', null, undefined, 'not-an-email']) {
      expect(isPlaceholderEmail(value)).toBe(false);
    }
  });

  it('reports an empty value as unusable without calling it a placeholder', () => {
    expect(usableEmail('')).toBeNull();
    expect(usableEmail(null)).toBeNull();
    expect(usableEmail('  ')).toBeNull();
  });

  it('trims a usable address rather than returning it padded', () => {
    expect(usableEmail('  sales@nextblock.dev ')).toBe('sales@nextblock.dev');
  });
});
