'use client';

import { useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nextblock-cms/ui';
import { Truck, Calculator, Loader2 } from 'lucide-react';
import { countries } from '../countries';
import { getShippingEstimates } from '../server-actions/shipping-actions';
import { ResolvedShippingMethod } from '../shipping/resolver';
import { useTranslations } from '@nextblock-cms/utils';

interface ShippingEstimatorProps {
  cartTotal: number;
}

export const ShippingEstimator = ({ cartTotal }: ShippingEstimatorProps) => {
  const [country, setCountry] = useState('CA');
  const [postalCode, setPostalCode] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [rates, setRates] = useState<ResolvedShippingMethod[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslations();

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);
    setRates(null);

    const result = await getShippingEstimates(cartTotal, {
      country,
      postal_code: postalCode,
    });

    if (result.success && result.methods) {
      setRates(result.methods);
    } else {
      setError(result.error || 'No shipping methods available for this destination.');
    }
    setIsCalculating(false);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4 mt-6">
      <div className="flex items-center gap-2 font-semibold text-sm">
        <Truck className="h-4 w-4" />
        <span>{t('ecommerce.estimate_shipping')}</span>
      </div>

      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="estimate-country" className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('ecommerce.country')}
          </Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger id="estimate-country" className="h-9 text-sm bg-background">
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c: { code: string; name: string }) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="estimate-postal" className="text-xs uppercase tracking-wider text-muted-foreground">
            {t('ecommerce.postal_code')}
          </Label>
          <div className="flex gap-2">
            <Input
              id="estimate-postal"
              placeholder="A1A 1A1"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="h-9 text-sm bg-background"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCalculate}
              disabled={isCalculating}
              className="shrink-0"
            >
              {isCalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4 mr-1.5" />}
              {t('ecommerce.calculate')}
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-destructive mt-2">{error}</p>}

      {rates && rates.length > 0 && (
        <div className="mt-4 space-y-2 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">{t('ecommerce.available_rates')}:</p>
          {rates.map((rate) => (
            <div key={rate.id} className="flex justify-between items-center p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{rate.name}</span>
              </div>
              <span className="text-sm font-bold">
                {rate.amount === 0 ? t('ecommerce.free') : `$${(rate.amount / 100).toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {rates && rates.length === 0 && !error && (
        <p className="text-xs text-muted-foreground mt-2 italic">{t('ecommerce.no_rates_found')}</p>
      )}
    </div>
  );
};
