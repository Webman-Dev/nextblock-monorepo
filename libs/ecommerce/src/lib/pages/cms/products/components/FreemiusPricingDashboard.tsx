'use client';

import { useTransition } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Input } from '@nextblock-cms/ui';
import { toast } from 'sonner';
import { updateFreemiusOverride } from '../actions';

interface FreemiusPricingData {
  id: string;
  license_quota: number;
  api_monthly_price: number | null;
  api_annual_price: number | null;
  api_lifetime_price: number | null;
  override_monthly_price: number | null;
  override_annual_price: number | null;
  override_lifetime_price: number | null;
  is_active: boolean;
}

interface FreemiusPlanData {
  id: string;
  name: string;
  title: string;
  freemius_pricing: FreemiusPricingData[];
}

interface FreemiusPricingDashboardProps {
  productId: string;
  freemiusProductId: string;
  plans: FreemiusPlanData[];
}

export function FreemiusPricingDashboard({ plans }: FreemiusPricingDashboardProps) {
  return (
    <div className="w-full">
      {plans && plans.length > 0 ? (
        <div className="space-y-8">
          {plans.map((plan) => (
            <div key={plan.id} className="w-full">
              {plans.length > 1 && (
                <h3 className="font-semibold text-lg text-slate-700 dark:text-slate-300 border-b pb-2 mb-4 mt-6">
                  {plan.title || plan.name}
                </h3>
              )}
              <div className={`${plans.length > 1 ? 'rounded-lg border' : 'rounded-b-lg border-x border-b'} overflow-x-auto dark:border-slate-700 bg-card`}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Licenses</TableHead>
                      <TableHead>API Monthly</TableHead>
                      <TableHead>Override Monthly</TableHead>
                      <TableHead>API Annual</TableHead>
                      <TableHead>Override Annual</TableHead>
                      <TableHead>API Lifetime</TableHead>
                      <TableHead>Override Lifetime</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.freemius_pricing && plan.freemius_pricing.length > 0 ? (
                      plan.freemius_pricing.map((pricing) => (
                        <PricingRow key={pricing.id} pricing={pricing} />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-slate-500 py-4">
                          No pricing configurations found for this plan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500">No Freemius plans synchronized yet.</p>
          <p className="text-xs mt-2 text-slate-400">Click the full synchronization button to import from Freemius.</p>
        </div>
      )}
    </div>
  );
}

function PricingRow({ pricing }: { pricing: FreemiusPricingData }) {
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (field: string, val: string) => {
    // If empty string, set null, otherwise parse Float
    const numericVal = val === '' ? null : parseFloat(val);
    if (val !== '' && Number.isNaN(numericVal)) return;

    startTransition(async () => {
      const { success, error } = await updateFreemiusOverride(pricing.id, { [field]: numericVal });
      if (success) {
        toast.success('Pricing override saved');
      } else {
        toast.error(error || 'Failed to update pricing');
      }
    });
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{pricing.license_quota || 'Unlimited'}</TableCell>
      
      {/* Monthly */}
      <TableCell className="text-slate-500">
        {pricing.api_monthly_price ? `$${pricing.api_monthly_price}` : '-'}
      </TableCell>
      <TableCell>
        <Input 
          type="number" 
          step="0.01"
          placeholder="Override..." 
          defaultValue={pricing.override_monthly_price || ''}
          onBlur={(e) => {
            if (e.target.value !== (pricing.override_monthly_price?.toString() || '')) {
                handleUpdate('override_monthly_price', e.target.value);
            }
          }}
          className="w-24 h-8"
          disabled={isPending}
        />
      </TableCell>

      {/* Annual */}
      <TableCell className="text-slate-500">
        {pricing.api_annual_price ? `$${pricing.api_annual_price}` : '-'}
      </TableCell>
      <TableCell>
        <Input 
          type="number" 
          step="0.01"
          placeholder="Override..." 
          defaultValue={pricing.override_annual_price || ''}
          onBlur={(e) => {
            if (e.target.value !== (pricing.override_annual_price?.toString() || '')) {
                handleUpdate('override_annual_price', e.target.value);
            }
          }}
          className="w-24 h-8"
          disabled={isPending}
        />
      </TableCell>

      {/* Lifetime */}
      <TableCell className="text-slate-500">
        {pricing.api_lifetime_price ? `$${pricing.api_lifetime_price}` : '-'}
      </TableCell>
      <TableCell>
        <Input 
          type="number" 
          step="0.01"
          placeholder="Override..." 
          defaultValue={pricing.override_lifetime_price || ''}
          onBlur={(e) => {
            if (e.target.value !== (pricing.override_lifetime_price?.toString() || '')) {
                handleUpdate('override_lifetime_price', e.target.value);
            }
          }}
          className="w-24 h-8"
          disabled={isPending}
        />
      </TableCell>
    </TableRow>
  );
}
