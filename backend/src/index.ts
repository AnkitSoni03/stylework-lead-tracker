import mongoose from "mongoose";
import { createApp } from "./app";
import { config } from "./config";

async function main() {
  await mongoose.connect(config.mongoUri);
  console.log("Connected to MongoDB");

  const app = createApp({ corsOrigins: config.corsOrigins });
  app.listen(config.port, () => {
    console.log(`API listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
