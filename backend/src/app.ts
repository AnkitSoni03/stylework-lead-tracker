import express from "express";
import cors from "cors";
import { leadsRouter } from "./routes/leads";
import { errorHandler, notFound } from "./middleware/errors";

export interface AppOptions {
  /** Allowed CORS origins. Empty list allows any origin. */
  corsOrigins?: string[];
}

export function createApp({ corsOrigins = [] }: AppOptions = {}) {
  const app = express();

  app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : true }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/leads", leadsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
