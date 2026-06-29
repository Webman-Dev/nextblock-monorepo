// app/cms/settings/registration/actions.ts
'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';
import {
  getSystemConfiguration,
  updateSystemConfiguration,
} from '../../../../lib/setup/system-config';

export async function getRegistrationSettings(): Promise<{ autoAcceptSignups: boolean }> {
  const config = await getSystemConfiguration();
  return { autoAcceptSignups: config.auto_accept_signups };
}

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to update settings.');
  }
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (error || !profile || profile.role !== 'ADMIN') {
    throw new Error('You do not have permission to perform this action.');
  }
}

export async function updateRegistrationSettings(formData: FormData) {
  await assertAdmin();

  const autoAcceptSignups =
    formData.get('autoAcceptSignups') === 'on' || formData.get('autoAcceptSignups') === 'true';

  await updateSystemConfiguration({ auto_accept_signups: autoAcceptSignups });

  revalidatePath('/cms/settings/registration');
  return { success: true as const, message: 'Registration settings saved.' };
}
