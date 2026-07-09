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

  it('marks a no-card trial as trial from purchase data with a trial end date', () => {
    // A free trial has no subscription and no positive amount, so the trial end
    // date on the purchase data is the only signal that it is a trial.
    expect(
      resolveFreemiusStatusFromWebhookEvent({
        currentStatus: 'pending',
        event: {
          type: 'checkout.purchaseCompleted',
          data: { license_id: 'license_free_trial' },
          objects: {},
        },
        purchaseData: {
          licenseId: 'license_free_trial',
          initialAmount: 0,
          trialEndsAt: '2026-05-21 00:00:00',
        },
      })
    ).toBe('trial');
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
