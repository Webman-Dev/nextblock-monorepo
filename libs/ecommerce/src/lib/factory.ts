import { PaymentProvider } from './types';
import { StripeProvider } from './providers/stripe';
import { LemonSqueezyProvider } from './providers/lemon-squeezy';

export function getPaymentProvider(provider: 'stripe' | 'lemon_squeezy'): PaymentProvider {
  switch (provider) {
    case 'lemon_squeezy':
      return new LemonSqueezyProvider();
    case 'stripe':
    default:
      return new StripeProvider();
  }
}
