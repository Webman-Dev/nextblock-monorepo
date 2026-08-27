import { describe, expect, it } from 'vitest';

import { reconcileTlsForPort } from './email-settings';

/**
 * The TLS mode is a property of the SMTP port, not a preference — and getting it wrong
 * produces "ssl3_get_record:wrong version number", which mentions neither TLS nor ports.
 * A real install hit exactly that: SMTP2GO on 2525 with the toggle left at its default
 * of ON. These tests pin the reconciliation that makes the combination unreachable.
 */

describe('reconcileTlsForPort', () => {
  it('forces implicit TLS on 465 even when the setting says otherwise', () => {
    const result = reconcileTlsForPort(465, false, 'smtp.example.com');
    expect(result.secure).toBe(true);
    expect(result.requireTLS).toBe(false);
    expect(result.correctedFrom).toBe(false);
  });

  it('leaves a correct 465 configuration untouched', () => {
    const result = reconcileTlsForPort(465, true, 'smtp.example.com');
    expect(result.secure).toBe(true);
    expect(result.correctedFrom).toBeUndefined();
  });

  it.each([25, 587, 2525])('forces STARTTLS on port %i', (port) => {
    const result = reconcileTlsForPort(port, true, 'mail.smtp2go.com');
    expect(result.secure).toBe(false);
    // Downgrading to plaintext would be worse than the bug being fixed.
    expect(result.requireTLS).toBe(true);
    expect(result.correctedFrom).toBe(true);
  });

  it('reproduces the reported failure: SMTP2GO on 2525 with the toggle left on', () => {
    const result = reconcileTlsForPort(2525, true, 'mail.smtp2go.com');
    expect(result.secure).toBe(false);
    expect(result.correctedFrom).toBe(true);
  });

  it('does not demand STARTTLS from a local test relay', () => {
    for (const host of ['localhost', '127.0.0.1', '::1', 'LocalHost']) {
      expect(reconcileTlsForPort(587, false, host).requireTLS).toBe(false);
    }
  });

  it('honours the operator on a non-standard port, either way', () => {
    expect(reconcileTlsForPort(1025, false, 'localhost')).toMatchObject({
      secure: false,
      requireTLS: false,
    });
    expect(reconcileTlsForPort(2526, true, 'smtp.example.com')).toMatchObject({
      secure: true,
      requireTLS: false,
    });
    expect(reconcileTlsForPort(2526, true, 'smtp.example.com').correctedFrom).toBeUndefined();
  });
});
