'use client';

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@nextblock-cms/ui';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCartSubtotal } from '../cart-store';
import { useCart } from '../use-cart';
import { useState } from 'react';

export const Cart = () => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const store = useCart((state) => state);
  const subtotal = useCartSubtotal();

  if (!store) return null;

  const { items, updateQuantity, removeItem } = store;

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Checkout failed: ' + (data.error || 'Unknown error'));
        setIsCheckingOut(false);
      }
    } catch (error) {
       console.error(error);
       alert('An error occurred. Please try again.');
       setIsCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <h2 className="text-2xl font-bold">Your cart is empty</h2>
        <p className="text-muted-foreground">Looks like you haven't added anything to your cart yet.</p>
        <Button asChild>
          <a href="/shop">Continue Shopping</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12">
      <h1 className="mb-8 text-3xl font-bold">Shopping Cart</h1>

      <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-8">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
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
                             <span className="text-[10px] text-muted-foreground">No Image</span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{item.title}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
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
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${(item.price * item.quantity).toFixed(2)}
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
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="lg:col-span-4">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">Order Summary</h2>
                <div className="flex justify-between border-b pb-4">
                    <span>Subtotal</span>
                    <span className="font-medium">${subtotal?.toFixed(2)}</span>
                </div>
                 <div className="mt-4 flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                        Shipping and taxes calculated at checkout.
                    </p>
                    <Button className="w-full" size="lg" onClick={handleCheckout} disabled={isCheckingOut}>
                        {isCheckingOut ? 'Processing...' : 'Proceed to Checkout'}
                    </Button>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};
