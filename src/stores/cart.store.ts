import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from 'sonner';
import type { Product } from '@/db/db';

export interface CartItem extends Product {
  quantity: number;
}

// Avisa o operador quando a quantidade pedida foi cortada pelo limite de estoque,
// para que ele não pense que adicionou mais do que realmente entrou no carrinho.
function notifyStockLimit(name: string, requested: number, stock: number) {
  if (requested > stock) {
    toast.warning(`Só há ${stock} un. de ${name} em estoque.`);
  }
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(persist((set) => ({
  items: [],

  addItem: (product: Product, quantity: number = 1) => {
    set((state) => {
      const existingItemIndex = state.items.findIndex((item) => item.id === product.id);

      if (existingItemIndex > -1) {
        const updatedItems = [...state.items];
        const existingItem = updatedItems[existingItemIndex];

        // Bloqueia exceder limite de estoque
        const requested = existingItem.quantity + quantity;
        const newQuantity = Math.min(requested, product.stock);
        notifyStockLimit(product.name, requested, product.stock);

        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
        };

        return { items: updatedItems };
      }

      // Se novo item
      const initialQuantity = Math.min(quantity, product.stock);
      notifyStockLimit(product.name, quantity, product.stock);
      return { items: [...state.items, { ...product, quantity: initialQuantity }] };
    });
  },

  removeItem: (productId: number) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== productId),
    }));
  },

  updateQuantity: (productId: number, quantity: number) => {
    set((state) => {
      if (quantity <= 0) {
        return { items: state.items.filter((item) => item.id !== productId) };
      }

      return {
        items: state.items.map((item) => {
           if (item.id === productId) {
              const safeQuantity = Math.min(quantity, item.stock);
              notifyStockLimit(item.name, quantity, item.stock);
              return { ...item, quantity: safeQuantity };
           }
           return item;
        }),
      };
    });
  },

  clearCart: () => {
    set({ items: [] });
  },
}), {
  name: 'nexo-cart',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ items: state.items }),
  // Hidratação manual no SyncProvider para evitar mismatch SSR
  skipHydration: true,
}));
