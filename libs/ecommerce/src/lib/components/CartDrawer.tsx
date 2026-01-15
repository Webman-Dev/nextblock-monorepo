'use client';

import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  Button
} from '@nextblock-cms/ui';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore, useCartSubtotal } from '../cart-store';
import { useCart } from '../use-cart';

export const CartDrawer = () => {
  const store = useCart((state) => state);
  const subtotal = useCartStore(useCartSubtotal);

  if (!store) return null;

  const { isOpen, setIsOpen, items, updateQuantity, removeItem } = store;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg">
        <SheetHeader className="px-1 text-left">
          <SheetTitle>Shopping Cart ({items.length})</SheetTitle>
        </SheetHeader>
        
        {items.length > 0 ? (
           <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-1 pr-6 pt-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4">
                {item.image_url ? (
                  <div className="relative aspect-square h-20 w-20 min-w-fit overflow-hidden rounded border bg-neutral-100">
                    {/* Use standard img tag if local image optimization not available in this scope, or pass NextImage as generic if needed. Assuming standard img for now or we can use generic configured image */}
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded bg-secondary">
                     <span className="text-xs text-muted-foreground">No Image</span>
                  </div>
                )}

                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex justify-between gap-2">
                    <span className="line-clamp-2 text-sm font-medium leading-tight">
                      {item.title}
                    </span>
                    <span className="text-sm font-semibold">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center rounded-md border text-xs">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center border-r hover:bg-neutral-100"
                        type="button"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="flex h-7 w-8 items-center justify-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center border-l hover:bg-neutral-100"
                        type="button"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center space-y-2">
            <span className="text-muted-foreground">Your cart is empty</span>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Continue Shopping
            </Button>
          </div>
        )}

        {items.length > 0 && (
          <div className="border-t pr-6 pt-4">
             <div className="flex items-center justify-between text-base font-medium">
                <span>Subtotal</span>
                <span>${subtotal?.toFixed(2)}</span>
             </div>
             <p className="mb-4 mt-1 text-xs text-muted-foreground">
                Shipping and taxes calculated at checkout.
             </p>
             <Button className="w-full" asChild>
                <a href="/checkout">Checkout</a>
             </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
