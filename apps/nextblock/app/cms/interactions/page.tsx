import { redirect } from 'next/navigation';

/**
 * Reviews and comments are tabs of the unified Messages inbox now.
 *
 * Kept as a redirect rather than deleted: the "new interaction" notification email
 * builds a call-to-action link straight to this path, so old mail in an admin's inbox
 * must keep working.
 */
export default function InteractionsRedirect() {
  redirect('/cms/messages?source=review');
}
