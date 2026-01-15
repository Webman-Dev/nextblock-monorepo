import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  id: string; // The specific SKU or variant ID if applicable, or just product ID
  product_id: string; // The main product ID
  title: string;
  price: number;
  image_url?: string;
  quantity: number;
  slug: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (newItem) => {
        const { items } = get();
        const existingItem = items.find((item) => item.id === newItem.id);

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.id === newItem.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
            isOpen: true, // Open cart when adding item
          });
        } else {
          set({
            items: [...items, { ...newItem, quantity: 1 }],
            isOpen: true, // Open cart when adding item
          });
        }
      },
      removeItem: (itemId) => {
        const { items } = get();
        set({
          items: items.filter((item) => item.id !== itemId),
        });
      },
      updateQuantity: (itemId, quantity) => {
        const { items } = get();
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
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // we handle hydration manually to avoid mismatches
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
  return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
};
