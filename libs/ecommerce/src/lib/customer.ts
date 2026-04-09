import type { CartItem } from './types';
import { normalizeCountryCode } from './countries';

export type CustomerAddressType = 'billing' | 'shipping';

export interface CustomerAddressInput {
  recipient_name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
}

export interface OrderCustomerDetails {
  email: string | null;
  name: string | null;
  phone: string | null;
  billing: CustomerAddressInput | null;
  shipping: CustomerAddressInput | null;
}

export interface CheckoutSessionInput {
  items: CartItem[];
  customerEmail?: string | null;
  customerPhone?: string | null;
  billingAddress: CustomerAddressInput;
  shippingAddress?: CustomerAddressInput | null;
  shippingMethodId?: string | null;
  userId?: string;
}

export interface CheckoutCustomerDefaults {
  isAuthenticated: boolean;
  email?: string | null;
  fullName?: string | null;
  phone?: string | null;
  billingAddress?: CustomerAddressInput | null;
  shippingAddress?: CustomerAddressInput | null;
}

export const emptyCustomerAddress = (): CustomerAddressInput => ({
  recipient_name: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country_code: 'CA',
});

function cleanString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeCustomerAddress(
  address?: CustomerAddressInput | null
): CustomerAddressInput | null {
  if (!address) {
    return null;
  }

  const normalized: CustomerAddressInput = {
    recipient_name: cleanString(address.recipient_name),
    line1: cleanString(address.line1),
    line2: cleanString(address.line2),
    city: cleanString(address.city),
    state: cleanString(address.state),
    postal_code: cleanString(address.postal_code),
    country_code: normalizeCountryCode(address.country_code),
  };

  const hasAnyValue = Object.values(normalized).some(Boolean);

  return hasAnyValue ? normalized : null;
}

export function isCustomerAddressComplete(address?: CustomerAddressInput | null) {
  const normalized = normalizeCustomerAddress(address);

  if (!normalized) {
    return false;
  }

  return Boolean(
    normalized.recipient_name &&
      normalized.line1 &&
      normalized.city &&
      normalized.postal_code &&
      normalized.country_code
  );
}

export function normalizeOrderCustomerDetails(input: {
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  billing?: CustomerAddressInput | null;
  shipping?: CustomerAddressInput | null;
}): OrderCustomerDetails {
  const billing = normalizeCustomerAddress(input.billing);
  const shipping = normalizeCustomerAddress(input.shipping);
  const email = cleanString(input.email)?.toLowerCase() ?? null;
  const phone = cleanString(input.phone);
  const name =
    cleanString(input.name) ??
    billing?.recipient_name ??
    shipping?.recipient_name ??
    null;

  return {
    email,
    name,
    phone,
    billing,
    shipping,
  };
}

export function addressesMatch(
  first?: CustomerAddressInput | null,
  second?: CustomerAddressInput | null
) {
  const normalizedFirst = normalizeCustomerAddress(first);
  const normalizedSecond = normalizeCustomerAddress(second);

  return JSON.stringify(normalizedFirst) === JSON.stringify(normalizedSecond);
}
