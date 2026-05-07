import { describe, expect, it, vi } from 'vitest';

vi.mock('@nextblock-cms/db/server', () => ({
  getServiceRoleSupabaseClient: () => ({}),
}));
vi.mock('@nextblock-cms/utils', () => ({
  formatPrice: (amount: number) => String(amount),
  getCurrencyMinorUnitFactor: () => 100,
}));
vi.mock('server-only', () => ({}));

import {
  resolveFreemiusStatusFromCheckoutResponse,
  resolveFreemiusStatusFromWebhookEvent,
} from './freemius-order-sync';

describe('Freemius order status resolution', () => {
  it('marks free trial checkout callbacks as trial', () => {
    expect(
      resolveFreemiusStatusFromCheckoutResponse(
        {
          trial: {
            id: 'trial_1',
            license_id: 'license_1',
            trial_ends_at: '2026-05-21 00:00:00',
          },
        },
        'pending'
      )
    ).toBe('trial');
  });

  it('keeps paid trials with no initial charge in trial', () => {
    expect(
      resolveFreemiusStatusFromCheckoutResponse(
        {
          purchase: {
            license_id: 'license_2',
            subscription_id: 'sub_2',
            initial_amount: 0,
            trial_ends: '2026-05-21 00:00:00',
          },
        },
        'pending'
      )
    ).toBe('trial');
  });

  it('marks immediate paid checkout callbacks as paid when a positive amount is present', () => {
    expect(
      resolveFreemiusStatusFromCheckoutResponse(
        {
          purchase: {
            license_id: 'license_3',
            initial_amount: 250,
          },
        },
        'pending'
      )
    ).toBe('paid');
  });

  it('marks trial renewal extension webhooks as paid', () => {
    expect(
      resolveFreemiusStatusFromWebhookEvent({
        currentStatus: 'trial',
        event: {
          type: 'license.extended',
          data: {
            license_id: 'license_4',
            is_renewal: true,
          },
        },
      })
    ).toBe('paid');
  });

  it('marks cancellable trial lifecycle webhooks as cancelled', () => {
    expect(
      resolveFreemiusStatusFromWebhookEvent({
        currentStatus: 'trial',
        event: {
          type: 'subscription.cancelled',
          data: {
            license_id: 'license_5',
          },
        },
      })
    ).toBe('cancelled');
  });

  it('does not downgrade an already-paid order after cancellation', () => {
    expect(
      resolveFreemiusStatusFromWebhookEvent({
        currentStatus: 'paid',
        event: {
          type: 'subscription.cancelled',
          data: {
            license_id: 'license_6',
          },
        },
      })
    ).toBe('paid');
  });
});
