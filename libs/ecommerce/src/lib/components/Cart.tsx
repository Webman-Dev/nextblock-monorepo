'use client';

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from '@nextblock-cms/ui';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCartSubtotal } from '../cart-store';
import { useCart } from '../use-cart';
import { isDigitalItem } from '../types';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@nextblock-cms/utils';
import { ShippingEstimator } from './ShippingEstimator';

export const Cart = () => {
  const router = useRouter();
  const store = useCart((state) => state);
  const subtotal = useCartSubtotal();
  const { t } = useTranslations();

  if (!store) return null;

  const { items, updateQuantity, removeItem } = store;
  const getAllocatedSkuQuantity = (sku: string) =>
    items.reduce((accumulator, cartItem) => {
      if (isDigitalItem(cartItem) || cartItem.sku !== sku) {
        return accumulator;
      }

      return accumulator + cartItem.quantity;
    }, 0);

  const handleCheckout = () => {
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <h2 className="text-2xl font-bold">{t('ecommerce.cart_empty')}</h2>
        <p className="text-muted-foreground">{t('ecommerce.cart_empty_description')}</p>
        <Button asChild>
          <a href="/shop">{t('ecommerce.continue_shopping')}</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <h1 className="mb-8 text-3xl font-bold">{t('ecommerce.shopping_cart')}</h1>

      <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-8">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ecommerce.product')}</TableHead>
                  <TableHead>{t('ecommerce.quantity')}</TableHead>
                  <TableHead className="text-right">{t('ecommerce.price')}</TableHead>
                  <TableHead className="text-right">{t('ecommerce.total')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const allocatedSkuQuantity = getAllocatedSkuQuantity(item.sku);

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          {item.image_url ? (
                            <div className="h-16 w-16 overflow-hidden rounded border bg-neutral-100">
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded bg-secondary">
                              <span className="text-[10px] text-muted-foreground">
                                {t('ecommerce.no_image')}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{item.title}</div>
                            {item.variant_label && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {item.variant_label}
                              </div>
                            )}
                            {isDigitalItem(item) && item.billing_cycle && (
                              <div className="mt-1 text-xs capitalize text-muted-foreground">
                                {item.billing_cycle} Subscription
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isDigitalItem(item) ? (
                          <Badge variant="secondary" className="font-normal text-xs">
                            1 (License)
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={
                                typeof item.stock === 'number' &&
                                allocatedSkuQuantity >= item.stock
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-medium">
                            ${((item.sale_price ?? item.price) / 100).toFixed(2)}
                          </span>
                          {item.sale_price && (
                            <span className="text-xs text-muted-foreground line-through">
                              ${(item.price / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(((item.sale_price ?? item.price) * item.quantity) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="lg:col-span-4">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">{t('ecommerce.order_summary')}</h2>
                <div className="flex justify-between border-b pb-4">
                    <span>{t('ecommerce.subtotal')}</span>
                    <span className="font-medium">${(subtotal / 100).toFixed(2)}</span>
                </div>
                 <div className="mt-4 flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                        {t('ecommerce.shipping_taxes_calculated')}
                    </p>
                    
                    {items.some(item => !isDigitalItem(item)) && (
                        <ShippingEstimator cartTotal={subtotal} />
                    )}

                    <Button className="w-full mt-4" size="lg" onClick={handleCheckout}>
                        {t('ecommerce.proceed_to_checkout')}
                    </Button>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};
