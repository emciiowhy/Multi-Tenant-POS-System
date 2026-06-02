import type { PosEvent } from "@vendme/contracts";
import type { CartItem } from "./cart-logic";

export type TenderMethod = "cash" | "card" | "bank_transfer" | "cheque" | "gift_card" | "loyalty";

export interface SaleBatch {
  /** Batch id — the Outbox dedupe key. */
  id: string;
  kind: "pos.sale";
  /** order.open → order.fire → order.settle. */
  events: PosEvent[];
  /** Shared across the three events; the receipt is fetched by this id. */
  orderClientUuid: string;
}

/**
 * Builds the idempotent event batch for one retail sale. Every id is generated
 * up front and persisted with the batch, so an offline replay re-sends the same
 * client_uuids and the server treats retries as duplicates (ADR-0006). Pure and
 * id-injectable for tests.
 */
export function buildSaleBatch(input: {
  branchId: string;
  items: CartItem[];
  tender: { method: TenderMethod; amount: string };
  uuid?: () => string;
}): SaleBatch {
  const gen = input.uuid ?? (() => crypto.randomUUID());
  const id = gen();
  const orderClientUuid = gen();
  const events: PosEvent[] = [
    { type: "order.open", clientUuid: gen(), orderClientUuid, branchId: input.branchId },
    {
      type: "order.fire",
      clientUuid: gen(),
      orderClientUuid,
      lines: input.items.map((i) => ({
        productId: i.productId,
        quantity: String(i.quantity),
      })),
    },
    {
      type: "order.settle",
      clientUuid: gen(),
      orderClientUuid,
      tenders: [input.tender],
    },
  ];
  return { id, kind: "pos.sale", events, orderClientUuid };
}
