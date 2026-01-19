'use server';

import { createClient } from "@nextblock-cms/db/server"; 
// Adjusting import based on project structure. 
// Standard in this project seems to be creating client with cookies.
// I'll check how other server actions do it.
import { revalidatePath } from "next/cache";

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}

export interface ProfileUpdateData {
  full_name?: string;
  avatar_url?: string;
  website?: string;
  github_username?: string;
  phone?: string;
  billing_address?: BillingAddress;
}

export async function updateProfile(data: ProfileUpdateData) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating profile:', error);
    throw new Error('Failed to update profile');
  }

  revalidatePath('/profile'); // Optimistic revalidation
  return { success: true };
}

export async function validateCheckoutEligibility(userId: string) {
  const supabase = createClient();
  
  // Fetch profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('billing_address, github_username')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { ready: false, missingFields: ['profile_not_found'] };
  }

  const missingFields: string[] = [];

  // Check Billing Address
  if (!profile.billing_address) {
    missingFields.push('billing_address');
  } else {
    // Validate internal fields if needed (e.g. city, country)
    const ba = profile.billing_address as any; // Cast for checking properties
    if (!ba.line1 || !ba.city || !ba.country || !ba.postal_code) {
       missingFields.push('billing_address_incomplete');
    }
  }

  // Check GitHub Username - WARNING only
  // The user requirement says: "Conditional Check: Return a warning if github_username is missing (but don't fail the generic profile validation, only this specific checkout check)."
  // Wait, "validateCheckoutEligibility" implies a gate.
  // "Warning" implies it might still proceed or just warns the UI.
  // I will include it in a separate property if possible or just in missingFields but marked optional?
  // User said: "Return { ready: boolean, missingFields: string[] }"
  // But also: "Return a warning if github_username is missing (but don't fail the generic profile validation...)"
  
  // If strict validation depends on store policy (developer licenses require it), maybe we should return it as missing if it IS required contextually.
  // "For our specific store, we will enforce it during checkout." -> This implies it should be a hard block for `validateCheckoutEligibility`.
  
  if (!profile.github_username) {
    missingFields.push('github_username');
  }

  const ready = missingFields.length === 0;

  return { ready, missingFields };
}
