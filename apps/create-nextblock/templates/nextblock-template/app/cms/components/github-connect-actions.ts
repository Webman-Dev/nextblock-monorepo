'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@nextblock-cms/db/server';
import {
  startDeviceFlow,
  pollDeviceFlowOnce,
  installSyncWorkflow,
} from '../../../lib/updates/github-device';
import { markSyncWorkflowInstalled } from '../../../lib/updates/check-upstream';

const DEVICE_COOKIE = 'nb_gh_device';

/** ADMIN gate, mirroring the rest of the CMS server entry points. */
async function isAdmin(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  return !error && profile?.role === 'ADMIN';
}

export interface StartConnectResult {
  ok: boolean;
  userCode?: string;
  verificationUri?: string;
  interval?: number;
  expiresIn?: number;
  error?: string;
}

/** Begin the device flow; stash the device code in an httpOnly cookie for polling. */
export async function startGithubConnect(): Promise<StartConnectResult> {
  if (!(await isAdmin())) return { ok: false, error: 'Administrator role required.' };

  try {
    const flow = await startDeviceFlow();
    const store = await cookies();
    store.set(DEVICE_COOKIE, flow.deviceCode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/cms',
      maxAge: flow.expiresIn,
    });
    return {
      ok: true,
      userCode: flow.userCode,
      verificationUri: flow.verificationUri,
      interval: flow.interval,
      expiresIn: flow.expiresIn,
    };
  } catch (caught) {
    return { ok: false, error: caught instanceof Error ? caught.message : 'Could not start GitHub connect.' };
  }
}

export type PollConnectResult =
  | { status: 'installed'; htmlUrl?: string }
  | { status: 'pending'; slowDown?: boolean }
  | { status: 'error'; error: string };

/** Poll once; on authorization, install the workflow and clear the device cookie. */
export async function pollGithubConnect(): Promise<PollConnectResult> {
  if (!(await isAdmin())) return { status: 'error', error: 'Administrator role required.' };

  const store = await cookies();
  const deviceCode = store.get(DEVICE_COOKIE)?.value;
  if (!deviceCode) {
    return { status: 'error', error: 'Connect session expired — start again.' };
  }

  const poll = await pollDeviceFlowOnce(deviceCode);

  if (poll.status === 'pending') return { status: 'pending', slowDown: poll.slowDown };

  if (poll.status === 'authorized') {
    const install = await installSyncWorkflow(poll.token);
    store.delete({ name: DEVICE_COOKIE, path: '/cms' });
    if (install.ok) {
      // We just installed the workflow — flip the onboarding state now instead of waiting
      // for the throttled background poll / GitHub's registration lag.
      await markSyncWorkflowInstalled();
      revalidatePath('/cms', 'layout');
      return { status: 'installed', htmlUrl: install.htmlUrl };
    }
    return { status: 'error', error: install.error ?? 'Could not install the workflow.' };
  }

  // expired / denied / error — clear the session.
  store.delete({ name: DEVICE_COOKIE, path: '/cms' });
  if (poll.status === 'expired') return { status: 'error', error: 'Authorization timed out — start again.' };
  if (poll.status === 'denied') return { status: 'error', error: 'Authorization was declined.' };
  return { status: 'error', error: poll.error };
}
