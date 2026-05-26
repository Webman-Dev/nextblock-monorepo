import { redirect } from 'next/navigation';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { CategoryManagementPage as CategoryManagementPageUI } from '@nextblock-cms/ecommerce/server';

export default async function CategoryManagementPage() {
  const isOnline = await verifyPackageOnline('ecommerce');
  if (!isOnline) {
    redirect('/cms/settings/packages');
  }

  return <CategoryManagementPageUI />;
}
