"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface Register {
  id: string;
  name: string;
  branchId: string;
}

export function useRegisters(branchId: string) {
  return useQuery({
    queryKey: ["registers", branchId],
    queryFn: () => apiFetch<Register[]>(`/v1/companies/branches/${branchId}/registers`),
  });
}

export interface Shift {
  id: string;
  branchId: string;
  registerId: string;
  openingFloat: string;
  status: string;
}

export function useOpenShift() {
  return useMutation({
    mutationFn: (vars: { branchId: string; registerId: string; openingFloat: string }) =>
      apiFetch<Shift>("/v1/shifts", { method: "POST", body: JSON.stringify(vars) }),
  });
}

export type CashReason = "pay_in" | "pay_out" | "drop";

export interface CashMovement {
  id: string;
  amount: string;
  reason: string;
}

export function useAddCashMovement(shiftId: string) {
  return useMutation({
    mutationFn: (vars: { amount: string; reason: string }) =>
      apiFetch<CashMovement>(`/v1/shifts/${shiftId}/cash-movements`, {
        method: "POST",
        body: JSON.stringify(vars),
      }),
  });
}

export interface ShiftClosure {
  shiftId: string;
  openingFloat: string;
  expected: string;
  counted: string;
  variance: string;
}

export function useCloseShift(shiftId: string) {
  return useMutation({
    mutationFn: (vars: { counted: string }) =>
      apiFetch<ShiftClosure>(`/v1/shifts/${shiftId}/close`, {
        method: "POST",
        body: JSON.stringify(vars),
      }),
  });
}
