import { z } from "zod";
import { money, uuid } from "./common.js";

export const createStockItemInput = z.object({
  name: z.string().min(1),
  unit: z.string().min(1).default("each"),
});
export type CreateStockItemInput = z.infer<typeof createStockItemInput>;

export const createProductInput = z.object({
  name: z.string().min(1),
  /** "good" deducts its own stock; "menu_item" deducts via recipe. */
  kind: z.enum(["good", "menu_item"]).default("good"),
  price: money.default("0"),
  sku: z.string().min(1).optional(),
});
export type CreateProductInput = z.infer<typeof createProductInput>;

export const createVariantInput = z.object({
  productId: uuid,
  name: z.string().min(1),
  barcode: z.string().min(1).optional(),
  priceDelta: money.default("0"),
});
export type CreateVariantInput = z.infer<typeof createVariantInput>;

/** Defines the bill of materials for a product (replaces any existing one). */
export const defineRecipeInput = z.object({
  productId: uuid,
  components: z
    .array(z.object({ stockItemId: uuid, quantity: money }))
    .min(1),
});
export type DefineRecipeInput = z.infer<typeof defineRecipeInput>;

/** Manual stock movement (receive / adjust / waste). Fire movements come from POS. */
export const recordMovementInput = z.object({
  stockItemId: uuid,
  branchId: uuid,
  qtyDelta: money,
  reason: z.enum(["receive", "adjustment", "waste"]),
  clientUuid: uuid,
});
export type RecordMovementInput = z.infer<typeof recordMovementInput>;

export const onHandRow = z.object({
  stockItemId: uuid,
  onHand: money,
});
export type OnHandRow = z.infer<typeof onHandRow>;
