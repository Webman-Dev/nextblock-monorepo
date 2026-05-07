'use client';

import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
} from '@nextblock-cms/ui/sheet';
import { Badge } from '@nextblock-cms/ui/badge';
import { Button } from '@nextblock-cms/ui/button';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { getCartItemActivePrice, useCartSubtotal } from '../cart-store';
import { useCart } from '../use-cart';
import { formatPrice, useTranslations } from '@nextblock-cms/utils';
import { isDigitalItem } from '../types';
import { useCurrency } from '../CurrencyProvider';
import { getTrialSummary } from '../trials';
import { CouponForm } from './CouponForm';



export const CartDrawer = () => {
  const router = useRouter();
  const store = useCart((state) => state);
  const subtotal = useCartSubtotal();
  const { t } = useTranslations();
  const { activeCurrencyCode, currencies } = useCurrency();

  if (!store) return null;

  const { isOpen, setIsOpen, items, updateQuantity, removeItem } = store;
  const getAllocatedSkuQuantity = (sku: string) =>
    items.reduce((accumulator, cartItem) => {
      if (isDigitalItem(cartItem) || cartItem.sku !== sku) {
        return accumulator;
      }

      return accumulator + cartItem.quantity;
    }, 0);

  const handleViewCart = () => {
    setIsOpen(false);
    router.push('/cart');
  };

  const handleCheckout = () => {
    setIsOpen(false);
    router.push('/checkout');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg">
        <SheetHeader className="px-1 text-left">
          <SheetTitle>{t('ecommerce.shopping_cart')} ({items.length})</SheetTitle>
          <SheetDescription className="sr-only">
            {t('ecommerce.shopping_cart')}
          </SheetDescription>
        </SheetHeader>
        
        {items.length > 0 ? (
           <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-1 pr-6 pt-4">
            {items.map((item) => {
              const allocatedSkuQuantity = getAllocatedSkuQuantity(item.sku);

              return (
                <div key={item.id} className="flex gap-4">
                  {(() => {
                    const activePrice = getCartItemActivePrice(item, {
                      currencyCode: activeCurrencyCode,
                      currencies,
                    });
                    const trialSummary = getTrialSummary(item);

                    return (
                      <>
                  {item.image_url ? (
                    <div className="relative aspect-square h-20 w-20 min-w-fit overflow-hidden rounded border bg-neutral-100">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded bg-secondary">
                      <span className="text-xs text-muted-foreground">{t('ecommerce.no_image')}</span>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex justify-between gap-2">
                      <div>
                        <span className="line-clamp-2 text-sm font-medium leading-tight">
                          {item.title}
                        </span>
                        {item.variant_label && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.variant_label}
                          </div>
                        )}
                        {trialSummary && (
                          <div className="mt-1 text-xs font-medium text-emerald-700">
                            {trialSummary.label} - {trialSummary.paymentRequirementLabel}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-semibold">
                        {activePrice.sale_price && (
                          <span className="mr-1.5 text-xs font-normal text-muted-foreground line-through">
                            {formatPrice(activePrice.price, activeCurrencyCode)}
                          </span>
                        )}
                        {formatPrice(activePrice.sale_price ?? activePrice.price, activeCurrencyCode)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      {isDigitalItem(item) ? (
                        <Badge variant="secondary" className="font-normal text-xs">
                          1 (License)
                        </Badge>
                      ) : (
                        <div className="flex items-center rounded-md border text-xs">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="flex h-7 w-7 items-center justify-center border-r"
                            type="button"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="flex h-7 w-8 items-center justify-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="flex h-7 w-7 items-center justify-center border-l"
                            type="button"
                            disabled={
                              typeof item.stock === 'number' &&
                              allocatedSkuQuantity >= item.stock
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                      </>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center space-y-2">
            <span className="text-muted-foreground">{t('ecommerce.cart_empty')}</span>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t('ecommerce.continue_shopping')}
            </Button>
          </div>
        )}

        {items.length > 0 && (
          <div className="border-t pr-6 pt-4">
             <div className="flex items-center justify-between text-base font-medium">
                <span>{t('ecommerce.subtotal')}</span>
                <span>{formatPrice(subtotal, activeCurrencyCode)}</span>
             </div>
             <p className="mb-4 mt-1 text-xs text-muted-foreground">
                {t('ecommerce.shipping_taxes_calculated')}
             </p>
             <div className="mb-4">
                <CouponForm items={items} currencyCode={activeCurrencyCode} compact />
             </div>
             <Button variant="outline" className="w-full mb-3" onClick={handleViewCart}>
                {t('ecommerce.view_full_cart')}
             </Button>
             <Button className="w-full" onClick={handleCheckout}>
                {t('ecommerce.ready_to_checkout')}
             </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

