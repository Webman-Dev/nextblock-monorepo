import { OrderDetailPage as OrderDetailPageUI } from '@nextblock-cms/ecommerce/server';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Order Details | NextBlock™ CMS',
};

export default async function OrderDetailPageWrapper({ params }: { params: Promise<{ id: string }> }) {
  const isOnline = await verifyPackageOnline('ecommerce');
  if (!isOnline) {
      redirect('/cms/settings/packages');
  }

  return <OrderDetailPageUI params={params} />;
}
