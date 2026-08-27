import 'server-only';

import { getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';

import { describeSmtpError, resolveFromDomain, sendEmail } from '../../app/actions/email';
import { resolveEmailBranding } from '../email/branding';
import { resolveSellerContactEmail } from '../commerce/seller-contact';
import { usableEmail } from '../email/placeholder-address';
import { hasExplicitSiteUrl, isPubliclyRoutableSiteUrl, resolveSiteUrl } from '../site-url';
import { mintThreadToken } from './thread-token';

/**
 * The private-conversation lane, shared by product enquiries and contact-form
 * submissions.
 *
 * The governing rule: THE ROW IS THE DELIVERABLE, NOT THE EMAIL. `sendEmail` throws
 * when SMTP is unconfigured, and a store that has not finished its payment setup very
 * often has not finished its mail setup either. So every path here writes first and
 * notifies afterwards, and a failed send is recorded on the message rather than
 * surfaced to the visitor as a failure — because from their side it was not one.
 */

export type ThreadSource = 'product_inquiry' | 'contact_form';

/** Everything visitor-supplied is escaped before it reaches an HTML mail body. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Newlines in a header would let a caller inject extra headers (Bcc, …). */
export function sanitizeSubject(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Short, readable reference for one conversation, e.g. `NRH-K3M9QX`.
 *
 * Every thread from a given form otherwise produces a byte-identical subject, with three
 * consequences, all bad:
 *
 *  - Exchange derives its ConversationTopic from the SUBJECT, not from References, so
 *    every enquiry the site ever receives collapses into one conversation. Separating the
 *    References headers was necessary but not sufficient.
 *  - Anything applied to that conversation — Ignore Conversation, a rule, a filter —
 *    silently applies to every future enquiry. A real install lost replies exactly this
 *    way: SMTP accepted them, Outlook routed them to Deleted Items, nothing reported it.
 *  - The subject told the owner nothing about who had written.
 *
 * Base36 of the first 32 bits of the thread id, folded into six characters — about 2.2
 * billion distinct references, which is not a collision risk for one site's inbox — and
 * uppercased so it reads as a ticket number people can quote back rather than a hex dump.
 */
export function threadReference(threadId: string, siteName?: string): string {
  const hex = threadId.replace(/-/g, '').slice(0, 8);
  const parsed = Number.parseInt(hex, 16);
  const code = Number.isNaN(parsed)
    ? '000000'
    : (parsed % 2_176_782_336).toString(36).toUpperCase().padStart(6, '0');

  const prefix = sitePrefix(siteName);
  return prefix ? `${prefix}-${code}` : code;
}

/** "New Roots Herbal" -> "NRH"; a single-word name -> its first three letters. */
function sitePrefix(siteName?: string): string {
  const words = (siteName ?? '')
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, ''))
    .filter(Boolean);

  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 4)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export interface FormEndpoint {
  form_key: string;
  label: string;
  recipient_email: string | null;
  fields: Array<{ temp_id?: string; label?: string; field_type?: string }>;
}

/**
 * Load a contact form's server-side manifest.
 *
 * This is what replaced `recipient_email` living in the block's content. The browser
 * now posts only `form_key`, which grants nothing; the address and the field labels are
 * read here, so neither can be forged by editing the request.
 */
export async function getFormEndpoint(formKey: string): Promise<FormEndpoint | null> {
  try {
    const supabase = getServiceRoleSupabaseClient();
    const { data } = await supabase
      .from('form_endpoints')
      .select('form_key, label, recipient_email, fields')
      .eq('form_key', formKey)
      .maybeSingle();
    if (!data) return null;
    return {
      form_key: data.form_key,
      label: data.label,
      recipient_email: data.recipient_email,
      fields: Array.isArray(data.fields) ? (data.fields as FormEndpoint['fields']) : [],
    };
  } catch {
    return null;
  }
}

/**
 * Who a contact-form submission should reach. Per-form address first, then the
 * site-wide forms address, then the same ladder product enquiries use — so an install
 * that configured any one of them is reachable.
 */
