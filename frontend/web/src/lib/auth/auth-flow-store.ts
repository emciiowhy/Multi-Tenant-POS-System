import { create } from "zustand";
import type { AuthMode } from "./auth-flow";

/**
 * Ephemeral auth-screen UI state (Auth overhaul PRD §2.1; ADR-0008's Zustand
 * lane). Holds which of the three states is showing and a `pendingEmail` that
 * survives a mode switch (e.g. a duplicate-email sign-up hands the email to the
 * sign-in form). Deliberately **not persisted** — auth flow state is per-visit.
 */
interface AuthFlowState {
  mode: AuthMode;
  pendingEmail: string | null;
  setMode: (mode: AuthMode) => void;
  setPendingEmail: (email: string | null) => void;
  reset: () => void;
}

export const useAuthFlowStore = create<AuthFlowState>((set) => ({
  mode: "signin",
  pendingEmail: null,
  setMode: (mode) => set({ mode }),
  setPendingEmail: (pendingEmail) => set({ pendingEmail }),
  reset: () => set({ mode: "signin", pendingEmail: null }),
}));
