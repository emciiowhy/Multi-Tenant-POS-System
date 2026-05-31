"use client";

import { create } from "zustand";
import type { CartItem } from "./cart-logic";

/**
 * The live POS cart — ephemeral, per-terminal client state owned by Zustand,
 * deliberately NOT in TanStack Query (ADR-0008). It only produces server events
 * on charge/settle.
 */
interface CartState {
  items: CartItem[];
  add: (product: Omit<CartItem, "quantity">) => void;
  setQty: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useCart = create<CartState>((set) => ({
  items: [],
  add: (product) =>
    set((s) => {
      const existing = s.items.find((i) => i.productId === product.productId);
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.productId === product.productId ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        };
      }
      return { items: [...s.items, { ...product, quantity: 1 }] };
    }),
  setQty: (productId, quantity) =>
    set((s) => ({
      items:
        quantity <= 0
          ? s.items.filter((i) => i.productId !== productId)
          : s.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    })),
  remove: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
  clear: () => set({ items: [] }),
}));
