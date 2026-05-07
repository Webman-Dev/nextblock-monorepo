import { OrdersPage as OrdersPageUI } from '@nextblock-cms/ecommerce/server';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Orders | NextBlock™ CMS',
};

export default async function OrdersPageWrapper({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const isOnline = await verifyPackageOnline('ecommerce');
  if (!isOnline) {
      redirect('/cms/settings/packages');
  }

  return <OrdersPageUI searchParams={searchParams} />;
}
