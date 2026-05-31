import express, { type Express, Router } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { InMemoryRevocationStore, type RevocationStore } from "@vendme/auth";
import { env } from "./env.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { companyRouter } from "./modules/companies/company.routes.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { inventoryRouter } from "./modules/inventory/inventory.routes.js";
import { posRouter } from "./modules/pos/pos.routes.js";
import { shiftRouter } from "./modules/shifts/shift.routes.js";
import { mountModules } from "./modules/module.js";
import { restaurantModule } from "./modules/restaurant/restaurant.routes.js";

/**
 * Builds the Express app. The realtime Socket.IO server (ADR-0007) and
 * background workers attach to the same process in later phases.
 *
 * `revocations` is injected so tests can pass an in-memory store; production
 * binds a Redis-backed implementation.
 */
export function createServer(
  revocations: RevocationStore = new InMemoryRevocationStore(),
): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp());
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: env.NODE_ENV === "production" ? 120 : 1000,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "vendme-backend-api" });
  });

  const v1: Router = Router();
  v1.use("/auth", authRouter);
  v1.use("/companies", companyRouter(revocations));
  v1.use("/catalog", catalogRouter(revocations));
  v1.use("/inventory", inventoryRouter(revocations));
  v1.use("/pos", posRouter(revocations));
  v1.use("/shifts", shiftRouter(revocations));

  // Pluggable product modules (ADR-0005), each gated per-company. Restaurant is
  // the first consumer of the module seam.
  mountModules(v1, [restaurantModule], revocations);

  app.use("/v1", v1);

  app.use(errorHandler);
  return app;
}
