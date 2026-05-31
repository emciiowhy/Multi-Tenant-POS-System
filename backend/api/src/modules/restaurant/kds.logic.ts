import type { KdsStatus } from "@vendme/contracts";

/** The KDS lifecycle, in order. A ticket only ever moves to a later stage. */
const KDS_ORDER: readonly KdsStatus[] = ["queued", "preparing", "ready", "served"];

/**
 * A transition is legal iff it advances to a strictly later stage. Forward
 * jumps are allowed (e.g. queued→ready when a dish needs no prep); staying put
 * and moving backward are not. A "recall" (bump back) would be a separate,
 * explicitly-modelled action, not a normal transition.
 */
export function isValidKdsTransition(from: KdsStatus, to: KdsStatus): boolean {
  return KDS_ORDER.indexOf(to) > KDS_ORDER.indexOf(from);
}
