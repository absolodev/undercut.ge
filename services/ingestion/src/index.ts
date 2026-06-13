import { SessionManager } from "./session-manager";
import { logger } from "./lib/logger";
import { startWorkers } from "./jobs/queue";

async function bootstrap() {
  logger.info("Starting PitWall Ingestion Service...");

  // Start BullMQ workers
  startWorkers();

  // Start polling sessions
  const sessionManager = new SessionManager();
  await sessionManager.start();

  process.on("SIGINT", () => {
    logger.info("Shutting down gracefully...");
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "Fatal error during bootstrap");
  process.exit(1);
});
