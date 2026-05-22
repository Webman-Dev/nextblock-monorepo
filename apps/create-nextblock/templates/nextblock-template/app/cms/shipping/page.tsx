import { redirect } from 'next/navigation';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { ShippingPage as ShippingPageUI } from '@nextblock-cms/ecommerce/server';

export default async function ShippingPage({
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

    return <ShippingPageUI searchParams={resolvedSearchParams} />;
}
