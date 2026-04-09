import { createClient } from '@nextblock-cms/db/server';
import {
  CustomerAddressInput,
  CustomerAddressType,
  normalizeCustomerAddress,
} from './customer';

type UserAddressRow = {
  id: string;
  address_type: string;
  is_default: boolean | null;
  recipient_name: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country_code: string | null;
  updated_at: string | null;
};

type SupabaseLikeClient = any;

function mapAddressRow(address?: UserAddressRow | null): CustomerAddressInput | null {
  if (!address) {
    return null;
  }

  return normalizeCustomerAddress({
    recipient_name: address.recipient_name,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country_code: address.country_code,
  });
}

function pickDefaultAddress(
  addresses: UserAddressRow[] | null,
  addressType: CustomerAddressType
) {
  return (
    addresses?.find(
      (address) => address.address_type === addressType && address.is_default
    ) ??
    addresses?.find((address) => address.address_type === addressType) ??
    null
  );
}

async function setDefaultAddress(
  supabase: SupabaseLikeClient,
  userId: string,
  addressType: CustomerAddressType,
  address: CustomerAddressInput | null
) {
  const normalized = normalizeCustomerAddress(address);
  const { data: existingAddresses, error: fetchError } = await supabase
    .from('user_addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('address_type', addressType)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false });

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const primaryAddress = existingAddresses?.[0] ?? null;
  const extraAddressIds = (existingAddresses ?? []).slice(1).map((row: UserAddressRow) => row.id);

  if (!normalized) {
    if (existingAddresses?.length) {
      const idsToDelete = existingAddresses.map((row: UserAddressRow) => row.id);
      const { error: deleteError } = await supabase
        .from('user_addresses')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        throw new Error(deleteError.message);
      }
    }

    return;
  }

  const payload = {
    user_id: userId,
    address_type: addressType,
    is_default: true,
    recipient_name: normalized.recipient_name ?? null,
    line1: normalized.line1 ?? null,
    line2: normalized.line2 ?? null,
    city: normalized.city ?? null,
    state: normalized.state ?? null,
    postal_code: normalized.postal_code ?? null,
    country_code: normalized.country_code ?? null,
    updated_at: new Date().toISOString(),
  };

  if (primaryAddress) {
    const { error: updateError } = await supabase
      .from('user_addresses')
      .update(payload)
      .eq('id', primaryAddress.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { error: insertError } = await supabase.from('user_addresses').insert(payload);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  if (extraAddressIds.length) {
    const { error: cleanupError } = await supabase
      .from('user_addresses')
      .delete()
      .in('id', extraAddressIds);

    if (cleanupError) {
      throw new Error(cleanupError.message);
    }
  }
}

export async function getDefaultUserAddresses(
  userId: string,
  client?: SupabaseLikeClient
) {
  const supabase = client ?? createClient();

  const { data: addresses, error: addressesError } = await supabase
    .from('user_addresses')
    .select('*')
    .eq('user_id', userId)
    .in('address_type', ['billing', 'shipping'])
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false });

  if (addressesError) {
    throw new Error(addressesError.message);
  }

  const billingAddress =
    mapAddressRow(pickDefaultAddress(addresses ?? [], 'billing'));
  const shippingAddress = mapAddressRow(
    pickDefaultAddress(addresses ?? [], 'shipping')
  );

  return {
    billingAddress,
    shippingAddress,
  };
}

export async function upsertDefaultUserAddresses(input: {
  userId: string;
  billingAddress?: CustomerAddressInput | null;
  shippingAddress?: CustomerAddressInput | null;
  client?: SupabaseLikeClient;
}) {
  const supabase = input.client ?? createClient();

  await setDefaultAddress(
    supabase,
    input.userId,
    'billing',
    input.billingAddress ?? null
  );

  await setDefaultAddress(
    supabase,
    input.userId,
    'shipping',
    input.shippingAddress ?? null
  );
}
