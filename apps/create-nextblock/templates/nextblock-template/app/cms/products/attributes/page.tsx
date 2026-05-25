import { redirect } from 'next/navigation';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { AttributeManagementPage as AttributeManagementPageUI } from '@nextblock-cms/ecommerce/server';

export default async function AttributeManagementPage() {
  const isOnline = await verifyPackageOnline('ecommerce');
  if (!isOnline) {
    redirect('/cms/settings/packages');
  }

  return <AttributeManagementPageUI />;
}
