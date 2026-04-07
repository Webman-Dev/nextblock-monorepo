import { redirect } from 'next/navigation';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { ShippingPage as ShippingPageUI } from '@nextblock-cms/ecommerce/server';

export default async function ShippingPage() {
    const isOnline = await verifyPackageOnline('ecommerce');
    if (!isOnline) {
        redirect('/cms/settings/packages');
    }

    return <ShippingPageUI />;
}
