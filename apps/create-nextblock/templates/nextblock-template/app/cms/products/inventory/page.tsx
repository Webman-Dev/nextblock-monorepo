import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { InventoryPage as InventoryPageUI } from '@nextblock-cms/ecommerce/server';
import { redirect } from 'next/navigation';

export default async function InventoryPage() {
  const isOnline = await verifyPackageOnline('ecommerce');

  if (!isOnline) {
    redirect('/cms/settings/packages');
  }

  return <InventoryPageUI />;
}
