import { redirect } from 'next/navigation';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { TaxesPage as TaxesPageUI } from '@nextblock-cms/ecommerce/server';

export const metadata = {
  title: 'Tax Settings | NextBlock™ CMS',
};

export default async function TaxesPageWrapper({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string }>;
}) {
  const isOnline = await verifyPackageOnline('ecommerce');

  if (!isOnline) {
    redirect('/cms/settings/packages');
  }

  return <TaxesPageUI searchParams={await searchParams} />;
}
