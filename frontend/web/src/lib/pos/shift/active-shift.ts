"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

/** No-op storage for SSR (no window); real localStorage is used on the client. */
const serverStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export interface ActiveShift {
  id: string;
  branchId: string;
  registerId: string;
  openingFloat: string;
}

interface ActiveShiftState {
  shift: ActiveShift | null;
  setShift: (shift: ActiveShift) => void;
  clearShift: () => void;
}

/**
 * The register's currently-open Shift, persisted to localStorage so it survives
 * a reload of the terminal (there's no server "current shift" read in v1). The
 * storage factory is window-guarded so importing this is SSR-safe.
 */
export const useActiveShift = create<ActiveShiftState>()(
  persist(
    (set) => ({
      shift: null,
      setShift: (shift) => set({ shift }),
      clearShift: () => set({ shift: null }),
    }),
    {
      name: "vendme-active-shift",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : serverStorage
      ),
    }
  )
);
