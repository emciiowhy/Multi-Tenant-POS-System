import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/context.js";

/** Central error mapper. Keeps handlers free of try/catch boilerplate. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(422).json({ error: "validation_error", issues: err.issues });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code ?? "error", message: err.message });
    return;
  }
  req.log?.error({ err }, "unhandled error");
  res.status(500).json({ error: "internal_error" });
};
