import { normalizeCountryCode } from './countries';

export interface CountrySubdivision {
  code: string;
  name: string;
}

const US_STATES: CountrySubdivision[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const CA_PROVINCES: CountrySubdivision[] = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

export const STATES_BY_COUNTRY: Record<string, CountrySubdivision[]> = {
  US: US_STATES,
  CA: CA_PROVINCES,
};

const SUBDIVISION_ALIAS_MAP: Record<string, Record<string, string>> = {
  US: {
    CALIFORNIA: 'CA',
    NEWYORK: 'NY',
    'NEW YORK': 'NY',
    DISTRICTOFCOLUMBIA: 'DC',
    'DISTRICT OF COLUMBIA': 'DC',
  },
  CA: {
    QUEBEC: 'QC',
    ONTARIO: 'ON',
    'BRITISH COLUMBIA': 'BC',
    BRITISHCOLUMBIA: 'BC',
    'NEWFOUNDLAND AND LABRADOR': 'NL',
    NEWFOUNDLANDANDLABRADOR: 'NL',
    'NORTHWEST TERRITORIES': 'NT',
    NORTHWESTTERRITORIES: 'NT',
    'PRINCE EDWARD ISLAND': 'PE',
    PRINCEEDWARDISLAND: 'PE',
  },
};

export function getStatesForCountry(countryCode?: string | null) {
  const normalizedCountry = normalizeCountryCode(countryCode);

  if (!normalizedCountry) {
    return [];
  }

  return STATES_BY_COUNTRY[normalizedCountry] ?? [];
}

export function countryUsesStructuredStates(countryCode?: string | null) {
  return getStatesForCountry(countryCode).length > 0;
}

export function normalizeSubdivisionCode(
  countryCode?: string | null,
  stateCodeOrName?: string | null
) {
  const normalizedCountry = normalizeCountryCode(countryCode);
  const normalizedState = stateCodeOrName?.trim();

  if (!normalizedCountry || !normalizedState) {
    return normalizedState || null;
  }

  const candidates = STATES_BY_COUNTRY[normalizedCountry];
  if (!candidates?.length) {
    return normalizedState.toUpperCase();
  }

  const upperValue = normalizedState.toUpperCase();
  const exactCode = candidates.find((entry) => entry.code === upperValue);
  if (exactCode) {
    return exactCode.code;
  }

  const exactName = candidates.find((entry) => entry.name.toUpperCase() === upperValue);
  if (exactName) {
    return exactName.code;
  }

  const compactValue = upperValue.replace(/\s+/g, '');
  const alias = SUBDIVISION_ALIAS_MAP[normalizedCountry]?.[upperValue]
    ?? SUBDIVISION_ALIAS_MAP[normalizedCountry]?.[compactValue];

  return alias ?? upperValue;
}

export function resolveSubdivisionName(
  countryCode?: string | null,
  stateCode?: string | null
) {
  const normalizedCountry = normalizeCountryCode(countryCode);
  const normalizedStateCode = normalizeSubdivisionCode(countryCode, stateCode);

  if (!normalizedCountry || !normalizedStateCode) {
    return stateCode ?? null;
  }

  const match = STATES_BY_COUNTRY[normalizedCountry]?.find(
    (entry) => entry.code === normalizedStateCode
  );

  return match?.name ?? normalizedStateCode;
}
