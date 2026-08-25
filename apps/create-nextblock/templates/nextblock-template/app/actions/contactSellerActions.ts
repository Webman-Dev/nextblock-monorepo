'use server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import { getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';

import { sendEmail } from './email';
import { resolveSellerContactEmail } from '../../lib/commerce/seller-contact';
import { verifyBotProtection } from '../../lib/botProtection/verify';

/**
 * Public "contact the seller" enquiry, shown in place of Add-to-Cart when the store
 * cannot take payment for a product.
 *
 * Two rules shape this module:
 *
 * 1. The recipient is resolved ENTIRELY server-side. The existing form-block action
 *    takes its recipient from a bound argument, which means the address travels in the
 *    client payload; doing that here would publish the shop owner's inbox on every
 *    product page and turn the store's SMTP credentials into an open relay.
 *
 * 2. The database row is the deliverable, not the email. A store with no payment keys
 *    very often has no SMTP either, so the enquiry is persisted FIRST and the
 *    notification attempted afterwards. A failed send downgrades to `email_delivered:
 *    false` — the visitor is still told their message got through, because it did.
 */

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_USER_AGENT_LENGTH = 500;

/** Per-IP submission cap. Deliberately generous — this is anti-flood, not anti-user. */
const THROTTLE_WINDOW_MINUTES = 10;
const THROTTLE_MAX_SUBMISSIONS = 5;

/**
 * Throttle bucket for a request whose origin cannot be determined. Deliberately a single
 * shared key: unattributable requests are throttled TOGETHER rather than exempted.
 *
 * This is the difference between this helper and the visually similar one in
 * app/actions/consent.ts. There, a null mask just means one audit row is less precise.
 * Here the value is load-bearing for a rate limit, so "I could not parse that" must
 * never be allowed to mean "no limit applies".
 */
const UNKNOWN_IP_BUCKET = 'unknown';

/**
 * Best available client address, preferring headers the platform sets over ones the
 * client can write.
 *
 * `x-forwarded-for` is a list the client can prepend to: on an appending proxy (nginx's
 * proxy_add_x_forwarded_for, the shape this repo's Dockerfile deploys) its LEFTMOST
 * entry is attacker-controlled, so keying a throttle on it lets one caller mint a fresh
 * bucket per request. `x-vercel-forwarded-for` and `x-real-ip` are overwritten by the
 * proxy on every request, so they are checked first.
 */
function firstHop(headerValue: string | null): string | null {
  const [first] = (headerValue ?? '').split(',');
  const trimmed = first?.trim() ?? '';
  return trimmed || null;
}

function resolveClientIp(requestHeaders: Headers): string | null {
  return (
    firstHop(requestHeaders.get('x-vercel-forwarded-for')) ??
    firstHop(requestHeaders.get('x-real-ip')) ??
    firstHop(requestHeaders.get('x-forwarded-for'))
  );
}

/** Reduce an address to a non-identifying prefix — never store a full IP. */
function maskIp(ip: string | null): string {
  if (!ip) return UNKNOWN_IP_BUCKET;
  if (ip.includes(':')) {
    const hextets = ip.split(':').filter(Boolean);
    return `${hextets.slice(0, 3).join(':')}::x`;
  }
  const octets = ip.split('.');
  if (octets.length === 4) {
    octets[3] = 'x';
    return octets.join('.');
  }
  return UNKNOWN_IP_BUCKET;
}

/** Everything below is visitor-controlled text landing in an HTML email body. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readField(formData: FormData, name: string, maxLength: number): string {
  const raw = formData.get(name);
  return typeof raw === 'string' ? raw.trim().slice(0, maxLength) : '';
}

function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export interface ContactSellerState {
  success: boolean;
  /** Translation key the client renders, with its own English fallback. */
  messageKey:
    | 'ecommerce.contact_seller_sent'
    | 'ecommerce.contact_seller_error'
    | 'ecommerce.contact_seller_throttled'
    | 'ecommerce.contact_seller_invalid'
    | '';
  /** Set only for captcha failures, which carry their own provider-specific text. */
  message?: string;
}

