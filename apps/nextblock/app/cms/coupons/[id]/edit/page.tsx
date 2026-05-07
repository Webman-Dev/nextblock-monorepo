import { EditCouponPage as EditCouponPageUI } from '@nextblock-cms/ecommerce/server';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isOnline = await verifyPackageOnline('ecommerce');
  if (!isOnline) {
    redirect('/cms/settings/packages');
  }

  return <EditCouponPageUI params={params} />;
}
