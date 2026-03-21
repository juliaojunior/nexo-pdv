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
      // Find if item already exists in cart
      const existingItemIndex = state.items.findIndex((item) => item.id === product.id);

      if (existingItemIndex > -1) {
        // Immutability: Create a new array and clone the object before mutating
        const updatedItems = [...state.items];
        const existingItem = updatedItems[existingItemIndex];
        
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + quantity,
        };

        return { items: updatedItems };
      }

      // Item does not exist, append to array immutably
      return { items: [...state.items, { ...product, quantity }] };
    });
  },

  removeItem: (productId: number) => {
    set((state) => ({
      // Immutability: Filter returns a new array
      items: state.items.filter((item) => item.id !== productId),
    }));
  },

  updateQuantity: (productId: number, quantity: number) => {
    set((state) => {
      // Remove item if quantity falls to 0 or below
      if (quantity <= 0) {
        return { items: state.items.filter((item) => item.id !== productId) };
      }

      // Immutability: Map returns a new array, returning cloned objects with overwritten quantity
      return {
        items: state.items.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        ),
      };
    });
  },

  clearCart: () => {
    set({ items: [] });
  },
}));
