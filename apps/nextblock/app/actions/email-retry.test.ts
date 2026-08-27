import { describe, expect, it } from 'vitest';

import { describeSmtpError } from './email';

/**
 * A reply failed with "The mail server did not respond in time" on an install whose
 * transport verifies in about a second and whose identical send succeeds moments later.
 * That signature — everything healthy, one send hangs — is a pooled connection the relay
 * reaped while it sat idle: nodemailer still believes it is open, so the send blocks
 * until the socket timeout.
 *
 * sendEmail now drops the pool and retries once on a fresh connection for that class of
 * fault only. These cover the classification, which is what decides retry vs report.
 */

describe('describeSmtpError', () => {
  it('explains the TLS/port mismatch that produced an unreadable OpenSSL error', () => {
    const message = describeSmtpError(
      new Error('B4730000:error:0A00010B:SSL routines:ssl3_get_record:wrong version number:ssl3_record.c:355:')
    );
    expect(message).toContain('2525');
    expect(message).toContain('465');
    expect(message).not.toContain('ssl3_get_record');
  });

  it('names credentials as the cause of an auth rejection', () => {
    const error = Object.assign(new Error('Invalid login: 535 authentication failed'), {
      code: 'EAUTH',
    });
    expect(describeSmtpError(error)).toMatch(/username or password/i);
  });

  it('distinguishes a timeout from an unreachable host', () => {
    const timeout = Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' });
    expect(describeSmtpError(timeout)).toMatch(/did not respond in time/i);

    const dns = Object.assign(new Error('getaddrinfo ENOTFOUND smtp.example.com'), {
      code: 'ENOTFOUND',
    });
    expect(describeSmtpError(dns)).toMatch(/hostname could not be resolved/i);

    const refused = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    expect(describeSmtpError(refused)).toMatch(/refused the connection/i);
  });

  it('tells an unconfigured install what to do rather than echoing the throw', () => {
    expect(describeSmtpError(new Error('Email server is not configured.'))).toMatch(
      /CMS Settings/i
    );
  });

  it('passes an unrecognised failure through rather than inventing an explanation', () => {
    expect(describeSmtpError(new Error('552 5.3.4 Message too big'))).toBe(
      '552 5.3.4 Message too big'
    );
  });

  it('handles a non-Error throw without crashing', () => {
    expect(describeSmtpError('something odd')).toBe('something odd');
    expect(describeSmtpError(null)).toBe('null');
  });
});
