import type { CartItem } from './types';
import { normalizeCountryCode } from './countries';
import { countryUsesStructuredStates, normalizeSubdivisionCode } from './states';

export type CustomerAddressType = 'billing' | 'shipping';

export interface CustomerAddressInput {
  company_name?: string | null;
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
  couponCode?: string | null;
  couponContextItems?: CartItem[];
  customerEmail?: string | null;
  customerPhone?: string | null;
  billingAddress: CustomerAddressInput;
  shippingAddress?: CustomerAddressInput | null;
  shippingMethodId?: string | null;
  currencyCode?: string | null;
  locale?: string | null;
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
  company_name: '',
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
    company_name: cleanString(address.company_name),
    recipient_name: cleanString(address.recipient_name),
    line1: cleanString(address.line1),
    line2: cleanString(address.line2),
    city: cleanString(address.city),
    postal_code: cleanString(address.postal_code),
    country_code: normalizeCountryCode(address.country_code),
  };
  normalized.state = normalizeSubdivisionCode(
    normalized.country_code,
    cleanString(address.state)
  );

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
      normalized.country_code &&
      (!countryUsesStructuredStates(normalized.country_code) || normalized.state)
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
