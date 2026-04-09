'use client';

import { useCartStore } from '@nextblock-cms/ecommerce';
import { Button } from '@nextblock-cms/ui';
import { CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { fulfillOrderAction } from './actions';

export default function CheckoutSuccessPage() {
  const clearCart = useCartStore((state) => state?.clearCart); // Optional chaining just in case mock
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  // Verify license client-side or we rely on the backend payment intent block to have failed.
  // We'll leave this simple since the payments are already gated.

  useEffect(() => {
    // If we landed here from Freemius with a session ID, we definitely finished checkout. Empty cart!
    if (sessionId) {
      if (clearCart) {
         clearCart();
      }
      
      // Attempt to immediately mark the order as paid in the DB safely
      void fulfillOrderAction(sessionId);
    }
  }, [clearCart, sessionId]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-4 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
      </div>
      <h1 className="mb-2 text-3xl font-bold">Thank you for your order!</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        Your payment was successful. We will send you an email confirmation shortly.
      </p>

      <Button asChild>
        <Link href="/">Return to Home</Link>
      </Button>
    </div>
  );
}