export async function submitProductInquiry(
  _prevState: unknown,
  formData: FormData
): Promise<ContactSellerState> {
  const verification = await verifyBotProtection(formData);
  if (!verification.ok) {
    // Fake a success for the honeypot so the bot learns nothing about the check.
    if (verification.reason === 'honeypot') {
      return { success: true, messageKey: 'ecommerce.contact_seller_sent' };
    }
    return { success: false, messageKey: '', message: verification.message };
  }

  const productId = readField(formData, 'product_id', 64);
  const senderName = readField(formData, 'name', MAX_NAME_LENGTH);
  const senderEmail = readField(formData, 'email', MAX_EMAIL_LENGTH);
  const message = readField(formData, 'message', MAX_MESSAGE_LENGTH);
  const locale = readField(formData, 'locale', 12) || null;

  if (!productId || !senderName || !senderEmail || !message || !isPlausibleEmail(senderEmail)) {
    return { success: false, messageKey: 'ecommerce.contact_seller_invalid' };
  }

  try {
    const supabase = getServiceRoleSupabaseClient();

    const requestHeaders = await headers();
    // Always a string, so the throttle below always runs. See UNKNOWN_IP_BUCKET.
    const ipMasked = maskIp(resolveClientIp(requestHeaders));
    const userAgent = requestHeaders.get('user-agent');

    const since = new Date(Date.now() - THROTTLE_WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await supabase
      .from('product_inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('ip_masked', ipMasked)
      .gte('created_at', since);

    if ((count ?? 0) >= THROTTLE_MAX_SUBMISSIONS) {
      return { success: false, messageKey: 'ecommerce.contact_seller_throttled' };
    }

    // Look the product up server-side: a client-supplied title would let anyone send
    // arbitrary text through the owner's own SMTP identity.
    const { data: product } = await supabase
      .from('products')
      .select('id, title, slug')
      .eq('id', productId)
      .maybeSingle();

    if (!product) {
      return { success: false, messageKey: 'ecommerce.contact_seller_invalid' };
    }

    const { data: inserted, error: insertError } = await supabase
      .from('product_inquiries')
      .insert({
        product_id: product.id,
        product_slug: product.slug,
        product_title: product.title,
        sender_name: senderName,
        sender_email: senderEmail,
        message,
        locale,
        ip_masked: ipMasked,
        user_agent: userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to record product inquiry:', insertError.message);
      return { success: false, messageKey: 'ecommerce.contact_seller_error' };
    }

    // The lead is safe from here on; notification is best-effort and runs after the
    // response. A bare floating promise would risk the serverless instance being frozen
    // before the SMTP round trip finishes.
    after(() =>
      notifySeller({
        inquiryId: inserted.id,
        productTitle: product.title,
        productSlug: product.slug,
        senderName,
        senderEmail,
        message,
      })
    );

    return { success: true, messageKey: 'ecommerce.contact_seller_sent' };
  } catch (error) {
    console.error('Product inquiry submission failed:', error);
    return { success: false, messageKey: 'ecommerce.contact_seller_error' };
  }
}

interface NotifyInput {
  inquiryId: string;
  productTitle: string;
  productSlug: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
}

/**
 * Best-effort owner notification. Never throws into the request path: an unconfigured
 * SMTP relay is an expected state for exactly the half-configured store this feature
 * exists for, and the enquiry is already stored.
 */
async function notifySeller(input: NotifyInput): Promise<void> {
  try {
    const { email: recipient, source } = await resolveSellerContactEmail();
    if (!recipient) {
      console.warn(
        `[product-inquiry] No seller contact address resolved; enquiry ${input.inquiryId} is stored but nobody was emailed. Set one at CMS → Payments.`
      );
      return;
    }

    const safeName = escapeHtml(input.senderName);
    const safeEmail = escapeHtml(input.senderEmail);
    const safeTitle = escapeHtml(input.productTitle);
    const safeMessage = escapeHtml(input.message).replace(/\n/g, '<br />');

    const html = `
    {{brand_header}}
    <h2>New purchase enquiry</h2>
    <p>Someone tried to buy <strong>${safeTitle}</strong> but online checkout isn't available for it yet.</p>
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
      <tbody>
        <tr><td style="padding: 8px;"><strong>Product</strong></td><td style="padding: 8px;">${safeTitle}</td></tr>
        <tr><td style="padding: 8px;"><strong>Name</strong></td><td style="padding: 8px;">${safeName}</td></tr>
        <tr><td style="padding: 8px;"><strong>Email</strong></td><td style="padding: 8px;">${safeEmail}</td></tr>
        <tr><td style="padding: 8px;"><strong>Message</strong></td><td style="padding: 8px;">${safeMessage}</td></tr>
      </tbody>
    </table>
    <p>Reply directly to this email to answer them.</p>
    `;

    const text = [
      'New purchase enquiry',
      '',
      `Product: ${input.productTitle}`,
      `Name: ${input.senderName}`,
      `Email: ${input.senderEmail}`,
      '',
      input.message,
    ].join('\n');

    await sendEmail({
      to: recipient,
      // Newlines in a header would let a caller inject extra headers (Bcc, …).
      subject: `Purchase enquiry: ${input.productTitle.replace(/[\r\n]+/g, ' ')}`,
      text,
      html,
      // Lets the owner just hit Reply; without it the mail appears to come from their
      // own SMTP identity with the visitor's address buried in the body.
      replyTo: input.senderEmail,
    });

    const supabase = getServiceRoleSupabaseClient();
    await supabase
      .from('product_inquiries')
      .update({ email_delivered: true })
      .eq('id', input.inquiryId);

    console.info(`[product-inquiry] Notified seller (${source}) about enquiry ${input.inquiryId}.`);
  } catch (error) {
    console.error(
      `[product-inquiry] Enquiry ${input.inquiryId} is stored but the notification failed:`,
      error
    );
  }
}
