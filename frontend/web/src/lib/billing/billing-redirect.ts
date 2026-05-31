/**
 * A tiny pub/sub seam so the API client (a plain module) can tell React to route
 * a blocked Company to /billing without importing the router. The API client
 * calls {@link notifyBillingRequired} on a 402; a client component subscribes via
 * {@link onBillingRequired} and navigates. Kept framework-free so it's trivially
 * testable.
 */

export type BillingRequiredHandler = (code: string) => void;

const handlers = new Set<BillingRequiredHandler>();

/** Subscribe to billing-required (402) signals. Returns an unsubscribe function. */
export function onBillingRequired(handler: BillingRequiredHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

/** Fire a billing-required signal with the machine code from the 402 response. */
export function notifyBillingRequired(code: string): void {
  for (const handler of handlers) handler(code);
}
