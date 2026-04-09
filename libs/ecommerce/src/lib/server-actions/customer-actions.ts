'use server';

import { createClient } from "@nextblock-cms/db/server"; 
import { revalidatePath } from "next/cache";
import { CustomerAddressInput, normalizeCustomerAddress } from "../customer";
import { upsertDefaultUserAddresses } from "../customer-addresses";

export interface ProfileUpdateData {
  full_name?: string;
  avatar_url?: string;
  website?: string;
  github_username?: string;
  phone?: string;
  billing_address?: CustomerAddressInput | null;
  shipping_address?: CustomerAddressInput | null;
  use_billing_for_shipping?: boolean;
}

export async function updateProfile(data: ProfileUpdateData) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const profileData = {
    full_name: data.full_name || null,
    avatar_url: data.avatar_url || null,
    website: data.website || null,
    github_username: data.github_username || null,
    phone: data.phone || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }

  const billingAddress = normalizeCustomerAddress(data.billing_address);
  const shippingAddress = data.use_billing_for_shipping
    ? billingAddress
    : normalizeCustomerAddress(data.shipping_address);

  await upsertDefaultUserAddresses({
    userId: user.id,
    billingAddress,
    shippingAddress,
    client: supabase,
  });

  revalidatePath('/profile');
  revalidatePath('/checkout');
  return { success: true };
}

export async function validateCheckoutEligibility(userId: string) {
  const supabase = createClient();
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { ready: false, missingFields: ['profile_not_found'] };
  }

  const missingFields: string[] = [];

  if (!profile.full_name?.trim()) {
    missingFields.push('full_name');
  }

  const ready = missingFields.length === 0;

  return { ready, missingFields };
}
