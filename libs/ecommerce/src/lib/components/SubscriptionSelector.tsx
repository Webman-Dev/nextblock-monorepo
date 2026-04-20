'use client';

import React, { useState, useEffect } from 'react';
import { Button, Skeleton } from '@nextblock-cms/ui';
import { useCart } from '../use-cart';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { getPublicFreemiusPricing } from '../pages/cms/products/actions';
import { Product, BillingCycle, ResolvedPlanWithPricing } from '../types';
import {
  formatPrice,
  majorUnitAmountToMinor,
  useTranslations,
} from '@nextblock-cms/utils';
import { useCurrency } from '../CurrencyProvider';
import { convertMinorUnitAmount } from '../currency';

interface SubscriptionSelectorProps {
  product: Product;
}

export const SubscriptionSelector = ({ product }: SubscriptionSelectorProps) => {
  const store = useCart((state) => state);
  const { t } = useTranslations();
  const { activeCurrencyCode, currencies, defaultCurrency } = useCurrency();
  const [plans, setPlans] = useState<ResolvedPlanWithPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('annual');
  // For simplicity, we just use the first plan and first pricing tier (1 license) by default.
  // A dual-engine setup could expand this to include plan & license selectors.

  useEffect(() => {
    async function loadPricing() {
      try {
        if (!product.id) return;
        const resolvedPlans = await getPublicFreemiusPricing(product.id);
        setPlans(resolvedPlans);
      } catch (err) {
        console.error('Failed to load pricing:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPricing();
  }, [product.id]);

  if (!store) {
    return <Skeleton className="h-14 w-full" />;
  }

  const { addItem } = store;

  // We find the first plan that has pricing, and the first pricing config
  const plan = plans[0];
  const pricing = plan?.pricing?.[0];

  const handleAddToCart = () => {
    let basePriceMinor = product.price;
    let planId = product.freemius_plan_id;
    
    if (pricing) {
        if (selectedCycle === 'monthly' && pricing.monthly_price != null) {
          basePriceMinor = majorUnitAmountToMinor(pricing.monthly_price, defaultCurrency.code);
        }
        if (selectedCycle === 'annual' && pricing.annual_price != null) {
          basePriceMinor = majorUnitAmountToMinor(pricing.annual_price, defaultCurrency.code);
        }
        if (selectedCycle === 'lifetime' && pricing.lifetime_price != null) {
          basePriceMinor = majorUnitAmountToMinor(pricing.lifetime_price, defaultCurrency.code);
        }
    }

    const allCurrencyPrices = currencies.reduce<Record<string, number>>((accumulator, currency) => {
      accumulator[currency.code] = convertMinorUnitAmount({
        amount: basePriceMinor,
        fromCurrencyCode: defaultCurrency.code,
        toCurrencyCode: currency.code,
        currencies,
        applyRounding: true,
      });
      return accumulator;
    }, {});
    const finalPrice = allCurrencyPrices[activeCurrencyCode] ?? basePriceMinor;
    
    // Fallbacks if logic is weird
    if (plan && plan.id) {
        planId = plan.id;
    }

    const { success, error } = addItem({
      id: product.id,
      product_id: product.id,
      title: product.title,
      price: finalPrice,
      prices: allCurrencyPrices,
      image_url: product.image_url,
      slug: product.slug,
      sku: product.sku,
      language_id: product.language_id,
      translation_group_id: product.translation_group_id,
      provider: 'freemius',
      billing_cycle: selectedCycle,
      freemius_product_id: product.freemius_product_id,
      freemius_plan_id: planId, // Overwrite if we got a real plan id
      currency_code: activeCurrencyCode,
    });

    if (success) {
      toast.success(t('ecommerce.added_to_cart_success', { item: product.title }));
    } else {
      toast.error(error || t('ecommerce.added_to_cart_error'));
    }
  };

  if (loading) {
     return <Skeleton className="h-32 w-full" />;
  }

  if (!plan || !pricing) {
     return (
        <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
            {t('ecommerce.pricing_unavailable')}
        </div>
     );
  }

  // Figure out what cycles are actually available
  const hasMonthly = pricing.monthly_price != null;
  const hasAnnual = pricing.annual_price != null;
  const hasLifetime = pricing.lifetime_price != null;

  // Default selection if current is invalid
  if (selectedCycle === 'annual' && !hasAnnual) {
      if (hasMonthly) setSelectedCycle('monthly');
      else if (hasLifetime) setSelectedCycle('lifetime');
  }

  let displayPriceMinor = product.price;
  if (selectedCycle === 'monthly' && pricing.monthly_price != null) {
    displayPriceMinor = convertMinorUnitAmount({
      amount: majorUnitAmountToMinor(pricing.monthly_price, defaultCurrency.code),
      fromCurrencyCode: defaultCurrency.code,
      toCurrencyCode: activeCurrencyCode,
      currencies,
      applyRounding: true,
    });
  }
  if (selectedCycle === 'annual' && pricing.annual_price != null) {
    displayPriceMinor = convertMinorUnitAmount({
      amount: majorUnitAmountToMinor(pricing.annual_price, defaultCurrency.code),
      fromCurrencyCode: defaultCurrency.code,
      toCurrencyCode: activeCurrencyCode,
      currencies,
      applyRounding: true,
    });
  }
  if (selectedCycle === 'lifetime' && pricing.lifetime_price != null) {
    displayPriceMinor = convertMinorUnitAmount({
      amount: majorUnitAmountToMinor(pricing.lifetime_price, defaultCurrency.code),
      fromCurrencyCode: defaultCurrency.code,
      toCurrencyCode: activeCurrencyCode,
      currencies,
      applyRounding: true,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Billing Cycle Toggle */}
      <div className="flex bg-secondary/30 p-1 rounded-lg w-full max-w-sm mx-auto shadow-inner">
        {hasMonthly && (
            <button
            onClick={() => setSelectedCycle('monthly')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                selectedCycle === 'monthly'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            >
            {t('ecommerce.monthly')}
            </button>
        )}
        {hasAnnual && (
            <button
            onClick={() => setSelectedCycle('annual')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                selectedCycle === 'annual'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            >
            {t('ecommerce.annual')}
            </button>
        )}
         {hasLifetime && (
            <button
            onClick={() => setSelectedCycle('lifetime')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                selectedCycle === 'lifetime'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            >
            {t('ecommerce.lifetime')}
            </button>
        )}
      </div>

      <div className="text-center">
          <span className="text-4xl font-bold text-primary">
            {formatPrice(displayPriceMinor, activeCurrencyCode)}
          </span>
          {selectedCycle !== 'lifetime' && (
              <span className="text-muted-foreground ml-2">/ {selectedCycle === 'annual' ? t('ecommerce.year') : t('ecommerce.month')}</span>
          )}
      </div>

      <Button onClick={handleAddToCart} className="w-full h-14 text-lg font-bold shadow-md transition-all hover:shadow-lg active:scale-[0.98]">
        <ShoppingCart className="mr-2 h-5 w-5" />
        {t('ecommerce.get_license')}
      </Button>
    </div>
  );
};
