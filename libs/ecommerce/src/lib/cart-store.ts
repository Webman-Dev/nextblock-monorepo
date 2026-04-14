import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { type CartItem, isDigitalItem } from './types';

export interface AddItemResult {
  success: boolean;
  error?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>) => AddItemResult;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setIsOpen: (isOpen: boolean) => void;
  setItems: (items: CartItem[]) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (newItem) => {
        const { items } = get();
        const availableStock = typeof newItem.stock === 'number' ? newItem.stock : null;

        // --- Digital product middleware ---
        if (isDigitalItem(newItem)) {
          // Cardinality rule: no duplicate Freemius software instances
          const duplicate = items.find(
            (item) => item.product_id === newItem.product_id && isDigitalItem(item)
          );
          if (duplicate) {
            return {
              success: false,
              error: 'This software license is already in your cart.',
            };
          }

          // Digital items are always qty 1, bypass stock checks
          set({
            items: [...items, { ...newItem, quantity: 1 }],
            isOpen: true,
          });
          return { success: true };
        }

        // --- Standard physical product logic ---
        const existingItem = items.find((item) => item.id === newItem.id);

        if (availableStock !== null && availableStock <= 0) {
          return {
            success: false,
            error: 'This item is out of stock.',
          };
        }

        if (existingItem) {
          if (availableStock !== null && existingItem.quantity >= availableStock) {
            return {
              success: false,
              error: `Only ${availableStock} available for this item.`,
            };
          }

          set({
            items: items.map((item) =>
              item.id === newItem.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
            isOpen: true,
          });
        } else {
          set({
            items: [...items, { ...newItem, quantity: 1 }],
            isOpen: true,
          });
        }
        return { success: true };
      },
      removeItem: (itemId) => {
        const { items } = get();
        set({
          items: items.filter((item) => item.id !== itemId),
        });
      },
      updateQuantity: (itemId, quantity) => {
        const { items } = get();
        const targetItem = items.find((item) => item.id === itemId);

        // Guard: digital items are locked at qty 1
        if (targetItem && isDigitalItem(targetItem)) {
          return;
        }

        if (
          targetItem &&
          typeof targetItem.stock === 'number' &&
          quantity > targetItem.stock
        ) {
          quantity = targetItem.stock;
        }

        if (quantity <= 0) {
          set({
            items: items.filter((item) => item.id !== itemId),
          });
        } else {
          set({
            items: items.map((item) =>
              item.id === itemId ? { ...item, quantity } : item
            ),
          });
        }
      },
      clearCart: () => set({ items: [] }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      setIsOpen: (isOpen) => set({ isOpen }),
      setItems: (items) => set({ items }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);

// Selectors
export const useCartTotalItems = () => {
  const items = useCartStore((state) => state.items);
  return items.reduce((acc, item) => acc + item.quantity, 0);
};

export const useCartSubtotal = () => {
  const items = useCartStore((state) => state.items);
  return items.reduce((acc, item) => acc + (item.sale_price ?? item.price) * item.quantity, 0);
};
