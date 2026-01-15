import { useState, useEffect } from 'react';
import { useCartStore } from './cart-store';

/**
 * A wrapper to safely use the cart store with hydration support.
 * This prevents hydration mismatches because the persisted state in localStorage
 * differs from the server-rendered HTML.
 */
export const useCart = <T>(selector: (state: ReturnType<typeof useCartStore.getState>) => T): T | undefined => {
  const result = useCartStore(selector);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setMounted(true);
  }, []);

  return mounted ? result : undefined;
};

/**
 * Hook to check if the store has hydrated.
 */
export const useIsCartHydrated = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useCartStore.persist.hasHydrated());
    return () => {
      unsub();
    };
  }, []);

  return hydrated;
};
