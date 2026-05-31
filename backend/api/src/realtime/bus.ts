import { EventEmitter } from "node:events";
import type { RealtimeEvent } from "@vendme/contracts";

/**
 * The envelope a service publishes when a mutation commits. `companyId` and
 * `branchId` are routing metadata (which tenant room the delta belongs to),
 * kept separate from the wire `event` the client ultimately receives.
 *
 * This bus is deliberately transport-agnostic — it imports no socket.io — so
 * the domain services stay free of any realtime dependency and the gateway is
 * the single place that translates these messages into room broadcasts
 * (ADR-0007/0008).
 */
export interface RealtimeMessage {
  companyId: string;
  branchId: string;
  event: RealtimeEvent;
}

export interface RealtimeBus {
  publish(message: RealtimeMessage): void;
  /** Returns an unsubscribe function. */
  subscribe(handler: (message: RealtimeMessage) => void): () => void;
}

const CHANNEL = "realtime";

/**
 * In-process implementation. A single bus per process is correct even once the
 * Redis adapter lands: cross-instance fan-out happens at the Socket.IO layer,
 * not here, so each instance publishes locally and the adapter mirrors the
 * resulting room emit to its peers.
 */
export class InProcessRealtimeBus implements RealtimeBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Realtime is best-effort fan-out; never cap or warn on subscriber count.
    this.emitter.setMaxListeners(0);
  }

  publish(message: RealtimeMessage): void {
    this.emitter.emit(CHANNEL, message);
  }

  subscribe(handler: (message: RealtimeMessage) => void): () => void {
    this.emitter.on(CHANNEL, handler);
    return () => {
      this.emitter.off(CHANNEL, handler);
    };
  }
}

/**
 * Process-wide singleton: services publish here, the gateway subscribes it to
 * the Socket.IO server. Injectable elsewhere (e.g. tests) via the bus interface.
 */
export const realtimeBus: RealtimeBus = new InProcessRealtimeBus();
