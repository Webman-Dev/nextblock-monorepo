import { redirect } from 'next/navigation';
import { createClient, verifyPackageOnline } from '@nextblock-cms/db/server';

import { isEmailConfigured } from '../../../lib/config/email-settings';
import {
  getStoreContactEmail,
  resolveSellerContactEmail,
} from '../../../lib/commerce/seller-contact';
import InquiriesClient, { type InquiryRow } from './InquiriesClient';

export const metadata = {
  title: 'Product Enquiries | NextBlock™ CMS',
};

// Enquiries arrive from the public site at any moment; a cached list would show an
// admin an empty inbox that isn't.
export const dynamic = 'force-dynamic';

const MAX_INQUIRIES = 200;

export default async function InquiriesPage() {
  const isOnline = await verifyPackageOnline('ecommerce');
  if (!isOnline) {
    redirect('/cms/settings/packages');
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/sign-in');
  }

  // RLS restricts SELECT to ADMIN, but redirecting is a better experience than an
  // empty list for a WRITER who followed a stale link.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const [{ data: rows }, storeContactEmail, resolvedFallback, smtpConfigured] =
    await Promise.all([
      supabase
        .from('product_inquiries')
        .select(
          'id, product_title, product_slug, sender_name, sender_email, message, email_delivered, is_resolved, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(MAX_INQUIRIES),
      getStoreContactEmail(),
      resolveSellerContactEmail(),
      isEmailConfigured().catch(() => false),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Product enquiries</h1>
        <p className="text-sm text-muted-foreground">
          Messages from visitors who wanted to buy something your store can&rsquo;t sell
          online yet.
        </p>
      </div>

      <InquiriesClient
        inquiries={(rows ?? []) as InquiryRow[]}
        storeContactEmail={storeContactEmail}
        resolvedFallback={{ email: resolvedFallback.email, source: resolvedFallback.source }}
        smtpConfigured={smtpConfigured}
      />
    </div>
  );
}
