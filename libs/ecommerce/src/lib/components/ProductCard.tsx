'use client';

import { Product } from '../types';
import { AddToCartButton } from './AddToCartButton';
import { cn, formatPrice, majorUnitAmountToMinor, useTranslations } from '@nextblock-cms/utils';
import Link from 'next/link';
import { useCurrency } from '../CurrencyProvider';
import {
  resolvePriceForCurrency,
  resolvePriceRangeForCurrency,
} from '../currency';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export const ProductCard = ({ product, className }: ProductCardProps) => {
  const { activeCurrencyCode, currencies } = useCurrency();
  const variantRange = resolvePriceRangeForCurrency({
    entries:
      product.variants?.length
        ? product.variants
        : product.product_variants?.length
          ? product.product_variants
          : [],
    currencyCode: activeCurrencyCode,
    currencies,
  });
  const hasVariantPriceRange = Boolean(product.has_variants && variantRange);
  const resolvedPrice = resolvePriceForCurrency({
    prices: product.prices,
    salePrices: product.sale_prices,
    fallbackPrice: product.price,
    fallbackSalePrice: product.sale_price,
    currencyCode: activeCurrencyCode,
    currencies,
  });
  const priceLabel =
    hasVariantPriceRange && variantRange
      ? variantRange.min === variantRange.max
        ? formatPrice(variantRange.min, activeCurrencyCode)
        : `${formatPrice(variantRange.min, activeCurrencyCode)} - ${formatPrice(
            variantRange.max,
            activeCurrencyCode
          )}`
      : formatPrice(resolvedPrice.sale_price ?? resolvedPrice.price, activeCurrencyCode);

  const { t } = useTranslations();

  // Freemius pricing resolution
  const firstPlan = product.freemius_plans?.[0];
  const firstPricing = firstPlan?.freemius_pricing?.[0];
  const defaultCurrencyCode =
    currencies.find((c) => c.is_default)?.code || 'USD';

  const monthlyPriceMajor =
    firstPricing?.override_monthly_price ?? firstPricing?.api_monthly_price;
  const annualPriceMajor =
    firstPricing?.override_annual_price ?? firstPricing?.api_annual_price;

  const monthlyPriceResolved =
    typeof monthlyPriceMajor === 'number'
      ? resolvePriceForCurrency({
          prices: {
            [defaultCurrencyCode]: majorUnitAmountToMinor(
              monthlyPriceMajor,
              defaultCurrencyCode
            ),
          },
          currencyCode: activeCurrencyCode,
          currencies,
        })
      : null;

  const annualPriceResolved =
    typeof annualPriceMajor === 'number'
      ? resolvePriceForCurrency({
          prices: {
            [defaultCurrencyCode]: majorUnitAmountToMinor(
              annualPriceMajor,
              defaultCurrencyCode
            ),
          },
          currencyCode: activeCurrencyCode,
          currencies,
        })
      : null;

  return (
    <div className={cn("group relative flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:shadow-md", className)}>
      <Link href={`/product/${product.slug}`} className="relative aspect-square overflow-hidden bg-neutral-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
             No Image
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/product/${product.slug}`} className="mb-2">
           <h3 className="line-clamp-1 text-lg font-medium text-foreground group-hover:underline">
             {product.title}
           </h3>
        </Link>
        
        <div className="mb-4">
          {product.product_type === 'digital' && (monthlyPriceResolved || annualPriceResolved) ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {monthlyPriceResolved && (
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xl font-bold text-primary">
                    {formatPrice(monthlyPriceResolved.price, activeCurrencyCode)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground lowercase">
                    {t('ecommerce.mo')}
                  </span>
                </div>
              )}
              {annualPriceResolved && (
                <div className="flex items-baseline gap-0.5">
                  <span className={cn("font-bold text-primary", monthlyPriceResolved ? "text-lg" : "text-xl")}>
                    {formatPrice(annualPriceResolved.price, activeCurrencyCode)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground lowercase">
                    {t('ecommerce.yr')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-primary">
                {priceLabel}
              </span>
              {!hasVariantPriceRange && resolvedPrice.sale_price && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(resolvedPrice.price, activeCurrencyCode)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-auto">
          <AddToCartButton 
            product={{
              ...product,
              price: product.price,
              prices: product.prices,
              sale_price: product.sale_price,
              sale_prices: product.sale_prices,
            }} 
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};
