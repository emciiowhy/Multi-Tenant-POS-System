/**
 * Session revocation (ADR-0004). Stateless JWT verification can't instantly
 * kill a token, so the API checks `sid` against this set on each request for
 * the "revoke now" case (logout, compromised session, fired employee).
 *
 * The interface is storage-agnostic; the production binding is Redis (a SET of
 * revoked sids with a TTL matching the max token lifetime).
 */
export interface RevocationStore {
  isRevoked(sid: string): Promise<boolean>;
  revoke(sid: string, ttlSeconds: number): Promise<void>;
}

/** In-memory implementation for tests/dev. Do not use across processes. */
export class InMemoryRevocationStore implements RevocationStore {
  private readonly revoked = new Map<string, number>();

  async isRevoked(sid: string): Promise<boolean> {
    const expiry = this.revoked.get(sid);
    if (expiry === undefined) return false;
    if (Date.now() > expiry) {
      this.revoked.delete(sid);
      return false;
    }
    return true;
  }

  async revoke(sid: string, ttlSeconds: number): Promise<void> {
    this.revoked.set(sid, Date.now() + ttlSeconds * 1000);
  }
}
