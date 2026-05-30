import { z } from "zod";

export const uuid = z.string().uuid();
export const money = z.string().regex(/^-?\d+(\.\d{1,4})?$/, "invalid money");
export const isoDate = z.string().datetime({ offset: true });

/** Wraps the client-generated idempotency key carried by every POS mutation. */
export const idempotent = z.object({ clientUuid: uuid });

export type Uuid = z.infer<typeof uuid>;
