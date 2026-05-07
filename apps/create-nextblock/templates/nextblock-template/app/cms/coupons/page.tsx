import { CouponsPage as CouponsPageUI } from '@nextblock-cms/ecommerce/server';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const isOnline = await verifyPackageOnline('ecommerce');
  if (!isOnline) {
    redirect('/cms/settings/packages');
  }

  return <CouponsPageUI searchParams={await searchParams} />;
}