export async function resolveFormRecipient(endpoint: FormEndpoint | null): Promise<string | null> {
  // The sandbox is wiped and re-seeded on a schedule, so anything stored there is
  // dummy data by construction.
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    const sandbox = process.env['SANDBOX_CONTACT_EMAIL']?.trim();
    if (sandbox) return sandbox;
  }

  // A seeded contact@example.com is not a destination, it is a placeholder that survived
  // setup. Fall past it rather than handing the transport an address that can never
  // deliver — the CMS raises a reminder about it separately.
  const perForm = usableEmail(endpoint?.recipient_email);
  if (perForm) return perForm;

  try {
    const supabase = getServiceRoleSupabaseClient();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'forms_contact')
      .maybeSingle();
    const value = data?.value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const configured = usableEmail(
        (value as Record<string, unknown>)['contactEmail'] as string | undefined
      );
      if (configured) return configured;
    }
  } catch {
    /* fall through */
  }

  const { email } = await resolveSellerContactEmail();
  return email;
}

export interface CreateThreadInput {
  source: ThreadSource;
  /** product_inquiries.id for an enquiry. */
  subjectId?: string | null;
  formKey?: string | null;
  subjectLabel: string;
  senderName: string | null;
  senderEmail: string | null;
  message: string;
  locale?: string | null;
  /** Submitted field map for a contact form: {temp_id: value}. */
  fields?: Record<string, string>;
  ipMasked?: string | null;
  userAgent?: string | null;
}

export interface CreatedThread {
  threadId: string;
  messageId: string;
}

/**
 * Open a conversation and record its first inbound turn. Returns null only if the write
 * itself failed — the caller should then tell the visitor something went wrong, because
 * at that point nothing was kept anywhere.
 */
