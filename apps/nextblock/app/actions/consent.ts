'use server';

import { headers } from 'next/headers';
import { getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';

/** Reduce an IP to a non-identifying form for the consent audit log. */
function maskIp(ip: string | null): string | null {
  if (!ip) return null;
  const first = ip.split(',')[0]?.trim();
  if (!first) return null;
  if (first.includes(':')) {
    // IPv6: keep the first three hextets, drop the rest.
    const hextets = first.split(':').filter(Boolean);
    return `${hextets.slice(0, 3).join(':')}::x`;
  }
  const octets = first.split('.');
  if (octets.length === 4) {
    octets[3] = 'x';
    return octets.join('.');
  }
  return null;
}

export interface ConsentLogInput {
  token: string;
  analytics: boolean;
  marketing: boolean;
}

/**
 * Record a consent decision for Law 25 / PIPEDA accountability. Best-effort:
 * failures never block the visitor's choice from taking effect client-side.
 */
export async function logConsentDecision(input: ConsentLogInput): Promise<{ ok: boolean }> {
  if (!input?.token) return { ok: false };
  try {
    const h = await headers();
    const ip = h.get('x-forwarded-for') ?? h.get('x-real-ip');
    const userAgent = h.get('user-agent');

    const supabase = getServiceRoleSupabaseClient();
    await supabase.from('privacy_consent_logs').insert({
      consent_token: input.token,
      categories: {
        necessary: true,
        analytics: Boolean(input.analytics),
        marketing: Boolean(input.marketing),
      },
      ip_masked: maskIp(ip),
      user_agent: userAgent ? userAgent.slice(0, 500) : null,
    });
    return { ok: true };
  } catch (error) {
    console.error('Failed to record consent decision:', error);
    return { ok: false };
  }
}
