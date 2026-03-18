'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Separator,
  Input,
  Label
} from '@nextblock-cms/ui';
import { useCartSubtotal } from '../cart-store';
import { useCart } from '../use-cart';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Checkout as FreemiusCheckout } from '@freemius/checkout';

export const Checkout = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const store = useCart((state) => state);
  const subtotal = useCartSubtotal();

  if (!store) return null;

  const { items } = store;

  const handlePay = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setIsProcessing(true);
    
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items, customerEmail: email }),
      });
      const data = await res.json();
      
      if (data.customProps && data.customProps.provider === 'freemius') {
          const cp = data.customProps;
          
          const checkoutConfig = {
              product_id: cp.plugin_id,
              public_key: cp.public_key,
              sandbox: cp.sandbox
          };
          
          const openConfig = {
              name: 'Order Checkout',
              plan_id: cp.plan_id,
              user_email: cp.user_email,
              sandbox: cp.sandbox, // Also pass sandbox here just in case
              success: function() {
                  window.location.href = `/checkout/success?session_id=${cp.order_id}`;
              }
          };
          
          console.log('Freemius Settings JSON:', checkoutConfig);
          console.log('Freemius Open JSON:', openConfig);
          
          try {
              // Initialize Freemius Checkout
              const handler = new FreemiusCheckout(checkoutConfig);
              
              // Open the checkout overlay
              handler.open(openConfig);
              setIsProcessing(false); // Stop the spinner once the popup is open
          } catch (e: any) {
              console.error('Freemius SDK Init Error details:', e);
              console.error('customProps used:', cp);
              alert('Checkout popup blocked or failed to load. Error: ' + (e.message || String(e)) + '. Falling back to direct link.');
              if (data.url) window.location.href = data.url;
              setIsProcessing(false);
          }
          
      } else if (data.url) {
        // Fallback or Stripe checkout
        window.location.href = data.url;
      } else {
        alert('Checkout failed: ' + (data.error || 'Unknown error'));
        setIsProcessing(false);
      }
    } catch (error) {
       console.error(error);
       alert('An error occurred. Please try again.');
       setIsProcessing(false);
    }
  };

  if (items.length === 0) {
     return (
        <div className="container mx-auto flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
            <h1 className="mb-4 text-2xl font-bold">Your cart is empty</h1>
            <p className="mb-8 text-muted-foreground">Add some items before checking out.</p>
            <Button asChild>
                <a href="/shop">Go to Shop</a>
            </Button>
        </div>
     )
  }

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">Checkout</h1>
        
        <div className="grid gap-8 md:grid-cols-2">
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                        <CardDescription>Review your items before proceeding to payment.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {items.map((item) => (
                            <div key={item.id} className="flex items-start justify-between gap-4">
                                <div className="flex gap-3">
                                   {item.image_url && (
                                       <div className="h-12 w-12 overflow-hidden rounded border bg-neutral-100">
                                            <img src={item.image_url} alt={item.title} className="h-full w-full object-cover"/>
                                       </div>
                                   )}
                                   <div className="grid gap-1">
                                       <span className="font-medium text-sm">{item.title}</span>
                                       <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                                   </div>
                                </div>
                                <span className="font-medium text-sm">
                                    ${(item.price * item.quantity).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <div>
                 <Card>
                    <CardHeader>
                        <CardTitle>Payment Details</CardTitle>
                        <CardDescription>Secure payment processing</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="flex items-center justify-between">
                            <span>Subtotal</span>
                            <span>${subtotal?.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between font-bold">
                            <span>Total</span>
                            <span>${subtotal?.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">
                            * Taxes and shipping will be calculated on the next step.
                        </p>
                        
                        <div className="space-y-2 mt-4">
                             <Label htmlFor="checkout-email">Email Address <span className="text-destructive">*</span></Label>
                             <Input 
                                id="checkout-email" 
                                type="email" 
                                placeholder="you@example.com" 
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (emailError) setEmailError('');
                                }}
                                required
                             />
                             {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" size="lg" onClick={handlePay} disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isProcessing ? 'Processing...' : 'Pay Now'}
                        </Button>
                    </CardFooter>
                 </Card>
            </div>
        </div>
      </div>
    </div>
  );
};
