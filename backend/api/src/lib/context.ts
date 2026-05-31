import type { Permission } from "@vendme/auth";

/** The authenticated, company-scoped context attached to each request. */
export interface RequestContext {
  accountId: string;
  companyId: string;
  role: string;
  sid: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ctx?: RequestContext;
    }
  }
}

/** Thrown by handlers/services; mapped to HTTP status by the error middleware. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

export const unauthorized = (msg = "Unauthorized") => new HttpError(401, msg);
export const forbidden = (msg = "Forbidden", perm?: Permission) =>
  new HttpError(403, perm ? `${msg}: requires ${perm}` : msg);
export const badRequest = (msg: string) => new HttpError(400, msg);
export const notFound = (msg = "Not found") => new HttpError(404, msg);
/** Subscription gate (ADR-0005): `code` is the machine-readable block reason. */
export const paymentRequired = (code: string, msg = "Subscription required") =>
  new HttpError(402, msg, code);