export async function createThread(input: CreateThreadInput): Promise<CreatedThread | null> {
  try {
    const supabase = getServiceRoleSupabaseClient();

    const { data: thread, error: threadError } = await supabase
      .from('message_threads')
      .insert({
        source: input.source,
        subject_id: input.subjectId ?? null,
        form_key: input.formKey ?? null,
        subject_label: input.subjectLabel,
        sender_name: input.senderName,
        sender_email: input.senderEmail,
        locale: input.locale ?? null,
        fields: input.fields ?? {},
        ip_masked: input.ipMasked ?? null,
        user_agent: input.userAgent ?? null,
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (threadError || !thread) {
      console.error('[messages] Could not open thread:', threadError?.message);
      return null;
    }

    const { data: message, error: messageError } = await supabase
      .from('thread_messages')
      .insert({
        thread_id: thread.id,
        direction: 'inbound',
        body: input.message,
        author_name: input.senderName,
        ip_masked: input.ipMasked ?? null,
      })
      .select('id')
      .single();

    if (messageError || !message) {
      console.error('[messages] Thread opened but first message failed:', messageError?.message);
      return null;
    }

    return { threadId: thread.id, messageId: message.id };
  } catch (error) {
    console.error('[messages] createThread failed:', error);
    return null;
  }
}

/** Mark a message delivered, or record why it was not. Never throws. */
async function recordDelivery(messageId: string, delivered: boolean, error?: string): Promise<void> {
  try {
    const supabase = getServiceRoleSupabaseClient();
    await supabase
      .from('thread_messages')
      .update({ email_delivered: delivered, email_error: error ?? null })
      .eq('id', messageId);
  } catch {
    /* bookkeeping only */
  }
}

export interface NotifyAdminInput {
  threadId: string;
  /** Shapes the subject: an enquiry names the product, a form names the site. */
  source?: ThreadSource;
  messageId: string;
  subjectLabel: string;
  senderName: string | null;
  senderEmail: string | null;
  message: string;
  recipient: string | null;
  /** Rendered as a labelled table above the message body (contact forms). */
  extraFields?: Array<{ label: string; value: string }>;
}

/**
 * Tell the store owner a message arrived. Best-effort by design: the thread is already
 * stored, and the CMS inbox is the source of truth.
 */
export async function notifyAdminOfMessage(input: NotifyAdminInput): Promise<void> {
  if (!input.recipient) {
    console.warn(
      `[messages] No recipient resolved; thread ${input.threadId} is stored but nobody was emailed. Set an address at CMS → Messages.`
    );
    await recordDelivery(input.messageId, false, 'no recipient configured');
    return;
  }

  const siteUrl = resolveSiteUrl();
  const { siteName } = await resolveEmailBranding();
  const who = input.senderName || 'Someone';
  const reference = threadReference(input.threadId, siteName);
  const safeName = escapeHtml(who);
  const safeSubject = escapeHtml(input.subjectLabel);
  const safeBody = escapeHtml(input.message).replace(/\n/g, '<br />');

  const fieldRows = (input.extraFields ?? [])
    .map(
      (field) =>
        `<tr><td style="padding: 8px;"><strong>${escapeHtml(field.label)}</strong></td><td style="padding: 8px;">${escapeHtml(field.value)}</td></tr>`
    )
    .join('');

  const html = `
    {{brand_header}}
    <h2>New message: ${safeSubject}</h2>
    <p><strong>${safeName}</strong>${input.senderEmail ? ` (${escapeHtml(input.senderEmail)})` : ''} sent you a message through your website.</p>
    ${fieldRows ? `<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;"><tbody>${fieldRows}</tbody></table>` : ''}
    <blockquote style="border-left: 3px solid #ddd; margin: 16px 0; padding-left: 12px;">${safeBody}</blockquote>
    <p><a href="${siteUrl}/cms/messages?thread=${input.threadId}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">Read and reply in your CMS</a></p>
    <p style="font-size:12px;color:#666;">Reply from the CMS rather than this email — that is what reaches the sender.</p>
  `;

  const text = [
    `New message: ${input.subjectLabel}`,
    '',
    `From: ${input.senderName || 'Someone'}${input.senderEmail ? ` <${input.senderEmail}>` : ''}`,
    ...(input.extraFields ?? []).map((field) => `${field.label}: ${field.value}`),
    '',
    input.message,
    '',
    `Read and reply: ${siteUrl}/cms/messages?thread=${input.threadId}`,
  ].join('\n');

  try {
    // The OWNER's side of this conversation, kept deliberately distinct from the
    // visitor's root below. They are two different exchanges with two different people,
    // and a shared root makes a mail client fold them into one — which, when the owner
    // is also testing as the visitor, looks exactly like the reply never arrived.
    const adminRoot = `<nb-thread-${input.threadId}-admin@${await resolveFromDomain()}>`;

    await sendEmail({
      to: input.recipient,
      // Leads with WHO wrote — the single most useful thing in an inbox listing — and
      // says what about, so the owner can triage without opening it.
      subject: sanitizeSubject(
        input.source === 'product_inquiry'
          ? `${who} asked about ${input.subjectLabel} [${reference}]`
          : `${who} sent you a message [${reference}]`
      ),
      text,
      html,
      // Groups every notification about one conversation in the owner's mail client.
      inReplyTo: adminRoot,
      references: adminRoot,
      // The owner should answer in the CMS (that is what reaches the visitor), but a
      // reply-to that goes somewhere real beats one that bounces off the SMTP identity.
      ...(input.senderEmail ? { replyTo: input.senderEmail } : {}),
    });
    await recordDelivery(input.messageId, true);
  } catch (error) {
    const reason = describeSmtpError(error);
    // Log the ORIGINAL alongside the friendly text. Replacing it in the log too would
    // throw away the only detail that makes an obscure transport failure diagnosable.
    console.error(
      `[messages] Thread ${input.threadId} stored but notification failed: ${reason}`,
      error
    );
    await recordDelivery(input.messageId, false, reason.slice(0, 500));
  }
}

export interface ThreadNoticeInput {
  threadId: string;
  source?: ThreadSource;
  /** Used to greet the visitor by name when the form captured one. */
  senderName?: string | null;
  messageId: string;
  subjectLabel: string;
  senderEmail: string | null;
  body: string;
  /** Plaintext token. Present only when one was just minted for this send. */
  token: string | null;
  /** Existing hash when the thread already had a live token. */
  hasExistingToken: boolean;
}

/**
 * Tell the visitor the store replied.
 *
 * A NOTE ON WORDING. This message previously ended with "This link is personal to you —
 * please don't forward it." The intent was sound (the link is a credential) but the
 * phrasing is close to a literal template for credential phishing: a secret one-off link,
 * a prominent call-to-action button, and an instruction not to share it. Microsoft
 * Defender purged real messages from the mailbox AFTER delivering them — ZAP, which
 * leaves no bounce and no SMTP error, so every log upstream reports success.
 *
 * The security property is kept by the token itself, which rotates on every reply, rather
 * than by asking the recipient to keep a secret. The closing line is now the ordinary
 * transactional one that anti-abuse systems expect to see.
 *
 * A NOTE ON THE LINK. It is a styled button, with the destination URL also shown as
 * plain text beneath it.
 *
 * Controlled tests against one Microsoft 365 tenant briefly suggested that concealing the
 * destination was what got a message purged after delivery — a body showing its own URL
 * survived where the same body behind a "Read and reply" button did not. Further testing
 * with the real notice contradicted that: it was removed either way. The tenant appears
 * to act on the overall shape of this message, and no rendering tested reliably survived
 * it.
 *
 * So the button is kept, because the plainer version bought nothing, and the visible URL
 * is kept alongside it, because showing a destination is good practice regardless and
 * helps any client that strips styling. Where a recipient's filtering removes the mail
 * anyway, the answer is `createVisitorLink` — the admin copies the link and sends it by a
 * channel that works. Delivery is best-effort by design; the stored thread is the record.
 */
export async function sendThreadNotice(input: ThreadNoticeInput): Promise<void> {
  if (!input.senderEmail) {
    await recordDelivery(input.messageId, false, 'sender left no email address');
    return;
  }

  if (!input.token && !input.hasExistingToken) {
    await recordDelivery(input.messageId, false, 'no thread link available');
    return;
  }

  const siteUrl = resolveSiteUrl();
  const { siteName } = await resolveEmailBranding();
  const reference = threadReference(input.threadId, siteName);

  // The entire message is a link to the conversation, so where that link points is
  // load-bearing. Two cases, and only one of them is a mistake:
  //
  //   - Nothing configured. resolveSiteUrl() invents http://localhost:3000, and a link
  //     to it goes out to a real customer: a dead button, and — a non-routable host
  //     under plain http beside a long opaque token — something mail filters treat as
  //     phishing and drop without a bounce. Refuse; nobody chose this.
  //   - Deliberately set to a local address. That is how you test the round trip on your
  //     own machine, where the link works fine. Send it, and note it in the log.
  if (!isPubliclyRoutableSiteUrl(siteUrl) && !hasExplicitSiteUrl()) {
    const reason = `Your site has no address configured, so the reply link would point at "${siteUrl}" and would not work for the recipient. Set NEXT_PUBLIC_URL — to your public site URL, or to your local address if you are testing on this machine — and send again.`;
    console.error(`[messages] Refusing to send a thread link pointing at the unconfigured default ${siteUrl}.`);
    await recordDelivery(input.messageId, false, reason);
    return;
  }

  if (!isPubliclyRoutableSiteUrl(siteUrl)) {
    console.warn(
      `[messages] Sending a thread link to ${siteUrl}. It will only open on a machine that can reach that address — fine for local testing, wrong for a real customer.`
    );
  }

  // The VISITOR's root. Distinct from the owner-notification root by design: see the
  // note in notifyAdminOfMessage. Every notice to this visitor about this conversation
  // shares it, which is what makes the "Re:" subject legitimate rather than a
  // forged-reply signal and groups the exchange in their client.
  const threadRoot = `<nb-thread-${input.threadId}-visitor@${await resolveFromDomain()}>`;
  const preview = input.body.length > 300 ? `${input.body.slice(0, 300)}…` : input.body;
  const safePreview = escapeHtml(preview).replace(/\n/g, '<br />');
  const safeSubject = escapeHtml(input.subjectLabel);
  // Address the person by name when the form captured one; a bare "Hello" beats
  // "Hi undefined," or guessing at a first name.
  const greeting = input.senderName ? `Hi ${input.senderName},` : 'Hello,';
  const safeGreeting = escapeHtml(greeting);
  const safeSiteName = escapeHtml(siteName);

  // Always a tokenised link. `ensureThreadToken` now rotates, so `token` is present on
  // every send; the bare `/thread` fallback remains only for the impossible case, and it
  // is honest about being useless to anyone without the cookie.
  const link = input.token ? `${siteUrl}/thread/${input.token}` : `${siteUrl}/thread`;

  const html = `
    {{brand_header}}
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2328;font-size:16px;line-height:1.55;">
      <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Reply from ${safeSiteName}</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;color:#111827;">${safeGreeting}</h1>
      <p style="margin:0 0 20px;color:#374151;">You got in touch about <strong style="color:#111827;">${safeSubject}</strong>. Here is our reply:</p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
        <tr>
          <td style="background:#f6f8fa;border-left:4px solid #111827;border-radius:0 8px 8px 0;padding:16px 18px;color:#1f2328;">${safePreview}</td>
        </tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">
        <tr>
          <td style="border-radius:8px;background:#111827;">
            <a href="${link}" style="display:inline-block;padding:13px 26px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Read &amp; reply</a>
          </td>
        </tr>
      </table>

      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">The whole conversation is on that page, and you can answer straight from it.</p>

      <hr style="border:0;border-top:1px solid #e5e7eb;margin:0 0 16px;" />

      <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#9ca3af;">Button not working? Paste this into your browser:<br /><span style="word-break:break-all;color:#6b7280;">${link}</span></p>
      <p style="margin:0;font-size:12px;color:#9ca3af;">If you didn't contact ${safeSiteName}, you can safely ignore this email.</p>
    </div>
  `;

  const text = [
    greeting,
    '',
    `You got in touch with ${siteName} about "${input.subjectLabel}". Here is our reply:`,
    '',
    preview,
    '',
    'Read the whole conversation and reply here:',
    link,
    '',
    `If you didn't contact ${siteName}, you can safely ignore this email.`,
  ].join('\n');

  try {
    // Recorded verbatim below. When a message is accepted by every hop and still never
    // arrives, the subject and recipient that actually went out are the first things
    // anyone needs — and reconstructing them after the fact is guesswork.
    //
    // Deliberately NOT "Re:". The visitor's message was never an email, so a bare reply
    // prefix is both a spam heuristic and a small lie; naming the site is what actually
    // tells them who is writing.
    const subject = sanitizeSubject(
      input.source === 'product_inquiry'
        ? `${siteName} replied about ${input.subjectLabel} [${reference}]`
        : `${siteName} replied to your message [${reference}]`
    );

    // Reply-To is the store, not the no-reply identity the message is sent as.
    //
    // A visitor who hits Reply in their mail client is doing the most natural thing
    // available to them; without this it goes to donotreply@ and is never seen. The
    // thread page is still the better channel — it keeps the conversation in one place —
    // but "click this link or nothing" is a poor contract to offer someone.
    const { email: replyTo } = await resolveSellerContactEmail();

    await sendEmail({
      to: input.senderEmail,
      subject,
      text,
      html,
      inReplyTo: threadRoot,
      references: threadRoot,
      ...(replyTo ? { replyTo } : {}),
    });

    console.info(
      `[messages] Reply on thread ${input.threadId} handed to SMTP — to="${input.senderEmail}" replyTo="${replyTo ?? 'none'}" subject="${subject}" link=${input.token ? 'tokenised' : 'generic'}`
    );
    await recordDelivery(input.messageId, true);
  } catch (error) {
    const reason = describeSmtpError(error);
    console.error(
      `[messages] Reply on thread ${input.threadId} stored but not delivered: ${reason}`,
      error
    );
    await recordDelivery(input.messageId, false, reason.slice(0, 500));
  }
}

/**
 * Ensure a thread has a live visitor link, minting one on first use.
 *
 * Returns the plaintext token ONLY when it was just created — that is the single moment
 * it can be put in an email, and afterwards only its hash exists.
 */
export async function ensureThreadToken(
  threadId: string
): Promise<{ token: string | null; hasExistingToken: boolean }> {
  const supabase = getServiceRoleSupabaseClient();

  // ROTATES on every reply, deliberately.
  //
  // Only the hash is stored, so once a token exists its plaintext is gone — and an
  // earlier version returned `{ token: null }` in that case, which made every reply after
  // the first mail a bare `/thread` link. That link works only for someone who still
  // holds the cookie, i.e. never for the visitor reading their email on another device.
  //
  // Minting fresh each time is what guarantees a working link in every message. The cost
  // is that the previous link stops working, which is a reasonable property for a
  // credential mailed in the clear: one live link per conversation at a time.
  const now = new Date();
  const minted = mintThreadToken(now);
  const { error } = await supabase
    .from('message_threads')
    .update({
      token_hash: minted.tokenHash,
      token_expires_at: minted.expiresAt,
      token_revoked_at: null,
    })
    .eq('id', threadId);

  if (error) {
    console.error('[messages] Could not mint a thread token:', error.message);
    return { token: null, hasExistingToken: false };
  }

  return { token: minted.token, hasExistingToken: false };
}
