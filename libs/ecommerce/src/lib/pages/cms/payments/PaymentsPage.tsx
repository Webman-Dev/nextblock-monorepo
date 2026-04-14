import { updatePaymentSettings } from './actions';
import { getPaymentSettings, getStoreConfigStatus } from './queries';
import { PaymentsClient } from './PaymentsClient';

export async function PaymentsPage() {
  const [initialProvider, configStatus] = await Promise.all([
    getPaymentSettings(),
    getStoreConfigStatus(),
  ]);

  async function savePaymentSettings(formData: FormData) {
    'use server';

    const provider = formData.get('provider');
    if (provider !== 'stripe' && provider !== 'freemius') {
      throw new Error('Invalid payment provider');
    }

    await updatePaymentSettings(provider);
  }

  return (
    <PaymentsClient
      initialProvider={initialProvider}
      configStatus={configStatus}
      saveAction={savePaymentSettings}
    />
  );
}
