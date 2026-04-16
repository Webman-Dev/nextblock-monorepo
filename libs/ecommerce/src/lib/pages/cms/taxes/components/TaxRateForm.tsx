'use client';

import { Button, Input, Label } from '@nextblock-cms/ui';
import { useMemo, useState } from 'react';

import { countries, normalizeCountryCode } from '../../../../countries';
import {
  countryUsesStructuredStates,
  getStatesForCountry,
  normalizeSubdivisionCode,
} from '../../../../states';
import type { TaxRate } from '../../../../types';
import { saveTaxRateAction } from '../actions';

interface TaxRateFormProps {
  initialData?: Partial<TaxRate>;
  submitLabel?: string;
  compact?: boolean;
}

export function TaxRateForm({
  initialData,
  submitLabel = 'Save tax rate',
  compact = false,
}: TaxRateFormProps) {
  const defaultCountryCode = normalizeCountryCode(initialData?.country_code) || 'US';
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [stateCode, setStateCode] = useState(
    normalizeSubdivisionCode(defaultCountryCode, initialData?.state_code) ||
      initialData?.state_code ||
      ''
  );

  const states = useMemo(() => getStatesForCountry(countryCode), [countryCode]);
  const usesStructuredStates = countryUsesStructuredStates(countryCode);

  return (
    <form action={saveTaxRateAction} className="space-y-4">
      {initialData?.id ? <input type="hidden" name="id" value={initialData.id} /> : null}

      <div className={compact ? 'grid gap-4 md:grid-cols-4' : 'grid gap-4 md:grid-cols-2 xl:grid-cols-4'}>
        <div className="space-y-2">
          <Label htmlFor={initialData?.id ? `country-${initialData.id}` : 'tax-rate-country'}>
            Country
          </Label>
          <select
            id={initialData?.id ? `country-${initialData.id}` : 'tax-rate-country'}
            name="country_code"
            value={countryCode}
            onChange={(event) => {
              const nextCountryCode = event.target.value;
              const nextStates = getStatesForCountry(nextCountryCode);

              setCountryCode(nextCountryCode);
              setStateCode(
                nextStates.some((state) => state.code === stateCode) ? stateCode : ''
              );
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={initialData?.id ? `state-${initialData.id}` : 'tax-rate-state'}>
            State / Province
          </Label>
          {usesStructuredStates ? (
            <select
              id={initialData?.id ? `state-${initialData.id}` : 'tax-rate-state'}
              name="state_code"
              value={stateCode}
              onChange={(event) => setStateCode(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Country-wide / federal</option>
              {states.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={initialData?.id ? `state-${initialData.id}` : 'tax-rate-state'}
              name="state_code"
              value={stateCode}
              onChange={(event) => setStateCode(event.target.value)}
              placeholder="Optional"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={initialData?.id ? `name-${initialData.id}` : 'tax-rate-name'}>
            Tax name
          </Label>
          <Input
            id={initialData?.id ? `name-${initialData.id}` : 'tax-rate-name'}
            name="tax_name"
            defaultValue={initialData?.tax_name || ''}
            placeholder="GST, PST, State Sales Tax"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={initialData?.id ? `rate-${initialData.id}` : 'tax-rate-rate'}>
            Rate (%)
          </Label>
          <Input
            id={initialData?.id ? `rate-${initialData.id}` : 'tax-rate-rate'}
            name="tax_rate"
            type="number"
            min="0"
            max="100"
            step="0.0001"
            defaultValue={
              typeof initialData?.tax_rate === 'number' ? initialData.tax_rate.toString() : ''
            }
            placeholder="5.0000"
            required
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size={compact ? 'sm' : 'default'}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
