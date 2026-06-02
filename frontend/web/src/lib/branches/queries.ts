"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface Branch {
  id: string;
  name: string;
  timezone: string;
}

/** Active branches for the signed-in company — drives the dashboard branch picker. */
export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: () => apiFetch<Branch[]>("/v1/companies/branches"),
  });
}
