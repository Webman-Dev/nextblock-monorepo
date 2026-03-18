import { PaymentProvider } from './types';
import { StripeProvider } from './providers/stripe';
import { FreemiusProvider } from './providers/freemius';

export function getPaymentProvider(provider: 'stripe' | 'freemius'): PaymentProvider {
  switch (provider) {
    case 'freemius':
      return new FreemiusProvider();
    case 'stripe':
    default:
      return new StripeProvider();
  }
}
