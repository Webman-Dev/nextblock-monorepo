import 'katex/dist/katex.min.css';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import CmsClientLayout from "./CmsClientLayout";
import { verifyPackageOnline, createClient } from '@nextblock-cms/db/server';
import { evaluateTwoFactor, getStaffTwoFactorReminder } from '../../lib/auth/twoFactor';
import { maybeRefreshUpstreamStatus } from '../../lib/updates/check-upstream';
import type { SystemAlertItem } from './components/SystemAlertsBanner';

/**
 * Unresolved system alerts for the dashboard banner. Runs as the signed-in user, so the
 * system_alerts SELECT RLS policy returns rows only for ADMINs (WRITERs get an empty
 * list). Best-effort: any failure (e.g. the table not yet migrated) yields no banner.
 */
async function getUnresolvedSystemAlerts(): Promise<SystemAlertItem[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('system_alerts')
      .select('id, alert_type, title, message, metadata')
      .eq('is_resolved', false)
      .in('alert_type', ['merge_conflict', 'runtime_update_available'])
      .order('created_at', { ascending: false })
      .limit(20);
    if (error || !data) return [];
    return data.map((a) => ({
      id: a.id,
      alert_type: a.alert_type,
      title: a.title,
      message: a.message,
      metadata: (a.metadata ?? null) as Record<string, unknown> | null,
    }));
  } catch {
    return [];
  }
}

export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce any outstanding second factor before rendering the CMS. This guards
  // direct navigation to /cms/* with an aal1 (password-only) session.
  const twoFactor = await evaluateTwoFactor();
  if (twoFactor.status === 'totp_required' || twoFactor.status === 'email_required') {
    redirect('/two-factor?redirect_to=/cms/dashboard');
  }

  const [isEcommerceActive, isCortexAiActive, showTwoFactorReminder, systemAlerts] =
    await Promise.all([
      verifyPackageOnline('ecommerce'),
      verifyPackageOnline('cortex-ai'),
      getStaffTwoFactorReminder(),
      getUnresolvedSystemAlerts(),
    ]);

  // After the response, refresh upstream update/conflict status in the background
  // (throttled to ~6h, see maybeRefreshUpstreamStatus). This keeps the banner current
  // without a cron — so it works on Vercel Hobby (limited crons) and self-hosted alike.
  after(() => maybeRefreshUpstreamStatus());

  return (
    <CmsClientLayout
      isCortexAiActive={isCortexAiActive}
      isEcommerceActive={isEcommerceActive}
      showTwoFactorReminder={showTwoFactorReminder}
      systemAlerts={systemAlerts}
    >
      {children}
    </CmsClientLayout>
  );
}
