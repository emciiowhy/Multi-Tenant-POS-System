"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface Product {
  id: string;
  name: string;
  price: string;
  kind: string;
  sku: string | null;
  isActive: boolean;
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<Product[]>("/v1/catalog/products"),
  });
}

export interface Receipt {
  order: {
    id: string;
    status: string;
    subtotal: string;
    taxTotal: string;
    grandTotal: string;
    settledAt: string | null;
  };
  lines: {
    id: string;
    productId: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
  }[];
  payments: { id: string; method: string; amount: string; kind: string }[];
}

/** Canonical (confirmed) receipt from the server. Only fetched once a sale has
 * synced; offline/queued sales show a provisional receipt instead. */
export function useReceipt(orderClientUuid: string | null) {
  return useQuery({
    queryKey: ["receipt", orderClientUuid],
    queryFn: () => apiFetch<Receipt>(`/v1/pos/orders/${orderClientUuid}/receipt`),
    enabled: Boolean(orderClientUuid),
  });
}
