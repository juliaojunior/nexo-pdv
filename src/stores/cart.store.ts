import { create } from 'zustand';
import type { Product } from '@/db/db';

export interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],

  addItem: (product: Product, quantity: number = 1) => {
    set((state) => {
      const existingItemIndex = state.items.findIndex((item) => item.id === product.id);

      if (existingItemIndex > -1) {
        const updatedItems = [...state.items];
        const existingItem = updatedItems[existingItemIndex];
        
        // Bloqueia exceder limite de estoque
        const newQuantity = Math.min(existingItem.quantity + quantity, product.stock);
        
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
        };

        return { items: updatedItems };
      }

      // Se novo item
      const initialQuantity = Math.min(quantity, product.stock);
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
}));
