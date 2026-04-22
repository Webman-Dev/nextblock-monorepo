import { updatePaymentSettings } from './actions';
import {
  getEnabledPaymentProviders,
  getStoreConfigStatus,
} from './queries';
import { PaymentsClient } from './PaymentsClient';

export async function PaymentsPage() {
  const [initialEnabledProviders, configStatus] = await Promise.all([
    getEnabledPaymentProviders(),
    getStoreConfigStatus(),
  ]);

  async function savePaymentSettings(formData: FormData) {
    'use server';

    const nextSettings = {
      stripe:
        formData.get('stripe_enabled') === 'true' && configStatus.stripe.hasKeys,
      freemius:
        formData.get('freemius_enabled') === 'true' &&
        configStatus.freemius.hasKeys,
    };

    await updatePaymentSettings(nextSettings);
  }

  return (
    <PaymentsClient
      initialEnabledProviders={initialEnabledProviders}
      configStatus={configStatus}
      saveAction={savePaymentSettings}
    />
  );
}
