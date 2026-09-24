import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, "Route not found"));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  // Malformed JSON body from express.json()
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  // MongoDB duplicate key (unique index violation)
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? "field";
    res.status(409).json({ error: `A lead with this ${field} already exists` });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
