import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

/**
 * Remembers the branch the user is currently working in, so global pages that
 * carry no branch in their URL (`/billing`, `/home`) keep the branch-scoped
 * sidebar links visible instead of wiping them. Ephemeral per-device UI state
 * (ADR-0008's Zustand lane), persisted like the sidebar collapse state.
 *
 * Scoped by `companyId`: a branch is only a valid fallback for the company it
 * belongs to, so a `TenantSwitcher` switch never leaks Company A's branch into
 * Company B's sidebar.
 */
interface ActiveBranchState {
  companyId: string | null;
  branchId: string | null;
  remember: (companyId: string, branchId: string) => void;
}

// SSR-safe: localStorage only exists in the browser.
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useActiveBranchStore = create<ActiveBranchState>()(
  persist(
    (set) => ({
      companyId: null,
      branchId: null,
      remember: (companyId, branchId) => set({ companyId, branchId }),
    }),
    {
      name: "vendme-active-branch",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage
      ),
    }
  )
);

/**
 * The remembered branch usable as a fallback for `companyId` — or null when
 * nothing is remembered or it belongs to a different company. Pure, so it's
 * unit-testable without the store.
 */
export function rememberedBranchFor(
  state: Pick<ActiveBranchState, "companyId" | "branchId">,
  companyId: string | null | undefined
): string | null {
  if (!companyId || state.companyId !== companyId) return null;
  return state.branchId;
}
