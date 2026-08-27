'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@nextblock-cms/db/server';

import { STORE_CONTACT_SETTINGS_KEY } from '../../../lib/commerce/seller-contact';

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || profile.role !== 'ADMIN') throw new Error('Forbidden');
}

export interface InquiryActionState {
  success: boolean;
  message: string;
}

/**
 * Set where storefront enquiries are emailed. Stored in the public settings row — it is
 * a business address, not a credential — but never rendered to the storefront: the
 * public form posts a product id and the server resolves the recipient.
 */
export async function saveStoreContactEmail(
  _prevState: unknown,
  formData: FormData
): Promise<InquiryActionState> {
  try {
    await assertAdmin();

    const contactEmail = String(formData.get('contact_email') ?? '').trim();
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return { success: false, message: "That doesn't look like a valid email address." };
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key: STORE_CONTACT_SETTINGS_KEY, value: { contactEmail } });

    if (error) {
      console.error('Error saving store contact email:', error.message);
      return { success: false, message: 'Could not save the contact address.' };
    }

    revalidatePath('/cms/inquiries');
    return {
      success: true,
      message: contactEmail
        ? 'Enquiries will now be sent to that address.'
        : 'Cleared — enquiries will fall back to your invoice or support address.',
    };
  } catch (error) {
    console.error('saveStoreContactEmail failed:', error);
    return { success: false, message: 'You do not have permission to change this.' };
  }
}
