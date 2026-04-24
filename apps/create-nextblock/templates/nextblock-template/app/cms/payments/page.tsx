import { PaymentsPage as PaymentsPageUI } from '@nextblock-cms/ecommerce/server';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Payments Settings | NextBlock™ CMS',
};

export default async function PaymentsPageWrapper() {
  const isOnline = await verifyPackageOnline('ecommerce');
  if (!isOnline) {
      redirect('/cms/settings/packages');
  }

  return <PaymentsPageUI />;
}
