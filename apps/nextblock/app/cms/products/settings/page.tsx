import { ProductsSettingsPage as ProductsSettingsPageUI } from '@nextblock-cms/ecommerce/server';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';

export default async function ProductsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const [isOnline, resolvedSearchParams] = await Promise.all([
    verifyPackageOnline('ecommerce'),
    searchParams,
  ]);

  if (!isOnline) {
    redirect('/cms/settings/packages');
  }

  return <ProductsSettingsPageUI searchParams={resolvedSearchParams} />;
}
