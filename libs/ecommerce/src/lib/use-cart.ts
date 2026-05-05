'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from './cart-store';

let cartHydrationPromise: Promise<void> | null = null;

function getCartPersistApi() {
  return useCartStore.persist;
}

function hasCartHydrated() {
  return getCartPersistApi()?.hasHydrated?.() ?? false;
}

function ensureCartHydration() {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  const persistApi = getCartPersistApi();

  if (!persistApi || persistApi.hasHydrated()) {
    return Promise.resolve();
  }

  if (!cartHydrationPromise) {
    cartHydrationPromise = Promise.resolve()
      .then(() => persistApi.rehydrate())
      .finally(() => {
        cartHydrationPromise = null;
      });
  }

  return cartHydrationPromise;
}

/**
 * A wrapper to safely use the cart store with hydration support.
 * This prevents hydration mismatches because the persisted state in localStorage
 * differs from the server-rendered HTML.
 */
export const useCart = <T>(selector: (state: ReturnType<typeof useCartStore.getState>) => T): T | undefined => {
  const result = useCartStore(selector);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const persistApi = getCartPersistApi();

    if (hasCartHydrated()) {
      setMounted(true);
      return;
    }

    const unsub = persistApi?.onFinishHydration(() => setMounted(true));
    void ensureCartHydration();

    return () => {
      unsub?.();
    };
  }, []);

  return mounted ? result : undefined;
};

/**
 * Hook to check if the store has hydrated.
 */
export const useIsCartHydrated = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persistApi = getCartPersistApi();
    const unsub = persistApi?.onFinishHydration(() => setHydrated(true));
    setHydrated(hasCartHydrated());

    if (!hasCartHydrated()) {
      void ensureCartHydration();
    }

    return () => {
      unsub?.();
    };
  }, []);

  return hydrated;
};
