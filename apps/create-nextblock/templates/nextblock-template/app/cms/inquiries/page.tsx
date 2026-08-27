import { redirect } from 'next/navigation';

/**
 * Product enquiries are a tab of the unified Messages inbox now.
 *
 * Kept as a redirect rather than deleted: this path was linked from the CMS nav and may
 * still be bookmarked, and any stale client bundle will keep routing here until it
 * reloads.
 */
export default function InquiriesRedirect() {
  redirect('/cms/messages?source=product_inquiry');
}
